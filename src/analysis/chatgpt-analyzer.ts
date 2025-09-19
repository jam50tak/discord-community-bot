import OpenAI from 'openai';
import { AIAnalyzer } from './ai-analyzer-factory';
import { AnalysisResult, AnalysisContext, ConsultSession, ConsultResponse } from '../types';
import { logger } from '../utils/logger';
import { promptManager } from '../config/prompt-manager';

export class ChatGPTAnalyzer implements AIAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  public async analyzeConversations(
    messagesData: any,
    context: AnalysisContext
  ): Promise<AnalysisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(messagesData, context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたはDiscordコミュニティの分析専門家です。提供されたデータを詳細に分析し、建設的で実用的な洞察を提供してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      });

      const analysisText = response.choices[0]?.message?.content || '';
      return this.parseAnalysisResult(analysisText, messagesData);
    } catch (error) {
      logger.error('ChatGPT analysis failed', error);
      throw new Error(`OpenAI API analysis failed: ${error}`);
    }
  }

  public async startConsultSession(
    situation: string,
    context: any
  ): Promise<ConsultSession> {
    try {
      const sessionId = this.generateSessionId();
      const prompt = this.buildConsultPrompt(situation, context);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたはDiscordコミュニティの運営コンサルタントです。相談内容を詳しく分析し、実践的で段階的な解決策を提案してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.4
      });

      const responseText = response.choices[0]?.message?.content || '';

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
      logger.error('ChatGPT consult session start failed', error);
      throw new Error(`Failed to start consult session: ${error}`);
    }
  }

  public async continueConsultSession(
    session: ConsultSession,
    adminResponse: string
  ): Promise<ConsultResponse> {
    try {
      const messages = this.buildConversationMessages(session, adminResponse);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 2000,
        temperature: 0.4
      });

      const responseText = response.choices[0]?.message?.content || '';

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
      logger.error('ChatGPT consult session continuation failed', error);
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

会話の流れ、ユーザー間の関係性、問題の背景を詳しく分析し、解決に向けた具体的な洞察を提供してください。`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'あなたはコミュニティの会話分析の専門家です。提供されたデータから重要な情報を抽出し、問題解決に役立つ洞察を提供してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.3
      });

      const analysisText = response.choices[0]?.message?.content || '';

      return {
        analysis: analysisText,
        participants: users,
        timeline: this.extractTimeline(messagesData),
        keyIssues: this.extractKeyIssues(analysisText),
        context: analysisText
      };
    } catch (error) {
      logger.error('ChatGPT related messages analysis failed', error);
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
    return `以下のDiscordコミュニティでの問題について、専門的な分析と対応策を提案してください：

## 相談内容
${situation}

## サーバー情報
- サーバーID: ${context.serverId}
- 相談者: ${context.adminId}

## 求める回答
1. 状況の詳細分析
2. 潜在的な問題の特定
3. 段階的な対応策
4. 予防策の提案
5. 追加で必要な情報

実践的で実行可能な解決策を、具体的な手順とともに日本語で提案してください。`;
  }

  private buildConversationMessages(session: ConsultSession, newMessage: string): any[] {
    const messages = [
      {
        role: 'system',
        content: 'あなたはDiscordコミュニティの運営コンサルタントです。これまでの会話を踏まえ、さらに詳細で実用的なアドバイスを提供してください。'
      }
    ];

    // Add conversation history
    for (const msg of session.conversation) {
      messages.push({
        role: msg.sender === 'admin' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add new message
    messages.push({
      role: 'user',
      content: `追加情報: ${newMessage}\n\n上記の情報を踏まえて、より具体的で実行可能な対応策を提案してください。`
    });

    return messages;
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
    return `chatgpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}