const { sendReply } = require('../utils/messageUtils');
const { getAllUsers, getAllCompanies } = require('../database/db');
const { formatNumber } = require('../utils/formatter');

/**
 * Handles top rich command (richest players)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopRich(sock, message) {
  try {
    // Get all users
    const users = getAllUsers();
    
    // Calculate total wealth (balance + bank + investments)
    const wealthUsers = users.map(user => {
      let totalInvestments = 0;
      for (const company in user.investedCompanies) {
        totalInvestments += user.investedCompanies[company];
      }
      
      const totalWealth = user.balance + user.bankBalance + totalInvestments;
      
      return {
        id: user.id,
        name: user.id.split('@')[0],
        wealth: totalWealth
      };
    });
    
    // Sort users by wealth
    const topRich = wealthUsers
      .sort((a, b) => b.wealth - a.wealth)
      .slice(0, 10);
    
    if (topRich.length === 0) {
      await sendReply(sock, message, "No users found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '💰 *TOP RICHEST PLAYERS* 💰\n\n';
    
    for (let i = 0; i < topRich.length; i++) {
      const user = topRich[i];
      leaderboardText += `${i + 1}. ${user.name}: ${formatNumber(user.wealth)} coins\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top rich command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching richest players.");
  }
}

/**
 * Handles top wins command (players with most wins)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopWins(sock, message) {
  try {
    // Get all users
    const users = getAllUsers();
    
    // Filter users who have played at least one game
    const playersWithWins = users
      .filter(user => user.gamesPlayed > 0)
      .map(user => ({
        id: user.id,
        name: user.id.split('@')[0],
        wins: user.gamesWon,
        gamesPlayed: user.gamesPlayed,
        winRate: ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)
      }));
    
    // Sort users by wins
    const topWins = playersWithWins
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10);
    
    if (topWins.length === 0) {
      await sendReply(sock, message, "No players with wins found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '🏆 *TOP WINNERS* 🏆\n\n';
    
    for (let i = 0; i < topWins.length; i++) {
      const player = topWins[i];
      leaderboardText += `${i + 1}. ${player.name}: ${formatNumber(player.wins)} wins (${player.winRate}% rate)\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top wins command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching top winners.");
  }
}

/**
 * Handles top streak command (highest daily streaks)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopStreak(sock, message) {
  try {
    // Get all users
    const users = getAllUsers();
    
    // Sort users by daily streak
    const topStreak = users
      .filter(user => user.dailyStreak > 0)
      .map(user => ({
        id: user.id,
        name: user.id.split('@')[0],
        streak: user.dailyStreak
      }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 10);
    
    if (topStreak.length === 0) {
      await sendReply(sock, message, "No players with daily streaks found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '🔥 *TOP DAILY STREAKS* 🔥\n\n';
    
    for (let i = 0; i < topStreak.length; i++) {
      const player = topStreak[i];
      leaderboardText += `${i + 1}. ${player.name}: ${player.streak} days\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top streak command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching top streaks.");
  }
}

/**
 * Handles top levels command (highest level players)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopLevels(sock, message) {
  try {
    // Get all users
    const users = getAllUsers();
    
    // Sort users by level
    const topLevels = users
      .map(user => ({
        id: user.id,
        name: user.id.split('@')[0],
        level: user.level,
        xp: user.xp
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);
    
    if (topLevels.length === 0) {
      await sendReply(sock, message, "No players found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '⭐ *TOP LEVELS* ⭐\n\n';
    
    for (let i = 0; i < topLevels.length; i++) {
      const player = topLevels[i];
      leaderboardText += `${i + 1}. ${player.name}: Level ${player.level} (${formatNumber(player.xp)} XP)\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top levels command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching top levels.");
  }
}

/**
 * Handles top prestige command (highest prestige players)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopPrestige(sock, message) {
  try {
    // Get all users
    const users = getAllUsers();
    
    // Sort users by prestige
    const topPrestige = users
      .filter(user => user.prestige > 0)
      .map(user => ({
        id: user.id,
        name: user.id.split('@')[0],
        prestige: user.prestige,
        level: user.level
      }))
      .sort((a, b) => b.prestige - a.prestige || b.level - a.level)
      .slice(0, 10);
    
    if (topPrestige.length === 0) {
      await sendReply(sock, message, "No players with prestige found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '🌟 *TOP PRESTIGE* 🌟\n\n';
    
    for (let i = 0; i < topPrestige.length; i++) {
      const player = topPrestige[i];
      leaderboardText += `${i + 1}. ${player.name}: Prestige ${player.prestige} (Level ${player.level})\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top prestige command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching top prestige.");
  }
}

/**
 * Handles top companies command (most valuable companies)
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleTopCompanies(sock, message) {
  try {
    // Get all companies
    const companies = getAllCompanies();
    
    // Filter out closed companies and sort by value
    const topCompanies = companies
      .filter(company => !company.closed)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    if (topCompanies.length === 0) {
      await sendReply(sock, message, "No companies found yet.");
      return;
    }
    
    // Format leaderboard
    let leaderboardText = '🏢 *TOP COMPANIES* 🏢\n\n';
    
    for (let i = 0; i < topCompanies.length; i++) {
      const company = topCompanies[i];
      leaderboardText += `${i + 1}. ${company.name} (${company.sector}): ${formatNumber(company.value)} coins\n   Owner: ${company.owner.split('@')[0]}\n`;
    }
    
    await sendReply(sock, message, leaderboardText);
  } catch (error) {
    console.error('Error handling top companies command:', error);
    await sendReply(sock, message, "❌ An error occurred while fetching top companies.");
  }
}

module.exports = {
  handleTopRich,
  handleTopWins,
  handleTopStreak,
  handleTopLevels,
  handleTopPrestige,
  handleTopCompanies
};
