# 🚀 Critical Issues Sprint Plan - 2 Weeks

## Sprint Goal: Fix production-critical gaps to reach A- grade (85+)

---

## Week 1: Testing & Bundle Optimization

### Day 1-2: Emergency Testing Foundation
```bash
# Install testing framework
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Create test structure
mkdir -p frontend/src/__tests__/{components,hooks,utils}
mkdir -p backend/src/__tests__/{routes,middleware,services}
```

**Priority Tests (Write these first):**
1. `auth.test.ts` - Login/logout/JWT verification
2. `projects.test.ts` - CRUD operations (GET/POST/PUT/DELETE)
3. `billing.test.ts` - Stripe integration edge cases
4. `analytics.test.ts` - Session management
5. `Layout.test.tsx` - Main component doesn't crash

**Target: 40% coverage by end of week**

### Day 5: Error Boundaries
**Create ErrorBoundary.tsx:**
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('App Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}
```

---

## Week 2: Memory Leaks & Database Optimization

### Day 6-8: Fix useEffect Cleanup
**Pattern to find and fix:**
```typescript
// ❌ Bad (memory leak)
useEffect(() => {
  const interval = setInterval(() => {...}, 1000);
  // Missing cleanup!
}, []);

// ✅ Good (clean)
useEffect(() => {
  const interval = setInterval(() => {...}, 1000);
  return () => clearInterval(interval); // Cleanup!
}, []);
```

**Files to prioritize:**
- `SessionTracker.tsx` - Has timers
- `CollaborationIndicator.tsx` - Has intervals  
- `OptimizedAnalytics.tsx` - Has polling
- `NotificationBell.tsx` - Has WebSocket connections

### Day 9-10: Database Query Optimization
**Fix N+1 Issues:**
```typescript
// ❌ Bad (N+1 queries)
const projects = await Project.find({userId});
for (let project of projects) {
  const teamMembers = await TeamMember.find({projectId: project.id});
}

// ✅ Good (single aggregation)
const projectsWithTeams = await Project.aggregate([
  {$match: {userId}},
  {$lookup: {from: 'teammembers', localField: '_id', foreignField: 'projectId', as: 'team'}}
]);
```

---

## 🎯 Sprint Success Metrics

### Week 1 Targets:
- [ ] 40% test coverage (from 2%)
- [ ] Bundle size <500KB (from 764KB)  
- [ ] Error boundaries implemented
- [ ] Zero console errors on critical paths

### Week 2 Targets:
- [ ] 73 useEffect cleanups audited and fixed
- [ ] Database queries optimized (6 populate calls → 2 aggregations)
- [ ] Memory usage stable over 30min sessions
- [ ] All timers/intervals have cleanup

### Final Grade Target: **A- (85/100)**

---

## 🛠️ Implementation Order (Most Critical First)

### 🚨 **IMMEDIATE (Start today):**
1. **Auth tests** - Prevents login/security bugs
2. **Error boundaries** - Prevents app crashes  
3. **Bundle splitting** - Improves user experience immediately

### 📈 **HIGH IMPACT (Days 3-7):**
1. **useEffect cleanup in SessionTracker** - Biggest memory leak
2. **Lazy load admin pages** - Biggest bundle savings
3. **Project CRUD tests** - Most used functionality

### 🔧 **TECHNICAL DEBT (Days 8-10):**
1. **Database aggregations** - Better performance under load
2. **Remaining useEffect cleanups** - Long-term stability
3. **Additional test coverage** - Edge cases

---

## 📊 Expected Impact

**Before Sprint:**
- Grade: B- (78/100)
- Bundle: 764KB
- Test Coverage: 2%
- Memory Leaks: High risk

**After Sprint:**  
- Grade: A- (85/100)
- Bundle: <500KB
- Test Coverage: 40%+
- Memory Leaks: Minimal risk

**ROI:** 2 weeks of work = production-ready application with minimal risk of crashes or performance issues.