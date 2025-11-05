# Comprehensive Analytics & Admin Dashboard Overhaul

## Executive Summary

Simplified analytics infrastructure and admin dashboard UX improvements. Hybrid approach: Keep ActivityLog for project collaboration, expand Analytics for basic business intelligence. Add simple conversion tracking, feature usage analytics, basic error monitoring, and data compounding (7-day detail retention for scale). Redesign admin dashboard for modern, responsive UX.

**Key Philosophy:** Start simple, track what matters, scale with compounding infrastructure.

---

# Part 1: Analytics System Enhancements

## Phase 1: Enhanced Analytics Backend

### 1.1 Expand Analytics Model (`/backend/src/models/Analytics.ts`)

**New Event Types:**
```typescript
// User Lifecycle
'user_signup'         // { source, referrer }
'user_upgraded'       // { fromPlan, toPlan }
'user_downgraded'     // { fromPlan, toPlan }

// Feature Engagement (Simple)
'feature_used'        // { feature }

// Project Engagement (expand existing)
'project_created'     // { }
'project_deleted'     // { }

// Collaboration
'team_invite_sent'    // { projectId }
'team_invite_accepted'// { projectId }

// Monetization (Simple)
'checkout_completed'  // { plan, amount }

// Errors (Basic)
'error_occurred'      // { type, message, page }
```

**Enhanced Schema Fields:**
```typescript
interface AnalyticsEvent {
  // Existing fields (keep all)
  userId: string
  sessionId: string
  eventType: string
  eventData: Record<string, any>
  timestamp: Date
  planTier: 'free' | 'pro' | 'premium'
  expiresAt?: Date
  userAgent?: string
  ipAddress?: string

  // NEW fields
  category: 'engagement' | 'business' | 'error'

  // Business intelligence
  isConversion: boolean
  conversionValue?: number  // Dollar value for revenue tracking
}
```

**New Indexes:**
```typescript
analyticsSchema.index({ category: 1, timestamp: -1 })
analyticsSchema.index({ eventType: 1, timestamp: -1 })
analyticsSchema.index({ isConversion: 1, timestamp: -1 })
analyticsSchema.index({ planTier: 1, category: 1, timestamp: -1 })
```

**TTL Strategy (Enhanced):**
```typescript
const EVENT_RETENTION = {
  // Business-critical - never expire
  conversions: Infinity,
  payments: Infinity,

  // Engagement - plan-based (existing)
  feature_usage: planTTL,  // 30d free, 180d pro, unlimited premium
  sessions: planTTL,
  project_activity: planTTL,

  // Errors - shorter retention for all
  errors: 90,           // 90 days all plans
  heartbeats: 7,        // 7 days all plans (existing)
}
```

---

### 1.2 CompactedAnalytics Model (NEW)

**Purpose:** Daily summaries for events older than 7 days to prevent DB bloat while maintaining historical insights.

**Schema:**
```typescript
interface CompactedAnalytics {
  date: Date              // YYYY-MM-DD (start of day)
  userId: ObjectId
  projectId?: ObjectId
  eventType: string
  category: 'engagement' | 'business' | 'error'

  // Aggregated metrics
  count: number           // Total events
  totalDuration: number   // Sum of durations (ms)
  avgDuration: number     // Average duration (ms)
  uniqueSessions: number  // Distinct session IDs

  // Metadata
  planTier: string
  expiresAt?: Date        // Plan-based TTL

  // Conversion tracking
  totalConversionValue: number
  conversionCount: number

  timestamps: {
    firstEvent: Date
    lastEvent: Date
  }
}
```

**Indexes:**
```typescript
compactedAnalyticsSchema.index({ userId: 1, date: -1 })
compactedAnalyticsSchema.index({ eventType: 1, date: -1 })
compactedAnalyticsSchema.index({ category: 1, date: -1 })
compactedAnalyticsSchema.index({ date: -1, planTier: 1 })
compactedAnalyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

**Retention:**
- Free: 90 days of compacted data
- Pro: 365 days of compacted data
- Premium: Unlimited

---

### 1.3 Analytics Compounding Service (NEW)

**File:** `/backend/src/services/analyticsCompounding.ts`

**Purpose:** Daily cron job to aggregate old events and prevent database bloat.

**Strategy:**
- **Raw Events:** Keep for 7 days (high detail)
- **Compacted Summaries:** Keep per plan TTL (moderate detail)
- **Critical Events:** Never compact (conversions, payments, subscriptions)

**Implementation:**
```typescript
class AnalyticsCompoundingService {
  // Runs daily at 3am UTC
  async compactOldEvents() {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)

