# Tutorial/Onboarding System - Comprehensive Implementation Plan

## Overview
A step-by-step interactive tutorial system that guides new users through the application's core features. The tutorial appears in the bottom-right corner with navigation controls and can be skipped or resumed at any time.

## Tutorial Flow (12 Steps)

### Step 1: Create & Select Project (/projects)
- **Target**: "Create New Project" button
- **Content**: Explain project creation workflow, project structure
- **Action Required**: User must create and select a project to continue
- **Highlight**: Create button, project cards, project selector sidebar

### Step 2: Header Components (/projects)
- **Target**: Header bar (Session Tracker, Notifications, Search, User Menu)
- **Content**: Explain session tracking, notification system, quick search functionality
- **Highlight**: Each header element sequentially

### Step 3: Navigation System (/projects)
- **Target**: Main nav and secondary nav
- **Content**: Explain navigation structure, tabs, project-specific vs global pages
- **Highlight**: Main nav items, project details tabs

### Step 4: Terminal (/terminal)
- **Target**: Command input, validation, history
- **Content**: Explain CLI interface, autocomplete, command execution
- **Prerequisites**: Project must be selected
- **Highlight**: Terminal input, command list, history

### Step 5: Notes/Todos/DevLogs (/notes)
- **Target**: Tabs, note creation, collaborative features
- **Content**: Explain note-taking, todo management, devlog tracking
- **Prerequisites**: Project must be selected
- **Highlight**: Tab switcher, create buttons, lock indicators

### Step 6: Stack Management (/stack)
- **Target**: Technology stack, package management
- **Content**: Explain tech stack organization, preset selection
- **Prerequisites**: Project must be selected
- **Highlight**: Current/Add tabs, category sections

### Step 7: Features/Components (/features)
- **Target**: Component graph, relationships
- **Content**: Explain feature documentation, component visualization
- **Prerequisites**: Project must be selected
- **Highlight**: Graph view, component nodes, structure tab

### Step 8: Deployment (/deployment)
- **Target**: Deployment configuration, environment variables
- **Content**: Explain deployment setup, env management
- **Prerequisites**: Project must be selected
- **Highlight**: Deployment tabs, configuration fields

### Step 9: Public Sharing (/public)
- **Target**: Public slug, visibility settings
- **Content**: Explain public project sharing, discovery settings
- **Highlight**: URL configuration, visibility toggles

### Step 10: Team Collaboration (/sharing)
- **Target**: Team invitations, role management
- **Content**: Explain team features, permission levels, activity tracking
- **Highlight**: Invite button, team member list, activity log

### Step 11: Account Settings (/account-settings)
- **Target**: Profile, theme customization, public profile
- **Content**: Explain user settings, theme creation, profile management
- **Highlight**: Settings tabs, theme preview, custom theme builder

### Step 12: Discovery (/discover)
- **Target**: Public projects/users, search/filter
- **Content**: Explain discovery features, community exploration
- **Highlight**: Search bar, filter controls, project cards

---

## Implementation Phases

## Phase 1: Database Schema & Backend API

### 1.1 Update User Model
**File**: `backend/src/models/User.ts`

Add tutorial tracking fields:
```typescript
tutorialCompleted: boolean;
tutorialProgress: {
  currentStep: number;
  completedSteps: number[];
  skipped: boolean;
  lastActiveDate: Date;
};
```

**Schema additions**:
- `tutorialCompleted: { type: Boolean, default: false }`
- `tutorialProgress.currentStep: { type: Number, default: 0 }`
- `tutorialProgress.completedSteps: [{ type: Number }]`
- `tutorialProgress.skipped: { type: Boolean, default: false }`
- `tutorialProgress.lastActiveDate: { type: Date, default: Date.now }`

**Index**: Add index on `tutorialCompleted` for quick queries

### 1.2 Create Tutorial Configuration Model
**File**: `backend/src/models/TutorialStep.ts`

