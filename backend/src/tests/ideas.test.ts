import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import ideasRoutes from '../routes/ideas';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/ideas', ideasRoutes);

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

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

      expect(Array.isArray(response.body)).toBe(true);
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
        category: 'feature',
      };

      const response = await request(app)
        .post('/api/ideas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ideaData)
        .expect(201);

      expect(response.body.title).toBe(ideaData.title);
      expect(response.body.description).toBe(ideaData.description);
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