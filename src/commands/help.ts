import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger';
import { aiAnalyzerFactory } from '../analysis/ai-analyzer-factory';
import { periodParser } from '../utils/date-parser';

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('ボットの使用方法とコマンドの説明を表示します'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('🤖 Discord AI管理Bot - ヘルプ')
        .setDescription('AI搭載のDiscordコミュニティ管理ボットです。会話の分析、トラブル相談、コミュニティ運営の改善提案を行います。')
        .addFields(
          {
            name: '📊 `/analyze`',
            value: '会話を分析してレポートを生成\n```\n/analyze period:today\n/analyze period:yesterday\n/analyze period:2024-01-15\n```',
            inline: false
          },
          {
            name: '⚡ `/quick-analyze`',
            value: '設定済みの条件でワンクリック分析\n```\n/quick-analyze\n```',
            inline: false
          },
          {
            name: '🔧 `/config`',
            value: 'ボットの設定管理\n```\n/config ai set provider:claude\n/config apikey set provider:claude key:your_key\n/config channels add channel:#general\n/config prompt set prompt:カスタムプロンプト\n```',
            inline: false
          },
          {
            name: '💬 `/consult`',
            value: 'トラブルや問題について相談\n```\n/consult situation:ユーザー間でトラブルが発生しています\n```',
            inline: false
          },
          {
            name: '❓ `/help`',
            value: 'このヘルプメッセージを表示',
            inline: false
          }
        )
        .addFields(
          {
            name: '🔑 対応AI',
            value: this.getAIProvidersInfo(),
            inline: true
          },
          {
            name: '📅 期間指定',
            value: this.getPeriodInfo(),
            inline: true
          },
          {
            name: '⚙️ 初期設定',
            value: this.getSetupInfo(),
            inline: false
          }
        )
        .setFooter({
          text: 'Discord AI管理Bot | 詳細な情報が必要な場合は /help を再実行してください'
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });

      logger.info('Help command executed', {
        userId: interaction.user.id,
        guildId: interaction.guildId
      });
    } catch (error) {
      logger.error('Help command failed', error);
      await interaction.reply({
        content: '❌ ヘルプの表示中にエラーが発生しました。',
        ephemeral: true
      });
    }
  },

  getAIProvidersInfo(): string {
    const providers = aiAnalyzerFactory.getSupportedProviders();
    return providers.map(provider => {
      const info = aiAnalyzerFactory.getProviderInfo(provider);
      return `**${info.name}**\n${info.features[0]}`;
    }).join('\n\n');
  },

  getPeriodInfo(): string {
    const periods = periodParser.getAvailablePeriods();
    return periods.map(period =>
      `**${period.label}**: ${period.description}`
    ).join('\n\n');
  },

  getSetupInfo(): string {
    return `1. **AIプロバイダー設定**\n` +
           `   \`/config ai set provider:claude\`\n\n` +
           `2. **APIキー設定**\n` +
           `   \`/config apikey set provider:claude key:your_api_key\`\n\n` +
           `3. **分析チャンネル設定**\n` +
           `   \`/config channels add channel:#general\`\n\n` +
           `4. **分析実行**\n` +
           `   \`/analyze period:today\` または \`/quick-analyze\``;
  }
};