    // Find events older than 7 days
    const oldEvents = await Analytics.find({
      timestamp: { $lt: cutoffDate },
      isConversion: false,  // Never compact conversions
      eventType: { $nin: ['checkout_completed', 'user_upgraded'] }
    })

    // Group by date, userId, projectId, eventType
    const aggregated = await Analytics.aggregate([
      { $match: { timestamp: { $lt: cutoffDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            userId: '$userId',
            projectId: '$projectId',
            eventType: '$eventType',
            category: '$category',
            planTier: '$planTier'
          },
          count: { $sum: 1 },
          totalDuration: { $sum: '$eventData.duration' },
          uniqueSessions: { $addToSet: '$sessionId' },
          totalConversionValue: { $sum: '$conversionValue' },
          conversionCount: { $sum: { $cond: ['$isConversion', 1, 0] } },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' }
        }
      }
    ])

    // Insert into CompactedAnalytics
    const compacted = aggregated.map(a => ({
      date: new Date(a._id.date),
      userId: a._id.userId,
      projectId: a._id.projectId,
      eventType: a._id.eventType,
      category: a._id.category,
      count: a.count,
      totalDuration: a.totalDuration,
      avgDuration: a.totalDuration / a.count,
      uniqueSessions: a.uniqueSessions.length,
      planTier: a._id.planTier,
      expiresAt: this.calculateTTL(a._id.planTier),
      totalConversionValue: a.totalConversionValue,
      conversionCount: a.conversionCount,
      timestamps: {
        firstEvent: a.firstEvent,
        lastEvent: a.lastEvent
      }
    }))

    await CompactedAnalytics.insertMany(compacted)

    // Delete raw events (keep critical events)
    await Analytics.deleteMany({
      timestamp: { $lt: cutoffDate },
      isConversion: false,
      eventType: { $nin: ['checkout_completed', 'user_upgraded'] }
    })

    // Log compaction results
    await this.logCompaction(oldEvents.length, compacted.length)
  }

  calculateTTL(planTier: string): Date | undefined {
    const now = new Date()
    switch (planTier) {
      case 'free':
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      case 'pro':
        return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      case 'premium':
        return undefined  // No expiration
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    }
  }
}
```

**Cron Job:**
```typescript
// In server.ts or scheduler.ts
import cron from 'node-cron'

// Run daily at 3am UTC
cron.schedule('0 3 * * *', async () => {
  console.log('[Analytics Compounding] Starting daily compaction...')
  try {
    await analyticsCompoundingService.compactOldEvents()
    console.log('[Analytics Compounding] Completed successfully')
  } catch (error) {
    console.error('[Analytics Compounding] Failed:', error)
    // Alert admin via email/notification
  }
})
```

---

### 1.4 Analytics Query Service (NEW)

**File:** `/backend/src/services/analyticsQuery.ts`

**Purpose:** Abstraction layer that queries both raw events (last 7 days) and compacted data (older) transparently.

```typescript
class AnalyticsQueryService {
  async getUserEvents(userId: string, startDate: Date, endDate: Date) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Split query: raw events for recent, compacted for old
    const rawEvents = await Analytics.find({
      userId,
      timestamp: { $gte: Math.max(startDate, sevenDaysAgo), $lte: endDate }
    })

    const compactedEvents = startDate < sevenDaysAgo
      ? await CompactedAnalytics.find({
          userId,
          date: { $gte: startDate, $lt: sevenDaysAgo }
        })
      : []

    // Merge and normalize
    return this.mergeEvents(rawEvents, compactedEvents)
  }

  async getEventCounts(filters: any) {
    // Similar pattern: query both sources and aggregate
    const recent = await Analytics.countDocuments(filters)
    const old = await CompactedAnalytics.aggregate([
      { $match: filters },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ])

    return recent + (old[0]?.total || 0)
  }
}
```

---

### 1.5 Enhanced AnalyticsService Methods

**File:** `/backend/src/middleware/analytics.ts`

**New Methods:**
```typescript
class AnalyticsService {
  // Existing methods: trackEvent, startSession, endSession, etc. (KEEP ALL)

