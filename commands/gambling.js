const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser, updateGlobalStats, addJackpotEntry, getJackpotEntries } = require('../database/db');
const { formatNumber } = require('../utils/formatter');
const { addXP } = require('../commands/xp');
const { 
  coinToss, 
  rollDice, 
  playSlots, 
  spinWheel, 
  dealBlackjackHand, 
  hitBlackjack, 
  standBlackjack
} = require('../utils/games');

// Store active blackjack games
const activeBlackjackGames = {};

/**
 * Validate bet amount
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} amount - Bet amount
 * @param {Object} user - User data
 * @returns {Number|null} Validated bet amount or null if invalid
 */
async function validateBet(sock, message, amount, user) {
  // Check if amount is 'all'
  if (amount.toLowerCase() === 'all') {
    amount = user.balance;
  } else {
    // Convert to number
    amount = parseInt(amount);
  }
  
  // Validate amount
  if (isNaN(amount) || amount <= 0) {
    await sendReply(sock, message, "❌ Please enter a valid bet amount.");
    return null;
  }
  
  // Check if player has enough balance
  if (amount > user.balance) {
    await sendReply(sock, message, "❌ You don't have enough coins for this bet.");
    return null;
  }
  
  // Check minimum bet
  if (amount < config.minBet) {
    await sendReply(sock, message, `❌ Minimum bet is ${config.minBet} coins.`);
    return null;
  }
  
  // Check maximum bet
  if (amount > config.maxBet) {
    await sendReply(sock, message, `❌ Maximum bet is ${formatNumber(config.maxBet)} coins.`);
    return null;
  }
  
  return amount;
}

/**
 * Update user stats after a game
 * @param {String} userId - User ID
 * @param {Number} betAmount - Bet amount
 * @param {Number} winAmount - Win amount (0 if lost)
 * @param {Boolean} isWin - Whether the game was won
 */
function updateStats(userId, betAmount, winAmount, isWin) {
  const user = getUser(userId);
  
  // Update user stats
  const updates = {
    balance: user.balance - betAmount + winAmount,
    gamesPlayed: user.gamesPlayed + 1
  };
  
  if (isWin) {
    updates.gamesWon = user.gamesWon + 1;
    addXP(userId, config.xpPerWin);
  } else {
    addXP(userId, config.xpPerLoss);
  }
  
  // Add XP for betting
  addXP(userId, config.xpPerBet);
  
  // Update user
  updateUser(userId, updates);
  
  // Update global stats
  updateGlobalStats({
    totalBets: (updateGlobalStats().totalBets || 0) + 1,
    totalWagered: (updateGlobalStats().totalWagered || 0) + betAmount,
    totalWon: (updateGlobalStats().totalWon || 0) + (isWin ? winAmount : 0),
    totalLost: (updateGlobalStats().totalLost || 0) + (isWin ? 0 : betAmount)
  });
}

