const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { formatNumber } = require('../utils/formatter');

/**
 * Handles ping command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handlePing(sock, message) {
  try {
    const startTime = Date.now();
    
    // Send the initial message
    await sendReply(sock, message, "📶 Pinging...");
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Send the actual ping response
    await sendReply(sock, message, `📶 Pong! Bot is online.\nResponse time: ${responseTime}ms`);
  } catch (error) {
    console.error('Error handling ping command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking ping.");
  }
}

/**
 * Handles balance command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleBalance(sock, message, user) {
  try {
    const balanceText = `💰 *BALANCE*\n\n` +
      `Wallet: ${formatNumber(user.balance)} coins\n` +
      `Bank: ${formatNumber(user.bankBalance)} / ${formatNumber(user.bankCapacity)} coins\n` +
      `Total: ${formatNumber(user.balance + user.bankBalance)} coins`;
    
    await sendReply(sock, message, balanceText);
  } catch (error) {
    console.error('Error handling balance command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking your balance.");
  }
}

/**
 * Handles profile command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleProfile(sock, message, user) {
  try {
    // Calculate total net worth (balance + bank + company investments)
    let totalInvestments = 0;
    for (const company in user.investedCompanies) {
      totalInvestments += user.investedCompanies[company];
    }
    
    const netWorth = user.balance + user.bankBalance + totalInvestments;
    
    // Calculate win rate
    const winRate = user.gamesPlayed > 0 
      ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1) 
      : 0;
    
    // Format join date
    const joinDate = new Date(user.joinDate).toLocaleDateString();
    
    const profileText = `📊 *USER PROFILE* 📊\n\n` +
      `💰 *Economy*\n` +
      `Wallet: ${formatNumber(user.balance)} coins\n` +
      `Bank: ${formatNumber(user.bankBalance)} / ${formatNumber(user.bankCapacity)} coins\n` +
      `Investments: ${formatNumber(totalInvestments)} coins\n` +
      `Net Worth: ${formatNumber(netWorth)} coins\n\n` +
      
      `🎮 *Stats*\n` +
      `Level: ${user.level} (Prestige ${user.prestige})\n` +
      `XP: ${formatNumber(user.xp)}\n` +
      `Games Played: ${formatNumber(user.gamesPlayed)}\n` +
      `Win Rate: ${winRate}%\n` +
      `Daily Streak: ${user.dailyStreak} days\n\n` +
      
      `ℹ️ *Info*\n` +
      `Joined: ${joinDate}`;
    
    await sendReply(sock, message, profileText);
  } catch (error) {
    console.error('Error handling profile command:', error);
    await sendReply(sock, message, "❌ An error occurred while loading your profile.");
  }
}

/**
 * Handles maingc command to add user to main group
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} sender - Sender ID
 */
async function handleMainGC(sock, message, sender) {
  try {
    // First, reply to the user's message
    await sendReply(sock, message, "🔗 Sending you an invite to the official WhatsApp Bot group...");
    
    // Try to add the user to the group if the bot is an admin
    try {
      await sock.groupParticipantsUpdate(
        config.mainGroupID,
        [sender],
        "add"
      );
      await sendReply(sock, message, "✅ You've been added to the official WhatsApp Bot group!");
    } catch (addError) {
      // If adding fails, send them the group invite link instead
      console.log('Error adding user to group, sending invite link instead:', addError);
      
      // Send the group invite link in a direct message
      await sock.sendMessage(
        sender,
        { 
          text: `🔗 Join our official WhatsApp Bot group:\n${config.mainGroupLink}\n\nClick the link to join!` 
        }
      );
      
      // Let them know in the original chat that a link was sent
      await sendReply(sock, message, "✅ I've sent you the group invite link in a direct message!");
    }
  } catch (error) {
    console.error('Error handling maingc command:', error);
    await sendReply(sock, message, "❌ An error occurred while trying to add you to the group.");
  }
}

module.exports = {
  handlePing,
  handleBalance,
  handleProfile,
  handleMainGC
};
