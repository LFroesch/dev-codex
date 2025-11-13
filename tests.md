# Testing Specification Guide

**Project:** Dev Codex Backend
**Framework:** Jest + Supertest
**Current Status:** 859 tests, 48.46% overall coverage
**Target:** 80%+ coverage for critical paths

---

## Testing Standards

### Coverage Requirements

- **Critical Services** (auth, billing, data persistence): 85%+ coverage
- **Business Logic** (handlers, middleware): 75%+ coverage
- **Routes/Controllers**: 70%+ coverage
- **Models**: 90%+ coverage (schema validation critical)
- **Utilities**: 80%+ coverage

### Test Organization

```
backend/src/tests/
├── handlers/           # Command handler tests
├── middleware/         # Middleware tests
├── routes/            # Route/endpoint tests
├── services/          # Service layer tests
├── utils/             # Test utilities (mocks, assertions, helpers)
└── integration/       # Full workflow integration tests
```

---

## Writing Tests for Different File Types

### 1. Service Files (src/services/)

**Pattern:** Unit tests with mocked dependencies

```typescript
// Example: staleItemService.test.ts
describe('StaleItemService', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    // Mock external dependencies
  });

  describe('checkForStaleItems', () => {
    it('should detect stale todos', async () => {
      // Setup: Create test data
      // Execute: Call service method
      // Assert: Verify results
    });

    it('should handle errors gracefully', async () => {
      // Test error paths
    });
  });
});
```

**Requirements:**
- Test all public methods
- Mock database calls when appropriate
- Test error handling and edge cases
- Test async/await flows
- Test cron jobs via manual triggers

### 2. Handler Files (src/services/handlers/)

**Pattern:** Test business logic with mocked project context

```typescript
// Example: TodoHandlers.test.ts
describe('TodoHandlers', () => {
  describe('handleCreateTodo', () => {
    it('should create todo and return success', async () => {
      const result = await handleCreateTodo(
        mockProject,
        { title: 'Test', priority: 'high' }
      );
      expect(result.success).toBe(true);
    });

    it('should enforce plan limits', async () => {
      // Test limit enforcement
    });
  });
});
```

**Requirements:**
- Test command parsing and validation
- Test success and error responses
- Test permission checks
- Test plan limit enforcement
- Test database operations

### 3. Route Files (src/routes/)

**Pattern:** Integration tests with supertest

```typescript
// Example: projects.test.ts
describe('POST /api/projects', () => {
  it('should create project when authenticated', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Project' })
      .expect(201);

    expect(response.body.project.name).toBe('Test Project');
  });

  it('should return 401 when not authenticated', async () => {
    // Test auth failures
  });
});
```

**Requirements:**
- Test all HTTP methods (GET, POST, PUT, DELETE)
- Test authentication/authorization
- Test request validation
- Test response formats
- Test error status codes (400, 401, 403, 404, 500)

### 4. Middleware Files (src/middleware/)

**Pattern:** Mock req/res/next pattern

```typescript
// Example: auth.test.ts
describe('authenticateToken', () => {
  it('should call next() with valid token', async () => {
    const req = mockRequest({ headers: { authorization: 'Bearer valid-token' }});
    const res = mockResponse();
    const next = jest.fn();

    await authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
  });
});
```

**Requirements:**
- Mock Express req/res/next
- Test middleware chain
- Test error handling
- Test request modification (req.user, etc.)

### 5. Model Files (src/models/)

**Pattern:** Schema validation and methods

```typescript
// Example: User.test.ts
describe('User Model', () => {
  it('should hash password before save', async () => {
    const user = new User({ email: 'test@test.com', password: 'plain' });
    await user.save();
    expect(user.password).not.toBe('plain');
  });

  it('should validate email format', async () => {
    const user = new User({ email: 'invalid', password: 'test' });
    await expect(user.save()).rejects.toThrow();
  });
});
```

**Requirements:**
- Test schema validation
- Test pre/post hooks
- Test instance methods
- Test static methods
- Test indexes and constraints

---

## Test Utilities

### Location: `backend/src/tests/utils/`

**testApp.ts**: Configures Express app for testing
**testUser.ts**: Creates test users with authentication
**testProject.ts**: Creates test projects with data
**mocks.ts**: Reusable mock objects (requests, responses)
**assertions.ts**: Custom assertion helpers

### Usage Example

```typescript
import { createTestApp } from './utils/testApp';
import { createTestUser } from './utils/testUser';
import { createTestProject } from './utils/testProject';

describe('Feature Test', () => {
  let app, user, token, project;

  beforeAll(async () => {
    app = await createTestApp();
    ({ user, token } = await createTestUser());
    project = await createTestProject(user._id);
  });

  // Your tests here
});
```

