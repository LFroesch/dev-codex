import request from 'supertest';
import { NewsPost } from '../models/NewsPost';
import newsRoutes from '../routes/news';
import authRoutes from '../routes/auth';
import { createTestApp, createAuthenticatedUser, createAuthenticatedAdmin, expectSuccess } from './utils';

// Create test app using utility
const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/news': newsRoutes
});

// Helper functions (simplified)
async function createUser(email: string, username: string, isAdmin: boolean = false) {
  const authHelper = isAdmin
    ? await createAuthenticatedAdmin(app, { email, username })
    : await createAuthenticatedUser(app, { email, username });

  return { user: authHelper.user, token: authHelper.authToken };
}

describe('News Routes', () => {
  describe('GET /api/news/important', () => {
    it('should get only important announcements', async () => {
      const { user } = await createUser('important@example.com', 'importantuser', true);

      await NewsPost.create({
        title: 'Important Announcement',
        content: 'Critical update',
        summary: 'Important',
        type: 'important',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      await NewsPost.create({
        title: 'Regular News',
        content: 'Regular content',
        summary: 'News',
        type: 'news',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      const response = await request(app)
        .get('/api/news/important')
        .expect(200);

      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].type).toBe('important');
      expect(response.body.posts[0].title).toBe('Important Announcement');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/news/important')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
    });

    it('should return empty array if no important posts', async () => {
      const response = await request(app)
        .get('/api/news/important')
        .expect(200);

      expect(response.body.posts).toEqual([]);
    });
  });

  describe('GET /api/news', () => {
    it('should get all published news posts without authentication', async () => {
      const { user } = await createUser('admin@example.com', 'admin', true);

      // Create published and unpublished posts
      await NewsPost.create({
        title: 'Published Post',
        content: 'This is published',
        summary: 'Summary',
        type: 'news',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      await NewsPost.create({
        title: 'Draft Post',
        content: 'This is a draft',
        summary: 'Draft summary',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body).toHaveProperty('posts');
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0]).toHaveProperty('title', 'Published Post');
      expect(response.body.posts[0]).toHaveProperty('isPublished', true);
    });

    it('should return empty array if no published posts', async () => {
      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.posts).toEqual([]);
    });

    it('should sort posts by publishedAt descending', async () => {
      const { user } = await createUser('author@example.com', 'author', true);

      await NewsPost.create({
        title: 'Older Post',
        content: 'Content 1',
        type: 'news',
        isPublished: true,
        publishedAt: new Date('2024-01-01'),
        authorId: user._id
      });

      await NewsPost.create({
        title: 'Newer Post',
        content: 'Content 2',
        type: 'news',
        isPublished: true,
        publishedAt: new Date('2024-12-01'),
        authorId: user._id
      });

      const response = await request(app)
        .get('/api/news')
        .expect(200);

      expect(response.body.posts[0].title).toBe('Newer Post');
      expect(response.body.posts[1].title).toBe('Older Post');
    });
  });

  describe('GET /api/news/admin', () => {
    it('should get all posts for admin including drafts', async () => {
      const { user, token } = await createUser('admin2@example.com', 'admin2', true);

      await NewsPost.create({
        title: 'Published',
        content: 'Content',
        type: 'news',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      await NewsPost.create({
        title: 'Draft',
        content: 'Content',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      const response = await request(app)
        .get('/api/news/admin')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.posts).toHaveLength(2);
    });

    it('should reject non-admin users', async () => {
      const { token } = await createUser('regular@example.com', 'regular', false);

      await request(app)
        .get('/api/news/admin')
        .set('Cookie', `token=${token}`)
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/news/admin')
        .expect(401);
    });
  });

  describe('GET /api/news/:id', () => {
    it('should get published post by ID without authentication', async () => {
      const { user } = await createUser('author2@example.com', 'author2', true);

      const post = await NewsPost.create({
        title: 'Test Post',
        content: 'Test Content',
        summary: 'Summary',
        type: 'news',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      const response = await request(app)
        .get(`/api/news/${post._id}`)
        .expect(200);

      expect(response.body.post).toHaveProperty('title', 'Test Post');
      expect(response.body.post).toHaveProperty('content', 'Test Content');
    });

    it('should reject unpublished post for non-admin', async () => {
      const { user } = await createUser('author3@example.com', 'author3', true);

      const post = await NewsPost.create({
        title: 'Draft Post',
        content: 'Draft Content',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      await request(app)
        .get(`/api/news/${post._id}`)
        .expect(403);
    });

    it('should allow admin to view unpublished post', async () => {
      const { user, token } = await createUser('admin3@example.com', 'admin3', true);

      const post = await NewsPost.create({
        title: 'Admin Draft',
        content: 'Admin Content',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      const response = await request(app)
        .get(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.post).toHaveProperty('title', 'Admin Draft');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      await request(app)
        .get(`/api/news/${fakeId}`)
        .expect(404);
    });
  });

  describe('POST /api/news', () => {
    it('should create news post as admin', async () => {
      const { token } = await createUser('creator@example.com', 'creator', true);

      const response = await request(app)
        .post('/api/news')
        .set('Cookie', `token=${token}`)
        .send({
          title: 'New Post',
          content: 'New Content',
          summary: 'New Summary',
          type: 'news',
          isPublished: true
        })
        .expect(201);

      expect(response.body.post).toHaveProperty('title', 'New Post');
      expect(response.body.post).toHaveProperty('content', 'New Content');
      expect(response.body.post).toHaveProperty('isPublished', true);
      expect(response.body.post).toHaveProperty('publishedAt');

      // Verify in database
      const post = await NewsPost.findOne({ title: 'New Post' });
      expect(post).toBeTruthy();
    });

    it('should create draft post', async () => {
      const { token } = await createUser('drafter@example.com', 'drafter', true);

      const response = await request(app)
        .post('/api/news')
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Draft Post',
          content: 'Draft Content',
          isPublished: false
        })
        .expect(201);

      expect(response.body.post).toHaveProperty('isPublished', false);
      expect(response.body.post.publishedAt).toBeUndefined();
    });

    it('should require title and content', async () => {
      const { token } = await createUser('incomplete@example.com', 'incomplete', true);

      await request(app)
        .post('/api/news')
        .set('Cookie', `token=${token}`)
        .send({ title: 'Only Title' })
        .expect(400);

      await request(app)
        .post('/api/news')
        .set('Cookie', `token=${token}`)
        .send({ content: 'Only Content' })
        .expect(400);
    });

    it('should reject non-admin users', async () => {
      const { token } = await createUser('nonAdmin@example.com', 'nonadmin', false);

      await request(app)
        .post('/api/news')
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Unauthorized',
          content: 'Should fail'
        })
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/news')
        .send({
          title: 'No Auth',
          content: 'Should fail'
        })
        .expect(401);
    });
  });

  describe('PUT /api/news/:id', () => {
    it('should update news post as admin', async () => {
      const { user, token } = await createUser('updater@example.com', 'updater', true);

      const post = await NewsPost.create({
        title: 'Original Title',
        content: 'Original Content',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      const response = await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Updated Title',
          content: 'Updated Content',
          isPublished: true
        })
        .expect(200);

      expect(response.body.post).toHaveProperty('title', 'Updated Title');
      expect(response.body.post).toHaveProperty('content', 'Updated Content');
      expect(response.body.post).toHaveProperty('isPublished', true);
      expect(response.body.post).toHaveProperty('publishedAt');
    });

    it('should set publishedAt when first published', async () => {
      const { user, token } = await createUser('publisher@example.com', 'publisher', true);

      const post = await NewsPost.create({
        title: 'Draft',
        content: 'Content',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      const response = await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({ isPublished: true })
        .expect(200);

      expect(response.body.post.publishedAt).toBeTruthy();
      const publishedAt = new Date(response.body.post.publishedAt);
      expect(publishedAt).toBeInstanceOf(Date);
    });

    it('should return 404 for non-existent post', async () => {
      const { token } = await createUser('updater2@example.com', 'updater2', true);
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .put(`/api/news/${fakeId}`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should reject non-admin users', async () => {
      const { user } = await createUser('admin4@example.com', 'admin4', true);
      const { token } = await createUser('regular2@example.com', 'regular2', false);

      const post = await NewsPost.create({
        title: 'Post',
        content: 'Content',
        type: 'news',
        isPublished: true,
        authorId: user._id
      });

      await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'Hacked' })
        .expect(403);
    });

    it('should require authentication', async () => {
      const { user } = await createUser('admin5@example.com', 'admin5', true);

      const post = await NewsPost.create({
        title: 'Post',
        content: 'Content',
        type: 'news',
        authorId: user._id
      });

      await request(app)
        .put(`/api/news/${post._id}`)
        .send({ title: 'Updated' })
        .expect(401);
    });

    it('should update only specified fields', async () => {
      const { user, token } = await createUser('partial@example.com', 'partial', true);

      const post = await NewsPost.create({
        title: 'Original Title',
        content: 'Original Content',
        summary: 'Original Summary',
        type: 'news',
        isPublished: false,
        authorId: user._id
      });

      // Update only title
      await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'New Title' })
        .expect(200);

      // Verify other fields unchanged
      const updated = await NewsPost.findById(post._id);
      expect(updated?.title).toBe('New Title');
      expect(updated?.content).toBe('Original Content');
      expect(updated?.summary).toBe('Original Summary');
    });

    it('should change post type', async () => {
      const { user, token } = await createUser('typechanger@example.com', 'typechanger', true);

      const post = await NewsPost.create({
        title: 'Regular Post',
        content: 'Content',
        type: 'news',
        isPublished: true,
        publishedAt: new Date(),
        authorId: user._id
      });

      const response = await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({ type: 'important' })
        .expect(200);

      expect(response.body.post.type).toBe('important');

      // Verify in database
      const updated = await NewsPost.findById(post._id);
      expect(updated?.type).toBe('important');
    });

    it('should not reset publishedAt when already published', async () => {
      const { user, token } = await createUser('resettest@example.com', 'resettest', true);

      const originalDate = new Date('2024-01-01');
      const post = await NewsPost.create({
        title: 'Published Post',
        content: 'Content',
        type: 'news',
        isPublished: true,
        publishedAt: originalDate,
        authorId: user._id
      });

      await request(app)
        .put(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .send({ content: 'Updated Content' })
        .expect(200);

      // Verify publishedAt unchanged
      const updated = await NewsPost.findById(post._id);
      expect(updated?.publishedAt?.toISOString()).toBe(originalDate.toISOString());
    });
  });

  describe('DELETE /api/news/:id', () => {
    it('should delete news post as admin', async () => {
      const { user, token } = await createUser('deleter@example.com', 'deleter', true);

      const post = await NewsPost.create({
        title: 'To Delete',
        content: 'Will be deleted',
        type: 'news',
        isPublished: true,
        authorId: user._id
      });

      const response = await request(app)
        .delete(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Post deleted successfully');

      // Verify deletion
      const deletedPost = await NewsPost.findById(post._id);
      expect(deletedPost).toBeNull();
    });

    it('should return 404 for non-existent post', async () => {
      const { token } = await createUser('deleter2@example.com', 'deleter2', true);
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .delete(`/api/news/${fakeId}`)
        .set('Cookie', `token=${token}`)
        .expect(404);
    });

    it('should reject non-admin users', async () => {
      const { user } = await createUser('admin6@example.com', 'admin6', true);
      const { token } = await createUser('regular3@example.com', 'regular3', false);

      const post = await NewsPost.create({
        title: 'Protected Post',
        content: 'Cannot delete',
        type: 'news',
        authorId: user._id
      });

      await request(app)
        .delete(`/api/news/${post._id}`)
        .set('Cookie', `token=${token}`)
        .expect(403);

      // Verify not deleted
      const existingPost = await NewsPost.findById(post._id);
      expect(existingPost).toBeTruthy();
    });

    it('should require authentication', async () => {
      const { user } = await createUser('admin7@example.com', 'admin7', true);

      const post = await NewsPost.create({
        title: 'Post',
        content: 'Content',
        type: 'news',
        authorId: user._id
      });

      await request(app)
        .delete(`/api/news/${post._id}`)
        .expect(401);
    });
  });
});
