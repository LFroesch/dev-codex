import request from 'supertest';
import analyticsRoutes from '../routes/analytics';
import { User } from '../models/User';
import Analytics from '../models/Analytics';
import { createTestApp, createAuthenticatedUser } from './utils';

const app = createTestApp({ '/api/analytics': analyticsRoutes });

beforeEach(async () => {
  await User.deleteMany({});
  await Analytics.deleteMany({});
});

describe('Analytics Routes', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createAuthenticatedUser(app);
    userToken = user.authToken;
    userId = user.userId;
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