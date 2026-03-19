import { logDebug, logError, logInfo } from '../config/logger';
import fs from 'fs/promises';
import path from 'path';

async function logAIDebug(label: string, data: Record<string, any>) {
  if (process.env.NODE_ENV === 'production') return;
  const logPath = path.join(process.cwd(), 'logs', 'ai-debug.log');
  const entry = `\n${'='.repeat(80)}\n[${new Date().toISOString()}] ${label}\n${'='.repeat(80)}\n${JSON.stringify(data, null, 2)}\n`;
  fs.appendFile(logPath, entry).catch(() => {});
}

// ── Interfaces ──────────────────────────────────────────────────────────

export interface AIAction {
  type: string; // matches any valid command category
  summary: string;
  command: string;
  icon: string;
}

export interface AIResponse {
  message: string;
  actions: AIAction[];
  followUp?: string;
  intent?: string;
  sessionId: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  elapsed?: number;
  model?: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── Config ──────────────────────────────────────────────────────────────

// 30s for production (Gemini/cloud), 5min for local Ollama (CPU inference is slow)
const TIMEOUT_MS = process.env.NODE_ENV === 'production' ? 30_000 : 300_000;

// Per-query output token cap — keep low to avoid cost surprises with expensive models
const MAX_TOKENS = Math.min(
  parseInt(process.env.AI_MAX_TOKENS || '2000', 10) || 2000,
  4000 // hard ceiling — never allow more than 4000 regardless of env var
);

interface ProviderConfig {
  baseUrl: string;
  apiKey?: string;
  headers: Record<string, string>;
  model: string;
  provider: 'gemini' | 'ollama';
}

// Compute once at startup — env vars don't change at runtime
const PROVIDER_CONFIG: ProviderConfig = (() => {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    const model = process.env.AI_MODEL || 'gemini-2.5-flash';
    logInfo(`AI provider: gemini (${model})`);
    return {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: geminiKey,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      model,
      provider: 'gemini' as const,
    };
  }

  const ollamaBase = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
  logInfo(`AI provider: ollama (${model}) at ${ollamaBase}`);
  return {
    baseUrl: `${ollamaBase}/v1`,
    headers: { 'Content-Type': 'application/json' } as Record<string, string>,
    model,
    provider: 'ollama' as const,
  };
})();

// ── Gemini Native API Schema ────────────────────────────────────────────

// Native Gemini responseSchema — enforces exact output structure
const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    message:  { type: 'STRING', description: 'Brief response (1-3 sentences)' },
    actions:  {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          type:    { type: 'STRING', description: 'Action category (e.g. todo_add, devlog_add, todo_delete)' },
          summary: { type: 'STRING', description: 'Human-readable description of what this action does' },
          command: { type: 'STRING', description: 'Exact slash command to execute (e.g. /add todo, /delete todo, /complete)' },
          icon:    { type: 'STRING', description: 'Single emoji icon' },
        },
        required: ['type', 'summary', 'command', 'icon'],
      },
    },
    followUp: { type: 'STRING', description: 'Follow-up question if critical info is missing. Empty string if actions are complete.', nullable: true },
    intent:   { type: 'STRING', description: 'One of: update, query, create, analyze, plan, scaffold, edit, delete', enum: ['update', 'query', 'create', 'analyze', 'plan', 'scaffold', 'edit', 'delete'] },
  },
  required: ['message', 'actions', 'followUp', 'intent'],
};

const OLLAMA_RESPONSE_FORMAT = { type: 'json_object' as const };

// ── System Prompt ───────────────────────────────────────────────────────

