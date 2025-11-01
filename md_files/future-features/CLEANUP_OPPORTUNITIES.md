# Code Cleanup Opportunities - AI/Sloppy Code Audit

## 🔥 Top Cleanup Targets (By Impact)

### Tier 1: MASSIVE Files (1,500+ lines)
**High impact, easier wins**

1. **AccountSettingsPage.tsx - 1,987 lines**
   - Likely has: Profile form, password form, notification settings, theme picker
   - Extract: ProfileSettings, SecuritySettings, NotificationPreferences components
   - Target: 1,987 → 500 lines (~75% reduction)

2. **AdminDashboardPage.tsx - 1,551 lines**
   - Likely has: User management, ticket system, analytics dashboard
   - Extract: UserManagementPanel, TicketSystemPanel, AnalyticsDashboard components
   - Target: 1,551 → 400 lines (~75% reduction)

3. **FeaturesGraph.tsx - 1,459 lines**
   - You already cleaned this up (edges, layout, etc.)
   - Check for: Duplicate node rendering logic, verbose edge calculations
   - Target: 1,459 → 800 lines (~45% reduction)

4. **EditWizard.tsx - 1,188 lines**
   - Likely has: Repetitive step rendering, form validation logic
   - Extract: WizardStep components, form validation utils
   - Target: 1,188 → 400 lines (~66% reduction)

### Tier 2: Large Components (1,000+ lines)
**Medium impact, common AI bloat patterns**

5. **NoteItem.tsx - 1,131 lines**
   - This is HUGE for a single item component
   - Likely has: Inline edit mode, tags UI, sharing UI, delete confirm
   - Extract: NoteEditor, NoteMetadata, NoteSharingPanel components
   - Target: 1,131 → 300 lines (~73% reduction)

6. **NotesPage.tsx - 1,006 lines**
   - Likely has: Filter UI, sort UI, bulk actions, create form
   - Extract: NotesFilters, NotesToolbar, NoteCreateForm components
   - Target: 1,006 → 400 lines (~60% reduction)

### Tier 3: Current Monsters (Still Need Work)

7. **CommandResponse.tsx - 2,448 lines** (down from 2,812)
   - Still has ~500 lines of inline rendering
   - Extract remaining: InfoRenderer, TodayWeekStandupRenderer, DeploymentRenderer
   - Target: 2,448 → 1,500 lines (~40% more reduction)

8. **Layout.tsx - 2,030 lines**
   - Massive sidebar/navigation logic
   - Extract: ProjectSidebar, NavigationBar, ProjectGrid components
   - Target: 2,030 → 800 lines (~60% reduction)

---

## 🎯 AI Code Smell Patterns to Look For

### Pattern 1: Repetitive Conditional Rendering
```tsx
// BAD - AI loves this
{type === 'todo' && <TodoRenderer />}
{type === 'note' && <NoteRenderer />}
{type === 'devlog' && <DevLogRenderer />}
// ... 50 more lines

// GOOD - Extract to mapping
const RENDERERS = { todo: TodoRenderer, note: NoteRenderer, devlog: DevLogRenderer };
const Renderer = RENDERERS[type];
return <Renderer />;
```

### Pattern 2: Inline State Management Hell
```tsx
// BAD - AI creates state explosions
const [showModal, setShowModal] = useState(false);
const [modalType, setModalType] = useState('');
const [modalData, setModalData] = useState(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [validationErrors, setValidationErrors] = useState({});
// ... 20 more useState calls

// GOOD - Consolidate related state
const [modal, setModal] = useState({ isOpen: false, type: '', data: null });
const [form, setForm] = useState({ isSubmitting: false, errors: {} });
```

### Pattern 3: Copy-Pasted Form Handlers
```tsx
// BAD - AI duplicates this everywhere
const handleNameChange = (e) => setName(e.target.value);
const handleEmailChange = (e) => setEmail(e.target.value);
const handlePhoneChange = (e) => setPhone(e.target.value);
// ... 20 more handlers

// GOOD - Generic handler
const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value });
```

