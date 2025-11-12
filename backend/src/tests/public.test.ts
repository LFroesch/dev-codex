import request from 'supertest';
import { User } from '../models/User';
import { Project } from '../models/Project';
import publicRoutes from '../routes/public';
import { createTestApp } from './utils';

const app = createTestApp({ '/api/public': publicRoutes });

describe('Public Routes', () => {
  describe('GET /api/public/project/:identifier', () => {
    it('should get public project by ID', async () => {
      const user = await User.create({
        email: 'public@example.com',
        password: 'StrongPass123!',
        firstName: 'Public',
        lastName: 'User',
        username: 'publicuser',
        planTier: 'free'
      });

      const project = await Project.create({
        name: 'Public Project',
        description: 'A public project',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        publicSlug: 'public-project'
      });

      const response = await request(app)
        .get(`/api/public/project/${project._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('project');
      expect(response.body.project).toHaveProperty('name', 'Public Project');
    });

    it('should get public project by slug', async () => {
      const user = await User.create({
        email: 'slug@example.com',
        password: 'StrongPass123!',
        firstName: 'Slug',
        lastName: 'User',
        username: 'sluguser',
        planTier: 'free'
      });

      const project = await Project.create({
        name: 'Slug Project',
        description: 'Slug test project',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        publicSlug: 'my-slug-project'
      });

      const response = await request(app)
        .get('/api/public/project/my-slug-project')
        .expect(200);

      expect(response.body.project).toHaveProperty('name', 'Slug Project');
      expect(response.body.project).toHaveProperty('publicSlug', 'my-slug-project');
    });

    it('should return 404 for non-existent project', async () => {
      await request(app)
        .get('/api/public/project/nonexistent-slug')
        .expect(404);
    });

    it('should return 403 for private project', async () => {
      const user = await User.create({
        email: 'private@example.com',
        password: 'StrongPass123!',
        firstName: 'Private',
        lastName: 'User',
        username: 'privateuser',
        planTier: 'free'
      });

      const project = await Project.create({
        name: 'Private Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isPublic: false
      });

      await request(app)
        .get(`/api/public/project/${project._id}`)
        .expect(403);
    });

    it('should respect visibility settings', async () => {
      const user = await User.create({
        email: 'vis@example.com',
        password: 'StrongPass123!',
        firstName: 'Vis',
        lastName: 'User',
        username: 'visuser',
        planTier: 'free'
      });

      const project = await Project.create({
        name: 'Visibility Project',
        description: 'Hidden description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        publicVisibility: {
          description: false,
          tags: true,
          components: true,
          techStack: true,
          timestamps: true
        }
      });

      const response = await request(app)
        .get(`/api/public/project/${project._id}`)
        .expect(200);

      expect(response.body.project).not.toHaveProperty('description');
      expect(response.body.project).toHaveProperty('publicVisibility');
    });

    it('should include owner information', async () => {
      const user = await User.create({
        email: 'owner@example.com',
        password: 'StrongPass123!',
        firstName: 'Owner',
        lastName: 'User',
        username: 'owneruser',
        planTier: 'free',
        displayPreference: 'username'
      });

      const project = await Project.create({
        name: 'Owner Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      const response = await request(app)
        .get(`/api/public/project/${project._id}`)
        .expect(200);

      expect(response.body.project).toHaveProperty('owner');
      expect(response.body.project.owner).toHaveProperty('username', 'owneruser');
      expect(response.body.project.owner).toHaveProperty('displayName', '@owneruser');
    });

    it('should not expose sensitive project data', async () => {
      const user = await User.create({
        email: 'secure@example.com',
        password: 'StrongPass123!',
        firstName: 'Secure',
        lastName: 'User',
        username: 'secureuser',
        planTier: 'free'
      });

      const project = await Project.create({
        name: 'Secure Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      const response = await request(app)
        .get(`/api/public/project/${project._id}`)
        .expect(200);

      expect(response.body.project).not.toHaveProperty('notes');
      expect(response.body.project).not.toHaveProperty('todos');
      expect(response.body.project).not.toHaveProperty('ownerId');
      expect(response.body.project).not.toHaveProperty('userId');
    });
  });

  describe('GET /api/public/user/:identifier', () => {
    it('should get public user profile', async () => {
      const user = await User.create({
        email: 'profile@example.com',
        password: 'StrongPass123!',
        firstName: 'Profile',
        lastName: 'User',
        username: 'profileuser',
        planTier: 'free',
        isPublic: true,
        publicSlug: 'profile-user',
        bio: 'My public bio'
      });

      // Use user ID directly to avoid publicSlug lookup issues in tests
      const response = await request(app)
        .get(`/api/public/user/${user._id}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.user).toHaveProperty('username', 'profileuser');
      expect(response.body.user).toHaveProperty('bio', 'My public bio');
    });

    it('should return 403 for private user profile', async () => {
      const user = await User.create({
        email: 'privateprof@example.com',
        password: 'StrongPass123!',
        firstName: 'Private',
        lastName: 'Profile',
        username: 'privateprof',
        planTier: 'free',
        isPublic: false
      });

      await request(app)
        .get(`/api/public/user/${user._id}`)
        .expect(403);
    });

    it('should not expose sensitive user data', async () => {
      const user = await User.create({
        email: 'safe@example.com',
        password: 'StrongPass123!',
        firstName: 'Safe',
        lastName: 'User',
        username: 'safeuser',
        planTier: 'pro',
        isPublic: true,
        publicSlug: 'safe-user'
      });

      const response = await request(app)
        .get('/api/public/user/safe-user')
        .expect(200);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('planTier');
      expect(response.body.user).not.toHaveProperty('stripeCustomerId');
    });
  });

  describe('GET /api/public/user/:identifier/projects', () => {
    it('should get public projects for user', async () => {
      const user = await User.create({
        email: 'projects@example.com',
        password: 'StrongPass123!',
        firstName: 'Projects',
        lastName: 'User',
        username: 'projectsuser',
        planTier: 'free',
        isPublic: true,
        publicSlug: 'projects-user'
      });

      await Project.create({
        name: 'Public Project 1',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      await Project.create({
        name: 'Private Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isPublic: false
      });

      const response = await request(app)
        .get('/api/public/user/projects-user')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('projects');
      expect(Array.isArray(response.body.user.projects)).toBe(true);
      // Should only return public projects (private project should be excluded)
      expect(response.body.user.projects.length).toBe(1);
    });
  });
});
