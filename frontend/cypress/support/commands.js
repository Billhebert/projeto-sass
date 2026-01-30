// cypress/support/commands.js

// Login command
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password') => {
  cy.visit('/')
  // If there's a login page, implement login here
  // cy.get('input[type="email"]').type(email)
  // cy.get('input[type="password"]').type(password)
  // cy.get('button[type="submit"]').click()
  // cy.url().should('include', '/dashboard')
})

// Navigate command
Cypress.Commands.add('navigate', (path) => {
  cy.visit(path)
  cy.url().should('include', path)
})

// Wait for data loading
Cypress.Commands.add('waitForDataLoad', () => {
  cy.get('[data-testid="loading"]', { timeout: 10000 }).should('not.exist')
})

// Check toast notification
Cypress.Commands.add('checkToast', (message) => {
  cy.contains(message, { timeout: 5000 }).should('be.visible')
})

// Clear cache
Cypress.Commands.add('clearCache', () => {
  cy.clearLocalStorage()
  cy.clearCookies()
})
