import request from 'supertest';
import express from 'express';
import ideasRoutes from '../routes/ideas';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock the requireAuth middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret') as any;
        req.userId = decoded.userId;
        req.user = { _id: decoded.userId, email: decoded.email };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  }
}));

app.use('/api/ideas', ideasRoutes);

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Ideas Routes', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    const user = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'hashedpassword',
    });
    await user.save();
    userId = user._id.toString();

    userToken = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
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
  });
});