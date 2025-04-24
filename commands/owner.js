const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const { getCategoryImage } = require('../utils/imageUtils');

/**
 * Checks if the user is an owner
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} sender - Sender ID
 * @returns {Promise<Boolean>} - True if owner, false otherwise
 */
async function isOwner(sock, message, sender) {
  // Now all users are considered owners
  return true;
}

/**
 * Blacklist a user
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleBlacklist(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username
    if (args.length < 1) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username to blacklist.\n\nExample: ${config.prefix}blacklist Username`);
      return;
    }
    
    // Get the target username
    const username = args[0];
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Prevent blacklisting owners
    if (config.owners.some(owner => {
      const ownerNumberPart = owner.split('@')[0].split(':')[0];
      const targetNumberPart = targetUser.id.split('@')[0].split(':')[0];
      return ownerNumberPart === targetNumberPart;
    })) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou cannot blacklist another bot owner.`);
      return;
    }
    
    // Blacklist the user
    db.blacklistUser(targetUser.id, true);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *USER BLACKLISTED*\n\n${targetUser.username} has been blacklisted and can no longer use the bot.`, adminImage);
  } catch (error) {
    console.error('Error handling blacklist command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while blacklisting the user.`);
  }
}

/**
 * Unblacklist a user
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleUnblacklist(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username
    if (args.length < 1) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username to unblacklist.\n\nExample: ${config.prefix}unblacklist Username`);
      return;
    }
    
    // Get the target username
    const username = args[0];
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Check if user is actually blacklisted
    if (!db.isUserBlacklisted(targetUser.id)) {
      await sendReply(sock, message, `❌ *ERROR*\n\n${targetUser.username} is not currently blacklisted.`);
      return;
    }
    
    // Unblacklist the user
    db.blacklistUser(targetUser.id, false);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *USER UNBLACKLISTED*\n\n${targetUser.username} has been removed from the blacklist and can now use the bot again.`, adminImage);
  } catch (error) {
    console.error('Error handling unblacklist command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while unblacklisting the user.`);
  }
}

/**
 * Reset all data
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleResetData(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Require confirmation
    if (!args[0] || args[0].toLowerCase() !== 'confirm') {
      await sendReply(sock, message, `⚠️ *WARNING: DATA RESET*\n\nThis will delete ALL user data, companies, market orders, and other information. This action CANNOT be undone.\n\nTo confirm, type:\n${config.prefix}resetdata confirm`);
      return;
    }
    
    // Reset the database
    db.initializeDatabase(true); // true = force reset
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *DATA RESET COMPLETE*\n\nAll user data, companies, and other information have been reset to default values.`, adminImage);
  } catch (error) {
    console.error('Error handling reset data command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while resetting data.`);
  }
}

/**
 * Reset ALL data - complete database wipe
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleResetAllData(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    console.log("RESETALLDATA DEBUG: Args received:", args);
    
    // Get the full command text from the message
    const fullCommand = message.message?.extendedTextMessage?.text || 
                       message.message?.conversation || 
                       "";
    
    console.log("RESETALLDATA DEBUG: Full command:", fullCommand);
    
    // Check if the full command matches exactly after prefix removal
    const confirmationText = `resetalldata wipealldatabase confirm`;
    const commandWithoutPrefix = fullCommand.trim().toLowerCase().replace(/^\./, '');
    const isExactConfirmation = commandWithoutPrefix === confirmationText.toLowerCase();
    
    console.log("RESETALLDATA DEBUG: Exact confirmation match:", isExactConfirmation);
    
    if (isExactConfirmation) {
      console.log("RESETALLDATA DEBUG: Confirmation matched, proceeding with reset");
      
      // Get the admin image
      const adminImage = await getCategoryImage('admin');
      
      // Show processing message
      await sendReply(sock, message, `⏳ *PROCESSING COMPLETE DATABASE WIPE*\n\nThis might take a moment...`);
      
      // Reset the database
      console.log("RESETALLDATA DEBUG: Initializing database with reset flag");
      db.initializeDatabase(true); // true = force reset
      console.log("RESETALLDATA DEBUG: Database reset complete");
      
      // Send success message
      await sendReply(
        sock, 
        message, 
        `✅ *COMPLETE DATABASE WIPE SUCCESSFUL* ✅\n\n` +
        `The entire database has been reset to its initial empty state.\n\n` +
        `All users will need to register again to use the bot.\n` +
        `Bot is ready for a fresh start.`, 
        adminImage
      );
      console.log("RESETALLDATA DEBUG: Success message sent");
      return;
    }
    
    console.log("RESETALLDATA DEBUG: Sending warning message");
    // Send warning message if confirmation not matched
    await sendReply(
      sock, 
      message, 
      `⚠️ *EXTREME WARNING: COMPLETE DATABASE WIPE* ⚠️\n\n` +
      `This command will permanently erase ALL DATABASE DATA including:\n` +
      `- All registered users\n` +
      `- All companies and investments\n` +
      `- All transactions and balances\n` +
      `- All market orders and shares\n` +
      `- All streaks, stats, and progression\n\n` +
      `This action is NOT REVERSIBLE and will reset the bot to a fresh state.\n\n` +
      `To confirm this extreme action, type:\n` +
      `${config.prefix}resetalldata wipealldatabase confirm`
    );
  } catch (error) {
    console.error('Error handling reset all data command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while attempting to wipe the database.`);
  }
}

/**
 * Add coins to a user
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleAddCoins(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username and an amount
    if (args.length < 2) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username and amount of coins to add.\n\nExample: ${config.prefix}addcoins Username 1000`);
      return;
    }
    
    // Get the target username and amount
    const username = args[0];
    const amount = parseInt(args[1]);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid positive amount of coins to add.\n\nExample: ${config.prefix}addcoins Username 1000`);
      return;
    }
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Add the coins - note that coins field is actually called "balance" in the user object
    const newBalance = targetUser.balance + amount;
    db.updateUser(targetUser.id, { balance: newBalance });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *COINS ADDED*\n\n${amount.toLocaleString()} coins have been added to ${targetUser.username}'s account.\n\nNew balance: ${newBalance.toLocaleString()} coins`, adminImage);
  } catch (error) {
    console.error('Error handling add coins command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while adding coins.`);
  }
}

/**
 * Remove coins from a user
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleRemoveCoins(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username and an amount
    if (args.length < 2) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username and amount of coins to remove.\n\nExample: ${config.prefix}removecoins Username 1000`);
      return;
    }
    
    // Get the target username and amount
    const username = args[0];
    const amount = parseInt(args[1]);
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid positive amount of coins to remove.\n\nExample: ${config.prefix}removecoins Username 1000`);
      return;
    }
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Calculate new balance (minimum 0)
    const newBalance = Math.max(0, targetUser.balance - amount);
    const actualAmountRemoved = targetUser.balance - newBalance;
    
    // Update the balance
    db.updateUser(targetUser.id, { balance: newBalance });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *COINS REMOVED*\n\n${actualAmountRemoved.toLocaleString()} coins have been removed from ${targetUser.username}'s account.\n\nNew balance: ${newBalance.toLocaleString()} coins`, adminImage);
  } catch (error) {
    console.error('Error handling remove coins command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while removing coins.`);
  }
}

/**
 * Make a user an owner
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleMakeOwner(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username
    if (args.length < 1) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username to make them an owner.\n\nExample: ${config.prefix}makeowner Username`);
      return;
    }
    
    // Get the target username
    const username = args[0];
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Check if user is already an owner
    if (config.owners.includes(targetUser.id)) {
      await sendReply(sock, message, `❌ *ERROR*\n\n${targetUser.username} is already a bot owner.`);
      return;
    }
    
    // Add to owners
    config.owners.push(targetUser.id);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *OWNER ADDED*\n\n${targetUser.username} has been given bot owner privileges and can now use all admin commands.`, adminImage);
  } catch (error) {
    console.error('Error handling make owner command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while making the user an owner.`);
  }
}

/**
 * Remove owner status from a user
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleRemoveOwner(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username
    if (args.length < 1) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username to remove owner status.\n\nExample: ${config.prefix}removeowner Username`);
      return;
    }
    
    // Get the target username
    const username = args[0];
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Check if target is in the original owners (hardcoded in config.js)
    const hardcodedOwners = [
      '+91 89206 59106', // Replace with actual hardcoded owner numbers
      '+91 88105 02592',
      '+263 789771339'
    ];
    
    const targetNumberPart = targetUser.id.split('@')[0].split(':')[0];
    if (hardcodedOwners.some(owner => targetNumberPart.includes(owner.replace(/\s+/g, '')))) {
      await sendReply(sock, message, `❌ *ERROR*\n\nCannot remove privileges from a primary bot owner.`);
      return;
    }
    
    // Check if user is an owner
    if (!config.owners.includes(targetUser.id)) {
      await sendReply(sock, message, `❌ *ERROR*\n\n${targetUser.username} is not a bot owner.`);
      return;
    }
    
    // Remove from owners
    config.owners = config.owners.filter(id => id !== targetUser.id);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *OWNER REMOVED*\n\n${targetUser.username}'s bot owner privileges have been revoked.`, adminImage);
  } catch (error) {
    console.error('Error handling remove owner command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while removing the user's owner status.`);
  }
}

/**
 * Set a user's XP
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleSetXP(sock, message, args, user, sender) {
  try {
    // Check if user is owner
    if (!await isOwner(sock, message, sender)) return;
    
    // Need a username and an amount
    if (args.length < 2) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a username and amount of XP to set.\n\nExample: ${config.prefix}setxp Username 5000`);
      return;
    }
    
    // Get the target username and amount
    const username = args[0];
    const amount = parseInt(args[1]);
    
    // Validate amount
    if (isNaN(amount) || amount < 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid non-negative amount of XP.\n\nExample: ${config.prefix}setxp Username 5000`);
      return;
    }
    
    // Find user by username
    const targetUser = db.getUserByUsername(username);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nUser "${username}" not found. Make sure the username is correct and the user has registered.`);
      return;
    }
    
    // Calculate level based on new XP
    const newLevel = Math.floor(Math.sqrt(amount / 100) + 1);
    
    // Update the XP
    db.updateUser(targetUser.id, { xp: amount });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *XP UPDATED*\n\n${targetUser.username}'s XP has been set to ${amount.toLocaleString()}.\n\nNew Level: ${newLevel}`, adminImage);
  } catch (error) {
    console.error('Error handling set XP command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while setting XP.`);
  }
}

module.exports = {
  handleBlacklist,
  handleUnblacklist,
  handleResetData,
  handleResetAllData,
  handleAddCoins,
  handleRemoveCoins,
  handleMakeOwner,
  handleRemoveOwner,
  handleSetXP,
  isOwner // Export for use in other modules
};