### Pattern 4: Verbose SVG Icons Inline
```tsx
// BAD - AI pastes full SVG every time (15+ lines each)
<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
</svg>
// ... repeated 50 times with slight variations

// GOOD - Icon components or library
import { PlusIcon } from '@heroicons/react' // or create IconButton component
```

### Pattern 5: Redundant Type Checking
```tsx
// BAD - AI is paranoid about null checks
if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
  data.items.forEach(item => {
    if (item && item.title && typeof item.title === 'string') {
      // ...
    }
  });
}

// GOOD - Trust your types or use optional chaining
data?.items?.forEach(item => item.title && renderItem(item));
```

---

## 📋 Quick Wins Checklist

**In CommandResponse.tsx (still 2,448 lines):**
- [ ] Extract InfoRenderer (~200 lines)
- [ ] Extract TodayWeekStandupRenderer (~300 lines)
- [ ] Extract DeploymentRenderer (~40 lines)
- [ ] Extract TeamRenderer (~40 lines)
- [ ] Extract SettingsRenderer (~50 lines)
- [ ] Extract SearchResultsRenderer (~70 lines)

**In Layout.tsx (2,030 lines):**
- [ ] Extract ProjectSidebar component (~400 lines)
- [ ] Extract NavigationTabs component (~200 lines)
- [ ] Extract ProjectCategorySection (~150 lines)

**In NoteItem.tsx (1,131 lines):**
- [ ] Extract NoteEditor component
- [ ] Extract NoteMetadata component
- [ ] Extract NoteSharingPanel component
- [ ] Extract NoteActionsMenu component

**In AccountSettingsPage.tsx (1,987 lines):**
- [ ] Extract ProfileSettingsSection
- [ ] Extract SecuritySettingsSection
- [ ] Extract NotificationPreferences
- [ ] Extract AppearanceSettings

---

## 🎯 Estimated Total Reduction Potential

| File | Current | Target | Reduction |
|------|---------|--------|-----------|
| CommandResponse.tsx | 2,448 | 1,500 | -948 (-39%) |
| Layout.tsx | 2,030 | 800 | -1,230 (-61%) |
| AccountSettingsPage.tsx | 1,987 | 500 | -1,487 (-75%) |
| AdminDashboardPage.tsx | 1,551 | 400 | -1,151 (-74%) |
| FeaturesGraph.tsx | 1,459 | 800 | -659 (-45%) |
| EditWizard.tsx | 1,188 | 400 | -788 (-66%) |
| NoteItem.tsx | 1,131 | 300 | -831 (-73%) |
| NotesPage.tsx | 1,006 | 400 | -606 (-60%) |
| **TOTAL** | **12,800** | **5,100** | **-7,700 (-60%)** |

---

## 🚀 Recommended Attack Order

### Session 1 (High Impact, Low Complexity)
1. **NoteItem.tsx** - Single component, clear extraction
2. **AccountSettingsPage.tsx** - Obvious form sections
3. **NotesPage.tsx** - Clear UI panels

### Session 2 (Medium Impact, Medium Complexity)
4. **Layout.tsx** - Sidebar/navigation extraction
5. **EditWizard.tsx** - Step-by-step component split
6. **AdminDashboardPage.tsx** - Panel extraction

### Session 3 (Final Cleanup)
7. **CommandResponse.tsx** - Remaining inline renderers
8. **FeaturesGraph.tsx** - Optimize calculations/rendering

---

## 💡 General Cleanup Principles

1. **Component Size Limit: 400 lines**
   - If > 400 lines, extract something
   - If > 800 lines, extract multiple things
   - If > 1,500 lines, you have a monster

2. **DRY Violations**
   - 3+ similar blocks → extract to function/component
   - Copy-pasted handlers → create generic version

3. **State Consolidation**
   - Related state → combine into object
   - Form state → use form library or reducer

4. **Lazy Loading**
   - Heavy components → lazy load
   - Modals/wizards → lazy load
   - Tab content → lazy load

5. **Extract to Utils**
   - Formatting logic → utils/formatters.ts
   - Validation logic → utils/validators.ts
   - API calls → dedicated hooks

---

## 🔍 CONCRETE DRY VIOLATIONS FOUND IN CODEBASE

