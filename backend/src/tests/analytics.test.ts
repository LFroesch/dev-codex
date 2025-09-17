import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../routes/analytics';
import { User } from '../models/User';
import Analytics from '../models/Analytics';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock the requireAuth middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  }
}));

app.use('/api/analytics', analyticsRoutes);

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
        eventType: 'project_open',
        eventData: {
          page: '/dashboard',
          timestamp: new Date().toISOString(),
        }
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

  describe('GET /api/analytics/user/:userId', () => {
    it('should get user analytics data', async () => {
      const response = await request(app)
        .get(`/api/analytics/user/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/analytics/user/${userId}`)
        .expect(401);
    });
  });
});