import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIAnalyzer } from './ai-analyzer-factory';
import { AnalysisResult, AnalysisContext, ConsultSession, ConsultResponse } from '../types';
import { logger } from '../utils/logger';
import { promptManager } from '../config/prompt-manager';

export class GeminiAnalyzer implements AIAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  public async analyzeConversations(
    messagesData: any,
    context: AnalysisContext
  ): Promise<AnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(messagesData, context);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4000,
          temperature: 0.3
        }
      });

      const analysisText = result.response.text() || '';
      return this.parseAnalysisResult(analysisText, messagesData);
    } catch (error) {
      logger.error('Gemini analysis failed', error);
      throw new Error(`Gemini API analysis failed: ${error}`);
    }
  }

  public async startConsultSession(
    situation: string,
    context: any
  ): Promise<ConsultSession> {
    try {
      const sessionId = this.generateSessionId();
      const prompt = this.buildConsultPrompt(situation, context);

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.4
        }
      });

      const responseText = result.response.text() || '';

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
      logger.error('Gemini consult session start failed', error);
      throw new Error(`Failed to start consult session: ${error}`);
    }
  }

  public async continueConsultSession(
    session: ConsultSession,
    adminResponse: string
  ): Promise<ConsultResponse> {
    try {
      const conversationHistory = this.buildConversationHistory(session);
      const prompt = `${conversationHistory}\n\n管理者からの追加情報: ${adminResponse}\n\n上記の情報を踏まえて、より具体的で実行可能な対応策を提案してください。段階的なアプローチで、実践的な解決策を提示してください。`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.4
        }
      });

      const responseText = result.response.text() || '';

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
      logger.error('Gemini consult session continuation failed', error);
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
      const prompt = `以下の状況について、関連する会話データを詳細に分析してください：

## 相談内容
${session.conversation[0].content}

## 関連する会話データ
${JSON.stringify(messagesData, null, 2)}

## 分析対象ユーザー
${users.map(u => `- ${u.username} (ID: ${u.id})`).join('\n')}

## 関連チャンネル
${channels.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

以下の観点から分析してください：
1. 会話の時系列での流れ
2. ユーザー間の関係性と相互作用
3. 問題が発生した背景と経緯
4. 感情的な変化やトーンの変遷
5. 解決に向けた重要なポイント

分析結果を基に、効果的な介入策を提案してください。`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 3000,
          temperature: 0.3
        }
      });

      const analysisText = result.response.text() || '';

      return {
        analysis: analysisText,
        participants: users,
        timeline: this.extractTimeline(messagesData),
        keyIssues: this.extractKeyIssues(analysisText),
        context: analysisText
      };
    } catch (error) {
      logger.error('Gemini related messages analysis failed', error);
      throw new Error(`Failed to analyze related messages: ${error}`);
    }
  }

  private buildAnalysisPrompt(messagesData: any, context: AnalysisContext): string {
    const basePrompt = promptManager.getDefaultPrompt();

    let contextInfo = '\n\n## 追加コンテキスト\n';
    if (context.serverRules.length > 0) {
      contextInfo += `**サーバールール:**\n${context.serverRules.map(rule => `- ${rule}`).join('\n')}\n\n`;
    }

    if (context.clientRequirements.length > 0) {
      contextInfo += `**クライアント要望:**\n${context.clientRequirements.map(req => `- ${req}`).join('\n')}\n\n`;
    }

    if (context.communityContext) {
      contextInfo += `**コミュニティ情報:**\n`;
      contextInfo += `- サーバーサイズ: ${context.communityContext.serverSize}人\n`;
      contextInfo += `- 主要言語: ${context.communityContext.primaryLanguage}\n`;
      contextInfo += `- コミュニティタイプ: ${context.communityContext.communityType}\n`;
      contextInfo += `- アクティブ時間: ${context.communityContext.activeHours}\n\n`;
    }

    const dataSection = '## 分析対象データ\n' + JSON.stringify(messagesData, null, 2);

    return basePrompt + contextInfo + dataSection;
  }

  private buildConsultPrompt(situation: string, context: any): string {
    return `あなたはDiscordコミュニティの運営コンサルタントです。以下の相談について、専門的な分析と実践的な解決策を提案してください。

## 相談内容
${situation}

## サーバー情報
- サーバーID: ${context.serverId}
- 相談者: ${context.adminId}

## 求める分析と提案
1. **状況の整理**: 問題の本質と背景の分析
2. **関係者への影響**: 各ステークホルダーへの影響評価
3. **対応の優先順位**: 緊急度と重要度による優先付け
4. **具体的なアクション**: 段階的で実行可能な解決策
5. **予防策**: 同様の問題の再発防止策
6. **必要な追加情報**: さらなる分析に必要な情報

コミュニティの健全性を保ちながら、全ての関係者にとって最適な解決策を日本語で提案してください。`;
  }

  private buildConversationHistory(session: ConsultSession): string {
    return session.conversation.map(msg =>
      `[${msg.timestamp.toISOString()}] ${msg.sender}: ${msg.content}`
    ).join('\n\n');
  }

  private parseAnalysisResult(analysisText: string, messagesData: any): AnalysisResult {
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
    return `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}