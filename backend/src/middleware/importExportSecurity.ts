import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import { createRateLimit } from './rateLimit';

// Request size limits for import/export
export const REQUEST_SIZE_LIMITS = {
  IMPORT_MAX_SIZE: 10 * 1024 * 1024, // 10MB max for import
  EXPORT_MAX_SIZE: 100 * 1024 * 1024, // 100MB max for export response
  MAX_FIELD_LENGTH: 100000, // 100KB for individual fields
  MAX_ARRAY_LENGTH: 10000, // Maximum items in arrays
  MAX_NESTING_DEPTH: 20 // Maximum object nesting depth
};

// Rate limiting specifically for import/export operations
export const importExportRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10, // Max 10 import/export operations per hour
  endpoint: 'import_export',
  message: 'Too many import/export operations. Please try again in an hour.'
});

// Prototype pollution protection
export function sanitizeObject(obj: any, depth = 0): any {
  if (depth > REQUEST_SIZE_LIMITS.MAX_NESTING_DEPTH) {
    throw new Error('Object nesting depth exceeded maximum allowed');
  }
  
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length > REQUEST_SIZE_LIMITS.MAX_ARRAY_LENGTH) {
      throw new Error(`Array length ${obj.length} exceeds maximum allowed ${REQUEST_SIZE_LIMITS.MAX_ARRAY_LENGTH}`);
    }
    return obj.map(item => sanitizeObject(item, depth + 1));
  }

  const sanitized: any = {};
  
  for (const key in obj) {
    // Prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    
    // Validate key length
    if (key.length > 100) {
      throw new Error(`Object key length exceeds maximum allowed`);
    }
    
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key], depth + 1);
    }
  }
  
  return sanitized;
}

// Content sanitization for XSS prevention
export function sanitizeString(input: any): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Check string length
  if (input.length > REQUEST_SIZE_LIMITS.MAX_FIELD_LENGTH) {
    throw new Error(`String length ${input.length} exceeds maximum allowed ${REQUEST_SIZE_LIMITS.MAX_FIELD_LENGTH}`);
  }
  
  // Basic HTML sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  // Additional checks for common XSS patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /onmouseover=/i,
    /eval\(/i,
    /expression\(/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      return sanitized.replace(pattern, '');
    }
  }
  
  return sanitized;
}

// Validate import data structure
export function validateImportData(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import data: must be an object');
  }
  
  // Check required structure
  if (!data.project || typeof data.project !== 'object') {
    throw new Error('Invalid import data: missing or invalid project object');
  }
  
  const { project } = data;
  
  // Validate required fields
  if (!project.name || typeof project.name !== 'string') {
    throw new Error('Invalid import data: project name is required and must be a string');
  }
  
  if (!project.description || typeof project.description !== 'string') {
    throw new Error('Invalid import data: project description is required and must be a string');
  }
  
  // Validate optional arrays
  const arrayFields = ['notes', 'todos', 'devLog', 'components', 'selectedTechnologies', 'selectedPackages', 'tags'];
  
  for (const field of arrayFields) {
    if (project[field] !== undefined && !Array.isArray(project[field])) {
      throw new Error(`Invalid import data: project.${field} must be an array if provided`);
    }
    
    if (Array.isArray(project[field]) && project[field].length > REQUEST_SIZE_LIMITS.MAX_ARRAY_LENGTH) {
      throw new Error(`Invalid import data: project.${field} array too large (max ${REQUEST_SIZE_LIMITS.MAX_ARRAY_LENGTH} items)`);
    }
  }
}

// File type validation for export
export function validateExportFormat(format: string): boolean {
  const allowedFormats = ['json'];
  return allowedFormats.includes(format.toLowerCase());
}

// Request size middleware for import
export function importSizeLimit(req: Request, res: Response, next: NextFunction): void {
  const contentLength = req.get('content-length');
  
  if (contentLength && parseInt(contentLength) > REQUEST_SIZE_LIMITS.IMPORT_MAX_SIZE) {
    res.status(413).json({
      error: 'Payload too large',
      message: `Request size ${contentLength} bytes exceeds maximum allowed ${REQUEST_SIZE_LIMITS.IMPORT_MAX_SIZE} bytes`,
      maxSize: REQUEST_SIZE_LIMITS.IMPORT_MAX_SIZE
    });
    return;
  }
  
  next();
}

// Enhanced input validation middleware
export function validateAndSanitizeImport(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check if body exists
    if (!req.body) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is required'
      });
      return;
    }
    
    // Validate basic structure first
    validateImportData(req.body);
    
    // Sanitize the entire object to prevent prototype pollution
    req.body = sanitizeObject(req.body);
    
    // Additional sanitization for string fields
    if (req.body.project) {
      const project = req.body.project;
      
      // Sanitize basic string fields
      if (project.name) project.name = sanitizeString(project.name);
      if (project.description) project.description = sanitizeString(project.description);
      if (project.category) project.category = sanitizeString(project.category);
      
      // Sanitize arrays of objects with string fields
      if (Array.isArray(project.notes)) {
        project.notes = project.notes.map((note: any) => ({
          ...note,
          title: note.title ? sanitizeString(note.title) : '',
          description: note.description ? sanitizeString(note.description) : '',
          content: note.content ? sanitizeString(note.content) : ''
        }));
      }
      
      if (Array.isArray(project.todos)) {
        project.todos = project.todos.map((todo: any) => ({
          ...todo,
          text: todo.text ? sanitizeString(todo.text) : '',
          description: todo.description ? sanitizeString(todo.description) : ''
        }));
      }
      
      if (Array.isArray(project.devLog)) {
        project.devLog = project.devLog.map((log: any) => ({
          ...log,
          title: log.title ? sanitizeString(log.title) : '',
          description: log.description ? sanitizeString(log.description) : '',
          entry: log.entry ? sanitizeString(log.entry) : ''
        }));
      }
      
      if (Array.isArray(project.components)) {
        project.components = project.components.map((component: any) => ({
          ...component,
          title: component.title ? sanitizeString(component.title) : '',
          content: component.content ? sanitizeString(component.content) : ''
        }));
      }
      
      if (Array.isArray(project.tags)) {
        project.tags = project.tags.map((tag: any) => sanitizeString(tag)).filter(Boolean);
      }
    }
    
    next();
  } catch (error: any) {
    console.error('Import validation/sanitization error:', error);
    res.status(400).json({
      error: 'Invalid import data',
      message: error.message || 'Failed to validate import data'
    });
    return;
  }
}

// Export validation middleware
export function validateExportRequest(req: Request, res: Response, next: NextFunction): void {
  try {
    // Validate format parameter if provided
    const format = req.query.format as string || 'json';
    
    if (!validateExportFormat(format)) {
      res.status(400).json({
        error: 'Invalid export format',
        message: 'Only JSON format is currently supported',
        allowedFormats: ['json']
      });
      return;
    }
    
    req.query.format = format;
    next();
  } catch (error: any) {
    console.error('Export validation error:', error);
    res.status(400).json({
      error: 'Export validation failed',
      message: error.message || 'Failed to validate export request'
    });
    return;
  }
}

// Security headers middleware for import/export
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of import/export responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    // Prevent content type sniffing
    'X-Content-Type-Options': 'nosniff',
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    // Frame protection
    'X-Frame-Options': 'DENY',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  
  next();
}