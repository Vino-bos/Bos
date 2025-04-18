/**
 * Command handler for the WhatsApp Group Creator Bot
 * Parses and processes user commands
 */

const { logger } = require('./logger');
const { createSingleGroup, createMultipleGroups } = require('./group-creator');
const { sendBulkMessages } = require('./message-sender');

/**
 * Process a command from a WhatsApp message
 * @param {Client} client - The WhatsApp client instance
 * @param {Message} message - The message containing the command
 */
async function handleCommand(client, message) {
  const commandParts = message.body.trim().split(' ');
  const command = commandParts[0].toLowerCase();

  try {
    switch (command) {
      case '!creategroup':
        await handleCreateGroup(client, message, commandParts);
        break;

      case '!createmultiplegroups':
        await handleCreateMultipleGroups(client, message, commandParts);
        break;

      case '!sendmessage':
        await handleSendMessage(client, message, commandParts);
        break;

      case '!bulkmessage':
        await handleBulkMessage(client, message, commandParts);
        break;

      case '!getgrouplinks':
        await handleGetGroupLinks(client, message);
        break;

      case '!getgrouplink':
        await handleGetGroupLink(client, message, commandParts);
        break;

      case '!copyallgroups':
        await handleCopyAllGroups(client, message);
        break;

      case '!exportgroups':
        await handleExportGroups(client, message);
        break;

      case '!help':
        await sendHelpMessage(message);
        break;
      case '!removedevice':
        await handleRemoveDevice(client, message);
        break;

      default:
        await message.reply(
          'Unknown command. Type !help to see available commands.'
        );
    }
  } catch (error) {
    logger.error(`Error handling command ${command}:`, error);
    await message.reply(`Error: ${error.message}`);
  }
}

/**
 * Handle the create group command
 * Format: !creategroup <GroupName> <Participant1,Participant2,...>
 */
async function handleCreateGroup(client, message, commandParts) {
  // Validate command format
  if (commandParts.length < 3) {
    await message.reply(
      'Invalid format. Use: !creategroup <GroupName> <Participant1,Participant2,...>'
    );
    return;
  }

  const groupName = commandParts[1];
  const participantsString = commandParts.slice(2).join(' ');
  const participantNumbers = parseParticipants(participantsString);

  if (participantNumbers.length === 0) {
    await message.reply('No valid participant numbers provided');
    return;
  }

  await message.reply(`Creating group "${groupName}" with ${participantNumbers.length} participants...`);

  try {
    const result = await createSingleGroup(client, groupName, participantNumbers);
    await message.reply(`Group "${groupName}" created successfully!`);
    logger.info(`Group created: ${groupName}`);
  } catch (error) {
    logger.error(`Failed to create group "${groupName}":`, error);
    await message.reply(`Failed to create group: ${error.message}`);
  }
}

/**
 * Handle the create multiple groups command with enhanced options
 * Format: !createmultiplegroups <GroupPrefix> <Count> <Participant1,Participant2,...>
 * 
 * Extended format with options:
 * !createmultiplegroups <GroupPrefix> <Count> <Participant1,Participant2,...> --options
 * 
 * Available options:
 * --start=N         : Start numbering from N (default: 1)
 * --delay=N         : Delay N seconds between creating groups (default: dynamic)
 * --padding         : Use zero padding for numbers (e.g., 01, 02, 03 instead of 1, 2, 3)
 * --batchsize=N     : Number of groups to create per batch (default: 10)
 * --batchdelay=N    : Delay N seconds between batches (default: 300)
 */
