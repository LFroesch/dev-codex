/**
 * Validation utilities for command inputs
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize text input (remove potentially harmful characters)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
}

/**
 * Validate and sanitize project name
 */
export function validateProjectName(name: string): { isValid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeText(name);

  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Project name cannot be empty' };
  }

  if (sanitized.length > 100) {
    return { isValid: false, error: 'Project name must be less than 100 characters' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate priority level
 */
export function isValidPriority(priority: string): priority is 'low' | 'medium' | 'high' {
  return ['low', 'medium', 'high'].includes(priority);
}

/**
 * Validate role
 */
export function isValidRole(role: string): role is 'editor' | 'viewer' {
  return ['editor', 'viewer'].includes(role);
}

/**
 * Validate deployment status
 */
export function isValidDeploymentStatus(status: string): status is 'active' | 'inactive' | 'error' {
  return ['active', 'inactive', 'error'].includes(status);
}

/**
 * Check if string contains email or username
 */
export function parseEmailOrUsername(input: string): { type: 'email' | 'username'; value: string } {
  if (input.includes('@') && isValidEmail(input)) {
    return { type: 'email', value: input.toLowerCase() };
  }
  return { type: 'username', value: input.toLowerCase() };
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Sanitize and validate todo text
 */
export function validateTodoText(text: string): { isValid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeText(text);

  if (!sanitized || sanitized.length === 0) {
    return { isValid: false, error: 'Todo text cannot be empty' };
  }

  if (sanitized.length > 500) {
    return { isValid: false, error: 'Todo text must be less than 500 characters' };
  }

  return { isValid: true, sanitized };
}

/**
 * Validate tech/package category
 */
export function isValidTechCategory(category: string): boolean {
  const validCategories = ['styling', 'database', 'framework', 'runtime', 'deployment', 'testing', 'tooling'];
  return validCategories.includes(category);
}

/**
 * Validate package category
 */
export function isValidPackageCategory(category: string): boolean {
  const validCategories = ['ui', 'state', 'routing', 'forms', 'animation', 'utility', 'api', 'auth', 'data'];
  return validCategories.includes(category);
}
