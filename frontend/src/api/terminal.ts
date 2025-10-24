import { BaseApiService } from './base';

/**
 * Command response from backend
 */
export interface CommandResponse {
  type: 'success' | 'error' | 'info' | 'warning' | 'data' | 'prompt';
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
    currentProjectId?: string
  ): Promise<CommandResponse> {
    return this.post('/execute', { command, currentProjectId });
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
}

// Export singleton instance
export const terminalAPI = new TerminalService();