async function handleCreateMultipleGroups(client, message, commandParts) {
  try {
    // Extract potential options from command
    const options = {};
    let lastOptionIndex = -1;
    
    // Log untuk debugging
    logger.info(`Command parts: ${JSON.stringify(commandParts)}`);
    
    // Cari indeks numerik pertama dalam perintah (jumlah grup)
    let countIndex = -1;
    for (let i = 1; i < commandParts.length; i++) {
      const parsed = parseInt(commandParts[i], 10);
      if (!isNaN(parsed)) {
        countIndex = i;
        break;
      }
    }
    
    // Jika tidak ditemukan parameter numerik
    if (countIndex === -1) {
      await message.reply('Format perintah tidak valid. Harap sertakan jumlah grup (angka antara 1 dan 100).');
      return;
    }
    
    // Ambil prefix grup (semua sebelum angka)
    const groupPrefix = commandParts.slice(1, countIndex).join(' ');
    logger.info(`Group prefix: ${groupPrefix}`);
    
    // Ambil jumlah grup
    let count = parseInt(commandParts[countIndex], 10);
    logger.info(`Count parameter (at index ${countIndex}): ${commandParts[countIndex]}`);
    logger.info(`Parsed count: ${count}`);
    
    if (count < 1 || count > 100) {
      await message.reply('Jumlah grup tidak valid. Mohon masukkan angka antara 1 dan 100.');
      return;
    }
    
    // Scan for option flags (starting with --)
    for (let i = countIndex + 1; i < commandParts.length; i++) {
      const part = commandParts[i];
      if (part.startsWith('--')) {
        lastOptionIndex = i;
        // Handle different option types
        if (part === '--padding') {
          options.padNumbers = true;
        } else if (part.startsWith('--start=')) {
          const value = parseInt(part.split('=')[1], 10);
          if (!isNaN(value) && value > 0) {
            options.startingNumber = value;
          }
        } else if (part.startsWith('--delay=')) {
          const value = parseInt(part.split('=')[1], 10);
          if (!isNaN(value) && value >= 0) {
            options.delaySeconds = value;
          }
        } else if (part.startsWith('--batchsize=')) {
          const value = parseInt(part.split('=')[1], 10);
          if (!isNaN(value) && value > 0) {
            options.batchSize = value;
          }
        } else if (part.startsWith('--batchdelay=')) {
          const value = parseInt(part.split('=')[1], 10);
          if (!isNaN(value) && value > 0) {
            options.batchCooldownSeconds = value;
          }
        }
      } else if (lastOptionIndex === -1) {
        // If we haven't seen any options yet, this is still part of the participants
        lastOptionIndex = i;
      }
    }
    
    // Validate command format - basic check if we have enough parts
    if (commandParts.length < countIndex + 2) {
      await message.reply(
        'Format perintah tidak valid. Gunakan: !createmultiplegroups <AwalaGrup> <Jumlah> <Peserta1,Peserta2,...>\n\n' +
        'Opsi tambahan (opsional):\n' +
        '--start=N        : Mulai penomoran dari N (default: 1)\n' +
        '--delay=N        : Jeda N detik antara pembuatan grup (default: dinamis)\n' +
        '--padding        : Gunakan padding nol untuk nomor (mis: 01, 02, 03)\n' +
        '--batchsize=N    : Jumlah grup per batch (default: 10)\n' +
        '--batchdelay=N   : Jeda N detik antar batch (default: 300)'
      );
      return;
    }

    // Extract participants string, excluding any options
    // Mencari peserta yang valid di antara countIndex dan option pertama
    let participantsString = '';
    
    // Identifikasi bagian peserta dengan lebih hati-hati
    for (let i = countIndex + 1; i < commandParts.length; i++) {
      // Jika bertemu opsi (dimulai dengan --), hentikan loop
      if (commandParts[i].startsWith('--')) {
        break;
      }
      // Tambahkan ke string peserta
      participantsString += (participantsString ? ',' : '') + commandParts[i];
    }
    
    logger.info(`Extracted participants string: ${participantsString}`);
    
    // Parse string peserta menjadi array nomor telepon
    const participantNumbers = parseParticipants(participantsString);

    if (participantNumbers.length === 0) {
      await message.reply('Tidak ada nomor peserta yang valid. Format nomor: 628xxxxxxxxxx');
      return;
    }

    // Prepare options summary for user message
    let optionsMessage = '';
    if (options.startingNumber) {
      optionsMessage += `\n• Mulai penomoran dari: ${options.startingNumber}`;
    }
    if (options.delaySeconds !== undefined) {
      optionsMessage += `\n• Jeda antar grup: ${options.delaySeconds} detik`;
    } else {
      optionsMessage += `\n• Jeda antar grup: dinamis (otomatis)`;
    }
    if (options.padNumbers) {
      optionsMessage += `\n• Format nomor: dengan padding nol`;
    }
    if (options.batchSize) {
      optionsMessage += `\n• Ukuran batch: ${options.batchSize} grup per batch`;
    }
    if (options.batchCooldownSeconds) {
      optionsMessage += `\n• Jeda antar batch: ${options.batchCooldownSeconds} detik`;
    }

    // Calculate batch information
    const effectiveBatchSize = options.batchSize || 10;
    const totalBatches = Math.ceil(count / effectiveBatchSize);

    await message.reply(
      `⚙️ *Memulai pembuatan grup WhatsApp*\n\n` +
      `• Prefix grup: "${groupPrefix}"\n` +
      `• Jumlah grup: ${count}\n` +
      `• Jumlah peserta: ${participantNumbers.length} per grup\n` +
      `• Jumlah batch: ${totalBatches}${optionsMessage}\n\n` +
      `Mohon tunggu, proses ini akan memakan waktu...`
    );

    try {
      const results = await createMultipleGroups(
        client, 
        groupPrefix, 
        count, 
        participantNumbers,
        options, 
        async (progress) => {
          // Handle cooldown period notifications
          if (progress.cooldown) {
            await message.reply(
              `✅ *Batch ${progress.nextBatch-1} selesai*\n\n` +
              `Menunggu ${Math.floor(progress.cooldownSeconds/60)} menit ${progress.cooldownSeconds % 60} detik ` +
              `sebelum melanjutkan batch berikutnya untuk menghindari deteksi spam oleh WhatsApp.`
            );
            return;
          }
          
          // Send progress updates at certain intervals
          const updateFrequency = progress.total > 50 ? 10 : 5;
          if (progress.current % updateFrequency === 0 || progress.current === progress.total) {
            if (progress.totalBatches > 1) {
              await message.reply(
                `📊 *Progress Pembuatan Grup*\n\n` +
                `• Total progress: ${progress.current}/${progress.total} grup\n` +
                `• Berhasil: ${progress.success} grup\n` +
                `• Gagal: ${progress.failed} grup\n` +
                `• Batch: ${progress.currentBatch}/${progress.totalBatches}\n` +
                `• Progress batch: ${progress.batchProgress}/${progress.batchSize} grup`
              );
            } else {
              await message.reply(
                `📊 *Progress*: ${progress.current}/${progress.total} grup dibuat ` +
                `(${progress.success} berhasil, ${progress.failed} gagal)`
              );
            }
          }
        }
      );

      // Generate a list of successfully created groups
      let successGroups = '';
      if (results.success > 0) {
        const maxGroupsToList = 10; // Limit to avoid message too long
        const groupsToShow = results.groups
          .filter(g => g.success)
          .slice(0, maxGroupsToList);
        
        successGroups = '\n\nGrup yang berhasil dibuat:';
        groupsToShow.forEach((group, index) => {
          successGroups += `\n${index+1}. ${group.name}`;
        });
        
        if (results.success > maxGroupsToList) {
          successGroups += `\n...dan ${results.success - maxGroupsToList} grup lainnya`;
        }
      }

      // Send final summary
      await message.reply(
        `✅ *Pembuatan grup selesai*\n\n` +
        `• Total grup diminta: ${count}\n` +
        `• Berhasil: ${results.success} grup\n` +
        `• Gagal: ${results.failed} grup\n\n` +
        `Gunakan perintah !getgrouplinks untuk mendapatkan link semua grup.${successGroups}`
      );
    } catch (error) {
      logger.error(`Failed to create multiple groups:`, error);
      await message.reply(`❌ Gagal membuat grup: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Error in handleCreateMultipleGroups:`, error);
    await message.reply(`❌ Terjadi kesalahan: ${error.message}`);
  }
}

/**
 * Handle sending a message to a single recipient
 * Format: !sendmessage <Recipient> <Message>
 */
async function handleSendMessage(client, message, commandParts) {
  // Validate command format
  if (commandParts.length < 3) {
    await message.reply(
      'Invalid format. Use: !sendmessage <Recipient> <Message>'
    );
    return;
  }

  const recipient = commandParts[1];
  const messageText = commandParts.slice(2).join(' ');

  // Normalize recipient phone number
  const recipientNumbers = parseParticipants(recipient);

  if (recipientNumbers.length === 0) {
    await message.reply('Invalid recipient number provided');
    return;
  }

  await message.reply(`Sending message to ${recipientNumbers[0]}...`);

  try {
    await client.sendMessage(recipientNumbers[0], messageText);
    await message.reply(`Message sent successfully to ${recipientNumbers[0]}`);
    logger.info(`Message sent to: ${recipientNumbers[0]}`);
  } catch (error) {
    logger.error(`Failed to send message to "${recipientNumbers[0]}":`, error);
    await message.reply(`Failed to send message: ${error.message}`);
  }
}

/**
 * Handle sending a message to multiple recipients with configurable delay
 * Format: !bulkmessage <DelayInSeconds> <Recipient1,Recipient2,...> <Message>
 */
async function handleBulkMessage(client, message, commandParts) {
  // Validate command format
  if (commandParts.length < 4) {
    await message.reply(
      'Format tidak valid. Gunakan: !bulkmessage <JedaDetik> <Penerima1,Penerima2,...> <Pesan>'
    );
    return;
  }

  // Parse delay in seconds
  const delaySeconds = parseInt(commandParts[1], 10);

  if (isNaN(delaySeconds) || delaySeconds < 0 || delaySeconds > 60) {
    await message.reply('Jeda tidak valid. Mohon masukkan angka antara 0 dan 60 detik.');
    return;
  }

  // Parse recipients
  const recipientsString = commandParts[2];
  const recipientNumbers = parseParticipants(recipientsString);

  if (recipientNumbers.length === 0) {
    await message.reply('Tidak ada nomor penerima yang valid');
    return;
  }

  // Get the message text (everything after the recipients)
  const messageText = commandParts.slice(3).join(' ');

  if (!messageText || messageText.trim().length === 0) {
    await message.reply('Teks pesan tidak boleh kosong');
    return;
  }

  // Check if we have many recipients and show anti-ban information
  if (recipientNumbers.length > 10) {
    await message.reply(
      `⚠️ *Sistem Anti-Ban Aktif* ⚠️\n\n` +
      `• Pesan akan dikirim dalam batch (${Math.ceil(recipientNumbers.length / 26)} batch)\n` +
      `• Setiap batch berisi maksimal 26 kontak\n` +
      `• Jeda 5 menit antar batch untuk menghindari deteksi spam\n` +
      `• Variasi pesan otomatis untuk menghindari deteksi duplikat\n` +
      `• Jeda acak antar pesan untuk pola alami\n\n` +
      `Memulai pengiriman pesan ke ${recipientNumbers.length} penerima...`
    );
  } else {
    await message.reply(
      `Memulai pengiriman pesan ke ${recipientNumbers.length} penerima dengan jeda ${delaySeconds} detik...`
    );
  }

  try {
    // Use the sendBulkMessages function with a progress callback
    const results = await sendBulkMessages(
      client, 
      messageText, 
      recipientNumbers, 
      delaySeconds,
      async (progress) => {
        // Check if in cooldown period between batches
        if (progress.cooldown) {
          await message.reply(
            `✅ Batch ${progress.nextBatch-1} selesai. ` +
            `Menunggu ${Math.floor(progress.cooldownSeconds/60)} menit untuk melanjutkan ke batch berikutnya ` +
            `untuk menghindari deteksi spam oleh WhatsApp.`
          );
          return;
        }
        
        // Send progress updates at certain intervals or at the end
        if (progress.current % 5 === 0 || progress.current === progress.total) {
          if (progress.totalBatches > 1) {
            await message.reply(
              `📊 *Progress*: ${progress.current}/${progress.total} pesan terkirim\n` +
              `✅ Berhasil: ${progress.success}\n` +
              `❌ Gagal: ${progress.failed}\n` +
              `🔄 Batch: ${progress.currentBatch}/${progress.totalBatches}`
            );
          } else {
            await message.reply(
              `📊 *Progress*: ${progress.current}/${progress.total} pesan terkirim (${progress.success} berhasil, ${progress.failed} gagal)`
            );
          }
        }
      }
    );

    // Send final summary
    await message.reply(
      `✅ *Pengiriman pesan selesai*\n` +
      `• ${results.success} pesan berhasil terkirim\n` +
      `• ${results.failed} pesan gagal terkirim\n\n` +
      `Sistem anti-ban telah digunakan untuk mengurangi risiko blokir.`
    );
  } catch (error) {
    logger.error(`Gagal mengirim pesan massal:`, error);
    await message.reply(`❌ Gagal mengirim pesan massal: ${error.message}`);
  }
}

/**
 * Handle getting invite links for all groups
 * Format: !getgrouplinks
 */
async function handleGetGroupLinks(client, message) {
  try {
    await message.reply('Mengambil daftar semua grup dan linknya. Harap tunggu...');

    // Get all chats
    const chats = await client.getChats();

    // Filter to get only groups
    const groups = chats.filter(chat => chat.isGroup);

    if (groups.length === 0) {
      await message.reply('Tidak ada grup yang tersedia.');
      return;
    }

    // Start response message
    let responseMessage = `*Daftar Link Grup WhatsApp*\n\n`;
    let successCount = 0;
    let failedCount = 0;

    // Process each group to get its invite link
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        // Get invite code for the group (using the correct method for whatsapp-web.js)
        const inviteCode = await group.getInviteCode();
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        responseMessage += `${i+1}. *${group.name}*\n${inviteLink}\n\n`;
        successCount++;

        // Send partial results every 10 groups to avoid message size limits
        if ((i + 1) % 10 === 0 || i === groups.length - 1) {
          await message.reply(responseMessage);
          responseMessage = `*Daftar Link Grup (Lanjutan)*\n\n`;
        }
      } catch (error) {
        logger.error(`Failed to get invite link for group "${group.name}":`, error);
        responseMessage += `${i+1}. *${group.name}*\nGagal mendapatkan link: ${error.message}\n\n`;
        failedCount++;
      }
    }

    // Send summary
    await message.reply(`Selesai mengambil link grup: ${successCount} berhasil, ${failedCount} gagal.`);

  } catch (error) {
    logger.error('Failed to get group links:', error);
    await message.reply(`Gagal mengambil link grup: ${error.message}`);
  }
}

