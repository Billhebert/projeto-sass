# Integration Testing Guide

## Overview

This guide covers how to set up and run integration tests for the Projeto SASS backend using Jest and MongoDB Memory Server.

## Prerequisites

- Node.js 16+ installed
- npm 8+ installed
- Docker (for local MongoDB/Redis - optional, can use in-memory servers)

## Current Test Setup

The project includes:
- **Unit Tests**: Vitest (Frontend)
- **Integration Tests**: Jest (Backend) 
- **E2E Tests**: Cypress (Full Stack)

## Backend Integration Testing

### Dependencies

Required packages already installed:
```json
{
  "mongodb-memory-server": "^9.3.0",
  "jest": "^29.0.0",
  "supertest": "^6.3.0"
}
```

### Setting Up Tests

#### 1. Create Jest Configuration

Create `jest.config.js` in the root directory:

```javascript
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/**/*.test.js',
    '!backend/server.js',
    '!backend/logger.js',
  ],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  setupFilesAfterEnv: ['<rootDir>/backend/tests/setup.js'],
  testTimeout: 30000,
};
```

#### 2. Create Test Setup File

Create `backend/tests/setup.js`:

```javascript
/**
 * Jest Setup - MongoDB Memory Server
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
let mongoServer;

beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  console.log('✓ MongoDB Memory Server started');
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
    console.log('✓ MongoDB Memory Server stopped');
  }
});

afterEach(async () => {
  // Clear all collections after each test
  const { default: mongoose } = require('mongoose');
  if (mongoose.connection.readyState === 1) {
    const collections = Object.values(mongoose.connection.collections);
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});
```

#### 3. Create Sample Test File

Create `backend/tests/api/auth.test.js`:

```javascript
/**
 * Authentication API Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');

let app;

beforeAll(async () => {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Require app after DB connection
  app = require('../../server');
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication API', () => {
  describe('POST /api/auth/ml-callback', () => {
    it('should exchange authorization code for tokens', async () => {
      const response = await request(app)
        .post('/api/auth/ml-callback')
        .send({
          code: 'test_code_123',
          state: 'test_state',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should return 400 for missing code', async () => {
      const response = await request(app)
        .post('/api/auth/ml-callback')
        .send({ state: 'test_state' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/ml-refresh', () => {
    it('should refresh expired token', async () => {
      const response = await request(app)
        .post('/api/auth/ml-refresh')
        .send({
          refreshToken: 'test_refresh_token',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });
});
```

### Running Tests

#### Unit Tests (Frontend)
```bash
npm run test:frontend
```

#### With Coverage
```bash
npm run test:frontend:coverage
```

#### E2E Tests (Full Stack)
```bash
npm run e2e
```

#### Watch Mode
```bash
npm run test:frontend -- --watch
```

## Database Testing Strategy

### Using MongoDB Memory Server (Recommended for CI/CD)

**Advantages:**
- No external dependencies
- Fast test execution
- Isolated test databases
- Perfect for CI/CD pipelines

**Setup:**
```javascript
const { MongoMemoryServer } = require('mongodb-memory-server');

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
});
```

### Using Local Docker (Development)

**Advantages:**
- Tests against real MongoDB
- Better testing of edge cases
- Can inspect database state

**Setup:**
```bash
# Start databases
docker compose -f docker-compose.dev.yml up -d

# Run tests
npm test
```

## Test Organization

```
backend/
├── tests/
│   ├── setup.js                 # Jest configuration
│   ├── api/
│   │   ├── auth.test.js
│   │   ├── accounts.test.js
│   │   ├── sync.test.js
│   │   └── webhooks.test.js
│   ├── middleware/
│   │   ├── authentication.test.js
│   │   └── validation.test.js
│   ├── utils/
│   │   └── helpers.test.js
│   └── fixtures/
│       ├── sample-accounts.json
│       └── sample-tokens.json
```

## Writing Tests

### API Endpoint Tests

```javascript
describe('GET /api/accounts', () => {
  it('should return all accounts', async () => {
    // Arrange
    const testAccount = {
      name: 'Test Account',
      email: 'test@example.com',
    };
    await Account.create(testAccount);

    // Act
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${validToken}`);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
```

### Database Model Tests

```javascript
describe('Account Model', () => {
  it('should create account with valid data', async () => {
    const account = await Account.create({
      name: 'Test',
      email: 'test@example.com',
    });

    expect(account._id).toBeDefined();
    expect(account.name).toBe('Test');
  });

  it('should fail with missing required fields', async () => {
    expect(async () => {
      await Account.create({ name: 'Test' });
    }).rejects.toThrow();
  });
});
```

### Middleware Tests

```javascript
describe('Authentication Middleware', () => {
  it('should allow valid token', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.status).not.toBe(401);
  });

  it('should reject invalid token', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', 'Bearer invalid_token');

    expect(response.status).toBe(401);
  });
});
```

## Testing Best Practices

### 1. Test Isolation
- Each test should be independent
- Clear up database state after each test
- Use `beforeEach`/`afterEach` for setup/teardown

### 2. Meaningful Assertions
```javascript
// Bad
expect(response).toBeTruthy();

// Good
expect(response.status).toBe(200);
expect(response.body).toHaveProperty('accessToken');
expect(response.body.accessToken).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
```

### 3. Test Coverage
```bash
# Generate coverage report
npm run test:frontend:coverage

# Check coverage thresholds
npm run test:frontend -- --coverage --coverageThreshold='{"global":{"lines":80}}'
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/tests.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:frontend
      - run: npm run cypress:run
```

## Troubleshooting

### Test Timeouts
Increase timeout in jest.config.js:
```javascript
testTimeout: 30000, // 30 seconds
```

### MongoDB Connection Issues
Check that MongoDB is running:
```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml logs mongo
```

### Memory Issues
For large test suites, increase Node memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm test
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/mongodb-js/mongodb-memory-server)
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://docs.cypress.io/)

## Coverage Goals

| Metric | Target |
|--------|--------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

## Running Locally

### Step 1: Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### Step 2: Start Databases
```bash
npm run db:start
```

### Step 3: Start Application
```bash
npm run dev
```

### Step 4: Run Tests in Separate Terminal
```bash
npm test:frontend
npm run cypress:open
```

## Next Steps

1. Create test files for each API endpoint
2. Add fixtures for test data
3. Set up pre-commit hooks to run tests
4. Configure code coverage reporting
5. Add test documentation to PR templates
