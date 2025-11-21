import { Request, Response, NextFunction } from 'express';
import {
  sanitizeString,
  isValidEmail,
  isStrongPassword,
  isValidObjectId,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validateObjectId,
  validateProjectData,
  sanitizeBody
} from '../../middleware/validation';
import * as logger from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn()
}));

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      method: 'POST'
    } as Partial<Request>;
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('Helper Functions', () => {
    describe('sanitizeString', () => {
      it('should trim whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
      });

      it('should remove null bytes', () => {
        expect(sanitizeString('hello\x00world')).toBe('helloworld');
      });

      it('should remove control characters', () => {
        expect(sanitizeString('hello\x01\x1fworld')).toBe('helloworld');
      });

      it('should remove HTML tags', () => {
        expect(sanitizeString('<script>alert("xss")</script>hello')).toBe('hello');
      });

      it('should return empty string for non-string input', () => {
        expect(sanitizeString(123)).toBe('');
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString({})).toBe('');
      });

      it('should handle empty strings', () => {
        expect(sanitizeString('')).toBe('');
      });
    });

    describe('isValidEmail', () => {
      it('should accept valid email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('user+tag@example.com')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(isValidEmail('notanemail')).toBe(false);
        expect(isValidEmail('missing@domain')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail('no@.com')).toBe(false);
        expect(isValidEmail('spaces in@email.com')).toBe(false);
      });

      it('should handle case insensitivity', () => {
        expect(isValidEmail('TEST@EXAMPLE.COM')).toBe(true);
        expect(isValidEmail('Test@Example.Com')).toBe(true);
      });
    });

    describe('isStrongPassword', () => {
      it('should accept strong passwords', () => {
        expect(isStrongPassword('MyPassw0rd!@')).toBe(true);
        expect(isStrongPassword('AnotherP@ssw0rd1234')).toBe(true);
        expect(isStrongPassword('Str0ngP@ssword!!')).toBe(true);
      });

      it('should reject passwords without uppercase', () => {
        expect(isStrongPassword('mypassw0rd!@#')).toBe(false);
      });

      it('should reject passwords without lowercase', () => {
        expect(isStrongPassword('MYPASSW0RD!@#')).toBe(false);
      });

      it('should reject passwords without numbers', () => {
        expect(isStrongPassword('MyPassword!@#')).toBe(false);
      });

      it('should reject passwords without special characters', () => {
        expect(isStrongPassword('MyPassw0rd123')).toBe(false);
      });

      it('should reject passwords shorter than 12 characters', () => {
        expect(isStrongPassword('MyP@ssw0rd')).toBe(false);
      });
    });

    describe('isValidObjectId', () => {
      it('should accept valid MongoDB ObjectIds', () => {
        expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
        expect(isValidObjectId('60d5f484b3e8a50015e2e6c7')).toBe(true);
      });

      it('should reject invalid ObjectIds', () => {
        expect(isValidObjectId('invalid')).toBe(false);
        expect(isValidObjectId('12345')).toBe(false);
        expect(isValidObjectId('507f1f77bcf86cd799439011XX')).toBe(false);
        expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      });
    });
  });

  describe('validateUserRegistration', () => {
    it('should accept valid registration data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'MyStr0ngP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject missing email', () => {
      mockReq.body = {
        password: 'MyStrong Password you know1!',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Email, password, first name, and last name are required'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject missing password', () => {
      mockReq.body = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', () => {
      mockReq.body = {
        email: 'notanemail',
        password: 'MyStr0ngP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid email format' });
    });

    it('should reject weak passwords', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Password must be at least 12 characters long and contain uppercase, lowercase, number, and special character (@$!%*?&)'
      });
    });

    it('should reject firstName that is too long', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'MyStr0ngP@ssw0rd!',
        firstName: 'a'.repeat(51),
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'First name must be 1-50 characters' });
    });

    it('should sanitize and lowercase email', () => {
      mockReq.body = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'MyStr0ngP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.email).toBe('test@example.com');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set default theme to retro', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'MyStr0ngP@ssw0rd!',
        firstName: 'John',
        lastName: 'Doe'
      };

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.theme).toBe('retro');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', () => {
      // Force an error by making body a getter that throws
      Object.defineProperty(mockReq, 'body', {
        get: () => { throw new Error('Test error'); }
      });

      validateUserRegistration(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Validation error' });
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('validateUserLogin', () => {
    it('should accept valid login data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject missing email', () => {
      mockReq.body = {
        password: 'password'
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and password are required' });
    });

    it('should reject missing password', () => {
      mockReq.body = {
        email: 'test@example.com'
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject invalid email format', () => {
      mockReq.body = {
        email: 'notanemail',
        password: 'password'
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid email format' });
    });

    it('should sanitize and lowercase email', () => {
      mockReq.body = {
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password'
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.email).toBe('test@example.com');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject non-string passwords', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 123
      };

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    it('should handle validation errors gracefully', () => {
      Object.defineProperty(mockReq, 'body', {
        get: () => { throw new Error('Test error'); }
      });

      validateUserLogin(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('validatePasswordReset', () => {
    it('should accept valid forgot-password request', () => {
      const reqWithPath = { ...mockReq, path: '/forgot-password', body: { email: 'test@example.com' } };

      validatePasswordReset(reqWithPath as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid reset-password request', () => {
      const reqWithPath = {
        ...mockReq,
        path: '/reset-password',
        body: {
          token: 'validtoken123',
          password: 'MyStr0ngP@ssw0rd!'
        }
      };

      validatePasswordReset(reqWithPath as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject forgot-password without email', () => {
      const reqWithPath = { ...mockReq, path: '/forgot-password', body: {} };

      validatePasswordReset(reqWithPath as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email is required' });
    });

    it('should reject reset-password without token', () => {
      const reqWithPath = {
        ...mockReq,
        path: '/reset-password',
        body: {
          password: 'MyStr0ngP@ssw0rd!'
        }
      };

      validatePasswordReset(reqWithPath as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token and password are required' });
    });

    it('should reject weak password in reset', () => {
      const reqWithPath = {
        ...mockReq,
        path: '/reset-password',
        body: {
          token: 'validtoken123',
          password: 'weak'
        }
      };

      validatePasswordReset(reqWithPath as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle validation errors gracefully', () => {
      Object.defineProperty(mockReq, 'body', {
        get: () => { throw new Error('Test error'); }
      });

      validatePasswordReset(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('validateObjectId', () => {
    it('should accept valid ObjectId', () => {
      mockReq.params = { id: '507f1f77bcf86cd799439011' };

      validateObjectId()(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid ObjectId', () => {
      mockReq.params = { id: 'invalid' };

      validateObjectId()(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid id format' });
    });

    it('should reject missing ObjectId', () => {
      mockReq.params = {};

      validateObjectId()(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'id parameter is required' });
    });

    it('should work with custom parameter names', () => {
      mockReq.params = { projectId: '507f1f77bcf86cd799439011' };

      validateObjectId('projectId')(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', () => {
      Object.defineProperty(mockReq, 'params', {
        get: () => { throw new Error('Test error'); }
      });

      validateObjectId()(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('validateProjectData', () => {
    it('should accept valid project creation data', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'My Project',
        description: 'A great project',
        category: 'Web Development',
        tags: ['javascript', 'react']
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject POST without name', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        description: 'A project'
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project name and description are required' });
    });

    it('should accept PUT without all fields', () => {
      mockReq.method = 'PUT';
      mockReq.body = {
        name: 'Updated Name'
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject name that is too long', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'a'.repeat(31),
        description: 'A project'
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project name must be 1-30 characters' });
    });

    it('should reject description that is too long', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'My Project',
        description: 'a'.repeat(1001)
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project description must be less than 1000 characters' });
    });

    it('should sanitize tags and limit to 10', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'My Project',
        description: 'A project',
        tags: Array(15).fill('tag')
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.tags.length).toBeLessThanOrEqual(10);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should filter out tags that are too long', () => {
      mockReq.method = 'POST';
      mockReq.body = {
        name: 'My Project',
        description: 'A project',
        tags: ['short', 'a'.repeat(31)]
      };

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.tags).toEqual(['short']);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', () => {
      Object.defineProperty(mockReq, 'body', {
        get: () => { throw new Error('Test error'); }
      });

      validateProjectData(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(logger.logError).toHaveBeenCalled();
    });
  });

  describe('sanitizeBody', () => {
    it('should sanitize all string fields in body', () => {
      mockReq.body = {
        field1: '  value1  ',
        field2: '<script>alert("xss")</script>value2',
        field3: 123,
        field4: { nested: 'value' }
      };

      sanitizeBody(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockReq.body.field1).toBe('value1');
      expect(mockReq.body.field2).toBe('value2');
      expect(mockReq.body.field3).toBe(123);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle empty body', () => {
      mockReq.body = {};

      sanitizeBody(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle null body', () => {
      mockReq.body = null as any;

      sanitizeBody(mockReq as Request, mockRes as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle sanitization errors gracefully', () => {
      Object.defineProperty(mockReq, 'body', {
        get: () => { throw new Error('Test error'); }
      });

      sanitizeBody(mockReq as Request, mockRes as Response, nextFunction);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Input sanitization error' });
      expect(logger.logError).toHaveBeenCalled();
    });
  });
});
