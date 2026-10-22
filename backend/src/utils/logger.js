// Tiny structured (JSON) logger -> easy to grep in PM2 logs
const write = (level, msg, meta = {}) =>
  console[level === 'error' ? 'error' : 'log'](
    JSON.stringify({ time: new Date().toISOString(), level, msg, ...meta })
  );

export const logger = {
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta)
};
