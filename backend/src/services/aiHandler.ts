import { v4 as uuidv4 } from 'uuid';
import { AIService, AIResponse, AITier } from './AIService';
import { AIContextBuilder } from './AIContextBuilder';
import { classifyInput, getContextEntities, InputClassification } from './AIClassifier';
import { logDebug } from '../config/logger';

// ── Types ───────────────────────────────────────────────────────────────

interface ConversationSession {
  id: string;
  userId: string;
  projectId?: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  ambientContext: string;
  contextFresh: boolean; // true when cached ambientContext is up to date (false = re-fetch on next turn)
  lastActiveAt: Date;
}

// ── Session Store ───────────────────────────────────────────────────────

const sessions = new Map<string, ConversationSession>();

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired sessions
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActiveAt.getTime() > SESSION_TTL_MS) {
      sessions.delete(id);
      logDebug('AI session expired', { sessionId: id, userId: session.userId });
    }
  }
}, CLEANUP_INTERVAL_MS);

// ── Helpers ─────────────────────────────────────────────────────────────

async function loadOrCreateSession(
  userId: string,
  projectId: string | undefined,
  sessionId: string | undefined
): Promise<ConversationSession> {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    // Prevent session hijacking — reject if userId doesn't match
    if (session.userId !== userId) {
      logDebug('AI session userId mismatch — creating new session', { sessionId, userId });
      // Fall through to create a new session below
    } else {
      if (projectId && session.projectId !== projectId) {
        session.projectId = projectId;
        session.ambientContext = await AIContextBuilder.build(userId, projectId);
        session.contextFresh = true; // just fetched
      }
      return session;
    }
  }

  const newId = uuidv4();
  const ambientContext = await AIContextBuilder.build(userId, projectId);
  const session: ConversationSession = {
    id: newId,
    userId,
    projectId,
    history: [],
    ambientContext,
    contextFresh: true, // just fetched
    lastActiveAt: new Date(),
  };
  sessions.set(newId, session);
  logDebug('AI session created', { sessionId: newId, userId, projectId });
  return session;
}

async function buildMessages(
  session: ConversationSession,
  classification: InputClassification,
  mode?: string
) {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  // Inject project context based on classification
  if (classification.contextNeeds !== 'none') {
    if (classification.contextNeeds === 'selective' && !session.contextFresh) {
      // Context is stale AND we know which entities are needed — fetch only those (saves tokens + refreshes)
      const contextEntities = getContextEntities(classification.referencedEntities);
      const selectiveContext = await AIContextBuilder.buildSelective(
        session.userId, session.projectId, contextEntities
      );
      if (selectiveContext) {
        messages.push({ role: 'system', content: `[PROJECT CONTEXT]\n${selectiveContext}` });
      }
      // Don't mark contextFresh — full cache is still stale
    } else if (classification.contextNeeds === 'selective' && session.contextFresh) {
      // Context is fresh — filter from the cached full context would require structured data.
      // For now, use the cached full context (slightly more tokens but avoids a DB call).
      // TODO: cache raw project doc to enable true selective filtering from cache
      if (session.ambientContext) {
        messages.push({ role: 'system', content: `[PROJECT CONTEXT]\n${session.ambientContext}` });
      }
    } else {
      // Full context
      if (!session.contextFresh) {
        if (session.projectId || session.userId) {
          session.ambientContext = await AIContextBuilder.build(session.userId, session.projectId);
        }
        session.contextFresh = true;
      }
      if (session.ambientContext) {
        messages.push({ role: 'system', content: `[PROJECT CONTEXT]\n${session.ambientContext}` });
      }
    }
  }
  // contextNeeds === 'none' → skip project context entirely (follow-ups)

  if (mode === 'NEW_PROJECT') {
    messages.push({
      role: 'system',
      content: '[MODE: NEW_PROJECT] Help the user define and create a new project. Ask follow-up questions about the project name, description, category, and tech stack. When ready, propose using /add project with the details.',
    });
  }

  messages.push(...session.history);
  return messages;
}

// ── History Summarization ───────────────────────────────────────────────

/**
 * Summarize dropped history turns into a compact context line.
 * Local-only — no AI call. Extracts key info from [Proposed: ...] tags
 * and user messages to preserve conversational context.
 */
