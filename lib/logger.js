// Simple structured logger
class Logger {
  constructor(context = {}) {
    this.context = context
  }

  with(fields = {}) {
    return new Logger({ ...this.context, ...fields })
  }

  log(level, message, extra = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...extra
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry))
  }

  info(message, extra) { this.log('info', message, extra) }
  warn(message, extra) { this.log('warn', message, extra) }
  error(message, extra) { this.log('error', message, extra) }
}

module.exports = { Logger }
