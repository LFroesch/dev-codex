import request from 'supertest';
import express from 'express';
import RateLimit from '../models/RateLimit';
import authRoutes from '../routes/auth';
import { User } from '../models/User';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await RateLimit.deleteMany({});
    await User.deleteMany({});
  });

  afterAll(async () => {
    await RateLimit.deleteMany({});
    await User.deleteMany({});
  });

  describe('Auth rate limiting', () => {
    it('should block requests after exceeding auth rate limit', async () => {
      // Auth rate limit is 20 requests per 15 minutes in test environment
      const maxRequests = 20;
      let blockedAt = -1;

      // Make requests until we hit the rate limit
      for (let i = 0; i < maxRequests + 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });

        if (res.status === 429) {
          blockedAt = i + 1; // +1 because i starts at 0
          expect(res.body.error).toBe('Rate limit exceeded');
          expect(res.body.retryAfter).toBeDefined();
          expect(res.headers['x-ratelimit-limit']).toBe(maxRequests.toString());
          expect(res.headers['x-ratelimit-remaining']).toBe('0');
          expect(res.headers['retry-after']).toBeDefined();
          break;
        }
      }

      // Verify we were blocked at or near the expected limit
      expect(blockedAt).toBeGreaterThan(0);
      expect(blockedAt).toBeLessThanOrEqual(maxRequests + 1); // Allow 1 request buffer for timing
    });

    it('should track rate limit attempts in database', async () => {
      // Make a few requests
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'wrong' });
      }

      const rateLimits = await RateLimit.find({ endpoint: 'auth' });
      expect(rateLimits.length).toBeGreaterThan(0);

      // Should have a record for this IP
      const ipRateLimit = rateLimits[0];
      expect(ipRateLimit.count).toBeGreaterThan(0);
      expect(ipRateLimit.count).toBeLessThanOrEqual(5);
      expect(ipRateLimit.type).toBe('ip');
    });

    it('should include rate limit headers in responses', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Password reset rate limiting', () => {
    it('should block password reset requests after exceeding limit', async () => {
      // Password reset rate limit is 3 requests per 15 minutes
      const maxRequests = 3;

      // Make requests until we hit the limit
      let blockedAt = -1;
      for (let i = 0; i < maxRequests + 2; i++) {
        const res = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@test.com' });

        if (res.status === 429) {
          blockedAt = i + 1;
          expect(res.body.message).toContain('Too many password reset attempts');
          break;
        }
      }

      // Verify we were blocked
      expect(blockedAt).toBeGreaterThan(0);
      expect(blockedAt).toBeLessThanOrEqual(maxRequests + 1);
    });
  });

  describe('Registration rate limiting', () => {
    it('should block registration attempts after exceeding auth rate limit', async () => {
      // Registration uses authRateLimit (20 requests per 15 minutes)
      const maxRequests = 20;
      let blockedAt = -1;

      for (let i = 0; i < maxRequests + 5; i++) {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: `test${i}@test.com`,
            password: 'TestPassword123!',
            firstName: 'Test',
            lastName: 'User',
            username: `testuser${i}`
          });

        if (res.status === 429) {
          blockedAt = i + 1;
          expect(res.body.error).toBe('Rate limit exceeded');
          break;
        }
      }

      expect(blockedAt).toBeGreaterThan(0);
      expect(blockedAt).toBeLessThanOrEqual(maxRequests + 1);
    });
  });

  describe('Rate limit reset', () => {
    it('should reset rate limit after window expires', async () => {
      // Create a rate limit record that's expired
      const pastTime = new Date(Date.now() - 20 * 60 * 1000); // 20 minutes ago

      await RateLimit.create({
        identifier: '::ffff:127.0.0.1', // Typical localhost IP in IPv6 format
        type: 'ip',
        endpoint: 'auth',
        count: 100, // Way over the limit
        windowStart: pastTime,
        windowDurationMs: 15 * 60 * 1000
      });

      // Try to login - should work because the window has expired
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      // Should NOT be rate limited (not 429)
      expect(res.status).not.toBe(429);
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('Rate limit per IP', () => {
    it('should track rate limits per IP address', async () => {
      // Make request
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });

      const rateLimits = await RateLimit.find({ endpoint: 'auth' });
      expect(rateLimits.length).toBeGreaterThan(0);

      // Should be tracking by IP
      expect(rateLimits[0].type).toBe('ip');
      expect(rateLimits[0].identifier).toBeDefined();
    });
  });
});
