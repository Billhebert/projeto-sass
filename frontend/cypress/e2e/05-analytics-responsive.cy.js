// cypress/e2e/05-analytics-responsive.cy.js

describe('Analytics and Responsive Design', () => {
  it('should display analytics page', () => {
    cy.visit('/analytics')
    cy.url().should('include', '/analytics')
  })

  it('should have time range selector', () => {
    cy.visit('/analytics')
    cy.contains('button, select, div', /7|30|90|days|dias/i).should('exist')
  })

  it('should display analytics charts', () => {
    cy.visit('/analytics')
    cy.get('.recharts-wrapper, [data-testid="chart"]').should('have.length.greaterThan', 0)
  })

  it('should display analytics table', () => {
    cy.visit('/analytics')
    cy.get('table, [data-testid="analytics-table"]').should('exist')
  })

  it('should be responsive on mobile', () => {
    cy.viewport('iphone-x')
    cy.visit('/')
    cy.get('nav, aside, [data-testid="sidebar"]').should('be.visible')
  })

  it('should be responsive on tablet', () => {
    cy.viewport('ipad-2')
    cy.visit('/')
    cy.get('nav, aside, [data-testid="sidebar"]').should('be.visible')
  })

  it('should be responsive on desktop', () => {
    cy.viewport(1920, 1080)
    cy.visit('/')
    cy.get('nav, aside, [data-testid="sidebar"]').should('be.visible')
  })

  it('should handle mobile navigation', () => {
    cy.viewport('iphone-x')
    cy.visit('/')
    // Should have mobile menu or navigation
    cy.get('nav, aside, button[aria-label*="menu"], button[aria-label*="Menu"]').should('exist')
  })

  it('should display charts correctly on mobile', () => {
    cy.viewport('iphone-x')
    cy.visit('/analytics')
    cy.get('.recharts-wrapper, [data-testid="chart"]').should('have.length.greaterThan', 0)
  })

  it('should maintain layout on small screens', () => {
    cy.viewport(375, 667)
    cy.visit('/products-list')
    cy.get('table, [data-testid="list"], .data-list').should('exist')
  })
})