/**
 * Handle getting invite link for a specific group
 * Format: !getgrouplink <GroupName>
 */
async function handleGetGroupLink(client, message, commandParts) {
  // Validate command format
  if (commandParts.length < 2) {
    await message.reply('Format tidak valid. Gunakan: !getgrouplink <NamaGrup>');
    return;
  }

  const groupName = commandParts.slice(1).join(' ');

  try {
    await message.reply(`Mencari grup dengan nama "${groupName}"...`);

    // Get all chats
    const chats = await client.getChats();

    // Filter to find the specific group
    const group = chats.find(chat => 
      chat.isGroup && 
      chat.name.toLowerCase().includes(groupName.toLowerCase())
    );

    if (!group) {
      await message.reply(`Tidak dapat menemukan grup dengan nama "${groupName}".`);
      return;
    }

    // Get invite code for the group (using the correct method for whatsapp-web.js)
    const inviteCode = await group.getInviteCode();
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

    // Send the result
    await message.reply(`*Link untuk grup "${group.name}"*:\n\n${inviteLink}`);

  } catch (error) {
    logger.error(`Failed to get link for group "${groupName}":`, error);
    await message.reply(`Gagal mendapatkan link untuk grup "${groupName}": ${error.message}`);
  }
}

/**
 * Handle copying all group information (name and link) in a format ready for sharing
 * Format: !copyallgroups
 */