```typescript
interface ITutorialStep {
  stepNumber: number;
  title: string;
  description: string;
  route: string;
  targetElement?: string; // CSS selector for highlighting
  requiresProjectSelection: boolean;
  content: {
    heading: string;
    body: string;
    tips?: string[];
    actionRequired?: string;
  };
  position: 'top' | 'bottom' | 'left' | 'right';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 Create Tutorial Routes
**File**: `backend/src/routes/tutorial.ts`

**Endpoints**:
- `GET /api/tutorial/steps` - Get all tutorial steps
- `GET /api/tutorial/progress` - Get user's tutorial progress
- `PATCH /api/tutorial/progress` - Update tutorial progress
  - Body: `{ currentStep, completedSteps, skipped }`
- `POST /api/tutorial/complete` - Mark tutorial as completed
- `POST /api/tutorial/reset` - Reset tutorial progress
- `PATCH /api/tutorial/skip` - Mark tutorial as skipped

**Admin endpoints**:
- `POST /api/admin/tutorial/steps` - Create tutorial step
- `PUT /api/admin/tutorial/steps/:stepNumber` - Update step
- `DELETE /api/admin/tutorial/steps/:stepNumber` - Delete step

### 1.4 Create Tutorial Handler
**File**: `backend/src/services/handlers/TutorialHandler.ts`

**Methods**:
- `getTutorialSteps()` - Fetch active steps, sorted by stepNumber
- `getUserProgress(userId)` - Get user's tutorial state
- `updateProgress(userId, data)` - Update progress atomically
- `completeTutorial(userId)` - Mark tutorial complete
- `resetTutorial(userId)` - Reset to step 0
- `skipTutorial(userId)` - Mark skipped, don't show again

### 1.5 Update Auth Response
**File**: `backend/src/routes/auth.ts`

Include tutorial data in `/api/auth/me` response:
```typescript
{
  user: {
    ...existingFields,
    tutorialCompleted,
    tutorialProgress
  }
}
```

---

## Phase 2: Frontend State Management & Hooks

### 2.1 Create Tutorial Hook
**File**: `frontend/src/hooks/useTutorial.ts`

**State**:
- `tutorialSteps: TutorialStep[]`
- `currentStep: number`
- `isActive: boolean`
- `isLoading: boolean`
- `completedSteps: number[]`

**Methods**:
- `loadTutorialSteps()` - Fetch steps from API
- `startTutorial()` - Initialize tutorial at step 0
- `nextStep()` - Advance to next step (with route navigation)
- `previousStep()` - Go back one step
- `skipTutorial()` - Mark skipped and hide
- `completeTutorial()` - Mark complete
- `goToStep(stepNumber)` - Jump to specific step
- `markStepCompleted(stepNumber)` - Mark step done

**Side Effects**:
- Auto-save progress on step change (debounced)
- Navigate to step's route when changing steps
- Check if project is selected for steps requiring it
- Emit events for analytics tracking

### 2.2 Create Tutorial Context
**File**: `frontend/src/contexts/TutorialContext.tsx`

Wrap `useTutorial` hook in context provider for global access across components.

**Provider Props**:
- `children: ReactNode`

**Context Value**:
- All hook methods and state
- Additional utilities for highlight positioning

### 2.3 Update Layout State
**File**: `frontend/src/components/Layout.tsx`

Add tutorial context provider:
```typescript
<TutorialProvider>
  <ToastContainer />
  {/* existing layout */}
  <TutorialOverlay />
</TutorialProvider>
```

### 2.4 Update User Type
**File**: `frontend/src/api/types.ts`

Add tutorial fields to User interface:
```typescript
interface User {
  // ...existing fields
  tutorialCompleted: boolean;
  tutorialProgress?: {
    currentStep: number;
    completedSteps: number[];
    skipped: boolean;
    lastActiveDate: string;
  };
}
```

---

## Phase 3: Frontend UI Components

### 3.1 Tutorial Overlay Component
**File**: `frontend/src/components/tutorial/TutorialOverlay.tsx`

**Features**:
- Fixed position in bottom-right corner (responsive)
- DaisyUI card component with shadow
- Animated entrance/exit (slide-in from bottom-right)
- Z-index above all content except modals
- Responsive sizing (desktop: 400px wide, mobile: 90% width)

**Structure**:
```tsx
<div className="tutorial-overlay">
  <TutorialCard>
    <TutorialHeader />
    <TutorialContent />
    <TutorialFooter />
  </TutorialCard>
