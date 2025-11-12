import express, { Request, Response } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import { checkProjectLimit, checkTeamMemberLimit } from '../middleware/planLimits';
import { AuthRequest } from '../middleware/auth';

describe('Plan Limits Middleware', () => {
  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
  });

  describe('checkProjectLimit', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test', (req: AuthRequest, res: Response, next) => {
        req.userId = req.body.userId;
        next();
      }, checkProjectLimit, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should allow project creation when under limit', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'free',
        projectLimit: 3,
        isEmailVerified: true
      });

      // Create 2 projects (under limit of 3)
      await Project.create({
        name: 'Project 1',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });
      await Project.create({
        name: 'Project 2',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });

      const response = await request(app)
        .post('/test')
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject project creation when limit reached', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        planTier: 'free',
        projectLimit: 2,
        isEmailVerified: true
      });

      // Create projects up to limit
      await Project.create({
        name: 'Project 1',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });
      await Project.create({
        name: 'Project 2',
        description: 'Test',
        userId: user._id,
        ownerId: user._id
      });

      const response = await request(app)
        .post('/test')
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Project limit reached');
      expect(response.body.currentCount).toBe(2);
      expect(response.body.limit).toBe(2);
      expect(response.body.planTier).toBe('free');
    });

    it('should allow unlimited projects for premium users (projectLimit: -1)', async () => {
      const user = await User.create({
        email: 'premium@example.com',
        password: 'Password123!',
        firstName: 'Premium',
        lastName: 'User',
        username: 'premiumuser',
        planTier: 'premium',
        projectLimit: -1,
        isEmailVerified: true
      });

      // Create many projects
      for (let i = 0; i < 20; i++) {
        await Project.create({
          name: `Project ${i}`,
          description: 'Test',
          userId: user._id,
          ownerId: user._id
        });
      }

      const response = await request(app)
        .post('/test')
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should bypass limits for admin users', async () => {
      const user = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        username: 'adminuser',
        planTier: 'free',
        projectLimit: 1,
        isAdmin: true,
        isEmailVerified: true
      });

      // Create many projects
      for (let i = 0; i < 10; i++) {
        await Project.create({
          name: `Project ${i}`,
          description: 'Test',
          userId: user._id,
          ownerId: user._id
        });
      }

      const response = await request(app)
        .post('/test')
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/test')
        .send({ userId: fakeUserId.toString() });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should handle different plan tiers correctly', async () => {
      const proUser = await User.create({
        email: 'pro@example.com',
        password: 'Password123!',
        firstName: 'Pro',
        lastName: 'User',
        username: 'prouser',
        planTier: 'pro',
        projectLimit: 10,
        isEmailVerified: true
      });

      // Create 9 projects (under limit of 10)
      for (let i = 0; i < 9; i++) {
        await Project.create({
          name: `Project ${i}`,
          description: 'Test',
          userId: proUser._id,
          ownerId: proUser._id
        });
      }

      const response = await request(app)
        .post('/test')
        .send({ userId: proUser._id.toString() });

      expect(response.status).toBe(200);
    });
  });

  describe('checkTeamMemberLimit', () => {
    let app: express.Application;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/test/:id', (req: AuthRequest, res: Response, next) => {
        req.userId = req.body.userId;
        next();
      }, checkTeamMemberLimit, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should allow adding team member when under limit (free tier)', async () => {
      const owner = await User.create({
        email: 'owner@example.com',
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'User',
        username: 'owneruser',
        planTier: 'free',
        isEmailVerified: true
      });

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: owner._id,
        ownerId: owner._id
      });

      // Add 2 team members (free tier limit is 3)
      const member1 = await User.create({
        email: 'member1@example.com',
        password: 'Password123!',
        firstName: 'Member',
        lastName: 'One',
        username: 'member1',
        isEmailVerified: true
      });
      const member2 = await User.create({
        email: 'member2@example.com',
        password: 'Password123!',
        firstName: 'Member',
        lastName: 'Two',
        username: 'member2',
        isEmailVerified: true
      });

      await TeamMember.create({
        userId: member1._id,
        projectId: project._id,
        role: 'viewer',
        invitedBy: owner._id,
        isActive: true
      });
      await TeamMember.create({
        userId: member2._id,
        projectId: project._id,
        role: 'viewer',
        invitedBy: owner._id,
        isActive: true
      });

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: owner._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject adding team member when limit reached (free tier)', async () => {
      const owner = await User.create({
        email: 'owner@example.com',
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'User',
        username: 'owneruser',
        planTier: 'free',
        isEmailVerified: true
      });

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: owner._id,
        ownerId: owner._id
      });

      // Add 3 team members (reaching free tier limit)
      for (let i = 0; i < 3; i++) {
        const member = await User.create({
          email: `member${i}@example.com`,
          password: 'Password123!',
          firstName: 'Member',
          lastName: `${i}`,
          username: `member${i}`,
          isEmailVerified: true
        });

        await TeamMember.create({
          userId: member._id,
          projectId: project._id,
          role: 'viewer',
          invitedBy: owner._id,
          isActive: true
        });
      }

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: owner._id.toString() });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Team member limit reached');
      expect(response.body.currentCount).toBe(3);
      expect(response.body.limit).toBe(3);
      expect(response.body.planTier).toBe('free');
    });

    it('should allow more team members for pro tier', async () => {
      const owner = await User.create({
        email: 'owner@example.com',
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'User',
        username: 'owneruser',
        planTier: 'pro',
        isEmailVerified: true
      });

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: owner._id,
        ownerId: owner._id
      });

      // Add 9 team members (pro tier limit is 10)
      for (let i = 0; i < 9; i++) {
        const member = await User.create({
          email: `member${i}@example.com`,
          password: 'Password123!',
          firstName: 'Member',
          lastName: `${i}`,
          username: `member${i}`,
          isEmailVerified: true
        });

        await TeamMember.create({
          userId: member._id,
          projectId: project._id,
          role: 'viewer',
          invitedBy: owner._id,
          isActive: true
        });
      }

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: owner._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow unlimited team members for premium tier', async () => {
      const owner = await User.create({
        email: 'owner@example.com',
        password: 'Password123!',
        firstName: 'Owner',
        lastName: 'User',
        username: 'owneruser',
        planTier: 'premium',
        isEmailVerified: true
      });

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: owner._id,
        ownerId: owner._id
      });

      // Add many team members
      for (let i = 0; i < 20; i++) {
        const member = await User.create({
          email: `member${i}@example.com`,
          password: 'Password123!',
          firstName: 'Member',
          lastName: `${i}`,
          username: `member${i}`,
          isEmailVerified: true
        });

        await TeamMember.create({
          userId: member._id,
          projectId: project._id,
          role: 'viewer',
          invitedBy: owner._id,
          isActive: true
        });
      }

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: owner._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should bypass limits for admin project owners', async () => {
      const owner = await User.create({
        email: 'admin@example.com',
        password: 'Password123!',
        firstName: 'Admin',
        lastName: 'User',
        username: 'adminuser',
        planTier: 'free',
        isAdmin: true,
        isEmailVerified: true
      });

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: owner._id,
        ownerId: owner._id
      });

      // Add many team members
      for (let i = 0; i < 20; i++) {
        const member = await User.create({
          email: `member${i}@example.com`,
          password: 'Password123!',
          firstName: 'Member',
          lastName: `${i}`,
          username: `member${i}`,
          isEmailVerified: true
        });

        await TeamMember.create({
          userId: member._id,
          projectId: project._id,
          role: 'viewer',
          invitedBy: owner._id,
          isActive: true
        });
      }

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: owner._id.toString() });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if project not found', async () => {
      const fakeProjectId = new mongoose.Types.ObjectId();
      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const response = await request(app)
        .post(`/test/${fakeProjectId}`)
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return 404 if project owner not found', async () => {
      const fakeOwnerId = new mongoose.Types.ObjectId();
      const project = await Project.create({
        name: 'Test Project',
        description: 'Test',
        userId: fakeOwnerId,
        ownerId: fakeOwnerId
      });

      const user = await User.create({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        isEmailVerified: true
      });

      const response = await request(app)
        .post(`/test/${project._id}`)
        .send({ userId: user._id.toString() });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project owner not found');
    });
  });
});
