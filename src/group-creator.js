/**
 * WhatsApp group creation functionality
 * Handles creating single and multiple groups with error handling and rate limiting
 */

const { logger } = require('./logger');

/**
 * Create a single WhatsApp group
 * @param {Client} client - WhatsApp client instance
 * @param {string} groupName - Name for the new group
 * @param {Array<string>} participants - Array of participant phone numbers
 * @returns {Promise<Group>} The created group
 */
async function createSingleGroup(client, groupName, participants) {
  try {
    logger.info(`Creating group "${groupName}" with ${participants.length} participants: ${JSON.stringify(participants)}`);
    
    // Validate participant numbers
    validateParticipants(participants);
    
    // Check client readiness
    if (!client || !client.info) {
      logger.error('WhatsApp client is not properly initialized or authenticated');
      throw new Error('WhatsApp client is not ready. Please try again.');
    }
    
    // Log the current WhatsApp user info
    logger.info(`Creating group as WhatsApp user: ${client.info.wid._serialized}`);
    
    // Create the group
    logger.info('Calling WhatsApp API to create group...');
    // Tambahkan opsi khusus untuk pembuatan grup
    const groupOptions = {
      memberAddMode: true, // Anggota tetap bisa menambahkan anggota lain
      membershipApprovalMode: true, // Aktifkan persetujuan untuk anggota baru
      restrict: true, // Hanya admin yang dapat mengirim pesan (default true)
      announce: true // Hanya admin yang dapat mengedit pengaturan grup
    };
    const group = await client.createGroup(groupName, participants, groupOptions);
    
    logger.info(`Group created successfully: ${groupName}, group ID: ${group.gid._serialized}`);
    return group;
  } catch (error) {
    logger.error(`Failed to create group "${groupName}":`, error);
    throw new Error(`Failed to create group: ${error.message}`);
  }
}

/**
 * Create multiple WhatsApp groups with advanced options
 * @param {Client} client - WhatsApp client instance
 * @param {string} groupPrefix - Prefix for group names (will be followed by a number)
 * @param {number} count - Number of groups to create
 * @param {Array<string>} participants - Array of participant phone numbers
 * @param {Object} options - Additional options for group creation
 * @param {number} options.startingNumber - Starting number for group numbering (default: 1)
 * @param {number} options.delaySeconds - Fixed delay between group creations in seconds (default: use dynamic rate limiting)
 * @param {boolean} options.padNumbers - Whether to pad numbers with leading zeros (default: false)
 * @param {number} options.batchSize - Number of groups to create before taking a longer break (default: 10)
 * @param {number} options.batchCooldownSeconds - Cooldown between batches in seconds (default: 300)
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} Creation results
 */