</div>
```

**Styling**:
- `position: fixed`
- `bottom: 1rem; right: 1rem`
- `z-index: 40` (below modals at 50)
- DaisyUI card classes: `card bg-base-100 shadow-xl`

### 3.2 Tutorial Header
**File**: `frontend/src/components/tutorial/TutorialHeader.tsx`

**Elements**:
- Step indicator: "Step X of 12"
- Progress bar (DaisyUI progress component)
- Close/Skip button (X icon in top-right)

**Actions**:
- Close button opens "Skip Tutorial?" confirmation modal

### 3.3 Tutorial Content
**File**: `frontend/src/components/tutorial/TutorialContent.tsx`

**Elements**:
- Heading (step title)
- Description text (scrollable if long)
- Tips section (optional, collapsible)
- Action required indicator (if applicable)

**Styling**:
- Max height with scroll for long content
- DaisyUI typography classes
- Badge for "Action Required"

### 3.4 Tutorial Footer
**File**: `frontend/src/components/tutorial/TutorialFooter.tsx`

**Buttons**:
- Back button (disabled on step 1)
- Next/Complete button
  - "Next" on steps 1-11
  - "Finish Tutorial" on step 12
- Progress dots (12 dots, current highlighted)

**Layout**:
- Flex row with space-between
- DaisyUI button styles
- Disabled state styling

### 3.5 Tutorial Highlight Component
**File**: `frontend/src/components/tutorial/TutorialHighlight.tsx`

**Purpose**: Highlight target elements with spotlight effect

**Features**:
- Semi-transparent overlay covering entire screen
- Cutout/spotlight on target element
- Pulsing border around target
- Pointer to tutorial overlay
- Click-through to target element

**Implementation**:
- Portal to render above content
- Use `getBoundingClientRect()` to position highlight
- CSS `clip-path` for spotlight effect
- Animate with Tailwind transitions

**Props**:
```typescript
interface TutorialHighlightProps {
  targetSelector?: string;
  enabled: boolean;
}
```

### 3.6 Welcome Modal
**File**: `frontend/src/components/tutorial/WelcomeModal.tsx`

**Trigger**: First time user logs in (`!tutorialCompleted && !tutorialProgress.skipped`)

**Content**:
- Welcome message
- Brief overview of tutorial
- "Start Tutorial" button (primary)
- "Skip for now" button (ghost)

**Actions**:
- Start: Initialize tutorial, close modal
- Skip: Call `skipTutorial()`, close modal

### 3.7 Tutorial Complete Modal
**File**: `frontend/src/components/tutorial/TutorialCompleteModal.tsx`

**Trigger**: After completing step 12

**Content**:
- Congratulations message
- Summary of features learned
- "Explore on your own" button
- Option to restart tutorial

---

## Phase 4: Step-Specific Integration

### 4.1 Projects Page Integration
**File**: `frontend/src/components/Layout.tsx` (projects section)

**Step 1 Highlights**:
- "Create New Project" button
- Project cards
- Project selector sidebar

**Implementation**:
- Add `data-tutorial-target="create-project-button"` to button
- Add `data-tutorial-target="project-card"` to first card
- Tutorial hook watches for project creation/selection

### 4.2 Header Components Integration
**File**: `frontend/src/components/Layout.tsx` (header)

**Step 2 Highlights**:
- SessionTracker component
- NotificationBell component
- Search bar
- UserMenu component

**Implementation**:
- Add data attributes to each component
- Show highlights sequentially with delay
- Expand dropdown menus programmatically

### 4.3 Navigation Integration
**File**: `frontend/src/components/navigation/MainNav.tsx`, `SecondaryNav.tsx`

**Step 3 Highlights**:
- Main nav items
- Secondary nav tabs
- Project details nav

**Implementation**:
- Add data attributes to nav items
- Highlight different nav sections with transitions

### 4.4 Project-Required Steps (4-8)
**Files**: Each respective page component

**Prerequisites Check**:
```typescript
useEffect(() => {
  if (currentTutorialStep >= 4 && currentTutorialStep <= 8) {
    if (!selectedProject) {
      toast.warning('Please select a project to continue');
      goToStep(1); // Return to project selection
    }
  }
}, [currentTutorialStep, selectedProject]);
```

**Page-Specific Highlights**:
- Terminal: Command input, suggestions, history
- Notes: Tabs, note list, create button, editor
- Stack: Current/Add tabs, tech categories, preset options
- Features: Graph view, component nodes, structure tab
- Deployment: Configuration forms, env variables, deployment notes

### 4.5 Global Pages (9-12)
**Files**: PublicPage, SharingPage, AccountSettingsPage, DiscoverPage

**Highlights**:
- Key features and controls for each page
- No project requirement
- Can navigate freely

---

## Phase 5: Tutorial Content Management

### 5.1 Initial Tutorial Steps Seed
**File**: `backend/src/scripts/seedTutorial.ts`

Create script to populate initial tutorial steps with content.

**Content for each step**:
- Title
- Description
- Detailed body text
- Tips array
- Target element selectors
- Route path
- Position preference

### 5.2 Admin Tutorial Management
**File**: `frontend/src/pages/AdminDashboardPage.tsx`

Add "Tutorial" tab to admin dashboard:
- List all tutorial steps
- Edit step content
- Reorder steps
- Toggle step active/inactive
- Preview tutorial

**Components**:
- `TutorialStepList` - Table of steps
- `TutorialStepEditor` - Form to edit step
- `TutorialPreview` - Preview tutorial overlay

---

## Phase 6: Analytics & Tracking

### 6.1 Tutorial Analytics Events
**File**: `frontend/src/hooks/useTutorial.ts`

Track events:
- `tutorial_started`
- `tutorial_step_viewed` (with step number)
- `tutorial_step_completed` (with step number)
- `tutorial_skipped` (with last step reached)
- `tutorial_completed`
- `tutorial_reset`

### 6.2 Tutorial Completion Metrics
**File**: `backend/src/routes/admin.ts`

Add admin endpoint:
- `GET /api/admin/analytics/tutorial`
  - Total users
  - Users who started tutorial
  - Users who completed tutorial
  - Average completion rate
  - Most common drop-off step
  - Average time to complete

---

## Phase 7: Polish & Edge Cases

### 7.1 Route Guards
**File**: `frontend/src/hooks/useTutorial.ts`

Handle navigation edge cases:
- User manually navigates away during tutorial
  - Pause tutorial, show resume button
- User closes browser mid-tutorial
  - Save progress, resume on next login
- User tries to access locked features
  - Guide back to tutorial

### 7.2 Mobile Responsiveness
**Files**: All tutorial components

- Tutorial overlay repositions to bottom (full-width) on mobile
- Highlights adjust for smaller screens
- Touch-friendly button sizes
- Simplified animations for performance

### 7.3 Keyboard Shortcuts
**File**: `frontend/src/components/tutorial/TutorialOverlay.tsx`

Shortcuts:
- `Esc` - Skip/close tutorial (with confirmation)
- `Arrow Right` / `Enter` - Next step
- `Arrow Left` - Previous step
- `Ctrl/Cmd + K` - Jump to step (show step menu)

### 7.4 Accessibility
**Files**: All tutorial components

- ARIA labels for all buttons
- Screen reader announcements for step changes
- Focus management (trap focus in tutorial overlay)
- High contrast mode support
- Keyboard navigation
- Skip tutorial button always visible

### 7.5 Feature Flags
**File**: `backend/src/config/features.ts`

Add feature flag:
```typescript
TUTORIAL_ENABLED: process.env.TUTORIAL_ENABLED === 'true'
```

Allow disabling tutorial system without code changes.

---

## Phase 8: Testing

### 8.1 Backend Tests
**File**: `backend/src/tests/tutorial.test.ts`

Test cases:
- Tutorial progress CRUD operations
- Tutorial step retrieval
- Progress updates are atomic
- Skip/complete/reset flows
- Admin tutorial management

### 8.2 Frontend Component Tests
**File**: `frontend/src/tests/components/tutorial/`

Test each component:
- TutorialOverlay renders correctly
- Navigation buttons work
- Progress tracking updates
- Highlights position correctly
- Modals open/close properly

### 8.3 Integration Tests
**File**: `frontend/src/tests/integration/tutorial.test.tsx`

Test full flows:
- Complete tutorial start-to-finish
- Skip tutorial
- Resume tutorial mid-way
- Navigation between steps
- Project selection requirement

### 8.4 E2E Tests (Optional)
**Tool**: Playwright/Cypress

Test scenarios:
- New user registration → tutorial starts
- Tutorial completion unlocks features
- Tutorial can be resumed after logout
- Mobile tutorial experience

---

## Implementation Timeline

### Week 1: Foundation
- Phase 1: Database schema & backend API
- Phase 2: Frontend state management

### Week 2: Core UI
- Phase 3: Tutorial UI components
- Phase 5: Content management

### Week 3: Integration
- Phase 4: Step-specific integration (steps 1-6)
- Phase 4: Step-specific integration (steps 7-12)

### Week 4: Polish
- Phase 6: Analytics
- Phase 7: Edge cases & polish
- Phase 8: Testing

---

## Technical Considerations

### Performance
- Lazy load tutorial components (only when needed)
- Debounce progress updates (500ms)
- Memoize tutorial steps
- Use CSS transforms for animations (GPU acceleration)

### State Management
- Tutorial state lives in context (not Layout state)
- Persist progress to backend on step change
- Optimistic UI updates with rollback on error

### Styling
- Use existing DaisyUI components (maintain design consistency)
- Tailwind utilities for layout and animations
- CSS-in-JS for complex animations (Framer Motion optional)

### Error Handling
- Graceful fallback if tutorial steps fail to load
- Retry logic for progress updates
- Toast notifications for errors
- Always allow skipping tutorial

### Backwards Compatibility
- Existing users: Don't show tutorial (tutorialCompleted = true in migration)
- New users: Auto-start tutorial on first login
- Opt-in: Add "Restart Tutorial" button in Help page

---

## Database Migration

### Migration Script
**File**: `backend/src/scripts/migrations/addTutorialFields.ts`

```typescript
// Set tutorialCompleted = true for all existing users
// Set tutorialProgress = default values
// Create indexes
```

Run before deploying tutorial feature.

---

## API Documentation Updates

### New Endpoints

**Tutorial Progress**
```
GET    /api/tutorial/steps
GET    /api/tutorial/progress
PATCH  /api/tutorial/progress
POST   /api/tutorial/complete
POST   /api/tutorial/reset
PATCH  /api/tutorial/skip
```

**Admin Tutorial Management**
```
POST   /api/admin/tutorial/steps
PUT    /api/admin/tutorial/steps/:stepNumber
DELETE /api/admin/tutorial/steps/:stepNumber
GET    /api/admin/analytics/tutorial
```

---

## Files to Create

### Backend (15 files)
1. `backend/src/models/TutorialStep.ts`
2. `backend/src/routes/tutorial.ts`
3. `backend/src/services/handlers/TutorialHandler.ts`
4. `backend/src/scripts/seedTutorial.ts`
5. `backend/src/scripts/migrations/addTutorialFields.ts`
6. `backend/src/tests/tutorial.test.ts`
7. `backend/src/tests/handlers/TutorialHandler.test.ts`

### Frontend (20 files)
1. `frontend/src/hooks/useTutorial.ts`
2. `frontend/src/contexts/TutorialContext.tsx`
3. `frontend/src/components/tutorial/TutorialOverlay.tsx`
4. `frontend/src/components/tutorial/TutorialHeader.tsx`
5. `frontend/src/components/tutorial/TutorialContent.tsx`
6. `frontend/src/components/tutorial/TutorialFooter.tsx`
7. `frontend/src/components/tutorial/TutorialHighlight.tsx`
8. `frontend/src/components/tutorial/WelcomeModal.tsx`
9. `frontend/src/components/tutorial/TutorialCompleteModal.tsx`
10. `frontend/src/components/tutorial/StepIndicator.tsx`
11. `frontend/src/api/tutorial.ts`
12. `frontend/src/types/tutorial.ts`
13. `frontend/src/tests/components/tutorial/TutorialOverlay.test.tsx`
14. `frontend/src/tests/components/tutorial/TutorialHighlight.test.tsx`
15. `frontend/src/tests/integration/tutorial.test.tsx`
16. `frontend/src/utils/tutorialHelpers.ts`

### Shared (1 file)
1. `shared/types/tutorial.ts`

---

## Files to Modify

### Backend (4 files)
1. `backend/src/models/User.ts` - Add tutorial fields
2. `backend/src/routes/auth.ts` - Include tutorial in /me response
3. `backend/src/routes/admin.ts` - Add tutorial analytics
4. `backend/src/app.ts` - Register tutorial routes

### Frontend (12 files)
1. `frontend/src/components/Layout.tsx` - Add TutorialProvider
2. `frontend/src/api/types.ts` - Add tutorial types
3. `frontend/src/pages/ProjectsPage.tsx` - Add data attributes for step 1
4. `frontend/src/components/SessionTracker.tsx` - Add data attributes for step 2
5. `frontend/src/components/NotificationBell.tsx` - Add data attributes for step 2
6. `frontend/src/components/UserMenu.tsx` - Add data attributes for step 2
7. `frontend/src/components/navigation/MainNav.tsx` - Add data attributes for step 3
8. `frontend/src/pages/TerminalPage.tsx` - Add step 4 integration
9. `frontend/src/pages/NotesPage.tsx` - Add step 5 integration
10. `frontend/src/pages/StackPage.tsx` - Add step 6 integration
11. `frontend/src/pages/FeaturesPage.tsx` - Add step 7 integration
12. `frontend/src/pages/DeploymentPage.tsx` - Add step 8 integration
13. `frontend/src/pages/PublicPage.tsx` - Add step 9 integration
14. `frontend/src/pages/SharingPage.tsx` - Add step 10 integration
15. `frontend/src/pages/AccountSettingsPage.tsx` - Add step 11 integration
16. `frontend/src/pages/DiscoverPage.tsx` - Add step 12 integration
17. `frontend/src/pages/HelpPage.tsx` - Add "Restart Tutorial" button
18. `frontend/src/App.tsx` - Handle tutorial initialization on auth

---

## Estimated LOC

- **Backend**: ~2,000 lines
  - Models: ~200 lines
  - Routes: ~300 lines
  - Handlers: ~400 lines
  - Tests: ~800 lines
  - Seeds/Migrations: ~300 lines

- **Frontend**: ~3,500 lines
  - Components: ~1,800 lines
  - Hooks/Context: ~600 lines
  - API/Types: ~200 lines
  - Tests: ~700 lines
  - Utils: ~200 lines

- **Total**: ~5,500 lines of new code
- **Modifications**: ~1,000 lines across existing files

---

## Success Metrics

### User Engagement
- % of new users who start tutorial
- % of users who complete tutorial
- Average tutorial completion time
- Most common drop-off step

### Feature Adoption
- Increased feature usage after tutorial
- Reduced support tickets from new users
- Higher user retention in first week

### Technical Metrics
- Tutorial load time < 500ms
- Progress save success rate > 99%
- No performance impact on non-tutorial users
- Zero tutorial-related errors in production

---

## Future Enhancements

### Phase 9 (Optional)
- Interactive tutorial mode (guided actions)
- Multiple tutorial paths (beginner, advanced, developer)
- Video tutorials embedded in steps
- Tooltip-based micro-tutorials for individual features
- Achievement system for tutorial completion
- Tutorial recommendation based on user behavior
- A/B testing different tutorial flows
- Gamification (badges, progress rewards)

---

## Summary

This implementation plan provides a comprehensive, production-ready tutorial system that:
1. ✅ Guides new users through all 12 major features
2. ✅ Integrates seamlessly with existing architecture
3. ✅ Uses existing UI patterns (DaisyUI, custom hooks)
4. ✅ Tracks progress persistently
5. ✅ Respects user choice (skippable, resumable)
6. ✅ Provides admin content management
7. ✅ Includes analytics and metrics
8. ✅ Handles edge cases and mobile
9. ✅ Maintains accessibility standards
10. ✅ Thoroughly tested

The system is designed to be maintainable, extensible, and non-intrusive while providing significant value to new users.
