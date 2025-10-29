import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import terminalRoutes from '../routes/terminal';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/terminal', terminalRoutes);

async function createAuthUser(email: string, username: string) {
  const user = await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
    username,
    planTier: 'free'
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { user, token };
}

describe('Terminal Routes', () => {
  describe('POST /api/terminal/execute', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/terminal/execute')
        .send({ command: '/help' })
        .expect(401);
    });

    it('should reject empty command', async () => {
      const { token } = await createAuthUser('term@example.com', 'termuser');

      await request(app)
        .post('/api/terminal/execute')
        .set('Cookie', `token=${token}`)
        .send({ command: '' })
        .expect(400);
    });

    it('should reject non-string command', async () => {
      const { token } = await createAuthUser('term2@example.com', 'termuser2');

      await request(app)
        .post('/api/terminal/execute')
        .set('Cookie', `token=${token}`)
        .send({ command: 123 })
        .expect(400);
    });

    it('should execute help command', async () => {
      const { token } = await createAuthUser('help@example.com', 'helpuser');

      const response = await request(app)
        .post('/api/terminal/execute')
        .set('Cookie', `token=${token}`)
        .send({ command: '/help' })
        .expect(200);

      expect(response.body).toHaveProperty('type');
      expect(['success', 'info', 'data']).toContain(response.body.type);
    });

    it('should handle command with project context', async () => {
      const { user, token } = await createAuthUser('context@example.com', 'contextuser');

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .post('/api/terminal/execute')
        .set('Cookie', `token=${token}`)
        .send({
          command: '/help',
          currentProjectId: project._id.toString()
        })
        .expect(200);

      expect(response.body).toHaveProperty('type');
    });

    it('should return response for valid command', async () => {
      const { token } = await createAuthUser('valid@example.com', 'validuser');

      const response = await request(app)
        .post('/api/terminal/execute')
        .set('Cookie', `token=${token}`)
        .send({ command: '/help' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/terminal/commands', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/terminal/commands')
        .expect(401);
    });

    it('should get available commands', async () => {
      const { token } = await createAuthUser('cmds@example.com', 'cmdsuser');

      const response = await request(app)
        .get('/api/terminal/commands')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('commands');
      expect(Array.isArray(response.body.commands)).toBe(true);
    });

    it('should include command metadata', async () => {
      const { token } = await createAuthUser('meta@example.com', 'metauser');

      const response = await request(app)
        .get('/api/terminal/commands')
        .set('Cookie', `token=${token}`)
        .expect(200);

      if (response.body.commands.length > 0) {
        expect(response.body.commands[0]).toHaveProperty('value');
        expect(response.body.commands[0]).toHaveProperty('description');
      }
    });
  });

  describe('GET /api/terminal/help', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/terminal/help')
        .expect(401);
    });

    it('should get help information', async () => {
      const { token } = await createAuthUser('helpinfo@example.com', 'helpinfo');

      const response = await request(app)
        .get('/api/terminal/help')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('commands');
      expect(Array.isArray(response.body.commands)).toBe(true);
    });
  });

  describe('GET /api/terminal/projects', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/terminal/projects')
        .expect(401);
    });

    it('should get user projects', async () => {
      const { user, token } = await createAuthUser('proj@example.com', 'projuser');

      await Project.create({
        name: 'Test Project 1',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });

      const response = await request(app)
        .get('/api/terminal/projects')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('projects');
      expect(Array.isArray(response.body.projects)).toBe(true);
    });
  });
});