/**
 * Handles coin toss command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleCoinToss(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cointoss [amount] [heads/tails]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Validate choice
    const choice = args[1].toLowerCase();
    if (choice !== 'heads' && choice !== 'tails') {
      await sendReply(sock, message, "❌ Please choose either 'heads' or 'tails'.");
      return;
    }
    
    // Perform coin toss
    const result = coinToss();
    
    // Determine if player won
    const isWin = choice === result;
    const winAmount = isWin ? betAmount * 2 : 0;
    
    // Update stats
    updateStats(user.id, betAmount, winAmount, isWin);
    
    // Send result
    const resultEmoji = result === 'heads' ? '👑' : '🪙';
    if (isWin) {
      await sendReply(sock, message, `${resultEmoji} Coin landed on ${result}!\n\n🎉 You won ${formatNumber(betAmount)} coins!\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
    } else {
      await sendReply(sock, message, `${resultEmoji} Coin landed on ${result}!\n\n❌ You lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
    }
  } catch (error) {
    console.error('Error handling coin toss command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your coin toss.");
  }
}

/**
 * Handles dice command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleDice(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}dice [amount] [number 1-6]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Validate choice
    const choice = parseInt(args[1]);
    if (isNaN(choice) || choice < 1 || choice > 6) {
      await sendReply(sock, message, "❌ Please choose a number between 1 and 6.");
      return;
    }
    
    // Roll the dice
    const result = rollDice();
    
    // Determine if player won
    const isWin = choice === result;
    const winAmount = isWin ? betAmount * 5 : 0; // 5x payout for correct dice roll
    
    // Update stats
    updateStats(user.id, betAmount, winAmount, isWin);
    
    // Send result
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const resultEmoji = diceEmojis[result - 1];
    
    if (isWin) {
      await sendReply(sock, message, `${resultEmoji} Dice rolled: ${result}!\n\n🎉 You won ${formatNumber(betAmount * 4)} coins!\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
    } else {
      await sendReply(sock, message, `${resultEmoji} Dice rolled: ${result}!\n\n❌ You lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
    }
  } catch (error) {
    console.error('Error handling dice command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your dice roll.");
  }
}

/**
 * Handles high stakes command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleHighStakes(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}highstakes [amount] [heads/tails]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Ensure minimum bet of 100 for high stakes
    if (betAmount < 100) {
      await sendReply(sock, message, "❌ High stakes has a minimum bet of 100 coins.");
      return;
    }
    
    // Validate choice
    const choice = args[1].toLowerCase();
    if (choice !== 'heads' && choice !== 'tails') {
      await sendReply(sock, message, "❌ Please choose either 'heads' or 'tails'.");
      return;
    }
    
    // Begin suspense message
    await sendReply(sock, message, `🎲 *HIGH STAKES COIN TOSS* 🎲\nBet: ${formatNumber(betAmount)} coins\nChoice: ${choice}\n\nThe coin is flipping... 🪙`);
    
    // Perform coin toss after a short delay
    setTimeout(async () => {
      const result = coinToss();
      
      // Determine if player won
      const isWin = choice === result;
      const winAmount = isWin ? betAmount * 10 : 0; // 10x payout for high stakes
      
      // Update stats
      updateStats(user.id, betAmount, winAmount, isWin);
      
      // Send result
      const resultEmoji = result === 'heads' ? '👑' : '🪙';
      if (isWin) {
        await sendReply(sock, message, `${resultEmoji} *HIGH STAKES RESULT* ${resultEmoji}\n\nCoin landed on ${result}!\n\n🎉 *JACKPOT!* You won ${formatNumber(betAmount * 9)} coins!\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
      } else {
        await sendReply(sock, message, `${resultEmoji} *HIGH STAKES RESULT* ${resultEmoji}\n\nCoin landed on ${result}!\n\n❌ You lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
      }
    }, 2000);
  } catch (error) {
    console.error('Error handling high stakes command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your high stakes bet.");
  }
}

/**
 * Handles slots command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleSlots(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}slots [amount]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Send spinning message
    await sendReply(sock, message, `🎰 *SLOTS* 🎰\nBet: ${formatNumber(betAmount)} coins\n\nSpinning... 🎰`);
    
    // Play slots after a short delay
    setTimeout(async () => {
      const { display, multiplier, win } = playSlots();
      
      // Calculate winnings
      const winAmount = win ? betAmount * multiplier : 0;
      
      // Update stats
      updateStats(user.id, betAmount, winAmount, win);
      
      // Format the slot display
      const slotDisplay = `${display[0][0]}${display[0][1]}${display[0][2]}\n${display[1][0]}${display[1][1]}${display[1][2]} ⬅️\n${display[2][0]}${display[2][1]}${display[2][2]}`;
      
      // Send result
      if (win) {
        await sendReply(sock, message, `🎰 *SLOTS RESULT* 🎰\n\n${slotDisplay}\n\n🎉 You won ${formatNumber(winAmount - betAmount)} coins! (${multiplier}x)\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
      } else {
        await sendReply(sock, message, `🎰 *SLOTS RESULT* 🎰\n\n${slotDisplay}\n\n❌ You lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
      }
    }, 2000);
  } catch (error) {
    console.error('Error handling slots command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your slots game.");
  }
}

/**
 * Handles wheel spin command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleWheelSpin(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}wheelspin [amount]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Send spinning message
    await sendReply(sock, message, `🎡 *WHEEL OF FORTUNE* 🎡\nBet: ${formatNumber(betAmount)} coins\n\nSpinning the wheel...`);
    
    // Spin the wheel after a short delay
    setTimeout(async () => {
      const { multiplier, label } = spinWheel();
      
      // Calculate winnings
      const winAmount = betAmount * multiplier;
      const isWin = multiplier > 1;
      
      // Update stats
      updateStats(user.id, betAmount, winAmount, isWin);
      
      // Send result
      const resultText = `🎡 *WHEEL RESULT* 🎡\n\nYou landed on: ${label} (${multiplier}x)!\n\n`;
      
      if (multiplier === 0) {
        await sendReply(sock, message, `${resultText}❌ You lost all your bet!\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
      } else if (multiplier < 1) {
        const lostAmount = betAmount - winAmount;
        await sendReply(sock, message, `${resultText}⚠️ You lost ${formatNumber(lostAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
      } else if (multiplier === 1) {
        await sendReply(sock, message, `${resultText}🔄 You got your bet back!\n\nBalance remains: ${formatNumber(user.balance)} coins`);
      } else {
        const gainAmount = winAmount - betAmount;
        await sendReply(sock, message, `${resultText}🎉 You won ${formatNumber(gainAmount)} coins!\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
      }
    }, 2000);
  } catch (error) {
    console.error('Error handling wheel spin command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your wheel spin.");
  }
}

/**
 * Handles blackjack command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleBlackjack(sock, message, args, user) {
  try {
    const userId = user.id;
    
    // Check if user is already in a game
    if (activeBlackjackGames[userId]) {
      // Check if it's a hit or stand command
      if (args.length > 0 && (args[0].toLowerCase() === 'hit' || args[0].toLowerCase() === 'h')) {
        return await handleBlackjackHit(sock, message, user);
      } else if (args.length > 0 && (args[0].toLowerCase() === 'stand' || args[0].toLowerCase() === 's')) {
        return await handleBlackjackStand(sock, message, user);
      }
      
      // If not a valid blackjack command, show the current game
      await displayBlackjackHand(sock, message, userId);
      await sendReply(sock, message, "You're already in a blackjack game. Type '.blackjack hit' to hit or '.blackjack stand' to stand.");
      return;
    }
    
    // Check arguments for new game
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}blackjack [amount]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Start a new blackjack game
    const game = dealBlackjackHand();
    
    // Store the game in active games
    activeBlackjackGames[userId] = {
      playerHand: game.playerHand,
      dealerHand: game.dealerHand,
      betAmount
    };
    
    // Display initial hands
    await displayBlackjackHand(sock, message, userId, true);
    
    // Check for natural blackjack
    if (game.playerValue === 21) {
      // Player got a natural blackjack
      return await handleBlackjackStand(sock, message, user, true);
    }
  } catch (error) {
    console.error('Error handling blackjack command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your blackjack game.");
  }
}

/**
 * Handles blackjack hit command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 */
