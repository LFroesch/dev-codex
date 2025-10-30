# Testing Guidelines & Status

**Date:** October 30, 2025
**Coverage:** ~35% (434+ test cases)
**Status:** Production Ready

---

## ANTI-BLOAT RULES

### ❌ NEVER:
1. Create `-extended.test.ts` files (one test file per route/service MAX)
2. Test the same endpoint multiple times
3. Test framework code (Express routes, Mongoose models, library functions)
4. Test trivial code (getters, setters, simple assignments)
5. Over-mock (mock only external APIs: Stripe, email, etc.)
6. Write redundant tests (if integration test covers it, skip unit test)
7. Aim for coverage % without strategy

### ✅ ALWAYS:
1. Start with integration tests (cover main user flows)
2. Test business logic only (complex calculations, security, data transformations)
3. Test what breaks in production (known bug areas, critical edge cases)
4. Use minimal mocking (prefer real implementations)
5. Write focused tests (happy path + 2-3 critical edge cases MAX)
6. Check for existing tests FIRST before writing

---

## TESTING PRIORITY

### Priority 1: Integration Tests
Main user flows that cover multiple layers in minimal code:
- Register → Login → Create project → Add todo → Complete → Logout
- Subscribe → Webhook → Verify access
- Login → Protected route → Token refresh

### Priority 2: Business Logic
Unit tests for complex, critical functions:
- Password hashing/validation
- JWT token generation/verification
- Rate limiting logic
- Permission checks
- Data sanitization
- Stripe webhook processing

### Priority 3: Security Edge Cases
- Auth failures (invalid tokens, expired sessions)
- Rate limit enforcement
- Duplicate data handling
- Input validation (XSS, NoSQL injection)
- Enumeration prevention

### ❌ DON'T TEST:
- Route handlers (framework code)
- Model getters/setters (library code)
- CRUD already covered by integration tests
- Error messages (test behavior, not strings)

---

## CURRENT COVERAGE: 35% (Production Ready)

### ✅ Critical Paths Covered

**Authentication & Authorization (70+ tests):**
- Registration, login, logout
- Google OAuth flow
- Password reset (hashed tokens, 15-min expiry, enumeration prevention)
- JWT validation
- Admin access control
- Team permissions (RBAC)

**Payment Processing (10+ tests):**
- Stripe webhook signature verification
- All event types (checkout, subscription, invoice, payment)
- Plan tier detection
- Automatic downgrade on cancellation
- Idempotency

**Security (17+ tests):**
- XSS prevention
- NoSQL injection blocking
- CSRF protection
- Rate limiting (all endpoints)
- Mass assignment prevention
- Password complexity enforcement

**Core Features:**
- Project CRUD
- Todo/Note management
- Team invitations
- Plan limit enforcement (3/20/unlimited)

**Error Handling:**
- Invalid ObjectIds
- Missing resources
- Malformed JSON
- Missing auth tokens
- Concurrent requests
- No stack traces exposed

---

## COVERAGE TARGETS

- **30-40% = Good** (critical paths covered)
- **40-50% = Great** (comprehensive business logic)
- **50%+ = Excellent** (diminishing returns begin)
- **70%+ = Overkill** (testing trivial code)

**Focus on QUALITY tests that catch bugs, not QUANTITY tests that inflate numbers.**

---

## PRODUCTION READINESS

Your 35% coverage covers:
1. ✅ Core user journeys work without breaking
2. ✅ Security is solid (can't be hacked easily)
3. ✅ Payment flows don't lose money
4. ✅ Errors don't crash the server

**This is production-ready.** Real companies ship at 30-40% all the time.

The difference:
- Monitor errors in production (Sentry)
- Fix bugs when users report them
- Add tests for reported bugs
- Iterate based on real usage

**Perfect testing is the enemy of shipping.**

---

## NEW SESSION CHECKLIST

Before writing ANY test:
1. Run `ls backend/src/tests/*.test.ts` - Check what exists
2. Run `grep -l "describe.*<feature>" backend/src/tests/*.test.ts` - Find existing coverage
3. Ask: "Will this test catch real bugs or just increase coverage %?"
4. If answer is "just coverage", DON'T WRITE IT

---

## TEST HISTORY

**Cleanup (Oct 29):**
- Deleted 5 redundant `-extended.test.ts` files (~64K code)
- Down from 38 → 33 test files
- Added critical production tests (password reset, webhooks, rate limiting, error handling)
- Coverage: 34.61% → 35.71%

---

## PHILOSOPHY

You don't need 50% coverage to launch.

What matters:
- Main user flows work
- Security is solid
- Payments work
- Errors are handled

Ship → Monitor → Fix → Improve. That's how real products work.
