const { isUserRegistered } = require('../database/db');
const { sendReply } = require('./messageUtils');

/**
 * Checks if a user is registered and sends a message if not
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} userId - User ID
 * @returns {Boolean} - True if user is registered, false otherwise
 */
async function checkUserRegistered(sock, message, userId) {
  const registered = isUserRegistered(userId);
  
  if (!registered) {
    await sendReply(sock, message, 
      `⚠️ *REGISTRATION REQUIRED* ⚠️\n\n` +
      `You need to register with a username before using this command.\n\n` +
      `Please register by using the command:\n` +
      `.register [username]\n\n` +
      `Example: .register johndoe\n\n` +
      `Username requirements:\n` +
      `• 3-15 characters long\n` +
      `• Letters, numbers, and underscores only\n` +
      `• No spaces or special characters`
    );
  }
  
  return registered;
}

module.exports = { checkUserRegistered };