### 🚨 Critical: Duplicate Utility Functions (Extract to Utils)

#### 1. **Date Helper Functions** - Duplicated in 3+ files
**Files affected**: NotesPage.tsx:114-149, SubtaskList.tsx:33-36, TodoItem.tsx

```tsx
// DUPLICATED CODE - appears in multiple files
const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
};

const isToday = (dueDate?: string) => {
  if (!dueDate) return false;
  const today = new Date().setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  return due === today;
};
// ... and more (isTomorrow, isSoon, isFuture)
```

**FIX**: Create `utils/dateHelpers.ts` with all date comparison functions
- Extract: isOverdue, isToday, isTomorrow, isSoon, isFuture
- Lines saved: ~150 lines across codebase

#### 2. **Priority Helper Functions** - Duplicated in 2+ files
**Files affected**: TodoItem.tsx:93, SubtaskList.tsx:39

```tsx
// DUPLICATED CODE
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'text-error';
    case 'medium': return 'text-warning';
    case 'low': return 'text-success';
    default: return 'text-base-content/60';
  }
};

const getPriorityWeight = (priority?: string) => {
  switch (priority) {
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 2;
  }
};
```

**FIX**: Create `utils/priorityHelpers.ts`
- Combine into single utilities module
- Lines saved: ~40 lines

---

### 🎭 AI Pattern: Duplicate Modal State Management

**Found**: 70 occurrences of modal state setters across 10 files
**Pattern**: Every modal has 3-5 pieces of state

#### Example from NotesPage.tsx:22-61
```tsx
// BAD - AI duplicates this pattern everywhere
const [selectedNote, setSelectedNote] = useState<any>(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

const [selectedDevLog, setSelectedDevLog] = useState<any>(null);
const [isDevLogModalOpen, setIsDevLogModalOpen] = useState(false);
const [devLogModalMode, setDevLogModalMode] = useState<'view' | 'edit'>('view');

// Duplicate handlers
const handleNoteClick = (note: any) => {
  setSelectedNote(note);
  setModalMode('view');
  setIsModalOpen(true);
};

const handleDevLogClick = (entry: any) => {
  setSelectedDevLog(entry);
  setDevLogModalMode('view');
  setIsDevLogModalOpen(true);
};

// Duplicate useEffects (lines 74-91)
useEffect(() => {
  if (selectedNote && selectedProject && isModalOpen) {
    const updatedNote = selectedProject.notes?.find(note => note.id === selectedNote.id);
    if (updatedNote) setSelectedNote(updatedNote);
  }
}, [selectedProject?.notes, selectedNote?.id, isModalOpen]);

useEffect(() => {
  if (selectedDevLog && selectedProject && isDevLogModalOpen) {
    const updatedDevLog = selectedProject.devLog?.find(entry => entry.id === selectedDevLog.id);
    if (updatedDevLog) setSelectedDevLog(updatedDevLog);
  }
}, [selectedProject?.devLog, selectedDevLog?.id, isDevLogModalOpen]);
```

**FIX**: Create `hooks/useModal.ts` or `hooks/useItemModal.ts`
```tsx
// GOOD - Reusable modal hook
const {
  item: selectedNote,
  isOpen: isModalOpen,
  mode,
  open: openNoteModal,
  close: closeNoteModal
} = useItemModal<Note>({ initialMode: 'view' });

const {
  item: selectedDevLog,
  isOpen: isDevLogModalOpen,
  mode: devLogMode,
  open: openDevLogModal,
  close: closeDevLogModal
} = useItemModal<DevLogEntry>({ initialMode: 'view' });
```

**Impact**:
- NotesPage.tsx: 22 lines → 6 lines (73% reduction)
- Potential: 200+ lines saved across all modal usage

---

### 💥 AI Pattern: State Explosion

**Found**: 223 useState calls across 49 files (avg 4.6 per file)

#### Worst offenders:
- **NotesPage.tsx**: 18 useState calls
- **AccountSettingsPage.tsx**: 14 useState calls (lines 91-133)
- **NoteItem.tsx**: 14 useState calls
- **TeamManagement.tsx**: 12 useState calls (lines 16-40)
- **IdeasPage.tsx**: 13 useState calls