async function handleBlackjackHit(sock, message, user) {
  try {
    const userId = user.id;
    
    // Check if user is in a game
    if (!activeBlackjackGames[userId]) {
      await sendReply(sock, message, "❌ You're not in a blackjack game. Start one with '.blackjack [amount]'.");
      return;
    }
    
    // Get the current game
    const game = activeBlackjackGames[userId];
    
    // Hit the player's hand
    hitBlackjack(game.playerHand);
    
    // Calculate player's hand value
    const playerValue = calculateHandValue(game.playerHand);
    
    // Display updated hand
    await displayBlackjackHand(sock, message, userId);
    
    // Check if player busted
    if (playerValue > 21) {
      // Player busted
      const betAmount = game.betAmount;
      
      // Update stats
      updateStats(userId, betAmount, 0, false);
      
      // Send result
      await sendReply(sock, message, `❌ *BUST!* Your hand value is ${playerValue}, which is over 21.\n\nYou lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
      
      // End the game
      delete activeBlackjackGames[userId];
    }
  } catch (error) {
    console.error('Error handling blackjack hit command:', error);
    await sendReply(sock, message, "❌ An error occurred while hitting in blackjack.");
  }
}

/**
 * Handles blackjack stand command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Object} user - User data
 * @param {Boolean} natural - Whether player has a natural blackjack
 */
async function handleBlackjackStand(sock, message, user, natural = false) {
  try {
    const userId = user.id;
    
    // Check if user is in a game
    if (!activeBlackjackGames[userId]) {
      await sendReply(sock, message, "❌ You're not in a blackjack game. Start one with '.blackjack [amount]'.");
      return;
    }
    
    // Get the current game
    const game = activeBlackjackGames[userId];
    
    // The dealer plays out their hand (if player didn't get natural blackjack)
    if (!natural) {
      standBlackjack(game.dealerHand);
    }
    
    // Calculate final hand values
    const playerValue = calculateHandValue(game.playerHand);
    const dealerValue = calculateHandValue(game.dealerHand);
    
    // Determine the winner
    let result;
    let winAmount = 0;
    const betAmount = game.betAmount;
    
    if (natural && playerValue === 21 && game.playerHand.length === 2) {
      // Natural blackjack pays 3:2
      result = "🎉 *BLACKJACK!* You got a natural blackjack!";
      winAmount = betAmount * 2.5;
    } else if (playerValue > 21) {
      result = "❌ *BUST!* Your hand value is over 21.";
      winAmount = 0;
    } else if (dealerValue > 21) {
      result = "🎉 *DEALER BUST!* The dealer's hand value is over 21.";
      winAmount = betAmount * 2;
    } else if (playerValue > dealerValue) {
      result = "🎉 *YOU WIN!* Your hand value is higher than the dealer's.";
      winAmount = betAmount * 2;
    } else if (playerValue < dealerValue) {
      result = "❌ *DEALER WINS!* The dealer's hand value is higher than yours.";
      winAmount = 0;
    } else {
      result = "🔄 *PUSH!* It's a tie.";
      winAmount = betAmount; // Return the bet on a tie
    }
    
    // Update stats (only count as win if player got more than their bet back)
    const isWin = winAmount > betAmount;
    updateStats(userId, betAmount, winAmount, isWin);
    
    // Display final hands
    await displayBlackjackHand(sock, message, userId, false, true);
    
    // Send result
    if (winAmount > betAmount) {
      const profit = winAmount - betAmount;
      await sendReply(sock, message, `${result}\n\n🎉 You won ${formatNumber(profit)} coins!\n\nNew balance: ${formatNumber(user.balance - betAmount + winAmount)} coins`);
    } else if (winAmount === betAmount) {
      await sendReply(sock, message, `${result}\n\n🔄 Your bet has been returned.\n\nBalance remains: ${formatNumber(user.balance)} coins`);
    } else {
      await sendReply(sock, message, `${result}\n\n❌ You lost ${formatNumber(betAmount)} coins.\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
    }
    
    // End the game
    delete activeBlackjackGames[userId];
  } catch (error) {
    console.error('Error handling blackjack stand command:', error);
    await sendReply(sock, message, "❌ An error occurred while standing in blackjack.");
  }
}

/**
 * Displays blackjack hand
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} userId - User ID
 * @param {Boolean} initial - Whether this is the initial deal
 * @param {Boolean} final - Whether this is the final hand
 */
async function displayBlackjackHand(sock, message, userId, initial = false, final = false) {
  try {
    const game = activeBlackjackGames[userId];
    if (!game) return;
    
    const playerCards = game.playerHand.map(card => `${cardEmoji(card)} ${cardValue(card)}`).join(', ');
    const playerValue = calculateHandValue(game.playerHand);
    
    let dealerCards;
    let dealerValue;
    
    if (initial && !final) {
      // Only show one dealer card at the beginning
      dealerCards = `${cardEmoji(game.dealerHand[0])} ${cardValue(game.dealerHand[0])}, [?]`;
      dealerValue = "?";
    } else {
      // Show all dealer cards
      dealerCards = game.dealerHand.map(card => `${cardEmoji(card)} ${cardValue(card)}`).join(', ');
      dealerValue = calculateHandValue(game.dealerHand);
    }
    
    const displayText = `🃏 *BLACKJACK* 🃏\nBet: ${formatNumber(game.betAmount)} coins\n\n` +
      `*Dealer's Hand* (${dealerValue}):\n${dealerCards}\n\n` +
      `*Your Hand* (${playerValue}):\n${playerCards}\n\n` +
      (initial ? "Type '.blackjack hit' to take another card or '.blackjack stand' to stay." : "");
    
    await sendReply(sock, message, displayText);
  } catch (error) {
    console.error('Error displaying blackjack hand:', error);
  }
}

/**
 * Calculate blackjack hand value
 * @param {Array} hand - Array of cards
 * @returns {Number} Hand value
 */
function calculateHandValue(hand) {
  let value = 0;
  let aces = 0;
  
  for (const card of hand) {
    const cardVal = card.value;
    if (cardVal === 'A') {
      aces++;
      value += 11;
    } else if (cardVal === 'K' || cardVal === 'Q' || cardVal === 'J') {
      value += 10;
    } else {
      value += parseInt(cardVal);
    }
  }
  
  // Adjust for aces if needed
  while (value > 21 && aces > 0) {
    value -= 10; // Convert an ace from 11 to 1
    aces--;
  }
  
  return value;
}

/**
 * Get card emoji
 * @param {Object} card - Card object
 * @returns {String} Card emoji
 */
function cardEmoji(card) {
  const suits = {
    'hearts': '♥️',
    'diamonds': '♦️',
    'clubs': '♣️',
    'spades': '♠️'
  };
  
  return suits[card.suit];
}

/**
 * Get card value
 * @param {Object} card - Card object
 * @returns {String} Card value
 */
function cardValue(card) {
  return card.value;
}

/**
 * Handles jackpot command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 */
async function handleJackpot(sock, message, args, user) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}jackpot [amount]`);
      return;
    }
    
    // Validate bet
    const betAmount = await validateBet(sock, message, args[0], user);
    if (!betAmount) return;
    
    // Add entry to jackpot
    addJackpotEntry(user.id, betAmount);
    
    // Update user balance
    updateUser(user.id, {
      balance: user.balance - betAmount
    });
    
    // Get total entries for this user
    const entries = getJackpotEntries();
    const userEntries = entries.filter(entry => entry.userId === user.id);
    const userTickets = userEntries.reduce((total, entry) => total + entry.tickets, 0);
    const totalTickets = entries.reduce((total, entry) => total + entry.tickets, 0);
    const winChance = (userTickets / totalTickets) * 100;
    
    // Send confirmation
    await sendReply(sock, message, `🎯 *JACKPOT ENTRY CONFIRMED* 🎯\n\nYou've entered ${formatNumber(betAmount)} coins into the jackpot!\n\nTotal jackpot tickets: ${formatNumber(userTickets)}\nWin chance: ${winChance.toFixed(2)}%\n\nThe jackpot will be drawn in one hour or when it reaches 100,000 coins!\n\nNew balance: ${formatNumber(user.balance - betAmount)} coins`);
  } catch (error) {
    console.error('Error handling jackpot command:', error);
    await sendReply(sock, message, "❌ An error occurred while entering the jackpot.");
  }
}