  // NEW: Track conversions
  async trackConversion(
    userId: string,
    eventType: string,
    value: number,
    metadata: Record<string, any>
  ) {
    return this.trackEvent(userId, null, eventType, {
      ...metadata,
      category: 'business',
      isConversion: true,
      conversionValue: value
    })
  }

  // NEW: Track feature usage (simple)
  async trackFeatureUsage(
    userId: string,
    sessionId: string,
    feature: string
  ) {
    return this.trackEvent(userId, sessionId, 'feature_used', {
      feature,
      category: 'engagement'
    })
  }

  // NEW: Track errors
  async trackError(
    userId: string,
    sessionId: string,
    error: Error,
    page: string
  ) {
    return this.trackEvent(userId, sessionId, 'error_occurred', {
      type: error.name,
      message: error.message,
      page,
      category: 'error'
    })
  }
}
```

---

## Phase 2: Simple Conversion Tracking

### 2.1 Basic Conversion Metrics

**Track simple conversion flow:**
1. **Signup** → `user_signup`
2. **Created Project** → `project_created`
3. **Upgraded** → `user_upgraded`

**Simple Conversion Endpoint:**
- `GET /admin/analytics/conversion-rate` - Basic conversion percentage

**Implementation in `/backend/src/routes/analytics.ts`:**
```typescript
router.get('/conversion-rate', async (req, res) => {
  const totalUsers = await User.countDocuments()
  const usersWithProjects = await User.countDocuments({ 'projects.0': { $exists: true } })
  const paidUsers = await User.countDocuments({ planTier: { $in: ['pro', 'premium'] } })

  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers * 100).toFixed(2) : 0
  const projectCreationRate = totalUsers > 0 ? (usersWithProjects / totalUsers * 100).toFixed(2) : 0

  res.json({
    totalUsers,
    usersWithProjects,
    paidUsers,
    conversionRate,
    projectCreationRate
  })
})
```

---

## Phase 3: Simple Feature Usage Analytics

### 3.1 Feature Tracking

**Track these features (simple):**
- Export (any format)
- Team invites
- Search
- Project creation

**Frontend tracking (simple):**
```typescript
// In relevant components
import { analyticsService } from '@/services/analytics'

// Example: Track when export is used
const handleExport = async (format: string) => {
  try {
    await exportProject(format)
    analyticsService.trackFeatureUsage('export')
  } catch (error) {
    analyticsService.trackError(error, window.location.pathname)
  }
}

// Example: Track when search is used
const handleSearch = (query: string) => {
  if (query.length > 0) {
    analyticsService.trackFeatureUsage('search')
  }
  // ... rest of search logic
}
```

### 3.2 Feature Adoption Endpoint

**Route:** `GET /admin/analytics/features/adoption`

**Returns:**
```json
{
  "features": [
    {
      "name": "export_markdown",
      "totalUsers": 234,
      "byPlan": {
        "free": { "users": 123, "percentage": 14.3 },
        "pro": { "users": 89, "percentage": 28.5 },
        "premium": { "users": 22, "percentage": 33.3 }
      },
      "totalUsage": 1234,
      "avgUsagePerUser": 5.2
    }
  ]
}
```

---

## Phase 4: Basic Error Tracking

### 4.1 Frontend Error Tracking

**React Error Boundary:**
```typescript
// /frontend/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: any) {
    analyticsService.trackError(error, window.location.pathname)
  }
}
```

**API Error Interceptor:**
```typescript
// In axios setup
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status >= 400) {
      analyticsService.trackError(error, error.config?.url || 'unknown')
    }
    return Promise.reject(error)
  }
)
```

### 4.2 Error Dashboard Endpoint

**Route:**
- `GET /admin/analytics/errors/summary` - Error counts by type

---

## Phase 5: Activity Log Enhancements

### 5.1 Enhanced ActivityLog Model

**Add to existing schema:**
```typescript
interface ActivityLog {
  // Existing fields (keep all)...

