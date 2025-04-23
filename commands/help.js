const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getCategoryImage } = require('../utils/imageUtils');
const fs = require('fs');
const path = require('path');

// Debug helper
function debug(...args) {
  console.log('[HELP_DEBUG]', ...args);
}

/**
 * Handles help command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleHelp(sock, message, args, sender) {
  try {
    debug('Help command received from', sender);
    debug('Args:', args);
    debug('Message:', JSON.stringify(message.key));
    
    // Special case for adding a temporary owner for testing purposes
    if (args.length > 0 && args[0].toLowerCase() === 'addowner') {
      debug('Special command: addowner detected');
      // Only run this in the main Vryzen group for security
      if (message.key.remoteJid === config.mainGroupID) {
        // Add the sender as a temporary owner
        if (!config.owners.includes(sender)) {
          config.owners.push(sender);
          console.log(`Added ${sender} as temporary owner`);
          await sendReply(sock, message, `✅ Successfully added you as a temporary owner for testing purposes.`);
        } else {
          await sendReply(sock, message, `✅ You are already registered as an owner.`);
        }
        return;
      }
    }
    
    // Standard help behavior
    if (args.length === 0) {
      debug('Showing main help menu');
      await sendMainHelp(sock, message);
    } else {
      // Show specific help category
      debug('Showing help for category:', args[0].toLowerCase());
      await sendCategoryHelp(sock, message, args[0].toLowerCase());
    }
  } catch (error) {
    console.error('Error handling help command:', error);
    debug('Error in handleHelp:', error.message, error.stack);
    await sendReply(sock, message, "❌ An error occurred while showing help.");
  }
}

/**
 * Sends the main help menu
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function sendMainHelp(sock, message) {
  debug('Starting sendMainHelp function');
  // Create a composite image of all the category icons for the main help menu
  // For now, just use a generic help image
  try {
    const imagePath = path.join(__dirname, '../assets/images/help.svg');
    debug('Reading help image from:', imagePath);
    const mainHelpImage = fs.readFileSync(imagePath);
    debug('Successfully read help image, size:', mainHelpImage.length);
    
    const helpText = `🎮 *VRYZEN BOT COMMANDS* 🎮

*CATEGORIES:*
• *Gambling* - Games of chance and jackpot
   ${config.prefix}help gambling

• *PvP* - Challenge other players
   ${config.prefix}help pvp

• *Daily* - Daily rewards and streaks
   ${config.prefix}help daily

• *Company* - Create and manage companies
   ${config.prefix}help company

• *Leaderboards* - View top players
   ${config.prefix}help leaderboard

• *XP & Levels* - Level up and prestige
   ${config.prefix}help xp

• *Shop* - Buy items and upgrades
   ${config.prefix}help shop

• *Bank* - Store and earn interest
   ${config.prefix}help bank

• *Market* - Buy and sell shares
   ${config.prefix}help market

• *Groups* - Information about using the bot in groups
   ${config.prefix}help groups

• *Registration* - How to register with a username
   ${config.prefix}help register

Type "${config.prefix}help [category]" for detailed commands.

*Basic Commands:*
   ${config.prefix}register [username] - Register with a unique username (required to use most commands)
   ${config.prefix}ping - Check if bot is online
   ${config.prefix}balance - Check your balance
   ${config.prefix}profile - View your profile
   ${config.prefix}maingc - Join our official group`;

    try {
      debug('Sending help message with image');
      await sendReply(sock, message, helpText, mainHelpImage);
      debug('Help message with image sent successfully');
    } catch (error) {
      console.error('Error sending main help with image:', error);
      debug('Error details:', error.message, error.stack);
      // Fallback to text-only if image fails
      debug('Attempting to send text-only help message');
      await sendReply(sock, message, helpText);
      debug('Text-only help message sent');
    }
  } catch (error) {
    console.error('Error in sendMainHelp function:', error);
    debug('Error in sendMainHelp:', error.message, error.stack);
    // Fallback to simple text without image
    try {
      await sendReply(sock, message, "📱 *VRYZEN BOT* 📱\n\nAn error occurred while loading the help menu. Please try again later or contact the bot owner.");
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
}

/**
 * Sends help for a specific category
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} category - Help category
 */
