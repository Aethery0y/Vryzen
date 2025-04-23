const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser } = require('../database/db');
const { formatNumber } = require('../utils/formatter');

/**
 * Handles deposit command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleDeposit(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}deposit [amount/all]`);
      return;
    }
    
    let amount;
    
    // Check if amount is 'all'
    if (args[0].toLowerCase() === 'all') {
      amount = user.balance;
    } else {
      // Convert to number
      amount = parseInt(args[0]);
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid amount.");
      return;
    }
    
    // Check if player has enough balance
    if (amount > user.balance) {
      await sendReply(sock, message, "❌ You don't have enough coins in your wallet.");
      return;
    }
    
    // Check if bank has enough capacity
    const remainingCapacity = user.bankCapacity - user.bankBalance;
    if (amount > remainingCapacity) {
      // Adjust amount to remaining capacity
      amount = remainingCapacity;
      await sendReply(sock, message, `⚠️ You can only deposit ${formatNumber(amount)} coins due to bank capacity limit.`);
    }
    
    if (amount === 0) {
      await sendReply(sock, message, "❌ Your bank is full! Please upgrade your bank capacity.");
      return;
    }
    
    // Update user's balance and bank balance
    updateUser(user.id, {
      balance: user.balance - amount,
      bankBalance: user.bankBalance + amount
    });
    
    // Send confirmation
    await sendReply(sock, message, `✅ Successfully deposited ${formatNumber(amount)} coins to your bank!\n\nWallet: ${formatNumber(user.balance - amount)} coins\nBank: ${formatNumber(user.bankBalance + amount)} / ${formatNumber(user.bankCapacity)} coins`);
  } catch (error) {
    console.error('Error handling deposit command:', error);
    await sendReply(sock, message, "❌ An error occurred while depositing coins.");
  }
}

/**
 * Handles withdraw command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleWithdraw(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}withdraw [amount/all]`);
      return;
    }
    
    let amount;
    
    // Check if amount is 'all'
    if (args[0].toLowerCase() === 'all') {
      amount = user.bankBalance;
    } else {
      // Convert to number
      amount = parseInt(args[0]);
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid amount.");
      return;
    }
    
    // Check if player has enough in bank
    if (amount > user.bankBalance) {
      await sendReply(sock, message, "❌ You don't have enough coins in your bank.");
      return;
    }
    
    // Update user's balance and bank balance
    updateUser(user.id, {
      balance: user.balance + amount,
      bankBalance: user.bankBalance - amount
    });
    
    // Send confirmation
    await sendReply(sock, message, `✅ Successfully withdrew ${formatNumber(amount)} coins from your bank!\n\nWallet: ${formatNumber(user.balance + amount)} coins\nBank: ${formatNumber(user.bankBalance - amount)} / ${formatNumber(user.bankCapacity)} coins`);
  } catch (error) {
    console.error('Error handling withdraw command:', error);
    await sendReply(sock, message, "❌ An error occurred while withdrawing coins.");
  }
}

/**
 * Handles interest command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleInterest(sock, message, user) {
  try {
    // Check if user has claimed interest today
    const now = new Date();
    const lastInterestClaim = user.lastInterestClaim ? new Date(user.lastInterestClaim) : null;
    const canClaimInterest = !lastInterestClaim || now.getDate() !== lastInterestClaim.getDate() || now.getMonth() !== lastInterestClaim.getMonth() || now.getFullYear() !== lastInterestClaim.getFullYear();
    
    if (!canClaimInterest) {
      // Calculate time until next claim
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilReset = tomorrow - now;
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      
      await sendReply(sock, message, `❌ You've already claimed your daily interest today.\n\nYou can claim again in ${hours}h ${minutes}m.`);
      return;
    }
    
    // Calculate interest
    const interestRate = config.baseBankInterestRate + (user.prestige * 0.001); // +0.1% per prestige level
    const interestAmount = Math.floor(user.bankBalance * interestRate);
    
    if (interestAmount <= 0) {
      await sendReply(sock, message, "❌ You don't have enough coins in your bank to earn interest.");
      return;
    }
    
    // Check if adding interest would exceed bank capacity
    const newBankBalance = user.bankBalance + interestAmount;
    if (newBankBalance > user.bankCapacity) {
      // Adjust interest to remaining capacity
      const adjustedInterest = user.bankCapacity - user.bankBalance;
      if (adjustedInterest <= 0) {
        await sendReply(sock, message, "❌ Your bank is full! Please withdraw some coins or upgrade your bank capacity.");
        return;
      }
      
      // Update user's bank balance and last interest claim
      updateUser(user.id, {
        bankBalance: user.bankCapacity,
        lastInterestClaim: Date.now()
      });
      
      await sendReply(sock, message, `✅ You've earned ${formatNumber(adjustedInterest)} coins in interest (bank full)!\n\nBank: ${formatNumber(user.bankCapacity)} / ${formatNumber(user.bankCapacity)} coins\nInterest Rate: ${(interestRate * 100).toFixed(2)}%`);
    } else {
      // Update user's bank balance and last interest claim
      updateUser(user.id, {
        bankBalance: newBankBalance,
        lastInterestClaim: Date.now()
      });
      
      await sendReply(sock, message, `✅ You've earned ${formatNumber(interestAmount)} coins in interest!\n\nBank: ${formatNumber(newBankBalance)} / ${formatNumber(user.bankCapacity)} coins\nInterest Rate: ${(interestRate * 100).toFixed(2)}%`);
    }
  } catch (error) {
    console.error('Error handling interest command:', error);
    await sendReply(sock, message, "❌ An error occurred while claiming interest.");
  }
}

/**
 * Handles bank upgrade command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleBankUpgrade(sock, message, user) {
  try {
    // Calculate upgrade cost
    const upgradeCost = Math.floor(user.bankCapacity * config.bankUpgradeCostPercent);
    
    // Check if user has enough balance
    if (user.balance < upgradeCost) {
      await sendReply(sock, message, `❌ You need ${formatNumber(upgradeCost)} coins to upgrade your bank. You have ${formatNumber(user.balance)} coins.`);
      return;
    }
    
    // Calculate new capacity
    const newCapacity = Math.floor(user.bankCapacity * (1 + config.bankCapacityIncreasePercent));
    
    // Update user's balance and bank capacity
    updateUser(user.id, {
      balance: user.balance - upgradeCost,
      bankCapacity: newCapacity
    });
    
    // Calculate next upgrade cost
    const nextUpgradeCost = Math.floor(newCapacity * config.bankUpgradeCostPercent);
    
    // Send confirmation
    await sendReply(sock, message, `✅ Bank capacity upgraded!\n\nNew capacity: ${formatNumber(newCapacity)} coins (+${formatNumber(newCapacity - user.bankCapacity)} coins)\nCost: ${formatNumber(upgradeCost)} coins\n\nNext upgrade will cost ${formatNumber(nextUpgradeCost)} coins.\n\nNew balance: ${formatNumber(user.balance - upgradeCost)} coins`);
  } catch (error) {
    console.error('Error handling bank upgrade command:', error);
    await sendReply(sock, message, "❌ An error occurred while upgrading your bank.");
  }
}

/**
 * Handles bank info command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleBankInfo(sock, message, user) {
  try {
    // Calculate interest rate
    const interestRate = config.baseBankInterestRate + (user.prestige * 0.001); // +0.1% per prestige level
    
    // Calculate daily interest
    const dailyInterest = Math.floor(user.bankBalance * interestRate);
    
    // Calculate upgrade cost
    const upgradeCost = Math.floor(user.bankCapacity * config.bankUpgradeCostPercent);
    
    // Calculate capacity percentage
    const capacityPercentage = (user.bankBalance / user.bankCapacity) * 100;
    
    // Format capacity bar
    const capacityBar = generateCapacityBar(capacityPercentage);
    
    // Check next interest claim
    const now = new Date();
    const lastInterestClaim = user.lastInterestClaim ? new Date(user.lastInterestClaim) : null;
    const canClaimInterest = !lastInterestClaim || now.getDate() !== lastInterestClaim.getDate() || now.getMonth() !== lastInterestClaim.getMonth() || now.getFullYear() !== lastInterestClaim.getFullYear();
    
    let interestStatus;
    if (canClaimInterest) {
      interestStatus = "Available now! Use .int to claim";
    } else {
      // Calculate time until next claim
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const timeUntilReset = tomorrow - now;
      const hours = Math.floor(timeUntilReset / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));
      
      interestStatus = `Available in ${hours}h ${minutes}m`;
    }
    
    // Send bank info
    await sendReply(sock, message, `🏦 *BANK INFORMATION* 🏦\n\n` +
      `Balance: ${formatNumber(user.bankBalance)} / ${formatNumber(user.bankCapacity)} coins\n` +
      `${capacityBar} ${capacityPercentage.toFixed(1)}% full\n\n` +
      `Interest Rate: ${(interestRate * 100).toFixed(2)}% daily\n` +
      `Daily Interest: ${formatNumber(dailyInterest)} coins\n` +
      `Next Interest: ${interestStatus}\n\n` +
      `Upgrade Cost: ${formatNumber(upgradeCost)} coins\n` +
      `New Capacity After Upgrade: ${formatNumber(Math.floor(user.bankCapacity * (1 + config.bankCapacityIncreasePercent)))} coins\n\n` +
      `Use "${config.prefix}deposit [amount]" to add coins to your bank.\n` +
      `Use "${config.prefix}withdraw [amount]" to take coins from your bank.\n` +
      `Use "${config.prefix}bank-upgrade" to increase your bank capacity.`);
  } catch (error) {
    console.error('Error handling bank info command:', error);
    await sendReply(sock, message, "❌ An error occurred while displaying bank information.");
  }
}

/**
 * Generates a visual capacity bar
 * @param {Number} percentage - Capacity percentage
 * @returns {String} Visual capacity bar
 */
function generateCapacityBar(percentage) {
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
  handleDeposit,
  handleWithdraw,
  handleInterest,
  handleBankUpgrade,
  handleBankInfo
};
