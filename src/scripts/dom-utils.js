/**
 * DOM Utilities Module
 * Provides safe DOM manipulation with error handling and null checks
 * Prevents errors from missing elements and improves reliability
 */

const domUtils = (() => {
  // Configuration
  const CONFIG = {
    throwOnMissing: false, // If true, throws error; if false, logs warning and returns null
    enableLogging: true,
    logLevel: 'warn' // 'error', 'warn', 'info', 'debug'
  };

  // Logger utility
  const logger = {
    error: (message, data) => {
      if (CONFIG.enableLogging && ['error', 'warn', 'info', 'debug'].includes(CONFIG.logLevel)) {
        console.error(`[DOMUtils Error] ${message}`, data || '');
      }
    },
    warn: (message, data) => {
      if (CONFIG.enableLogging && ['warn', 'info', 'debug'].includes(CONFIG.logLevel)) {
        console.warn(`[DOMUtils Warn] ${message}`, data || '');
      }
    },
    info: (message, data) => {
      if (CONFIG.enableLogging && ['info', 'debug'].includes(CONFIG.logLevel)) {
        console.log(`[DOMUtils Info] ${message}`, data || '');
      }
    },
    debug: (message, data) => {
      if (CONFIG.enableLogging && ['debug'].includes(CONFIG.logLevel)) {
        console.log(`[DOMUtils Debug] ${message}`, data || '');
      }
    }
  };

  /**
   * Safely get element by ID
   * @param {string} id - Element ID
   * @param {string} errorContext - Additional context for error messages
   * @returns {HTMLElement|null} - Element or null if not found
   */
  function getElementById(id, errorContext = '') {
    try {
      if (typeof id !== 'string' || !id.trim()) {
        logger.warn('Invalid ID for getElementById', { id, context: errorContext });
        return null;
      }

      const element = document.getElementById(id);
      if (!element) {
        logger.warn('Element not found by ID', { id, context: errorContext });
        return null;
      }

      return element;
    } catch (error) {
      logger.error('getElementById failed', { id, error: error.message, context: errorContext });
      return null;
    }
  }

  /**
   * Safely query element
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (defaults to document)
   * @param {string} errorContext - Additional context for error messages
   * @returns {HTMLElement|null} - Element or null if not found
   */
  function querySelector(selector, parent = document, errorContext = '') {
    try {
      if (typeof selector !== 'string' || !selector.trim()) {
        logger.warn('Invalid selector for querySelector', { selector, context: errorContext });
        return null;
      }

      if (parent && typeof parent.querySelector !== 'function') {
        logger.warn('Invalid parent element for querySelector', { context: errorContext });
        return null;
      }

      const element = parent.querySelector(selector);
      if (!element) {
        logger.debug('Element not found by selector', { selector, context: errorContext });
        return null;
      }

      return element;
    } catch (error) {
      logger.error('querySelector failed', { selector, error: error.message, context: errorContext });
      return null;
    }
  }

  /**
   * Safely query all elements
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (defaults to document)
   * @param {string} errorContext - Additional context for error messages
   * @returns {array} - Array of elements (empty array if none found)
   */
  function querySelectorAll(selector, parent = document, errorContext = '') {
    try {
      if (typeof selector !== 'string' || !selector.trim()) {
        logger.warn('Invalid selector for querySelectorAll', { selector, context: errorContext });
        return [];
      }

      if (parent && typeof parent.querySelectorAll !== 'function') {
        logger.warn('Invalid parent element for querySelectorAll', { context: errorContext });
        return [];
      }

      const elements = parent.querySelectorAll(selector);
      return Array.from(elements || []);
    } catch (error) {
      logger.error('querySelectorAll failed', { selector, error: error.message, context: errorContext });
      return [];
    }
  }

  /**
   * Safely set text content
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} text - Text to set
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function setText(element, text, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.textContent === 'undefined') {
        logger.warn('Invalid element for setText', { element, context: errorContext });
        return false;
      }

      el.textContent = text || '';
      logger.debug('setText successful', { context: errorContext });
      return true;
    } catch (error) {
      logger.error('setText failed', { error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely set HTML content
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} html - HTML to set
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function setHTML(element, html, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.innerHTML === 'undefined') {
        logger.warn('Invalid element for setHTML', { element, context: errorContext });
        return false;
      }

      // XSS Prevention: Use textContent for untrusted content, or sanitize HTML if needed
      el.innerHTML = html || '';
      logger.debug('setHTML successful', { context: errorContext });
      return true;
    } catch (error) {
      logger.error('setHTML failed', { error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely get text content
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} defaultValue - Default value if element not found
   * @param {string} errorContext - Additional context for error messages
   * @returns {string} - Element text or defaultValue
   */
  function getText(element, defaultValue = '', errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.textContent === 'undefined') {
        logger.warn('Invalid element for getText', { element, context: errorContext });
        return defaultValue;
      }

      return el.textContent || defaultValue;
    } catch (error) {
      logger.error('getText failed', { error: error.message, context: errorContext });
      return defaultValue;
    }
  }

  /**
   * Safely set attribute
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} attribute - Attribute name
   * @param {string} value - Attribute value
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function setAttribute(element, attribute, value, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.setAttribute !== 'function') {
        logger.warn('Invalid element for setAttribute', { element, context: errorContext });
        return false;
      }

      el.setAttribute(attribute, value || '');
      logger.debug('setAttribute successful', { attribute, context: errorContext });
      return true;
    } catch (error) {
      logger.error('setAttribute failed', { attribute, error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely get attribute
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} attribute - Attribute name
   * @param {string} defaultValue - Default value if not found
   * @param {string} errorContext - Additional context for error messages
   * @returns {string|null} - Attribute value or defaultValue
   */
  function getAttribute(element, attribute, defaultValue = null, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.getAttribute !== 'function') {
        logger.warn('Invalid element for getAttribute', { element, context: errorContext });
        return defaultValue;
      }

      const value = el.getAttribute(attribute);
      return value !== null ? value : defaultValue;
    } catch (error) {
      logger.error('getAttribute failed', { attribute, error: error.message, context: errorContext });
      return defaultValue;
    }
  }

  /**
   * Safely add class
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} className - Class name
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function addClass(element, className, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || !el.classList) {
        logger.warn('Invalid element for addClass', { element, context: errorContext });
        return false;
      }

      el.classList.add(className);
      logger.debug('addClass successful', { className, context: errorContext });
      return true;
    } catch (error) {
      logger.error('addClass failed', { className, error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely remove class
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} className - Class name
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function removeClass(element, className, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || !el.classList) {
        logger.warn('Invalid element for removeClass', { element, context: errorContext });
        return false;
      }

      el.classList.remove(className);
      logger.debug('removeClass successful', { className, context: errorContext });
      return true;
    } catch (error) {
      logger.error('removeClass failed', { className, error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely toggle class
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} className - Class name
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Class is now present
   */
  function toggleClass(element, className, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || !el.classList) {
        logger.warn('Invalid element for toggleClass', { element, context: errorContext });
        return false;
      }

      const hasClass = el.classList.toggle(className);
      logger.debug('toggleClass successful', { className, context: errorContext });
      return hasClass;
    } catch (error) {
      logger.error('toggleClass failed', { className, error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely add event listener
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} event - Event name
   * @param {function} handler - Event handler function
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function addEventListener(element, event, handler, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || typeof el.addEventListener !== 'function') {
        logger.warn('Invalid element for addEventListener', { element, context: errorContext });
        return false;
      }

      if (typeof handler !== 'function') {
        logger.warn('Invalid handler for addEventListener', { event, context: errorContext });
        return false;
      }

      el.addEventListener(event, handler);
      logger.debug('addEventListener successful', { event, context: errorContext });
      return true;
    } catch (error) {
      logger.error('addEventListener failed', { event, error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely check if element is visible
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Visibility status
   */
  function isVisible(element, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el) {
        logger.debug('Element not found for isVisible check', { context: errorContext });
        return false;
      }

      return el.offsetParent !== null;
    } catch (error) {
      logger.error('isVisible check failed', { error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely show element
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function show(element, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || !el.style) {
        logger.warn('Invalid element for show', { element, context: errorContext });
        return false;
      }

      el.style.display = '';
      logger.debug('show successful', { context: errorContext });
      return true;
    } catch (error) {
      logger.error('show failed', { error: error.message, context: errorContext });
      return false;
    }
  }

  /**
   * Safely hide element
   * @param {HTMLElement|string} element - Element or element ID
   * @param {string} errorContext - Additional context for error messages
   * @returns {boolean} - Success status
   */
  function hide(element, errorContext = '') {
    try {
      let el = element;
      
      if (typeof element === 'string') {
        el = getElementById(element, errorContext);
      }

      if (!el || !el.style) {
        logger.warn('Invalid element for hide', { element, context: errorContext });
        return false;
      }

      el.style.display = 'none';
      logger.debug('hide successful', { context: errorContext });
      return true;
    } catch (error) {
      logger.error('hide failed', { error: error.message, context: errorContext });
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
    logger.info('DOM utils configured', { config: CONFIG });
  }

  return {
    // Query methods
    getElementById,
    querySelector,
    querySelectorAll,
    
    // Content methods
    setText,
    getText,
    setHTML,
    
    // Attribute methods
    setAttribute,
    getAttribute,
    
    // Class methods
    addClass,
    removeClass,
    toggleClass,
    
    // Event methods
    addEventListener,
    
    // Visibility methods
    isVisible,
    show,
    hide,
    
    // Configuration
    configure,
    CONFIG
  };
})();
