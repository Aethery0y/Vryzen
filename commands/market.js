const { sendReply } = require('../utils/messageUtils');
const config = require('../config');
const { getUser, updateUser, getCompany, getAllCompanies, getMarketOrders, addMarketOrder, getMarketOrderById, removeMarketOrder } = require('../database/db');
const { formatNumber } = require('../utils/formatter');

/**
 * Handles market command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 */
async function handleMarket(sock, message, args) {
  try {
    // Check if a company is specified
    if (args.length > 0) {
      const companyName = args.join(' ');
      
      // Check if company exists
      const company = getCompany(companyName);
      if (!company) {
        await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
        return;
      }
      
      // Get orders for this company
      const orders = getMarketOrders(companyName);
      
      if (orders.length === 0) {
        await sendReply(sock, message, `📊 *MARKET - ${companyName}*\n\nNo sell orders found for this company.`);
        return;
      }
      
      // Format orders
      let ordersText = `📊 *MARKET - ${companyName}* 📊\n\n`;
      
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        ordersText += `ID: ${order.id}\n` +
          `Seller: ${order.seller.split('@')[0]}\n` +
          `Quantity: ${order.quantity} shares\n` +
          `Price: ${formatNumber(order.price)} coins per share\n` +
          `Total: ${formatNumber(order.price * order.quantity)} coins\n\n`;
      }
      
      ordersText += `Use "${config.prefix}buyshares [OrderID] [quantity]" to purchase shares.`;
      
      await sendReply(sock, message, ordersText);
    } else {
      // Show all market orders
      const allOrders = getMarketOrders();
      
      if (allOrders.length === 0) {
        await sendReply(sock, message, "📊 *MARKET*\n\nNo sell orders found in the market.");
        return;
      }
      
      // Group orders by company
      const ordersByCompany = {};
      
      for (const order of allOrders) {
        if (!ordersByCompany[order.company]) {
          ordersByCompany[order.company] = [];
        }
        ordersByCompany[order.company].push(order);
      }
      
      // Format market overview
      let marketText = `📊 *MARKET OVERVIEW* 📊\n\n`;
      
      for (const [company, orders] of Object.entries(ordersByCompany)) {
        const totalShares = orders.reduce((sum, order) => sum + order.quantity, 0);
        const lowestPrice = Math.min(...orders.map(order => order.price));
        
        marketText += `*${company}*\n` +
          `Available: ${totalShares} shares\n` +
          `Starting at: ${formatNumber(lowestPrice)} coins\n` +
          `Orders: ${orders.length}\n\n`;
      }
      
      marketText += `Use "${config.prefix}market [Company]" to view specific company orders.\n` +
        `Use "${config.prefix}buyshares [OrderID] [quantity]" to purchase shares.\n` +
        `Use "${config.prefix}sellshares [Company] [quantity] [price]" to list shares for sale.`;
      
      await sendReply(sock, message, marketText);
    }
  } catch (error) {
    console.error('Error handling market command:', error);
    await sendReply(sock, message, "❌ An error occurred while browsing the market.");
  }
}

