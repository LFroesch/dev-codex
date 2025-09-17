import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import analyticsRoutes from '../routes/analytics';
import User from '../models/User';
import Analytics from '../models/Analytics';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Analytics.deleteMany({});
});

describe('Analytics Routes', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'hashedpassword',
    });
    await user.save();
    userId = user._id.toString();

    userToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/analytics/track', () => {
    it('should track analytics event', async () => {
      const eventData = {
        event: 'page_view',
        page: '/dashboard',
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/analytics/track')
        .set('Authorization', `Bearer ${userToken}`)
        .send(eventData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const eventData = {
        event: 'page_view',
        page: '/dashboard',
      };

      await request(app)
        .post('/api/analytics/track')
        .send(eventData)
        .expect(401);
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should get analytics dashboard data', async () => {
      // Create some analytics data
      await Analytics.create({
        userId: userId,
        event: 'page_view',
        timestamp: new Date(),
        metadata: { page: '/dashboard' },
      });

      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('pageViews');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/analytics/dashboard')
        .expect(401);
    });
  });
});