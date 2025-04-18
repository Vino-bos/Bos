/**
 * Main entry point for WhatsApp Group Creator Bot
 * 
 * This bot allows automated creation of multiple WhatsApp groups in sequence
 */

const { logger } = require('./src/logger');
const { startWebServer } = require('./src/web-server');
const { initializeBot } = require('./src/bot');

// Check for Termux environment
const isTermux = process.env.TERMUX_VERSION || 
               (process.env.HOME && process.env.HOME.includes('com.termux'));

// Prioritize appropriate ports based on environment
const PORT = process.env.PORT || 8000;
const WEB_PORT = process.env.WEB_PORT || (isTermux ? 8080 : 5000);

// Log running environment
logger.info(`Running in ${isTermux ? 'Termux' : 'standard'} environment`);

// Main application startup
async function start() {
  try {
    logger.info('Starting WhatsApp Group Creator Bot');
    
    // Start the web server for monitoring
    startWebServer(WEB_PORT);
    logger.info('Web server initialization complete');
    
    // Initialize the WhatsApp bot
    try {
      logger.info('Initializing WhatsApp bot...');
      await initializeBot();
      logger.info('WhatsApp bot initialization successful');
    } catch (botError) {
      logger.error('Failed to initialize WhatsApp bot:', botError);
      logger.info('Web interface still accessible for monitoring');
    }
    
    logger.info('Please check the web interface for more information');
  } catch (error) {
    logger.error('Failed to start the application:', error);
    process.exit(1);
  }
}

// Handle application shutdown
process.on('SIGINT', () => {
  logger.info('Application shutdown requested');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
start();