  // NEW: Human-readable fields
  userName?: string           // "John Doe"
  changeDescription?: string  // "John Doe marked todo 'Fix auth bug' as complete"

  // Enhanced metadata
  metadata: {
    previousStatus?: string
    newStatus?: string
    fieldsChanged?: string[]
    impact?: 'minor' | 'major' | 'critical'  // For filtering important changes
    changesSummary?: string  // Auto-generated summary
  }
}
```

### 5.2 ActivityLogger Service Updates

**File:** `/backend/src/services/activityLogger.ts`

**Add description generation:**
```typescript
class ActivityLogger {
  // Keep all existing methods

  // NEW: Generate human-readable descriptions
  generateDescription(log: ActivityLog, user: User): string {
    const userName = user.name || user.email
    const resourceName = log.resourceName || log.resourceId

    switch (log.action) {
      case 'created':
        return `${userName} created ${log.resourceType} "${resourceName}"`
      case 'updated':
        if (log.field === 'status') {
          return `${userName} changed ${log.resourceType} "${resourceName}" status to ${log.newValue}`
        }
        return `${userName} updated ${log.resourceType} "${resourceName}"`
      case 'deleted':
        return `${userName} deleted ${log.resourceType} "${resourceName}"`
      case 'completed':
        return `${userName} marked ${log.resourceType} "${resourceName}" as complete`
      case 'viewed':
        return `${userName} viewed ${log.resourceType} "${resourceName}"`
      case 'invited_member':
        return `${userName} invited ${log.metadata.inviteeEmail} to the project`
      default:
        return `${userName} performed ${log.action} on ${log.resourceType}`
    }
  }

  // Enhanced log method
  async log(data: ActivityLogData) {
    const user = await User.findById(data.userId)

    const activityLog = new ActivityLog({
      ...data,
      userName: user?.name || user?.email,
      changeDescription: this.generateDescription(data, user),
      expiresAt: this.calculateExpiration(data.planTier)
    })

    return activityLog.save()
  }
}
```

---

# Part 2: Admin Dashboard UX Redesign

## Current Problems & Solutions

### Problem 1: Tables are Overwhelming
**Solution:** Card-based layouts for mobile, cleaner tables for desktop, better spacing

### Problem 2: Poor Responsive Design
**Solution:** Mobile-first CSS, responsive cards, no horizontal scrolling

### Problem 3: Actions are Buried
**Solution:** Visible icon buttons instead of dropdown menus

### Problem 4: Inconsistent Styling
**Solution:** Design system with standardized spacing, colors, typography

### Problem 5: Hard to Scan Information
**Solution:** Visual hierarchy, avatars, icons, badges, better contrast

### Problem 6: Modal Overload
**Solution:** Inline editing where possible, consistent modal patterns

### Problem 7: No Search/Filtering
**Solution:** Real-time search bars, filter dropdowns, sort options

---

## Users Tab Redesign

### Desktop Layout
```
┌─────────────────────────────────────────────────────────┐
│ 👥 Users Management                                     │
│ Manage user accounts, plans, and access                 │
│                                                          │
│ [🔍 Search users...]  [Plan ▾] [Status ▾] [Sort by ▾]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────┬──────────────────┬───────┬──────────┬─────────┐ │
│ │ AV │ Name & Email     │ Plan  │ Projects │ Actions │ │
│ ├────┼──────────────────┼───────┼──────────┼─────────┤ │
│ │ JD │ John Doe         │ 💎Pro │ 5 📁     │ 👁 🔧 🚫│ │
│ │    │ john@example.com │       │          │         │ │
│ ├────┼──────────────────┼───────┼──────────┼─────────┤ │
│ │ JS │ Jane Smith       │ ⭐Prm │ 12 📁    │ 👁 🔧 🚫│ │
│ │    │ jane@example.com │       │          │         │ │
│ └────┴──────────────────┴───────┴──────────┴─────────┘ │
│                                                          │
│ [← Prev] Page 1 of 10 [Next →]                         │
└─────────────────────────────────────────────────────────┘
```

### Mobile Card Layout
```
┌────────────────────────────────┐
│ 🔍 Search users...             │
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ JD  John Doe         [⋮]  │ │
│ │     john@example.com       │ │
│ │                            │ │
│ │ 💎 Pro  📊 5 proj  ✅ Act │ │
│ │                            │ │
│ │ [👁 View] [🔧 Edit] [🚫]  │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ JS  Jane Smith       [⋮]  │ │
│ │     jane@example.com       │ │
│ │                            │ │
│ │ ⭐ Prem  📊 12 proj ✅ Act │ │
│ │                            │ │
│ │ [👁 View] [🔧 Edit] [🚫]  │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Features
- **Real-time search** filters as you type
- **Filters:** Plan (All/Free/Pro/Premium), Status (Active/Banned), Admin (Yes/No)
- **Sort by:** Name, Email, Join Date, Project Count
- **User avatars:** Colored circles with initials (deterministic colors from name hash)
- **Visible actions:** No dropdown menus, all actions visible as icon buttons
- **Status pills:** Green=Active, Red=Banned, Yellow=Admin
- **Plan badges:** Different icons/colors per plan tier

