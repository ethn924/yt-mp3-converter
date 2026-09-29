const config = require('../config');

const levels = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level, message, meta = {}) {
  if (levels[level] > levels[config.nodeEnv === 'production' ? 'info' : 'debug']) return;
  const entry = { timestamp: new Date().toISOString(), level, message, ...meta };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};
