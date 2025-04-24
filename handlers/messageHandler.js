const { handleCommand } = require('./commandHandler');
const config = require('../config');
const { getUser, isGroupApproved, approveGroup, saveDatabase, isUserBlacklisted } = require('../database/db');
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
    
    // Enhanced logging - print all participants and their admin status
    console.log('Group participants:');
    groupMetadata.participants.forEach(p => {
      console.log(`  - ${p.id.replace(/:.+@/, '@')}: ${p.admin || 'not admin'}`);
    });
    
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
    const isAdmin = ['admin', 'superadmin'].includes(botParticipant.admin);
    console.log(`Bot admin status: ${isAdmin}`);
    return isAdmin;
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
    
    // Check if it's a group message
    const isGroupMessage = remoteJid.endsWith('@g.us');
    
    // Check if user is blacklisted
    if (isUserBlacklisted(sender)) {
      await sendReply(sock, message, 
        `⛔ *ACCESS DENIED* ⛔\n\n` +
        `You have been blacklisted and cannot use this bot.\n\n` +
        `If you believe this is a mistake, please contact the bot owner.`
      );
      return;
    }
    
    // Handle messages (both group and DM)
    const user = getUser(sender);
    await handleCommand(sock, message, commandText, sender, user);
    
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