---

## Coverage Targets by Priority

### Priority 1: High-Impact Services (Target: 85%+)

- **routes/analytics.ts** - Currently 17.67% ⚠️ **CRITICAL**
- **routes/auth.ts** - Currently 58.2%
- **routes/billing.ts** - Currently 50.73%
- **middleware/analytics.ts** - Currently 53.22%

### Priority 2: Core Handlers (Target: 75%+)

- **UtilityHandlers.ts** - Currently 32.35%
- **ComponentHandlers.ts** - Currently 45.31%
- **RelationshipHandlers.ts** - Currently 51.38%
- **SearchHandlers.ts** - Currently 48.21%
- **TodoHandlers.ts** - Currently 53.72%

### Priority 3: Supporting Services (Target: 70%+)

- **routes/projects.ts** - Currently 63.86%
- **routes/notifications.ts** - Currently 61.53%
- **routes/terminal.ts** - Currently 72.64%

---

## Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange: Setup test data
  const user = await createTestUser();

  // Act: Execute the function
  const result = await someFunction(user);

  // Assert: Verify expectations
  expect(result).toBe(expectedValue);
});
```

### 2. Mock External Dependencies

```typescript
jest.mock('../services/emailService');
jest.mock('stripe');

// Mock only what's needed
emailService.sendEmail.mockResolvedValue({ success: true });
```

### 3. Test Edge Cases

- Empty inputs
- Null/undefined values
- Very large inputs
- Concurrent operations
- Network failures
- Database errors

### 4. Async Testing

```typescript
// ✅ Good
it('should handle async', async () => {
  await expect(asyncFunction()).resolves.toBe(value);
});

// ❌ Bad
it('should handle async', () => {
  asyncFunction().then(result => {
    expect(result).toBe(value);
  });
});
```

### 5. Database Cleanup

```typescript
beforeEach(async () => {
  await clearTestDatabase();
});

afterAll(async () => {
  await closeTestDatabase();
});
```

---

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test staleItemService

# With coverage
npm run test:coverage

# Watch mode
npm test -- --watch

# Update snapshots
npm test -- -u
```

---

## Example: Complete Test File Template

```typescript
import { setupTestDatabase, clearTestDatabase } from '../utils/testDatabase';
import { createTestUser } from '../utils/testUser';
import { ServiceUnderTest } from '../../services/ServiceUnderTest';

describe('ServiceUnderTest', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase();
  });

  beforeEach(async () => {
    // Reset state between tests
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = await ServiceUnderTest.methodName(input);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({ /* expected */ });
    });

    it('should handle error case', async () => {
      // Test error handling
      await expect(ServiceUnderTest.methodName(null))
        .rejects
        .toThrow('Expected error message');
    });

    it('should handle edge case', async () => {
      // Test boundaries
    });
  });
});
```

---

## Appendix: Recent Coverage Improvements

### Successfully Tested Services (95%+ Coverage)

| Service | Coverage | Tests | Key Features Tested |
|---------|----------|-------|---------------------|
| subscriptionAnalyticsHandler.ts | 100% | 25 | Plan changes, upgrades, downgrades, cancellations, reactivations |
| ProjectCache.ts | 98.3% | 16 | Caching, TTL, eviction, cleanup, statistics |
| analyticsCompounding.ts | 98.03% | 24 | Compaction, aggregation, TTL, manual triggers, stats |
| staleItemService.ts | 97.18% | 22 | Stale detection for todos, notes, devlogs across all users |
| reminderService.ts | 96.33% | 25 | Reminder creation, cron scheduling, notifications, cleanup |
| analyticsQuery.ts | 95.12% | 31 | Event queries, counts, aggregations, conversion metrics |

### Well-Tested Services (80-94% Coverage)

| Service | Coverage | Tests | Key Features Tested |
|---------|----------|-------|---------------------|
| activityLogger.ts | 87.2% | 11 | Activity logging for all action types, helper methods |
| cleanupService.ts | 83.46% | 23 | Database stats, cleanup operations, recommendations |
| commandExecutor.ts | 81.31% | 42 | Batch execution, lock checking, error handling |

### Next Testing Priorities

1. **routes/analytics.ts** (17.67%) - Analytics API endpoints
2. **routes/auth.ts** (58.2%) - Authentication flows
3. **routes/billing.ts** (50.73%) - Stripe integration
4. **middleware/analytics.ts** (53.22%) - Analytics middleware
5. **UtilityHandlers.ts** (32.35%) - Utility commands (large file, 3187 lines)

**Total Tests Added:** 188 comprehensive tests covering critical backend services

---

*Last Updated: 2025-11-13*