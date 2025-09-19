import { AIProvider, AnalysisResult, AnalysisContext, ConsultSession, ConsultResponse } from '../types';
import { ChatGPTAnalyzer } from './chatgpt-analyzer';
import { GeminiAnalyzer } from './gemini-analyzer';
import { ClaudeAnalyzer } from './claude-analyzer';
import { logger } from '../utils/logger';

export interface AIAnalyzer {
  analyzeConversations(
    messagesData: any,
    context: AnalysisContext
  ): Promise<AnalysisResult>;

  startConsultSession(
    situation: string,
    context: any
  ): Promise<ConsultSession>;

  continueConsultSession(
    session: ConsultSession,
    adminResponse: string
  ): Promise<ConsultResponse>;

  analyzeRelatedMessages(
    session: ConsultSession,
    users: any[],
    channels: any[],
    messagesData: any
  ): Promise<any>;
}

export class AIAnalyzerFactory {
  private static analyzers = new Map<string, AIAnalyzer>();

  public static create(provider: AIProvider, apiKey: string): AIAnalyzer {
    const cacheKey = `${provider}:${apiKey.slice(0, 10)}`;

    if (this.analyzers.has(cacheKey)) {
      return this.analyzers.get(cacheKey)!;
    }

    let analyzer: AIAnalyzer;

    switch (provider) {
      case 'chatgpt':
        analyzer = new ChatGPTAnalyzer(apiKey);
        break;
      case 'gemini':
        analyzer = new GeminiAnalyzer(apiKey);
        break;
      case 'claude':
        analyzer = new ClaudeAnalyzer(apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }

    this.analyzers.set(cacheKey, analyzer);
    logger.info(`Created ${provider} analyzer instance`);

    return analyzer;
  }

  public static async validateAPIKey(provider: AIProvider, apiKey: string): Promise<boolean> {
    try {
      const analyzer = this.create(provider, apiKey);

      // Test with a simple analysis request
      const testData = {
        totalMessages: 1,
        channels: [{
          channelName: 'test',
          messageCount: 1,
          messages: [{
            content: 'test message',
            authorName: 'test user',
            timestamp: new Date().toISOString()
          }]
        }],
        users: [{
          username: 'test user',
          messageCount: 1
        }]
      };

      const testContext: AnalysisContext = {
        serverRules: [],
        clientRequirements: [],
        communityContext: {
          serverSize: 100,
          primaryLanguage: 'Japanese',
          communityType: 'test',
          activeHours: '24/7'
        }
      };

      await analyzer.analyzeConversations(testData, testContext);
      return true;
    } catch (error) {
      logger.error(`API key validation failed for ${provider}`, error);
      return false;
    }
  }

  public static getSupportedProviders(): AIProvider[] {
    return ['chatgpt', 'gemini', 'claude'];
  }

  public static getProviderInfo(provider: AIProvider): any {
    switch (provider) {
      case 'chatgpt':
        return {
          name: 'ChatGPT (OpenAI)',
          models: ['gpt-4', 'gpt-3.5-turbo'],
          costEstimate: '低〜中',
          features: ['高品質な日本語対応', '幅広い知識', '安定した性能']
        };
      case 'gemini':
        return {
          name: 'Gemini (Google)',
          models: ['gemini-pro'],
          costEstimate: '低',
          features: ['無料利用可能', '高速処理', 'マルチモーダル対応']
        };
      case 'claude':
        return {
          name: 'Claude (Anthropic)',
          models: ['claude-3-sonnet', 'claude-3-haiku'],
          costEstimate: '中',
          features: ['詳細な分析', '安全性重視', '長文対応']
        };
      default:
        return null;
    }
  }

  public static clearCache(): void {
    this.analyzers.clear();
    logger.info('AI analyzer cache cleared');
  }
}

export const aiAnalyzerFactory = AIAnalyzerFactory;