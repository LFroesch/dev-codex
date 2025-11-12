import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  sanitizeCommand,
  validateCommandFormat,
  logCommandExecution,
  terminalExecuteSecurity
} from '../middleware/commandSecurity';
import { AuthRequest } from '../middleware/auth';

describe('Command Security Middleware', () => {
  describe('validateCommandFormat', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', (req: AuthRequest, res: Response, next) => {
        req.userId = 'test-user-id';
        next();
      }, validateCommandFormat, (req: Request, res: Response) => {
        res.json({ success: true, command: req.body.command });
      });
    });

    it('should accept valid commands starting with /', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/help' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.command).toBe('/help');
    });

    it('should accept commands with arguments', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/create project MyProject' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject missing command', async () => {
      const response = await request(app)
        .post('/test')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Command is required');
    });

    it('should reject non-string commands', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: 123 });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Command must be a string');
    });

    it('should reject commands not starting with /', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: 'help' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Commands must start with /');
      expect(response.body.suggestions).toContain('/help');
    });

    it('should handle whitespace before command', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '  /help  ' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('sanitizeCommand', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', (req: AuthRequest, res: Response, next) => {
        req.userId = 'test-user-id';
        next();
      }, sanitizeCommand, (req: Request, res: Response) => {
        res.json({ success: true, command: req.body.command });
      });
    });

    it('should allow normal commands', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/list projects' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject commands with script tags', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test <script>alert("xss")</script>' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Invalid command format');
    });

    it('should reject commands with javascript: protocol', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test javascript:alert(1)' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Invalid command format');
    });

    it('should reject commands with event handlers', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test onclick=alert(1)' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with eval', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test eval("code")' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with exec', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test exec("code")' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with require', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test require("fs")' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with process', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test process.exit()' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with __proto__', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test __proto__' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands with constructor', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test constructor[prototype]' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands that are too long', async () => {
      const longCommand = '/test ' + 'a'.repeat(500);

      const response = await request(app)
        .post('/test')
        .send({ command: longCommand });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
      expect(response.body.message).toContain('Command too long');
    });

    it('should trim whitespace from commands', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '  /help  ' });

      expect(response.status).toBe(200);
      expect(response.body.command).toBe('/help');
    });

    it('should handle missing command gracefully', async () => {
      const response = await request(app)
        .post('/test')
        .send({});

      expect(response.status).toBe(200); // Should continue if no command
    });

    it('should handle non-string command types gracefully', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: 123 });

      expect(response.status).toBe(200); // Should continue if not a string
    });
  });

  describe('logCommandExecution', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', (req: AuthRequest, res: Response, next) => {
        req.userId = 'test-user-id';
        next();
      }, logCommandExecution, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should log command execution and continue', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/help' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle missing command', async () => {
      const response = await request(app)
        .post('/test')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should truncate long commands in logs', async () => {
      const longCommand = '/test ' + 'a'.repeat(200);

      const response = await request(app)
        .post('/test')
        .send({ command: longCommand });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('terminalExecuteSecurity (combined middleware)', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/terminal/execute', (req: AuthRequest, res: Response, next) => {
        req.userId = 'test-user-id';
        next();
      }, ...terminalExecuteSecurity, (req: Request, res: Response) => {
        res.json({ success: true, command: req.body.command });
      });
    });

    it('should allow valid commands through all security layers', async () => {
      const response = await request(app)
        .post('/terminal/execute')
        .send({ command: '/help' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject commands failing format validation', async () => {
      const response = await request(app)
        .post('/terminal/execute')
        .send({ command: 'help' }); // Missing /

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should reject commands failing sanitization', async () => {
      const response = await request(app)
        .post('/terminal/execute')
        .send({ command: '/<script>alert(1)</script>' });

      expect(response.status).toBe(400);
      expect(response.body.type).toBe('error');
    });

    it('should apply rate limiting', async () => {
      // Make many requests rapidly
      const requests = [];
      for (let i = 0; i < 25; i++) {
        requests.push(
          request(app)
            .post('/terminal/execute')
            .send({ command: `/test ${i}` })
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should sanitize and log valid commands', async () => {
      const response = await request(app)
        .post('/terminal/execute')
        .send({ command: '  /list projects  ' });

      // Could be 200 (success) or 429 (rate limited from previous test)
      expect([200, 429]).toContain(response.status);
      if (response.status === 200) {
        expect(response.body.command).toBe('/list projects');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should have stricter limits for command execution', async () => {
      const app = express();
      app.use(express.json());
      app.post('/terminal/execute', (req: AuthRequest, res: Response, next) => {
        req.userId = 'rate-limit-test-user';
        next();
      }, ...terminalExecuteSecurity, (req: Request, res: Response) => {
        res.json({ success: true });
      });

      // Make 21 requests (limit is 20)
      const requests = [];
      for (let i = 0; i < 21; i++) {
        requests.push(
          request(app)
            .post('/terminal/execute')
            .send({ command: '/test' })
        );
      }

      const responses = await Promise.all(requests);
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should have some rate-limited requests
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(successful.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Edge Cases', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', (req: AuthRequest, res: Response, next) => {
        req.userId = 'test-user-id';
        next();
      }, validateCommandFormat, sanitizeCommand, (req: Request, res: Response) => {
        res.json({ success: true, command: req.body.command });
      });
    });

    it('should handle empty string command', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '' });

      // Could be 400 (validation error) or 429 (rate limited)
      expect([400, 429]).toContain(response.status);
      if (response.status === 400) {
        // Empty string is caught as missing command or invalid format
        expect(response.body.message).toMatch(/Command is required|Commands must start with/);
      }
    });

    it('should handle command with only whitespace', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Commands must start with /');
    });

    it('should handle unicode characters', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/test 你好 🎉' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle special characters in command arguments', async () => {
      const response = await request(app)
        .post('/test')
        .send({ command: '/create "Project Name" --tag=urgent' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
