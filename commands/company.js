const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser, getCompany, getAllCompanies, createCompany, updateCompany } = require('../database/db');
const { formatNumber } = require('../utils/formatter');

/**
 * Handles create company command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleCreateCompany(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cc [amount] [name]`);
      return;
    }
    
    // Validate amount
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid investment amount.");
      return;
    }
    
    // Check if investment meets minimum
    if (amount < config.minCompanyInvestment) {
      await sendReply(sock, message, `❌ Minimum investment to create a company is ${formatNumber(config.minCompanyInvestment)} coins.`);
      return;
    }
    
    // Check if player has enough balance
    if (amount > user.balance) {
      await sendReply(sock, message, "❌ You don't have enough coins for this investment.");
      return;
    }
    
    // Get company name
    const companyName = args.slice(1).join(' ');
    
    // Check if name is valid
    if (companyName.length < 3 || companyName.length > 20) {
      await sendReply(sock, message, "❌ Company name must be between 3 and 20 characters.");
      return;
    }
    
    // Check if company already exists
    if (getCompany(companyName)) {
      await sendReply(sock, message, `❌ A company with the name "${companyName}" already exists.`);
      return;
    }
    
    // Create company
    const company = createCompany(companyName, sender, amount);
    
    // Update user balance and investments
    const investedCompanies = { ...user.investedCompanies };
    investedCompanies[companyName] = amount;
    
    const shares = { ...user.shares };
    shares[companyName] = 100; // Owner gets 100% shares initially
    
    updateUser(user.id, {
      balance: user.balance - amount,
      investedCompanies,
      shares
    });
    
    // Send confirmation
    await sendReply(sock, message, `🏢 *COMPANY CREATED* 🏢\n\n` +
      `Name: ${companyName}\n` +
      `Sector: ${company.sector}\n` +
      `Initial Investment: ${formatNumber(amount)} coins\n` +
      `Shares: 100% (100 shares)\n\n` +
      `Your company has been successfully created! You can now manage it with company commands.\n\n` +
      `New balance: ${formatNumber(user.balance - amount)} coins`);
  } catch (error) {
    console.error('Error handling create company command:', error);
    await sendReply(sock, message, "❌ An error occurred while creating a company.");
  }
}

/**
 * Handles company info command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 */