async function handleCopyAllGroups(client, message) {
  try {
    await message.reply('Menyalin semua grup dalam format siap salin. Harap tunggu...');

    // Get all chats
    const chats = await client.getChats();

    // Filter to get only groups
    const groups = chats.filter(chat => chat.isGroup);

    if (groups.length === 0) {
      await message.reply('Tidak ada grup yang tersedia.');
      return;
    }

    // Start collecting group data
    let allGroupsText = `📋 *DAFTAR GRUP WHATSAPP* 📋\n\n`;
    let totalGroups = groups.length;
    let successCount = 0;
    let failedCount = 0;

    // Process each group to get its invite link
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        // Get invite code for the group (using the correct method for whatsapp-web.js)
        const inviteCode = await group.getInviteCode();
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        // Format in a clean, copy-paste friendly format
        allGroupsText += `⭐ *${group.name}*\n${inviteLink}\n\n`;
        successCount++;
      } catch (error) {
        logger.error(`Failed to get invite link for group "${group.name}":`, error);
        allGroupsText += `❌ *${group.name}* (Error: tidak dapat mengambil link)\n\n`;
        failedCount++;
      }

      // Send progress updates for long operations
      if ((i+1) % 15 === 0) {
        await message.reply(`Sedang memproses: ${i+1}/${totalGroups} grup...`);
      }
    }

    // Add a footer with stats
    allGroupsText += `---\nTotal: ${totalGroups} grup | Berhasil: ${successCount} | Gagal: ${failedCount}\nDibuat menggunakan WhatsApp Group Bot pada ${new Date().toLocaleString('id-ID')}`;

    // Break the message into chunks if it's too long (WhatsApp has message size limits)
    const maxChunkSize = 4000; // WhatsApp message size limit is around 65536 characters, but we'll be conservative

    if (allGroupsText.length <= maxChunkSize) {
      // If it fits in one message, send it directly
      await message.reply(allGroupsText);
    } else {
      // Otherwise, split and send multiple messages
      let startIndex = 0;
      let chunkNumber = 1;

      while (startIndex < allGroupsText.length) {
        let endIndex = startIndex + maxChunkSize;

        // Try to find a newline character to make a cleaner break
        if (endIndex < allGroupsText.length) {
          const newlineIndex = allGroupsText.lastIndexOf('\n\n', endIndex);
          if (newlineIndex > startIndex) {
            endIndex = newlineIndex;
          }
        }

        const chunk = allGroupsText.substring(startIndex, endIndex);
        await message.reply(`${chunk}\n\n(Bagian ${chunkNumber}/${Math.ceil(allGroupsText.length / maxChunkSize)})`);

        startIndex = endIndex;
        chunkNumber++;
      }
    }

    // Send a final completion message
    await message.reply(`✅ Berhasil menyalin daftar ${successCount} grup WhatsApp. Anda dapat menyalin teks di atas dan membagikannya.`);

  } catch (error) {
    logger.error('Failed to copy all groups:', error);
    await message.reply(`Gagal menyalin grup: ${error.message}`);
  }
}

