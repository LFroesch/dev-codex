// Mock email service
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined)
}));

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

  describe('GET /api/admin/users/:id', () => {
    it('should get specific user details', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      const response = await request(app)
        .get(`/api/admin/users/${testUser.userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.email).toBe('test@example.com');
      expect(response.body.projectCount).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/admin/users/:id/plan', () => {
    it('should update user plan tier', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      const response = await request(app)
        .put(`/api/admin/users/${testUser.userId}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planTier: 'pro' })
        .expect(200);

      expect(response.body.planTier).toBe('pro');
      expect(response.body.email).toBe('test@example.com');
    });

    it('should reject invalid plan tier', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      await request(app)
        .put(`/api/admin/users/${testUser.userId}/plan`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ planTier: 'invalid' })
        .expect(400);
    });
  });

  describe('POST /api/admin/users/:id/ban', () => {
    it('should ban a user', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      const response = await request(app)
        .post(`/api/admin/users/${testUser.userId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Violation of terms' })
        .expect(200);

      expect(response.body.message).toContain('banned');
    });

    it('should require a reason for banning', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      await request(app)
        .post(`/api/admin/users/${testUser.userId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/admin/users/:id/unban', () => {
    it('should unban a user', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      // First ban the user
      await request(app)
        .post(`/api/admin/users/${testUser.userId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test ban' });

      // Then unban
      const response = await request(app)
        .post(`/api/admin/users/${testUser.userId}/unban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('unbanned');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user', async () => {
      const testUser = await createAuthenticatedUser(app, {
        email: 'test@example.com',
        username: 'testuser'
      });

      const response = await request(app)
        .delete(`/api/admin/users/${testUser.userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');

      // Verify user is actually deleted
      const user = await User.findById(testUser.userId);
      expect(user).toBeNull();
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should get platform statistics', async () => {
      const response = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.totalUsers).toBeDefined();
      expect(response.body.totalProjects).toBeDefined();
      expect(response.body.planDistribution).toBeDefined();
    });
  });

  describe('GET /api/admin/projects', () => {
    it('should get all projects', async () => {
      const response = await request(app)
        .get('/api/admin/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.projects).toBeDefined();
      expect(Array.isArray(response.body.projects)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/projects?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.projects).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/admin/analytics/overview', () => {
    it('should get analytics overview', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Support Tickets Management', () => {
    describe('GET /api/admin/tickets', () => {
      it('should get all tickets', async () => {
        const response = await request(app)
          .get('/api/admin/tickets')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.tickets).toBeDefined();
        expect(Array.isArray(response.body.tickets)).toBe(true);
      });

      it('should support filtering by status', async () => {
        const response = await request(app)
          .get('/api/admin/tickets?status=open')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.tickets).toBeDefined();
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/admin/tickets?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.tickets).toBeDefined();
        expect(response.body.pagination).toBeDefined();
      });
    });
  });

  describe('Cleanup Operations', () => {
    describe('GET /api/admin/cleanup/stats', () => {
      it('should get cleanup statistics', async () => {
        const response = await request(app)
          .get('/api/admin/cleanup/stats')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('GET /api/admin/cleanup/recommendations', () => {
      it('should get cleanup recommendations', async () => {
        const response = await request(app)
          .get('/api/admin/cleanup/recommendations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('POST /api/admin/cleanup/run', () => {
      it('should run cleanup tasks', async () => {
        const response = await request(app)
          .post('/api/admin/cleanup/run')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ tasks: ['stale-sessions'] })
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('DELETE /api/admin/cleanup/stale-locks', () => {
      it('should cleanup stale locks', async () => {
        const response = await request(app)
          .delete('/api/admin/cleanup/stale-locks')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Analytics Routes', () => {
    describe('GET /api/admin/analytics/conversion-rate', () => {
      it('should get conversion rate analytics', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/conversion-rate')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('GET /api/admin/analytics/features/adoption', () => {
      it('should get feature adoption analytics', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/features/adoption')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('GET /api/admin/analytics/users/growth', () => {
      it('should get user growth analytics', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/users/growth')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('GET /api/admin/analytics/export', () => {
      it('should export analytics data', async () => {
        const response = await request(app)
          .get('/api/admin/analytics/export')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Activity Feed', () => {
    describe('GET /api/admin/activity/feed', () => {
      it('should get activity feed', async () => {
        const response = await request(app)
          .get('/api/admin/activity/feed')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should support pagination for activity feed', async () => {
        const response = await request(app)
          .get('/api/admin/activity/feed?page=1&limit=20')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('User Projects Management', () => {
    describe('GET /api/admin/users/:id/projects', () => {
      it('should get all projects for a specific user', async () => {
        const testUser = await createAuthenticatedUser(app, {
          email: 'test@example.com',
          username: 'testuser'
        });

        const response = await request(app)
          .get(`/api/admin/users/${testUser.userId}/projects`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.projects).toBeDefined();
        expect(Array.isArray(response.body.projects)).toBe(true);
      });
    });
  });

  describe('Performance Monitoring', () => {
    describe('GET /api/admin/performance/recommendations', () => {
      it('should get performance recommendations', async () => {
        const response = await request(app)
          .get('/api/admin/performance/recommendations')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Analytics Cleanup', () => {
    describe('DELETE /api/admin/analytics/reset', () => {
      it('should reset analytics data', async () => {
        const response = await request(app)
          .delete('/api/admin/analytics/reset')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });
});