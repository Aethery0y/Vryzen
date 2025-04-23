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
    const sender = message.key.participant || message.key.remoteJid;
    
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
    
    // Check if it's a command (starts with the prefix)
    if (!messageContent.startsWith(config.prefix)) {
      return;
    }
    
    // Remove the prefix from the command
    const commandText = messageContent.slice(config.prefix.length).trim();
    
    // Check if it's a group message or from an owner
    const isGroupMessage = remoteJid.endsWith('@g.us');
    const isOwner = config.owners.includes(sender);
    const isFromMainGroup = remoteJid === config.mainGroupID;
    
    // Always allow owner commands from anywhere
    if (isOwner) {
      const user = getUser(sender);
      await handleCommand(sock, message, commandText, sender, user);
      return;
    }
    
    // Handle group messages
    if (isGroupMessage) {
      // Allow if it's the main Vryzen group
      if (isFromMainGroup) {
        const user = getUser(sender);
        await handleCommand(sock, message, commandText, sender, user);
        return;
      }
      
      // Check if the group is already approved
      if (isGroupApproved(remoteJid)) {
        const user = getUser(sender);
        await handleCommand(sock, message, commandText, sender, user);
        return;
      }
      
      // Check if bot is an admin in this group
      const admin = await isBotAdmin(sock, remoteJid);
      
      // If bot is admin, approve the group
      if (admin) {
        try {
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
            text: `🎉 *GROUP APPROVED* 🎉\n\n` +
                 `This group has been approved for bot usage! All commands are now available to members.\n\n` +
                 `Use "${config.prefix}help" to see available commands.`
          });
          
          // Process the original command
          const user = getUser(sender);
          await handleCommand(sock, message, commandText, sender, user);
        } catch (error) {
          console.error('Error approving group:', error);
        }
      } else {
        // Bot is not admin, ask to make it admin
        await sendReply(sock, message, 
          `⚠️ *ADMIN REQUIRED* ⚠️\n\n` +
          `To use this bot in this group, please make the bot an admin first.\n\n` +
          `Once the bot is made an admin, it will automatically approve this group for usage!`
        );
      }
      return;
    }
    
    // If DM and not owner, reject
    await sendReply(sock, message, 
      `⚠️ This bot primarily works in groups where it's an admin, or in the Vryzen group.\n\n` +
      `To add this bot to your group:\n` +
      `1. Add the bot to your group\n` +
      `2. Make the bot an admin\n` +
      `3. The bot will automatically approve your group`
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
