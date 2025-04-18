/**
 * Simple web server to monitor the WhatsApp bot status
 * Provides a web interface available on port 5000
 * Also includes download functionality for Termux
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { logger } = require('./logger');
const { isBotReady, getLatestQR, getClient } = require('./bot');
const { handleCommand } = require('./commands');

/**
 * Start the web server for monitoring the bot
 * @param {number} port - Port to run the web server on
 */
function startWebServer(port) {
  const app = express();
  
  // Middleware for parsing JSON and URL-encoded form data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '../public')));
  
  // API endpoint to check bot status
  app.get('/api/status', (req, res) => {
    const ready = isBotReady(); 
    const status = {
      ready: ready,
      timestamp: new Date().toISOString(),
      message: ready 
        ? 'Bot WhatsApp siap digunakan. Kirim perintah untuk mulai menggunakan!'
        : 'Bot WhatsApp sedang dimuat, silakan tunggu atau periksa QR code di bawah.'
    };
    res.json(status);
  });
  
  // API endpoint to get the QR code
  app.get('/api/qrcode', (req, res) => {
    const qr = getLatestQR();
    res.json({
      qrCode: qr,
      hasQR: qr !== null,
      timestamp: new Date().toISOString()
    });
  });
  
  // API endpoint for system information
  app.get('/api/system-info', (req, res) => {
    const systemInfo = {
      nodejs: process.version,
      platform: process.platform,
      architecture: process.arch,
      timestamp: new Date().toISOString()
    };
    res.json(systemInfo);
  });
  
  // API endpoint to send commands to the bot
  app.post('/api/send-command', async (req, res) => {
    try {
      if (!isBotReady()) {
        return res.status(400).json({
          success: false,
          message: 'Bot tidak siap. Pastikan Anda telah memindai kode QR dan WhatsApp terhubung.'
        });
      }
      
      const { command } = req.body;
      
      if (!command || typeof command !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Perintah tidak valid. Pastikan Anda memasukkan perintah yang benar.'
        });
      }
      
      logger.info(`Command received from web interface: ${command}`);
      
      // Detect if this is a bulk message command with many recipients
      const isBulkCommand = command.startsWith('!bulkmessage');
      if (isBulkCommand) {
        logger.info('Bulk message command detected - using anti-ban protection');
      }
      
      // Create a virtual message object similar to what WhatsApp would send
      const client = getClient();
      const virtualMessage = {
        body: command,
        from: 'web-interface', 
        reply: async (text) => {
          logger.info(`Bot response: ${text}`);
          return text;
        }
      };
      
      // Process the command
      const response = await handleCommand(client, virtualMessage);
      
      let responseMessage = 'Perintah berhasil dikirim, bot sedang memprosesnya.';
      if (isBulkCommand) {
        responseMessage = 'Perintah bulk message dikirim dengan sistem anti-ban. Hasil akan ditampilkan di log.';
      }
      
      res.json({
        success: true,
        message: responseMessage,
        command: command,
        isBulkCommand: isBulkCommand
      });
    } catch (error) {
      logger.error('Error processing command from web interface:', error);
      res.status(500).json({
        success: false,
        message: `Error: ${error.message}`,
        error: error.message
      });
    }
  });
  
  // API endpoint to get logs
  app.get('/api/logs', (req, res) => {
    try {
      // Return the last 50 log entries
      const lastLogs = global.webInterfaceLogs || [];
      res.json({
        success: true,
        logs: lastLogs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error reading logs',
        error: error.message
      });
    }
  });
  
  // Endpoint untuk download file WhatsApp Bot sebagai zip
  app.get('/download', (req, res) => {
    const zipFilename = 'whatsapp-bot-termux.zip';
    const rootDir = path.join(__dirname, '..');
    
    // Set header untuk download file
    res.attachment(zipFilename);
    res.setHeader('Content-Type', 'application/zip');
    
    // Buat object archiver
    const archive = archiver('zip', {
      zlib: { level: 9 } // Level kompresi maksimum
    });
    
    // Pipe output ke response
    archive.pipe(res);
    
    // Daftar file dan direktori yang akan dimasukkan ke dalam zip
    const filesToZip = [
      { source: 'index.js', destination: 'index.js' },
      { source: 'package.json', destination: 'package.json' },
      { source: 'termux_setup.sh', destination: 'termux_setup.sh' },
      { source: 'termux_simple_setup.sh', destination: 'termux_simple_setup.sh' },
      { source: 'termux_run.sh', destination: 'termux_run.sh' },
      { source: 'termux_simple.js', destination: 'termux_simple.js' },
      { source: 'TERMUX_README.md', destination: 'TERMUX_README.md' }
    ];
    
    // Tambahkan semua file di direktori src/
    archive.directory(path.join(rootDir, 'src'), 'src');
    
    // Tambahkan semua file di direktori public/
    archive.directory(path.join(rootDir, 'public'), 'public');
    
    // Tambahkan file-file individual
    filesToZip.forEach(file => {
      const filePath = path.join(rootDir, file.source);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.destination });
      } else {
        logger.warn(`File tidak ditemukan saat membuat zip: ${filePath}`);
      }
    });
    
    // Log proses download
    logger.info(`Permintaan download zip diterima`);
    
    // Tangani error
    archive.on('error', (err) => {
      logger.error('Error membuat file zip:', err);
      res.status(500).send('Error membuat file zip');
    });
    
    // Finalisasi proses pembuatan zip
    archive.finalize();
  });
  
  // Start the server
  app.listen(port, '0.0.0.0', () => {
    // Check for Termux environment
    const isTermux = process.env.TERMUX_VERSION || 
                   (process.env.HOME && process.env.HOME.includes('com.termux'));
                   
    // Get local IP for easier access from other devices when running in Termux
    let localIp = 'localhost';
    if (isTermux) {
      try {
        // Try to get the local network IP for Termux
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        const results = {};

        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
              if (!results[name]) {
                results[name] = [];
              }
              results[name].push(net.address);
              if (name.includes('wlan') || name.includes('eth') || name.includes('en')) {
                localIp = net.address;
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error getting network interfaces:', error);
      }
    }
    
    // Use appropriate domain based on environment
    const replitSlug = process.env.REPL_SLUG;
    const replitOwner = process.env.REPL_OWNER;
    const replitDomain = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` 
      : `http://${localIp}:${port}`;
    
    logger.info(`Web interface tersedia di: ${replitDomain}`);
    logger.info(`Server berjalan di port ${port}`);
    
    if (isTermux) {
      logger.info(`Untuk akses dari perangkat lain di jaringan yang sama, buka: http://${localIp}:${port}`);
      logger.info('Pastikan perangkat Anda terhubung ke jaringan WiFi yang sama');
    }
  });
}

module.exports = { startWebServer };