#### Example from AccountSettingsPage.tsx:91-133
```tsx
// BAD - 14 useState calls in one component
const [activeTab, setActiveTab] = useState<'theme' | 'connections' | 'profile' | 'analytics'>('theme');
const [profileSubTab, setProfileSubTab] = useState<'personal' | 'public' | 'privacy'>('personal');
const [themeSubTab, setThemeSubTab] = useState<'preset' | 'custom'>('preset');
const [currentTheme, setCurrentTheme] = useState('retro');
const [user, setUser] = useState<any>(null);
const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
const [isCreatingTheme, setIsCreatingTheme] = useState(false);
const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
const [newThemeName, setNewThemeName] = useState('');
const [editingThemeName, setEditingThemeName] = useState('');
const [customColors, setCustomColors] = useState<CustomTheme['colors']>(DEFAULT_CUSTOM_COLORS);
const [previewTheme, setPreviewTheme] = useState<CustomTheme | null>(null);
const [isEditingProfile, setIsEditingProfile] = useState(false);
const [isEditingName, setIsEditingName] = useState(false);
// ... and more
```

**FIX**: Consolidate related state
```tsx
// GOOD - Grouped state
const [tabs, setTabs] = useState({
  active: 'theme',
  profileSub: 'personal',
  themeSub: 'preset'
});

const [editing, setEditing] = useState({
  profile: false,
  name: false,
  username: false,
  themeId: null
});

const [theme, setTheme] = useState({
  current: 'retro',
  custom: [],
  creating: false,
  preview: null
});
```

**Better**: Use `useReducer` for complex state machines

---

### 🔁 AI Pattern: Duplicate Error Handling

**Found**: 71 occurrences of `console.error('Failed to...)`

#### Files with most duplicate error handling:
- TeamManagement.tsx: 7 instances
- EditWizard.tsx: 8 instances
- NoteItem.tsx: 6 instances
- TodoItem.tsx: 4 instances
- CommandResponse.tsx: 3 instances

```tsx
// BAD - Repeated everywhere
try {
  await someAPI.call();
} catch (error) {
  console.error('Failed to update item:', error);
}

try {
  await anotherAPI.call();
} catch (error) {
  console.error('Failed to delete item:', error);
}
```

**FIX**: Create error handling utility
```tsx
// utils/errorHandler.ts
export const handleAPIError = (operation: string, error: any) => {
  console.error(`Failed to ${operation}:`, error);
  toast.error(`Failed to ${operation}`);
  // Optional: Send to error tracking service
};

// Usage
try {
  await someAPI.call();
} catch (error) {
  handleAPIError('update item', error);
}
```

---

### ⏳ AI Pattern: Duplicate Loading State Management

**Found**: 15 occurrences of manual loading state pattern
**Note**: Project already has `useLoadingState` hook but not used everywhere!

```tsx
// BAD - Manual loading state (still used in 15 places)
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await api.submit(data);
  } finally {
    setLoading(false);
  }
};

// GOOD - Use existing useLoadingState hook
const { loading, withLoading } = useLoadingState();

const handleSubmit = withLoading(async () => {
  await api.submit(data);
});
```

**Files still using manual pattern**:
- TodoItem.tsx:39, 45
- NoteItem.tsx:2 instances
- PublicPage.tsx, SettingsPage.tsx, CreateProject.tsx, etc.

**FIX**: Replace all manual loading patterns with existing `useLoadingState` hook
- Lines saved: ~45 lines
- Consistency improved across codebase

---

### 📝 AI Pattern: Duplicate Form Validation

**Found**: 14 occurrences of inline trim validation

```tsx
// BAD - Repeated everywhere
if (!title.trim()) return;
if (!name.trim()) return;
if (!email.trim()) return;
// ... etc
```

**FIX**: Create validation utilities
```tsx
// utils/validation.ts
export const validateRequired = (value: string, fieldName = 'Field') => {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
};

export const validateEmail = (email: string) => {
  const trimmed = validateRequired(email, 'Email');
  if (!/\S+@\S+\.\S+/.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  return trimmed;
};
```

---

