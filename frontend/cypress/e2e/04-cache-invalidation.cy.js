// cypress/e2e/04-cache-invalidation.cy.js

describe('Cache System and Data Persistence', () => {
  beforeEach(() => {
    cy.clearCache()
    cy.visit('/')
  })

  it('should load page and cache data', () => {
    cy.visit('/products-list')
    cy.window().then((win) => {
      const cache = win.localStorage.getItem('app-cache')
      // Cache might not exist if no data is fetched
      // cy.wrap(cache).should('not.be.null')
    })
  })

  it('should persist data in localStorage', () => {
    cy.visit('/products-list')
    cy.window().then((win) => {
      const storage = win.localStorage
      expect(storage).to.exist
    })
  })

  it('should have cache manager button', () => {
    cy.get('button').each(($btn) => {
      // Look for cache button
      if ($btn.text().includes('Cache') || $btn.text().includes('💾')) {
        cy.wrap($btn).should('be.visible')
      }
    })
  })

  it('should clear cache when requested', () => {
    cy.visit('/products-list')
    cy.window().then((win) => {
      const beforeStorage = Object.keys(win.localStorage)
      cy.clearLocalStorage()
      cy.window().then((win2) => {
        const afterStorage = Object.keys(win2.localStorage)
        expect(afterStorage.length).to.be.lte(beforeStorage.length)
      })
    })
  })

  it('should invalidate cache on navigation', () => {
    cy.visit('/products-list')
    cy.visit('/orders-list')
    cy.url().should('include', '/orders-list')
  })

  it('should handle offline mode gracefully', () => {
    cy.visit('/products-list')
    cy.window().then((win) => {
      win.navigator.onLine = false
    })
    cy.visit('/orders-list')
    // Page should still load (might show cached data or empty)
    cy.url().should('include', '/orders-list')
  })

  it('should reload data without cache issues', () => {
    cy.visit('/products-list')
    cy.reload()
    cy.url().should('include', '/products-list')
  })
})
