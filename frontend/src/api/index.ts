// Re-export all API services for easy importing
export { authAPI } from './auth';
export { projectAPI } from './projects';
export { teamAPI, invitationAPI } from './team';
export { notificationAPI } from './notifications';
export { analyticsAPI, publicAPI } from './analytics';
export { apiClient } from './base';

// Re-export types for backward compatibility
export * from './types';