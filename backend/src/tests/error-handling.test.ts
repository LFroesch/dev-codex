import request from 'supertest';
import express from 'express';
import { User } from '../models/User';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import { requireAuth } from '../middleware/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);

describe('Error Handling', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  it('should handle invalid JSON payloads', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('invalid json{');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should handle malformed ObjectIds gracefully', async () => {
    const user = {
      email: 'test@test.com',
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser'
    };

    await request(app).post('/api/auth/register').send(user);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    const cookies = loginRes.headers['set-cookie'];
    const userCookie = Array.isArray(cookies) 
      ? cookies.find((c: string) => c.startsWith('token='))! 
      : cookies;

    const res = await request(app)
      .get('/api/projects/not-a-valid-objectid')
      .set('Cookie', userCookie);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should handle missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
  });
});
