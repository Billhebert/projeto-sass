# Testing Guide - Projeto SASS

## Overview

This document outlines the testing strategy for the Projeto SASS application. Due to the architecture of the project (browser-based IIFE modules), testing is divided into:

1. **Manual Browser Testing** (Primary)
2. **Automated Jest Tests** (Secondary - for future refactoring)
3. **Integration Tests** (Browser Console Runner)

---

## Manual Browser Testing

### How to Run

1. Open `dashboard.html` in your browser
2. Open Developer Console (F12 or Right-click > Inspect > Console)
3. Run test commands directly in the console

### Test Commands Available

#### Storage Utils Tests

```javascript
// Test getItem()
console.assert(storageUtils.getItem('test-key') === 'test-value', 'getItem failed');

// Test setItem()
storageUtils.setItem('test-key', 'test-value');
console.assert(localStorage.getItem('test-key') === 'test-value', 'setItem failed');

// Test getJSON()
storageUtils.setJSON('json-test', { key: 'value' });
const result = storageUtils.getJSON('json-test');
console.assert(result.key === 'value', 'getJSON failed');

// Test clear()
storageUtils.clear();
console.assert(localStorage.length === 0, 'clear failed');
```

#### DOM Utils Tests

```javascript
// Test getElementById()
const elem = domUtils.getElementById('dashboa rd-header');
console.assert(elem !== null, 'getElementById failed');

// Test setText()
const testDiv = document.createElement('div');
domUtils.setText(testDiv, 'Test Text');
console.assert(testDiv.textContent === 'Test Text', 'setText failed');

// Test addClass()
const elem = document.createElement('div');
domUtils.addClass(elem, 'test-class');
console.assert(elem.classList.contains('test-class'), 'addClass failed');

// Test hide/show()
domUtils.hide(elem);
console.assert(elem.style.display === 'none', 'hide failed');
domUtils.show(elem);
console.assert(elem.style.display !== 'none', 'show failed');
```

#### Analytics Tests

```javascript
// Test getConversionRate()
const rate = analytics.getConversionRate(100, 25);
console.assert(rate === 25, 'getConversionRate failed, got ' + rate);

// Test calculateMoMGrowth()
const growth = analytics.calculateMoMGrowth(1000, 1200);
console.assert(Math.abs(growth - 20) < 1, 'calculateMoMGrowth failed, got ' + growth);

// Test safeDivide pattern
const safeResult = analytics.getConversionRate(0, 100);
console.assert(safeResult === 0, 'safeDivide protection failed');
```

#### Backup Tests

```javascript
// Test createBackup()
const backup = backup.createBackup();
console.assert(backup.timestamp !== undefined, 'createBackup failed');

// Test downloadBackup() - will trigger file download
backup.downloadBackup();

// Test clearAllData()
backup.clearAllData();
console.assert(localStorage.length === 0, 'clearAllData failed');
```

---

## Automated Jest Tests

### Setup

Jest is installed for future use when code is refactored to use CommonJS/ES6 modules.

```bash
npm install
npm test
```

### Test Files Location

- `tests/setup.js` - Jest configuration and global mocks
- `src/scripts/__tests__/storage-utils.test.js` - Storage Utils tests
- More test files can be added as code is modularized

### Current Limitations

IIFE modules (Immediately Invoked Function Expressions) cannot be easily imported in Jest Node environment. When refactoring to CommonJS/ES6, the Jest tests will work automatically.

### Test Coverage Targets

| Module | Target |
|--------|--------|
| storage-utils.js | 90% |
| dom-utils.js | 85% |
| analytics.js | 85% |
| backup.js | 80% |
| **Overall** | **80%** |

---

## Integration Test Runner

### HTML-Based Test Runner

