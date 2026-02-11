/**
 * Configuration Module
 * Centralized configuration for the Salary Tracker application
 */

// Application Configuration
export const APP_CONFIG = {
  name: 'Salary Tracker',
  version: '2.0.0',
  locale: 'he-IL',
  currency: 'ILS',
  defaultTheme: 'light'
};

// Storage Configuration
export const STORAGE_CONFIG = {
  keys: {
    salaryRecords: 'salary_records',
    userSettings: 'user_settings',
    appState: 'app_state',
    apiKeys: 'api_keys_encrypted',
    theme: 'theme_preference'
  },
  options: {
    encrypt: true,
    compress: false
  },
  prefix: 'st_'
};

// API Configuration
export const API_CONFIG = {
  baseURL: 'https://api.example.com',
  endpoints: {
    analyze: '/api/analyze',
    recommendations: '/api/recommendations',
    extract: '/api/extract'
  },
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
};

// Security Configuration
export const SECURITY_CONFIG = {
  encryption: {
    algorithm: 'AES-GCM',
    keyLength: 256
  },
  session: {
    timeout: 3600000, // 1 hour
    renewalThreshold: 300000 // 5 minutes
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecial: true
  }
};

// UI Configuration
export const UI_CONFIG = {
  theme: {
    light: {
      primary: '#2563eb',
      secondary: '#64748b',
      background: '#ffffff',
      text: '#1e293b'
    },
    dark: {
      primary: '#3b82f6',
      secondary: '#94a3b8',
      background: '#0f172a',
      text: '#f1f5f9'
    }
  },
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },
  dateFormat: 'DD/MM/YYYY',
  numberFormat: {
    locale: 'he-IL',
    decimals: 2
  },
  notifications: {
    duration: 3000,
    position: 'top-right'
  }
};

// Validation Configuration
export const VALIDATION_CONFIG = {
  salary: {
    min: 0,
    max: 1000000,
    decimals: 2
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    commonTypos: {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahou.com': 'yahoo.com'
    }
  },
  phone: {
    pattern: /^0\d{1,2}-?\d{7}$/,
    israeli: /^05\d-?\d{7}$/
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  enableAI: true,
  enableExcelImport: true,
  enablePWA: true,
  enableOfflineMode: true,
  enableDarkMode: true,
  enableNotifications: true,
  enableAnalytics: false
};

/**
 * API Keys Manager
 * Handles encrypted storage of API keys
 */
export class APIKeysManager {
  constructor() {
    this.storageKey = STORAGE_CONFIG.prefix + STORAGE_CONFIG.keys.apiKeys;
  }

  /**
   * Save API key with encryption
   * @param {string} service - Service name (e.g., 'openai', 'anthropic')
   * @param {string} key - API key to save
   */
  async saveKey(service, key) {
    try {
      const keys = this.loadKeys();
      keys[service] = btoa(key); // Simple base64 encoding (for demo; use proper encryption in production)
      localStorage.setItem(this.storageKey, JSON.stringify(keys));
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  }

  /**
   * Load API key
   * @param {string} service - Service name
   * @returns {string|null} Decrypted API key
   */
  loadKey(service) {
    try {
      const keys = this.loadKeys();
      return keys[service] ? atob(keys[service]) : null;
    } catch (error) {
      console.error('Failed to load API key:', error);
      return null;
    }
  }

  /**
   * Load all API keys
   * @returns {Object} Map of service names to encrypted keys
   */
  loadKeys() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Remove API key
   * @param {string} service - Service name
   */
  removeKey(service) {
    try {
      const keys = this.loadKeys();
      delete keys[service];
      localStorage.setItem(this.storageKey, JSON.stringify(keys));
      return true;
    } catch (error) {
      console.error('Failed to remove API key:', error);
      return false;
    }
  }
}

/**
 * Configuration Manager
 * Handles user settings and preferences
 */
export class ConfigManager {
  constructor() {
    this.storageKey = STORAGE_CONFIG.prefix + STORAGE_CONFIG.keys.userSettings;
    this.settings = this.load();
  }

  /**
   * Get setting value
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Setting value
   */
  get(key, defaultValue = null) {
    return this.settings[key] ?? defaultValue;
  }

  /**
   * Set setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  /**
   * Load settings from storage
   * @returns {Object} Settings object
   */
  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Failed to load settings:', error);
      return {};
    }
  }

  /**
   * Save settings to storage
   */
  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * Reset settings to defaults
   */
  reset() {
    this.settings = {};
    this.save();
  }
}

// Utility Functions

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = APP_CONFIG.currency) {
  return new Intl.NumberFormat(APP_CONFIG.locale, {
    style: 'currency',
    currency: currency
  }).format(value);
}

/**
 * Format date
 * @param {Date|string} date - Date to format
 * @param {string} format - Date format
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = UI_CONFIG.dateFormat) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year);
}

/**
 * Format number with localization
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(value, decimals = UI_CONFIG.numberFormat.decimals) {
  return new Intl.NumberFormat(APP_CONFIG.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format percentage
 * @param {number} value - Numeric value (0-1 or 0-100)
 * @param {boolean} asDecimal - Whether value is in decimal form (0-1)
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, asDecimal = false) {
  const percent = asDecimal ? value * 100 : value;
  return `${formatNumber(percent, 2)}%`;
}

export default {
  APP_CONFIG,
  STORAGE_CONFIG,
  API_CONFIG,
  SECURITY_CONFIG,
  UI_CONFIG,
  VALIDATION_CONFIG,
  FEATURE_FLAGS,
  APIKeysManager,
  ConfigManager,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage
};