const SYSTEM_PROMPT_TEMPLATE = `You are Dev Codex AI, a terminal assistant for project management. Date: {{CURRENT_DATE}}.
If the user asks about their project data (todos, features, notes, devlog, stack, relationships), ALWAYS answer from PROJECT CONTEXT — this is on-topic.
Only use the off-topic reply for things completely unrelated to software, projects, or development: "I'm built for dev work — what are you building?"

Use SINGLE QUOTES in command flag values. Double quotes break JSON.

═══ ALLOWED COMMANDS (use ONLY these — never invent commands) ═══

CREATE:
  /add todo --title='text' --priority=low|medium|high --status=not_started|in_progress|blocked --due='MM-DD-YYYY' --content='text'
  /add subtask --parent='[# or title]' --title='text' --priority=low|medium|high --status=not_started|in_progress|blocked --due='MM-DD-YYYY'
  /add note --title='text' --content='text'
  /add devlog --title='text' --content='text'
  /add feature --group='name' --category=frontend|backend|database|infrastructure|security|api|documentation|asset --type=page|service|hook|middleware|util|endpoint|component --title='title' --content='desc'
  /add stack --name='name' --category=framework|api|database|devops|testing|language|library|tool --version=x.x.x --description='optional'
  /add relationship --source='name' --target='name' --type=uses|depends_on
  /add tag 'name'
  /add idea --title='text' --description='text' --content='text'
  /add project --name='text' --description='text' --category=web|mobile|api|cli|library|game|other --color=#hex

UPDATE:  /complete '#' | /push '#' | /assign '#' 'email'
EDIT:    /edit todo|note|devlog|feature|idea '#' --title='text' --content='text' (+ --priority=, --status=, --due=, --category=, --type=)
         /edit subtask 'parent#' 'subtask#' --title='text' --status=
DELETE:  /delete todo|note|devlog|feature|idea|subtask '#' --confirm
REMOVE:  /remove stack --name='name' | /remove tag 'name'
SETTINGS:/set name|description 'value' | /set deployment --url= --github= --platform= --status= --branch= --build= --start= | /set public --enabled=true|false --slug=

These are the ONLY commands that exist. Do NOT invent commands like /todos, /tasks, /list, /view, /show, /help, /status, /list_todos, /delete_todo — they will fail.

═══ RULES ═══
1. ACT DECISIVELY — if you have enough info, propose actions immediately. Reference items by their # index from PROJECT CONTEXT.
2. The "command" field must contain an exact command from the list above with real values filled in. Copy the syntax exactly.
3. Only include flags the user mentioned or that are required. Don't pad with defaults.
4. followUp: empty string when actions are complete. Only ask when you're missing critical info to build the command. Never filler.
5. For status/overview/suggestion/analysis questions: summarize from PROJECT CONTEXT. Count by status, name specific items by #. Never say "no tasks" if todos exist. If asked to suggest or review items, use what's in PROJECT CONTEXT as your basis.
6. Batch multiple actions when the user describes multiple changes.
9. CLEANUP/REVIEW REQUESTS: When the user asks to clean up, review, or manage ANY entity (notes, features, devlog, deployment, stack, ideas — not just todos), reference items by their # index. If you can identify obvious candidates (duplicates, outdated, empty), propose delete actions directly. Otherwise ask which #s to remove — the UI shows the item list automatically so you don't need to repeat it.
7. Dates: MM-DD-YYYY with dashes only. Never past dates.
8. Be concise — you're a terminal tool, not a chatbot.

═══ EXAMPLES ═══

User: "add a todo to fix auth"
{"message":"Adding that.","actions":[{"type":"todo_add","summary":"Add auth todo","command":"/add todo --title='Fix auth'","icon":"✅"}],"followUp":"","intent":"create"}

User: "finished the login page, used JWT"
{"message":"Nice — logging that and updating status.","actions":[{"type":"devlog_add","summary":"Add devlog entry","command":"/add devlog --title='Completed login page' --content='Implemented login with JWT authentication'","icon":"📝"},{"type":"todo_update","summary":"Mark login todo done","command":"/complete '2'","icon":"✅"},{"type":"stack_add","summary":"Add JWT to stack","command":"/add stack --name='JWT' --category=library","icon":"📦"}],"followUp":"","intent":"update"}

User: "clean up my todos, delete the test ones"
{"message":"Cleaning up — removing test/duplicate todos.","actions":[{"type":"todo_delete","summary":"Delete 'test subtask'","command":"/delete todo '3' --confirm","icon":"🗑️"},{"type":"todo_delete","summary":"Delete 'Test tracking'","command":"/delete todo '4' --confirm","icon":"🗑️"},{"type":"todo_delete","summary":"Delete 'Test tracking2'","command":"/delete todo '5' --confirm","icon":"🗑️"}],"followUp":"","intent":"delete"}

User: "what's my project status?"
{"message":"You have 19 todos: 1 in progress (#11 Setup auth system), 18 not started. 9 are high priority including #1 Set up Production Keys (overdue), #12 Build recipe CRUD, #14 Finish AI integration. You also have 3 notes, 4 devlog entries, and 17 features mapped.","actions":[],"followUp":"","intent":"query"}

User: "add a feature for payments"
{"message":"What part of payments? Frontend page, backend service, API endpoint, or full stack?","actions":[],"followUp":"What type and category? (e.g. backend/service, frontend/page)","intent":"create"}

User: "clean up my notes"
{"message":"You have 3 notes. Any of these outdated or ready to remove?","actions":[],"followUp":"Which #s should I delete?","intent":"query"}

User: "can we clean up my features? and suggest some new ones"
{"message":"All 5 look relevant. Here are some suggestions based on your stack:","actions":[{"type":"feature_add","summary":"Add Dashboard Page","command":"/add feature --group='Project Management' --category=frontend --type=page --title='Dashboard Page' --content='Visual project overview with stats'","icon":"📊"},{"type":"feature_add","summary":"Add Email Service","command":"/add feature --group='Notifications' --category=backend --type=service --title='Email Service' --content='Transactional emails via Resend'","icon":"📧"}],"followUp":"","intent":"create"}

User: "suggest some features I should add"
{"message":"Based on your project, here are features you're missing:","actions":[{"type":"feature_add","summary":"Add API Gateway middleware","command":"/add feature --group='API' --category=backend --type=middleware --title='API Gateway' --content='Rate limiting, auth, request validation'","icon":"🔒"},{"type":"feature_add","summary":"Add Settings Page","command":"/add feature --group='User Management' --category=frontend --type=page --title='Settings Page' --content='User preferences and account settings'","icon":"⚙️"}],"followUp":"","intent":"create"}`;

