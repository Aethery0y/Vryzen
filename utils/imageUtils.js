/**
 * Utility functions for handling images
 */
const fs = require('fs');
const path = require('path');

/**
 * Get image buffer for a specific command category
 * @param {String} category - Command category
 * @returns {Buffer|null} - Image buffer or null if not found
 */
function getCategoryImage(category) {
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
      'registration': 'register.svg'
    };

    // Determine the correct image path based on category
    const imageName = imageMap[category.toLowerCase()] || null;
    
    if (!imageName) return null;

    const imagePath = path.join(__dirname, '..', 'assets', 'images', imageName);
    
    // Check if the image exists
    if (fs.existsSync(imagePath)) {
      // Read and return the image buffer
      return fs.readFileSync(imagePath);
    }
    
    return null;
  } catch (error) {
    console.error('Error loading category image:', error);
    return null;
  }
}

module.exports = { getCategoryImage };