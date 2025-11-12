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

  describe('GET /api/public/projects', () => {
    let user: any;

    beforeEach(async () => {
      user = await User.create({
        email: 'discovery@example.com',
        password: 'StrongPass123!',
        firstName: 'Discovery',
        lastName: 'User',
        username: 'discoveryuser',
        planTier: 'free',
        isPublic: true
      });
    });

    it('should get public projects for discovery', async () => {
      await Project.create({
        name: 'Discovery Project 1',
        description: 'Test project 1',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        category: 'web'
      });

      await Project.create({
        name: 'Discovery Project 2',
        description: 'Test project 2',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        category: 'mobile'
      });

      const response = await request(app)
        .get('/api/public/projects')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
      expect(response.body.projects.length).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination', async () => {
      // Create multiple projects
      for (let i = 0; i < 15; i++) {
        await Project.create({
          name: `Project ${i}`,
          description: `Description ${i}`,
          ownerId: user._id,
          userId: user._id,
          isPublic: true
        });
      }

      const response = await request(app)
        .get('/api/public/projects?page=1&limit=10')
        .expect(200);

      expect(response.body.projects.length).toBeLessThanOrEqual(10);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('current', 1);
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should filter by category', async () => {
      await Project.create({
        name: 'Web Project',
        description: 'Web app',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        category: 'web'
      });

      await Project.create({
        name: 'Mobile Project',
        description: 'Mobile app',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        category: 'mobile'
      });

      const response = await request(app)
        .get('/api/public/projects?category=web')
        .expect(200);

      expect(response.body.projects.every((p: any) => p.category === 'web')).toBe(true);
    });

    it('should filter by tag', async () => {
      await Project.create({
        name: 'Tagged Project',
        description: 'Has tags',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        tags: ['react', 'typescript']
      });

      await Project.create({
        name: 'Other Project',
        description: 'Different tags',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        tags: ['vue', 'javascript']
      });

      const response = await request(app)
        .get('/api/public/projects?tag=react')
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThan(0);
      expect(response.body.projects.some((p: any) =>
        p.tags && p.tags.includes('react')
      )).toBe(true);
    });

    it('should search by project name', async () => {
      await Project.create({
        name: 'Searchable Project Name',
        description: 'Test description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      await Project.create({
        name: 'Different Project',
        description: 'Other description',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      const response = await request(app)
        .get('/api/public/projects?search=Searchable')
        .expect(200);

      expect(response.body.projects.length).toBeGreaterThan(0);
      expect(response.body.projects.some((p: any) =>
        p.name.includes('Searchable')
      )).toBe(true);
    });

    it('should not include private projects', async () => {
      await Project.create({
        name: 'Private Project',
        description: 'Should not appear',
        ownerId: user._id,
        userId: user._id,
        isPublic: false
      });

      await Project.create({
        name: 'Public Project',
        description: 'Should appear',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      const response = await request(app)
        .get('/api/public/projects')
        .expect(200);

      const privateProject = response.body.projects.find(
        (p: any) => p.name === 'Private Project'
      );
      expect(privateProject).toBeUndefined();

      const publicProject = response.body.projects.find(
        (p: any) => p.name === 'Public Project'
      );
      expect(publicProject).toBeDefined();
    });

    it('should not include archived projects', async () => {
      await Project.create({
        name: 'Archived Project',
        description: 'Should not appear',
        ownerId: user._id,
        userId: user._id,
        isPublic: true,
        isArchived: true
      });

      const response = await request(app)
        .get('/api/public/projects')
        .expect(200);

      const archivedProject = response.body.projects.find(
        (p: any) => p.name === 'Archived Project'
      );
      expect(archivedProject).toBeUndefined();
    });

    it('should include owner information with projects', async () => {
      await Project.create({
        name: 'Project with Owner',
        description: 'Test',
        ownerId: user._id,
        userId: user._id,
        isPublic: true
      });

      const response = await request(app)
        .get('/api/public/projects')
        .expect(200);

      const project = response.body.projects.find(
        (p: any) => p.name === 'Project with Owner'
      );

      expect(project).toBeDefined();
      expect(project.owner).toHaveProperty('username', 'discoveryuser');
      expect(project.owner).toHaveProperty('displayName');
    });

    it('should handle empty results', async () => {
      const response = await request(app)
        .get('/api/public/projects?search=NonexistentSearchTerm123456')
        .expect(200);

      expect(response.body.projects).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });
  });
});
