/**
 * Form validation utilities
 */

/**
 * Validate that a field is not empty
 * @throws Error if validation fails
 * @returns Trimmed value if valid
 */
export const validateRequired = (value: string, fieldName = 'Field'): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required`);
  }
  return trimmed;
};

/**
 * Validate email format
 * @throws Error if validation fails
 * @returns Trimmed email if valid
 */
export const validateEmail = (email: string): string => {
  const trimmed = validateRequired(email, 'Email');
  if (!/\S+@\S+\.\S+/.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  return trimmed;
};

/**
 * Validate minimum length
 * @throws Error if validation fails
 * @returns Trimmed value if valid
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName = 'Field'
): string => {
  const trimmed = validateRequired(value, fieldName);
  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  return trimmed;
};

/**
 * Validate maximum length
 * @throws Error if validation fails
 * @returns Trimmed value if valid
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName = 'Field'
): string => {
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
  return trimmed;
};

/**
 * Simple non-throwing validation check for required fields
 */
export const isValidRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

/**
 * Simple non-throwing validation check for email
 */
export const isValidEmail = (email: string): boolean => {
  return /\S+@\S+\.\S+/.test(email.trim());
};
