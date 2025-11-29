/**
 * Frontend logging utility
 * Logs to console and can be extended to send to backend
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
    this.logs = [];
    this.maxLogs = 100; // Keep last 100 logs in memory
  }

  _log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    };

    // Add to in-memory log array
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console logging
    const consoleMethod = level.toLowerCase() === 'error' ? 'error' : 
                         level.toLowerCase() === 'warn' ? 'warn' : 
                         level.toLowerCase() === 'debug' ? 'debug' : 'log';
    
    if (LOG_LEVELS[level] >= this.level) {
      console[consoleMethod](`[${timestamp}] [${level}] ${message}`, data || '');
    }

    // In production, you could send errors to backend
    if (level === 'ERROR' && process.env.NODE_ENV === 'production') {
      this._sendToBackend(logEntry);
    }
  }

  _sendToBackend(logEntry) {
    // Optionally send critical errors to backend for logging
    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Silently fail if backend is not available
      });
    } catch (e) {
      // Ignore errors in logging
    }
  }

  debug(message, data) {
    this._log('DEBUG', message, data);
  }

  info(message, data) {
    this._log('INFO', message, data);
  }

  warn(message, data) {
    this._log('WARN', message, data);
  }

  error(message, error) {
    this._log('ERROR', message, {
      message: error?.message,
      stack: error?.stack,
      ...error,
    });
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;

