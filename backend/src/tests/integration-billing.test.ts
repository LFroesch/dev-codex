// Mock email service
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined)
}));

import request from 'supertest';
import { User } from '../models/User';
import { Project } from '../models/Project';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import { requireAuth } from '../middleware/auth';
import { createTestApp, createAuthenticatedUser } from './utils';

const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/projects': [requireAuth, projectRoutes]
});

describe('Integration: Billing & Subscription Limits', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  it('should enforce project limits for free tier users', async () => {
    const freeUser = {
      email: 'free@test.com',
      password: 'FreeUser123!',
      firstName: 'Free',
      lastName: 'User',
      username: 'freeuser'
    };

    await request(app).post('/api/auth/register').send(freeUser);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: freeUser.email, password: freeUser.password });

    const cookies = loginRes.headers['set-cookie'];
    const userCookie = Array.isArray(cookies) 
      ? cookies.find((c: string) => c.startsWith('token='))! 
      : cookies;

    // Create 3 projects (free tier limit)
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', userCookie)
        .send({ name: `Project ${i}`, description: 'Test project' });
      
      expect(res.status).toBe(201);
    }

    // 4th project should fail
    const failRes = await request(app)
      .post('/api/projects')
      .set('Cookie', userCookie)
      .send({ name: 'Project 4', description: 'Should fail' });

    expect(failRes.status).toBe(403);
    expect(failRes.body.error).toContain('limit');
  });

  it('should allow more projects after upgrading plan', async () => {
    // Create user with createAuthenticatedUser to ensure it persists
    const { user, authToken, userId } = await createAuthenticatedUser(app, {
      email: 'upgrade@test.com',
      username: 'upgradeuser',
      planTier: 'free'
    });

    const userCookie = `token=${authToken}`;

    // Upgrade to pro
    const dbUser = await User.findById(userId);
    expect(dbUser).toBeTruthy();

    dbUser!.planTier = 'pro';
    dbUser!.projectLimit = 10;
    await dbUser!.save();

    // Should create more than 3 projects
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', userCookie)
        .send({ name: `Pro Project ${i}`, description: 'Pro project' });
      
      expect(res.status).toBe(201);
    }
  });
});
