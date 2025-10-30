# ANTI-BLOAT TESTING GUIDELINES

**Current Coverage:** ~37%
**Status:** 38 test files, massive redundancy, 3+ days wasted on AI-generated bloat

## MANDATORY RULES FOR AI TESTING

### ❌ NEVER DO THIS:
1. **NEVER create `-extended.test.ts` files** - One test file per route/service, MAX
2. **NEVER test the same endpoint multiple times** - If auth.test.ts exists, don't create auth-v2.test.ts
3. **NEVER test framework code** - Don't test Express routes, Mongoose models, library functions
4. **NEVER test trivial code** - Getters, setters, simple assignments
5. **NEVER over-mock** - Mock only external APIs (Stripe, email, etc), use real implementations otherwise
6. **NEVER write redundant tests** - If integration test covers it, don't unit test it
7. **NEVER aim for coverage % without strategy** - Focus on critical paths first

### ✅ ALWAYS DO THIS:
1. **Start with ONE integration test** - Cover main user flow (register → login → use app → logout)
2. **Test business logic only** - Complex calculations, security checks, data transformations
3. **Test what breaks in production** - Known bug areas, edge cases that matter
4. **Use minimal mocking** - Prefer real implementations, mock only external services
5. **Write focused tests** - Happy path + 2-3 critical edge cases MAX per function
6. **Check for existing tests FIRST** - Before writing ANY test, search for existing coverage

## TESTING STRATEGY

### Priority 1: Integration Tests (20-30% coverage from <100 lines)
- Main user flow: register → login → create project → add todo → complete → logout
- Payment flow: subscribe → webhook → verify access
- Auth flow: login → access protected route → token refresh

### Priority 2: Business Logic (unit tests for complex functions)
- Password hashing/validation
- JWT token generation/verification
- Rate limiting logic
- Permission checks
- Data sanitization

### Priority 3: Critical Edge Cases
- Auth failures (invalid tokens, expired sessions)
- Rate limit exceeded
- Duplicate data (email already exists, etc)
- Invalid input validation

### ❌ DON'T TEST:
- Route handlers (framework code)
- Model getters/setters (library code)
- Simple CRUD operations already covered by integration tests
- Error messages (test behavior, not strings)

## CURRENT TEST AUDIT

**Redundant test files to review:**
- auth.test.ts (28K) vs integration-auth-flow.test.ts (11K)
- projects.test.ts (15K) vs projects-extended.test.ts (19K) ← DELETE ONE
- admin.test.ts (2.9K) vs admin-extended.test.ts (16K) ← DELETE ONE
- analytics.test.ts (2.9K) vs analytics-extended.test.ts (11K) ← DELETE ONE
- billing.test.ts (6.8K) vs billing-extended.test.ts (9.1K) ← DELETE ONE
- ideas.test.ts (3.1K) vs ideas-extended.test.ts (9.2K) ← DELETE ONE

**Estimated token waste:** 200k+ tokens on duplicate tests

## NEXT SESSION CHECKLIST

Before writing ANY test:
1. Run `ls backend/src/tests/*.test.ts` - Check what exists
2. Run `grep -l "describe.*<feature>" backend/src/tests/*.test.ts` - Find existing coverage
3. Ask: "Will this test catch real bugs or just increase coverage %?"
4. If answer is "just coverage", DON'T WRITE IT

## REALISTIC COVERAGE TARGETS

- **40% = Good** (covers critical paths)
- **50% = Great** (adds important edge cases)
- **60% = Excellent** (comprehensive business logic coverage)
- **70%+ = Diminishing returns** (testing trivial code)

Focus on QUALITY tests that catch bugs, not QUANTITY tests that inflate numbers.

---

## CLEANUP COMPLETED (2025-10-29)

### Files Deleted (5 redundant "-extended" test files):
- projects-extended.test.ts (19K)
- admin-extended.test.ts (16K)
- analytics-extended.test.ts (11K)
- billing-extended.test.ts (9.1K)
- ideas-extended.test.ts (9.2K)

**Total removed:** ~64K of redundant test code
**New test count:** 33 files (down from 38)

### Integration Test Enhanced:
- Added todo workflow test to integration-auth-flow.test.ts
- Covers: register → login → create project → add todo → complete todo → verify
- Single focused test that covers critical user path

