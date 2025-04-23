/**
 * Utility functions for handling images
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Default Vryzen bot image to use as fallback
const BOT_IMAGE_PATH = path.join(__dirname, '..', 'assets', 'images', 'bot', 'Vryzen.jpg');

// Cache for converted images to improve performance
const imageCache = {};

/**
 * Convert SVG to PNG buffer for better WhatsApp compatibility
 * @param {Buffer} svgBuffer - The SVG buffer to convert
 * @param {String} cacheKey - Cache key to use for this conversion
 * @returns {Promise<Buffer>} - PNG buffer
 */
async function convertSvgToPng(svgBuffer, cacheKey) {
  try {
    // Check cache first
    if (imageCache[cacheKey]) {
      console.log(`Using cached PNG for ${cacheKey}`);
      return imageCache[cacheKey];
    }
    
    console.log(`Converting SVG to PNG for ${cacheKey}`);
    
    // Convert SVG to PNG using sharp with improved settings
    // No resize to prevent the black empty areas, keep original dimensions
    // Use transparent background
    const pngBuffer = await sharp(svgBuffer, { density: 300 })
      .png()
      .toBuffer();
    
    console.log(`Conversion successful, PNG size: ${pngBuffer.length} bytes`);
    
    // Cache the result
    imageCache[cacheKey] = pngBuffer;
    
    return pngBuffer;
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    throw error;
  }
}

/**
 * Get image buffer for a specific command category
 * @param {String} category - Command category
 * @returns {Promise<Buffer>|null} - Image buffer or null if not found
 */
async function getCategoryImage(category) {
  try {
    // Map the category name to the image file
    // All category images should be in assets/images/
    const imageMap = {
      'gambling': 'gambling.svg',
      'pvp': 'pvp.svg', 
      'daily': 'daily.svg',
      'company': 'company.svg',
      'leaderboard': 'leaderboard.svg',
      'xp': 'xp.svg',
      'shop': 'shop.svg',
      'bank': 'bank.svg',
      'market': 'market.svg',
      'groups': 'groups.svg',
      'register': 'register.svg',
      'registration': 'register.svg',
      'help': 'help.svg'  // Added help.svg for main help menu
    };

    // Determine the correct image path based on category
    const imageName = imageMap[category.toLowerCase()] || null;
    
    if (!imageName) {
      // If no category image is specified, return the default bot image
      if (fs.existsSync(BOT_IMAGE_PATH)) {
        console.log(`Using default bot image for category: ${category}`);
        return fs.readFileSync(BOT_IMAGE_PATH);
      }
      return null;
    }

    const imagePath = path.join(__dirname, '..', 'assets', 'images', imageName);
    
    // Check if the image exists
    if (fs.existsSync(imagePath)) {
      // Read the image buffer
      const svgBuffer = fs.readFileSync(imagePath);
      
      // Debug info about the image
      console.log(`SVG image ${imageName} size: ${svgBuffer.length} bytes`);
      
      // If this is an SVG, convert it to PNG for better WhatsApp compatibility
      if (imageName.endsWith('.svg')) {
        try {
          console.log(`Converting SVG to PNG for category: ${category}`);
          return await convertSvgToPng(svgBuffer, category);
        } catch (conversionError) {
          console.error(`Error converting SVG to PNG for ${category}:`, conversionError);
          // On conversion error, return the original SVG
          console.log(`Falling back to original SVG for ${category}`);
          return svgBuffer;
        }
      }
      
      // Return the original image buffer for non-SVG images
      return svgBuffer;
    }
    
    // Use default bot image as fallback
    if (fs.existsSync(BOT_IMAGE_PATH)) {
      console.log(`Using fallback bot image for missing category: ${category}`);
      return fs.readFileSync(BOT_IMAGE_PATH);
    }
    
    return null;
  } catch (error) {
    console.error('Error loading category image:', error);
    // Use default bot image as fallback on error
    try {
      if (fs.existsSync(BOT_IMAGE_PATH)) {
        console.log(`Using fallback bot image after error for category: ${category}`);
        return fs.readFileSync(BOT_IMAGE_PATH);
      }
    } catch (fallbackError) {
      console.error('Error loading fallback image:', fallbackError);
    }
    return null;
  }
}

/**
 * Get the default bot profile image
 * @returns {Buffer} - Image buffer or null if not found
 */
function getBotProfileImage() {
  try {
    if (fs.existsSync(BOT_IMAGE_PATH)) {
      return fs.readFileSync(BOT_IMAGE_PATH);
    }
    return null;
  } catch (error) {
    console.error('Error loading bot profile image:', error);
    return null;
  }
}

module.exports = { getCategoryImage, getBotProfileImage };