### Action Buttons (Always Visible)
- 👁️ **View Details** - Opens user detail modal
- 📁 **Manage Projects** - Opens project management modal
- 🔧 **Edit Plan** - Inline plan tier dropdown
- 🚫 **Ban/Unban** - Opens ban modal with reason
- 🗑️ **Delete** - Opens delete confirmation (destructive, can be in dropdown)

---

## Analytics Tab Complete Redesign

### Layout Structure
```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Analytics Dashboard                                       │
│ [Last 7 days ▾] [Last 30 days ▾] [Custom range] [Refresh]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────┬──────────┬──────────┬──────────┐              │
│ │ 👥 Users │ 💰 MRR   │ 📊 Proj  │ ⚠️ Errors│              │
│ │ 1,234    │ $12,456  │ 5,678    │ 2.3%     │              │
│ │ ↑ 15%    │ ↑ 8.2%   │ ↑ 12%    │ ↓ 0.5%   │              │
│ └──────────┴──────────┴──────────┴──────────┘              │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 🎯 Simple Conversion Metrics (Last 30 Days)           │  │
│ │                                                        │  │
│ │ Total Users:       1,234                               │  │
│ │ Created Projects:    987 (80%)                         │  │
│ │ Upgraded to Paid:    156 (13%)                         │  │
│ │                                                        │  │
│ │ Overall conversion rate: 12.6%                        │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ┌─────────────────────┬─────────────────────┐              │
│ │ 📈 User Growth      │ 🎨 Feature Adoption │              │
│ │                     │                     │              │
│ │ [Line chart]        │ Export: ████ 45%    │              │
│ │                     │ Teams:  ██   23%    │              │
│ │                     │ Search: ███  38%    │              │
│ └─────────────────────┴─────────────────────┘              │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⚠️ Top Errors (Last 24h)                              │  │
│ │                                                        │  │
│ │ 1. Payment timeout            45 errors               │  │
│ │ 2. Session expired            23 errors               │  │
│ │ 3. Project not found          12 errors               │  │
│ │                                                        │  │
│ │ [View All Errors →]                                   │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Export to CSV]                                             │
└──────────────────────────────────────────────────────────────┘
```

### Key Metrics Cards (Top Row)
- **Total Users:** Count + % change from previous period
- **MRR (Monthly Recurring Revenue):** Dollar amount + % change
- **Active Projects:** Count + % change
- **Error Rate:** Percentage + % change (red if increasing)

### Simple Conversion Metrics
- Total users count
- Number who created projects (with percentage)
- Number who upgraded (with percentage)
- Overall conversion rate

### Feature Adoption Chart
- Horizontal bar chart by feature
- Shows adoption percentage across all users
- Simple count of how many users used each feature

### Top Errors Table
- Shows most frequent errors in last 24h
- Error type and count
- Simple list for monitoring

### Export Functionality
- Export to CSV button
- Generates report with selected date range
- Includes all metrics and error data

---

## Tickets Tab (Minor Improvements)

**Current state:** Already has Kanban board, works well

**Enhancements:**
- Add count badges to status columns headers
- Add priority filter dropdown
- Add "Assigned to me" quick filter
- Improve card visual hierarchy
- Add keyboard shortcuts (j/k navigation)