async function handleCompanyInfo(sock, message, args) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cinfo [company name]`);
      return;
    }
    
    // Get company name
    const companyName = args.join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Format company creation date
    const creationDate = new Date(company.createdAt).toLocaleDateString();
    
    // Format top investors
    const investors = Object.entries(company.investors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    let investorsText = '';
    for (const [investorId, investment] of investors) {
      const investorPercentage = ((investment / company.value) * 100).toFixed(1);
      investorsText += `- ${investorId.split('@')[0]}: ${formatNumber(investment)} coins (${investorPercentage}%)\n`;
    }
    
    if (investorsText === '') {
      investorsText = 'No investors yet';
    }
    
    // Send company info
    await sendReply(sock, message, `🏢 *COMPANY INFORMATION* 🏢\n\n` +
      `Name: ${company.name}\n` +
      `Sector: ${company.sector}\n` +
      `Value: ${formatNumber(company.value)} coins\n` +
      `Owner: ${company.owner.split('@')[0]}\n` +
      `Created: ${creationDate}\n` +
      `Total Shares: ${company.totalShares}\n\n` +
      `*Top Investors:*\n${investorsText}\n\n` +
      `Use "${config.prefix}ci ${companyName} [amount]" to invest in this company.`);
  } catch (error) {
    console.error('Error handling company info command:', error);
    await sendReply(sock, message, "❌ An error occurred while displaying company information.");
  }
}

/**
 * Handles company invest command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleCompanyInvest(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}ci [company name] [amount]`);
      return;
    }
    
    // Get amount (last argument)
    const amount = parseInt(args[args.length - 1]);
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid investment amount.");
      return;
    }
    
    // Get company name (all arguments except the last one)
    const companyName = args.slice(0, -1).join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if player has enough balance
    if (amount > user.balance) {
      await sendReply(sock, message, "❌ You don't have enough coins for this investment.");
      return;
    }
    
    // Check minimum investment
    if (amount < 1000) {
      await sendReply(sock, message, "❌ Minimum investment is 1,000 coins.");
      return;
    }
    
    // Update company
    const currentInvestment = company.investors[sender] || 0;
    const newInvestment = currentInvestment + amount;
    
    const investors = { ...company.investors };
    investors[sender] = newInvestment;
    
    const newCompanyValue = company.value + amount;
    
    // Calculate shares to give
    const sharesToGive = Math.floor((amount / newCompanyValue) * company.totalShares);
    
    // Update share distribution
    const shareDistribution = { ...company.shareDistribution };
    shareDistribution[sender] = (shareDistribution[sender] || 0) + sharesToGive;
    
    // Update company
    updateCompany(companyName, {
      value: newCompanyValue,
      investors,
      shareDistribution
    });
    
    // Update user balance and investments
    const investedCompanies = { ...user.investedCompanies };
    investedCompanies[companyName] = newInvestment;
    
    const shares = { ...user.shares };
    shares[companyName] = (shares[companyName] || 0) + sharesToGive;
    
    updateUser(user.id, {
      balance: user.balance - amount,
      investedCompanies,
      shares
    });
    
    // Calculate ownership percentage
    const ownershipPercentage = (newInvestment / newCompanyValue) * 100;
    
    // Send confirmation
    await sendReply(sock, message, `💼 *INVESTMENT SUCCESSFUL* 💼\n\n` +
      `Company: ${companyName}\n` +
      `Investment: ${formatNumber(amount)} coins\n` +
      `Shares Acquired: ${sharesToGive}\n` +
      `Your Total Investment: ${formatNumber(newInvestment)} coins\n` +
      `Ownership: ${ownershipPercentage.toFixed(2)}%\n\n` +
      `New Company Value: ${formatNumber(newCompanyValue)} coins\n` +
      `Your Wallet Balance: ${formatNumber(user.balance - amount)} coins`);
  } catch (error) {
    console.error('Error handling company invest command:', error);
    await sendReply(sock, message, "❌ An error occurred while investing in the company.");
  }
}

/**
 * Handles company withdraw command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleCompanyWithdraw(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cw [company name] [amount]`);
      return;
    }
    
    // Get amount (last argument)
    let amount = args[args.length - 1];
    
    // Get company name (all arguments except the last one)
    const companyName = args.slice(0, -1).join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if user has invested in the company
    if (!company.investors[sender]) {
      await sendReply(sock, message, "❌ You don't have any investment in this company.");
      return;
    }
    
    // Check if amount is 'all'
    if (amount.toLowerCase() === 'all') {
      amount = company.investors[sender];
    } else {
      // Convert to number
      amount = parseInt(amount);
    }
    
    // Validate amount
    if (isNaN(amount) || amount <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid withdrawal amount.");
      return;
    }
    
    // Check if user has enough invested
    if (amount > company.investors[sender]) {
      await sendReply(sock, message, `❌ You only have ${formatNumber(company.investors[sender])} coins invested in this company.`);
      return;
    }
    
    // Calculate withdrawal fee
    const withdrawalFee = Math.floor(amount * config.companyWithdrawalFee);
    const withdrawalAmount = amount - withdrawalFee;
    
    // Calculate shares to remove
    const sharesToRemove = Math.floor((amount / company.value) * company.totalShares);
    
    // Check if owner is trying to withdraw everything
    if (sender === company.owner && amount === company.investors[sender]) {
      await sendReply(sock, message, `❌ As the owner, you cannot withdraw all your investment. Use "${config.prefix}cclose ${companyName}" to close the company instead.`);
      return;
    }
    
    // Update company
    const currentInvestment = company.investors[sender];
    const newInvestment = currentInvestment - amount;
    
    const investors = { ...company.investors };
    if (newInvestment <= 0) {
      delete investors[sender];
    } else {
      investors[sender] = newInvestment;
    }
    
    const newCompanyValue = company.value - amount;
    
    // Update share distribution
    const shareDistribution = { ...company.shareDistribution };
    shareDistribution[sender] = Math.max(0, (shareDistribution[sender] || 0) - sharesToRemove);
    
    // Update company
    updateCompany(companyName, {
      value: newCompanyValue,
      investors,
      shareDistribution
    });
    
    // Update user balance and investments
    const investedCompanies = { ...user.investedCompanies };
    if (newInvestment <= 0) {
      delete investedCompanies[companyName];
    } else {
      investedCompanies[companyName] = newInvestment;
    }
    
    const shares = { ...user.shares };
    if (shareDistribution[sender] <= 0) {
      delete shares[companyName];
    } else {
      shares[companyName] = shareDistribution[sender];
    }
    
    updateUser(user.id, {
      balance: user.balance + withdrawalAmount,
      investedCompanies,
      shares
    });
    
    // Send confirmation
    await sendReply(sock, message, `💸 *WITHDRAWAL SUCCESSFUL* 💸\n\n` +
      `Company: ${companyName}\n` +
      `Withdrawn: ${formatNumber(amount)} coins\n` +
      `Fee (${config.companyWithdrawalFee * 100}%): ${formatNumber(withdrawalFee)} coins\n` +
      `Net Amount: ${formatNumber(withdrawalAmount)} coins\n` +
      `Shares Lost: ${sharesToRemove}\n\n` +
      `Your Remaining Investment: ${formatNumber(newInvestment)} coins\n` +
      `New Company Value: ${formatNumber(newCompanyValue)} coins\n` +
      `Your New Balance: ${formatNumber(user.balance + withdrawalAmount)} coins`);
  } catch (error) {
    console.error('Error handling company withdraw command:', error);
    await sendReply(sock, message, "❌ An error occurred while withdrawing from the company.");
  }
}

/**
 * Handles company top command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 */
