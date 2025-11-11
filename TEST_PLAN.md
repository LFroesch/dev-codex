# Test Cleanup & Coverage Plan

## Phase 1: Audit Current Tests
1. Analyze existing test files for repetitive patterns
2. Identify common test setup/teardown code
3. Map untested routes and features
4. Check current coverage stats

## Phase 2: Create Test Utilities
1. Build reusable test helpers for:
   - API mocking patterns
   - User authentication setup
   - Database cleanup
   - Common assertions
2. Create fixture factories for models

## Phase 3: Refactor Existing Tests
1. Extract common patterns into utilities
2. Consolidate duplicate test logic
3. Improve test readability
4. Add missing edge cases

## Phase 4: Add Missing Coverage
Priority areas to test:
- **Routes**: Notifications, subscriptions, admin endpoints
- **Features**: Notification flows, billing webhooks, feature adoption tracking
- **CRUD**: Creation, editing, deletion of all entities
- **Edge cases**: Authentication failures, validation errors, race conditions

## Phase 5: Validation
1. Run full test suite
2. Generate coverage report
3. Ensure critical paths have >80% coverage
4. Document test patterns for future reference

---

## Notes
- Focus on routes/features needed for prod release tomorrow
- Clean up AI slop in existing tests
- Ensure subscription flows are well tested
- Cover notification system thoroughly
