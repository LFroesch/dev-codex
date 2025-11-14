# Code Refactoring Plan - Dev Codex

## Executive Summary

**Current State:** ~222 response builder calls, 7+ duplicated wizard patterns, 6+ old syntax checks
**Estimated Savings:** ~800-1,200 lines of code
**Maintainability Impact:** HIGH - Reduces duplication by 60-70%
**Risk Level:** LOW - Non-breaking refactors with clear patterns
**Estimated Time:** 6-8 hours

---

## Refactoring Opportunities (Prioritized)

### Priority 1: Wizard Generation Utility (HIGH IMPACT)
**Location:** `backend/src/services/handlers/crud/*Handlers.ts` + `StackHandlers.ts`
**Duplications:** 7+ files with identical wizard pattern
**Lines Saved:** ~350-400 lines

#### Current Pattern (Repeated 7+ Times):
```typescript
// In TodoHandlers.ts, NoteHandlers.ts, DevLogHandlers.ts, ComponentHandlers.ts, etc.
if (parsed.args.length === 0 && getFlagCount(parsed.flags) === 0) {
  return {
    type: ResponseType.PROMPT,
    message: `✨ Add New Todo`,
    data: {
      wizardType: 'add_todo',
      steps: [
        {
          id: 'title',
          label: 'Title',
          type: 'text',
          required: true,
          placeholder: 'Enter todo title'
        },
        // ... more steps
      ]
    },
    metadata: {
      projectId: project._id.toString(),
      action: 'add_todo'
    }
  };
}
```

#### Proposed Refactor:
**Create:** `backend/src/services/utils/wizardBuilder.ts`

```typescript
interface WizardStep {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  required: boolean;
  placeholder?: string;
  options?: string[];
  value?: any;
}

interface WizardConfig {
  wizardType: string;
  message: string;
  steps: WizardStep[];
  action: string;
}

export class WizardBuilder {
  /**
   * Generate a wizard prompt response
   */
  static buildWizard(
    config: WizardConfig,
    projectId: string
  ): CommandResponse {
    return {
      type: ResponseType.PROMPT,
      message: config.message,
      data: {
        wizardType: config.wizardType,
        steps: config.steps
      },
      metadata: {
        projectId,
        action: config.action
      }
    };
  }

  /**
   * Check if command should trigger wizard (no args, no flags)
   */
  static shouldShowWizard(parsed: ParsedCommand): boolean {
    return parsed.args.length === 0 && getFlagCount(parsed.flags) === 0;
  }

  /**
   * Pre-defined wizard configurations
   */
  static readonly WIZARDS = {
    ADD_TODO: {
      wizardType: 'add_todo',
      message: '✨ Add New Todo',
      action: 'add_todo',
      steps: [
        { id: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Enter todo title' },
        { id: 'content', label: 'Description', type: 'textarea', required: false, placeholder: 'Optional description' },
        { id: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high'], required: true, value: 'medium' },
        { id: 'status', label: 'Status', type: 'select', options: ['not_started', 'in_progress', 'completed', 'blocked'], required: true, value: 'not_started' },
        { id: 'due', label: 'Due Date', type: 'text', required: false, placeholder: 'MM-DD-YYYY 8:00PM (optional)' }
      ]
    } as WizardConfig,

    ADD_NOTE: {
      wizardType: 'add_note',
      message: '✨ Add New Note',
      action: 'add_note',
      steps: [
        { id: 'title', label: 'Note Title', type: 'text', required: true, placeholder: 'Enter note title' },
        { id: 'content', label: 'Content', type: 'textarea', required: true, placeholder: 'Enter note content' }
      ]
    } as WizardConfig,

    // ... ADD_DEVLOG, ADD_COMPONENT, etc.
  };
}
```

#### Usage (After Refactor):
```typescript
// In TodoHandlers.ts
if (WizardBuilder.shouldShowWizard(parsed)) {
  return WizardBuilder.buildWizard(WizardBuilder.WIZARDS.ADD_TODO, project._id.toString());
}
```

**Impact:**
- ✅ Eliminates 350+ lines of duplicated code
- ✅ Centralized wizard definitions (easy to update UI)
- ✅ Type-safe wizard configurations
- ✅ Easier to add new wizards

---

