// ── Types ───────────────────────────────────────────────────────────────

/** Entities that have data sections in AIContextBuilder */
export type ContextEntity = 'todos' | 'notes' | 'devlog' | 'features' | 'stack' | 'tags';

/** Entities that only exist as command targets (no context section) */
export type CommandEntity = 'subtasks' | 'relationships' | 'deployment' | 'team' | 'settings' | 'ideas' | 'projects' | 'public';

export type EntityType = ContextEntity | CommandEntity;

export interface InputClassification {
  category: 'follow_up' | 'action' | 'query' | 'conversational';
  referencedEntities: Set<EntityType>;
  contextNeeds: 'none' | 'selective' | 'full';
}

// ── Entity Patterns ─────────────────────────────────────────────────────

const CONTEXT_ENTITIES: Array<{ entity: ContextEntity; pattern: RegExp }> = [
  { entity: 'todos',    pattern: /\b(todo|todos|task|tasks|item|items)\b/i },
  { entity: 'notes',    pattern: /\b(note|notes)\b/i },
  { entity: 'devlog',   pattern: /\b(devlog|dev log|dev-log|log|logs|journal|progress)\b/i },
  { entity: 'features', pattern: /\b(feature|features|component|components)\b/i },
  { entity: 'stack',    pattern: /\b(stack|tech|package|packages|library|libraries|framework|tool|tools|dependency|dependencies)\b/i },
  { entity: 'tags',     pattern: /\b(tag|tags|label|labels)\b/i },
];

const COMMAND_ENTITIES: Array<{ entity: CommandEntity; pattern: RegExp }> = [
  { entity: 'subtasks',      pattern: /\b(subtask|subtasks|sub-task|sub task)\b/i },
  { entity: 'relationships', pattern: /\b(relationship|relationships|depends|uses|connect)\b/i },
  { entity: 'deployment',    pattern: /\b(deploy|deployment|hosting|url|domain|build|production|staging)\b/i },
  { entity: 'team',          pattern: /\b(team|member|members|invite|collaborat\w*)\b/i },
  { entity: 'settings',      pattern: /\b(setting|settings|config)\b/i },
  { entity: 'ideas',         pattern: /\b(idea|ideas)\b/i },
  { entity: 'projects',      pattern: /\b(project|projects|swap|switch)\b/i },
  { entity: 'public',        pattern: /\b(public|share|sharing|slug|discover)\b/i },
];

// ── Category Patterns ───────────────────────────────────────────────────

const FOLLOW_UP_PATTERN = /^(yes|yeah|yep|sure|ok|okay|do it|go ahead|confirm|no|nope|nah|cancel|nevermind|skip|tell me more)\.?!?$/i;

const ACTION_PATTERN = /^(add|create|delete|remove|finish|complete|done|mark|update|edit|change|set|push|assign|invite|clean\s*up|clear|condense)\b/i;

const QUERY_PATTERN = /^(what|how|show|status|list|overview|any|which|tell me|count|summarize|suggest|review|where|when|who)\b/i;

// ── Classifier ──────────────────────────────────────────────────────────

/**
 * Classify user input BEFORE sending to AI.
 * Determines which project data sections to include in context.
 *
 * @param input - Raw user input (trimmed)
 * @param hasHistory - Whether the session has prior conversation turns
 */
export function classifyInput(input: string, hasHistory: boolean): InputClassification {
  const trimmed = input.trim();
  const entities = detectEntities(trimmed);

  // 1. Follow-up: short affirmative/negative in an active session
  if (hasHistory && trimmed.length < 20 && FOLLOW_UP_PATTERN.test(trimmed)) {
    return { category: 'follow_up', referencedEntities: entities, contextNeeds: 'none' };
  }

  // 2. Action: starts with action verb
  if (ACTION_PATTERN.test(trimmed)) {
    return {
      category: 'action',
      referencedEntities: entities,
      contextNeeds: hasContextEntities(entities) ? 'selective' : 'full',
    };
  }

  // 3. Query: starts with question word OR ends with ?
  if (QUERY_PATTERN.test(trimmed) || trimmed.endsWith('?')) {
    return {
      category: 'query',
      referencedEntities: entities,
      contextNeeds: hasContextEntities(entities) ? 'selective' : 'full',
    };
  }

  // 4. Fallback: ambiguous — send everything
  return { category: 'conversational', referencedEntities: entities, contextNeeds: 'full' };
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Scan input for all entity references */
function detectEntities(input: string): Set<EntityType> {
  const found = new Set<EntityType>();

  for (const { entity, pattern } of CONTEXT_ENTITIES) {
    if (pattern.test(input)) found.add(entity);
  }
  for (const { entity, pattern } of COMMAND_ENTITIES) {
    if (pattern.test(input)) found.add(entity);
  }

  return found;
}

/** Check if the entity set contains at least one context entity */
function hasContextEntities(entities: Set<EntityType>): boolean {
  const contextTypes: Set<string> = new Set(['todos', 'notes', 'devlog', 'features', 'stack', 'tags']);
  for (const e of entities) {
    if (contextTypes.has(e)) return true;
  }
  return false;
}

/** Extract only context entities from a mixed set */
export function getContextEntities(entities: Set<EntityType>): Set<ContextEntity> {
  const contextTypes = new Set<ContextEntity>(['todos', 'notes', 'devlog', 'features', 'stack', 'tags']);
  const result = new Set<ContextEntity>();
  for (const e of entities) {
    if (contextTypes.has(e as ContextEntity)) result.add(e as ContextEntity);
  }
  return result;
}