## 📊 DRY Violation Impact Analysis

| Category | Occurrences | Files Affected | Lines Wasted | Fix Effort |
|----------|-------------|----------------|--------------|------------|
| Date helpers | 5+ functions | 3+ files | ~150 lines | 30 min |
| Priority helpers | 2 functions | 2 files | ~40 lines | 15 min |
| Modal state | 70 instances | 10 files | ~200 lines | 2 hours |
| Error handling | 71 instances | 25 files | ~140 lines | 1 hour |
| Loading state | 15 instances | 11 files | ~45 lines | 30 min |
| Form validation | 14 instances | 8 files | ~30 lines | 45 min |
| **TOTAL** | **175+** | **49 files** | **~605 lines** | **5 hours** |

---

## 🎯 NEW Quick Wins - DRY Violations

### Phase 1: Extract Utility Functions (1 hour)
1. Create `utils/dateHelpers.ts` - extract date comparison functions
2. Create `utils/priorityHelpers.ts` - extract priority utilities
3. Create `utils/validation.ts` - extract form validation
4. Create `utils/errorHandler.ts` - centralize error handling

### Phase 2: Create Custom Hooks (2 hours)
5. Create `hooks/useModal.ts` - generic modal state management
6. Refactor to use existing `useLoadingState` everywhere
7. Consider `hooks/useItemModal.ts` for list item modals

### Phase 3: Apply Across Codebase (2 hours)
8. Replace all duplicate date helpers with utils
9. Replace all modal patterns with useModal hook
10. Replace all manual loading with useLoadingState
11. Replace all error handling with errorHandler utility

**Estimated total reduction**: ~605 lines of duplicate code
**Maintainability gain**: 1 source of truth for each pattern

---

## 🆕 ADDITIONAL AI SLOP PATTERNS FOUND (Latest Audit)

### Pattern 6: Complex Conditional Chains
**Found**: 10+ instances of deeply nested && conditions

**Examples**:
- `Layout.tsx:654` - Pathname check with 7 conditions chained with &&
- `Layout.tsx:1310` - Navigation visibility with 10+ conditions
- `NotesPage.tsx:217` - Date filtering with 5 chained negations

```tsx
// BAD - Unreadable chain from Layout.tsx
{selectedProject && (location.pathname === '/notes' || location.pathname === '/stack' || location.pathname === '/features' || location.pathname === '/deployment' || location.pathname === '/public' || location.pathname === '/sharing' || location.pathname === '/settings') && location.pathname !== '/projects' && (
```

**FIX**: Extract to helper functions

```tsx
// GOOD
const isProjectRoute = () => PROJECT_ROUTES.includes(location.pathname);
const shouldShowProjectNav = selectedProject && isProjectRoute() && !isProjectsPage();
```

**Impact**:
- Lines saved: ~30 lines
- Readability: Massive improvement

---

### Pattern 7: Timer/Interval Bloat
**Found**: 29 files using setTimeout/setInterval
- Most in polling patterns that could use WebSocket or better state management
- Layout.tsx, FeaturesGraph.tsx have multiple timers

**Files with most timers**:
- Layout.tsx (sidebar animations, project sync)
- FeaturesGraph.tsx (layout animations)
- CommandResponse.tsx (update polling)
- AccountSettingsPage.tsx (debouncing)

**FIX**:
- Replace polling with WebSocket subscriptions
- Use debounce/throttle utilities
- Proper cleanup in useEffect

---

### Pattern 8: Switch Statement Sprawl
**Found**: 40 switch statements across 23 files
- AdminDashboardPage.tsx: 7 switches
- NewsPage.tsx: 2 switches
- CommandResponse.tsx: 3 switches

Many could be replaced with object lookups:

```tsx
// BAD
switch (type) {
  case 'success': return 'green';
  case 'error': return 'red';
  case 'warning': return 'yellow';
  default: return 'gray';
}

// GOOD
const COLORS = { success: 'green', error: 'red', warning: 'yellow' };
return COLORS[type] || 'gray';
```

---

### Pattern 9: Inline onClick Handlers
**Found**: 98 inline onClick handlers with arrow functions

**Problem**: Creates new function on every render

