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
 * Validate unified stack category
 */
export function isValidStackCategory(category: string): boolean {
  const validCategories = [
    // Core technologies
    'framework', 'runtime', 'database', 'styling', 'deployment', 'testing', 'tooling',
    // Frontend/UI specific
    'ui', 'state', 'routing', 'forms', 'animation',
    // Backend/API specific
    'api', 'auth',
    // Data/utility
    'data', 'utility'
  ];
  return validCategories.includes(category);
}

/**
 * Parse time in 12-hour (8:00PM) or 24-hour (21:00) format
 * @param timeStr - Time string
 * @returns Parsed hours and minutes or error
 */
function parseTime(timeStr: string): { isValid: boolean; error?: string; hours?: number; minutes?: number } {
  const trimmed = timeStr.trim();

  // Match 12-hour format with AM/PM (e.g., "8:00PM", "8:00 PM", "8PM")
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):?(\d{2})?\s?(AM|PM)$/i);
  if (twelveHourMatch) {
    let hours = parseInt(twelveHourMatch[1], 10);
    const minutes = twelveHourMatch[2] ? parseInt(twelveHourMatch[2], 10) : 0;
    const period = twelveHourMatch[3].toUpperCase();

    // Validate hours and minutes
    if (hours < 1 || hours > 12) {
      return { isValid: false, error: 'Hours in 12-hour format must be between 1 and 12' };
    }
    if (minutes < 0 || minutes > 59) {
      return { isValid: false, error: 'Minutes must be between 0 and 59' };
    }

    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return { isValid: true, hours, minutes };
  }

  // Match 24-hour format (e.g., "21:00", "9:30")
  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hours = parseInt(twentyFourHourMatch[1], 10);
    const minutes = parseInt(twentyFourHourMatch[2], 10);

    // Validate hours and minutes
    if (hours < 0 || hours > 23) {
      return { isValid: false, error: 'Hours in 24-hour format must be between 0 and 23' };
    }
    if (minutes < 0 || minutes > 59) {
      return { isValid: false, error: 'Minutes must be between 0 and 59' };
    }

    return { isValid: true, hours, minutes };
  }

  return {
    isValid: false,
    error: 'Invalid time format. Use 8:00PM or 21:00'
  };
}

/**
 * Format time in 12-hour format (e.g., "8:00 PM")
 * @param hours - Hours (0-23)
 * @param minutes - Minutes (0-59)
 * @returns Formatted time string
 */
export function formatTime12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Parse due date in MM-DD-YYYY or MM-DD format (defaults to current year)
 * Optionally accepts time in 8:00PM or 21:00 format
 * @param dateStr - Date string in MM-DD-YYYY or MM-DD format, optionally with time
 * @returns Parsed Date object or validation error
 */
export function parseDueDate(dateStr: string): { isValid: boolean; error?: string; date?: Date } {
  const trimmed = dateStr.trim();

  // Split on space to separate date and time (if present)
  const parts = trimmed.split(/\s+/);
  const datePart = parts[0];
  const timePart = parts.slice(1).join(' '); // Rejoin in case of "8:00 PM" format

  let month: number, day: number, year: number;

  // Match MM-DD-YYYY format (e.g., "12-25-2025" or "1-5-2025")
  const fullDateMatch = datePart.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (fullDateMatch) {
    month = parseInt(fullDateMatch[1], 10);
    day = parseInt(fullDateMatch[2], 10);
    year = parseInt(fullDateMatch[3], 10);
  } else {
    // Match MM-DD format (e.g., "12-25" or "1-5") - defaults to current year
    const shortDateMatch = datePart.match(/^(\d{1,2})-(\d{1,2})$/);
    if (shortDateMatch) {
      month = parseInt(shortDateMatch[1], 10);
      day = parseInt(shortDateMatch[2], 10);
      year = new Date().getFullYear();
    } else {
      return {
        isValid: false,
        error: 'Invalid date format. Use MM-DD-YYYY or MM-DD (e.g., "12-25-2025" or "12-25")'
      };
    }
  }

  // Validate month and day ranges
  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Month must be between 1 and 12' };
  }
  if (day < 1 || day > 31) {
    return { isValid: false, error: 'Day must be between 1 and 31' };
  }

  // Create date (month is 0-indexed in JS Date)
  let date = new Date(year, month - 1, day);

  // Check if the date is valid (e.g., Feb 30 would be invalid)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { isValid: false, error: 'Invalid date (e.g., Feb 30 does not exist)' };
  }

  // Parse time if provided
  if (timePart) {
    const timeResult = parseTime(timePart);
    if (!timeResult.isValid) {
      return { isValid: false, error: timeResult.error };
    }

    // Set time on the date
    date.setHours(timeResult.hours!, timeResult.minutes!, 0, 0);
  }

  return { isValid: true, date };
}

/**
 * Format a date with optional time in a friendly format
 * @param date - Date object
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string
 */
export function formatDueDate(date: Date, includeTime: boolean = true): string {
  const dateStr = date.toLocaleDateString();

  if (includeTime && (date.getHours() !== 0 || date.getMinutes() !== 0)) {
    const timeStr = formatTime12Hour(date.getHours(), date.getMinutes());
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
}
