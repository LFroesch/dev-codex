import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import { requireAuth } from '../middleware/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);

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
    const user = {
      email: 'upgrade@test.com',
      password: 'Upgrade123!',
      firstName: 'Up',
      lastName: 'Grade',
      username: 'upgradeuser'
    };

    await request(app).post('/api/auth/register').send(user);
    
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    const cookies = loginRes.headers['set-cookie'];
    const userCookie = Array.isArray(cookies) 
      ? cookies.find((c: string) => c.startsWith('token='))! 
      : cookies;

    // Upgrade to pro
    const dbUser = await User.findOne({ email: user.email });
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
