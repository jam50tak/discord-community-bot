import { ErrorType } from '../types';
import { logger } from './logger';
import { Channel, GuildTextBasedChannel } from 'discord.js';

export interface ErrorContext {
  userId?: string;
  channelId?: string;
  serverId?: string;
  command?: string;
  additionalInfo?: Record<string, any>;
}

export interface UserFriendlyError {
  type: ErrorType;
  message: string;
  suggestion?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public async handleError(
    error: Error,
    context: ErrorContext
  ): Promise<UserFriendlyError> {
    logger.error('Error occurred', error, context);

    const errorType = this.classifyError(error);
    const userFriendlyMessage = this.getUserFriendlyMessage(errorType, error);

    return {
      type: errorType,
      message: userFriendlyMessage.message,
      suggestion: userFriendlyMessage.suggestion
    };
  }

  public async sendErrorMessage(
    channel: Channel,
    error: UserFriendlyError
  ): Promise<void> {
    if (!channel.isTextBased()) return;

    const textChannel = channel as GuildTextBasedChannel;
    const embed = {
      color: 0xff0000,
      title: '❌ エラーが発生しました',
      description: error.message,
      fields: error.suggestion ? [
        {
          name: '💡 解決策',
          value: error.suggestion,
          inline: false
        }
      ] : [],
      timestamp: new Date().toISOString()
    };

    try {
      await textChannel.send({ embeds: [embed] });
    } catch (sendError) {
      logger.error('Failed to send error message', sendError);
    }
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('missing permissions') || message.includes('forbidden')) {
      return ErrorType.PERMISSION_DENIED;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('discord') || message.includes('gateway')) {
      return ErrorType.DISCORD_API_ERROR;
    }
    if (message.includes('api key') || message.includes('unauthorized')) {
      return ErrorType.API_KEY_MISSING;
    }
    if (message.includes('openai') || message.includes('anthropic') || message.includes('gemini')) {
      return ErrorType.AI_API_ERROR;
    }
    if (message.includes('config') || message.includes('setting')) {
      return ErrorType.CONFIG_ERROR;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR;
    }

    return ErrorType.VALIDATION_ERROR;
  }

  private getUserFriendlyMessage(errorType: ErrorType, _error: Error): {
    message: string;
    suggestion?: string;
  } {
    switch (errorType) {
      case ErrorType.PERMISSION_DENIED:
        return {
          message: 'このコマンドを実行する権限がありません。',
          suggestion: '管理者権限を持つユーザーのみがこのコマンドを使用できます。'
        };

      case ErrorType.RATE_LIMIT_EXCEEDED:
        return {
          message: 'API制限に達しました。しばらく待ってから再試行してください。',
          suggestion: '1分後に再度お試しください。'
        };

      case ErrorType.API_KEY_MISSING:
        return {
          message: 'AIサービスのAPIキーが設定されていません。',
          suggestion: '`/config apikey set` コマンドでAPIキーを設定してください。'
        };

      case ErrorType.AI_API_ERROR:
        return {
          message: 'AIサービスとの通信でエラーが発生しました。',
          suggestion: 'APIキーが正しいか確認し、しばらく待ってから再試行してください。'
        };

      case ErrorType.CONFIG_ERROR:
        return {
          message: '設定に問題があります。',
          suggestion: '`/config` コマンドで設定を確認・修正してください。'
        };

      case ErrorType.DISCORD_API_ERROR:
        return {
          message: 'Discord APIでエラーが発生しました。',
          suggestion: 'しばらく待ってから再試行してください。'
        };

      case ErrorType.VALIDATION_ERROR:
      default:
        return {
          message: '入力内容に問題があります。',
          suggestion: 'コマンドの形式を確認して再試行してください。'
        };
    }
  }

  public logError(error: Error, context: ErrorContext): void {
    logger.error('Application error', error, context);
  }
}

export const errorHandler = ErrorHandler.getInstance();