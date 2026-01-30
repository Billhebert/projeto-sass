// cypress/e2e/03-navigation.cy.js

describe('Navigation and Routing', () => {
  beforeEach(() => {
    cy.clearCache()
    cy.visit('/')
  })

  it('should navigate to dashboard', () => {
    cy.visit('/')
    cy.url().should('eq', 'http://localhost:5173/')
  })

  it('should navigate to analytics', () => {
    cy.contains('a, button', /Analytics|Análise/i).click({ force: true })
    cy.url().should('include', '/analytics')
  })

  it('should navigate to items list', () => {
    cy.contains('a, button', /Products|Items|Produtos/i).click({ force: true })
    cy.url().should('include', '/products-list')
  })

  it('should navigate to orders', () => {
    cy.contains('a, button', /Orders|Vendas|Pedidos/i).click({ force: true })
    cy.url().should('include', '/orders-list')
  })

  it('should navigate to shipping', () => {
    cy.contains('a, button', /Shipping|Envios|Frete/i).click({ force: true })
    cy.url().should('include', '/shipping-list')
  })

  it('should navigate to questions', () => {
    cy.contains('a, button', /Questions|Perguntas/i).click({ force: true })
    cy.url().should('include', '/questions-list')
  })

  it('should navigate to feedback', () => {
    cy.contains('a, button', /Feedback|Reviews|Avaliações/i).click({ force: true })
    cy.url().should('include', '/feedback-list')
  })

  it('should navigate to categories', () => {
    cy.contains('a, button', /Categories|Categorias/i).click({ force: true })
    cy.url().should('include', '/categories')
  })

  it('should maintain navigation state', () => {
    cy.contains('a, button', /Products|Items|Produtos/i).click({ force: true })
    cy.url().should('include', '/products-list')
    cy.contains('a, button', /Dashboard|Painel/i).click({ force: true })
    cy.url().should('eq', 'http://localhost:5173/')
  })

  it('should have breadcrumb or page indicator', () => {
    cy.contains('a, button', /Products|Items|Produtos/i).click({ force: true })
    cy.contains('h1, h2, .page-title, .breadcrumb', /Products|Items|Produtos/i).should('be.visible')
  })
})
