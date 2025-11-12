import request from 'supertest';
import adminRoutes from '../routes/admin';
import { User } from '../models/User';
import { createTestApp, createAuthenticatedAdmin, createAuthenticatedUser, generateAuthToken } from './utils';

const app = createTestApp({ '/api/admin': adminRoutes });

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Admin Routes', () => {
  let adminToken: string;
  let userId: string;

  beforeEach(async () => {
    const admin = await createAuthenticatedAdmin(app);
    adminToken = admin.authToken;
    userId = admin.userId;
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });

  describe('Admin Authentication', () => {
    it('should require admin role', async () => {
      const regularUser = await createAuthenticatedUser(app, {
        email: 'user@example.com',
        username: 'regularuser'
      });

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUser.authToken}`)
        .expect(403);
    });
  });
});