---

## Activity Feed Tab (NEW)

### Purpose
Unified view of all system activity: analytics events + activity logs

### Layout
```
┌─────────────────────────────────────────────────────────┐
│ 📰 Activity Feed                                        │
│ [All Activity ▾] [Last 1 hour ▾] [🔍 Search...]        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💎 John Doe upgraded to Pro                         │ │
│ │ 2 minutes ago • user_upgraded                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📁 Jane Smith created project "Website Redesign"    │ │
│ │ 5 minutes ago • project_created                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ Error occurred: Payment timeout                  │ │
│ │ 7 minutes ago • error_occurred • 3 users affected   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✅ Bob Johnson completed todo "Fix login bug"       │ │
│ │ 12 minutes ago • activity_log                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Load More]                                            │
└─────────────────────────────────────────────────────────┘
```

### Features
- **Combined feed:** Analytics events + activity logs in one timeline
- **Filters:** Event type, user, project, time range
- **Search:** Real-time text search across all activity
- **Color coding:** Different icons/colors per event category
- **Click to expand:** See full event details
- **Auto-refresh:** Option to enable/disable live updates

### Event Categories & Icons
- 💎 **Business:** Upgrades, downgrades, payments
- 📁 **Engagement:** Projects, content, collaboration
- ⚠️ **Errors:** Errors, failures, issues
- 🐢 **Performance:** Slow operations, timeouts
- 👥 **Users:** Signups, activations, logins
- ✅ **Activity:** CRUD operations from activity logs

---

## News Tab (Keep Existing, Minor Polish)

**Current state:** Works well with create/edit/delete

**Minor enhancements:**
- Add search bar for filtering posts
- Add bulk actions (select multiple, publish/unpublish all)
- Improve markdown preview styling
- Add draft auto-save

---

## Design System Standards

### Colors
- **Primary:** Blue (`#3b82f6`) - Main actions
- **Success:** Green (`#10b981`) - Active, completed, positive
- **Warning:** Yellow (`#f59e0b`) - Caution, moderate priority
- **Error:** Red (`#ef4444`) - Banned, errors, critical
- **Info:** Cyan (`#06b6d4`) - Informational
- **Purple:** (`#8b5cf6`) - Premium plan
- **Gray:** (`#6b7280`) - Inactive, disabled

### Spacing System
- **xs:** 4px (`gap-1`)
- **sm:** 8px (`gap-2`)
- **md:** 16px (`gap-4`)
- **lg:** 24px (`gap-6`)
- **xl:** 32px (`gap-8`)

Use `gap-2` (8px) as default for most layouts.

### Typography
- **H1:** `text-2xl font-bold` - Page titles
- **H2:** `text-xl font-semibold` - Section headers
- **H3:** `text-lg font-medium` - Sub-sections
- **Body:** `text-base` - Default text
- **Small:** `text-sm` - Secondary text
- **Tiny:** `text-xs` - Captions, timestamps

### Component Patterns

**Card:**
```tsx
<div className="rounded-lg border-2 border-base-content/20 shadow-lg p-4 bg-base-100">
  {/* Content */}
</div>
```

**Status Badge:**
```tsx
<span className="badge badge-success">Active</span>
<span className="badge badge-error">Banned</span>
<span className="badge badge-warning">Admin</span>
```

**Plan Badge:**
```tsx
<span className="badge badge-ghost">Free</span>
<span className="badge badge-primary">Pro</span>
<span className="badge badge-secondary">Premium</span>
```

**Avatar (Initials):**
```tsx
<div className="avatar placeholder">
  <div className="bg-primary text-primary-content rounded-full w-10">
    <span>JD</span>
  </div>
</div>
```

**Search Input:**
```tsx
<div className="form-control">
  <div className="input-group">
    <span>🔍</span>
    <input type="text" placeholder="Search..." className="input input-bordered w-full" />
  </div>
</div>
```

**Action Buttons:**
```tsx
<div className="btn-group">
  <button className="btn btn-sm btn-ghost" title="View">👁️</button>
  <button className="btn btn-sm btn-ghost" title="Edit">🔧</button>
  <button className="btn btn-sm btn-error" title="Ban">🚫</button>
</div>
```

---

