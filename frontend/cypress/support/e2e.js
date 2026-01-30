// cypress/support/e2e.js

// Import commands
import './commands'

// Disable uncaught exception handling to focus on actual test failures
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  // This helps with third-party errors that don't affect functionality
  return false
})

// Set test timeout
Cypress.config('defaultCommandTimeout', 5000)
Cypress.config('requestTimeout', 5000)
