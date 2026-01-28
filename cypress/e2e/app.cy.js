describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('displays login form', () => {
    cy.contains('Projeto SASS').should('be.visible')
    cy.contains('Login').should('be.visible')
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
  })

  it('shows error with invalid credentials', () => {
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('button').contains('Entrar').click()
    cy.contains('Invalid email or password').should('be.visible')
  })

  it('allows navigation to register page', () => {
    cy.contains('Criar conta').click()
    cy.url().should('include', '/register')
    cy.contains('Registre-se').should('be.visible')
  })
})

describe('Dashboard Navigation', () => {
  beforeEach(() => {
    // Mock successful login - comment out or modify based on your test setup
    cy.visit('/')
  })

  it('displays sidebar navigation', () => {
    // This test would run after authentication
    // cy.contains('Dashboard').should('be.visible')
    // cy.contains('Contas ML').should('be.visible')
    // cy.contains('Relatórios').should('be.visible')
    // cy.contains('Configurações').should('be.visible')
  })
})

describe('Accounts Page', () => {
  beforeEach(() => {
    // Setup: Login before accessing accounts
    // cy.login('test@example.com', 'password')
    // cy.visit('/accounts')
  })

  it('displays accounts list', () => {
    // cy.contains('Contas').should('be.visible')
    // cy.get('table').should('be.visible')
  })

  it('allows creating new account', () => {
    // cy.get('button').contains('Nova Conta').click()
    // cy.get('input[name="account_name"]').type('Test Account')
    // cy.get('button').contains('Salvar').click()
    // cy.contains('Conta criada com sucesso').should('be.visible')
  })
})

describe('Reports Page', () => {
  beforeEach(() => {
    // cy.login('test@example.com', 'password')
    // cy.visit('/reports')
  })

  it('displays reports with charts', () => {
    // cy.contains('Relatórios').should('be.visible')
    // cy.get('canvas').should('be.visible')
  })
})