## Quick Wins (Implement First)

### Week 1 Priorities
1. **Add search bars** to Users, Tickets, News tabs
2. **Replace dropdown menus** with visible icon buttons
3. **Add user avatars** (initials in colored circles)
4. **Implement card layouts** for mobile responsiveness
5. **Add loading skeletons** instead of spinners

### Implementation Order
1. Design system setup (colors, spacing, components)
2. Users tab redesign (highest impact)
3. Analytics tab overhaul (core feature)
4. Activity feed tab (new feature)
5. Tickets + News polish (minor updates)

---

## Backend API Enhancements

### New Admin Endpoints

**Analytics:**
- `GET /admin/analytics/overview` - Key metrics (users, MRR, projects, errors)
- `GET /admin/analytics/conversion-rate` - Simple conversion percentage
- `GET /admin/analytics/features/adoption` - Feature usage counts
- `GET /admin/analytics/errors/summary` - Top errors
- `GET /admin/analytics/users/growth` - User growth over time

**Activity:**
- `GET /admin/activity/feed` - Combined analytics + activity logs

### Caching Strategy (Optional for Later)

**Note:** Start without caching, add later if performance becomes an issue.

When ready to add caching:
- Cache key format: `admin:analytics:{endpoint}:{hash(params)}`
- TTL: 30 seconds
- Manual invalidation on refresh button

---

## Database Optimizations

### New Indexes
```typescript
// Analytics
analyticsSchema.index({ category: 1, timestamp: -1 })
analyticsSchema.index({ eventType: 1, timestamp: -1 })
analyticsSchema.index({ isConversion: 1, timestamp: -1 })
analyticsSchema.index({ planTier: 1, category: 1, timestamp: -1 })

// CompactedAnalytics (NEW collection)
compactedAnalyticsSchema.index({ userId: 1, date: -1 })
compactedAnalyticsSchema.index({ eventType: 1, date: -1 })
compactedAnalyticsSchema.index({ category: 1, date: -1 })
compactedAnalyticsSchema.index({ date: -1, planTier: 1 })
compactedAnalyticsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// ActivityLog enhancements
activityLogSchema.index({ action: 1, timestamp: -1 })
activityLogSchema.index({ resourceType: 1, action: 1, timestamp: -1 })
```

### Storage Impact

**Before Compounding:**
- Avg event size: ~500 bytes
- 10K events/day: ~5 MB/day → 150 MB/month → 1.8 GB/year

**After Compounding (7-day window):**
- Raw events (7 days): 35 MB
- Compacted summaries: ~5 MB/month → 60 MB/year
- **Net savings: ~96% long-term storage**

---

## Frontend Component Structure

### New Components to Create

**Analytics Dashboard:**
- `/frontend/src/components/admin/analytics/AnalyticsDashboard.tsx`
- `/frontend/src/components/admin/analytics/MetricsCards.tsx`
- `/frontend/src/components/admin/analytics/ConversionFunnel.tsx`
- `/frontend/src/components/admin/analytics/FeatureAdoptionChart.tsx`
- `/frontend/src/components/admin/analytics/ErrorsTable.tsx`
- `/frontend/src/components/admin/analytics/SlowOperationsTable.tsx`

**Users Tab:**
- `/frontend/src/components/admin/users/UsersTable.tsx` (enhance existing)
- `/frontend/src/components/admin/users/UsersCardList.tsx` (NEW - mobile)
- `/frontend/src/components/admin/users/UserSearchBar.tsx`
- `/frontend/src/components/admin/users/UserAvatar.tsx`
- `/frontend/src/components/admin/users/UserActionButtons.tsx`

**Activity Feed:**
- `/frontend/src/components/admin/activity/ActivityFeed.tsx`
- `/frontend/src/components/admin/activity/ActivityCard.tsx`
- `/frontend/src/components/admin/activity/ActivityFilters.tsx`

**Shared:**
- `/frontend/src/components/admin/shared/StatCard.tsx`
- `/frontend/src/components/admin/shared/StatusBadge.tsx`
- `/frontend/src/components/admin/shared/PlanBadge.tsx`
- `/frontend/src/components/admin/shared/LoadingSkeleton.tsx`

---

## Implementation Timeline

