type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string) {
  if (!import.meta.env.DEV) {
    return;
  }

  console[level](message);
}

export const logger = {
  info(message: string) {
    log('info', message);
  },
  warn(message: string) {
    log('warn', message);
  },
  error(message: string) {
    log('error', message);
  },
};
