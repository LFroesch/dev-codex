import express, { Request, Response } from 'express';
import request from 'supertest';
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
} from '../middleware/validation';

describe('Validation Middleware', () => {
  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('should remove null bytes and control characters', () => {
      expect(sanitizeString('hello\x00world\x1f')).toBe('helloworld');
    });

    it('should remove XSS attempts', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('');
      expect(sanitizeString('hello<script>bad</script>world')).not.toContain('script');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should preserve normal text', () => {
      expect(sanitizeString('Hello World 123')).toBe('Hello World 123');
    });
  });

  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('test.user@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should accept strong passwords', () => {
      expect(isStrongPassword('StrongPass123!')).toBe(true);
      expect(isStrongPassword('MyP@ssw0rd123')).toBe(true);
      expect(isStrongPassword('Abcdef123!@$')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isStrongPassword('short')).toBe(false);
      expect(isStrongPassword('nouppercase123!')).toBe(false);
      expect(isStrongPassword('NOLOWERCASE123!')).toBe(false);
      expect(isStrongPassword('NoNumbers!')).toBe(false);
      expect(isStrongPassword('NoSpecial123')).toBe(false);
      expect(isStrongPassword('Short1!')).toBe(false); // Too short
    });
  });

  describe('isValidObjectId', () => {
    it('should accept valid MongoDB ObjectIds', () => {
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('123456789012345678901234')).toBe(true);
      expect(isValidObjectId('abcdefABCDEF012345678901')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(isValidObjectId('invalid')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd799439011xyz')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
    });
  });

  describe('validateUserRegistration middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', validateUserRegistration, (req: Request, res: Response) => {
        res.json({ success: true, body: req.body });
      });
    });

    it('should accept valid registration data', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!',
          firstName: 'John',
          lastName: 'Doe',
          theme: 'retro'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.body.email).toBe('test@example.com');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'notanemail',
          password: 'StrongPass123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid email');
    });

    it('should reject weak password', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 12 characters');
    });

    it('should reject names that are too long', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!',
          firstName: 'a'.repeat(51),
          lastName: 'Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('First name must be 1-50 characters');
    });

    it('should sanitize inputs', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'StrongPass123!',
          firstName: '  John  ',
          lastName: '  Doe  '
        });

      expect(response.status).toBe(200);
      expect(response.body.body.email).toBe('test@example.com');
      expect(response.body.body.firstName).toBe('John');
      expect(response.body.body.lastName).toBe('Doe');
    });

    it('should apply default theme if not provided', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(200);
      expect(response.body.body.theme).toBe('retro');
    });
  });

  describe('validateUserLogin middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', validateUserLogin, (req: Request, res: Response) => {
        res.json({ success: true, body: req.body });
      });
    });

    it('should accept valid login data', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'test@example.com',
          password: 'anypassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject missing email', async () => {
      const response = await request(app)
        .post('/test')
        .send({ password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject missing password', async () => {
      const response = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: 'notanemail',
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid email');
    });

    it('should sanitize and lowercase email', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          email: '  TEST@EXAMPLE.COM  ',
          password: 'password'
        });

      expect(response.status).toBe(200);
      expect(response.body.body.email).toBe('test@example.com');
    });
  });

  describe('validatePasswordReset middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/forgot-password', validatePasswordReset, (req: Request, res: Response) => {
        res.json({ success: true });
      });
      app.post('/reset-password', validatePasswordReset, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    describe('forgot password validation', () => {
      it('should accept valid email for forgot password', async () => {
        const response = await request(app)
          .post('/forgot-password')
          .send({ email: 'test@example.com' });

        expect(response.status).toBe(200);
      });

      it('should reject missing email for forgot password', async () => {
        const response = await request(app)
          .post('/forgot-password')
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Email is required');
      });

      it('should reject invalid email format for forgot password', async () => {
        const response = await request(app)
          .post('/forgot-password')
          .send({ email: 'notanemail' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid email');
      });
    });

    describe('reset password validation', () => {
      it('should accept valid token and password for reset', async () => {
        const response = await request(app)
          .post('/reset-password')
          .send({
            token: 'validtoken123',
            password: 'StrongPass123!'
          });

        expect(response.status).toBe(200);
      });

      it('should reject missing token for reset', async () => {
        const response = await request(app)
          .post('/reset-password')
          .send({ password: 'StrongPass123!' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Token and password are required');
      });

      it('should reject weak password for reset', async () => {
        const response = await request(app)
          .post('/reset-password')
          .send({
            token: 'validtoken123',
            password: 'weak'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Password must be at least 12 characters');
      });
    });
  });

  describe('validateObjectId middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.get('/test/:id', validateObjectId('id'), (req: Request, res: Response) => {
        res.json({ success: true, id: req.params.id });
      });
    });

    it('should accept valid ObjectId', async () => {
      const response = await request(app)
        .get('/test/507f1f77bcf86cd799439011');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid ObjectId', async () => {
      const response = await request(app)
        .get('/test/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid id format');
    });

    it('should reject empty parameter', async () => {
      const response = await request(app)
        .get('/test/');

      expect(response.status).toBe(404); // Route not found
    });
  });

  describe('validateProjectData middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', validateProjectData, (req: Request, res: Response) => {
        res.json({ success: true, body: req.body });
      });
      app.patch('/test', validateProjectData, (req: Request, res: Response) => {
        res.json({ success: true, body: req.body });
      });
    });

    describe('POST validation', () => {
      it('should accept valid project data', async () => {
        const response = await request(app)
          .post('/test')
          .send({
            name: 'Test Project',
            description: 'A test project',
            category: 'Development',
            tags: ['test', 'project']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should reject missing name on POST', async () => {
        const response = await request(app)
          .post('/test')
          .send({ description: 'A test project' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });

      it('should reject missing description on POST', async () => {
        const response = await request(app)
          .post('/test')
          .send({ name: 'Test Project' });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('required');
      });

      it('should reject name that is too long', async () => {
        const response = await request(app)
          .post('/test')
          .send({
            name: 'a'.repeat(101),
            description: 'Test'
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Project name must be 1-100 characters');
      });

      it('should reject description that is too long', async () => {
        const response = await request(app)
          .post('/test')
          .send({
            name: 'Test',
            description: 'a'.repeat(1001)
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('less than 1000 characters');
      });
    });

    describe('PATCH validation', () => {
      it('should allow partial updates', async () => {
        const response = await request(app)
          .patch('/test')
          .send({ name: 'Updated Name' });

        expect(response.status).toBe(200);
        expect(response.body.body.name).toBe('Updated Name');
      });
    });

    it('should sanitize inputs', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          name: '  Test Project  ',
          description: '  Description  ',
          category: '  Dev  '
        });

      expect(response.status).toBe(200);
      expect(response.body.body.name).toBe('Test Project');
      expect(response.body.body.description).toBe('Description');
      expect(response.body.body.category).toBe('Dev');
    });

    it('should limit tags to 10 items', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          name: 'Test',
          description: 'Test',
          tags: Array(15).fill('tag')
        });

      expect(response.status).toBe(200);
      expect(response.body.body.tags).toHaveLength(10);
    });

    it('should filter out invalid tags', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          name: 'Test',
          description: 'Test',
          tags: ['valid', '', 'a'.repeat(31), 'another']
        });

      expect(response.status).toBe(200);
      expect(response.body.body.tags).toEqual(['valid', 'another']);
    });
  });

  describe('sanitizeBody middleware', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', sanitizeBody, (req: Request, res: Response) => {
        res.json({ body: req.body });
      });
    });

    it('should sanitize all string fields in body', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          field1: '  test  ',
          field2: 'normal',
          field3: 123,
          nested: { value: '  nested  ' }
        });

      expect(response.status).toBe(200);
      expect(response.body.body.field1).toBe('test');
      expect(response.body.body.field2).toBe('normal');
      expect(response.body.body.field3).toBe(123);
    });

    it('should remove XSS attempts from all fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({
          field1: '<script>alert("xss")</script>',
          field2: 'normal text'
        });

      expect(response.status).toBe(200);
      expect(response.body.body.field1).not.toContain('script');
      expect(response.body.body.field2).toBe('normal text');
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/test')
        .send({});

      expect(response.status).toBe(200);
    });
  });
});