async function handleCompanyTop(sock, message) {
  try {
    // Get all companies
    const companies = getAllCompanies();
    
    // Sort companies by value
    const sortedCompanies = companies.sort((a, b) => b.value - a.value).slice(0, 10);
    
    if (sortedCompanies.length === 0) {
      await sendReply(sock, message, "No companies found. Be the first to create one!");
      return;
    }
    
    // Format top companies
    let topCompaniesText = '';
    for (let i = 0; i < sortedCompanies.length; i++) {
      const company = sortedCompanies[i];
      topCompaniesText += `${i + 1}. ${company.name} (${company.sector}) - ${formatNumber(company.value)} coins\n   Owner: ${company.owner.split('@')[0]}\n`;
    }
    
    // Send top companies
    await sendReply(sock, message, `🏆 *TOP COMPANIES* 🏆\n\n${topCompaniesText}\n\nCreate your own company with "${config.prefix}cc [amount] [name]"!`);
  } catch (error) {
    console.error('Error handling company top command:', error);
    await sendReply(sock, message, "❌ An error occurred while displaying top companies.");
  }
}

/**
 * Handles company request command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleCompanyRequest(sock, message, args, sender) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}crq [company name]`);
      return;
    }
    
    // Get company name
    const companyName = args.join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Send request to company owner
    try {
      await sock.sendMessage(
        company.owner,
        {
          text: `📨 *INVESTMENT REQUEST* 📨\n\n${sender.split('@')[0]} wants to invest in your company "${companyName}".\n\nThey can use "${config.prefix}ci ${companyName} [amount]" to invest.`
        }
      );
      
      // Notify the requester
      await sendReply(sock, message, `✅ Your investment request has been sent to the owner of "${companyName}".\n\nYou can invest directly using "${config.prefix}ci ${companyName} [amount]" (minimum 1,000 coins).`);
    } catch (error) {
      console.error('Error sending company request:', error);
      await sendReply(sock, message, "❌ Could not send request to company owner. You can still invest directly using the ci command.");
    }
  } catch (error) {
    console.error('Error handling company request command:', error);
    await sendReply(sock, message, "❌ An error occurred while sending company request.");
  }
}

/**
 * Handles company rename command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleCompanyRename(sock, message, args, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}crn [old name] [new name]`);
      return;
    }
    
    // Get old and new names
    const oldName = args[0];
    const newName = args.slice(1).join(' ');
    
    // Get company
    const company = getCompany(oldName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${oldName}" not found.`);
      return;
    }
    
    // Check if sender is the owner
    if (company.owner !== sender) {
      await sendReply(sock, message, "❌ Only the company owner can rename the company.");
      return;
    }
    
    // Check if new name is valid
    if (newName.length < 3 || newName.length > 20) {
      await sendReply(sock, message, "❌ Company name must be between 3 and 20 characters.");
      return;
    }
    
    // Check if new name already exists
    if (getCompany(newName)) {
      await sendReply(sock, message, `❌ A company with the name "${newName}" already exists.`);
      return;
    }
    
    // Create new company with new name
    const newCompany = { ...company, name: newName };
    
    // Update company
    updateCompany(oldName, { name: newName });
    
    // Update all investors
    Object.keys(company.investors).forEach(investorId => {
      const investor = getUser(investorId);
      if (investor) {
        const investedCompanies = { ...investor.investedCompanies };
        if (investedCompanies[oldName]) {
          investedCompanies[newName] = investedCompanies[oldName];
          delete investedCompanies[oldName];
        }
        
        const shares = { ...investor.shares };
        if (shares[oldName]) {
          shares[newName] = shares[oldName];
          delete shares[oldName];
        }
        
        updateUser(investorId, { investedCompanies, shares });
      }
    });
    
    // Send confirmation
    await sendReply(sock, message, `✅ Company successfully renamed from "${oldName}" to "${newName}"!`);
  } catch (error) {
    console.error('Error handling company rename command:', error);
    await sendReply(sock, message, "❌ An error occurred while renaming the company.");
  }
}

/**
 * Handles company close command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleCompanyClose(sock, message, args, sender) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cclose [company name]`);
      return;
    }
    
    // Get company name
    const companyName = args.join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if sender is the owner
    if (company.owner !== sender) {
      await sendReply(sock, message, "❌ Only the company owner can close the company.");
      return;
    }
    
    // Return investments to all investors (with a fee)
    const investors = Object.keys(company.investors);
    
    for (const investorId of investors) {
      const investor = getUser(investorId);
      const investmentAmount = company.investors[investorId];
      
      if (investor) {
        // Calculate withdrawal fee
        const withdrawalFee = Math.floor(investmentAmount * config.companyWithdrawalFee);
        const withdrawalAmount = investmentAmount - withdrawalFee;
        
        // Update investor's balance and investments
        const investedCompanies = { ...investor.investedCompanies };
        delete investedCompanies[companyName];
        
        const shares = { ...investor.shares };
        delete shares[companyName];
        
        updateUser(investorId, {
          balance: investor.balance + withdrawalAmount,
          investedCompanies,
          shares
        });
        
        // Notify investor if not the owner
        if (investorId !== sender) {
          try {
            await sock.sendMessage(
              investorId,
              {
                text: `📢 *COMPANY CLOSED* 📢\n\n` +
                  `The company "${companyName}" has been closed by the owner.\n\n` +
                  `Your investment of ${formatNumber(investmentAmount)} coins has been returned, minus a ${config.companyWithdrawalFee * 100}% fee.\n\n` +
                  `Amount returned: ${formatNumber(withdrawalAmount)} coins\n` +
                  `Fee: ${formatNumber(withdrawalFee)} coins\n\n` +
                  `The amount has been added to your wallet.`
              }
            );
          } catch (notifyError) {
            console.error('Error notifying investor about company closure:', notifyError);
          }
        }
      }
    }
    
    // Remove company (in a real implementation, we might want to keep a record)
    updateCompany(companyName, { closed: true, closedAt: Date.now() });
    
    // Send confirmation to owner
    await sendReply(sock, message, `✅ Company "${companyName}" has been successfully closed.\n\nAll investors have been refunded their investments (minus ${config.companyWithdrawalFee * 100}% fee) and notified of the closure.`);
  } catch (error) {
    console.error('Error handling company close command:', error);
    await sendReply(sock, message, "❌ An error occurred while closing the company.");
  }
}

/**
 * Handles company kick command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleCompanyKick(sock, message, args, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}ckick [company name] @user`);
      return;
    }
    
    // Get mentioned user
    let kickUser = '';
    const mentionedUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    
    if (mentionedUser) {
      kickUser = mentionedUser;
    } else {
      // Try to get from the last argument (might be a phone number)
      const lastArg = args[args.length - 1];
      if (lastArg.startsWith('@')) {
        const userNumber = lastArg.slice(1);
        kickUser = userNumber.includes('@') ? userNumber : `${userNumber}@s.whatsapp.net`;
      }
    }
    
    if (!kickUser) {
      await sendReply(sock, message, "❌ Please mention the user you want to kick or specify their number.");
      return;
    }
    
    // Get company name (all arguments except the last one)
    const companyName = args.slice(0, -1).join(' ');
    
    // Get company
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if sender is the owner
    if (company.owner !== sender) {
      await sendReply(sock, message, "❌ Only the company owner can kick investors.");
      return;
    }
    
    // Check if user is an investor
    if (!company.investors[kickUser]) {
      await sendReply(sock, message, "❌ This user is not an investor in your company.");
      return;
    }
    
    // Check if trying to kick themselves
    if (kickUser === sender) {
      await sendReply(sock, message, "❌ You cannot kick yourself from your own company.");
      return;
    }
    
    // Process the kick (same as withdraw all, but forced)
    const investmentAmount = company.investors[kickUser];
    
    // Calculate withdrawal fee (higher fee for being kicked)
    const kickFee = Math.floor(investmentAmount * (config.companyWithdrawalFee * 2)); // Double fee for being kicked
    const withdrawalAmount = investmentAmount - kickFee;
    
    // Update company
    const investors = { ...company.investors };
    delete investors[kickUser];
    
    const shareDistribution = { ...company.shareDistribution };
    delete shareDistribution[kickUser];
    
    const newCompanyValue = company.value - investmentAmount;
    
    // Update company
    updateCompany(companyName, {
      value: newCompanyValue,
      investors,
      shareDistribution
    });
    
    // Update kicked user
    const kickedUser = getUser(kickUser);
    if (kickedUser) {
      const investedCompanies = { ...kickedUser.investedCompanies };
      delete investedCompanies[companyName];
      
      const shares = { ...kickedUser.shares };
      delete shares[companyName];
      
      updateUser(kickUser, {
        balance: kickedUser.balance + withdrawalAmount,
        investedCompanies,
        shares
      });
      
      // Notify kicked user
      try {
        await sock.sendMessage(
          kickUser,
          {
            text: `⚠️ *COMPANY INVESTMENT TERMINATED* ⚠️\n\n` +
              `You have been removed from "${companyName}" by the owner.\n\n` +
              `Your investment of ${formatNumber(investmentAmount)} coins has been returned, minus a ${(config.companyWithdrawalFee * 2) * 100}% fee.\n\n` +
              `Amount returned: ${formatNumber(withdrawalAmount)} coins\n` +
              `Fee: ${formatNumber(kickFee)} coins\n\n` +
              `The amount has been added to your wallet.`
          }
        );
      } catch (notifyError) {
        console.error('Error notifying kicked investor:', notifyError);
      }
    }
    
    // Send confirmation to owner
    await sendReply(sock, message, `✅ Investor ${kickUser.split('@')[0]} has been removed from "${companyName}".\n\nTheir investment of ${formatNumber(investmentAmount)} coins has been returned to them, minus a ${(config.companyWithdrawalFee * 2) * 100}% fee.\n\nNew company value: ${formatNumber(newCompanyValue)} coins`);
  } catch (error) {
    console.error('Error handling company kick command:', error);
    await sendReply(sock, message, "❌ An error occurred while kicking the investor.");
  }
}

module.exports = {
  handleCreateCompany,
  handleCompanyInfo,
  handleCompanyInvest,
  handleCompanyWithdraw,
  handleCompanyTop,
  handleCompanyRequest,
  handleCompanyRename,
  handleCompanyClose,
  handleCompanyKick
};
