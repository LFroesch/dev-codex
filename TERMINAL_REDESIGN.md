# Terminal Redesign Plan

> Goal: Cohesive look across all terminal response components. TodosRenderer and AIResponseRenderer are the gold standard — extend their patterns everywhere.

## Design Direction

### What works (keep/extend)
- **TodosRenderer**: inline editing (InlineEdit, InlineSelect, InlineDate), header card, footer card, checkboxes, hover actions, border-thick everywhere
- **AIResponseRenderer**: accent-bordered card, header bar with metadata, clean message area
- **HelpRenderer**: collapsible accordion sections, section-color coding

### What needs fixing
- **AI responses**: too low opacity, needs more visible borders, text should be slightly larger
- **Echos (command input display)**: text too small, needs to be bigger/bolder
- **TodosRenderer**: not enough primary theme color — headers/badges should use more `bg-primary`, `text-primary`
- **Summary/Context**: raw `<pre>` block — should render as proper markdown
- **DevLogRenderer**: no inline editing, just opens edit wizard on click
- **NotesRenderer**: no inline editing, just opens edit wizard on click
- **Wizards**: look basic/generic — need design polish to match terminal aesthetic

### Design system rules (apply everywhere)
- `border-thick` on all cards/containers
- `bg-base-200/60` for card backgrounds, `bg-base-200` for headers
- `rounded-lg` on all containers
- Consistent font sizes: headers `text-base font-bold`, body `text-sm`, meta `text-xs`
- Primary color usage: at least one `bg-primary` or `text-primary` accent per renderer
- Hover states with `group` + `group-hover:opacity-100` for action buttons
- Inline editing pattern: click text to edit, escape to cancel, enter/blur to save

---

## Component Inventory & Changes Needed

### 1. Command Echo (CommandResponse.tsx:2475-2494)
**Current**: Small `text-xs` mono text with timestamp + `$` + command
**Needs**: Bigger text (`text-sm`), bolder, more readable. AI echo is good pattern but also tiny.
- [ ] Bump echo text from `text-xs` to `text-sm`
- [ ] Make command text `font-bold` not just `font-semibold`
- [ ] Consider primary accent on the `$` symbol

### 2. Message Box (CommandResponse.tsx:2501-2510)
**Current**: Icon in `bg-base-200` box + message in another `bg-base-200` box, `text-lg`
**Needs**: This is fine, maybe slight cleanup
- [ ] Review if `text-lg` is appropriate for all message types or should vary

### 3. TodosRenderer ✅ (gold standard)
**Current**: Full inline editing, checkboxes, progress bar, subtasks, hover actions
**Needs**: More primary color usage
- [ ] Header: use `bg-primary/10` tint or `border-l-4 border-primary` accent
- [ ] Badge colors: count badge should be `bg-primary/10 text-primary` (currently neutral)
- [ ] "Open Todos" button already uses `btn-primary` — good

### 4. DevLogRenderer
**Current**: Click to open edit wizard, `#` badges in accent color, timestamps
**Needs**: Inline editing like TodosRenderer
- [ ] Add InlineEdit for title (click to edit, save via `/edit devlog N --title="..."`)
- [ ] Add InlineEdit for description (multiline, save via `/edit devlog N --content="..."`)
- [ ] Add hover delete button (currently inside card, should be hover-reveal)
- [ ] Add primary color accent to header
- [ ] Consider inline date picker for date editing

### 5. NotesRenderer
**Current**: Click to open edit wizard, `#` badges in secondary color
**Needs**: Inline editing for title, or at minimum better preview
- [ ] Add InlineEdit for title (save via `/edit note N --title="..."`)
- [ ] Add hover delete button (currently inside card, should be hover-reveal)
- [ ] Add primary color accent to header
- [ ] Consider showing more of the note content (preview is `line-clamp-2`)

### 6. ComponentRenderer
**Current**: Click to open edit wizard, grouped by feature, type badges
**Needs**: Better interactivity
- [ ] Hover delete already exists (good)
- [ ] Add primary color accent to header
- [ ] Consider inline editing for title
- [ ] Feature group headers could use more visual weight

### 7. StackRenderer
**Current**: Grid of cards with category color-coded badges
**Needs**: Minor polish
- [ ] Add hover delete/edit actions
- [ ] Add primary color accent to header
- [ ] Cards could have version inline editing

### 8. AIResponseRenderer
**Current**: Accent-bordered card, header with model/tokens/time, message, proposed actions
**Needs**: Higher visibility
- [ ] Increase border opacity: `border-accent/30` → `border-accent/50`
- [ ] Increase background: `bg-accent/5` → `bg-accent/8`
- [ ] Bump message text from `text-sm` to `text-base` (was flagged as too small)
- [ ] Header text slightly bigger
- [ ] Consider adding `border-thick` instead of `border-2`

