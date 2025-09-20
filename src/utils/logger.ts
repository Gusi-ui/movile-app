/**
 * Sistema de logging personalizado para la aplicación
 * Permite controlar los logs en producción y desarrollo
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
}

const config: LoggerConfig = {
  enabledInProduction: false,
  minLevel: __DEV__ ? 'debug' : 'error',
};

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const shouldLog = (level: LogLevel): boolean => {
  if (!__DEV__ && !config.enabledInProduction) {
    return level === 'error';
  }
  return logLevels[level] >= logLevels[config.minLevel];
};

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', ...args);
    }
  },

  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', ...args);
    }
  },

  log: (...args: unknown[]): void => {
    // Alias para debug
    logger.debug(...args);
  },
};

export default logger;
