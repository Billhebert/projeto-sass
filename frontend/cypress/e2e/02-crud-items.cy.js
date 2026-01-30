// cypress/e2e/02-crud-items.cy.js

describe('Items CRUD Operations', () => {
  beforeEach(() => {
    cy.clearCache()
    cy.visit('/products-list')
  })

  it('should load items list page', () => {
    cy.url().should('include', '/products-list')
  })

  it('should display items list title', () => {
    cy.contains('h1, h2, .page-title', /Products|Items|Produtos/i).should('be.visible')
  })

  it('should display items table or list', () => {
    cy.get('table, [data-testid="list"], .data-list, .items-container').should('exist')
  })

  it('should have create button', () => {
    cy.contains('button, a', /Create|Add|New|Criar|Adicionar/i).should('be.visible')
  })

  it('should open create modal on button click', () => {
    cy.contains('button', /Create|Add|New|Criar|Adicionar/i).click({ force: true })
    cy.get('[data-testid="modal"], .modal, dialog').should('be.visible')
  })

  it('should have form fields in create modal', () => {
    cy.contains('button', /Create|Add|New|Criar|Adicionar/i).click({ force: true })
    cy.get('input, textarea, select').should('have.length.greaterThan', 0)
  })

  it('should close modal on cancel', () => {
    cy.contains('button', /Create|Add|New|Criar|Adicionar/i).click({ force: true })
    cy.contains('button', /Cancel|Close|Cancelar|Fechar/i).click({ force: true })
    cy.get('[data-testid="modal"], .modal, dialog').should('not.be.visible')
  })

  it('should have pagination controls', () => {
    cy.get('[data-testid="pagination"], .pagination, button:contains("Next"), button:contains("Previous")').should('exist')
  })

  it('should have filter/search functionality', () => {
    cy.get('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').should('exist')
  })

  it('should handle list page navigation', () => {
    cy.contains('a, button', /Orders|Orders|Pedidos|Vendas/i).click({ force: true })
    cy.url().should('include', '/orders-list')
  })
})