function summarizeHistory(dropped: Array<{ role: string; content: string }>): string {
  const userTopics: string[] = [];
  const aiProposals: string[] = [];
  let userTurnCount = 0;

  for (const msg of dropped) {
    if (msg.role === 'user') {
      userTurnCount++;
      // Extract first ~40 chars as topic hint
      const topic = msg.content.slice(0, 40).trim();
      if (topic) userTopics.push(topic);
    } else if (msg.role === 'assistant') {
      // Extract [Proposed: ...] summaries
      const match = msg.content.match(/\[Proposed: (.+?)\]/);
      if (match) aiProposals.push(match[1]);
    }
  }

  const parts: string[] = [`${userTurnCount} earlier turn${userTurnCount !== 1 ? 's' : ''}`];

  if (userTopics.length > 0) {
    // Show up to 3 topic hints
    const topics = userTopics.slice(0, 3).map(t =>
      t.length >= 40 ? t + '...' : t
    );
    parts.push(`User discussed: ${topics.join('; ')}`);
  }

  if (aiProposals.length > 0) {
    parts.push(`AI proposed: ${aiProposals.slice(0, 2).join('; ')}`);
  }

  return parts.join('. ') + '.';
}

/**
 * Compress history when it gets too long.
 * Instead of dropping old messages, summarize them into a single context line.
 */
function compressHistory(session: ConversationSession): void {
  if (session.history.length <= 10) return;

  const dropped = session.history.slice(0, -8);
  const summary = summarizeHistory(dropped);

  session.history = [
    { role: 'assistant', content: `[Prior context: ${summary}]` },
    ...session.history.slice(-8),
  ];
  session.contextFresh = false; // re-fetch context to compensate for summarized turns
}

// ── Handler ─────────────────────────────────────────────────────────────

export async function handleAIQuery(
  userId: string,
  query: string,
  projectId?: string,
  sessionId?: string,
  mode?: string,
  tier: AITier = 'paid'
): Promise<AIResponse> {
  const session = await loadOrCreateSession(userId, projectId, sessionId);
  session.lastActiveAt = new Date();

  // Classify input before AI call
  const classification = classifyInput(query, session.history.length > 0);
  logDebug('AI classification', {
    input: query.slice(0, 50),
    category: classification.category,
    contextNeeds: classification.contextNeeds,
    entities: [...classification.referencedEntities],
    sessionId: session.id,
  });

  session.history.push({ role: 'user', content: query });
  const messages = await buildMessages(session, classification, mode);

  // Call AI
  const response = await AIService.query(messages, session.id, tier);

  // Override intent with local classification (deterministic, free)
  response.intent = classification.category;

  // Store assistant response with enough context for multi-turn coherence.
  // Include actions summary so the AI knows what it proposed (critical for follow-ups like "yes").
  let historyContent = response.message;
  if (response.actions.length > 0) {
    historyContent += '\n[Proposed: ' + response.actions.map(a => a.summary).join('; ') + ']';
  }
  if (response.followUp) {
    historyContent += `\n[Asked user: ${response.followUp}]`;
  }

  session.history.push({ role: 'assistant', content: historyContent });

  // Compress history instead of crude truncation
  compressHistory(session);

  return response;
}

/**
 * Streaming version of handleAIQuery — yields partial chunks then final response.
 * Session management is identical to handleAIQuery.
 */
export async function* handleAIQueryStream(
  userId: string,
  query: string,
  projectId?: string,
  sessionId?: string,
  mode?: string,
  tier: AITier = 'paid'
): AsyncGenerator<{ type: 'chunk'; text: string } | { type: 'done'; response: AIResponse }> {
  const session = await loadOrCreateSession(userId, projectId, sessionId);
  session.lastActiveAt = new Date();

  // Classify input before AI call
  const classification = classifyInput(query, session.history.length > 0);
  logDebug('AI classification (stream)', {
    input: query.slice(0, 50),
    category: classification.category,
    contextNeeds: classification.contextNeeds,
    entities: [...classification.referencedEntities],
    sessionId: session.id,
  });

  session.history.push({ role: 'user', content: query });
  const messages = await buildMessages(session, classification, mode);

  let finalResponse: AIResponse | null = null;

  for await (const event of AIService.queryStream(messages, session.id, tier)) {
    if (event.type === 'done') {
      finalResponse = event.response;
    }
    yield event;
  }

  // Store assistant response with actions/followUp context for multi-turn coherence
  if (finalResponse) {
    // Override intent with local classification
    finalResponse.intent = classification.category;

    let historyContent = finalResponse.message;
    if (finalResponse.actions.length > 0) {
      historyContent += '\n[Proposed: ' + finalResponse.actions.map(a => a.summary).join('; ') + ']';
    }
    if (finalResponse.followUp) {
      historyContent += `\n[Asked user: ${finalResponse.followUp}]`;
    }

    session.history.push({ role: 'assistant', content: historyContent });
  }

  // Compress history instead of crude truncation
  compressHistory(session);
}

/** Mark session context as stale — next query will re-fetch project data */
export function invalidateSessionContext(userId: string): void {
  for (const session of sessions.values()) {
    if (session.userId === userId) {
      session.contextFresh = false;
    }
  }
}

/** Clear all sessions for a user */
export function clearUserSessions(userId: string): void {
  for (const [id, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(id);
    }
  }
}