### 9. Summary/Context/Bridge (CommandResponse.tsx:820-863)
**Current**: Raw `<pre>` with monospace font, copy/download buttons
**Needs**: Proper markdown rendering
- [ ] Use a markdown renderer (react-markdown or similar — check if already in deps)
- [ ] Add syntax highlighting for code blocks if present
- [ ] Keep copy/download buttons
- [ ] Style rendered markdown with terminal-appropriate CSS

### 10. HelpRenderer
**Current**: Collapsible accordion, section colors, clickable commands
**Needs**: Minor polish
- [ ] Already well-structured, might just need font size adjustments
- [ ] Consider primary accent on "Getting Started" section

### 11. UsageRenderer
**Current**: Progress bar, 3-col stats grid, tier badge
**Needs**: Minor polish
- [ ] Already using primary in progress bar — good
- [ ] Stats cards could use slightly more visual weight

### 12. ProjectsRenderer (/swap)
**Current**: Grid of project cards, selected state with primary ring
**Needs**: Minor polish
- [ ] Good existing design, maybe add hover elevation

### 13. ThemesRenderer
**Current**: Theme cards with preview colors
**Needs**: Review for consistency
- [ ] Ensure border-thick used throughout

### 14. Info Command (CommandResponse.tsx:1896-2026)
**Current**: Inline — basic info card, 4-stat grid, 2x2 quick links, timeline
**Needs**: Polish
- [ ] Already decent, ensure border-thick consistency
- [ ] Could benefit from primary accent on project name/stats

### 15. Today/Week/Standup Commands (inline in CommandResponse)
**Current**: Stats grid + todo lists, basic card styling
**Needs**: Polish
- [ ] Consistent with TodosRenderer card style
- [ ] Add primary accents to headers

### 16. Search Results (inline in CommandResponse)
**Current**: Grouped by type, basic cards
**Needs**: Polish
- [ ] Add type-specific color coding
- [ ] Clickable results should be more obviously interactive

### 17. Deployment/Public/Team/Settings (inline in CommandResponse)
**Current**: Simple grid cards
**Needs**: Minor polish for consistency
- [ ] Ensure border-thick, consistent bg

---

## Wizards — Design Overhaul

### Current state
All wizards share a basic structure: step progress dots, `bg-base-200` card, input fields, Back/Next/Create buttons.

### Changes needed
- [ ] Add a header card with wizard title + item type icon
- [ ] Step progress: replace dots with a mini stepper bar (numbered, with labels)
- [ ] Card styling: match terminal aesthetic — `border-thick`, `rounded-lg`, section headers
- [ ] Input fields: add subtle borders, focus states with primary color
- [ ] Buttons: ensure `border-thick` on all, primary button has `btn-primary`
- [ ] Success screen: less oversized emoji, more compact with data preview
- [ ] Consider adding the wizard title/context in a header bar like AIResponseRenderer

### Wizards inventory
- **New Project** (CommandResponse inline) — full multi-step
- **Add wizards** (CommandResponse inline) — todo, note, devlog, feature, stack, subtask, relationship
- **Edit wizards** (EditWizard.tsx) — todo, note, devlog, feature, subtask
- **Selector wizards** (SelectorWizard.tsx) — pick item to edit/delete
- **Confirmation wizards** (ConfirmationWizard.tsx) — delete confirmations

---

## Shared Utilities to Extract

The TodosRenderer has InlineEdit, InlineDate, InlineSelect components defined inside it. These should be extracted to a shared location so DevLogRenderer, NotesRenderer, FeatureRenderer can reuse them.

- [ ] Extract `InlineEdit` → `frontend/src/components/shared/InlineEdit.tsx`
- [ ] Extract `InlineDate` → `frontend/src/components/shared/InlineDate.tsx`
- [ ] Extract `InlineSelect` → `frontend/src/components/shared/InlineSelect.tsx`
- [ ] Markdown renderer component for Summary/Context (check deps for react-markdown)

---

## Priority Order

### Phase 1: Quick wins (visual consistency)
1. Command echo sizing
2. AI response opacity/borders/text size
3. Primary color accents on all renderer headers
4. border-thick consistency audit

### Phase 2: Inline editing expansion
5. Extract shared InlineEdit/InlineDate/InlineSelect
6. DevLogRenderer inline editing
7. NotesRenderer inline editing
8. FeatureRenderer inline editing

### Phase 3: Markdown & rendering
9. Summary/Context markdown rendering
10. Search results improvements

### Phase 4: Wizard overhaul
11. Wizard header/progress redesign
12. Wizard input styling
13. Success screen cleanup

---

## Notes
- Using DaisyUI + TailwindCSS
- Custom `border-thick` utility class
- `getContrastTextColor('primary')` for text on primary buttons
- Lazy loading via `React.lazy` + `Suspense` for all renderers
- Inline rendering in CommandResponse is getting unwieldy — consider extracting more to standalone renderer files
