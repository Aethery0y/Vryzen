const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, isUsernameAvailable, registerUsername, saveDatabase } = require('../database/db');

/**
 * Handles registration command to set username
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleRegister(sock, message, args, user, sender) {
  try {
    // Check if user is already registered
    if (user.isRegistered) {
      await sendReply(sock, message, `You are already registered with username: *${user.username}*\n\nYou cannot change your username once registered.`);
      return;
    }

    // Check if a username was provided
    if (args.length === 0) {
      await sendReply(sock, message, `⚠️ Please provide a username to register.\n\nUsage: ${config.prefix}register [username]\n\nUsername requirements:\n• 3-15 characters long\n• Letters, numbers, and underscores only\n• No spaces or special characters`);
      return;
    }

    // Get the username (joining all args to allow for multi-word usernames)
    let username = args[0];

    // Username validation
    // Check length
    if (username.length < 3 || username.length > 15) {
      await sendReply(sock, message, `⚠️ Username must be between 3 and 15 characters long.`);
      return;
    }

    // Check characters (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      await sendReply(sock, message, `⚠️ Username can only contain letters, numbers, and underscores.`);
      return;
    }

    // Check if username is available
    if (!isUsernameAvailable(username)) {
      await sendReply(sock, message, `⚠️ Username *${username}* is already taken. Please choose another one.`);
      return;
    }

    // Register the username
    const success = registerUsername(sender, username);

    if (success) {
      // Save the database
      saveDatabase();

      await sendReply(sock, message, `✅ *REGISTRATION SUCCESSFUL* ✅\n\nYou have been registered with username: *${username}*\n\nThis username will be used to identify you in various commands like challenges, sending shares, etc.\n\nYou can now use all the bot commands!`);
    } else {
      await sendReply(sock, message, `❌ An error occurred while registering. Please try again with a different username.`);
    }
  } catch (error) {
    console.error('Error handling register command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your registration.");
  }
}

module.exports = { handleRegister };