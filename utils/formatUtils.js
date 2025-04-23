/**
 * Utility functions for formatting data
 */

/**
 * Formats a number with commas as thousands separators
 * @param {Number} number - The number to format
 * @returns {String} Formatted number
 */
function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats a duration in milliseconds to a readable time string
 * @param {Number} milliseconds - The duration in milliseconds
 * @returns {String} Formatted duration string
 */
function formatDuration(milliseconds) {
  const seconds = Math.floor((milliseconds / 1000) % 60);
  const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
  const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

/**
 * Formats a date to a readable string
 * @param {Date} date - The date to format
 * @returns {String} Formatted date string
 */
function formatDate(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = {
  formatNumber,
  formatDuration,
  formatDate
};