### Week 1: Backend Foundation
**Days 1-2:**
- Expand Analytics model (add new fields)
- Create CompactedAnalytics model
- Enhanced AnalyticsService methods (simple tracking)

**Days 3-4:**
- Analytics compounding service
- Analytics query service (abstraction layer)
- New admin analytics endpoints

**Days 5-7:**
- Simple conversion tracking
- Feature usage instrumentation (simple)
- Basic error tracking

### Week 2: Frontend & Activity Logs
**Days 1-3:**
- Design system setup (shared components)
- Analytics tab redesign (metrics cards, simple conversion)
- Frontend error tracking (Error Boundary)

**Days 4-5:**
- Users tab improvements (search, filters, avatars, cards)
- Mobile responsive layouts

**Days 6-7:**
- Activity Feed tab (NEW)
- Activity Log enhancements (descriptions)
- Index creation

### Week 3: Data Compounding & Testing
**Days 1-2:**
- Compaction cron job implementation
- Testing compaction with sample data

**Days 3-4:**
- Query abstraction layer testing
- End-to-end testing

**Days 5-7:**
- Bug fixes
- Documentation
- Deployment

---

## Success Metrics

### Admin Dashboard UX
- [ ] Page load time < 2 seconds (with cache)
- [ ] Search results appear in < 200ms
- [ ] No horizontal scrolling on any screen size
- [ ] Mobile usage feels native (card layouts)
- [ ] Can find any user/ticket in < 3 seconds

### Analytics System
- [ ] Track basic user conversion rate
- [ ] See top errors in dashboard
- [ ] Feature adoption visible
- [ ] Simple, clear metrics

### Performance
- [ ] Dashboard loads in < 3 seconds
- [ ] Storage growth manageable with compaction
- [ ] Zero data loss during compaction
- [ ] Compaction job completes in < 5 minutes

### Business Intelligence
- [ ] Track overall conversion rate
- [ ] Identify most/least used features
- [ ] See error counts
- [ ] Calculate MRR

---

## Testing Strategy

### Unit Tests
- AnalyticsService methods (batching, sanitization)
- CompoundingService aggregation logic
- Query abstraction layer (raw + compacted queries)
- Activity description generation

### Integration Tests
- End-to-end event tracking flow
- Compaction job with sample data
- Cache invalidation on refresh
- Funnel tracking across user journey

### Load Tests
- 10K events/second ingestion
- Dashboard query performance under load
- Redis cache hit rates
- Compaction job with 1M+ events

### Manual Testing
- Admin dashboard on mobile devices
- Search/filter functionality
- Export CSV with large datasets
- Error tracking from frontend to dashboard

---

## Monitoring & Alerting

### Critical Alerts (Immediate Action)
- Error rate suddenly spikes
- Compaction job failure (2 days in a row)
- Storage growth unusually high

### Weekly Review
- Check error trends
- Review feature adoption
- Check MRR and revenue
- Monitor storage usage

---

## Rollback Plan

### If Issues Occur:

**Analytics System Issues:**
1. Pause compaction job (keep raw events longer)
2. Fallback to existing Analytics model (disable new fields)

**Admin Dashboard Issues:**
1. Revert to previous AdminDashboardPage component
2. Hide new Activity Feed tab

### Rollback Commands:
```bash
# Revert analytics changes
git revert <commit-hash-analytics>

# Revert frontend changes
git revert <commit-hash-frontend>

# Disable compaction job
# Comment out cron schedule in server.ts
```

---

## Post-Launch Tasks

### Week 1 After Launch
- Monitor error rates
- Gather admin feedback on dashboard UX
- Verify compaction job success
- Check storage reduction metrics

### Week 2-4 After Launch
- Review conversion data
- Identify feature adoption patterns
- Implement additional visualizations based on feedback

### Long-term Enhancements (Maybe)
- Real-time updates for activity feed
- Export analytics to CSV/external tools
- More detailed filtering options

---

## Notes

- Keep it simple - don't over-engineer
- Prioritize backend stability over frontend polish
- Test compaction job thoroughly with production-like data
- Mobile-first design for all new components
- Keep existing functionality working during rollout
- Start without caching, add if needed later
- Document all new endpoints in API docs
- Add TypeScript types for all new models
