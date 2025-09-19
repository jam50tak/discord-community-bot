export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  public debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  public info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  public warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  public error(message: string, error?: unknown, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      let errorStr = '';
      if (error) {
        if (error instanceof Error) {
          errorStr = ` | Error: ${error.message}\n${error.stack}`;
        } else {
          errorStr = ` | Error: ${String(error)}`;
        }
      }
      console.error(this.formatMessage(LogLevel.ERROR, message, context) + errorStr);
    }
  }
}

export const logger = Logger.getInstance();