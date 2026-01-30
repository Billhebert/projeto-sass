// cypress/e2e/01-dashboard.cy.js

describe('Dashboard Page', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('should load dashboard page', () => {
    cy.url().should('eq', 'http://localhost:5173/')
  })

  it('should display dashboard title', () => {
    cy.contains('h1, h2, .page-title', /Dashboard|Painel/i).should('be.visible')
  })

  it('should display KPI cards', () => {
    cy.get('[data-testid="kpi-card"], .kpi-card, .metric-card').should('have.length.greaterThan', 0)
  })

  it('should display charts', () => {
    cy.get('.recharts-wrapper, [data-testid="chart"]').should('have.length.greaterThan', 0)
  })

  it('should have sidebar navigation', () => {
    cy.get('nav, aside, [data-testid="sidebar"]').should('be.visible')
  })

  it('should navigate to items list', () => {
    cy.contains('a, button', /Products|Produtos|Items/i).click({ force: true })
    cy.url().should('include', '/products-list')
  })

  it('should display cache manager button', () => {
    cy.get('[data-testid="cache-button"], button:contains("Cache"), button:contains("💾")').should('exist')
  })

  it('should have responsive layout', () => {
    cy.viewport('iphone-x')
    cy.get('nav, aside, [data-testid="sidebar"]').should('be.visible')
  })
})
