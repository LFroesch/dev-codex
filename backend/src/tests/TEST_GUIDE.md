# Test Guide for LLMs

## Overview
This test suite uses Jest with supertest for API testing. All tests follow consistent patterns and use shared utilities.

## Test Structure Pattern
```javascript
import request from 'supertest';
import { createTestApp, createAuthenticatedUser } from './utils';
import routeModule from '../routes/routeName';

const app = createTestApp({ '/api/route': routeModule });

describe('Route Name', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const auth = await createAuthenticatedUser(app);
    authToken = auth.authToken;
    userId = auth.userId;
  });

  describe('METHOD /api/route/path', () => {
    it('should do something specific', async () => {
      const response = await request(app)
        .method('/api/route/path')
        .set('Cookie', `token=${authToken}`)
        .send(data)
        .expect(200);

      expect(response.body).toHaveProperty('field');

      // ALWAYS verify database state when testing mutations
      const dbRecord = await Model.findById(id);
      expect(dbRecord?.field).toBe('value');
    });
  });
});
```

## Core Utilities (src/tests/utils/)

### Test App Creation
```javascript
import { createTestApp } from './utils';

// Creates Express app with routes mounted
const app = createTestApp({
  '/api/route': routeModule,
  '/api/other': [middleware, otherRoute]
});
```

### User Authentication
```javascript
// Regular authenticated user
const { user, userId, authToken } = await createAuthenticatedUser(app);

// Admin user
const { user, userId, authToken } = await createAuthenticatedAdmin(app);

// Custom user
const { user, userId, authToken } = await createAuthenticatedUser(app, {
  email: 'custom@example.com',
  username: 'custom',
  planTier: 'pro'
});
```

### Assertions
```javascript
import { expectSuccess, expectUnauthorized } from './utils';

// Clean success assertion
expectSuccess(response, 200);

// Unauthorized assertion
expectUnauthorized(response);
```

### Test Projects
```javascript
import { createTestProject } from './utils';

const { project, projectId } = await createTestProject(userId);
```

## Key Patterns

### 1. Database Verification
```javascript
// ✅ GOOD: Verify database state
it('should create item', async () => {
  const response = await request(app).post('/api/items')...

  // Verify in database, not just API response
  const item = await Item.findById(response.body.item.id);
  expect(item).toBeTruthy();
  expect(item?.field).toBe('value');
});
```

### 2. Test Isolation
```javascript
// ✅ GOOD: Each test is independent
it('should not affect other items when deleting', async () => {
  // Create 2 items
  // Delete 1
  // Verify the other still exists
});
```

### 3. Edge Cases
```javascript
// ✅ GOOD: Test edge cases
it('should trim whitespace', async () => { ... });
it('should handle optional fields', async () => { ... });
it('should return 404 for non-existent', async () => { ... });
it('should require authentication', async () => { ... });
```

### 4. Security Testing
```javascript
// ✅ GOOD: Test security
it('should require authentication', async () => {
  await request(app).get('/api/protected').expect(401);
});

it('should not expose sensitive data', async () => {
  const response = await request(app).get('/api/user')...
  expect(response.body).not.toHaveProperty('password');
  expect(response.body).not.toHaveProperty('stripeCustomerId');
});
```

## Common Mistakes to Avoid

### ❌ DON'T: Only test happy path
```javascript
// Bad
it('should create user', async () => {
  const response = await request(app).post('/api/users')...
  expect(response.status).toBe(201);
});
```

### ✅ DO: Test validation, errors, edge cases
```javascript
// Good
describe('POST /api/users', () => {
  it('should create user with valid data', async () => { ... });
  it('should validate required fields', async () => { ... });
  it('should reject duplicate email', async () => { ... });
  it('should trim whitespace', async () => { ... });
  it('should require authentication', async () => { ... });
});
```

### ❌ DON'T: Skip database verification
```javascript
// Bad - only checks API response
it('should update item', async () => {
  const response = await request(app).put('/api/items/123')...
  expect(response.body.item.name).toBe('Updated');
});
```

### ✅ DO: Verify database state
```javascript
// Good - verifies actual database change
it('should update item', async () => {
  const response = await request(app).put('/api/items/123')...

  const item = await Item.findById('123');
  expect(item?.name).toBe('Updated');
});
```

## Test Organization

### Describe Blocks
- Top level: Route/Feature name
- Second level: Endpoint (METHOD /path)
- Tests: Specific behavior

```javascript
describe('User Routes', () => {
  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => { ... });
    it('should return 404 for non-existent user', async () => { ... });
    it('should require authentication', async () => { ... });
  });
});
```

## Mocking

### External Services (Stripe, etc.)
```javascript
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock' })
    }
  }));
});
```

### Models (when needed)
```javascript
jest.mock('../../models/Project');

(Project.findById as jest.Mock).mockResolvedValue(mockProject);
```

## Common Test Data

### Valid User
```javascript
{
  email: 'test@example.com',
  password: 'StrongPass123!',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser'
}
```

### Valid Project
```javascript
{
  name: 'Test Project',
  description: 'Test description',
  userId: userId,
  ownerId: userId
}
```

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- auth.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Key Principles

1. **Follow existing patterns** - Look at auth.test.ts, projects.test.ts for examples
2. **Test behavior, not implementation** - Focus on what it does, not how
3. **Verify database state** - Don't just check API responses
4. **Test edge cases** - Whitespace, null, empty, invalid data
5. **Test security** - Auth requirements, data exposure
6. **Keep tests isolated** - Each test should work independently
7. **Clear descriptions** - Test names should explain what they verify
8. **Use utilities** - Don't reinvent createAuthenticatedUser, etc.

## Quality Checklist

For each route/feature, ensure you have tests for:
- ✅ Happy path (successful operation)
- ✅ Validation (required fields, invalid data)
- ✅ Authentication (protected routes)
- ✅ Authorization (user can only access their data)
- ✅ Error cases (404, 400, 500)
- ✅ Edge cases (whitespace, optional fields)
- ✅ Database verification (state actually changes)
- ✅ Isolation (operations don't affect other data)
