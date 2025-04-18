/**
 * WhatsApp bot implementation using whatsapp-web.js
 * Handles connection, authentication, and message processing
 * Modified to work with Termux on Android
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { logger } = require('./logger');
const fs = require('fs');
const path = require('path');

// Global client instance
let client;
let isReady = false;

/**
 * Initialize the WhatsApp bot
 */
async function initializeBot() {
  logger.info('Initializing WhatsApp bot (Termux compatible)');

  // Check if running in Termux environment
  const isTermux = process.env.TERMUX_VERSION || 
                   (process.env.HOME && process.env.HOME.includes('com.termux'));
  
  logger.info(`Environment detected: ${isTermux ? 'Termux' : 'Standard'}`);

  // Create WhatsApp client with local authentication
  const authPath = path.join(process.env.HOME || '.', '.wwebjs_auth');
  
  // Ensure auth directory exists
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
    logger.info(`Created authentication directory at ${authPath}`);
  }
  
  // Determine Chromium path dynamically
  let chromePath = null;
  
  // Use environment variable if available
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    logger.info(`Using Chromium from environment: ${chromePath}`);
  } else if (process.env.CHROME_PATH) {
    chromePath = process.env.CHROME_PATH;
    logger.info(`Using Chromium from CHROME_PATH: ${chromePath}`);
  } else {
    // Try to detect Chromium location
    const possiblePaths = [
      // Termux paths
      '/data/data/com.termux/files/usr/bin/chromium-browser',
      // Common Linux paths
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      // Replit path
      '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium'
    ];
    
    for (const browserPath of possiblePaths) {
      if (fs.existsSync(browserPath)) {
        chromePath = browserPath;
        logger.info(`Detected Chromium at: ${chromePath}`);
        break;
      }
    }
  }
  
  // Configuration optimized for Termux & others
  const puppeteerConfig = {
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas', 
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--ignore-certificate-errors',
      '--window-size=800x600',
      '--disable-software-rasterizer',
      '--disable-extensions'
    ],
    headless: 'new'  // Use new headless mode
  };
  
  // Add executablePath only if we found a valid path
  if (chromePath) {
    puppeteerConfig.executablePath = chromePath;
  } else {
    logger.warn('No Chromium executable found, will try to use system default');
  }
  
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'whatsapp-group-creator-bot',
      dataPath: authPath
    }),
    puppeteer: puppeteerConfig
  });

  // Store the latest QR code
  if (typeof global.latestQR === 'undefined') {
    global.latestQR = null;
  }

  // Handle QR code for authentication
  client.on('qr', (qr) => {
    logger.info('QR Code received. Scan with WhatsApp to authenticate:');
    qrcode.generate(qr, { small: true });
    global.latestQR = qr;  // Store the QR code for web access
  });

  // Connection events
  client.on('loading_screen', (percent, message) => {
    logger.info(`Loading WhatsApp: ${percent}% - ${message}`);
  });

  client.on('authenticated', () => {
    logger.info('WhatsApp authentication successful');
  });

  try {
    await client.initialize();
    isReady = true;
    logger.info('WhatsApp bot initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize WhatsApp bot:', error);
    throw error;
  }
}

function isBotReady() {
  return isReady;
}

function getClient() {
  return client;
}

function getLatestQR() {
  return global.latestQR;
}

module.exports = {
  initializeBot,
  isBotReady,
  getClient,
  getLatestQR
};