/**
 * Date comparison utilities for todo items and scheduling
 */

/**
 * Check if a date is overdue (before today)
 */
export const isOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
};

/**
 * Check if a date is today
 */
export const isToday = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const today = new Date().setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  return due === today;
};

/**
 * Check if a date is tomorrow
 */
export const isTomorrow = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  return due === tomorrow.valueOf();
};

/**
 * Check if a date is soon (2-7 days from now)
 */
export const isSoon = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const now = new Date().setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diffDays >= 2 && diffDays <= 7;
};

/**
 * Check if a date is in the future (more than 7 days from now)
 * Returns true for undefined dates (undated items go to future)
 */
export const isFuture = (dueDate?: string): boolean => {
  if (!dueDate) return true; // Undated todos go to future
  const now = new Date().setHours(0, 0, 0, 0);
  const due = new Date(dueDate).setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diffDays > 7;
};
