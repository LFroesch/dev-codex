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

describe('Integration: Project Lifecycle', () => {
  let userCookie: string;

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});

    const user = {
      email: 'lifecycle@test.com',
      password: 'Lifecycle123!',
      firstName: 'Life',
      lastName: 'Cycle',
      username: 'lifecycleuser'
    };

    await request(app).post('/api/auth/register').send(user);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    const cookies = loginRes.headers['set-cookie'];
    userCookie = Array.isArray(cookies) 
      ? cookies.find((c: string) => c.startsWith('token='))! 
      : cookies;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  it('should handle full project CRUD workflow', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/projects')
      .set('Cookie', userCookie)
      .send({ 
        name: 'Full Stack App',
        description: 'Complete app',
        category: 'web-development'
      });

    expect(createRes.status).toBe(201);
    const projectId = createRes.body.project.id;

    // Read
    const getRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', userCookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.project.name).toBe('Full Stack App');

    // Update
    const updateRes = await request(app)
      .put(`/api/projects/${projectId}`)
      .set('Cookie', userCookie)
      .send({ name: 'Updated App' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.project.name).toBe('Updated App');

    // Delete
    const deleteRes = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set('Cookie', userCookie);

    expect(deleteRes.status).toBe(200);
  });
});
