/**
 * Response types for terminal commands
 */
export enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning',
  DATA = 'data',
  PROMPT = 'prompt'
}

/**
 * Structured response from command execution
 */
export interface CommandResponse {
  type: ResponseType;
  message: string;
  data?: any;
  suggestions?: string[];
  metadata?: {
    projectId?: string;
    projectName?: string;
    action?: string;
    timestamp?: Date;
    [key: string]: any;
  };
}
