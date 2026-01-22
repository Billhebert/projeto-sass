module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Coverage configuration
  collectCoverageFrom: [
    'src/scripts/**/*.js',
    '!src/scripts/**/*.test.js',
    '!src/scripts/**/*.spec.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Transform files - disable to use scripts as-is
  transform: {},

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node']
};
