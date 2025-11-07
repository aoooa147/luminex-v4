/**
 * Logger Utility
 * Replaces console.log with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }[level];

    if (data) {
      return `${emoji} ${prefix} ${message} ${JSON.stringify(data, null, this.isDevelopment ? 2 : 0)}`;
    }
    return `${emoji} ${prefix} ${message}`;
  }

  debug(message: string, data?: any, context?: string) {
    if (this.shouldLog('debug')) {
      if (this.isDevelopment) {
        console.debug(this.formatMessage('debug', message, data, context));
      }
    }
  }

  info(message: string, data?: any, context?: string) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, data, context));
    }
  }

  warn(message: string, data?: any, context?: string) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, data, context));
    }
  }

  error(message: string, error?: any, context?: string) {
    if (this.shouldLog('error')) {
      const errorData = error instanceof Error 
        ? { errorMessage: error.message, stack: error.stack, name: error.name, ...(error as any) }
        : error;
      console.error(this.formatMessage('error', message, errorData, context));
    }
  }

  // Convenience methods for common patterns
  log(message: string, data?: any, context?: string) {
    this.info(message, data, context);
  }

  success(message: string, data?: any, context?: string) {
    this.info(`✅ ${message}`, data, context);
  }

  failure(message: string, error?: any, context?: string) {
    this.error(`❌ ${message}`, error, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export Logger class for custom instances
export default Logger;

