import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Strong password regex (8+ chars, uppercase, lowercase, number, special char)
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// MongoDB ObjectId validation
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

// Sanitize string input
export function sanitizeString(input: any): string {
  if (typeof input !== 'string') return '';
  
  // Basic sanitization and trimming
  let sanitized = input.trim();
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
  
  // Use DOMPurify for XSS protection
  sanitized = DOMPurify.sanitize(sanitized, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [] 
  });
  
  return sanitized;
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return emailRegex.test(email.toLowerCase());
}

// Validate password strength
export function isStrongPassword(password: string): boolean {
  return strongPasswordRegex.test(password);
}

// Validate MongoDB ObjectId
export function isValidObjectId(id: string): boolean {
  return objectIdRegex.test(id);
}

// Validate and sanitize user registration data
export const validateUserRegistration = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, theme } = req.body;
    
    // Required fields validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        message: 'Email, password, first name, and last name are required' 
      });
    }
    
    // Sanitize string inputs
    req.body.email = sanitizeString(email).toLowerCase();
    req.body.firstName = sanitizeString(firstName);
    req.body.lastName = sanitizeString(lastName);
    req.body.theme = theme ? sanitizeString(theme) : 'retro';
    
    // Email format validation
    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Password strength validation
    if (!isStrongPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' 
      });
    }
    
    // Length validations
    if (req.body.firstName.length < 1 || req.body.firstName.length > 50) {
      return res.status(400).json({ message: 'First name must be 1-50 characters' });
    }
    
    if (req.body.lastName.length < 1 || req.body.lastName.length > 50) {
      return res.status(400).json({ message: 'Last name must be 1-50 characters' });
    }
    
    next();
  } catch (error) {
    console.error('Registration validation error:', error);
    res.status(500).json({ message: 'Validation error' });
  }
};

// Validate user login data
export const validateUserLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    
    // Required fields validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Sanitize email input
    req.body.email = sanitizeString(email).toLowerCase();
    
    // Email format validation
    if (!isValidEmail(req.body.email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Basic password validation (don't reveal requirements on login)
    if (typeof password !== 'string' || password.length < 1) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    next();
  } catch (error) {
    console.error('Login validation error:', error);
    res.status(500).json({ message: 'Validation error' });
  }
};

// Validate password reset request
export const validatePasswordReset = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, token, password } = req.body;
    
    if (req.path === '/forgot-password') {
      // Forgot password validation
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }
      
      req.body.email = sanitizeString(email).toLowerCase();
      
      if (!isValidEmail(req.body.email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
    } else if (req.path === '/reset-password') {
      // Reset password validation
      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }
      
      req.body.token = sanitizeString(token);
      
      if (!isStrongPassword(password)) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' 
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Password reset validation error:', error);
    res.status(500).json({ message: 'Validation error' });
  }
};

// Validate MongoDB ObjectId parameters
export const validateObjectId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName];
      
      if (!id) {
        return res.status(400).json({ message: `${paramName} parameter is required` });
      }
      
      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: `Invalid ${paramName} format` });
      }
      
      next();
    } catch (error) {
      console.error('ObjectId validation error:', error);
      res.status(500).json({ message: 'Validation error' });
    }
  };
};

// Validate project creation/update data
export const validateProjectData = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, category, tags } = req.body;
    
    if (req.method === 'POST' && (!name || !description)) {
      return res.status(400).json({ message: 'Project name and description are required' });
    }
    
    if (name) {
      req.body.name = sanitizeString(name);
      if (req.body.name.length < 1 || req.body.name.length > 100) {
        return res.status(400).json({ message: 'Project name must be 1-100 characters' });
      }
    }
    
    if (description) {
      req.body.description = sanitizeString(description);
      if (req.body.description.length > 1000) {
        return res.status(400).json({ message: 'Project description must be less than 1000 characters' });
      }
    }
    
    if (category) {
      req.body.category = sanitizeString(category);
      if (req.body.category.length > 50) {
        return res.status(400).json({ message: 'Category must be less than 50 characters' });
      }
    }
    
    if (tags && Array.isArray(tags)) {
      req.body.tags = tags
        .map((tag: any) => sanitizeString(tag))
        .filter((tag: string) => tag.length > 0 && tag.length <= 30)
        .slice(0, 10); // Limit to 10 tags
    }
    
    next();
  } catch (error) {
    console.error('Project validation error:', error);
    res.status(500).json({ message: 'Validation error' });
  }
};

// Generic input sanitization middleware
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = sanitizeString(req.body[key]);
        }
      }
    }
    next();
  } catch (error) {
    console.error('Body sanitization error:', error);
    res.status(500).json({ message: 'Input sanitization error' });
  }
};