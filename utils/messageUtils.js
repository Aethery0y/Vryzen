/**
 * Utility functions for handling messages
 */

/**
 * Sends a reply to a message
 * @param {Object} sock - WhatsApp connection
 * @param {Object} message - Message to reply to
 * @param {String} text - Reply text
 * @param {Buffer} image - Optional image buffer
 */
async function sendReply(sock, message, text, image = null) {
  try {
    const remoteJid = message.key.remoteJid;
    
    if (image) {
      // Send reply with image
      await sock.sendMessage(
        remoteJid,
        { 
          image,
          caption: text 
        },
        { quoted: message }
      );
    } else {
      // Send text-only reply
      await sock.sendMessage(
        remoteJid,
        { text },
        { quoted: message }
      );
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    // Fallback to text-only if image sending fails
    if (image) {
      try {
        await sock.sendMessage(
          message.key.remoteJid,
          { text },
          { quoted: message }
        );
      } catch (fallbackError) {
        console.error('Error sending fallback text reply:', fallbackError);
      }
    }
  }
}

module.exports = { sendReply };