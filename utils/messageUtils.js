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
  // Debug information
  console.log('REPLY_DEBUG: Attempting to send reply');
  console.log(`REPLY_DEBUG: To chat ${message.key.remoteJid}`);
  console.log(`REPLY_DEBUG: With image? ${image ? 'Yes, size=' + (image ? image.length : 0) : 'No'}`);
  console.log(`REPLY_DEBUG: Text length: ${text.length} chars`);
  
  try {
    const remoteJid = message.key.remoteJid;
    
    if (image) {
      console.log('REPLY_DEBUG: Sending message with image');
      // Send reply with image
      // Convert SVG to generic binary image type without mimetype
      await sock.sendMessage(
        remoteJid,
        { 
          image,
          caption: text,
          // Remove the mimetype specification to let Baileys auto-detect
        },
        { quoted: message }
      );
      console.log('REPLY_DEBUG: Image message sent successfully');
    } else {
      console.log('REPLY_DEBUG: Sending text-only message');
      // Send text-only reply
      await sock.sendMessage(
        remoteJid,
        { text },
        { quoted: message }
      );
      console.log('REPLY_DEBUG: Text message sent successfully');
    }
  } catch (error) {
    console.error('REPLY_DEBUG: Error sending reply:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    // Fallback to text-only if image sending fails
    if (image) {
      try {
        console.log('REPLY_DEBUG: Attempting text-only fallback');
        await sock.sendMessage(
          message.key.remoteJid,
          { text },
          { quoted: message }
        );
        console.log('REPLY_DEBUG: Fallback message sent successfully');
      } catch (fallbackError) {
        console.error('REPLY_DEBUG: Error sending fallback text reply:', fallbackError);
        console.error('Fallback error details:', fallbackError.message);
      }
    }
  }
}

module.exports = { sendReply };