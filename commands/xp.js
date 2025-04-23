const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser } = require('../database/db');
const { formatNumber } = require('../utils/formatter');

/**
 * Calculate level from XP
 * @param {Number} xp - XP points
 * @returns {Number} level
 */
function calculateLevel(xp) {
  return Math.floor(Math.sqrt(xp / 100) + 1);
}

/**
 * Calculate XP required for next level
 * @param {Number} level - Current level
 * @returns {Number} XP required for next level
 */
function xpForNextLevel(level) {
  return Math.pow(level, 2) * 100;
}

/**
 * Add XP to user
 * @param {String} userId - User ID
 * @param {Number} amount - Amount of XP to add
 * @returns {Object} Updated user data
 */
function addXP(userId, amount) {
  const user = getUser(userId);
  
  // Add XP
  const newXP = user.xp + amount;
  
  // Calculate level before and after
  const oldLevel = user.level;
  const newLevel = calculateLevel(newXP);
  
  // Check for level up
  if (newLevel > oldLevel) {
    // Update user with new XP and level
    updateUser(userId, {
      xp: newXP,
      level: newLevel
    });
    
    // Send level up notification if needed
    // (This would need to be handled by the specific command handler)
    
    return { ...user, xp: newXP, level: newLevel, levelUp: true };
  } else {
    // Just update XP
    updateUser(userId, {
      xp: newXP
    });
    
    return { ...user, xp: newXP, levelUp: false };
  }
}

/**
 * Handles XP command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleXP(sock, message, user) {
  try {
    // Calculate the XP needed for the next level
    const currentLevel = user.level;
    const nextLevel = currentLevel + 1;
    const xpNeeded = xpForNextLevel(currentLevel);
    const xpForLevel = xpForNextLevel(currentLevel - 1);
    const xpProgress = user.xp - xpForLevel;
    const xpTotal = xpNeeded - xpForLevel;
    const percentage = Math.floor((xpProgress / xpTotal) * 100);
    
    // Create a progress bar
    const progressBar = createProgressBar(percentage);
    
    // Send XP info
    await sendReply(sock, message, `⭐ *XP INFORMATION* ⭐\n\n` +
      `Level: ${currentLevel}\n` +
      `Prestige: ${user.prestige}\n` +
      `XP: ${formatNumber(user.xp)}\n\n` +
      `Progress to Level ${nextLevel}: ${percentage}%\n` +
      `${progressBar}\n` +
      `${formatNumber(xpProgress)} / ${formatNumber(xpTotal)} XP\n\n` +
      `*How to earn XP:*\n` +
      `• Betting: +${config.xpPerBet} XP per bet\n` +
      `• Winning: +${config.xpPerWin} XP per win\n` +
      `• Losing: +${config.xpPerLoss} XP per loss`);
  } catch (error) {
    console.error('Error handling XP command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking your XP.");
  }
}

/**
 * Handles level command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleLevel(sock, message, user) {
  try {
    // Calculate the XP needed for the next level
    const currentLevel = user.level;
    const nextLevel = currentLevel + 1;
    const xpNeeded = xpForNextLevel(currentLevel);
    const xpForLevel = xpForNextLevel(currentLevel - 1);
    const xpProgress = user.xp - xpForLevel;
    const xpTotal = xpNeeded - xpForLevel;
    const percentage = Math.floor((xpProgress / xpTotal) * 100);
    
    // Create a progress bar
    const progressBar = createProgressBar(percentage);
    
    // Calculate prestige benefits
    const interestBonus = (user.prestige * 0.001 * 100).toFixed(1); // 0.1% per prestige level
    const dailyRewardBonus = (user.prestige * config.prestigeRewardBonus * 100).toFixed(1);
    
    // Send level info
    await sendReply(sock, message, `📊 *LEVEL INFORMATION* 📊\n\n` +
      `Current Level: ${currentLevel}\n` +
      `Prestige: ${user.prestige}\n` +
      `Total XP: ${formatNumber(user.xp)}\n\n` +
      `Progress to Level ${nextLevel}: ${percentage}%\n` +
      `${progressBar}\n` +
      `${formatNumber(xpProgress)} / ${formatNumber(xpTotal)} XP\n\n` +
      `*Prestige Benefits:*\n` +
      `• +${interestBonus}% bank interest rate\n` +
      `• +${dailyRewardBonus}% daily reward\n\n` +
      `Reach Level ${config.prestigeLevel} to Prestige!\n` +
      `Use "${config.prefix}prestige" when you reach Level ${config.prestigeLevel}.`);
  } catch (error) {
    console.error('Error handling level command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking your level.");
  }
}

/**
 * Handles prestige command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handlePrestige(sock, message, user) {
  try {
    // Check if player is eligible for prestige
    if (user.level < config.prestigeLevel) {
      await sendReply(sock, message, `❌ You need to reach Level ${config.prestigeLevel} to prestige.\n\nYour current level is ${user.level}.`);
      return;
    }
    
    // Calculate new prestige level
    const newPrestige = user.prestige + 1;
    
    // Calculate prestige rewards
    const prestigeBonus = 10000 * newPrestige; // 10,000 coins per prestige level
    
    // Reset level and XP, increase prestige, add bonus
    updateUser(user.id, {
      prestige: newPrestige,
      level: 1,
      xp: 0,
      balance: user.balance + prestigeBonus
    });
    
    // Calculate new benefits
    const newInterestBonus = (newPrestige * 0.001 * 100).toFixed(1); // 0.1% per prestige level
    const newDailyBonus = (newPrestige * config.prestigeRewardBonus * 100).toFixed(1);
    
    // Send prestige confirmation
    await sendReply(sock, message, `🌟 *PRESTIGE UP!* 🌟\n\n` +
      `Congratulations! You've reached Prestige ${newPrestige}!\n\n` +
      `*Rewards:*\n` +
      `• ${formatNumber(prestigeBonus)} coins bonus\n` +
      `• +${newInterestBonus}% bank interest rate\n` +
      `• +${newDailyBonus}% daily reward bonus\n\n` +
      `Your level has been reset to 1, but you'll earn XP faster and get better rewards!\n\n` +
      `New balance: ${formatNumber(user.balance + prestigeBonus)} coins`);
  } catch (error) {
    console.error('Error handling prestige command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your prestige.");
  }
}

/**
 * Creates a visual progress bar
 * @param {Number} percentage - Progress percentage
 * @returns {String} Visual progress bar
 */
function createProgressBar(percentage) {
  const barLength = 10;
  const filledLength = Math.round((percentage / 100) * barLength);
  
  let bar = '[';
  for (let i = 0; i < barLength; i++) {
    if (i < filledLength) {
      bar += '█';
    } else {
      bar += '░';
    }
  }
  bar += ']';
  
  return bar;
}

module.exports = {
  handleXP,
  handleLevel,
  handlePrestige,
  addXP,
  calculateLevel
};
