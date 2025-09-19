import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  User
} from 'discord.js';
import { configManager } from '../config/server-config';
import { apiKeyManager } from '../config/apikey-manager';
import { messageFetcher } from '../analysis/message-fetcher';
import { aiAnalyzerFactory } from '../analysis/ai-analyzer-factory';
import { permissionChecker } from '../utils/permission-checker';
import { periodParser } from '../utils/date-parser';
import { logger } from '../utils/logger';
import { ConsultSession } from '../types';

// In-memory session storage (in production, you might want to use a database)
const activeSessions = new Map<string, ConsultSession>();

export const consultCommand = {
  data: new SlashCommandBuilder()
    .setName('consult')
    .setDescription('コミュニティのトラブルや問題について相談します')
    .addStringOption(option =>
      option
        .setName('situation')
        .setDescription('相談したい状況や問題の説明')
        .setRequired(true)
    )
    .addUserOption(option =>
      option
        .setName('user1')
        .setDescription('関係するユーザー1')
        .setRequired(false)
    )
    .addUserOption(option =>
      option
        .setName('user2')
        .setDescription('関係するユーザー2')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('channel')
        .setDescription('関係するチャンネル')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption(option =>
      option
        .setName('timeframe')
        .setDescription('いつ頃の出来事か（例: today, yesterday, 2024-01-15）')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: '❌ このコマンドはサーバー内でのみ使用できます。',
        ephemeral: true
      });
      return;
    }

    // Permission check
    const member = interaction.member;
    const hasPermission = await permissionChecker.canConsult(member as any);

    if (!hasPermission) {
      await interaction.reply({
        content: permissionChecker.getPermissionErrorMessage('相談機能'),
        ephemeral: true
      });
      return;
    }

    const serverId = interaction.guildId!;
    const situation = interaction.options.getString('situation')!;
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    const channel = interaction.options.getChannel('channel');
    const timeframe = interaction.options.getString('timeframe');

    try {
      // Load configuration
      const serverConfig = await configManager.loadServerConfig(serverId);

      // Check if API key is configured
      const hasAPIKey = await apiKeyManager.hasValidAPIKey(serverId, serverConfig.aiProvider);
      if (!hasAPIKey) {
        await interaction.reply({
          content: `❌ ${serverConfig.aiProvider.toUpperCase()} のAPIキーが設定されていません。\n\`/config apikey set provider:${serverConfig.aiProvider}\` で設定してください。`,
          ephemeral: true
        });
        return;
      }

      // Defer reply as analysis will take time
      await interaction.deferReply();

      // Prepare context
      const consultContext = {
        serverId,
        channelId: interaction.channelId,
        adminId: interaction.user.id,
        serverRules: serverConfig.rules,
        clientRequirements: serverConfig.clientRequirements,
        relatedUsers: [user1, user2].filter(Boolean) as User[],
        relatedChannel: channel,
        timeframe
      };

      // Get API key and create analyzer
      const apiKey = await apiKeyManager.getAPIKey(serverId, serverConfig.aiProvider);
      if (!apiKey) {
        throw new Error('APIキーの取得に失敗しました');
      }

      const analyzer = aiAnalyzerFactory.create(serverConfig.aiProvider, apiKey);

      // Start consultation session
      await interaction.editReply({
        content: `🤔 **相談セッション開始**\n\n` +
                 `🤖 AI: ${serverConfig.aiProvider.toUpperCase()}\n` +
                 `🔍 状況を分析中...\n\n` +
                 `💭 *より良いアドバイスのため、詳細な分析を行っています*`
      });

      const session = await analyzer.startConsultSession(situation, consultContext);

      // Store session
      activeSessions.set(session.sessionId, session);

      // Create initial response embed
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('💬 コミュニティ相談セッション')
        .setDescription('相談内容を分析し、対応策をアドバイスします。')
        .addFields(
          {
            name: '📝 相談内容',
            value: situation.length > 1000 ? situation.slice(0, 1000) + '...' : situation,
            inline: false
          },
          {
            name: '🤖 AI分析結果',
            value: session.conversation[1].content.length > 1000
              ? session.conversation[1].content.slice(0, 1000) + '...'
              : session.conversation[1].content,
            inline: false
          }
        )
        .setFooter({
          text: `セッションID: ${session.sessionId} | 追加で質問や情報提供があれば、再度 /consult を実行してください`
        })
        .setTimestamp();

      // Add related information if provided
      if (consultContext.relatedUsers.length > 0) {
        embed.addFields({
          name: '👥 関係ユーザー',
          value: consultContext.relatedUsers.map(u => `<@${u.id}>`).join(', '),
          inline: true
        });
      }

      if (consultContext.relatedChannel) {
        embed.addFields({
          name: '📺 関係チャンネル',
          value: `<#${consultContext.relatedChannel.id}>`,
          inline: true
        });
      }

      if (timeframe) {
        embed.addFields({
          name: '📅 時期',
          value: timeframe,
          inline: true
        });
      }

      // If we have specific users and channels, try to analyze related messages
      if ((consultContext.relatedUsers.length > 0 || consultContext.relatedChannel) && timeframe) {
        try {
          await this.analyzeRelatedMessages(
            interaction,
            session,
            consultContext,
            analyzer,
            embed
          );
        } catch (error) {
          logger.warn('Failed to analyze related messages', error);
          // Continue without related message analysis
        }
      }

      await interaction.editReply({
        content: `✅ **相談セッション準備完了**\n\n📋 以下の分析結果をご確認ください。\n💡 追加の質問や情報がある場合は、再度 \`/consult\` をご利用ください。`,
        embeds: [embed]
      });

      logger.info('Consult session started', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        sessionId: session.sessionId,
        hasRelatedUsers: consultContext.relatedUsers.length > 0,
        hasRelatedChannel: !!consultContext.relatedChannel,
        hasTimeframe: !!timeframe
      });

    } catch (error) {
      logger.error('Consult command failed', error, {
        userId: interaction.user.id,
        guildId: interaction.guildId
      });

      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ **相談セッションエラー**\n\n${errorMessage}\n\n**対処法:**\n• AIの設定とAPIキーを確認\n• \`/config ai view\` で現在の設定を確認`
        });
      } else {
        await interaction.reply({
          content: `❌ **相談セッションエラー**\n${errorMessage}`,
          ephemeral: true
        });
      }
    }
  },

  async analyzeRelatedMessages(
    interaction: ChatInputCommandInteraction,
    session: ConsultSession,
    context: any,
    analyzer: any,
    embed: EmbedBuilder
  ): Promise<void> {
    try {
      // Parse timeframe
      const timeframe = context.timeframe || 'today';
      if (!periodParser.validate(timeframe)) {
        return; // Skip if invalid timeframe
      }

      const dateRange = periodParser.parse(timeframe);

      // Get channels to analyze
      const channelsToAnalyze = [];
      if (context.relatedChannel) {
        channelsToAnalyze.push(context.relatedChannel);
      } else {
        // Use configured channels as fallback
        const serverConfig = await configManager.loadServerConfig(context.serverId);
        for (const channelId of serverConfig.analyzedChannels.slice(0, 3)) { // Limit to 3 channels
          try {
            const channel = await interaction.guild!.channels.fetch(channelId);
            if (channel && channel.type === ChannelType.GuildText) {
              channelsToAnalyze.push(channel);
            }
          } catch (error) {
            // Skip if can't fetch channel
          }
        }
      }

      if (channelsToAnalyze.length === 0) {
        return;
      }

      // Fetch messages
      const messages = await messageFetcher.fetchMessages(channelsToAnalyze, dateRange);
      const filteredMessages = messageFetcher.filterMessages(messages);

      if (filteredMessages.length === 0) {
        return;
      }

      // Filter messages by related users if specified
      let relevantMessages = filteredMessages;
      if (context.relatedUsers.length > 0) {
        const userIds = context.relatedUsers.map((u: User) => u.id);
        relevantMessages = filteredMessages.filter(msg =>
          userIds.includes(msg.author.id)
        );
      }

      if (relevantMessages.length === 0) {
        embed.addFields({
          name: '🔍 関連メッセージ分析',
          value: '指定された条件に該当するメッセージが見つかりませんでした。',
          inline: false
        });
        return;
      }

      // Extract and analyze related messages
      const messagesData = messageFetcher.extractMessageData(relevantMessages);

      const relatedAnalysis = await analyzer.analyzeRelatedMessages(
        session,
        context.relatedUsers || [],
        channelsToAnalyze.map((ch: any) => ({ id: ch.id, name: ch.name })),
        messagesData
      );

      // Add analysis to embed
      embed.addFields(
        {
          name: '🔍 関連メッセージ分析',
          value: `${relevantMessages.length}件のメッセージを分析しました`,
          inline: true
        },
        {
          name: '📊 分析結果',
          value: relatedAnalysis.analysis.slice(0, 300) +
                (relatedAnalysis.analysis.length > 300 ? '...' : ''),
          inline: false
        }
      );

    } catch (error) {
      logger.error('Related message analysis failed', error);
      // Don't throw, just skip related analysis
    }
  }
};