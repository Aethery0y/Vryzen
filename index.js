const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { initializeDatabase, saveDatabase } = require('./database/db');
const { handleMessage } = require('./handlers/messageHandler');
const { getBotProfileImage } = require('./utils/imageUtils');

// Initialize the database
initializeDatabase();

// Set up automatic database saving
setInterval(() => {
  saveDatabase();
  console.log('Database saved');
}, 60000); // Save every minute

// Ensure auth folder exists
if (!fs.existsSync('./auth')) {
  fs.mkdirSync('./auth');
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    logger: P({ level: 'silent' })
  });
  
  // Auto-save credentials whenever they're updated
  sock.ev.on('creds.update', saveCreds);
  
  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('QR Code generated. Scan with your WhatsApp app.');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed due to ', lastDisconnect.error, ', reconnecting: ', shouldReconnect);
      
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp bot connected!');
    }
  });
  
  // Handle messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      if (message.key.remoteJid && message.message) {
        // Only process new messages
        if (!message.key.fromMe) {
          await handleMessage(sock, message);
        }
      }
    }
  });
  
  // Handle group participant updates
  sock.ev.on('group-participants.update', async (update) => {
    console.log('Group participant update:', update);
    try {
      const { approveGroup, isGroupApproved, removeGroupApproval, saveDatabase } = require('./database/db');
      const botJid = sock.user.id;
      
      // Normalize bot JID to handle different formats
      const normalizedBotJid = botJid.replace(/:.+@/, '@');
      
      // Check if bot was added to a group
      if (update.action === 'add' && update.participants.some(p => p.replace(/:.+@/, '@') === normalizedBotJid)) {
        // Bot was added to a group, check if it's admin
        const groupMetadata = await sock.groupMetadata(update.id);
        
        // Log for debugging
        console.log(`Bot added to group: ${groupMetadata.subject}`);
        console.log(`Bot JID: ${botJid}`);
        
        // Check if bot is admin
        const botParticipant = groupMetadata.participants.find(
          participant => participant.id.replace(/:.+@/, '@') === normalizedBotJid
        );
        
        console.log(`Bot participant found:`, botParticipant ? 'Yes' : 'No');
        
        const isBotAdmin = botParticipant && ['admin', 'superadmin'].includes(botParticipant.admin);
        console.log(`Bot is admin:`, isBotAdmin);
        
        if (isBotAdmin && !isGroupApproved(update.id)) {
          // Bot is admin, approve the group
          approveGroup(update.id, {
            name: groupMetadata.subject,
            participants: groupMetadata.participants.length,
            addedAt: Date.now()
          });
          
          // Save the database
          saveDatabase();
          
          // Send welcome message
          await sock.sendMessage(update.id, {
            text: `🎉 *GROUP APPROVED* 🎉\n\n` +
                 `This group has been approved for bot usage! All commands are now available to members.\n\n` +
                 `Use "${config.prefix}help" to see available commands.`
          });
          
          console.log(`Bot was added as admin to group: ${groupMetadata.subject}. Group approved.`);
        } else if (!isBotAdmin) {
          // Bot is not admin, ask for admin privileges
          await sock.sendMessage(update.id, {
            text: `👋 *HELLO GROUP MEMBERS* 👋\n\n` +
                 `Thank you for adding me to this group! To activate all features, please make me an admin.\n\n` +
                 `Once I'm given admin privileges, I'll be fully operational in this group.`
          });
          
          console.log(`Bot was added to group without admin: ${groupMetadata.subject}.`);
        }
      }
      
      // Check if this is a promotion event (someone made admin)
      if (update.action === 'promote') {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(update.id);
        
        // Check if our bot was promoted to admin
        const wasBotPromoted = update.participants.some(
          p => p.replace(/:.+@/, '@') === normalizedBotJid
        );
        
        console.log(`Promotion event in group: ${groupMetadata.subject}`);
        console.log(`Bot was promoted: ${wasBotPromoted}`);
        
        if (wasBotPromoted) {
          // Check if the group is already approved
          if (!isGroupApproved(update.id)) {
            // Approve the group
            approveGroup(update.id, {
              name: groupMetadata.subject,
              participants: groupMetadata.participants.length,
              promotedAt: Date.now()
            });
            
            // Save the database
            saveDatabase();
            
            // Send welcome message
            await sock.sendMessage(update.id, {
              text: `🎉 *THANK YOU FOR ADMIN PRIVILEGES* 🎉\n\n` +
                   `This group has been approved for bot usage! All commands are now available to members.\n\n` +
                   `Use "${config.prefix}help" to see available commands.`
            });
            
            console.log(`Bot was promoted to admin in group: ${groupMetadata.subject}. Group approved.`);
          } else {
            // Group was already approved, but bot was re-promoted after being demoted
            await sock.sendMessage(update.id, {
              text: `✅ *ADMIN PRIVILEGES RESTORED* ✅\n\n` +
                   `Thank you for restoring my admin privileges! All commands are now available again.\n\n` +
                   `Use "${config.prefix}help" to see available commands.`
            });
            
            console.log(`Bot was re-promoted in group: ${groupMetadata.subject}`);
          }
        }
      }
      
      // Handle demote event - detect when bot loses admin rights
      if (update.action === 'demote') {
        // Get group metadata
        const groupMetadata = await sock.groupMetadata(update.id);
        
        // Check if our bot was demoted from admin
        const wasBotDemoted = update.participants.some(
          p => p.replace(/:.+@/, '@') === normalizedBotJid
        );
        
        console.log(`Demotion event in group: ${groupMetadata.subject}`);
        console.log(`Bot was demoted: ${wasBotDemoted}`);
        
        if (wasBotDemoted && isGroupApproved(update.id)) {
          // No need to remove approval as we'll check admin status for each command
          // Just inform the group that admin privileges are required
          await sock.sendMessage(update.id, {
            text: `⚠️ *ADMIN PRIVILEGES REQUIRED* ⚠️\n\n` +
                 `I've been demoted from admin status in this group.\n\n` +
                 `To use my commands, please restore my admin privileges.`
          });
          
          console.log(`Bot was demoted from admin in group: ${groupMetadata.subject}`);
        }
      }
      
      // Handle remove event when bot is removed from group
      if (update.action === 'remove' && update.participants.some(p => p.replace(/:.+@/, '@') === normalizedBotJid)) {
        // Bot was removed from the group
        // Remove the group from approved groups
        if (isGroupApproved(update.id)) {
          removeGroupApproval(update.id);
          saveDatabase();
          console.log(`Bot was removed from group ${update.id}. Group approval removed.`);
        }
      }
    } catch (error) {
      console.error('Error handling group participant update:', error);
    }
  });
  
  return sock;
}

// Start the bot
connectToWhatsApp();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Saving database before exit...');
  saveDatabase();
  process.exit(0);
});