/**
 * Handles jackpot status command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleJackpotStatus(sock, message) {
  try {
    // Get jackpot entries
    const entries = getJackpotEntries();
    const totalAmount = entries.reduce((total, entry) => total + entry.amount, 0);
    const totalEntries = entries.length;
    const uniqueUsers = new Set(entries.map(entry => entry.userId)).size;
    
    // Calculate time until next draw
    let timeUntilDraw = "less than an hour";
    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      const hourFromLastEntry = new Date(lastEntry.enteredAt + 3600000); // 1 hour in ms
      const now = new Date();
      const diff = hourFromLastEntry - now;
      
      if (diff > 0) {
        const minutes = Math.floor(diff / 60000);
        timeUntilDraw = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        timeUntilDraw = "draw imminent";
      }
    }
    
    // Format response
    const statusText = `🎯 *JACKPOT STATUS* 🎯\n\n` +
      `Current Jackpot: ${formatNumber(totalAmount)} coins\n` +
      `Total Entries: ${totalEntries}\n` +
      `Participants: ${uniqueUsers}\n` +
      `Next Draw: ${timeUntilDraw}\n\n` +
      `Enter the jackpot with "${config.prefix}jackpot [amount]" to have a chance to win it all!`;
    
    await sendReply(sock, message, statusText);
  } catch (error) {
    console.error('Error handling jackpot status command:', error);
    await sendReply(sock, message, "❌ An error occurred while checking jackpot status.");
  }
}

module.exports = {
  handleCoinToss,
  handleDice,
  handleHighStakes,
  handleSlots,
  handleBlackjack,
  handleWheelSpin,
  handleJackpot,
  handleJackpotStatus,
  validateBet,
  updateStats
};