```tsx
// BAD - New function every render
<button onClick={() => handleClick(item.id)}>Click</button>

// GOOD - Memoized or use data attributes
<button onClick={handleClick} data-id={item.id}>Click</button>
```

**Files with most inline handlers**:
- CommandResponse.tsx
- Layout.tsx
- AdminDashboardPage.tsx

---

### Pattern 10: Else-If Ladders
**Found**: 65 else-if chains
- Many could be switch statements or object lookups
- AdminDashboardPage.tsx and CommandResponse.tsx are worst offenders

---

## 📈 UPDATED CODEBASE METRICS

### Component Size Distribution
- **Average component**: 335 lines
- **Target average**: 200 lines
- **Components over 400 lines**: 15 files
- **Components over 1000 lines**: 8 files
- **Largest component**: CommandResponse.tsx (2,438 lines)

### Code Quality Metrics
- **Total useState calls**: ~223 (should consolidate)
- **Inline onClick handlers**: 98 (should extract)
- **Switch statements**: 40 (many redundant)
- **setTimeout/setInterval**: 29 files (consolidate)
- **Complex && chains**: 10+ critical cases
- **else-if ladders**: 65 instances

### High-Value Targets (UPDATED)

| File | Current | Issues | Priority |
|------|---------|--------|----------|
| CommandResponse.tsx | 2,438 | 3 switches, inline renders, timers | P0 |
| Layout.tsx | 2,125 | 7-cond chains, timers, massive sidebar | P0 |
| AccountSettingsPage.tsx | 1,987 | 24 useState, 1 switch, timers | P0 |
| AdminDashboardPage.tsx | 1,550 | 7 switches, massive complexity | P1 |
| FeaturesGraph.tsx | 1,408 | Timers, complex calculations | P1 |
| EditWizard.tsx | 1,156 | 2 switches, repetitive steps | P1 |
| NoteItem.tsx | 1,131 | Modal state explosion | P1 |
| NotesPage.tsx | 1,019 | 18 useState, complex filtering | P2 |

---

## 🎯 COMPREHENSIVE CLEANUP ROADMAP

### Quick Wins (1-2 hours each)

1. **Extract date/priority utils** - Remove 190 duplicate lines
2. **Create useItemModal hook** - Save 200+ lines
3. **Simplify conditional chains** - Extract to helper functions
4. **Replace inline handlers** - Use proper event delegation

### Medium Effort (3-5 hours each)

1. **Refactor AccountSettingsPage** - Split into 4 sub-components
2. **Clean up Layout.tsx** - Extract ProjectSidebar, NavigationBar
3. **Componentize NoteItem** - Extract NoteEditor, metadata panels
4. **Simplify NotesPage** - Extract filters, toolbar, create form

### Major Refactors (5-10 hours each)

1. **CommandResponse.tsx** - Extract all renderers to separate files
2. **AdminDashboardPage.tsx** - Convert switches to routed sub-pages
3. **FeaturesGraph.tsx** - Optimize layout calculations, extract controls

### Code Quality Pass (2-3 hours)

1. Replace all switch statements with object lookups where appropriate
2. Convert manual loading states to useLoadingState hook
3. Consolidate timer usage (debounce utility, WebSocket patterns)
4. Add proper TypeScript types (remove all `any` usage)

---

## 📊 ESTIMATED IMPACT

### Line Count Reduction
- **Component extraction**: -7,700 lines (60% of top 8 files)
- **DRY violations fixed**: -605 lines
- **Simplified conditionals**: -150 lines
- **Removed inline handlers**: -200 lines
- **Total reduction**: **~8,655 lines** (~35% of frontend code)

### Maintainability Gains
- Average component size: 335 → 180 lines (46% reduction)
- Components over 1000 lines: 8 → 0
- Reusable utilities: +6 new utility modules
- Reusable hooks: +2 new custom hooks
- Type safety: Remove all `any` types

### Performance Improvements
- Reduced re-renders (extracted components)
- Memoized event handlers
- Optimized conditional logic
- Better code splitting opportunities

---

Ready to tackle these? Pick a file and I'll help you surgically extract components and clean up AI bloat.
