module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Coverage configuration
  collectCoverageFrom: [
    'backend/**/*.js',
    'src/scripts/**/*.js',
    '!backend/**/*.test.js',
    '!backend/**/*.spec.js',
    '!src/scripts/**/*.test.js',
    '!src/scripts/**/*.spec.js',
    '!backend/node_modules/**',
    '!backend/logs/**',
    '!backend/data/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 75,
      statements: 75
    }
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/backend/$1'
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 30000,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/backend/data/',
    '/logs/'
  ],

  // Transform files - disable to use scripts as-is
  transform: {},

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],

  // Max workers
  maxWorkers: '50%',

  // Bail on first failure
  bail: 1
};

