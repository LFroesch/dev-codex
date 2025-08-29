# Removed Analytics Functions - Backend Cleanup Reference

This document lists all analytics tracking functions and features removed from the frontend that may have corresponding backend endpoints or database collections that need cleanup.

## 🚫 REMOVED Frontend Analytics Methods

### Core Tracking Methods (from `services/analytics.ts`)
- `trackFeatureUsage(featureName, componentName?, metadata?)`
- `trackNavigation(source, target, metadata?)`  
- `trackPageView(pageName)`
- `trackFieldEdit(fieldName, oldValue, newValue, projectId?, projectName?)`
- `trackAction(actionName, metadata?)`
- `trackSearch(searchTerm, resultsCount, componentName?)`
- `trackError(errorType, errorMessage, componentName?, metadata?)`
- `trackPerformance(actionName, loadTime, componentName?, metadata?)`
- `trackUIInteraction(interactionType, elementId?, elementText?, componentName?, metadata?)`
- `trackButtonClick(buttonName, componentName?, metadata?)`
- `trackTabSwitch(fromTab, toTab, componentName?)`
- `trackFormSubmission(formName, success, errorMessage?, metadata?)`
- `trackModalInteraction(modalName, action, metadata?)`
- `trackFileOperation(operation, fileName?, fileSize?, success?)`
- `trackCustomEvent(eventType, eventData)` (from API)

### Removed from `activityTracker.ts`
- `analyticsService.trackAction()` calls from:
  - `trackCreate()` method
  - `trackUpdate()` method  
  - `trackDelete()` method

### Removed from `useAnalytics.ts` hook
- `trackPageViews` option
- `trackFieldEdits` option
- `trackFormField()` method
- `useFieldAnalytics()` hook entirely

### Removed from Components
- All `analytics.trackFeatureUsage()` calls in `Layout.tsx`
- All `analytics.trackNavigation()` calls in `Layout.tsx`
- All `analytics.trackUIInteraction()` calls in `Layout.tsx`
- All `analytics.trackButtonClick()` calls in `Layout.tsx`
- All `analytics.trackTabSwitch()` calls in `Layout.tsx`
- All `analytics.trackSearch()` calls in `Layout.tsx`
- `analyticsService.trackPerformance()` call in `AdminDashboardPage.tsx`
- Removed "All Tracking" tab from `OptimizedAnalytics.tsx`

### Removed Interface Properties (from `AnalyticsEvent`)
```typescript
// REMOVED EVENT TYPES:
'field_edit' | 'action' | 'page_view' | 'feature_usage' | 'navigation' | 'search' | 'error' | 'performance' | 'ui_interaction'

// REMOVED EVENT DATA FIELDS:
fieldName, fieldType, oldValue, newValue, pageName, actionName, 
featureName, componentName, buttonName, searchTerm, searchResultsCount,
navigationSource, navigationTarget, errorType, errorMessage, loadTime,
actionType, duration, interactionType, elementId, elementText, screenSize
```

## ✅ KEPT Frontend Analytics (DO NOT REMOVE FROM BACKEND)

### Session Management (KEEP THESE)
- `startSession()`
- `endSession()` 
- `getSessionInfo()`
- `hasActiveSession()`
- `setCurrentUser(userId)`
- `clearUserSession()`
- `setCurrentProject(projectId)`
- `getSessionInfo()` usage in SessionTracker
- `getCurrentProject()` usage in CollaborationIndicator

### Project Time Tracking (KEEP THESE)
- `getProjectsTimeData(days)`
- `getProjectTimeData(projectId, days)`
- `trackProjectOpen(projectId, projectName)` - **KEEP THIS ONE**

### Activity Logs (KEEP THESE)
- All `activityLogsAPI` calls
- All `activityTracker` methods (trackCreate, trackUpdate, trackDelete, trackView, etc.)
- User sessions, activity logs, top projects, top users

## 🔍 Backend Endpoints/Collections to Check for Cleanup

### Likely API Endpoints to Remove
- `POST /api/analytics/track` (for removed event types)
- Any endpoints handling the removed event types above
- `POST /api/analytics/track` with `trackCustomEvent` functionality

### Database Collections/Fields to Check
Look for database schemas that store:
- `field_edit` events
- `feature_usage` events  
- `navigation` events
- `page_view` events
- `search` events
- `error` events
- `performance` events
- `ui_interaction` events
- `action` events (generic actions, not activity log actions)

### Database Fields in Events Collection
Fields that may be unused now:
- `fieldName`, `fieldType`, `oldValue`, `newValue`
- `featureName`, `componentName`, `buttonName` 
- `searchTerm`, `searchResultsCount`
- `navigationSource`, `navigationTarget`
- `errorType`, `errorMessage`
- `loadTime`, `actionType`, `duration`
- `interactionType`, `elementId`, `elementText`
- `pageName` (unless used for other purposes)

### Backend Methods to Check
- Any backend analytics processing that expects the removed event types
- Aggregation queries that sum up the removed analytics categories
- Any cron jobs or background processing for the removed analytics types

## ✅ COMPLETED Backend Cleanup

### Removed from Backend Routes (`/routes/analytics.ts`)
- **REMOVED**: `/comprehensive` endpoint (lines 49-114) - used for removed analytics categories
- **UPDATED**: `/track` endpoint to only accept `'project_open'` events

### Removed from Backend Models (`/models/Analytics.ts`)
- **REMOVED**: Event types from enum: `'field_edit' | 'page_view' | 'action' | 'feature_usage' | 'navigation' | 'search' | 'error' | 'performance' | 'ui_interaction'`
- **KEPT**: Event types: `'project_open' | 'session_start' | 'session_end'`
- **REMOVED**: Event data fields: `fieldName, fieldType, oldValue, newValue, pageName, actionName, featureName, componentName, navigationSource, navigationTarget, searchTerm, searchResultsCount, errorType, errorMessage, actionType, interactionType, elementId`
- **KEPT**: Event data fields: `projectId, projectName, duration, metadata`

### Removed from Backend Middleware (`/middleware/analytics.ts`)
- **REMOVED**: `runQuery()` method entirely (280+ lines) - contained aggregation queries for all removed event types
- **UPDATED**: `trackEvent()` method to only accept: `'project_open' | 'session_start' | 'session_end'`
- **REMOVED**: `trackPageView()` middleware entirely
- **UPDATED**: Critical events list to exclude `'error'`

### Removed from Backend App (`/app.ts`)
- **REMOVED**: `trackPageView` import and middleware usage from routes

### Removed from Backend Routes (`/routes/projects.ts`)
- **REMOVED**: `trackFieldChanges` and `trackArrayChanges` import and usage
- **REMOVED**: Field change tracking calls in project update endpoint

### Removed from Backend Utils
- **REMOVED**: `/utils/trackFieldChanges.ts` file entirely (115 lines)
  - `trackFieldChanges()` function
  - `trackArrayChanges()` function  
  - `getFieldType()` helper function

## ⚠️ Important Notes
- **DO NOT remove session management, project time tracking, or activity logs**
- **DO keep** `trackProjectOpen` - it's still used for time tracking
- **DO keep** all `/api/activity-logs/*` endpoints 
- **DO keep** all user session and project time tracking functionality
- The frontend now only sends `project_open` events via the analytics tracking system
- All other user activity is tracked via the activity logs system (which we're keeping)
- **Backend cleanup is COMPLETE** - only essential analytics remain