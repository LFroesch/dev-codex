import request from 'supertest';
import mongoose from 'mongoose';
import healthRoutes from '../routes/health';
import { createTestApp } from './utils';

const app = createTestApp({ '/api': healthRoutes });

describe('Health Check Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('environment');
      expect(typeof response.body.uptime).toBe('number');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should include environment info', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(['development', 'test', 'production']).toContain(response.body.environment);
    });
  });

  describe('GET /api/ready', () => {
    it('should return ready status when database is connected', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database', 'connected');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should verify database connectivity', async () => {
      // Database should be connected in test environment
      expect(mongoose.connection.readyState).toBe(1);

      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      expect(response.body.database).toBe('connected');
    });

    it('should include uptime in response', async () => {
      const response = await request(app)
        .get('/api/ready')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/live', () => {
    it('should return alive status', async () => {
      const response = await request(app)
        .get('/api/live')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/api/live')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(isNaN(timestamp.getTime())).toBe(false);
    });

    it('should always succeed when server is running', async () => {
      // Call multiple times to ensure consistency
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .get('/api/live')
          .expect(200);

        expect(response.body.status).toBe('alive');
      }
    });
  });

  describe('Health Check Integration', () => {
    it('should have consistent timestamps across health endpoints', async () => {
      const healthResponse = await request(app).get('/api/health');
      const readyResponse = await request(app).get('/api/ready');
      const liveResponse = await request(app).get('/api/live');

      // All timestamps should be valid and recent (within last minute)
      const now = Date.now();
      const healthTime = new Date(healthResponse.body.timestamp).getTime();
      const readyTime = new Date(readyResponse.body.timestamp).getTime();
      const liveTime = new Date(liveResponse.body.timestamp).getTime();

      expect(now - healthTime).toBeLessThan(60000);
      expect(now - readyTime).toBeLessThan(60000);
      expect(now - liveTime).toBeLessThan(60000);
    });

    it('should have consistent uptime values', async () => {
      const healthResponse = await request(app).get('/api/health');
      const readyResponse = await request(app).get('/api/ready');

      // Uptime values should be similar (within 1 second)
      expect(Math.abs(healthResponse.body.uptime - readyResponse.body.uptime)).toBeLessThan(1);
    });
  });
});
