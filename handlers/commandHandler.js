const config = require('../config');
const { sendReply } = require('../utils/messageUtils');
const { checkUserRegistered } = require('../utils/registrationUtils');

// Import command handlers
const helpCommands = require('../commands/help');
const generalCommands = require('../commands/general');
const gamblingCommands = require('../commands/gambling');
const bankingCommands = require('../commands/banking');
const companyCommands = require('../commands/company');
const leaderboardCommands = require('../commands/leaderboard');
const xpCommands = require('../commands/xp');
const pvpCommands = require('../commands/pvp');
const marketCommands = require('../commands/market');
const registerCommands = require('../commands/register');

/**
 * Handles command processing
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {String} commandText - Command text without prefix
 * @param {String} sender - Sender ID
 * @param {Object} user - User data
 */
async function handleCommand(sock, message, commandText, sender, user) {
  try {
    // Split command into parts (command and arguments)
    const [command, ...args] = commandText.split(' ');
    
    // Commands that don't require registration
    const noRegistrationCommands = ['help', 'ping', 'register', 'maingc'];
    
    // Process the command based on category
    switch (command.toLowerCase()) {
      // Registration command
      case 'register':
        await registerCommands.handleRegister(sock, message, args, user, sender);
        break;
        
      // Help commands
      case 'help':
        await helpCommands.handleHelp(sock, message, args, sender);
        break;
      
      // General commands
      case 'ping':
        await generalCommands.handlePing(sock, message);
        break;
      case 'balance':
      case 'bal':
        // Check registration for commands that require it
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await generalCommands.handleBalance(sock, message, user);
        break;
      case 'profile':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await generalCommands.handleProfile(sock, message, user);
        break;
      case 'maingc':
        await generalCommands.handleMainGC(sock, message, sender);
        break;
        
      // Gambling commands
      case 'cointoss':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleCoinToss(sock, message, args, user);
        break;
      case 'dice':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleDice(sock, message, args, user);
        break;
      case 'highstakes':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleHighStakes(sock, message, args, user);
        break;
      case 'slots':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleSlots(sock, message, args, user);
        break;
      case 'blackjack':
      case 'bj':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleBlackjack(sock, message, args, user);
        break;
      case 'wheelspin':
      case 'wheel':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleWheelSpin(sock, message, args, user);
        break;
      case 'jackpot':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await gamblingCommands.handleJackpot(sock, message, args, user);
        break;
      case 'jackpotstatus':
        // This can be viewed without registration
        await gamblingCommands.handleJackpotStatus(sock, message);
        break;
        
      // Banking commands
      case 'dep':
      case 'deposit':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await bankingCommands.handleDeposit(sock, message, args, user);
        break;
      case 'with':
      case 'withdraw':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await bankingCommands.handleWithdraw(sock, message, args, user);
        break;
      case 'int':
      case 'interest':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await bankingCommands.handleInterest(sock, message, user);
        break;
      case 'bank-upgrade':
      case 'upgradebank':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await bankingCommands.handleBankUpgrade(sock, message, user);
        break;
      case 'bank':
      case 'bank-info':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await bankingCommands.handleBankInfo(sock, message, user);
        break;
        
      // Company commands
      case 'cc':
      case 'createcompany':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCreateCompany(sock, message, args, user, sender);
        break;
      case 'cinfo':
        // Company info can be viewed without registration
        await companyCommands.handleCompanyInfo(sock, message, args);
        break;
      case 'ci':
      case 'companyinvest':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyInvest(sock, message, args, user, sender);
        break;
      case 'cw':
      case 'companywithdraw':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyWithdraw(sock, message, args, user, sender);
        break;
      case 'ctop':
        // Company top can be viewed without registration
        await companyCommands.handleCompanyTop(sock, message);
        break;
      case 'crq':
      case 'companyrequest':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyRequest(sock, message, args, sender);
        break;
      case 'crn':
      case 'companyrename':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyRename(sock, message, args, sender);
        break;
      case 'cclose':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyClose(sock, message, args, sender);
        break;
      case 'ckick':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await companyCommands.handleCompanyKick(sock, message, args, sender);
        break;
        
      // Leaderboard commands (can be viewed without registration)
      case 'toprich':
        await leaderboardCommands.handleTopRich(sock, message);
        break;
      case 'topwins':
        await leaderboardCommands.handleTopWins(sock, message);
        break;
      case 'topstreak':
        await leaderboardCommands.handleTopStreak(sock, message);
        break;
      case 'toplevels':
        await leaderboardCommands.handleTopLevels(sock, message);
        break;
      case 'topprestige':
        await leaderboardCommands.handleTopPrestige(sock, message);
        break;
      case 'topcompanies':
        await leaderboardCommands.handleTopCompanies(sock, message);
        break;
        
      // XP and levels commands
      case 'xp':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await xpCommands.handleXP(sock, message, user);
        break;
      case 'level':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await xpCommands.handleLevel(sock, message, user);
        break;
      case 'prestige':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await xpCommands.handlePrestige(sock, message, user);
        break;
        
      // PvP commands
      case 'challenge':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await pvpCommands.handleChallenge(sock, message, args, user, sender);
        break;
      case 'accept':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await pvpCommands.handleAccept(sock, message, user, sender);
        break;
      case 'decline':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await pvpCommands.handleDecline(sock, message, user, sender);
        break;
      case 'rematch':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await pvpCommands.handleRematch(sock, message, user, sender);
        break;
      
      // Market commands
      case 'market':
        // Market listing can be viewed without registration
        await marketCommands.handleMarket(sock, message, args);
        break;
      case 'buyshares':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await marketCommands.handleBuyShares(sock, message, args, user, sender);
        break;
      case 'sellshares':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await marketCommands.handleSellShares(sock, message, args, user, sender);
        break;
      case 'cancelorder':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await marketCommands.handleCancelOrder(sock, message, args, sender);
        break;
      case 'transfer':
        if (!noRegistrationCommands.includes(command.toLowerCase())) {
          const isRegistered = await checkUserRegistered(sock, message, sender);
          if (!isRegistered) return;
        }
        await marketCommands.handleTransfer(sock, message, args, user, sender);
        break;
      
      // Unknown command
      default:
        await sendReply(sock, message, `❌ Unknown command. Type "${config.prefix}help" to see available commands.`);
        break;
    }
  } catch (error) {
    console.error('Error handling command:', error);
    await sendReply(sock, message, "❌ An error occurred while processing your command.");
  }
}

module.exports = { handleCommand };