async function sendCategoryHelp(sock, message, category) {
  debug('Starting sendCategoryHelp for category:', category);
  let helpText = '';
  
  try {
    // Get the appropriate image for this category
    debug('Getting image for category:', category);
    const categoryImage = getCategoryImage(category);
    debug('Got category image');

    switch (category) {
      case 'gambling':
        helpText = `🎲 *GAMBLING HELP* 🎲

• ${config.prefix}cointoss [amount] [heads/tails] - Bet on coin toss
  Example: ${config.prefix}cointoss 100 heads

• ${config.prefix}dice [amount] [number] - Bet on dice roll (1-6)
  Example: ${config.prefix}dice 200 4

• ${config.prefix}highstakes [amount] [heads/tails] - High-stakes coin toss with 10x multiplier
  Example: ${config.prefix}highstakes 1000 tails

• ${config.prefix}slots [amount] - Play slot machine
  Example: ${config.prefix}slots 500

• ${config.prefix}blackjack [amount] - Play blackjack
  Example: ${config.prefix}blackjack 250

• ${config.prefix}wheelSpin [amount] - Spin the wheel of fortune
  Example: ${config.prefix}wheelSpin 300

• *Jackpot Commands:*
  ${config.prefix}jackpot [amount] - Enter the hourly jackpot
  ${config.prefix}jackpotStatus - Check current jackpot status

Min bet: ${config.minBet} coins
Max bet: ${config.maxBet} coins`;
        break;

      case 'bank':
      case 'banking':
        helpText = `🏦 *BANKING HELP* 🏦

• ${config.prefix}dep [amount/all] or ${config.prefix}deposit [amount/all] - Add coins to your bank
  Example: ${config.prefix}dep 5000 or ${config.prefix}deposit all

• ${config.prefix}with [amount/all] or ${config.prefix}withdraw [amount/all] - Take coins from your bank
  Example: ${config.prefix}with 2000 or ${config.prefix}withdraw all

• ${config.prefix}int or ${config.prefix}interest - Claim daily interest on your bank balance
  Interest rate: ${config.baseBankInterestRate * 100}% base + prestige bonus

• ${config.prefix}bank-upgrade or ${config.prefix}upgradebank - Increase your bank capacity
  Capacity increases by ${config.bankCapacityIncreasePercent * 100}%, cost is ${config.bankUpgradeCostPercent * 100}% of current capacity

• ${config.prefix}bank or ${config.prefix}bank-info - View your bank details
  Shows balance, capacity, interest rate and upgrade costs

*Benefits of using the bank:*
• Earn daily interest on your savings
• Keep coins safe from certain losses
• Upgrade your capacity to store more coins

Tip: Higher prestige levels increase your interest rate!`;
        break;

      case 'leaderboard':
      case 'leaderboards':
        helpText = `🏆 *LEADERBOARDS HELP* 🏆

• ${config.prefix}topRich - View richest players

• ${config.prefix}topWins - Players with most wins

• ${config.prefix}topStreak - Highest daily streaks

• ${config.prefix}topLevels - Highest level players

• ${config.prefix}topPrestige - Highest prestige players

• ${config.prefix}topCompanies - Most valuable companies

Leaderboards update in real-time and show the top 10 in each category`;
        break;

      case 'company':
      case 'companies':
        helpText = `🏢 *COMPANY HELP* 🏢

• ${config.prefix}cc [amount] [name] - Create a company
  Example: ${config.prefix}cc 6000 TechCorp
  A random sector will be assigned
  Min investment: ${config.minCompanyInvestment} coins

• ${config.prefix}cinfo [name] - View company details
  Example: ${config.prefix}cinfo TechCorp

• ${config.prefix}ci [name] [amount] - Invest in a company
  Example: ${config.prefix}ci TechCorp 5000

• ${config.prefix}cw [name] [amount] - Withdraw investment
  Example: ${config.prefix}cw TechCorp 2000
  Withdrawal fee: ${config.companyWithdrawalFee * 100}%

• ${config.prefix}ctop - View top companies

• ${config.prefix}crq [name] - Request to invest in a company
  Example: ${config.prefix}crq TechCorp

• *Management Commands (owner only):*
  ${config.prefix}crn [oldName] [newName] - Rename company
  ${config.prefix}cclose [name] - Close your company
  ${config.prefix}ckick [name] @user - Remove an investor`;
        break;

      case 'xp':
      case 'levels':
        helpText = `⭐ *XP & LEVELS HELP* ⭐

• ${config.prefix}xp - View your current XP

• ${config.prefix}level - Check your level and progress

• ${config.prefix}prestige - Prestige when you reach level ${config.prestigeLevel}
  Resets your level but gives bonus rewards

*How to earn XP:*
• Betting: +${config.xpPerBet} XP per bet
• Winning: +${config.xpPerWin} XP per win
• Losing: +${config.xpPerLoss} XP per loss

Level formula: level = sqrt(xp/100) + 1

Each prestige level gives +${config.prestigeRewardBonus * 100}% daily reward bonus!`;
        break;

      case 'pvp':
      case 'challenge':
        helpText = `⚔️ *PVP CHALLENGE HELP* ⚔️

• ${config.prefix}challenge @user [amount] - Challenge another user
  Example: ${config.prefix}challenge @John 1000

• ${config.prefix}accept - Accept a pending challenge

• ${config.prefix}decline - Decline a pending challenge

• ${config.prefix}rematch - Request a rematch with last opponent

*PvP Limits:*
- Max ${config.maxChallengesPerHour} challenges per hour
- Timeout: ${config.challengeTimeout} seconds to accept/decline
- Refund: ${config.challengeRefundMin * 100}%-${config.challengeRefundMax * 100}% if opponent doesn't respond`;
        break;

      case 'market':
        helpText = `🛒 *MARKET HELP* 🛒

• ${config.prefix}market – View all active sell orders
• ${config.prefix}market [Company] – View sell orders for that company
• ${config.prefix}buyshares [OrderID] [qty] – Buy shares from an order
• ${config.prefix}sellshares [Company] [qty] [price] – Post shares for sale
• ${config.prefix}cancelorder [OrderID] – Cancel your sell order
• ${config.prefix}transfer [Company] [@user] [qty] – Transfer shares directly

*Market fees:* ${config.marketFee * 100}% transaction fee on all trades`;
        break;

      case 'daily':
        helpText = `📅 *DAILY REWARDS HELP* 📅

• ${config.prefix}daily - Claim your daily reward
  Base reward: ${config.baseReward} coins

• *Streak Bonus:*
  Each consecutive day adds ${config.streakBonus * 100}% to your reward
  Example: 5-day streak = ${config.baseReward} + ${config.baseReward * config.streakBonus * 5} coins

• *Prestige Bonus:*
  Each prestige level adds ${config.prestigeRewardBonus * 100}% to your reward
  Example: Prestige 3 = ${config.baseReward * (1 + (3 * config.prestigeRewardBonus))} coins base reward

• ${config.prefix}streak - Check your current daily streak

*Tips:*
• Claim your reward every 24 hours to maintain your streak
• Missing a day resets your streak to 0
• Higher prestige levels significantly increase your daily rewards`;
        break;

      case 'shop':
        helpText = `🛍️ *SHOP HELP* 🛍️

• ${config.prefix}shop - Browse available items and boosts

• ${config.prefix}buy [item] [quantity] - Purchase an item
  Example: ${config.prefix}buy luckycharm 1

• ${config.prefix}inventory - View your purchased items

• ${config.prefix}use [item] - Activate a boost or item
  Example: ${config.prefix}use luckycharm

*Available Items:*
• Lucky Charm (5,000 coins) - +10% gambling wins for 24 hours
• XP Booster (10,000 coins) - Double XP for 24 hours
• Bank Boost (15,000 coins) - +0.5% interest rate for 7 days
• Jackpot Ticket (25,000 coins) - 2x entries in jackpot for 24 hours
• Company Analyst (50,000 coins) - Reduces company investment fees by 50% for 3 days`;
        break;
        
      case 'register':
      case 'registration':
        helpText = `📝 *REGISTRATION HELP* 📝

*Registration Command:*
• ${config.prefix}register [username] - Register with a unique username
  Example: ${config.prefix}register johndoe

*Username Requirements:*
• 3-15 characters long
• Letters, numbers, and underscores only
• No spaces or special characters
• Must be unique (not taken by another user)

*Why Register?*
Registration is required to:
• Use gambling and economy commands
• Participate in challenges
• Create or invest in companies
• Transfer coins and shares to other users
• Access most bot features

*Important Notes:*
• You can only register once
• Your username cannot be changed after registration
• Your username will be displayed in leaderboards and transactions

After registering, you'll have full access to all bot features.`;
        break;
        
      case 'groups':
      case 'group':
        helpText = `👥 *GROUP USAGE HELP* 👥

*Using the Bot in Different Groups:*
This bot can work in any group where it is an admin, not just in the Vryzen group.

*How to Set Up in a New Group:*
1. Add the bot to your group
2. Make the bot an admin in your group
3. The bot will automatically approve your group for usage

*If the Bot Isn't Working:*
• Check if the bot is an admin - this is required for functionality
• If you use a command and the bot asks for admin privileges, you need to make it an admin first
• Once made admin, the bot will automatically approve your group

*Why Admin Privileges?*
Admin privileges allow the bot to:
• Monitor group activity to prevent abuse
• Send messages without restrictions
• Provide full functionality to all group members

*Official Vryzen Group:*
• Use ${config.prefix}maingc to get an invite to the official Vryzen group
• The official group always has full bot functionality

Questions or issues? Contact the bot owners.`;
        break;

      default:
        helpText = `❌ Unknown help category: "${category}"\n\nTry ${config.prefix}help to see all available categories.`;
        break;
    }

    debug('Sending help for category:', category);
    try {
      await sendReply(sock, message, helpText, categoryImage);
      debug('Successfully sent help for category:', category);
    } catch (error) {
      console.error('Error sending category help with image:', error);
      debug('Error details:', error.message, error.stack);
      // Fallback to text-only if image fails
      try {
        debug('Attempting to send text-only category help');
        await sendReply(sock, message, helpText);
        debug('Text-only category help sent');
      } catch (fallbackError) {
        console.error('Error sending fallback text-only help:', fallbackError);
        debug('Fallback error details:', fallbackError.message, fallbackError.stack);
      }
    }
  } catch (error) {
    console.error('Error in sendCategoryHelp:', error);
    debug('Error in sendCategoryHelp:', error.message, error.stack);
    // Send simple error message
    try {
      await sendReply(sock, message, `❌ Error showing help for "${category}". Try ${config.prefix}help for the main menu.`);
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
}

module.exports = { handleHelp };