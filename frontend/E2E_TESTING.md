# E2E Testing Guide

## Cypress Installation and Configuration

Cypress has been installed and configured for end-to-end testing.

### Test Files

#### `01-dashboard.cy.js`
Tests for the Dashboard page:
- Page loading and URL verification
- Dashboard title display
- KPI cards rendering
- Charts rendering
- Sidebar navigation
- Navigation to Items list
- Cache manager button visibility
- Responsive layout

#### `02-crud-items.cy.js`
Tests for CRUD operations on Items:
- Items list page loading
- Items table/list display
- Create button functionality
- Create modal opening
- Form fields in modal
- Modal close functionality
- Pagination controls
- Filter/search functionality
- Navigation to other CRUD pages

#### `03-navigation.cy.js`
Tests for page navigation:
- Dashboard navigation
- Analytics navigation
- Items list navigation
- Orders navigation
- Shipping navigation
- Questions navigation
- Feedback navigation
- Categories navigation
- Navigation state persistence
- Page indicators/breadcrumbs

#### `04-cache-invalidation.cy.js`
Tests for cache system:
- Data caching and localStorage
- Cache persistence
- Cache manager button
- Cache clearing
- Cache invalidation on navigation
- Offline mode handling
- Data reload without cache issues

#### `05-analytics-responsive.cy.js`
Tests for Analytics and responsive design:
- Analytics page display
- Time range selector
- Analytics charts
- Analytics table
- Mobile responsiveness (iPhone X)
- Tablet responsiveness (iPad 2)
- Desktop responsiveness (1920x1080)
- Mobile navigation handling
- Chart display on mobile
- Layout on small screens

## Running Tests

### Open Cypress UI
```bash
npm run cypress:open
```

### Run E2E Tests (Headless)
```bash
npm run cypress:e2e
```

### Run E2E Tests (With Browser)
```bash
npm run cypress:e2e:headed
```

### Run Specific Test File
```bash
npm run cypress:e2e -- --spec "cypress/e2e/01-dashboard.cy.js"
```

## Test Configuration

Configuration file: `cypress.config.js`

- Base URL: `http://localhost:5173`
- Viewport: 1280x720 (can be overridden in tests)
- Command Timeout: 5000ms
- Request Timeout: 5000ms

## Custom Commands

Available in `cypress/support/commands.js`:

- `cy.login(email, password)` - Login command
- `cy.navigate(path)` - Navigate and verify URL
- `cy.waitForDataLoad()` - Wait for loading state
- `cy.checkToast(message)` - Check toast notification
- `cy.clearCache()` - Clear localStorage and cookies

## Best Practices

1. **Clear Cache Between Tests**: Each test starts with `cy.clearCache()`
2. **Use Data Attributes**: Tests use `data-testid` attributes when possible
3. **Flexible Selectors**: Tests use flexible selectors to work with different page structures
4. **Viewport Testing**: Responsive design tested on mobile, tablet, and desktop
5. **Accessibility**: Tests verify navigation and UI elements are visible

## Next Steps

To run these tests:

1. Ensure backend is running: `cd backend && npm start`
2. Ensure frontend is running: `cd frontend && npm run dev`
3. Run tests: `npm run cypress:e2e`

## Debugging Tests

To debug a specific test:

```bash
npm run cypress:open
```

Then select the test file to debug in the Cypress UI.

Or use:
```bash
npm run cypress:e2e:headed -- --spec "cypress/e2e/01-dashboard.cy.js"
```
