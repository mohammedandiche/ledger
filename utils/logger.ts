const isDev = process.env.NODE_ENV !== 'production';

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, tag: string, message: string, data?: unknown): void {
  if (level === 'debug' && !isDev) return;
  const prefix = `[${tag}]`;
  const extra = data !== undefined ? [data] : [];
  switch (level) {
    case 'debug':
      console.log(prefix, message, ...extra);
      break;
    case 'info':
      console.info(prefix, message, ...extra);
      break;
    case 'warn':
      console.warn(prefix, message, ...extra);
      break;
    case 'error':
      console.error(prefix, message, ...extra);
      break;
  }
}

export const logger = {
  debug: (tag: string, msg: string, data?: unknown) => emit('debug', tag, msg, data),
  info: (tag: string, msg: string, data?: unknown) => emit('info', tag, msg, data),
  warn: (tag: string, msg: string, data?: unknown) => emit('warn', tag, msg, data),
  error: (tag: string, msg: string, data?: unknown) => emit('error', tag, msg, data),
};
