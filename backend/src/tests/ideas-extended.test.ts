import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import ideasRoutes from '../routes/ideas';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideasRoutes);

async function createAuthUser(email: string, username: string) {
  const user = await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
    username,
    planTier: 'free'
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { user, token };
}

describe('Ideas Routes Extended', () => {
  describe('POST /api/ideas', () => {
    it('should create an idea', async () => {
      const { token } = await createAuthUser('idea@example.com', 'ideauser');

      const response = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Test Idea',
          description: 'Test Description',
          category: 'feature',
          priority: 'medium'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.user.ideas).toHaveLength(1);
      expect(response.body.user.ideas[0]).toHaveProperty('title', 'Test Idea');
    });

    it('should require title', async () => {
      const { token } = await createAuthUser('notitle@example.com', 'notitle');

      await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ description: 'No title' })
        .expect(400);
    });

    it('should set default status to pending', async () => {
      const { token } = await createAuthUser('status@example.com', 'statususer');

      const response = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Status Test',
          description: 'Testing status'
        })
        .expect(200);

      expect(response.body.user.ideas[0]).toHaveProperty('status', 'pending');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/ideas')
        .send({ title: 'Unauthorized', description: 'Test' })
        .expect(401);
    });
  });

  describe('PUT /api/ideas/:id', () => {
    it('should update an idea', async () => {
      const { token } = await createAuthUser('update@example.com', 'updateidea');

      const createResponse = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Original', description: 'Original description' });

      const ideaId = createResponse.body.user.ideas[0].id;

      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Updated',
          description: 'Updated description',
          status: 'in_progress'
        })
        .expect(200);

      expect(response.body.user.ideas[0]).toHaveProperty('title', 'Updated');
      expect(response.body.user.ideas[0]).toHaveProperty('status', 'in_progress');
    });

    it('should return 404 for non-existent idea', async () => {
      const { token } = await createAuthUser('notfound@example.com', 'notfound');

      await request(app)
        .put('/api/ideas/nonexistent-id')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/ideas/:id', () => {
    it('should delete an idea', async () => {
      const { token } = await createAuthUser('delete@example.com', 'deleteidea');

      const createResponse = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'To Delete', description: 'Will be deleted' });

      const ideaId = createResponse.body.user.ideas[0].id;

      const response = await request(app)
        .delete(`/api/ideas/${ideaId}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.user.ideas).toHaveLength(0);
    });

    it('should return 404 for non-existent idea', async () => {
      const { token } = await createAuthUser('nodeleteidea@example.com', 'nodeleteidea');

      await request(app)
        .delete('/api/ideas/nonexistent-id')
        .set('Cookie', `token=${token}`)
        .expect(404);
    });
  });

  describe('GET /api/ideas', () => {
    it('should get user ideas', async () => {
      const { token } = await createAuthUser('getideas@example.com', 'getideas');

      // Create some ideas
      await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Idea 1', description: 'Desc 1' });

      await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Idea 2', description: 'Desc 2' });

      const response = await request(app)
        .get('/api/ideas')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.ideas).toHaveLength(2);
    });

    it('should return empty array for no ideas', async () => {
      const { token } = await createAuthUser('noideas@example.com', 'noideas');

      const response = await request(app)
        .get('/api/ideas')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.ideas).toEqual([]);
    });
  });

  describe('Idea categories and priorities', () => {
    it('should support different categories', async () => {
      const { token } = await createAuthUser('cat@example.com', 'catuser');

      const categories = ['feature', 'bug', 'improvement', 'question'];

      for (const category of categories) {
        const response = await request(app)
          .post('/api/ideas')
          .set('Cookie', `token=${token}`)
          .send({
            title: `${category} idea`,
            description: 'Test',
            category
          })
          .expect(200);

        const idea = response.body.user.ideas.find((i: any) => i.title === `${category} idea`);
        expect(idea).toHaveProperty('category', category);
      }
    });

    it('should support different priorities', async () => {
      const { token } = await createAuthUser('pri@example.com', 'priuser');

      const priorities = ['low', 'medium', 'high'];

      for (const priority of priorities) {
        const response = await request(app)
          .post('/api/ideas')
          .set('Cookie', `token=${token}`)
          .send({
            title: `${priority} priority idea`,
            description: 'Test',
            priority
          })
          .expect(200);

        const idea = response.body.user.ideas.find((i: any) => i.title === `${priority} priority idea`);
        expect(idea).toHaveProperty('priority', priority);
      }
    });
  });

  describe('Idea statuses', () => {
    it('should update idea status to in_progress', async () => {
      const { token } = await createAuthUser('progress@example.com', 'progress');

      const createResponse = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Working on it', description: 'Test' });

      const ideaId = createResponse.body.user.ideas[0].id;

      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Cookie', `token=${token}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(response.body.user.ideas[0]).toHaveProperty('status', 'in_progress');
    });

    it('should update idea status to completed', async () => {
      const { token } = await createAuthUser('complete@example.com', 'complete');

      const createResponse = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Done', description: 'Test' });

      const ideaId = createResponse.body.user.ideas[0].id;

      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Cookie', `token=${token}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.user.ideas[0]).toHaveProperty('status', 'completed');
    });

    it('should update idea status to cancelled', async () => {
      const { token } = await createAuthUser('cancel@example.com', 'cancel');

      const createResponse = await request(app)
        .post('/api/ideas')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Cancelled', description: 'Test' });

      const ideaId = createResponse.body.user.ideas[0].id;

      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Cookie', `token=${token}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.user.ideas[0]).toHaveProperty('status', 'cancelled');
    });
  });
});
