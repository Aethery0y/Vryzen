const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser, createChallenge, getChallenge, getPendingChallengesForUser, updateChallenge, cleanupExpiredChallenges } = require('../database/db');
const { formatNumber } = require('../utils/formatter');
const { coinToss } = require('../utils/games');
const { addXP } = require('./xp');

/**
 * Handles challenge command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleChallenge(sock, message, args, user, sender) {
  try {
    // Clean up expired challenges
    cleanupExpiredChallenges();
    
    // Check if there are valid arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}challenge @user [amount]`);
      return;
    }
    
    // Check for challenge cooldown
    const now = Date.now();
    const lastChallengeTime = user.lastChallengeTime || 0;
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    
    if (lastChallengeTime > hourAgo) {
      const challengesThisHour = user.challengesMade || 0;
      
      if (challengesThisHour >= config.maxChallengesPerHour) {
        const resetTime = new Date(lastChallengeTime + 3600000);
        const minutesLeft = Math.ceil((resetTime - now) / 60000);
        
        await sendReply(sock, message, `❌ You've reached the limit of ${config.maxChallengesPerHour} challenges per hour.\n\nYou can challenge again in ${minutesLeft} minutes.`);
        return;
      }
    } else {
      // Reset challenges count if an hour has passed
      updateUser(user.id, {
        challengesMade: 0,
        lastChallengeTime: now
      });
    }
    
    // Get mentioned user
    let opponent = '';
    const mentionedUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    
    if (mentionedUser) {
      opponent = mentionedUser;
    } else {
      // Try to get from the first argument (might be a phone number)
      const firstArg = args[0];
      if (firstArg.startsWith('@')) {
        const userNumber = firstArg.slice(1);
        opponent = userNumber.includes('@') ? userNumber : `${userNumber}@s.whatsapp.net`;
      }
    }
    
    if (!opponent) {
      await sendReply(sock, message, "❌ Please mention the user you want to challenge.");
      return;
    }
    
    // Check if player is challenging themselves
    if (opponent === sender) {
      await sendReply(sock, message, "❌ You cannot challenge yourself.");
      return;
    }
    
    // Check if opponent exists in the database
    const opponentUser = getUser(opponent);
    
    // Parse bet amount
    const betAmount = parseInt(args[args.length - 1]);
    
    // Validate bet amount
    if (isNaN(betAmount) || betAmount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid bet amount.");
      return;
    }
    
    // Check if player has enough balance
    if (betAmount > user.balance) {
      await sendReply(sock, message, "❌ You don't have enough coins for this challenge.");
      return;
    }
    
    // Check minimum bet
    if (betAmount < config.minBet) {
      await sendReply(sock, message, `❌ Minimum challenge bet is ${config.minBet} coins.`);
      return;
    }
    
    // Check maximum bet
    if (betAmount > config.maxBet) {
      await sendReply(sock, message, `❌ Maximum challenge bet is ${formatNumber(config.maxBet)} coins.`);
      return;
    }
    
    // Check if opponent has enough balance
    if (betAmount > opponentUser.balance) {
      await sendReply(sock, message, `❌ ${opponent.split('@')[0]} doesn't have enough coins for this challenge.`);
      return;
    }
    
    // Create the challenge
    const challenge = createChallenge(sender, opponent, betAmount);
    
    // Update challenger's data
    const challengesMade = (user.challengesMade || 0) + 1;
    updateUser(sender, {
      challengesMade,
      lastChallengeTime: now
    });
    
    // Notify the opponent
    try {
      await sock.sendMessage(
        opponent,
        {
          text: `⚔️ *CHALLENGE RECEIVED* ⚔️\n\n` +
            `${sender.split('@')[0]} has challenged you to a duel!\n\n` +
            `Bet Amount: ${formatNumber(betAmount)} coins\n\n` +
            `Type "${config.prefix}accept" to accept or "${config.prefix}decline" to decline.\n` +
            `You have ${config.challengeTimeout} seconds to respond.`
        }
      );
    } catch (notifyError) {
      console.error('Error notifying opponent about challenge:', notifyError);
    }
    
    // Send confirmation to challenger
    await sendReply(sock, message, `⚔️ *CHALLENGE SENT* ⚔️\n\n` +
      `You've challenged ${opponent.split('@')[0]} to a duel for ${formatNumber(betAmount)} coins!\n\n` +
      `They have ${config.challengeTimeout} seconds to accept or decline the challenge.`);
  } catch (error) {
    console.error('Error handling challenge command:', error);
    await sendReply(sock, message, "❌ An error occurred while creating the challenge.");
  }
}

/**
 * Handles accept command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleAccept(sock, message, user, sender) {
  try {
    // Clean up expired challenges
    cleanupExpiredChallenges();
    
    // Check if there are any pending challenges
    const pendingChallenges = getPendingChallengesForUser(sender);
    
    if (pendingChallenges.length === 0) {
      await sendReply(sock, message, "❌ You don't have any pending challenges to accept.");
      return;
    }
    
    // Get the most recent challenge
    const challenge = pendingChallenges.sort((a, b) => b.createdAt - a.createdAt)[0];
    
    // Check if the challenge is still valid
    if (challenge.status !== 'pending') {
      await sendReply(sock, message, "❌ This challenge is no longer valid.");
      return;
    }
    
    // Get challenger data
    const challenger = getUser(challenge.challenger);
    
    // Check if both players have enough balance
    if (challenge.amount > user.balance) {
      updateChallenge(challenge.id, { status: 'cancelled' });
      await sendReply(sock, message, "❌ You don't have enough coins to accept this challenge.");
      return;
    }
    
    if (challenge.amount > challenger.balance) {
      updateChallenge(challenge.id, { status: 'cancelled' });
      await sendReply(sock, message, "❌ The challenger doesn't have enough coins anymore.");
      return;
    }
    
    // Mark challenge as accepted
    updateChallenge(challenge.id, { status: 'accepted' });
    
    // Determine the winner (coin toss)
    const result = coinToss();
    const challengerWins = result === 'heads'; // Challenger gets heads, opponent gets tails
    
    // Calculate winnings
    const betAmount = challenge.amount;
    const winAmount = betAmount * 2;
    
    // Update balances and stats
    if (challengerWins) {
      // Challenger wins
      updateUser(challenger.id, {
        balance: challenger.balance + betAmount,
        gamesPlayed: challenger.gamesPlayed + 1,
        gamesWon: challenger.gamesWon + 1,
        lastOpponent: sender
      });
      
      // Opponent loses
      updateUser(sender, {
        balance: user.balance - betAmount,
        gamesPlayed: user.gamesPlayed + 1,
        lastOpponent: challenger.id
      });
      
      // Add XP
      addXP(challenger.id, config.xpPerWin + config.xpPerBet);
      addXP(sender, config.xpPerLoss + config.xpPerBet);
      
      // Notify challenger
      try {
        await sock.sendMessage(
          challenger.id,
          {
            text: `🎉 *CHALLENGE WON* 🎉\n\n` +
              `You won the challenge against ${sender.split('@')[0]}!\n\n` +
              `The coin landed on heads!\n\n` +
              `You won ${formatNumber(betAmount)} coins!\n` +
              `New balance: ${formatNumber(challenger.balance + betAmount)} coins`
          }
        );
      } catch (notifyError) {
        console.error('Error notifying challenger about win:', notifyError);
      }
      
      // Notify opponent
      await sendReply(sock, message, `❌ *CHALLENGE LOST* ❌\n\n` +
        `You lost the challenge against ${challenger.id.split('@')[0]}.\n\n` +
        `The coin landed on heads!\n\n` +
        `You lost ${formatNumber(betAmount)} coins.\n` +
        `New balance: ${formatNumber(user.balance - betAmount)} coins`);
    } else {
      // Opponent wins
      updateUser(sender, {
        balance: user.balance + betAmount,
        gamesPlayed: user.gamesPlayed + 1,
        gamesWon: user.gamesWon + 1,
        lastOpponent: challenger.id
      });
      
      // Challenger loses
      updateUser(challenger.id, {
        balance: challenger.balance - betAmount,
        gamesPlayed: challenger.gamesPlayed + 1,
        lastOpponent: sender
      });
      
      // Add XP
      addXP(sender, config.xpPerWin + config.xpPerBet);
      addXP(challenger.id, config.xpPerLoss + config.xpPerBet);
      
      // Notify challenger
      try {
        await sock.sendMessage(
          challenger.id,
          {
            text: `❌ *CHALLENGE LOST* ❌\n\n` +
              `You lost the challenge against ${sender.split('@')[0]}.\n\n` +
              `The coin landed on tails!\n\n` +
              `You lost ${formatNumber(betAmount)} coins.\n` +
              `New balance: ${formatNumber(challenger.balance - betAmount)} coins`
          }
        );
      } catch (notifyError) {
        console.error('Error notifying challenger about loss:', notifyError);
      }
      
      // Notify opponent
      await sendReply(sock, message, `🎉 *CHALLENGE WON* 🎉\n\n` +
        `You won the challenge against ${challenger.id.split('@')[0]}!\n\n` +
        `The coin landed on tails!\n\n` +
        `You won ${formatNumber(betAmount)} coins!\n` +
        `New balance: ${formatNumber(user.balance + betAmount)} coins`);
    }
  } catch (error) {
    console.error('Error handling accept command:', error);
    await sendReply(sock, message, "❌ An error occurred while accepting the challenge.");
  }
}

/**
 * Handles decline command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleDecline(sock, message, user, sender) {
  try {
    // Clean up expired challenges
    cleanupExpiredChallenges();
    
    // Check if there are any pending challenges
    const pendingChallenges = getPendingChallengesForUser(sender);
    
    if (pendingChallenges.length === 0) {
      await sendReply(sock, message, "❌ You don't have any pending challenges to decline.");
      return;
    }
    
    // Get the most recent challenge
    const challenge = pendingChallenges.sort((a, b) => b.createdAt - a.createdAt)[0];
    
    // Check if the challenge is still valid
    if (challenge.status !== 'pending') {
      await sendReply(sock, message, "❌ This challenge is no longer valid.");
      return;
    }
    
    // Mark challenge as declined
    updateChallenge(challenge.id, { status: 'declined' });
    
    // Notify challenger
    try {
      await sock.sendMessage(
        challenge.challenger,
        {
          text: `⚠️ *CHALLENGE DECLINED* ⚠️\n\n` +
            `${sender.split('@')[0]} has declined your challenge.`
        }
      );
    } catch (notifyError) {
      console.error('Error notifying challenger about decline:', notifyError);
    }
    
    // Notify opponent
    await sendReply(sock, message, `✅ You've declined the challenge from ${challenge.challenger.split('@')[0]}.`);
  } catch (error) {
    console.error('Error handling decline command:', error);
    await sendReply(sock, message, "❌ An error occurred while declining the challenge.");
  }
}

/**
 * Handles rematch command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleRematch(sock, message, user, sender) {
  try {
    // Clean up expired challenges
    cleanupExpiredChallenges();
    
    // Check if user has a last opponent
    if (!user.lastOpponent) {
      await sendReply(sock, message, "❌ You don't have a recent opponent to rematch.");
      return;
    }
    
    // Check for challenge cooldown
    const now = Date.now();
    const lastChallengeTime = user.lastChallengeTime || 0;
    const hourAgo = now - 3600000; // 1 hour in milliseconds
    
    if (lastChallengeTime > hourAgo) {
      const challengesThisHour = user.challengesMade || 0;
      
      if (challengesThisHour >= config.maxChallengesPerHour) {
        const resetTime = new Date(lastChallengeTime + 3600000);
        const minutesLeft = Math.ceil((resetTime - now) / 60000);
        
        await sendReply(sock, message, `❌ You've reached the limit of ${config.maxChallengesPerHour} challenges per hour.\n\nYou can challenge again in ${minutesLeft} minutes.`);
        return;
      }
    } else {
      // Reset challenges count if an hour has passed
      updateUser(user.id, {
        challengesMade: 0,
        lastChallengeTime: now
      });
    }
    
    // Get last opponent
    const opponent = user.lastOpponent;
    const opponentUser = getUser(opponent);
    
    // Check if opponent exists
    if (!opponentUser) {
      await sendReply(sock, message, "❌ Your last opponent is no longer available.");
      return;
    }
    
    // Determine a default bet amount (last bet or 100 coins)
    const betAmount = Math.min(
      Math.max(100, Math.floor(user.balance * 0.1)),
      user.balance,
      opponentUser.balance,
      config.maxBet
    );
    
    // Create the challenge
    const challenge = createChallenge(sender, opponent, betAmount);
    
    // Update challenger's data
    const challengesMade = (user.challengesMade || 0) + 1;
    updateUser(sender, {
      challengesMade,
      lastChallengeTime: now
    });
    
    // Notify the opponent
    try {
      await sock.sendMessage(
        opponent,
        {
          text: `⚔️ *REMATCH CHALLENGE* ⚔️\n\n` +
            `${sender.split('@')[0]} wants a rematch!\n\n` +
            `Bet Amount: ${formatNumber(betAmount)} coins\n\n` +
            `Type "${config.prefix}accept" to accept or "${config.prefix}decline" to decline.\n` +
            `You have ${config.challengeTimeout} seconds to respond.`
        }
      );
    } catch (notifyError) {
      console.error('Error notifying opponent about rematch challenge:', notifyError);
    }
    
    // Send confirmation to challenger
    await sendReply(sock, message, `⚔️ *REMATCH CHALLENGE SENT* ⚔️\n\n` +
      `You've challenged ${opponent.split('@')[0]} to a rematch for ${formatNumber(betAmount)} coins!\n\n` +
      `They have ${config.challengeTimeout} seconds to accept or decline the challenge.`);
  } catch (error) {
    console.error('Error handling rematch command:', error);
    await sendReply(sock, message, "❌ An error occurred while creating the rematch challenge.");
  }
}

module.exports = {
  handleChallenge,
  handleAccept,
  handleDecline,
  handleRematch
};
