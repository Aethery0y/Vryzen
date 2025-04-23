/**
 * Formats a number with commas
 * @param {Number} num - Number to format
 * @returns {String} Formatted number
 */
function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats a date to readable string
 * @param {Number|Date} timestamp - Timestamp or Date object
 * @returns {String} Formatted date
 */
function formatDate(timestamp) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats a time duration in milliseconds
 * @param {Number} ms - Milliseconds
 * @returns {String} Formatted duration (e.g., "2h 30m")
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formats a percentage
 * @param {Number} value - Value to format
 * @param {Number} decimals - Number of decimal places
 * @returns {String} Formatted percentage
 */
function formatPercentage(value, decimals = 2) {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncates text to a maximum length
 * @param {String} text - Text to truncate
 * @param {Number} maxLength - Maximum length
 * @returns {String} Truncated text
 */
function truncateText(text, maxLength = 30) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

module.exports = {
  formatNumber,
  formatDate,
  formatDuration,
  formatPercentage,
  truncateText
};
