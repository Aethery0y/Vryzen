const { handleCommand } = require('./commandHandler');
const config = require('../config');
const { getUser, isGroupApproved, approveGroup, saveDatabase } = require('../database/db');
const { sendReply } = require('../utils/messageUtils');

/**
 * Checks if the bot is an admin in a group
 * @param {Object} sock - WhatsApp connection
 * @param {String} groupId - Group ID
 * @returns {Promise<Boolean>} - True if bot is admin, false otherwise
 */
async function isBotAdmin(sock, groupId) {
  try {
    // Get group metadata
    const groupMetadata = await sock.groupMetadata(groupId);
    
    // Get bot's JID from socket state
    const botJid = sock.user.id.replace(/:.+@/, '@');
    
    // Debug output for troubleshooting
    console.log(`Checking admin status in group: ${groupMetadata.subject}`);
    console.log(`Bot JID: ${botJid}`);
    
    // Find the bot in the participants list
    const botParticipant = groupMetadata.participants.find(
      participant => participant.id.replace(/:.+@/, '@') === botJid
    );
    
    if (!botParticipant) {
      console.log('Bot not found in participants list');
      return false;
    }
    
    console.log(`Bot admin status: ${botParticipant.admin}`);
    
    // Check if bot is admin
    return ['admin', 'superadmin'].includes(botParticipant.admin);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Handles incoming messages
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleMessage(sock, message) {
  try {
    const remoteJid = message.key.remoteJid;
    
    // More robust sender identification for group messages
    let sender = '';
    
    if (remoteJid.endsWith('@g.us')) {
      // For group messages, we MUST use the participant field
      sender = message.key.participant;
      console.log(`GROUP MESSAGE: participant=${message.key.participant}`);
    } else {
      // For direct messages
      sender = message.key.remoteJid;
    }
    
    // Fallback in case the above logic fails
    if (!sender) {
      sender = message.key.remoteJid;
      console.log(`WARNING: Using fallback sender ID: ${sender}`);
    }
    
    // Get message content (text)
    let messageContent = '';
    if (message.message.conversation) {
      messageContent = message.message.conversation;
    } else if (message.message.extendedTextMessage) {
      messageContent = message.message.extendedTextMessage.text;
    } else {
      // Not a text message, ignore
      return;
    }
    
    // Debug message content with detailed sender info
    console.log(`Received message: ${messageContent}`);
    console.log(`From: ${sender} in chat: ${remoteJid}`);
    console.log(`DETAILED-SENDER-INFO: ${JSON.stringify({
      sender,
      fromMe: message.key.fromMe,
      remoteJid,
      pushName: message.pushName,
      isGroup: remoteJid.endsWith('@g.us'),
      participantId: message.key.participant || sender
    }, null, 2)}`);
    
    // Very important for troubleshooting the owner issue
    if (messageContent.startsWith(config.prefix)) {
      console.log(`🔍 OWNER CHECK: Checking if ${sender} is in owner list...`);
      console.log(`🔍 OWNER LIST: ${JSON.stringify(config.owners)}`);
      console.log(`🔍 IS OWNER: ${config.owners.includes(sender)}`);
    }
    
    // Check if it's a command (starts with the prefix)
    if (!messageContent.startsWith(config.prefix)) {
      return;
    }
    
    // Remove the prefix from the command
    const commandText = messageContent.slice(config.prefix.length).trim();
    console.log(`Processing command: ${commandText}`);
    
    // Print debugging info for message
    try {
      console.log('Message object details:');
      console.log(`- Key ID: ${message.key.id}`);
      console.log(`- Key fromMe: ${message.key.fromMe}`);
      console.log(`- Message type: ${Object.keys(message.message).join(', ')}`);
    } catch (err) {
      console.log('Error extracting message details:', err.message);
    }
    
    // Check if it's a group message or from an owner
    const isGroupMessage = remoteJid.endsWith('@g.us');
    
    // Debug owner checking 
    console.log(`DEBUG-OWNERS: Checking if ${sender} is an owner...`);
    console.log(`DEBUG-OWNERS: Owner list:`, config.owners);
    
    // More flexible owner checking - check if any form of the number is in the owners list
    let isOwner = config.owners.includes(sender);
    
    // If not found directly, try a more flexible check (numerical part matching)
    if (!isOwner && sender) {
      // Extract just the numerical part of the sender ID
      const senderNumberPart = sender.split('@')[0].split(':')[0];
      console.log(`DEBUG-OWNERS: Checking with number part only: ${senderNumberPart}`);
      
      // Check if any owner entry contains this number
      isOwner = config.owners.some(owner => {
        const ownerNumberPart = owner.split('@')[0].split(':')[0];
        const matches = (ownerNumberPart === senderNumberPart);
        console.log(`DEBUG-OWNERS: Comparing ${ownerNumberPart} with ${senderNumberPart}: ${matches}`);
        return matches;
      });
    }
    
    console.log(`DEBUG-OWNERS: Final owner check result: ${isOwner}`);
    
    const isFromMainGroup = remoteJid === config.mainGroupID;
    
    // Always allow owner commands from anywhere
    if (isOwner) {
      const user = getUser(sender);
      await handleCommand(sock, message, commandText, sender, user);
      return;
    }
    
    // Handle group messages
    if (isGroupMessage) {      
      // Check if bot is an admin in this group
      console.log(`Checking if bot is an admin in group ${remoteJid}`);
      const admin = await isBotAdmin(sock, remoteJid);
      console.log(`Bot admin status: ${admin}`);
      
      if (admin) {
        try {
          // Check if the group is already approved
          console.log(`Checking if group ${remoteJid} is approved`);
          const groupApproved = isGroupApproved(remoteJid);
          console.log(`Group approval status: ${groupApproved}`);
          
          // If not already approved, approve it
          if (!groupApproved) {
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(remoteJid);
            
            // Approve the group
            approveGroup(remoteJid, {
              name: groupMetadata.subject,
              participants: groupMetadata.participants.length
            });
            
            // Save the database
            saveDatabase();
            
            // Send approval message
            await sock.sendMessage(remoteJid, {
              text: `🎉 *GROUP ACTIVATED* 🎉\n\n` +
                   `This bot is now active in this group! All commands are available to members.\n\n` +
                   `Use "${config.prefix}help" to see available commands.`
            });
          }
          
          // Process the command
          const user = getUser(sender);
          await handleCommand(sock, message, commandText, sender, user);
        } catch (error) {
          console.error('Error handling group command:', error);
        }
      } else {
        // Bot is not admin, ask to make it admin
        await sendReply(sock, message, 
          `⚠️ *ADMIN REQUIRED* ⚠️\n\n` +
          `To use this bot in this group, please make the bot an admin first.\n\n` +
          `Once the bot is made an admin, it will automatically be activated for everyone in this group!`
        );
      }
      return;
    }
    
    // If DM and not owner, reject
    await sendReply(sock, message, 
      `⚠️ *GROUP ONLY* ⚠️\n\n` +
      `This bot only works in groups where it's an admin.\n\n` +
      `To use this bot in your group:\n` +
      `1. Add the bot to your group\n` +
      `2. Make the bot an admin\n` +
      `3. The bot will automatically activate all commands for everyone`
    );
    
  } catch (error) {
    console.error('Error handling message:', error);
    try {
      await sendReply(sock, message, "❌ An error occurred while processing your message.");
    } catch (replyError) {
      console.error('Error sending error reply:', replyError);
    }
  }
}

module.exports = { handleMessage };