Create a new file `test-runner.html` for comprehensive browser-based testing:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Projeto SASS - Test Runner</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #00ff00; margin: 20px; }
        .pass { color: #00ff00; }
        .fail { color: #ff0000; }
        .test { margin: 10px 0; padding: 10px; border-left: 3px solid #00ff00; }
        .test.fail { border-left-color: #ff0000; }
        .results { margin-top: 20px; padding: 10px; background: #2d2d2d; }
    </style>
</head>
<body>
    <h1>Projeto SASS - Automated Test Runner</h1>
    <div id="test-results"></div>
    <div class="results">
        <p>Total Tests: <span id="total-tests">0</span></p>
        <p>Passed: <span class="pass" id="passed-tests">0</span></p>
        <p>Failed: <span class="fail" id="failed-tests">0</span></p>
    </div>

    <!-- Load all modules -->
    <script src="src/scripts/storage-utils.js"></script>
    <script src="src/scripts/dom-utils.js"></script>
    <script src="src/scripts/analytics.js"></script>
    <script src="src/scripts/backup.js"></script>
    <script src="src/scripts/historical-analytics.js"></script>

    <script>
        // Simple test framework
        class TestRunner {
            constructor() {
                this.tests = [];
                this.passed = 0;
                this.failed = 0;
            }

            test(name, fn) {
                try {
                    fn();
                    this.passed++;
                    this.logPass(name);
                } catch (error) {
                    this.failed++;
                    this.logFail(name, error);
                }
            }

            assert(condition, message) {
                if (!condition) throw new Error(message);
            }

            logPass(name) {
                const el = document.createElement('div');
                el.className = 'test pass';
                el.textContent = '✓ ' + name;
                document.getElementById('test-results').appendChild(el);
            }

            logFail(name, error) {
                const el = document.createElement('div');
                el.className = 'test fail';
                el.textContent = '✗ ' + name + ': ' + error.message;
                document.getElementById('test-results').appendChild(el);
            }

            printSummary() {
                document.getElementById('total-tests').textContent = this.passed + this.failed;
                document.getElementById('passed-tests').textContent = this.passed;
                document.getElementById('failed-tests').textContent = this.failed;
            }
        }

        const runner = new TestRunner();

        // Storage Utils Tests
        runner.test('storageUtils.setItem()', () => {
            const result = storageUtils.setItem('test', 'value');
            runner.assert(result === true, 'setItem should return true');
            runner.assert(localStorage.getItem('test') === 'value', 'value should be stored');
        });

        runner.test('storageUtils.getItem()', () => {
            localStorage.setItem('test-get', 'test-value');
            const result = storageUtils.getItem('test-get');
            runner.assert(result === 'test-value', 'getItem should return stored value');
        });

        runner.test('storageUtils.getJSON()', () => {
            const obj = { key: 'value' };
            storageUtils.setJSON('test-json', obj);
            const result = storageUtils.getJSON('test-json');
            runner.assert(result.key === 'value', 'getJSON should parse JSON');
        });

        runner.test('storageUtils.clear()', () => {
            localStorage.setItem('to-clear', 'value');
            storageUtils.clear();
            runner.assert(localStorage.length === 0, 'clear should empty storage');
        });

        // Analytics Tests
        runner.test('analytics.getConversionRate()', () => {
            const rate = analytics.getConversionRate(100, 25);
            runner.assert(rate === 25, 'conversion rate should be 25%');
        });

        runner.test('analytics.calculateMoMGrowth()', () => {
            const growth = analytics.calculateMoMGrowth(1000, 1200);
            runner.assert(Math.abs(growth - 20) < 1, 'MoM growth should be ~20%');
        });

        runner.test('analytics.safeDivide protection', () => {
            const result = analytics.getConversionRate(0, 100);
            runner.assert(result === 0, 'should return 0 when denominator is 0');
        });

        // Backup Tests
        runner.test('backup.createBackup()', () => {
            const result = backup.createBackup();
            runner.assert(result.timestamp !== undefined, 'backup should have timestamp');
        });

        runner.test('backup.clearAllData()', () => {
            localStorage.setItem('test-clear', 'value');
            backup.clearAllData();
            runner.assert(localStorage.length === 0, 'should clear all data');
        });

        // DOM Utils Tests (if available)
        if (typeof domUtils !== 'undefined') {
            runner.test('domUtils.setText()', () => {
                const elem = document.createElement('div');
                domUtils.setText(elem, 'Test');
                runner.assert(elem.textContent === 'Test', 'setText should set textContent');
            });

            runner.test('domUtils.addClass()', () => {
                const elem = document.createElement('div');
                domUtils.addClass(elem, 'test-class');
                runner.assert(elem.classList.contains('test-class'), 'addClass should add class');
            });
        }

        // Print results
        runner.printSummary();
    </script>
</body>
</html>
```

### Running the Integration Tests

1. Save the above as `test-runner.html`
2. Open in your browser
3. Check the results displayed on the page
4. Open console (F12) for detailed error information

---

## Manual Testing Checklist

### Storage Utils
- [ ] getItem() returns correct value
- [ ] getItem() returns default for missing keys
- [ ] setItem() stores values
- [ ] setItem() handles errors gracefully
- [ ] removeItem() deletes items
- [ ] clear() empties localStorage
- [ ] getJSON() parses JSON
- [ ] setJSON() stringifies JSON
- [ ] getArray() validates arrays
- [ ] setArray() rejects non-arrays
- [ ] getObject() validates objects
- [ ] setObject() rejects non-objects
- [ ] hasKey() checks existence

### DOM Utils
- [ ] getElementById() finds elements
- [ ] querySelector() finds elements
- [ ] querySelectorAll() returns array
- [ ] setText() sets textContent
- [ ] getText() retrieves textContent
- [ ] setHTML() sets innerHTML
- [ ] setAttribute() sets attributes
- [ ] getAttribute() gets attributes
- [ ] addClass() adds classes
- [ ] removeClass() removes classes
- [ ] toggleClass() toggles classes
- [ ] addEventListener() adds listeners
- [ ] isVisible() checks visibility
- [ ] show() displays elements
- [ ] hide() hides elements

### Analytics
- [ ] getConversionRate() calculates rate
- [ ] calculateMoMGrowth() calculates growth
- [ ] getAOVByMarketplace() groups by marketplace
- [ ] getProductMetrics() calculates metrics
- [ ] getInventoryHealth() checks inventory
- [ ] getDiscountAnalysis() analyzes discounts
- [ ] getPaymentMethodAnalysis() analyzes payments
- [ ] getSalesVelocity() calculates velocity
- [ ] getCustomerMetrics() calculates metrics
- [ ] getProfitabilityMetrics() calculates profit
- [ ] safeDivide protection works

### Backup
- [ ] createBackup() creates backup
- [ ] downloadBackup() downloads file
- [ ] restoreBackup() restores data
- [ ] getBackupInfo() returns info
- [ ] clearAllData() clears storage
- [ ] Error handling works

---

## Browser DevTools Testing

### Quick Test in Console

```javascript
// Copy and paste into browser console to run all tests

const tests = {
  'Storage Utils - setItem': () => {
    storageUtils.setItem('test', 'value');
    return localStorage.getItem('test') === 'value';
  },
  'Storage Utils - getJSON': () => {
    storageUtils.setJSON('obj', { x: 1 });
    return storageUtils.getJSON('obj').x === 1;
  },
  'Analytics - Conversion Rate': () => {
    return analytics.getConversionRate(100, 25) === 25;
  },
  'Analytics - Division by Zero': () => {
    return analytics.getConversionRate(0, 100) === 0;
  },
  'Backup - Create': () => {
    return backup.createBackup().timestamp !== undefined;
  }
};

let passed = 0, failed = 0;
for (const [name, test] of Object.entries(tests)) {
  try {
    if (test()) {
      console.log(`✓ ${name}`);
      passed++;
    } else {
      console.log(`✗ ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
```

---

## Performance Testing

### Storage Utils Performance

```javascript
// Measure performance of 1000 operations
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  storageUtils.setItem(`key-${i}`, `value-${i}`);
}
const duration = performance.now() - start;
console.log(`1000 setItem operations: ${duration.toFixed(2)}ms`);

// Measure getItem performance
const start2 = performance.now();
for (let i = 0; i < 1000; i++) {
  storageUtils.getItem(`key-${i}`);
}
const duration2 = performance.now() - start2;
console.log(`1000 getItem operations: ${duration2.toFixed(2)}ms`);
```

### Analytics Performance

```javascript
// Measure analytics calculation performance
const data = {
  sales: Array(10000).fill().map((_, i) => ({
    id: i,
    amount: Math.random() * 1000,
    date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  })),
  products: Array(1000).fill().map((_, i) => ({
    id: i,
    quantity: Math.floor(Math.random() * 1000),
    unitPrice: Math.random() * 500
  }))
};

const start = performance.now();
const summary = analytics.getDashboardSummary(data);
const duration = performance.now() - start;
console.log(`Dashboard summary calculation: ${duration.toFixed(2)}ms`);
```

---

## Continuous Integration (Future)

When moving to CI/CD, implement:

1. **Unit Tests** - Jest with modularized code
2. **Integration Tests** - Puppeteer/Playwright for browser automation
3. **E2E Tests** - Full user flows
4. **Performance Tests** - Lighthouse/WebPageTest
5. **Security Tests** - OWASP scanning

### Recommended CI/CD Pipeline

```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - run: npm run lint
      - run: npm run build
```

---

## Troubleshooting

### Issue: Module not loading
**Solution**: Ensure script is loaded before test. Check browser console for load errors.

### Issue: Test timeout
**Solution**: Increase Jest timeout or check for async operations.

### Issue: Storage quota exceeded
**Solution**: Clear localStorage before tests. Use `localStorage.clear()`.

### Issue: DOM not ready
**Solution**: Wrap tests in `DOMContentLoaded` event or run after page load.

---

## Test Report Template

Use this template to document test results:

```markdown
# Test Report - [Date]

## Environment
- Browser: [Firefox/Chrome/Safari]
- OS: [Windows/Mac/Linux]
- Node: [version]

## Test Results
- Total Tests: X
- Passed: X
- Failed: X
- Success Rate: X%

## Issues Found
1. [Issue description]
   - Module: [module name]
   - Severity: [Critical/High/Medium/Low]
   - Steps to reproduce: [steps]

## Performance
- Storage Utils (1000 ops): Xms
- Analytics (10k records): Xms

## Recommendations
1. [Recommendation]
```

---

## Related Documentation

- [README.md](README.md) - Main documentation
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Error handling strategies
- [CODE_GUIDELINES.md](CODE_GUIDELINES.md) - Code standards
- [MAINTENANCE.md](MAINTENANCE.md) - Maintenance guide
