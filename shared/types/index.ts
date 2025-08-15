// Re-export all shared types for easy importing
export * from './user';
export * from './project';
export * from './team';
export * from './analytics';

// Import types for use in interfaces
import type { BaseUser } from './user';
import type { BaseProject, ProjectTeamData } from './project';

// Common API response patterns
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  code?: string;
}

export interface AuthResponse {
  message: string;
  user: BaseUser;
}

export interface ProjectResponse {
  message: string;
  project: BaseProject & ProjectTeamData;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  theme?: string;
}