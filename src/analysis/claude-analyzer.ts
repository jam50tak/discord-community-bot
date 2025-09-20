import Anthropic from '@anthropic-ai/sdk';
import { AIAnalyzer } from './ai-analyzer-factory';
import { AnalysisResult, AnalysisContext, ConsultSession, ConsultResponse } from '../types';
import { logger } from '../utils/logger';
import { promptManager } from '../config/prompt-manager';

export class ClaudeAnalyzer implements AIAnalyzer {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey
    });
  }

  public async analyzeConversations(
    messagesData: any,
    context: AnalysisContext
  ): Promise<AnalysisResult> {
    try {
      const prompt = await this.buildAnalysisPrompt(messagesData, context);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      return this.parseAnalysisResult(analysisText, messagesData);
    } catch (error) {
      logger.error('Claude analysis failed', error);
      throw new Error(`Claude API analysis failed: ${error}`);
    }
  }

  public async startConsultSession(
    situation: string,
    context: any
  ): Promise<ConsultSession> {
    try {
      const sessionId = this.generateSessionId();
      const prompt = this.buildConsultPrompt(situation, context);

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      const session: ConsultSession = {
        sessionId,
        channelId: context.channelId,
        adminId: context.adminId,
        status: 'waiting_info',
        context: context,
        conversation: [
          {
            timestamp: new Date(),
            sender: 'admin',
            content: situation,
            type: 'input'
          },
          {
            timestamp: new Date(),
            sender: 'bot',
            content: responseText,
            type: 'analysis'
          }
        ]
      };

      return session;
    } catch (error) {
      logger.error('Claude consult session start failed', error);
      throw new Error(`Failed to start consult session: ${error}`);
    }
  }

  public async continueConsultSession(
    session: ConsultSession,
    adminResponse: string
  ): Promise<ConsultResponse> {
    try {
      const conversationHistory = this.buildConversationHistory(session);
      const prompt = `${conversationHistory}\n\n管理者からの追加情報: ${adminResponse}\n\n上記の情報を踏まえて、より具体的な対応策を提案してください。`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const responseText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Update session
      session.conversation.push(
        {
          timestamp: new Date(),
          sender: 'admin',
          content: adminResponse,
          type: 'input'
        },
        {
          timestamp: new Date(),
          sender: 'bot',
          content: responseText,
          type: 'solution'
        }
      );

      return {
        type: 'solution',
        message: responseText,
        recommendations: this.extractRecommendations(responseText),
        nextSteps: this.extractNextSteps(responseText)
      };
    } catch (error) {
      logger.error('Claude consult session continuation failed', error);
      throw new Error(`Failed to continue consult session: ${error}`);
    }
  }

  public async analyzeRelatedMessages(
    session: ConsultSession,
    users: any[],
    channels: any[],
    messagesData: any
  ): Promise<any> {
    try {
      const prompt = `以下の状況について、関連する会話データを分析してください：

## 相談内容
${session.conversation[0].content}

## 関連する会話データ
${JSON.stringify(messagesData, null, 2)}

## 分析対象ユーザー
${users.map(u => `- ${u.username} (ID: ${u.id})`).join('\n')}

## 関連チャンネル
${channels.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

上記のデータから、状況に関連する重要な情報を抽出し、問題の背景や経緯を分析してください。`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisText = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      return {
        analysis: analysisText,
        participants: users,
        timeline: this.extractTimeline(messagesData),
        keyIssues: this.extractKeyIssues(analysisText),
        context: analysisText
      };
    } catch (error) {
      logger.error('Claude related messages analysis failed', error);
      throw new Error(`Failed to analyze related messages: ${error}`);
    }
  }

  private async buildAnalysisPrompt(messagesData: any, context: AnalysisContext): Promise<string> {
    // サーバー設定を取得してカスタムプロンプトを使用
    const { configManager } = await import('../config/server-config');
    const serverConfig = await configManager.loadServerConfig(context.serverId);
    return promptManager.buildAnalysisPrompt(serverConfig, messagesData, context);
  }

  private buildConsultPrompt(situation: string, context: any): string {
    return `あなたはDiscordコミュニティの運営コンサルタントです。以下の相談について、初期分析と対応の方向性を提示してください。

## 相談内容
${situation}

## サーバー情報
- サーバーID: ${context.serverId}
- 相談者: ${context.adminId}

## 初期対応
1. 状況の整理と問題の特定
2. 必要な追加情報の確認
3. 対応の優先順位
4. 初期アクションの提案

相談内容を分析し、具体的で実行可能な初期対応策を日本語で提案してください。追加で必要な情報があれば質問してください。`;
  }

  private buildConversationHistory(session: ConsultSession): string {
    return session.conversation.map(msg =>
      `[${msg.timestamp.toISOString()}] ${msg.sender}: ${msg.content}`
    ).join('\n\n');
  }

  private parseAnalysisResult(analysisText: string, messagesData: any): AnalysisResult {
    // Basic parsing - in a real implementation, you might want more sophisticated parsing
    const metrics = {
      totalMessages: messagesData.totalMessages || 0,
      activeUsers: messagesData.users?.length || 0,
      channelActivity: messagesData.channels?.map((ch: any) => ({
        channelId: ch.channelId,
        channelName: ch.channelName,
        messageCount: ch.messageCount,
        uniqueUsers: ch.uniqueUsers
      })) || [],
      timeDistribution: messagesData.timeline || []
    };

    return {
      summary: this.extractSummary(analysisText),
      metrics,
      trends: {
        popularTopics: this.extractPopularTopics(analysisText),
        sentimentOverall: { positive: 0.7, neutral: 0.2, negative: 0.1 },
        userEngagement: messagesData.users?.slice(0, 10).map((user: any) => ({
          userId: user.id,
          username: user.username,
          messageCount: user.messageCount,
          averageSentiment: 0.5
        })) || []
      },
      issues: this.extractIssues(analysisText),
      recommendations: this.extractRecommendations(analysisText)
    };
  }

  private extractSummary(text: string): string {
    const lines = text.split('\n');
    const summaryStart = lines.findIndex(line =>
      line.includes('要約') || line.includes('サマリー') || line.includes('概要')
    );

    if (summaryStart !== -1) {
      return lines.slice(summaryStart + 1, summaryStart + 5).join('\n').trim();
    }

    return lines.slice(0, 3).join('\n').trim();
  }

  private extractPopularTopics(text: string): any[] {
    // Simple extraction - could be improved with better parsing
    const topics = [];
    const topicMatches = text.match(/話題|トピック|テーマ.*?[:：]\s*(.+?)[\n。]/g);

    if (topicMatches) {
      for (const match of topicMatches.slice(0, 5)) {
        const topic = match.split(/[:：]/)[1]?.trim().replace(/[\n。]/, '');
        if (topic) {
          topics.push({
            name: topic,
            mentions: Math.floor(Math.random() * 10) + 1,
            sentiment: { positive: 0.6, neutral: 0.3, negative: 0.1 }
          });
        }
      }
    }

    return topics;
  }

  private extractIssues(text: string): any[] {
    const issues = [];
    const issueKeywords = ['問題', '課題', 'トラブル', '注意', '改善'];

    for (const keyword of issueKeywords) {
      const regex = new RegExp(`${keyword}.*?[:：]\\s*(.+?)[\n。]`, 'g');
      const matches = text.match(regex);

      if (matches) {
        for (const match of matches.slice(0, 3)) {
          const description = match.split(/[:：]/)[1]?.trim().replace(/[\n。]/, '');
          if (description) {
            issues.push({
              type: 'low_engagement',
              severity: 'medium',
              description,
              suggestedAction: '詳細な調査と対応策の検討が必要です'
            });
          }
        }
      }
    }

    return issues;
  }

  private extractRecommendations(text: string): any[] {
    const recommendations = [];
    const recKeywords = ['提案', '推奨', '改善策', '対策', 'アクション'];

    for (const keyword of recKeywords) {
      const regex = new RegExp(`${keyword}.*?[:：]\\s*(.+?)[\n。]`, 'g');
      const matches = text.match(regex);

      if (matches) {
        for (const match of matches.slice(0, 5)) {
          const description = match.split(/[:：]/)[1]?.trim().replace(/[\n。]/, '');
          if (description) {
            recommendations.push({
              priority: 'medium',
              category: 'engagement',
              title: description.slice(0, 50),
              description,
              actionItems: [description]
            });
          }
        }
      }
    }

    return recommendations;
  }

  private extractNextSteps(text: string): string[] {
    const steps = [];
    const stepKeywords = ['次のステップ', 'アクションアイテム', '実行項目'];

    for (const keyword of stepKeywords) {
      const regex = new RegExp(`${keyword}.*?[:：]\\s*(.+?)(?=\\n\\n|$)`, 's');
      const match = text.match(regex);

      if (match) {
        const stepsText = match[1];
        const stepLines = stepsText.split('\n').filter(line =>
          line.trim() && (line.includes('-') || line.includes('•') || /^\d+\./.test(line.trim()))
        );
        steps.push(...stepLines.map(line => line.replace(/^[-•\d.]\s*/, '').trim()));
      }
    }

    return steps.slice(0, 5);
  }

  private extractKeyIssues(text: string): any[] {
    return this.extractIssues(text);
  }

  private extractTimeline(messagesData: any): any[] {
    return messagesData.timeline || [];
  }

  private generateSessionId(): string {
    return `claude_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}