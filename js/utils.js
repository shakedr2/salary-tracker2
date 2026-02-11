/**
 * Utility Functions Module
 * Comprehensive collection of helper functions
 */

import { APP_CONFIG } from './config.js';

// ============================================================================
// STRING FORMATTING
// ============================================================================

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: ILS)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'ILS') {
  if (value == null || isNaN(value)) return '₪0.00';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format number with localization
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0';
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format percentage
 * @param {number} value - Numeric value (0-100)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 2) {
  if (value == null || isNaN(value)) return '0%';
  return `${formatNumber(value, decimals)}%`;
}

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate string
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, length, suffix = '...') {
  if (!str || str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

/**
 * Capitalize first letter
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to slug
 * @param {string} str - String to slugify
 * @returns {string} Slug string
 */
export function slugify(str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================================================
// DATE & TIME
// ============================================================================

/**
 * Format date
 * @param {Date|string|number} date - Date to format
 * @param {string} format - Date format (DD/MM/YYYY, YYYY-MM-DD, etc.)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('YY', String(year).slice(-2));
}

/**
 * Format time
 * @param {Date|string|number} date - Date to format
 * @param {boolean} includeSeconds - Include seconds
 * @returns {string} Formatted time string
 */
export function formatTime(date, includeSeconds = false) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

/**
 * Get relative time string
 * @param {Date|string|number} date - Date to compare
 * @returns {string} Relative time string (e.g., '2 hours ago')
 */
export function getRelativeTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const seconds = Math.floor((now - d) / 1000);
  
  if (seconds < 60) return 'לפני רגע';
  if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
  if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
  if (seconds < 604800) return `לפני ${Math.floor(seconds / 86400)} ימים`;
  return formatDate(d);
}

/**
 * Get date range
 * @param {string} period - Period type (today, week, month, year)
 * @returns {Object} Object with start and end dates
 */
export function getDateRange(period) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const ranges = {
    today: {
      start: new Date(today),
      end: new Date(today.getTime() + 86400000 - 1)
    },
    week: {
      start: new Date(today.getTime() - (today.getDay() * 86400000)),
      end: new Date(today.getTime() + ((6 - today.getDay()) * 86400000) + 86400000 - 1)
    },
    month: {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    },
    year: {
      start: new Date(today.getFullYear(), 0, 1),
      end: new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
    }
  };
  
  return ranges[period] || ranges.today;
}

/**
 * Check if date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Add days to date
 * @param {Date} date - Starting date
 * @param {number} days - Number of days to add
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to date
 * @param {Date} date - Starting date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// ============================================================================
// PERFORMANCE
// ============================================================================

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize function
 * @param {Function} func - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(func) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Execute function once
 * @param {Function} func - Function to execute once
 * @returns {Function} Function that executes once
 */
export function once(func) {
  let called = false;
  let result;
  return function(...args) {
    if (!called) {
      result = func.apply(this, args);
      called = true;
    }
    return result;
  };
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Save to storage
 * @param {string} key - Storage key
 * @param {*} value - Value to save
 * @param {string} storage - Storage type ('local' or 'session')
 * @returns {boolean} Success status
 */
export function saveToStorage(key, value, storage = 'local') {
  try {
    const store = storage === 'session' ? sessionStorage : localStorage;
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to save to storage:', error);
    return false;
  }
}

/**
 * Load from storage
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if not found
 * @param {string} storage - Storage type ('local' or 'session')
 * @returns {*} Stored value or default
 */
export function loadFromStorage(key, defaultValue = null, storage = 'local') {
  try {
    const store = storage === 'session' ? sessionStorage : localStorage;
    const data = store.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return defaultValue;
  }
}

/**
 * Remove from storage
 * @param {string} key - Storage key
 * @param {string} storage - Storage type ('local' or 'session')
 */
export function removeFromStorage(key, storage = 'local') {
  try {
    const store = storage === 'session' ? sessionStorage : localStorage;
    store.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from storage:', error);
  }
}

/**
 * Clear all storage
 * @param {string} storage - Storage type ('local' or 'session')
 */
export function clearAllStorage(storage = 'local') {
  try {
    const store = storage === 'session' ? sessionStorage : localStorage;
    store.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

/**
 * Get storage size
 * @param {string} storage - Storage type ('local' or 'session')
 * @returns {number} Storage size in bytes
 */
export function getStorageSize(storage = 'local') {
  try {
    const store = storage === 'session' ? sessionStorage : localStorage;
    let total = 0;
    for (let key in store) {
      if (store.hasOwnProperty(key)) {
        total += store[key].length + key.length;
      }
    }
    return total;
  } catch (error) {
    return 0;
  }
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Chunk array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Get unique array values
 * @param {Array} array - Array with duplicates
 * @returns {Array} Array with unique values
 */
export function uniqueArray(array) {
  return [...new Set(array)];
}

/**
 * Sort array of objects
 * @param {Array} array - Array to sort
 * @param {string} key - Key to sort by
 * @param {string} order - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted array
 */
export function sortArray(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (order === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
}

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

/**
 * Sum array values
 * @param {Array} array - Array of numbers or objects
 * @param {string} key - Key to sum (for objects)
 * @returns {number} Sum of values
 */
export function sum(array, key = null) {
  return array.reduce((total, item) => {
    const value = key ? item[key] : item;
    return total + (Number(value) || 0);
  }, 0);
}

/**
 * Calculate average
 * @param {Array} array - Array of numbers or objects
 * @param {string} key - Key to average (for objects)
 * @returns {number} Average value
 */
export function average(array, key = null) {
  if (array.length === 0) return 0;
  return sum(array, key) / array.length;
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep clone object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Deep merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
export function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}

/**
 * Check if value is object
 * @param {*} value - Value to check
 * @returns {boolean} True if object
 */
export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Pick properties from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object} Object with picked keys
 */
export function pick(obj, keys) {
  const result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit properties from object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object} Object without omitted keys
 */
export function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// ============================================================================
// DOM UTILITIES
// ============================================================================

/**
 * Add event listener with automatic cleanup
 * @param {Element} element - DOM element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {Function} Cleanup function
 */
export function addListener(element, event, handler) {
  element.addEventListener(event, handler);
  return () => element.removeEventListener(event, handler);
}

/**
 * Wait for element to exist
 * @param {string} selector - CSS selector
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element>} Promise that resolves with element
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found`));
    }, timeout);
  });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback method
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  }
}

/**
 * Download file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} type - MIME type
 */
export function downloadFile(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Clamp number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Generate UUID
 * @returns {string} UUID string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export all functions as default
export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  truncate,
  capitalize,
  slugify,
  randomString,
  formatDate,
  formatTime,
  getRelativeTime,
  getDateRange,
  isToday,
  addDays,
  addMonths,
  debounce,
  throttle,
  memoize,
  once,
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  clearAllStorage,
  getStorageSize,
  chunkArray,
  uniqueArray,
  sortArray,
  groupBy,
  sum,
  average,
  deepClone,
  deepMerge,
  isObject,
  pick,
  omit,
  addListener,
  waitForElement,
  copyToClipboard,
  downloadFile,
  isEmpty,
  clamp,
  generateUUID,
  sleep
};
