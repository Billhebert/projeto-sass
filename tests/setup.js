/**
 * Jest Test Setup File
 * Configures global test environment and utilities
 */

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

// Reset mocks before each test
beforeEach(() => {
  if (localStorage.getItem.mockClear) localStorage.getItem.mockClear();
  if (localStorage.setItem.mockClear) localStorage.setItem.mockClear();
  if (localStorage.removeItem.mockClear) localStorage.removeItem.mockClear();
  if (localStorage.clear.mockClear) localStorage.clear.mockClear();
  
  if (sessionStorage.getItem.mockClear) sessionStorage.getItem.mockClear();
  if (sessionStorage.setItem.mockClear) sessionStorage.setItem.mockClear();
  if (sessionStorage.removeItem.mockClear) sessionStorage.removeItem.mockClear();
  if (sessionStorage.clear.mockClear) sessionStorage.clear.mockClear();
  
  if (console.error.mockClear) console.error.mockClear();
  if (console.warn.mockClear) console.warn.mockClear();
  if (console.info.mockClear) console.info.mockClear();
  if (console.debug.mockClear) console.debug.mockClear();
  if (console.log.mockClear) console.log.mockClear();
});

// Define test helper functions
global.testHelpers = {
  mockStorageItem(key, value) {
    localStorage.getItem.mockReturnValueOnce(
      typeof value === 'string' ? value : JSON.stringify(value)
    );
  },

  mockStorageError() {
    localStorage.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
  },

  mockDocumentElement(html = '') {
    document.body.innerHTML = html;
  },

  expectConsoleError(fn, count = 1) {
    fn();
    expect(console.error).toHaveBeenCalledTimes(count);
  }
};
