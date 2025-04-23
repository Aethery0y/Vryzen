/**
 * Daily rewards module
 */

const config = require('../config');
const { getUser, updateUser } = require('../database/db');
const { sendReply } = require('../utils/messageUtils');
const { formatNumber } = require('../utils/formatUtils');

/**
 * Handles daily reward command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleDaily(sock, message, user) {
  try {
    // Check if user has claimed daily reward today
    const now = new Date();
    const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null;
    
    // Check if user can claim (not claimed today)
    const canClaim = !lastDaily || 
      now.getDate() !== lastDaily.getDate() || 
      now.getMonth() !== lastDaily.getMonth() || 
      now.getFullYear() !== lastDaily.getFullYear();
    
    if (!canClaim) {
      // Calculate time until next claim
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilReset = tomorrow - now;
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      
      await sendReply(sock, message, `❌ You've already claimed your daily reward today.\n\nYou can claim again in ${hours}h ${minutes}m.`);
      return;
    }
    
    // User can claim, calculate reward
    const baseReward = config.baseReward || 1000;
    
    // Check streak
    let streak = user.dailyStreak || 0;
    
    // Check if streak should continue or reset
    if (lastDaily) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if last claim was yesterday
      const wasYesterday = 
        lastDaily.getDate() === yesterday.getDate() && 
        lastDaily.getMonth() === yesterday.getMonth() && 
        lastDaily.getFullYear() === yesterday.getFullYear();
      
      if (!wasYesterday) {
        // Streak broken
        streak = 0;
      }
    }
    
    // Increment streak
    streak++;
    
    // Calculate streak bonus
    const streakBonus = streak * (config.streakBonus || 0.1); // 10% per day in streak
    
    // Calculate prestige bonus
    const prestigeBonus = (user.prestige || 0) * (config.prestigeRewardBonus || 0.02); // 2% per prestige level
    
    // Calculate final reward
    const streakBonusAmount = Math.floor(baseReward * streakBonus);
    const prestigeBonusAmount = Math.floor(baseReward * prestigeBonus);
    const totalReward = baseReward + streakBonusAmount + prestigeBonusAmount;
    
    // Update user data
    updateUser(user.id, {
      balance: (user.balance || 0) + totalReward,
      lastDaily: now.getTime(),
      dailyStreak: streak
    });
    
    // Send confirmation message
    let replyMessage = `💰 *DAILY REWARD CLAIMED!* 💰\n\n`;
    replyMessage += `Base reward: ${formatNumber(baseReward)} coins\n`;
    
    if (streakBonusAmount > 0) {
      replyMessage += `Streak bonus (Day ${streak}): +${formatNumber(streakBonusAmount)} coins\n`;
    }
    
    if (prestigeBonusAmount > 0) {
      replyMessage += `Prestige bonus (Level ${user.prestige || 0}): +${formatNumber(prestigeBonusAmount)} coins\n`;
    }
    
    replyMessage += `\nTotal reward: ${formatNumber(totalReward)} coins\n`;
    replyMessage += `New balance: ${formatNumber((user.balance || 0) + totalReward)} coins\n\n`;
    
    // Add streak info
    replyMessage += `Current streak: ${streak} day${streak !== 1 ? 's' : ''}\n`;
    replyMessage += `Next reward: ${formatNumber(baseReward + (baseReward * (streak + 1) * (config.streakBonus || 0.1)) + prestigeBonusAmount)} coins`;
    
    await sendReply(sock, message, replyMessage);
  } catch (error) {
    console.error('Error handling daily command:', error);
    await sendReply(sock, message, "❌ An error occurred while claiming your daily reward.");
  }
}

/**
 * Handles streak command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleStreak(sock, message, user) {
  try {
    const streak = user.dailyStreak || 0;
    const baseReward = config.baseReward || 1000;
    const streakBonus = streak * (config.streakBonus || 0.1);
    const prestigeBonus = (user.prestige || 0) * (config.prestigeRewardBonus || 0.02);
    
    const nextStreakBonus = (streak + 1) * (config.streakBonus || 0.1);
    const nextStreakReward = baseReward + (baseReward * nextStreakBonus) + (baseReward * prestigeBonus);
    
    let replyMessage = `🔥 *YOUR DAILY STREAK* 🔥\n\n`;
    replyMessage += `Current streak: ${streak} day${streak !== 1 ? 's' : ''}\n\n`;
    
    if (streak > 0) {
      replyMessage += `Current streak bonus: +${(streakBonus * 100).toFixed(0)}%\n`;
    }
    
    replyMessage += `Next day streak bonus: +${(nextStreakBonus * 100).toFixed(0)}%\n`;
    replyMessage += `Next reward: ${formatNumber(nextStreakReward)} coins\n\n`;
    
    // Check last claim and next claim time
    const lastDaily = user.lastDaily ? new Date(user.lastDaily) : null;
    
    if (lastDaily) {
      const now = new Date();
      const tomorrow = new Date(lastDaily);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (now < tomorrow) {
        // User has claimed today, show next claim time
        const timeUntilReset = tomorrow - now;
        const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
        
        replyMessage += `Next claim available in: ${hours}h ${minutes}m\n`;
        replyMessage += `⚠️ Don't miss your next claim or you'll lose your streak!`;
      } else {
        // User can claim now
        replyMessage += `⚠️ *Claim available now!* ⚠️\n`;
        replyMessage += `Use ${config.prefix}daily to claim your reward.`;
      }
    } else {
      // User has never claimed
      replyMessage += `You haven't claimed any daily rewards yet.\n`;
      replyMessage += `Use ${config.prefix}daily to claim your first reward.`;
    }
    
    await sendReply(sock, message, replyMessage);
  } catch (error) {
    console.error('Error handling streak command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking your streak.");
  }
}

module.exports = {
  handleDaily,
  handleStreak
};