function buildSystemPrompt(): string {
  const now = new Date();
  const currentDate = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
  return SYSTEM_PROMPT_TEMPLATE.replace('{{CURRENT_DATE}}', currentDate);
}

// ── Gemini Native Request Builders ──────────────────────────────────────

/** Convert ChatMessage[] (OpenAI format) → Gemini native contents[] */
function toGeminiContents(messages: ChatMessage[]): { role: string; parts: { text: string }[] }[] {
  // Filter out system messages — those go in system_instruction
  return messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

/** Build system_instruction from system prompt + any system messages in the chat history */
function buildGeminiSystemInstruction(messages: ChatMessage[]): { parts: { text: string }[] } {
  const systemPrompt = buildSystemPrompt();
  const contextMessages = messages.filter(m => m.role === 'system').map(m => m.content);
  const fullInstruction = [systemPrompt, ...contextMessages].join('\n\n');
  return { parts: [{ text: fullInstruction }] };
}

function buildGeminiBody(messages: ChatMessage[]) {
  return {
    system_instruction: buildGeminiSystemInstruction(messages),
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: MAX_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: GEMINI_RESPONSE_SCHEMA,
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Attempt to repair broken JSON from AI models.
 * Common issue: unescaped double quotes inside string values.
 */
function repairJSON(raw: string): string {
  return raw.replace(
    /("command"\s*:\s*")([^"]*(?:"[^"]*)*?)(")/g,
    (_match, prefix, content, suffix) => {
      const fixed = content.replace(/(?<!\\)"/g, "'");
      return prefix + fixed + suffix;
    }
  );
}

/** Extract the first JSON object from a string that may contain freeform text */
function extractJSON(raw: string): Record<string, any> | null {
  raw = raw.replace(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/g, '$1').trim();
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth === 0) {
      const slice = raw.slice(start, i + 1);
      try {
        return JSON.parse(slice);
      } catch {
        try {
          return JSON.parse(repairJSON(slice));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

// ── Response Parsing ────────────────────────────────────────────────────

interface ParsedResult {
  message: string;
  actions: AIAction[];
  followUp?: string;
  intent?: string;
}

/**
 * Parse raw AI output into a normalized AIResponse. Shared by query + queryStream.
 * Gemini with responseSchema guarantees valid JSON — skip repair/extraction.
 * Ollama may produce broken JSON — use full fallback chain.
 */
function parseAIContent(raw: string, sessionId: string, provider: 'gemini' | 'ollama' = 'gemini'): ParsedResult {
  let parsed: Partial<AIResponse>;

  if (provider === 'gemini') {
    // Gemini structured output — should always be valid JSON
    try {
      parsed = JSON.parse(raw);
    } catch {
      logError('Gemini returned invalid JSON (unexpected)', new Error('Gemini JSON parse failed'), { sessionId, rawPreview: raw.slice(0, 200) });
      throw new SyntaxError('Gemini returned invalid JSON');
    }
  } else {
    // Ollama — may need repair
    try {
      parsed = JSON.parse(raw);
    } catch {
      try {
        parsed = JSON.parse(repairJSON(raw));
      } catch {
        const extracted = extractJSON(raw);
        if (!extracted) throw new SyntaxError('No valid JSON found in AI response');
        parsed = extracted as Partial<AIResponse>;
      }
    }
  }

  const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const actions = rawActions
    .map((a: any) => ({
      type: a.type || 'unknown',
      summary: a.summary || a.description || a.label || '',
      command: a.command || a.action || '',
      icon: a.icon || a.emoji || '🔧',
    }))
    .filter((a: any) => a.summary && a.command);

  if (rawActions.length > 0 && actions.length === 0) {
    logDebug('AI: actions filtered out (missing summary/command)', { rawActions, sessionId });
  }

  return {
    message: parsed.message || 'I processed your request.',
    actions,
    followUp: parsed.followUp || (parsed as any).follow_up || undefined,
    intent: parsed.intent || undefined,
  };
}

function buildTimeoutMessage(provider: string): string {
  return provider === 'ollama'
    ? 'The AI took too long to respond. Try a simpler query or check that Ollama is running.'
    : 'The AI took too long to respond. Try a simpler query or try again in a moment.';
}

function buildConnectionMessage(provider: string): string {
  return provider === 'ollama'
    ? 'Could not connect to Ollama. Make sure it\'s running (`ollama serve` or `docker start ollama`).'
    : 'Could not connect to AI provider. Check your API key and network.';
}

// ── Gemini Native Response Parsing ──────────────────────────────────────

function parseGeminiResponse(data: any): { content: string; tokensUsed?: { prompt: number; completion: number; total: number } } {
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const usage = data.usageMetadata;
  const tokensUsed = usage ? {
    prompt: usage.promptTokenCount || 0,
    completion: usage.candidatesTokenCount || 0,
    total: usage.totalTokenCount || 0,
  } : undefined;
  return { content, tokensUsed };
}

// ── Service ─────────────────────────────────────────────────────────────

export class AIService {
  /**
   * Non-streaming query. Gemini uses native API, Ollama uses OpenAI-compat.
   */
  static async query(
    messages: ChatMessage[],
    sessionId: string
  ): Promise<AIResponse> {
    const config = PROVIDER_CONFIG;
    const isGemini = config.provider === 'gemini';

    // Build URL + body based on provider
    let url: string;
    let body: Record<string, any>;

    if (isGemini) {
      url = `${config.baseUrl}/models/${config.model}:generateContent`;
      body = buildGeminiBody(messages);
    } else {
      url = `${config.baseUrl}/chat/completions`;
      body = {
        model: config.model,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        response_format: OLLAMA_RESPONSE_FORMAT,
      };
    }

    const totalChars = JSON.stringify(body).length;
    logDebug('AI request', { model: config.model, provider: config.provider, totalChars, sessionId });
    logAIDebug('REQUEST', { sessionId, model: config.model, provider: config.provider, body });

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        logError('AI HTTP error', new Error(`${config.provider} ${res.status}`), { errorText, elapsed, sessionId });
        throw new Error(`${config.provider} returned ${res.status}: ${errorText}`);
      }

      const data: any = await res.json();

      let content: string;
      let tokensUsed: { prompt: number; completion: number; total: number } | undefined;

      if (isGemini) {
        const geminiResult = parseGeminiResponse(data);
        content = geminiResult.content;
        tokensUsed = geminiResult.tokensUsed;
      } else {
        content = data.choices?.[0]?.message?.content || '';
        tokensUsed = data.usage ? {
          prompt: data.usage.prompt_tokens || 0,
          completion: data.usage.completion_tokens || 0,
          total: data.usage.total_tokens || 0,
        } : undefined;
      }

      logDebug('AI response', { elapsed: `${elapsed}ms`, tokens: tokensUsed?.total, provider: config.provider, sessionId });

      if (!content) {
        throw new Error('Empty response from AI model');
      }

      const parsed = parseAIContent(content, sessionId, config.provider);
      const aiResponse: AIResponse = { ...parsed, sessionId, tokensUsed, elapsed, model: config.model };

      logAIDebug('RESPONSE', { sessionId, rawContent: content, parsed: aiResponse });

      return aiResponse;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logError('AI query timeout', new Error('Request timed out'), { sessionId });
        return { message: buildTimeoutMessage(config.provider), actions: [], sessionId };
      }

      if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        logError(`${config.provider} not reachable`, error, { sessionId });
        return { message: buildConnectionMessage(config.provider), actions: [], sessionId };
      }

      if (error instanceof SyntaxError) {
        logError('AI returned invalid JSON', error, { sessionId });
        return { message: 'The AI returned an invalid response. Try rephrasing your query.', actions: [], sessionId };
      }

      logError('AI query failed', error, { sessionId });
      return { message: `AI error: ${error.message || 'Unknown error'}`, actions: [], sessionId };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Streaming query. Gemini uses native SSE, Ollama uses OpenAI-compat SSE.
   */
  static async *queryStream(
    messages: ChatMessage[],
    sessionId: string
  ): AsyncGenerator<{ type: 'chunk'; text: string } | { type: 'done'; response: AIResponse }> {
    const config = PROVIDER_CONFIG;
    const isGemini = config.provider === 'gemini';

    let url: string;
    let body: Record<string, any>;

    if (isGemini) {
      url = `${config.baseUrl}/models/${config.model}:streamGenerateContent?alt=sse`;
      body = buildGeminiBody(messages);
    } else {
      url = `${config.baseUrl}/chat/completions`;
      body = {
        model: config.model,
        messages: [{ role: 'system', content: buildSystemPrompt() }, ...messages],
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        stream: true,
        response_format: OLLAMA_RESPONSE_FORMAT,
      };
    }

    const totalChars = JSON.stringify(body).length;
    logDebug('AI stream request', { model: config.model, provider: config.provider, totalChars, sessionId });
    logAIDebug('STREAM REQUEST', { sessionId, model: config.model, provider: config.provider, body });

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        logError('AI stream HTTP error', new Error(`${config.provider} ${res.status}`), { errorText, sessionId });
        yield {
          type: 'done',
          response: { message: `${config.provider} returned ${res.status}: ${errorText}`, actions: [], sessionId },
        };
        return;
      }

      if (!res.body) {
        yield { type: 'done', response: { message: 'No stream body from AI model', actions: [], sessionId } };
        return;
      }

      let accumulated = '';
      let streamTokenUsage: { prompt: number; completion: number; total: number } | undefined;
      const decoder = new TextDecoder();
      const reader = res.body.getReader();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(payload);

            if (isGemini) {
              // Gemini native SSE: each chunk is a full generateContent response
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                accumulated += text;
                yield { type: 'chunk', text };
              }
              // Capture usage from any chunk that has it
              if (parsed.usageMetadata) {
                streamTokenUsage = {
                  prompt: parsed.usageMetadata.promptTokenCount || 0,
                  completion: parsed.usageMetadata.candidatesTokenCount || 0,
                  total: parsed.usageMetadata.totalTokenCount || 0,
                };
              }
            } else {
              // OpenAI-compat (Ollama)
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                yield { type: 'chunk', text: delta };
              }
              if (parsed.usage) {
                streamTokenUsage = {
                  prompt: parsed.usage.prompt_tokens || 0,
                  completion: parsed.usage.completion_tokens || 0,
                  total: parsed.usage.total_tokens || 0,
                };
              }
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      const elapsed = Date.now() - startTime;
      logDebug('AI stream complete', { elapsed: `${elapsed}ms`, totalLength: accumulated.length, provider: config.provider, sessionId });

      // Parse the accumulated JSON response
      let aiResponse: AIResponse;
      try {
        const parsed = parseAIContent(accumulated, sessionId, config.provider);

        const tokensUsed = streamTokenUsage || {
          prompt: 0,
          completion: 0,
          total: Math.ceil((totalChars + accumulated.length) / 4), // rough estimate, Ollama-only fallback
        };

        aiResponse = { ...parsed, sessionId, tokensUsed, elapsed, model: config.model };
        logAIDebug('STREAM RESPONSE', { sessionId, rawContent: accumulated, parsed: aiResponse });
      } catch {
        aiResponse = {
          message: accumulated || 'Empty response from AI model.',
          actions: [],
          sessionId,
          elapsed,
          model: config.model,
        };
      }

      yield { type: 'done', response: aiResponse };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logError('AI stream timeout', new Error('Stream timed out'), { sessionId });
        yield { type: 'done', response: { message: buildTimeoutMessage(config.provider), actions: [], sessionId } };
        return;
      }

      if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        logError(`${config.provider} not reachable (stream)`, error, { sessionId });
        yield { type: 'done', response: { message: buildConnectionMessage(config.provider), actions: [], sessionId } };
        return;
      }

      logError('AI stream failed', error, { sessionId });
      yield { type: 'done', response: { message: `AI error: ${error.message || 'Unknown error'}`, actions: [], sessionId } };
    } finally {
      clearTimeout(timeout);
    }
  }
}