async function createMultipleGroups(client, groupPrefix, count, participants, options = {}, progressCallback) {
  // Initialize options with defaults
  const settings = {
    startingNumber: options.startingNumber || 1,
    delaySeconds: options.delaySeconds || 0, // 0 means use dynamic rate limiting
    padNumbers: options.padNumbers || false,
    batchSize: options.batchSize || 10,
    batchCooldownSeconds: options.batchCooldownSeconds || 120 // Ubah default jeda antar batch menjadi 2 menit
  };
  
  logger.info(`Starting creation of ${count} groups with prefix "${groupPrefix}" and options:`, settings);
  logger.info(`Participants: ${JSON.stringify(participants)}`);
  
  const results = {
    success: 0,
    failed: 0,
    groups: []
  };

  // Check client readiness
  if (!client || !client.info) {
    logger.error('WhatsApp client is not properly initialized or authenticated');
    throw new Error('WhatsApp client is not ready. Please try again.');
  }
  
  // Log the current WhatsApp user info
  logger.info(`Creating groups as WhatsApp user: ${client.info.wid._serialized}`);

  // Validate participant numbers
  validateParticipants(participants);

  // Calculate the padding width if needed
  const endNumber = settings.startingNumber + count - 1;
  const maxDigits = endNumber.toString().length;
  
  // Process groups in batches to avoid WhatsApp rate limits
  const totalBatches = Math.ceil(count / settings.batchSize);
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    // Calculate start and end of current batch
    const batchStart = batchIndex * settings.batchSize;
    const batchEnd = Math.min(batchStart + settings.batchSize, count);
    const currentBatchSize = batchEnd - batchStart;
    
    logger.info(`Processing batch ${batchIndex + 1}/${totalBatches} (groups ${batchStart + 1} to ${batchEnd})`);
    
    // Process each group in the current batch
    for (let i = 0; i < currentBatchSize; i++) {
      const currentIndex = batchStart + i;
      const groupNumber = settings.startingNumber + currentIndex;
      
      // Format the group number with padding if requested
      let formattedNumber;
      if (settings.padNumbers) {
        formattedNumber = groupNumber.toString().padStart(maxDigits, '0');
      } else {
        formattedNumber = groupNumber.toString();
      }
      
      const groupName = `${groupPrefix} ${formattedNumber}`;
      
      try {
        // Implement delay between group creations
        if (currentIndex > 0) {
          let waitTime;
          if (settings.delaySeconds > 0) {
            // Use fixed user-specified delay
            waitTime = settings.delaySeconds * 1000;
          } else {
            // Use dynamic rate limiting
            waitTime = getRateLimit(currentIndex + 1);
          }
          
          logger.info(`Waiting ${waitTime/1000} seconds before creating the next group...`);
          await delay(waitTime);
        }
        
        logger.info(`Creating group ${currentIndex + 1}/${count}: "${groupName}"`);
        // Tambahkan opsi khusus untuk pembuatan grup
        const groupOptions = {
          memberAddMode: true, // Anggota tetap bisa menambahkan anggota lain
          membershipApprovalMode: true, // Aktifkan persetujuan untuk anggota baru
          restrict: true, // Hanya admin yang dapat mengirim pesan (default true)
          announce: true // Hanya admin yang dapat mengedit pengaturan grup
        };
        const group = await client.createGroup(groupName, participants, groupOptions);
        
        results.success++;
        results.groups.push({
          name: groupName,
          number: groupNumber,
          id: group.gid._serialized,
          success: true
        });
        
        logger.info(`Group ${currentIndex + 1}/${count} created successfully: ${groupName}, ID: ${group.gid._serialized}`);
      } catch (error) {
        results.failed++;
        results.groups.push({
          name: groupName,
          number: groupNumber,
          success: false,
          error: error.message
        });
        
        logger.error(`Failed to create group ${currentIndex + 1}/${count} "${groupName}":`, error);
      }
      
      // Call progress callback if provided
      if (typeof progressCallback === 'function') {
        await progressCallback({
          current: currentIndex + 1,
          total: count,
          success: results.success,
          failed: results.failed,
          currentBatch: batchIndex + 1,
          totalBatches: totalBatches,
          batchProgress: i + 1,
          batchSize: currentBatchSize
        });
      }
    }
    
    // Add a longer cooldown period between batches if there are more batches to process
    if (batchIndex < totalBatches - 1) {
      const cooldownMs = settings.batchCooldownSeconds * 1000;
      logger.info(`Batch ${batchIndex + 1} completed. Adding a cooldown period of ${settings.batchCooldownSeconds} seconds before next batch...`);
      
      // Notify about cooldown via callback
      if (typeof progressCallback === 'function') {
        await progressCallback({
          current: batchEnd,
          total: count,
          success: results.success,
          failed: results.failed,
          cooldown: true,
          cooldownSeconds: settings.batchCooldownSeconds,
          nextBatch: batchIndex + 2,
          totalBatches: totalBatches
        });
      }
      
      await delay(cooldownMs);
    }
  }
  
  logger.info(`Completed group creation: ${results.success} successful, ${results.failed} failed`);
  return results;
}

/**
 * Validate participant phone numbers
 * @param {Array<string>} participants - Array of participant phone numbers
 */
function validateParticipants(participants) {
  if (!participants || participants.length === 0) {
    throw new Error('No participants provided');
  }
  
  if (participants.length > 256) {
    throw new Error('Too many participants. WhatsApp allows a maximum of 256 participants.');
  }
  
  // Check for invalid phone numbers
  const invalidNumbers = participants.filter(number => {
    return !number.match(/^\d+@c\.us$/);
  });
  
  if (invalidNumbers.length > 0) {
    throw new Error(`Invalid phone numbers detected: ${invalidNumbers.join(', ')}`);
  }
}

/**
 * Calculate rate limit delay based on creation count
 * Implements an exponential backoff strategy to avoid getting banned
 * @param {number} count - Current group count
 * @returns {number} Delay in milliseconds
 */
function getRateLimit(count) {
  // Base delay of 3 seconds
  let delay = 3000;
  
  // Add progressive delay based on count
  if (count > 10) {
    delay = 5000;
  }
  if (count > 20) {
    delay = 8000;
  }
  if (count > 30) {
    delay = 12000;
  }
  
  // Add some randomness to avoid detection patterns
  const randomFactor = 0.5 + Math.random();
  return Math.floor(delay * randomFactor);
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
  createSingleGroup,
  createMultipleGroups
};