/**
 * Handle exporting group information to a file
 * Format: !exportgroups
 */
async function handleExportGroups(client, message) {
  try {
    await message.reply('Mengekspor data grup ke file untuk disimpan. Harap tunggu...');

    // Get all chats
    const chats = await client.getChats();

    // Filter to get only groups
    const groups = chats.filter(chat => chat.isGroup);

    if (groups.length === 0) {
      await message.reply('Tidak ada grup yang tersedia untuk diekspor.');
      return;
    }

    // Create an array to store group data
    const groupData = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each group to get its data
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      try {
        // Get invite code for the group (using the correct method for whatsapp-web.js)
        const inviteCode = await group.getInviteCode();
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;

        // Add to group data array
        groupData.push({
          name: group.name,
          id: group.id._serialized,
          link: inviteLink,
          participantCount: group.participants ? group.participants.length : 'Unknown'
        });

        successCount++;
      } catch (error) {
        logger.error(`Failed to get data for group "${group.name}":`, error);
        groupData.push({
          name: group.name,
          id: group.id._serialized,
          link: 'Error: ' + error.message,
          participantCount: group.participants ? group.participants.length : 'Unknown'
        });

        failedCount++;
      }

      // Send progress update for long operations
      if ((i+1) % 15 === 0) {
        await message.reply(`Sedang memproses: ${i+1}/${groups.length} grup...`);
      }
    }

    // Create JSON representation of the data with nice formatting
    const jsonData = JSON.stringify(groupData, null, 2);

    // Format data for text file export - more human readable
    let textData = `# WhatsApp Group List - Exported on ${new Date().toLocaleString('id-ID')}\n\n`;

    groupData.forEach((group, index) => {
      textData += `## ${index + 1}. ${group.name}\n`;
      textData += `Link: ${group.link}\n`;
      textData += `ID: ${group.id}\n`;
      textData += `Jumlah Peserta: ${group.participantCount}\n\n`;
    });

    textData += `---\nTotal: ${groupData.length} grup | Berhasil: ${successCount} | Gagal: ${failedCount}\n`;

    // Try to generate CSV format too for spreadsheet compatibility
    let csvData = "Name,Link,ID,Participant Count\n";

    groupData.forEach(group => {
      // Escape quotes in CSV fields
      const name = group.name.replace(/"/g, '""');
      const link = group.link.replace(/"/g, '""');

      csvData += `"${name}","${link}","${group.id}","${group.participantCount}"\n`;
    });

    // Send the formatted text data
    await message.reply(textData);

    // Send the data files
    // Note: In a real implementation, you would save these files and send them as documents
    // But for this demonstration, we'll just send the JSON and CSV as text messages
    await message.reply(`*Data JSON Format:*\n\n${jsonData.substring(0, 3000)}...\n(terlalu panjang untuk ditampilkan sepenuhnya)`);

    await message.reply(`*Data CSV Format:*\n\n${csvData.substring(0, 3000)}...\n(terlalu panjang untuk ditampilkan sepenuhnya)`);

    // Send completion message
    await message.reply(`✅ Ekspor data ${groupData.length} grup WhatsApp selesai.`);

  } catch (error) {
    logger.error('Failed to export groups:', error);
    await message.reply(`Gagal mengekspor grup: ${error.message}`);
  }
}

/**
 * Send help message with available commands
 */
async function sendHelpMessage(message) {
  const helpText = `*Bot Creator Grup WhatsApp*\n\n` +
    `Perintah yang tersedia:\n\n` +
    `1. *!creategroup <NamaGrup> <Peserta1,Peserta2,...>*\n` +
    `   Membuat satu grup WhatsApp dengan nama dan peserta yang ditentukan\n\n` +
    `2. *!createmultiplegroups <AwalaGrup> <Jumlah> <Peserta1,Peserta2,...> [opsi]*\n` +
    `   Membuat beberapa grup WhatsApp dengan nama bernomor\n` +
    `   ↳ Opsi: --start=N (mulai dari nomor N), --delay=N (jeda N detik), --padding (01,02 vs 1,2)\n` +
    `   ↳ Contoh: !createmultiplegroups Kelas 30 628123456789 --start=101 --delay=10 --padding\n\n` +
    `3. *!sendmessage <Penerima> <Pesan>*\n` +
    `   Mengirim pesan ke satu penerima\n\n` +
    `4. *!bulkmessage <JedaDetik> <Penerima1,Penerima2,...> <Pesan>*\n` +
    `   Mengirim pesan ke beberapa penerima dengan sistem anti-ban (26 kontak per batch, jeda 5 menit antar batch)\n\n` +
    `5. *!getgrouplinks*\n` +
    `   Mendapatkan link undangan untuk semua grup WhatsApp\n\n` +
    `6. *!getgrouplink <NamaGrup>*\n` +
    `   Mendapatkan link undangan untuk grup WhatsApp tertentu\n\n` +
    `7. *!copyallgroups*\n` +
    `   Menyalin semua nama dan link grup dalam format siap dibagikan\n\n` +
    `8. *!exportgroups*\n` +
    `   Mengekspor semua data grup dalam berbagai format (text, JSON, CSV)\n\n` +
    `9. *!removedevice*\n` +
    `   Menghapus perangkat yang terhubung dan membutuhkan pemindaian kode QR baru untuk melanjutkan.\n\n` +
    `10. *!help*\n` +
    `   Menampilkan pesan bantuan ini\n\n` +
    `Nomor telepon harus dalam format internasional (contoh: 628123456789) dan dipisahkan dengan koma.\n\n` +
    `*Fitur Anti-Ban*\n` +
    `Sistem dilengkapi dengan mekanisme anti-ban untuk pengiriman pesan massal dan pembuatan grup. Menggunakan penundaan, variasi pesan, dan pemrosesan batch untuk menghindari pembatasan WhatsApp.`;

  await message.reply(helpText);
}

/**
 * Parse participant string into array of phone numbers
 * @param {string} participantsString - Comma-separated phone numbers
 * @returns {Array<string>} Array of formatted phone numbers
 */
function parseParticipants(participantsString) {
  logger.info(`Parsing participants: ${participantsString}`);

  // Handle the case when a single phone number is provided without commas
  const parts = participantsString.includes(',') 
    ? participantsString.split(',')
    : [participantsString];

  const result = parts
    .map(number => number.trim())
    .filter(number => number.length > 0)
    .map(number => {
      // Normalize phone number format
      let normalized = number.replace(/[^0-9]/g, '');

      logger.info(`Normalized phone number: ${normalized}`);

      // Ensure number has @c.us suffix for WhatsApp API
      if (!normalized.includes('@c.us')) {
        normalized = `${normalized}@c.us`;
      }

      return normalized;
    });

  logger.info(`Parsed ${result.length} participants: ${JSON.stringify(result)}`);
  return result;
}

/**
 * Handle removing linked device
 * Format: !removedevice
 */
async function handleRemoveDevice(client, message) {
  try {
    await message.reply('Mencoba menghapus perangkat yang tertaut...');
    await client.logout();
    await message.reply('Perangkat berhasil dihapus. Bot akan restart untuk meminta QR code baru.');
  } catch (error) {
    logger.error('Error removing device:', error);
    await message.reply('Gagal menghapus perangkat: ' + error.message);
  }
}

module.exports = {
  handleCommand,
  createSingleGroup,
  createMultipleGroups,
  handleRemoveDevice
};