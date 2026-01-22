/**
 * Storage Utilities Module
 * Provides safe, validated access to localStorage with comprehensive error handling
 * Can be used across all modules to ensure consistent error handling and validation
 */

const storageUtils = (() => {
  // Configuration
  const CONFIG = {
    maxSize: 5 * 1024 * 1024, // 5MB max per item
    enableLogging: true,
    logLevel: 'warn' // 'error', 'warn', 'info', 'debug'
  };

  // Logger utility
  const logger = {
    error: (message, data) => {
      if (CONFIG.enableLogging && ['error', 'warn', 'info', 'debug'].includes(CONFIG.logLevel)) {
        console.error(`[StorageUtils Error] ${message}`, data || '');
      }
    },
    warn: (message, data) => {
      if (CONFIG.enableLogging && ['warn', 'info', 'debug'].includes(CONFIG.logLevel)) {
        console.warn(`[StorageUtils Warn] ${message}`, data || '');
      }
    },
    info: (message, data) => {
      if (CONFIG.enableLogging && ['info', 'debug'].includes(CONFIG.logLevel)) {
        console.log(`[StorageUtils Info] ${message}`, data || '');
      }
    },
    debug: (message, data) => {
      if (CONFIG.enableLogging && ['debug'].includes(CONFIG.logLevel)) {
        console.log(`[StorageUtils Debug] ${message}`, data || '');
      }
    }
  };

  /**
   * Safe get from localStorage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Value to return if key doesn't exist or error occurs
   * @returns {*} - Value from storage or defaultValue
   */
  function getItem(key, defaultValue = null) {
    try {
      if (typeof key !== 'string' || !key.trim()) {
        logger.warn('Invalid key for getItem', { key });
        return defaultValue;
      }

      const value = localStorage.getItem(key);
      
      if (value === null) {
        logger.debug('Key not found in localStorage', { key });
        return defaultValue;
      }

      return value;
    } catch (error) {
      logger.error('localStorage.getItem failed', { key, error: error.message });
      return defaultValue;
    }
  }

  /**
   * Safe set to localStorage
   * @param {string} key - Storage key
   * @param {string} value - Value to store (must be string or will be stringified)
   * @returns {boolean} - Success status
   */
  function setItem(key, value) {
    try {
      if (typeof key !== 'string' || !key.trim()) {
        logger.warn('Invalid key for setItem', { key });
        return false;
      }

      // Ensure value is string
      let stringValue = value;
      if (typeof value !== 'string') {
        try {
          stringValue = JSON.stringify(value);
        } catch (err) {
          logger.error('Failed to stringify value for setItem', { key, error: err.message });
          return false;
        }
      }

      // Check size
      if (stringValue.length > CONFIG.maxSize) {
        logger.error('Value exceeds max size for setItem', { key, size: stringValue.length });
        return false;
      }

      localStorage.setItem(key, stringValue);
      logger.debug('setItem successful', { key });
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.error('localStorage quota exceeded', { key });
      } else {
        logger.error('localStorage.setItem failed', { key, error: error.message });
      }
      return false;
    }
  }

  /**
   * Safe remove from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} - Success status
   */
  function removeItem(key) {
    try {
      if (typeof key !== 'string' || !key.trim()) {
        logger.warn('Invalid key for removeItem', { key });
        return false;
      }

      localStorage.removeItem(key);
      logger.debug('removeItem successful', { key });
      return true;
    } catch (error) {
      logger.error('localStorage.removeItem failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Safe JSON parse and get
   * @param {string} key - Storage key
   * @param {*} defaultValue - Value to return if parsing fails
   * @param {string} expectedType - Expected type ('array' or 'object')
   * @returns {*} - Parsed value or defaultValue
   */
  function getJSON(key, defaultValue = null, expectedType = null) {
    try {
      const jsonString = getItem(key);

      if (jsonString === null || jsonString === undefined || jsonString === '') {
        logger.debug('Key not found, returning default', { key });
        return defaultValue;
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error('JSON.parse failed', { key, error: parseError.message });
        return defaultValue;
      }

      // Validate expected type
      if (expectedType === 'array') {
        if (!Array.isArray(parsed)) {
          logger.warn('Expected array but got different type', { key, type: typeof parsed });
          return Array.isArray(defaultValue) ? defaultValue : [];
        }
      } else if (expectedType === 'object') {
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          logger.warn('Expected object but got different type', { key, type: typeof parsed });
          return typeof defaultValue === 'object' && !Array.isArray(defaultValue) ? defaultValue : {};
        }
      }

      logger.debug('getJSON successful', { key });
      return parsed;
    } catch (error) {
      logger.error('getJSON failed', { key, error: error.message });
      return defaultValue;
    }
  }

  /**
   * Safe JSON stringify and set
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {boolean} - Success status
   */
  function setJSON(key, value) {
    try {
      let jsonString;
      try {
        jsonString = JSON.stringify(value);
      } catch (stringifyError) {
        logger.error('JSON.stringify failed', { key, error: stringifyError.message });
        return false;
      }

      const success = setItem(key, jsonString);
      if (success) {
        logger.debug('setJSON successful', { key });
      }
      return success;
    } catch (error) {
      logger.error('setJSON failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get array from storage with validation
   * @param {string} key - Storage key
   * @param {array} defaultValue - Default array
   * @returns {array} - Array from storage or default
   */
  function getArray(key, defaultValue = []) {
    return getJSON(key, defaultValue, 'array');
  }

  /**
   * Set array to storage
   * @param {string} key - Storage key
   * @param {array} value - Array to store
   * @returns {boolean} - Success status
   */
  function setArray(key, value) {
    if (!Array.isArray(value)) {
      logger.warn('setArray expects array', { key, type: typeof value });
      return false;
    }
    return setJSON(key, value);
  }

  /**
   * Get object from storage with validation
   * @param {string} key - Storage key
   * @param {object} defaultValue - Default object
   * @returns {object} - Object from storage or default
   */
  function getObject(key, defaultValue = {}) {
    return getJSON(key, defaultValue, 'object');
  }

  /**
   * Set object to storage
   * @param {string} key - Storage key
   * @param {object} value - Object to store
   * @returns {boolean} - Success status
   */
  function setObject(key, value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      logger.warn('setObject expects object', { key, type: typeof value });
      return false;
    }
    return setJSON(key, value);
  }

  /**
   * Clear all storage
   * @returns {boolean} - Success status
   */
  function clear() {
    try {
      localStorage.clear();
      logger.info('localStorage cleared');
      return true;
    } catch (error) {
      logger.error('localStorage.clear failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get storage size (rough estimate)
   * @returns {number} - Approximate size in bytes
   */
  function getStorageSize() {
    try {
      let size = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          size += localStorage[key].length + key.length;
        }
      }
      logger.debug('Storage size calculated', { size });
      return size;
    } catch (error) {
      logger.error('getStorageSize failed', { error: error.message });
      return 0;
    }
  }

  /**
   * Get all keys in storage
   * @returns {array} - Array of keys
   */
  function getAllKeys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      logger.debug('Retrieved all keys', { count: keys.length });
      return keys;
    } catch (error) {
      logger.error('getAllKeys failed', { error: error.message });
      return [];
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Storage key
   * @returns {boolean} - Key existence
   */
  function hasKey(key) {
    try {
      return localStorage.hasOwnProperty(key);
    } catch (error) {
      logger.error('hasKey failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Update configuration
   * @param {object} newConfig - Partial configuration object
   */
  function configure(newConfig) {
    if (typeof newConfig !== 'object' || newConfig === null) {
      logger.warn('Invalid config for configure');
      return;
    }

    Object.assign(CONFIG, newConfig);
    logger.info('Storage utils configured', { config: CONFIG });
  }

  return {
    // Core methods
    getItem,
    setItem,
    removeItem,
    clear,
    
    // JSON methods
    getJSON,
    setJSON,
    
    // Type-specific methods
    getArray,
    setArray,
    getObject,
    setObject,
    
    // Utility methods
    getStorageSize,
    getAllKeys,
    hasKey,
    configure,
    
    // Configuration
    CONFIG
  };
})();
