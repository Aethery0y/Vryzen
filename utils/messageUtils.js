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
      
      try {
        // Get the filename or use a default
        const filename = text.split('\n')[0].replace(/[^\w\s]/gi, '').trim() + '.png'; 
        
        // First method: Try sending with mimetype specified as PNG
        await sock.sendMessage(
          remoteJid,
          { 
            image,
            caption: text,
            mimetype: 'image/png',  // Force image/png for better compatibility with SVG
            fileName: filename       // Give it a filename
          },
          { quoted: message }
        );
        console.log('REPLY_DEBUG: Image message sent successfully as PNG');
      } catch (imageError) {
        console.error('REPLY_DEBUG: Error sending image as PNG:', imageError.message);
        
        // Second method: Try as JPEG
        try {
          console.log('REPLY_DEBUG: Trying JPEG format');
          await sock.sendMessage(
            remoteJid,
            { 
              image,
              caption: text,
              mimetype: 'image/jpeg',
              fileName: 'image.jpg'
            },
            { quoted: message }
          );
          console.log('REPLY_DEBUG: JPEG message sent successfully');
        } catch (jpegError) {
          console.error('REPLY_DEBUG: JPEG method failed:', jpegError.message);
          
          // Third method: Try with no mimetype
          try {
            console.log('REPLY_DEBUG: Trying without mimetype');
            await sock.sendMessage(
              remoteJid,
              { 
                image,
                caption: text
              },
              { quoted: message }
            );
            console.log('REPLY_DEBUG: No-mimetype method succeeded');
          } catch (noMimeError) {
            console.error('REPLY_DEBUG: All image methods failed:', noMimeError.message);
            // If all methods fail, fall back to text-only
            await sock.sendMessage(
              remoteJid,
              { text },
              { quoted: message }
            );
            console.log('REPLY_DEBUG: Fell back to text-only message');
          }
        }
      }
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