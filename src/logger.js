/**
 * Logger configuration for WhatsApp Group Creator Bot
 * Uses winston for advanced logging capabilities
 */

const winston = require('winston');
const path = require('path');

// Initialize a global array to keep the last 50 log entries for web interface
if (!global.webInterfaceLogs) {
  global.webInterfaceLogs = [];
}

// Configure logger with timestamp and colored output
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'whatsapp-group-creator' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `${timestamp} ${level}: ${message}`;
        })
      )
    }),
    // File transport for production logs
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      dirname: path.join(__dirname, '../logs')
    }),
    new winston.transports.File({ 
      filename: 'combined.log',
      dirname: path.join(__dirname, '../logs')
    })
  ]
});

// Create directory structure if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create a custom logger that also adds logs to our web interface array
const originalLoggerMethods = {
  info: logger.info.bind(logger),
  error: logger.error.bind(logger),
  warn: logger.warn.bind(logger),
  debug: logger.debug.bind(logger)
};

// Override the logger methods to also add entries to our web interface log array
logger.info = function(message, ...args) {
  // Add to web interface logs
  addToWebInterfaceLogs('info', message);
  // Call the original method
  return originalLoggerMethods.info(message, ...args);
};

logger.error = function(message, ...args) {
  // Add to web interface logs
  addToWebInterfaceLogs('error', message);
  // Call the original method
  return originalLoggerMethods.error(message, ...args);
};

logger.warn = function(message, ...args) {
  // Add to web interface logs
  addToWebInterfaceLogs('warn', message);
  // Call the original method
  return originalLoggerMethods.warn(message, ...args);
};

logger.debug = function(message, ...args) {
  // Add to web interface logs
  addToWebInterfaceLogs('debug', message);
  // Call the original method
  return originalLoggerMethods.debug(message, ...args);
};

// Helper function to add a log entry to the web interface logs array
function addToWebInterfaceLogs(level, message) {
  const timestamp = new Date().toISOString();
  global.webInterfaceLogs.unshift({
    timestamp,
    level,
    message: typeof message === 'object' ? JSON.stringify(message) : message
  });
  
  // Keep only the last 50 log entries
  if (global.webInterfaceLogs.length > 50) {
    global.webInterfaceLogs = global.webInterfaceLogs.slice(0, 50);
  }
}

// Export logger instance
module.exports = { logger };