/**
 * Handles buy shares command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleBuyShares(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 2) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}buyshares [OrderID] [quantity]`);
      return;
    }
    
    // Parse order ID and quantity
    const orderId = parseInt(args[0]);
    const quantity = parseInt(args[1]);
    
    if (isNaN(orderId)) {
      await sendReply(sock, message, "❌ Invalid order ID.");
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid quantity.");
      return;
    }
    
    // Get the order
    const order = getMarketOrderById(orderId);
    
    if (!order) {
      await sendReply(sock, message, `❌ Order with ID ${orderId} not found.`);
      return;
    }
    
    // Check if trying to buy own shares
    if (order.seller === sender) {
      await sendReply(sock, message, "❌ You cannot buy your own shares.");
      return;
    }
    
    // Check if quantity is valid
    if (quantity > order.quantity) {
      await sendReply(sock, message, `❌ This order only has ${order.quantity} shares available.`);
      return;
    }
    
    // Calculate total cost
    const totalCost = order.price * quantity;
    
    // Check if user has enough balance
    if (totalCost > user.balance) {
      await sendReply(sock, message, `❌ You need ${formatNumber(totalCost)} coins to buy these shares. You have ${formatNumber(user.balance)} coins.`);
      return;
    }
    
    // Get the company
    const company = getCompany(order.company);
    
    if (!company) {
      await sendReply(sock, message, `❌ Company "${order.company}" no longer exists.`);
      return;
    }
    
    // Calculate market fee
    const marketFee = Math.floor(totalCost * config.marketFee);
    const sellerAmount = totalCost - marketFee;
    
    // Update buyer's balance and shares
    const shares = { ...user.shares };
    shares[order.company] = (shares[order.company] || 0) + quantity;
    
    updateUser(sender, {
      balance: user.balance - totalCost,
      shares
    });
    
    // Update seller's balance
    const seller = getUser(order.seller);
    updateUser(order.seller, {
      balance: seller.balance + sellerAmount
    });
    
    // Update order quantity or remove if all shares bought
    if (quantity === order.quantity) {
      removeMarketOrder(orderId);
    } else {
      const updatedOrder = { ...order, quantity: order.quantity - quantity };
      removeMarketOrder(orderId);
      addMarketOrder(updatedOrder);
    }
    
    // Notify seller
    try {
      await sock.sendMessage(
        order.seller,
        {
          text: `💹 *SHARES SOLD* 💹\n\n` +
            `${sender.split('@')[0]} has purchased ${quantity} shares of "${order.company}" from your market listing.\n\n` +
            `Sale price: ${formatNumber(order.price)} coins per share\n` +
            `Total: ${formatNumber(totalCost)} coins\n` +
            `Market fee (${config.marketFee * 100}%): ${formatNumber(marketFee)} coins\n` +
            `Net received: ${formatNumber(sellerAmount)} coins\n\n` +
            `Your new balance: ${formatNumber(seller.balance + sellerAmount)} coins`
        }
      );
    } catch (notifyError) {
      console.error('Error notifying seller about share purchase:', notifyError);
    }
    
    // Send confirmation to buyer
    await sendReply(sock, message, `💹 *SHARES PURCHASED* 💹\n\n` +
      `You've successfully purchased ${quantity} shares of "${order.company}"!\n\n` +
      `Price per share: ${formatNumber(order.price)} coins\n` +
      `Total cost: ${formatNumber(totalCost)} coins\n` +
      `Your new ${order.company} shares: ${shares[order.company]}\n\n` +
      `New balance: ${formatNumber(user.balance - totalCost)} coins`);
  } catch (error) {
    console.error('Error handling buy shares command:', error);
    await sendReply(sock, message, "❌ An error occurred while buying shares.");
  }
}

/**
 * Handles sell shares command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleSellShares(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 3) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}sellshares [Company] [quantity] [price]`);
      return;
    }
    
    // Parse quantity and price (last two arguments)
    const quantity = parseInt(args[args.length - 2]);
    const price = parseInt(args[args.length - 1]);
    
    // Get company name (all arguments except the last two)
    const companyName = args.slice(0, -2).join(' ');
    
    // Validate inputs
    if (isNaN(quantity) || quantity <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid quantity.");
      return;
    }
    
    if (isNaN(price) || price <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid price per share.");
      return;
    }
    
    // Check if company exists
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if user has enough shares
    const userShares = user.shares[companyName] || 0;
    if (userShares < quantity) {
      await sendReply(sock, message, `❌ You only have ${userShares} shares of "${companyName}".`);
      return;
    }
    
    // Create market order
    const order = {
      seller: sender,
      company: companyName,
      quantity,
      price,
      createdAt: Date.now()
    };
    
    addMarketOrder(order);
    
    // Update user's shares
    const shares = { ...user.shares };
    shares[companyName] = userShares - quantity;
    
    // Remove the company from shares if zero
    if (shares[companyName] === 0) {
      delete shares[companyName];
    }
    
    updateUser(sender, { shares });
    
    // Send confirmation
    await sendReply(sock, message, `📈 *SELL ORDER CREATED* 📈\n\n` +
      `You've listed ${quantity} shares of "${companyName}" for sale.\n\n` +
      `Price per share: ${formatNumber(price)} coins\n` +
      `Total value: ${formatNumber(price * quantity)} coins\n` +
      `Order ID: ${order.id}\n\n` +
      `Your remaining shares: ${shares[companyName] || 0}\n\n` +
      `Use "${config.prefix}cancelorder ${order.id}" to cancel this order.`);
  } catch (error) {
    console.error('Error handling sell shares command:', error);
    await sendReply(sock, message, "❌ An error occurred while creating sell order.");
  }
}

/**
 * Handles cancel order command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {String} sender - Sender ID
 */
