import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Ticket } from '../models/Ticket';
import Analytics from '../models/Analytics';
import adminRoutes from '../routes/admin';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

async function createAdmin() {
  const admin = await User.create({
    email: 'admin@example.com',
    password: 'StrongPass123!',
    firstName: 'Admin',
    lastName: 'User',
    username: 'admin',
    planTier: 'free',
    isAdmin: true
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { admin, token };
}

async function createRegularUser(email: string, username: string) {
  return await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Regular',
    lastName: 'User',
    username,
    planTier: 'free',
    isAdmin: false
  });
}

describe('Admin Routes - Extended', () => {
  describe('GET /api/admin/users', () => {
    it('should get paginated users list', async () => {
      const { token } = await createAdmin();

      // Create some users
      await createRegularUser('user1@example.com', 'user1');
      await createRegularUser('user2@example.com', 'user2');

      const response = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    it('should not include passwords in user data', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/users')
        .set('Cookie', `token=${token}`)
        .expect(200);

      if (response.body.users.length > 0) {
        expect(response.body.users[0]).not.toHaveProperty('password');
      }
    });

    it('should reject non-admin users', async () => {
      await createAdmin();
      const regularUser = await createRegularUser('regular@example.com', 'regular');

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'regular@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      const token = tokenCookie?.split('=')[1].split(';')[0] || '';

      await request(app)
        .get('/api/admin/users')
        .set('Cookie', `token=${token}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should get specific user details', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('details@example.com', 'details');

      const response = await request(app)
        .get(`/api/admin/users/${user._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', 'details@example.com');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const { token } = await createAdmin();
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/admin/users/${fakeId}`)
        .set('Cookie', `token=${token}`)
        .expect(404);
    });
  });

  describe('PUT /api/admin/users/:id/plan', () => {
    it('should update user plan tier', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('plan@example.com', 'planuser');

      const response = await request(app)
        .put(`/api/admin/users/${user._id}/plan`)
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'pro', projectLimit: 50 })
        .expect(200);

      expect(response.body).toHaveProperty('planTier', 'pro');
      expect(response.body).toHaveProperty('projectLimit', 20);
    });

    it('should validate plan tier', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('invalid@example.com', 'invalid');

      await request(app)
        .put(`/api/admin/users/${user._id}/plan`)
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'invalid_plan' })
        .expect(400);
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('delete@example.com', 'deleteuser');

      const response = await request(app)
        .delete(`/api/admin/users/${user._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify user was deleted
      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 when deleting non-existent user', async () => {
      const { token } = await createAdmin();
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .delete(`/api/admin/users/${fakeId}`)
        .set('Cookie', `token=${token}`)
        .expect(404);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should get platform statistics', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/stats')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalProjects');
      expect(typeof response.body.totalUsers).toBe('number');
    });
  });

  describe('GET /api/admin/projects', () => {
    it('should get all projects', async () => {
      const { token, admin } = await createAdmin();

      // Create a project
      await Project.create({
        name: 'Admin Test Project',
        description: 'Test project description',
        ownerId: admin._id,
        userId: admin._id
      });

      const response = await request(app)
        .get('/api/admin/projects')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });

    it('should support pagination', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/projects?page=1&limit=5')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('page', 1);
    });
  });

  describe('GET /api/admin/tickets', () => {
    it('should get all support tickets', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('ticket@example.com', 'ticketuser');

      // Create a ticket
      await Ticket.create({
        ticketId: 'TICKET-001',
        userId: user._id,
        userEmail: 'ticket@example.com',
        subject: 'Test Ticket',
        message: 'Test message',
        category: 'bug',
        status: 'open',
        priority: 'medium'
      });

      const response = await request(app)
        .get('/api/admin/tickets')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('tickets');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.tickets)).toBe(true);
    });

    it('should filter tickets by status', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/tickets?status=open')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('tickets');
    });
  });

  describe('GET /api/admin/tickets/:ticketId', () => {
    it('should get specific ticket details', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('ticketdetail@example.com', 'ticketdetail');

      const ticket = await Ticket.create({
        ticketId: 'TICKET-002',
        userId: user._id,
        userEmail: 'ticketdetail@example.com',
        subject: 'Detailed Ticket',
        message: 'Detailed message',
        category: 'feature_request',
        status: 'open',
        priority: 'high'
      });

      const response = await request(app)
        .get(`/api/admin/tickets/${ticket._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('ticket');
      expect(response.body.ticket).toHaveProperty('subject', 'Detailed Ticket');
    });
  });

  describe('PUT /api/admin/tickets/:ticketId', () => {
    it('should update ticket status', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('update@example.com', 'updateticket');

      const ticket = await Ticket.create({
        ticketId: 'TICKET-003',
        userId: user._id,
        userEmail: 'update@example.com',
        subject: 'Update Test',
        message: 'Test message',
        category: 'bug',
        status: 'open',
        priority: 'medium'
      });

      const response = await request(app)
        .put(`/api/admin/tickets/${ticket._id}`)
        .set('Cookie', `token=${token}`)
        .send({
          status: 'resolved',
          adminResponse: 'Issue has been fixed'
        })
        .expect(200);

      expect(response.body.ticket).toHaveProperty('status', 'resolved');
      expect(response.body.ticket).toHaveProperty('adminResponse', 'Issue has been fixed');
    });
  });

  describe('DELETE /api/admin/tickets/:ticketId', () => {
    it('should delete a ticket', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('delticket@example.com', 'delticket');

      const ticket = await Ticket.create({
        ticketId: 'TICKET-004',
        userId: user._id,
        userEmail: 'delticket@example.com',
        subject: 'Delete Me',
        message: 'Will be deleted',
        category: 'other',
        status: 'closed',
        priority: 'low'
      });

      const response = await request(app)
        .delete(`/api/admin/tickets/${ticket._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify deletion
      const deletedTicket = await Ticket.findById(ticket._id);
      expect(deletedTicket).toBeNull();
    });
  });

  describe('POST /api/admin/users/:id/password-reset', () => {
    it('should trigger password reset for user', async () => {
      const { token } = await createAdmin();
      const user = await createRegularUser('reset@example.com', 'resetuser');

      const response = await request(app)
        .post(`/api/admin/users/${user._id}/password-reset`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/admin/analytics/reset', () => {
    it('should reset analytics data', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .delete('/api/admin/analytics/reset')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/admin/analytics/leaderboard', () => {
    it('should get user activity leaderboard', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/analytics/leaderboard')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('activityLeaderboard');
      expect(response.body).toHaveProperty('projectLeaderboard');
      expect(response.body).toHaveProperty('timeLeaderboard');
      expect(Array.isArray(response.body.activityLeaderboard)).toBe(true);
    });
  });

  describe('GET /api/admin/cleanup/stats', () => {
    it('should get cleanup statistics', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/cleanup/stats')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('collections');
      expect(response.body).toHaveProperty('collectionSizes');
      expect(response.body).toHaveProperty('totalDocuments');
    });
  });

  describe('GET /api/admin/cleanup/recommendations', () => {
    it('should get cleanup recommendations', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .get('/api/admin/cleanup/recommendations')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('POST /api/admin/cleanup/orphaned', () => {
    it('should clean up orphaned records', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .post('/api/admin/cleanup/orphaned')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('cleaned');
    });
  });

  describe('DELETE /api/admin/cleanup/inactive-sessions', () => {
    it('should delete inactive sessions', async () => {
      const { token } = await createAdmin();

      const response = await request(app)
        .delete('/api/admin/cleanup/inactive-sessions')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Admin Authorization', () => {
    it('should require authentication for all admin routes', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);

      await request(app)
        .get('/api/admin/stats')
        .expect(401);

      await request(app)
        .get('/api/admin/projects')
        .expect(401);
    });

    it('should reject regular users from admin endpoints', async () => {
      await createAdmin();
      const regularUser = await createRegularUser('nonadmin@example.com', 'nonadmin');

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonadmin@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      const token = tokenCookie?.split('=')[1].split(';')[0] || '';

      await request(app)
        .get('/api/admin/users')
        .set('Cookie', `token=${token}`)
        .expect(403);

      await request(app)
        .delete(`/api/admin/users/${regularUser._id}`)
        .set('Cookie', `token=${token}`)
        .expect(403);
    });
  });
});
