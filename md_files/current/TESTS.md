# TEST COVERAGE

**Target:** 70%+
**Current:** 37.67%
**Remaining:** +32.33%

## Status (2025-10-29)

**Metrics:**
- Test files: 32
- Total tests: ~565
- Passing: ~500
- Failing: ~65 (new handler tests need fixes)

**Infrastructure:**
- Global MongoDB setup (one server, 100-200MB RAM)
- ParsedCommand type fixed with helper functions
- Handler imports fixed (hasFlag added to 4 files)

## Completed

### Routes (23 files, ~400 tests)
- auth.ts: 54.57% (65 tests)
- health.ts: 86.66% (12 tests)
- news.ts: 80% (26 tests)
- invitations.ts: 83.75% (13 tests)
- activityLogs.ts: 84.33% (18 tests)
- public.ts: 53.57% (17 tests)
- terminal.ts: 0% (13 tests, needs fix)
- base.ts: 100% (19 tests)
- admin-extended: 27 tests
- analytics-extended: 25 tests
- projects-extended: 32 tests
- billing-extended: 23 tests
- ideas-extended: 17 tests
- tickets.ts: 85.29%
- notifications.ts: 61.53%

### Services (2 files, ~39 tests)
- notificationService.test.ts: 19 tests
- activityLogger.test.ts: 20 tests

### Handlers (9 files, ~104 tests - ADDED TODAY)
- TodoHandlers.test.ts: 14 tests (some failing)
- NoteHandlers.test.ts: 5 tests
- DevLogHandlers.test.ts: 5 tests
- ComponentHandlers.test.ts: 15 tests (failing)
- RelationshipHandlers.test.ts: 12 tests (failing)
- SearchHandlers.test.ts: 9 tests (failing)
- SettingsHandlers.test.ts: 11 tests (passing)
- StackHandlers.test.ts: 10 tests (failing)
- TeamHandlers.test.ts: 9 tests (failing)

## TODO (to reach 70%)

### Priority 1: Fix Failing Tests (~65 tests)
- Handler test mocking issues
- Estimated coverage gain: +5-10%

### Priority 2: Service Tests
- [ ] commandExecutor.test.ts (command execution, security, timeouts)
- [ ] commandParser.test.ts (parsing, validation, flags)
- [ ] emailService.test.ts (sending, templates, errors)
- Estimated coverage gain: +10-15%

### Priority 3: Middleware Tests
- [ ] commandSecurity.test.ts (injection, validation, traversal)
- [ ] requestLogger.test.ts (logging, masking, errors)
- [ ] validation.test.ts (expand from 98.31%)
- [ ] analytics.test.ts (expand from 22.58%)
- Estimated coverage gain: +5-10%

### Priority 4: Terminal Route
- [ ] Fix terminal.ts tests (currently 0% coverage)
- Estimated coverage gain: +2-3%

## Coverage by Area

**Routes:** 44.09%
**Services:** ~15% (notificationService/activityLogger covered)
**Handlers:** ~20% (9 files with new tests)
**Middleware:** 46.42%
**Models:** 96.77%
**Config:** 55.65%

## Blockers

- ~65 handler tests failing due to mock setup issues
- terminal.ts tests not executing (needs investigation)
- Some tests timing out (need better async handling)