async function handleCancelOrder(sock, message, args, sender) {
  try {
    // Check arguments
    if (args.length < 1) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}cancelorder [OrderID]`);
      return;
    }
    
    // Parse order ID
    const orderId = parseInt(args[0]);
    
    if (isNaN(orderId)) {
      await sendReply(sock, message, "❌ Invalid order ID.");
      return;
    }
    
    // Get the order
    const order = getMarketOrderById(orderId);
    
    if (!order) {
      await sendReply(sock, message, `❌ Order with ID ${orderId} not found.`);
      return;
    }
    
    // Check if user is the seller
    if (order.seller !== sender) {
      await sendReply(sock, message, "❌ You can only cancel your own orders.");
      return;
    }
    
    // Remove the order
    removeMarketOrder(orderId);
    
    // Return shares to seller
    const user = getUser(sender);
    const shares = { ...user.shares };
    shares[order.company] = (shares[order.company] || 0) + order.quantity;
    
    updateUser(sender, { shares });
    
    // Send confirmation
    await sendReply(sock, message, `✅ Order ${orderId} has been cancelled.\n\n` +
      `${order.quantity} shares of "${order.company}" have been returned to your account.\n\n` +
      `Your ${order.company} shares: ${shares[order.company]}`);
  } catch (error) {
    console.error('Error handling cancel order command:', error);
    await sendReply(sock, message, "❌ An error occurred while cancelling the order.");
  }
}

/**
 * Handles transfer shares command
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message object
 * @param {Array} args - Command arguments
 * @param {Object} user - User data
 * @param {String} sender - Sender ID
 */
async function handleTransfer(sock, message, args, user, sender) {
  try {
    // Check arguments
    if (args.length < 3) {
      await sendReply(sock, message, `❌ Incorrect format. Use ${config.prefix}transfer [Company] [@user] [quantity]`);
      return;
    }
    
    // Get quantity (last argument)
    const quantity = parseInt(args[args.length - 1]);
    
    // Get recipient
    let recipient = '';
    const mentionedUser = message.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    
    if (mentionedUser) {
      recipient = mentionedUser;
    } else {
      // Try to get from the second to last argument
      const recipientArg = args[args.length - 2];
      if (recipientArg.startsWith('@')) {
        const userNumber = recipientArg.slice(1);
        recipient = userNumber.includes('@') ? userNumber : `${userNumber}@s.whatsapp.net`;
      }
    }
    
    if (!recipient) {
      await sendReply(sock, message, "❌ Please mention the user you want to transfer shares to.");
      return;
    }
    
    // Get company name (all arguments except the last two)
    const companyName = args.slice(0, -2).join(' ');
    
    // Validate inputs
    if (isNaN(quantity) || quantity <= 0) {
      await sendReply(sock, message, "❌ Please enter a valid quantity.");
      return;
    }
    
    // Check if company exists
    const company = getCompany(companyName);
    if (!company) {
      await sendReply(sock, message, `❌ Company "${companyName}" not found.`);
      return;
    }
    
    // Check if user has enough shares
    const userShares = user.shares[companyName] || 0;
    if (userShares < quantity) {
      await sendReply(sock, message, `❌ You only have ${userShares} shares of "${companyName}".`);
      return;
    }
    
    // Check if recipient exists
    const recipientUser = getUser(recipient);
    
    // Update sender's shares
    const senderShares = { ...user.shares };
    senderShares[companyName] = userShares - quantity;
    
    // Remove the company from shares if zero
    if (senderShares[companyName] === 0) {
      delete senderShares[companyName];
    }
    
    updateUser(sender, { shares: senderShares });
    
    // Update recipient's shares
    const recipientShares = { ...recipientUser.shares };
    recipientShares[companyName] = (recipientShares[companyName] || 0) + quantity;
    
    updateUser(recipient, { shares: recipientShares });
    
    // Notify recipient
    try {
      await sock.sendMessage(
        recipient,
        {
          text: `📩 *SHARES RECEIVED* 📩\n\n` +
            `${sender.split('@')[0]} has transferred ${quantity} shares of "${companyName}" to you.\n\n` +
            `Your ${companyName} shares: ${recipientShares[companyName]}`
        }
      );
    } catch (notifyError) {
      console.error('Error notifying recipient about share transfer:', notifyError);
    }
    
    // Send confirmation to sender
    await sendReply(sock, message, `📤 *SHARES TRANSFERRED* 📤\n\n` +
      `You've successfully transferred ${quantity} shares of "${companyName}" to ${recipient.split('@')[0]}.\n\n` +
      `Your remaining shares: ${senderShares[companyName] || 0}`);
  } catch (error) {
    console.error('Error handling transfer shares command:', error);
    await sendReply(sock, message, "❌ An error occurred while transferring shares.");
  }
}

module.exports = {
  handleMarket,
  handleBuyShares,
  handleSellShares,
  handleCancelOrder,
  handleTransfer
};