### Priority 2: Flag Validation Helper (HIGH IMPACT)
**Location:** All CRUD handlers
**Duplications:** Every handler validates flags differently
**Lines Saved:** ~200-250 lines

#### Current Pattern:
```typescript
// Repeated in every handler with slight variations
const title = getFlag(parsed.flags, 'title') as string;
const content = getFlag(parsed.flags, 'content') as string;
const priority = getFlag(parsed.flags, 'priority') as string;

if (!title) {
  return {
    type: ResponseType.ERROR,
    message: '❌ --title flag is required',
    suggestions: [
      '/add todo - Use wizard instead',
      '/add todo --title="your todo title"',
      '/help add todo'
    ]
  };
}

const sanitizedTitle = sanitizeText(title);
if (!sanitizedTitle) {
  return {
    type: ResponseType.ERROR,
    message: '❌ Title cannot be empty',
    suggestions: ['/help add todo']
  };
}
```

#### Proposed Refactor:
**Create:** `backend/src/services/utils/flagValidator.ts`

```typescript
interface FlagRule {
  name: string;
  required: boolean;
  sanitize?: boolean;
  validate?: (value: any) => boolean;
  errorMessage?: string;
}

interface ValidationResult {
  valid: boolean;
  values: Record<string, any>;
  error?: CommandResponse;
}

export class FlagValidator {
  /**
   * Validate and extract flags based on rules
   */
  static validate(
    flags: Record<string, any>,
    rules: FlagRule[],
    commandName: string
  ): ValidationResult {
    const values: Record<string, any> = {};

    for (const rule of rules) {
      const rawValue = getFlag(flags, rule.name);

      // Check required
      if (rule.required && !rawValue) {
        return {
          valid: false,
          values: {},
          error: {
            type: ResponseType.ERROR,
            message: `❌ --${rule.name} flag is required`,
            suggestions: [
              `/${commandName} - Use wizard instead`,
              `/${commandName} --${rule.name}="value"`,
              `/help ${commandName}`
            ]
          }
        };
      }

      // Sanitize if needed
      let value = rawValue;
      if (rule.sanitize && rawValue) {
        value = sanitizeText(rawValue);
        if (!value) {
          return {
            valid: false,
            values: {},
            error: {
              type: ResponseType.ERROR,
              message: rule.errorMessage || `❌ ${rule.name} cannot be empty`,
              suggestions: [`/help ${commandName}`]
            }
          };
        }
      }

      // Custom validation
      if (rule.validate && value && !rule.validate(value)) {
        return {
          valid: false,
          values: {},
          error: {
            type: ResponseType.ERROR,
            message: rule.errorMessage || `❌ Invalid ${rule.name}`,
            suggestions: [`/help ${commandName}`]
          }
        };
      }

      values[rule.name] = value;
    }

    return { valid: true, values };
  }

  /**
   * Pre-defined validation rules for common entities
   */
  static readonly RULES = {
    TODO: [
      { name: 'title', required: true, sanitize: true },
      { name: 'content', required: false, sanitize: true },
      { name: 'priority', required: false, validate: (v) => ['low', 'medium', 'high'].includes(v) },
      { name: 'status', required: false, validate: (v) => ['not_started', 'in_progress', 'completed', 'blocked'].includes(v) },
      { name: 'due', required: false }
    ],
    NOTE: [
      { name: 'title', required: true, sanitize: true },
      { name: 'content', required: true, sanitize: true }
    ],
    // ... DEVLOG, COMPONENT, etc.
  };
}
```

#### Usage (After Refactor):
```typescript
// In TodoHandlers.ts
const validation = FlagValidator.validate(parsed.flags, FlagValidator.RULES.TODO, 'add todo');
if (!validation.valid) return validation.error!;

const { title, content, priority, status, due } = validation.values;
// Continue with validated, sanitized values
```

**Impact:**
- ✅ Eliminates 200+ lines of validation code
- ✅ Consistent error messages across handlers
- ✅ Centralized sanitization logic
- ✅ Easier to add new validation rules

---

### Priority 3: Old Syntax Check Utility (MEDIUM IMPACT)
**Location:** 6 files with identical check
**Lines Saved:** ~120-150 lines

#### Current Pattern (Duplicated 6+ Times):
```typescript
// Check if using old syntax (args without flags) - this is an error
if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
  return {
    type: ResponseType.ERROR,
    message: '❌ Please use flag-based syntax or no arguments for wizard.',
    suggestions: [
      '/add todo - Interactive wizard',
      '/add todo --title="your todo title"',
      '/add todo --title="fix bug" --content="detailed description" --priority=high',
      '/help add todo'
    ]
  };
}
```

