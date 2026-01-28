// Cypress support file - runs before each test

// Disable error handling to see all errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent Cypress from failing the test
  return false
})

// Custom command to login
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login')
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)
  cy.get('button').contains('Entrar').click()
  cy.url().should('include', '/')
})

// Custom command to create account
Cypress.Commands.add('createAccount', (data) => {
  cy.visit('/accounts')
  cy.get('button').contains('Nova Conta').click()
  cy.get('input[name="account_name"]').type(data.accountName)
  cy.get('input[name="mercado_livre_user"]').type(data.mlUser)
  cy.get('button').contains('Salvar').click()
})
