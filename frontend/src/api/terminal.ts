import { BaseApiService } from './base';
import { getCsrfToken } from '../utils/csrf';

/**
 * Command response from backend
 */
export interface CommandResponse {
  type: 'success' | 'error' | 'info' | 'warning' | 'data' | 'prompt' | 'ai';
  message: string;
  data?: any;
  metadata?: {
    projectId?: string;
    projectName?: string;
    action?: string;
    timestamp?: Date;
  };
  suggestions?: string[];
}

export interface AIAction {
  type: string;
  summary: string;
  command: string;
  icon: string;
}

export interface AIResponseData {
  message: string;
  actions: AIAction[];
  followUp?: string;
  intent?: string;
  sessionId: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
  elapsed?: number;
  model?: string;
}

/**
 * Command metadata for autocomplete
 */
export interface CommandMetadata {
  value: string;
  label: string;
  description: string;
  examples: string[];
  category: string;
  aliases?: string[]; // Command aliases for matching
}

/**
 * Project for autocomplete
 */
export interface ProjectAutocomplete {
  value: string;
  label: string;
  description: string;
  category: string;
  color: string;
  isOwner: boolean;
}

/**
 * Terminal API Service
 * Handles all terminal/CLI related API calls
 */
class TerminalService extends BaseApiService {
  constructor() {
    super('/terminal');
  }

  /**
   * Execute a terminal command
   * @param command - Command string (e.g., "/add todo fix bug @project")
   * @param currentProjectId - Optional current project context
   * @returns Command response
   */
  async executeCommand(
    command: string,
    currentProjectId?: string,
    sessionId?: string
  ): Promise<CommandResponse> {
    return this.post('/execute', { command, currentProjectId, sessionId });
  }

  /**
   * Confirm and execute AI-proposed actions
   */
  async confirmAIActions(
    actions: AIAction[],
    currentProjectId?: string
  ): Promise<CommandResponse> {
    return this.post('/ai/confirm', { actions, currentProjectId });
  }

  /**
   * Get all available commands for autocomplete
   * @returns List of commands with metadata
   */
  async getCommands(): Promise<{ commands: CommandMetadata[] }> {
    return this.get('/commands');
  }

  /**
   * Get user's projects for @ autocomplete
   * @returns List of projects
   */
  async getProjects(): Promise<{ projects: ProjectAutocomplete[] }> {
    return this.get('/projects');
  }

  /**
   * Validate command syntax without executing
   * @param command - Command string to validate
   * @returns Validation result
   */
  async validateCommand(command: string): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    return this.post('/validate', { command });
  }

  /**
   * Get command suggestions based on partial input
   * @param partial - Partial command string (e.g., "/ad")
   * @returns Array of suggestions
   */
  async getSuggestions(partial: string): Promise<{ suggestions: string[] }> {
    return this.get(`/suggestions?partial=${encodeURIComponent(partial)}`);
  }

  /**
   * Get command history
   * @param limit - Number of history items to retrieve
   * @returns Command history
   */
  async getHistory(limit = 50): Promise<{
    history: Array<{
      command: string;
      timestamp: Date;
      success: boolean;
      commandType: string;
    }>;
  }> {
    return this.get(`/history?limit=${limit}`);
  }

  /**
   * Stream an AI query via SSE. Uses raw fetch (not axios) for streaming support.
   * @param command - Natural language input
   * @param currentProjectId - Current project context
   * @param sessionId - AI conversation session ID
   * @param onChunk - Called with each partial text chunk
   * @param onDone - Called with the final parsed AIResponse
   * @param onError - Called on stream error
   */
  streamAIQuery(
    command: string,
    currentProjectId?: string,
    sessionId?: string,
    onChunk?: (text: string) => void,
    onDone?: (aiResponse: AIResponseData) => void,
    onError?: (error: string) => void,
    mode?: string
  ): AbortController {
    const controller = new AbortController();

    (async () => {
    const csrfToken = await getCsrfToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    let res: Response;
    try {
      res = await fetch('/api/terminal/ai/stream', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ command, currentProjectId, sessionId, mode }),
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      onError?.(err.message || 'Network error');
      return;
    }

    if (!res.ok) {
      // Tier gates, rate limits, budget errors — render as AI card, not raw error
      const text = await res.text().catch(() => 'Unknown error');
      try {
        const json = JSON.parse(text);
        onDone?.({
          message: json.message || text,
          actions: [],
          sessionId: sessionId || '',
        });
      } catch {
        onError?.(text);
      }
      return;
    }

    // If the response isn't SSE (e.g. JSON fallback), handle it
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      try {
        const json = await res.json();
        onDone?.({
          message: json.message || json.data?.message || 'Unexpected response',
          actions: [],
          sessionId: sessionId || '',
        });
      } catch {
        onError?.('Unexpected non-streaming response');
      }
      return;
    }

    // Read SSE stream
    const reader = res.body?.getReader();
    if (!reader) {
      onError?.('No readable stream');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
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

          try {
            const parsed = JSON.parse(payload);
            if (parsed.chunk) {
              onChunk?.(parsed.chunk);
            }
            if (parsed.done && parsed.response) {
              onDone?.(parsed.response as AIResponseData);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      onError?.(err.message || 'Stream read error');
    }
    })();

    return controller;
  }
}

// Export singleton instance
export const terminalAPI = new TerminalService();