#### Proposed Refactor:
**Add to:** `backend/src/services/utils/commandHelpers.ts`

```typescript
export class CommandHelpers {
  /**
   * Check if command uses deprecated positional args syntax
   * Returns error response if old syntax detected
   */
  static checkOldSyntax(
    parsed: ParsedCommand,
    commandName: string,
    examples: string[]
  ): CommandResponse | null {
    if (parsed.args.length > 0 && getFlagCount(parsed.flags) === 0) {
      return {
        type: ResponseType.ERROR,
        message: '❌ Please use flag-based syntax or no arguments for wizard.',
        suggestions: [
          `/${commandName} - Interactive wizard`,
          ...examples,
          `/help ${commandName}`
        ]
      };
    }
    return null;
  }
}
```

#### Usage (After Refactor):
```typescript
// In TodoHandlers.ts
const syntaxError = CommandHelpers.checkOldSyntax(parsed, 'add todo', [
  '/add todo --title="your todo title"',
  '/add todo --title="fix bug" --content="details" --priority=high'
]);
if (syntaxError) return syntaxError;
```

**Impact:**
- ✅ Eliminates ~120 lines of duplicated checks
- ✅ Consistent error messages
- ✅ Easy to update help text globally

---

### Priority 4: Response Builder Enhancements (MEDIUM IMPACT)
**Location:** `BaseCommandHandler.ts`
**Usage:** 222 occurrences across 11 files
**Lines Saved:** ~100-150 lines

#### Current State:
BaseCommandHandler already has some response builders:
- `buildSuccessResponse()`
- `buildDataResponse()`
- `buildProjectErrorResponse()`

#### Proposed Additions:
```typescript
// Add to BaseCommandHandler.ts
export class BaseCommandHandler {
  // ... existing methods ...

  /**
   * Build error response
   */
  protected buildErrorResponse(
    message: string,
    suggestions?: string[]
  ): CommandResponse {
    return {
      type: ResponseType.ERROR,
      message,
      suggestions: suggestions || []
    };
  }

  /**
   * Build validation error response
   */
  protected buildValidationError(
    fieldName: string,
    commandName: string,
    helpText?: string[]
  ): CommandResponse {
    return {
      type: ResponseType.ERROR,
      message: `❌ --${fieldName} flag is required`,
      suggestions: helpText || [
        `/${commandName} - Use wizard instead`,
        `/${commandName} --${fieldName}="value"`,
        `/help ${commandName}`
      ]
    };
  }

  /**
   * Build "item not found" error
   */
  protected buildNotFoundError(
    itemType: string,
    identifier: string,
    suggestions?: string[]
  ): CommandResponse {
    return {
      type: ResponseType.ERROR,
      message: `❌ ${itemType} "${identifier}" not found`,
      suggestions: suggestions || [`/view ${itemType}s`, `/help`]
    };
  }
}
```

**Impact:**
- ✅ Reduces inline response object creation
- ✅ Consistent response structure
- ✅ Easier to modify response format globally

---

### Priority 5: Sanitization Wrapper (LOW IMPACT)
**Location:** Repeated sanitizeText() calls
**Lines Saved:** ~50-80 lines

#### Current Pattern:
```typescript
const sanitizedTitle = sanitizeText(title);
const sanitizedContent = sanitizeText(content);

if (!sanitizedTitle || !sanitizedContent) {
  return {
    type: ResponseType.ERROR,
    message: '❌ Title and content cannot be empty',
    suggestions: ['/help add note']
  };
}
```

#### Proposed Refactor:
**Add to:** `backend/src/utils/validation.ts`

```typescript
/**
 * Sanitize multiple fields and return error if any are empty
 */
export function sanitizeFields(
  fields: Record<string, string>,
  errorMessage?: string
): { sanitized: Record<string, string> } | { error: string } {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(fields)) {
    const clean = sanitizeText(value);
    if (!clean) {
      return {
        error: errorMessage || `❌ ${key} cannot be empty after sanitization`
      };
    }
    sanitized[key] = clean;
  }

  return { sanitized };
}
```

