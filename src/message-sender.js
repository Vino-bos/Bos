/**
 * Mass message sender functionality for WhatsApp
 * Handles sending messages to multiple recipients with configurable delays
 * Includes anti-ban measures to avoid detection when sending bulk messages
 */

const { logger } = require('./logger');

// Anti-ban settings
const ANTI_BAN = {
  // Maximum messages per hour to avoid rate limiting (adjust as needed)
  MAX_MESSAGES_PER_HOUR: 30,
  
  // Randomization ranges for delays (in milliseconds)
  MIN_RANDOM_DELAY: 1000,    // 1 second
  MAX_RANDOM_DELAY: 6000,    // 6 seconds
  
  // Add small variations to messages to avoid exact duplicate detection
  MESSAGE_VARIATIONS: [
    { append: "" },                      // No variation
    { append: " " },                     // Add a space
    { append: "." },                     // Add a dot
    { prepend: ""},                      // No variation at beginning
    { prepend: " "},                     // Add a space at beginning
    { replace: "a", with: "а" },         // Replace Latin 'a' with Cyrillic 'а'
    { replace: "e", with: "е" },         // Replace Latin 'e' with Cyrillic 'е'
    { replace: "o", with: "о" },         // Replace Latin 'o' with Cyrillic 'о'
    { invisible: "\u200B" },             // Add invisible zero-width space
    { invisible: "\u200C" }              // Add invisible zero-width non-joiner
  ],
  
  // Batch size settings
  BATCH_SIZE: 26,            // Process messages in batches of 26 contacts
  BATCH_COOLDOWN: 300000     // 5 minutes cooldown between batches
};

/**
 * Adds subtle variations to messages to avoid duplicate detection
 * @param {string} originalMessage - The original message text
 * @returns {string} - The message with subtle variations
 */
function addMessageVariation(originalMessage) {
  // Select a random variation method
  const variation = ANTI_BAN.MESSAGE_VARIATIONS[
    Math.floor(Math.random() * ANTI_BAN.MESSAGE_VARIATIONS.length)
  ];
  
  let modifiedMessage = originalMessage;
  
  if (variation.append !== undefined) {
    modifiedMessage += variation.append;
  } else if (variation.prepend !== undefined) {
    modifiedMessage = variation.prepend + modifiedMessage;
  } else if (variation.replace !== undefined) {
    // Only replace the first occurrence to keep changes minimal
    modifiedMessage = modifiedMessage.replace(
      variation.replace, 
      variation.with
    );
  } else if (variation.invisible !== undefined) {
    // Add invisible character at random position
    const position = Math.floor(Math.random() * modifiedMessage.length);
    modifiedMessage = 
      modifiedMessage.slice(0, position) + 
      variation.invisible + 
      modifiedMessage.slice(position);
  }
  
  return modifiedMessage;
}

/**
 * Generate a slightly randomized delay time based on the base delay
 * @param {number} baseDelaySeconds - Base delay in seconds
 * @returns {number} - Randomized delay in milliseconds
 */
function getRandomizedDelay(baseDelaySeconds) {
  // Convert base delay to milliseconds
  const baseDelay = baseDelaySeconds * 1000;
  
  // Add a random amount of time between MIN and MAX random delay
  const randomOffset = Math.floor(
    Math.random() * (ANTI_BAN.MAX_RANDOM_DELAY - ANTI_BAN.MIN_RANDOM_DELAY) + 
    ANTI_BAN.MIN_RANDOM_DELAY
  );
  
  return baseDelay + randomOffset;
}

/**
 * Send a message to multiple recipients with configurable delay
 * Includes anti-ban measures to avoid detection
 * 
 * @param {Client} client - WhatsApp client instance
 * @param {string} message - The message to send
 * @param {Array<string>} recipients - Array of recipient phone numbers
 * @param {number} delaySeconds - Delay between messages in seconds
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Sending results
 */
async function sendBulkMessages(client, message, recipients, delaySeconds = 3, progressCallback) {
  logger.info(`Starting bulk message sending to ${recipients.length} recipients with anti-ban protection`);
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  // Check client readiness
  if (!client || !client.info) {
    logger.error('WhatsApp client is not properly initialized or authenticated');
    throw new Error('WhatsApp client is not ready. Please try again.');
  }
  
  // Log the current WhatsApp user info
  logger.info(`Sending messages as WhatsApp user: ${client.info.wid._serialized}`);

  // Process messages in batches to avoid rate limiting
  const totalBatches = Math.ceil(recipients.length / ANTI_BAN.BATCH_SIZE);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Get current batch of recipients
    const batchStart = batchIndex * ANTI_BAN.BATCH_SIZE;
    const batchEnd = Math.min(batchStart + ANTI_BAN.BATCH_SIZE, recipients.length);
    const batchRecipients = recipients.slice(batchStart, batchEnd);
    
    logger.info(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchRecipients.length} recipients)`);
    
    // Process each recipient in the current batch
    for (let i = 0; i < batchRecipients.length; i++) {
      const recipient = batchRecipients[i];
      const totalProcessed = batchStart + i;
      
      try {
        // Apply randomized delay between messages (except for the first message)
        if (totalProcessed > 0) {
          const randomDelay = getRandomizedDelay(delaySeconds);
          logger.info(`Waiting ${randomDelay/1000} seconds before sending the next message...`);
          await delay(randomDelay);
        }
        
        // Add subtle variation to avoid exact message duplication
        const modifiedMessage = addMessageVariation(message);
        
        logger.info(`Sending message to recipient ${totalProcessed+1}/${recipients.length}: ${recipient}`);
        const response = await client.sendMessage(recipient, modifiedMessage);
        
        results.success++;
        results.details.push({
          recipient,
          success: true,
          messageId: response.id._serialized
        });
        
        logger.info(`Message sent successfully to ${recipient}`);
      } catch (error) {
        results.failed++;
        results.details.push({
          recipient,
          success: false,
          error: error.message
        });
        
        logger.error(`Failed to send message to ${recipient}:`, error);
      }
      
      // Call progress callback if provided
      if (typeof progressCallback === 'function') {
        await progressCallback({
          current: totalProcessed + 1,
          total: recipients.length,
          success: results.success,
          failed: results.failed,
          lastRecipient: recipient,
          currentBatch: batchIndex + 1,
          totalBatches: totalBatches
        });
      }
    }
    
    // If there are more batches to process, add a cooldown period
    if (batchIndex < totalBatches - 1) {
      logger.info(`Batch ${batchIndex + 1} completed. Adding a cooldown period of ${ANTI_BAN.BATCH_COOLDOWN / 60000} minutes before next batch...`);
      
      // Update progress during cooldown
      if (typeof progressCallback === 'function') {
        await progressCallback({
          current: batchEnd,
          total: recipients.length,
          success: results.success,
          failed: results.failed,
          cooldown: true,
          cooldownSeconds: ANTI_BAN.BATCH_COOLDOWN / 1000,
          nextBatch: batchIndex + 2,
          totalBatches: totalBatches
        });
      }
      
      // Wait for the cooldown period
      await delay(ANTI_BAN.BATCH_COOLDOWN);
    }
  }
  
  logger.info(`Completed bulk message sending: ${results.success} successful, ${results.failed} failed`);
  return results;
}

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendBulkMessages
};