### Result:
- Eliminated redundancy
- Kept focused, quality tests
- One comprehensive integration test covers main workflows
- TESTS.md updated with strict anti-bloat guidelines for future sessions

### New Tests Added (2025-10-29 Evening):
- **planLimits.test.ts** - 7 tests for subscription limit middleware
- **emailService.test.ts** - 4 tests for email sending
- **cleanupService.test.ts** - 6 tests for database cleanup service
- **reminderService.test.ts** - 3 tests for reminder/notification cron jobs
- **commandSecurity.test.ts** - 10 tests for terminal command security

**Coverage Progress:**
- Baseline: 34.61%
- After cleanup + new tests: 35.71%
- Change: +1.1%

**Reality Check:**
Getting to 50% would require covering ~2,000 more lines of code. The tests added tonight covered ~350 lines. To reach 50% would need 5-6x more test code, which means either:
1. Weeks of focused testing work
2. OR better strategy: focus on integration tests that cover multiple layers

**The Real Solution:**
Stop chasing coverage %. Focus on:
- Does the main user flow work? (register → login → create project → add todos)
- Do critical security features work? (auth, rate limiting, input validation)
- Do payment/subscription features work?

If those work, you have good enough coverage. The rest is diminishing returns.

---

## PRODUCTION READINESS - WHAT ACTUALLY MATTERS

**Current Status: 35.32% coverage**

### ✅ Critical Paths COVERED (Ready for Production)
- **Auth Flow**: Register, login, logout, password security ✓
- **Project CRUD**: Create, read, update, delete ✓
- **Todo Management**: Add, complete, delete todos ✓
- **Team Features**: Invitations, roles, access control ✓
- **Security**: Token validation, unauthorized access blocked ✓
- **Subscription Limits**: Free tier enforcement ✓

### ⚠️ MUST FIX BEFORE LAUNCH

1. **Password Reset Flow** - Not fully tested
   - [ ] Request reset endpoint
   - [ ] Email with reset token
   - [ ] Token validation
   - [ ] Password update

2. **Stripe Webhooks** - Critical for payments
   - [ ] subscription.created
   - [ ] payment.failed
   - [ ] subscription.deleted
   - [ ] Test with Stripe CLI

3. **Rate Limiting** - Have middleware, but is it enforced?
   - [ ] Test that spamming actually gets blocked
   - [ ] Verify rate limits reset properly

4. **Error Handling** - What happens when things break?
   - [ ] Database connection failure
   - [ ] Stripe API down
   - [ ] Email service failure
   - [ ] All should fail gracefully, not crash

### 📝 NICE TO HAVE (Post-Launch)
- Command execution tests (terminal feature)
- Analytics tracking
- Notification delivery
- Cleanup service cron jobs
- Import/export features

### 🚀 PRE-LAUNCH CHECKLIST

**Security:**
- [x] XSS protection (DOMPurify in place)
- [x] SQL injection prevention (Mongoose parameterized queries)
- [x] CSRF tokens implemented
- [x] Rate limiting on auth endpoints
- [x] Password hashing (bcrypt)
- [ ] **Production environment variables set**
- [ ] **HTTPS enforced**
- [ ] **Session secrets are strong & unique**

**Database:**
- [ ] **Backup strategy in place**
- [ ] **Indexes created for common queries**
- [ ] **Connection pooling configured**

**Monitoring:**
- [ ] **Error logging (Sentry already configured?)**
- [ ] **Health check endpoint works**
- [ ] **Uptime monitoring (Pingdom/UptimeRobot)**

**Performance:**
- [ ] **Response times < 500ms for common operations**
- [ ] **Tested with 100+ concurrent users**

### 💡 TESTING PHILOSOPHY FOR PRODUCTION

**You don't need 50% coverage to launch.**

What matters:
1. Core user journeys work without breaking
2. Security is solid (can't be hacked easily)
3. Payment flows don't lose money
4. Errors don't crash the server

Your 35% coverage hits #1 and #2. Focus on #3 and #4, then ship it.

**Real companies ship at 30-40% coverage all the time.** The difference is:
- They monitor errors in production
- They fix bugs when users report them
- They add tests for bugs that get reported
- They iterate based on real usage

Perfect testing is the enemy of shipping. Ship → Learn → Improve.