#### Usage (After Refactor):
```typescript
const result = sanitizeFields({ title, content }, '❌ Title and content cannot be empty');
if ('error' in result) {
  return this.buildErrorResponse(result.error, ['/help add note']);
}
const { title: sanitizedTitle, content: sanitizedContent } = result.sanitized;
```

**Impact:**
- ✅ Reduces sanitization boilerplate
- ✅ Consistent empty-check logic
- ⚠️ May be overkill for single-field sanitization

---

## Implementation Roadmap

### Phase 1: Foundation (2 hours)
1. Create `backend/src/services/utils/wizardBuilder.ts`
2. Create `backend/src/services/utils/flagValidator.ts`
3. Create `backend/src/services/utils/commandHelpers.ts`
4. Add response builders to `BaseCommandHandler.ts`
5. Write unit tests for all utilities

### Phase 2: Refactor CRUD Handlers (3 hours)
1. Refactor `TodoHandlers.ts` (use as template)
2. Refactor `NoteHandlers.ts`
3. Refactor `DevLogHandlers.ts`
4. Refactor `ComponentHandlers.ts`
5. Refactor `RelationshipHandlers.ts`
6. Test each handler thoroughly

### Phase 3: Refactor Other Handlers (2 hours)
1. Refactor `StackHandlers.ts`
2. Refactor `SettingsHandlers.ts`
3. Refactor `TeamHandlers.ts`
4. Refactor `UtilityHandlers.ts`

### Phase 4: Cleanup & Testing (1 hour)
1. Remove unused imports
2. Run full test suite (`npm test`)
3. Check test coverage changes
4. Update handler documentation
5. Commit with descriptive message

---

## Estimated Impact

### Code Metrics
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Handler Lines** | ~3,500 | ~2,700 | -23% |
| **Duplicated Code** | ~800 lines | ~100 lines | -87% |
| **Response Builders** | Inline | Centralized | Maintainability ↑ |
| **Wizard Definitions** | 7 places | 1 place | Single source of truth |
| **Validation Logic** | Scattered | Centralized | Consistency ↑ |

### Maintainability Gains
- ✅ **Single Source of Truth:** Wizards, validation rules, error messages centralized
- ✅ **Easier Onboarding:** New devs only need to learn utility APIs
- ✅ **Faster Feature Addition:** Adding new entities requires less boilerplate
- ✅ **Consistent UX:** All commands use same patterns
- ✅ **Easier Testing:** Utilities can be unit tested independently

### Risk Assessment
- ✅ **Low Risk:** Refactors don't change business logic
- ✅ **Backward Compatible:** Existing tests should pass
- ⚠️ **Testing Required:** Ensure all handlers work after refactor
- ⚠️ **Incremental Approach:** Refactor one handler at a time

---

## Additional Opportunities (Future)

### Route-Level Duplication
**Location:** `backend/src/routes/*.ts`
**Pattern:** Repeated auth middleware, error handling, response formatting
**Potential:** Create route middleware factory

### Frontend Terminal Component
**Location:** `frontend/src/components/Terminal.tsx`
**Pattern:** Command parsing, history management
**Potential:** Extract into composable hooks

### MongoDB Query Patterns
**Location:** All handlers making DB queries
**Pattern:** Repeated find/update/delete patterns
**Potential:** Create repository pattern abstractions

### Test Helpers
**Location:** `backend/src/tests/**/*.test.ts`
**Pattern:** Repeated test setup, mocks, assertions
**Potential:** Create test utility library

---

## Success Metrics

After refactoring, we should see:
- ✅ **-800 to -1,200 lines** of code removed
- ✅ **Test coverage maintained** or improved (currently 35%)
- ✅ **All 434 tests passing**
- ✅ **No regressions** in functionality
- ✅ **Faster handler development** (30-40% less boilerplate)
- ✅ **Easier to understand** for new contributors

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Create GitHub issue** for tracking
3. **Branch:** `refactor/handler-utilities`
4. **Implement Phase 1** (utilities)
5. **Test utilities** in isolation
6. **Refactor one handler** as proof of concept
7. **Review & iterate**
8. **Complete remaining phases**
9. **Merge to main** after full test coverage

---

**Total Estimated Time:** 6-8 hours
**Complexity:** Medium (requires careful testing)
**Priority:** High (improves long-term maintainability)
**Risk:** Low (non-breaking changes)
