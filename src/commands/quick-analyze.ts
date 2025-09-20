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

export const quickAnalyzeCommand = {
  data: new SlashCommandBuilder()
    .setName('quick-analyze')
    .setDescription('設定済みの条件でワンクリック分析を実行します'),

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
    const hasPermission = await permissionChecker.canQuickAnalyze(member as any);

    if (!hasPermission) {
      await interaction.reply({
        content: permissionChecker.getPermissionErrorMessage('会話分析'),
        ephemeral: true
      });
      return;
    }

    const serverId = interaction.guildId!;

    try {
      // Load configuration
      const serverConfig = await configManager.loadServerConfig(serverId);

      // Check if channels are configured
      if (serverConfig.analyzedChannels.length === 0) {
        await interaction.reply({
          content: '❌ **設定が不完全です**\n\n分析対象のチャンネルが設定されていません。\n\n**設定方法:**\n`/config channels add channel:#general`',
          ephemeral: true
        });
        return;
      }

      // Check if API key is configured
      const hasAPIKey = await apiKeyManager.hasValidAPIKey(serverId, serverConfig.aiProvider);
      if (!hasAPIKey) {
        await interaction.reply({
          content: `❌ **設定が不完全です**\n\n${serverConfig.aiProvider.toUpperCase()} のAPIキーが設定されていません。\n\n**設定方法:**\n\`/config apikey set provider:${serverConfig.aiProvider} key:your_api_key\``,
          ephemeral: true
        });
        return;
      }

      // Use default period from config
      const period = serverConfig.settings.defaultAnalysisPeriod;
      const dateRange = periodParser.parse(period);

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

      // Show quick start message
      await interaction.editReply({
        content: `⚡ **クイック分析開始**\n\n` +
                 `🤖 **AI**: ${serverConfig.aiProvider.toUpperCase()}\n` +
                 `📅 **期間**: ${dateRange.label}\n` +
                 `📺 **チャンネル**: ${channels.length}個\n` +
                 `📝 **プロンプト**: ${serverConfig.settings.useCustomPrompt ? 'カスタム' : 'デフォルト'}\n\n` +
                 `🔄 メッセージを収集中...`
      });

      // Fetch messages
      const messages = await messageFetcher.fetchMessages(channels, dateRange);
      const filteredMessages = messageFetcher.filterMessages(messages);

      if (filteredMessages.length === 0) {
        await interaction.editReply({
          content: `📊 **分析完了**\n\n指定された期間にメッセージが見つかりませんでした。\n📅 期間: ${dateRange.label}`
        });
        return;
      }

      // Update status
      await interaction.editReply({
        content: `⚡ **クイック分析進行中**\n\n` +
                 `📊 **収集完了**: ${filteredMessages.length.toLocaleString()}件のメッセージ\n` +
                 `🔍 AI分析を実行中...\n\n` +
                 `💡 *分析には1-2分かかる場合があります*`
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
      const successMessage = `⚡ **クイック分析完了！**\n\n` +
                            `📊 **結果概要**:\n` +
                            `• 分析期間: ${dateRange.label}\n` +
                            `• メッセージ数: ${filteredMessages.length.toLocaleString()}件\n` +
                            `• アクティブユーザー: ${analysisResult.metrics.activeUsers}人\n` +
                            `• 使用AI: ${serverConfig.aiProvider.toUpperCase()}\n\n` +
                            `📋 詳細なレポートは添付ファイルをご確認ください。`;

      await interaction.editReply({
        content: successMessage,
        embeds: embeds,
        files: [attachment]
      });

      logger.info('Quick analysis completed', {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        period: dateRange.label,
        messageCount: filteredMessages.length,
        channelCount: channels.length,
        aiProvider: serverConfig.aiProvider,
        useCustomPrompt: serverConfig.settings.useCustomPrompt
      });

    } catch (error) {
      logger.error('Quick analyze command failed', error, {
        userId: interaction.user.id,
        guildId: interaction.guildId
      });

      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

      if (interaction.deferred) {
        await interaction.editReply({
          content: `❌ **クイック分析エラー**\n\n` +
                   `${errorMessage}\n\n` +
                   `**トラブルシューティング:**\n` +
                   `• APIキーが正しく設定されているか確認\n` +
                   `• 分析対象チャンネルにアクセス権限があるか確認\n` +
                   `• \`/config ai view\` で設定を確認`
        });
      } else {
        await interaction.reply({
          content: `❌ **クイック分析エラー**\n${errorMessage}`,
          ephemeral: true
        });
      }
    }
  }
};