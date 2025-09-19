import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType
} from 'discord.js';
import { configManager } from '../config/server-config';
import { apiKeyManager } from '../config/apikey-manager';
import { messageFetcher } from '../analysis/message-fetcher';
import { aiAnalyzerFactory } from '../analysis/ai-analyzer-factory';
import { reportGenerator } from '../analysis/report-generator';
import { permissionChecker } from '../utils/permission-checker';
import { periodParser } from '../utils/date-parser';
import { logger } from '../utils/logger';
import { AnalysisContext } from '../types';

export const analyzeCommand = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('指定した期間の会話を分析します')
    .addStringOption(option =>
      option
        .setName('period')
        .setDescription('分析期間')
        .setRequired(true)
        .addChoices(
          { name: '今日', value: 'today' },
          { name: '昨日', value: 'yesterday' }
        )
    )
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('日付指定 (YYYY-MM-DD形式、最大1週間前まで)')
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
    const hasPermission = await permissionChecker.canRunAnalysis(member as any);

    if (!hasPermission) {
      await interaction.reply({
        content: permissionChecker.getPermissionErrorMessage('会話分析'),
        ephemeral: true
      });
      return;
    }

    const serverId = interaction.guildId!;

    try {
      // Parse period
      let period = interaction.options.getString('period')!;
      const customDate = interaction.options.getString('date');

      if (customDate) {
        period = customDate;
      }

      if (!periodParser.validate(period)) {
        await interaction.reply({
          content: '❌ 無効な期間です。最大1週間前までの日付を指定してください。\n例: `2024-01-15`',
          ephemeral: true
        });
        return;
      }

      const dateRange = periodParser.parse(period);

      // Load configuration
      const serverConfig = await configManager.loadServerConfig(serverId);

      // Check if channels are configured
      if (serverConfig.analyzedChannels.length === 0) {
        await interaction.reply({
          content: '❌ 分析対象のチャンネルが設定されていません。\n`/config channels add` で設定してください。',
          ephemeral: true
        });
        return;
      }

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

      // Get channels
      const channels = [];
      for (const channelId of serverConfig.analyzedChannels) {
        try {
          const channel = await interaction.guild.channels.fetch(channelId);
          if (channel && channel.type === ChannelType.GuildText) {
            channels.push(channel);
          }
        } catch (error) {
          logger.warn(`Failed to fetch channel ${channelId}`, error);
        }
      }

      if (channels.length === 0) {
        await interaction.editReply({
          content: '❌ 有効な分析対象チャンネルが見つかりません。チャンネル設定を確認してください。'
        });
        return;
      }

      // Update status
      await interaction.editReply({
        content: `🔄 分析を開始しています...\n📅 期間: ${dateRange.label}\n📺 対象: ${channels.length}チャンネル`
      });

      // Fetch messages
      const messages = await messageFetcher.fetchMessages(channels, dateRange);
      const filteredMessages = messageFetcher.filterMessages(messages);

      if (filteredMessages.length === 0) {
        await interaction.editReply({
          content: `📊 指定された期間にメッセージが見つかりませんでした。\n📅 期間: ${dateRange.label}`
        });
        return;
      }

      // Update status
      await interaction.editReply({
        content: `🔄 ${filteredMessages.length}件のメッセージを分析中...\n🤖 AI: ${serverConfig.aiProvider.toUpperCase()}`
      });

      // Extract message data
      const messagesData = messageFetcher.extractMessageData(filteredMessages);

      // Prepare analysis context
      const analysisContext: AnalysisContext = {
        serverRules: serverConfig.rules,
        clientRequirements: serverConfig.clientRequirements,
        communityContext: {
          serverSize: interaction.guild.memberCount || 0,
          primaryLanguage: 'Japanese',
          communityType: 'Discord Community',
          activeHours: '24/7'
        }
      };

      // Get API key and create analyzer
      const apiKey = await apiKeyManager.getAPIKey(serverId, serverConfig.aiProvider);
      if (!apiKey) {
        throw new Error('APIキーの取得に失敗しました');
      }

      const analyzer = aiAnalyzerFactory.create(serverConfig.aiProvider, apiKey);

      // Run analysis
      const analysisResult = await analyzer.analyzeConversations(messagesData, analysisContext);

      // Generate report
      const embeds = reportGenerator.generateDiscordReport(
        analysisResult,
        `${dateRange.label} (${periodParser.formatDateRange(dateRange)})`,
        channels.map(ch => ch.name)
      );

      // Create text attachment
      const attachment = reportGenerator.createReportAttachment(analysisResult);

      // Send final result
      await interaction.editReply({
        content: `✅ **分析完了**\n📅 期間: ${dateRange.label}\n💬 分析メッセージ数: ${filteredMessages.length.toLocaleString()}件`,
        embeds: embeds,
        files: [attachment]
      });

      logger.info('Analysis completed', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        period: dateRange.label,
        messageCount: filteredMessages.length,
        channelCount: channels.length,
        aiProvider: serverConfig.aiProvider
      });

    } catch (error) {
      logger.error('Analysis command failed', error, {
        userId: interaction.user.id,
        guildId: interaction.guildId
      });

      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ **分析エラー**\n${errorMessage}\n\n設定やAPIキーを確認してください。`
        });
      } else {
        await interaction.reply({
          content: `❌ **分析エラー**\n${errorMessage}`,
          ephemeral: true
        });
      }
    }
  }
};