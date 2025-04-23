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
  // Extract numerical part for more flexible matching
  const senderNumberPart = sender.split('@')[0].split(':')[0];
  
  // Check exact match first
  if (config.owners.includes(sender)) {
    return true;
  }
  
  // Then try flexible matching
  for (const owner of config.owners) {
    const ownerNumberPart = owner.split('@')[0].split(':')[0];
    if (ownerNumberPart === senderNumberPart) {
      return true;
    }
  }
  
  // If no match, inform user
  await sendReply(sock, message, `❌ *ACCESS DENIED*\n\nThis command is only available to bot owners.\n\nIf you are an owner but seeing this message, please use "${config.prefix}help fixowner" to fix your owner status.`);
  return false;
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
    
    // Need at least one mentioned user
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to blacklist.\n\nExample: ${config.prefix}blacklist @user`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user exists in database
    const targetUser = db.getUser(targetUserId);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user has not used the bot before.`);
      return;
    }
    
    // Prevent blacklisting owners
    if (config.owners.some(owner => {
      const ownerNumberPart = owner.split('@')[0].split(':')[0];
      const targetNumberPart = targetUserId.split('@')[0].split(':')[0];
      return ownerNumberPart === targetNumberPart;
    })) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou cannot blacklist another bot owner.`);
      return;
    }
    
    // Blacklist the user
    db.blacklistUser(targetUserId, true);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *USER BLACKLISTED*\n\nThe user has been blacklisted and can no longer use the bot.`, adminImage);
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
    
    // Need at least one mentioned user
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to unblacklist.\n\nExample: ${config.prefix}unblacklist @user`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user exists in database
    const targetUser = db.getUser(targetUserId);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user has not used the bot before.`);
      return;
    }
    
    // Check if user is actually blacklisted
    if (!db.isUserBlacklisted(targetUserId)) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user is not currently blacklisted.`);
      return;
    }
    
    // Unblacklist the user
    db.blacklistUser(targetUserId, false);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *USER UNBLACKLISTED*\n\nThe user has been removed from the blacklist and can now use the bot again.`, adminImage);
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
    
    // Need a mentioned user and an amount
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to add coins.\n\nExample: ${config.prefix}addcoins @user 1000`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user exists in database
    const targetUser = db.getUser(targetUserId);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user has not used the bot before.`);
      return;
    }
    
    // Get the amount
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid positive amount of coins to add.\n\nExample: ${config.prefix}addcoins @user 1000`);
      return;
    }
    
    // Add the coins
    db.updateUser(targetUserId, { coins: targetUser.coins + amount });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *COINS ADDED*\n\n${amount.toLocaleString()} coins have been added to ${targetUser.username || targetUserId}'s account.\n\nNew balance: ${(targetUser.coins + amount).toLocaleString()} coins`, adminImage);
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
    
    // Need a mentioned user and an amount
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to remove coins.\n\nExample: ${config.prefix}removecoins @user 1000`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user exists in database
    const targetUser = db.getUser(targetUserId);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user has not used the bot before.`);
      return;
    }
    
    // Get the amount
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid positive amount of coins to remove.\n\nExample: ${config.prefix}removecoins @user 1000`);
      return;
    }
    
    // Calculate new balance (minimum 0)
    const newBalance = Math.max(0, targetUser.coins - amount);
    const actualAmountRemoved = targetUser.coins - newBalance;
    
    // Update the balance
    db.updateUser(targetUserId, { coins: newBalance });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *COINS REMOVED*\n\n${actualAmountRemoved.toLocaleString()} coins have been removed from ${targetUser.username || targetUserId}'s account.\n\nNew balance: ${newBalance.toLocaleString()} coins`, adminImage);
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
    
    // Need a mentioned user
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to make them an owner.\n\nExample: ${config.prefix}makeowner @user`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user is already an owner
    if (config.owners.includes(targetUserId)) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user is already a bot owner.`);
      return;
    }
    
    // Add to owners
    config.owners.push(targetUserId);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *OWNER ADDED*\n\nThe user has been given bot owner privileges and can now use all admin commands.`, adminImage);
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
    
    // Need a mentioned user
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to remove their owner status.\n\nExample: ${config.prefix}removeowner @user`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if target is in the original owners (hardcoded in config.js)
    const hardcodedOwners = [
      '+91 89206 59106', // Replace with actual hardcoded owner numbers
      '+91 88105 02592',
      '+263 789771339'
    ];
    
    const targetNumberPart = targetUserId.split('@')[0].split(':')[0];
    if (hardcodedOwners.some(owner => targetNumberPart.includes(owner.replace(/\s+/g, '')))) {
      await sendReply(sock, message, `❌ *ERROR*\n\nCannot remove privileges from a primary bot owner.`);
      return;
    }
    
    // Check if user is an owner
    if (!config.owners.includes(targetUserId)) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user is not a bot owner.`);
      return;
    }
    
    // Remove from owners
    config.owners = config.owners.filter(id => id !== targetUserId);
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *OWNER REMOVED*\n\nThe user's bot owner privileges have been revoked.`, adminImage);
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
    
    // Need a mentioned user and an amount
    if (!message.message.extendedTextMessage || !message.message.extendedTextMessage.contextInfo || !message.message.extendedTextMessage.contextInfo.mentionedJid || message.message.extendedTextMessage.contextInfo.mentionedJid.length === 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must mention a user to set their XP.\n\nExample: ${config.prefix}setxp @user 5000`);
      return;
    }
    
    // Get the first mentioned user
    const targetUserId = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    
    // Check if user exists in database
    const targetUser = db.getUser(targetUserId);
    if (!targetUser) {
      await sendReply(sock, message, `❌ *ERROR*\n\nThe mentioned user has not used the bot before.`);
      return;
    }
    
    // Get the amount
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount < 0) {
      await sendReply(sock, message, `❌ *ERROR*\n\nYou must specify a valid non-negative amount of XP.\n\nExample: ${config.prefix}setxp @user 5000`);
      return;
    }
    
    // Calculate level based on new XP
    const newLevel = Math.floor(Math.sqrt(amount / 100) + 1);
    
    // Update the XP
    db.updateUser(targetUserId, { xp: amount });
    
    // Get the admin image
    const adminImage = await getCategoryImage('admin');
    
    // Send success message
    await sendReply(sock, message, `✅ *XP UPDATED*\n\n${targetUser.username || targetUserId}'s XP has been set to ${amount.toLocaleString()}.\n\nNew Level: ${newLevel}`, adminImage);
  } catch (error) {
    console.error('Error handling set XP command:', error);
    await sendReply(sock, message, `❌ *ERROR*\n\nAn error occurred while setting XP.`);
  }
}

module.exports = {
  handleBlacklist,
  handleUnblacklist,
  handleResetData,
  handleAddCoins,
  handleRemoveCoins,
  handleMakeOwner,
  handleRemoveOwner,
  handleSetXP,
  isOwner // Export for use in other modules
};