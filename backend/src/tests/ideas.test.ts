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

    it('should trim whitespace from title and content', async () => {
      const ideaData = {
        title: '  Whitespace Test  ',
        description: '  Some description  ',
        content: '  Content with spaces  '
      };

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(201);

      expect(response.body.idea.title).toBe('Whitespace Test');
      expect(response.body.idea.description).toBe('Some description');
      expect(response.body.idea.content).toBe('Content with spaces');
    });

    it('should add new ideas to the beginning of the list', async () => {
      // Create first idea
      await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'First Idea',
          content: 'First content'
        })
        .expect(201);

      // Create second idea
      await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Second Idea',
          content: 'Second content'
        })
        .expect(201);

      // Verify second idea is first in list
      const response = await request(app)
        .get('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.ideas).toHaveLength(2);
      expect(response.body.ideas[0].title).toBe('Second Idea');
      expect(response.body.ideas[1].title).toBe('First Idea');
    });

    it('should handle optional description field', async () => {
      const ideaData = {
        title: 'No Description',
        content: 'Just content'
      };

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(201);

      expect(response.body.idea.description).toBe('');
    });

    it('should verify idea was saved to database', async () => {
      const ideaData = {
        title: 'Database Test',
        content: 'Testing persistence'
      };

      await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(201);

      // Verify in database
      const user = await User.findById(userId);
      expect(user).toBeTruthy();
      expect(user?.ideas).toBeDefined();
      expect(user?.ideas).toHaveLength(1);
      expect(user?.ideas[0].title).toBe('Database Test');
    });
  });

  describe('PUT /api/ideas/:ideaId', () => {
    let ideaId: string;

    beforeEach(async () => {
      // Create an idea to update
      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Original Title',
          description: 'Original description',
          content: 'Original content'
        })
        .expect(201);

      ideaId = response.body.idea.id;
    });

    it('should update an existing idea', async () => {
      const updatedData = {
        title: 'Updated Title',
        description: 'Updated description',
        content: 'Updated content'
      };

      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.idea.title).toBe('Updated Title');
      expect(response.body.idea.description).toBe('Updated description');
      expect(response.body.idea.content).toBe('Updated content');
      expect(response.body.idea.id).toBe(ideaId);
    });

    it('should verify update was saved to database', async () => {
      const updatedData = {
        title: 'DB Update Test',
        content: 'Updated'
      };

      await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData)
        .expect(200);

      const user = await User.findById(userId);
      const updatedIdea = user?.ideas.find(idea => idea.id === ideaId);
      expect(updatedIdea).toBeTruthy();
      expect(updatedIdea?.title).toBe('DB Update Test');
      expect(updatedIdea?.content).toBe('Updated');
    });

    it('should update the updatedAt timestamp', async () => {
      // Get original timestamp
      const user = await User.findById(userId);
      const originalTimestamp = user?.ideas[0].updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Title',
          content: 'New content'
        })
        .expect(200);

      const updatedUser = await User.findById(userId);
      const newTimestamp = updatedUser?.ideas[0].updatedAt;
      expect(newTimestamp).not.toEqual(originalTimestamp);
    });

    it('should return 404 for non-existent idea', async () => {
      const response = await request(app)
        .put('/api/ideas/nonexistent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'New Title',
          content: 'New content'
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should validate required fields on update', async () => {
      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Only title'
          // Missing content
        })
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should require authentication', async () => {
      await request(app)
        .put(`/api/ideas/${ideaId}`)
        .send({
          title: 'Updated',
          content: 'Updated'
        })
        .expect(401);
    });

    it('should trim whitespace on update', async () => {
      const response = await request(app)
        .put(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '  Trimmed Title  ',
          description: '  Trimmed Desc  ',
          content: '  Trimmed Content  '
        })
        .expect(200);

      expect(response.body.idea.title).toBe('Trimmed Title');
      expect(response.body.idea.description).toBe('Trimmed Desc');
      expect(response.body.idea.content).toBe('Trimmed Content');
    });
  });

  describe('DELETE /api/ideas/:ideaId', () => {
    let ideaId: string;

    beforeEach(async () => {
      // Create an idea to delete
      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'To Delete',
          content: 'This will be deleted'
        })
        .expect(201);

      ideaId = response.body.idea.id;
    });

    it('should delete an existing idea', async () => {
      const response = await request(app)
        .delete(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.message).toContain('deleted');
    });

    it('should verify idea was removed from database', async () => {
      await request(app)
        .delete(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const user = await User.findById(userId);
      expect(user?.ideas).toHaveLength(0);
    });

    it('should return 404 for non-existent idea', async () => {
      const response = await request(app)
        .delete('/api/ideas/nonexistent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/ideas/${ideaId}`)
        .expect(401);
    });

    it('should not affect other ideas when deleting', async () => {
      // Create a second idea
      const response2 = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Keep This',
          content: 'Should remain'
        })
        .expect(201);

      const idea2Id = response2.body.idea.id;

      // Delete first idea
      await request(app)
        .delete(`/api/ideas/${ideaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Verify second idea still exists
      const user = await User.findById(userId);
      expect(user?.ideas).toHaveLength(1);
      expect(user?.ideas[0].id).toBe(idea2Id);
      expect(user?.ideas[0].title).toBe('Keep This');
    });
  });
});