/**
 * Centralized logging utility
 *
 * Usage:
 * import { createLogger } from '@/src/utils/logger';
 * const log = createLogger('MyComponent');
 *
 * log.debug('User action', { action: 'buttonPress' });
 * log.info('Data loaded', { count: items.length });
 * log.warn('Cache miss', { key: cacheKey });
 * log.error('Failed to save', error, { userId });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, data?: LogData) => void;
  info: (message: string, data?: LogData) => void;
  warn: (message: string, data?: LogData) => void;
  error: (message: string, error?: Error | unknown, data?: LogData) => void;
}

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Current log level based on environment
// In development: show all logs
// In production: only show warnings and errors
const CURRENT_LEVEL: number = __DEV__ ? LOG_LEVELS.debug : LOG_LEVELS.warn;

// Color codes for different log levels (for console output)
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};

const RESET_COLOR = '\x1b[0m';

/**
 * Format log data for output
 */
function formatData(data?: LogData): string {
  if (!data || Object.keys(data).length === 0) {
    return '';
  }
  try {
    return JSON.stringify(data, null, __DEV__ ? 2 : 0);
  } catch {
    return '[Unable to stringify data]';
  }
}

/**
 * Format error for output
 */
function formatError(error?: Error | unknown): string {
  if (!error) return '';

  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Core logging function
 */
function logMessage(
  level: LogLevel,
  module: string,
  message: string,
  error?: Error | unknown,
  data?: LogData
): void {
  // Check if we should log at this level
  if (LOG_LEVELS[level] < CURRENT_LEVEL) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[${module}]`;
  const formattedData = formatData(data);
  const formattedError = formatError(error);

  // Build log message
  const logParts: string[] = [prefix, message];

  if (formattedData) {
    logParts.push(formattedData);
  }

  if (formattedError) {
    logParts.push(formattedError);
  }

  const fullMessage = logParts.join(' ');

  // Use appropriate console method
  switch (level) {
    case 'debug':
      if (__DEV__) {
        console.log(`${LEVEL_COLORS.debug}[DEBUG]${RESET_COLOR} ${timestamp} ${fullMessage}`);
      }
      break;
    case 'info':
      console.info(`${LEVEL_COLORS.info}[INFO]${RESET_COLOR} ${timestamp} ${fullMessage}`);
      break;
    case 'warn':
      console.warn(`${LEVEL_COLORS.warn}[WARN]${RESET_COLOR} ${timestamp} ${fullMessage}`);
      break;
    case 'error':
      console.error(`${LEVEL_COLORS.error}[ERROR]${RESET_COLOR} ${timestamp} ${fullMessage}`);
      // In production, you could send to error tracking service here
      // e.g., Sentry.captureException(error);
      break;
  }
}

/**
 * Create a logger instance for a specific module
 *
 * @param module - The module/component name for log prefixing
 * @returns Logger instance with debug, info, warn, error methods
 *
 * @example
 * const log = createLogger('AuthContext');
 * log.info('User signed in', { userId: user.id });
 * log.error('Sign in failed', error, { provider: 'google' });
 */
export function createLogger(module: string): Logger {
  return {
    /**
     * Debug level - Development info, not shown in production
     */
    debug: (message: string, data?: LogData) => {
      logMessage('debug', module, message, undefined, data);
    },

    /**
     * Info level - Important events worth tracking
     */
    info: (message: string, data?: LogData) => {
      logMessage('info', module, message, undefined, data);
    },

    /**
     * Warn level - Potential issues, but recoverable
     */
    warn: (message: string, data?: LogData) => {
      logMessage('warn', module, message, undefined, data);
    },

    /**
     * Error level - Errors that need attention
     * Always logs, regardless of environment
     */
    error: (message: string, error?: Error | unknown, data?: LogData) => {
      logMessage('error', module, message, error, data);
    },
  };
}

/**
 * Default logger for quick use
 * Prefer createLogger() for module-specific logging
 */
export const logger = createLogger('App');

/**
 * Utility to check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return CURRENT_LEVEL <= LOG_LEVELS.debug;
}

/**
 * Utility to temporarily enable all logging (for debugging)
 * Note: This only affects the current session
 */
let temporaryLogLevel: number | null = null;

export function enableAllLogging(): void {
  temporaryLogLevel = LOG_LEVELS.debug;
  console.log('[Logger] All logging enabled for this session');
}

export function resetLoggingLevel(): void {
  temporaryLogLevel = null;
  console.log('[Logger] Logging level reset to default');
}
