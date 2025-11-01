/**
 * Priority utilities for todo items
 */

export type Priority = 'high' | 'medium' | 'low';

/**
 * Get the color class for a priority level
 */
export const getPriorityColor = (priority?: string): string => {
  switch (priority) {
    case 'high':
      return 'text-error';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-success';
    default:
      return 'text-base-content/60';
  }
};

/**
 * Get the numeric weight for a priority level (for sorting)
 */
export const getPriorityWeight = (priority?: string): number => {
  switch (priority) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 2; // Default to medium priority
  }
};

/**
 * Get a badge color class for a priority level
 */
export const getPriorityBadgeColor = (priority?: string): string => {
  switch (priority) {
    case 'high':
      return 'badge-error';
    case 'medium':
      return 'badge-warning';
    case 'low':
      return 'badge-success';
    default:
      return 'badge-ghost';
  }
};
