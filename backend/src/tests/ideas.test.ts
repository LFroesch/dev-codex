import request from 'supertest';
import ideasRoutes from '../routes/ideas';
import { User } from '../models/User';
import { createTestApp, createAuthenticatedUser } from './utils';

const app = createTestApp({ '/api/ideas': ideasRoutes });

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Ideas Routes', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = await createAuthenticatedUser(app);
    userToken = user.authToken;
    userId = user.userId;
  });

  describe('GET /api/ideas', () => {
    it('should get user ideas', async () => {
      const response = await request(app)
        .get('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(Array.isArray(response.body.ideas)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/ideas')
        .expect(401);
    });
  });

  describe('POST /api/ideas', () => {
    it('should create a new idea', async () => {
      const ideaData = {
        title: 'Test Idea',
        description: 'This is a test idea',
        content: 'This is the content of the test idea',
        category: 'feature',
      };

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(201);

      expect(response.body.idea.title).toBe(ideaData.title);
      expect(response.body.idea.description).toBe(ideaData.description);
    });

    it('should validate required fields', async () => {
      const ideaData = {
        description: 'Missing title',
      };

      await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(400);
    });

    it('should require authentication', async () => {
      const ideaData = {
        title: 'Test Idea',
        description: 'This is a test idea',
      };

      await request(app)
        .post('/api/ideas')
        .send(ideaData)
        .expect(401);
    });
  });
});