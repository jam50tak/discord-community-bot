import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { AnalysisResult, CommunityMetrics, TrendAnalysis } from '../types';

export class ReportGenerator {
  private static instance: ReportGenerator;

  public static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  public generateDiscordReport(
    analysis: AnalysisResult,
    period: string,
    channels: string[]
  ): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];

    // Main summary embed
    const summaryEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('📊 コミュニティ分析レポート')
      .setDescription(analysis.summary || 'コミュニティの活動を分析しました。')
      .addFields(
        {
          name: '📅 分析期間',
          value: period,
          inline: true
        },
        {
          name: '📺 対象チャンネル数',
          value: channels.length.toString(),
          inline: true
        },
        {
          name: '💬 総メッセージ数',
          value: analysis.metrics.totalMessages.toLocaleString(),
          inline: true
        }
      )
      .setTimestamp();

    embeds.push(summaryEmbed);

    // Metrics embed
    if (analysis.metrics) {
      const metricsEmbed = this.createMetricsEmbed(analysis.metrics);
      embeds.push(metricsEmbed);
    }

    // Trends embed
    if (analysis.trends) {
      const trendsEmbed = this.createTrendsEmbed(analysis.trends);
      embeds.push(trendsEmbed);
    }

    // Issues embed
    if (analysis.issues && analysis.issues.length > 0) {
      const issuesEmbed = this.createIssuesEmbed(analysis.issues);
      embeds.push(issuesEmbed);
    }

    // Recommendations embed
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      const recommendationsEmbed = this.createRecommendationsEmbed(analysis.recommendations);
      embeds.push(recommendationsEmbed);
    }

    return embeds;
  }

  private createMetricsEmbed(metrics: CommunityMetrics): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📈 活動指標')
      .addFields(
        {
          name: '👥 アクティブユーザー',
          value: metrics.activeUsers.toString(),
          inline: true
        },
        {
          name: '💬 総メッセージ数',
          value: metrics.totalMessages.toLocaleString(),
          inline: true
        },
        {
          name: '📊 平均メッセージ/ユーザー',
          value: metrics.activeUsers > 0
            ? Math.round(metrics.totalMessages / metrics.activeUsers).toString()
            : '0',
          inline: true
        }
      );

    // Channel activity
    if (metrics.channelActivity && metrics.channelActivity.length > 0) {
      const topChannels = metrics.channelActivity
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 5)
        .map(ch => `**${ch.channelName}**: ${ch.messageCount}件 (${ch.uniqueUsers}人)`)
        .join('\n');

      embed.addFields({
        name: '🏆 アクティブチャンネル TOP5',
        value: topChannels || 'データなし',
        inline: false
      });
    }

    // Time distribution
    if (metrics.timeDistribution && metrics.timeDistribution.length > 0) {
      const peakHours = metrics.timeDistribution
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 3)
        .map(time => `${time.hour}時: ${time.messageCount}件`)
        .join(', ');

      embed.addFields({
        name: '⏰ ピーク時間帯',
        value: peakHours || 'データなし',
        inline: false
      });
    }

    return embed;
  }

  private createTrendsEmbed(trends: TrendAnalysis): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('📊 トレンド分析');

    // Popular topics
    if (trends.popularTopics && trends.popularTopics.length > 0) {
      const topics = trends.popularTopics
        .slice(0, 5)
        .map(topic => `**${topic.name}** (${topic.mentions}回)`)
        .join('\n');

      embed.addFields({
        name: '🔥 人気トピック',
        value: topics,
        inline: false
      });
    }

    // Sentiment
    if (trends.sentimentOverall) {
      const sentiment = trends.sentimentOverall;
      const sentimentBar = this.createSentimentBar(sentiment);

      embed.addFields({
        name: '😊 全体的な雰囲気',
        value: `${sentimentBar}\n` +
               `ポジティブ: ${Math.round(sentiment.positive * 100)}% | ` +
               `ニュートラル: ${Math.round(sentiment.neutral * 100)}% | ` +
               `ネガティブ: ${Math.round(sentiment.negative * 100)}%`,
        inline: false
      });
    }

    // User engagement
    if (trends.userEngagement && trends.userEngagement.length > 0) {
      const topUsers = trends.userEngagement
        .slice(0, 5)
        .map(user => `**${user.username}**: ${user.messageCount}件`)
        .join('\n');

      embed.addFields({
        name: '🌟 アクティブユーザー TOP5',
        value: topUsers,
        inline: false
      });
    }

    return embed;
  }

  private createIssuesEmbed(issues: any[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0xff6600)
      .setTitle('⚠️ 注意点・課題');

    const issuesByPriority = {
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low')
    };

    if (issuesByPriority.high.length > 0) {
      const highIssues = issuesByPriority.high
        .map(issue => `• ${issue.description}`)
        .join('\n');

      embed.addFields({
        name: '🚨 高優先度',
        value: highIssues,
        inline: false
      });
    }

    if (issuesByPriority.medium.length > 0) {
      const mediumIssues = issuesByPriority.medium
        .slice(0, 3)
        .map(issue => `• ${issue.description}`)
        .join('\n');

      embed.addFields({
        name: '⚠️ 中優先度',
        value: mediumIssues,
        inline: false
      });
    }

    if (issuesByPriority.low.length > 0) {
      embed.addFields({
        name: '💡 低優先度',
        value: `${issuesByPriority.low.length}件の軽微な課題があります`,
        inline: false
      });
    }

    return embed;
  }

  private createRecommendationsEmbed(recommendations: any[]): EmbedBuilder {
    const embed = new EmbedBuilder()
      .setColor(0x00cc66)
      .setTitle('💡 改善提案');

    const recsByPriority = {
      high: recommendations.filter(r => r.priority === 'high'),
      medium: recommendations.filter(r => r.priority === 'medium'),
      low: recommendations.filter(r => r.priority === 'low')
    };

    if (recsByPriority.high.length > 0) {
      const highRecs = recsByPriority.high
        .slice(0, 3)
        .map(rec => `**${rec.title}**\n${rec.description}`)
        .join('\n\n');

      embed.addFields({
        name: '🎯 高優先度の改善策',
        value: highRecs,
        inline: false
      });
    }

    if (recsByPriority.medium.length > 0) {
      const mediumRecs = recsByPriority.medium
        .slice(0, 2)
        .map(rec => `• ${rec.title}`)
        .join('\n');

      embed.addFields({
        name: '📈 中期的な改善策',
        value: mediumRecs,
        inline: false
      });
    }

    // Add action items from high priority recommendations
    const actionItems = recsByPriority.high
      .flatMap(rec => rec.actionItems || [])
      .slice(0, 5);

    if (actionItems.length > 0) {
      embed.addFields({
        name: '✅ 次のアクション',
        value: actionItems.map(item => `• ${item}`).join('\n'),
        inline: false
      });
    }

    return embed;
  }

  private createSentimentBar(sentiment: any): string {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;
    if (total === 0) return '▱▱▱▱▱▱▱▱▱▱';

    const positiveBlocks = Math.round((sentiment.positive / total) * 10);
    const neutralBlocks = Math.round((sentiment.neutral / total) * 10);
    const negativeBlocks = 10 - positiveBlocks - neutralBlocks;

    return '🟢'.repeat(positiveBlocks) +
           '⚪'.repeat(neutralBlocks) +
           '🔴'.repeat(Math.max(0, negativeBlocks));
  }

  public generateTextReport(analysis: AnalysisResult): string {
    let report = '# コミュニティ分析レポート\n\n';

    // Summary
    report += '## 📊 分析概要\n';
    report += `${analysis.summary}\n\n`;

    // Metrics
    if (analysis.metrics) {
      report += '## 📈 活動指標\n';
      report += `- 総メッセージ数: ${analysis.metrics.totalMessages.toLocaleString()}\n`;
      report += `- アクティブユーザー数: ${analysis.metrics.activeUsers}\n`;
      report += `- 平均メッセージ/ユーザー: ${Math.round(analysis.metrics.totalMessages / analysis.metrics.activeUsers)}\n\n`;
    }

    // Issues
    if (analysis.issues && analysis.issues.length > 0) {
      report += '## ⚠️ 注意点・課題\n';
      analysis.issues.forEach((issue, index) => {
        report += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.description}\n`;
        report += `   対策: ${issue.suggestedAction}\n\n`;
      });
    }

    // Recommendations
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      report += '## 💡 改善提案\n';
      analysis.recommendations.forEach((rec, index) => {
        report += `${index + 1}. **${rec.title}** (優先度: ${rec.priority})\n`;
        report += `   ${rec.description}\n\n`;
      });
    }

    return report;
  }

  public createReportAttachment(analysis: AnalysisResult): AttachmentBuilder {
    const textReport = this.generateTextReport(analysis);
    const buffer = Buffer.from(textReport, 'utf-8');

    return new AttachmentBuilder(buffer, {
      name: `analysis-report-${new Date().toISOString().split('T')[0]}.md`
    });
  }
}

export const reportGenerator = ReportGenerator.getInstance();