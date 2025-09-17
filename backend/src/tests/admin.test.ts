import request from 'supertest';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import adminRoutes from '../routes/admin';
import User from '../models/User';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

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

describe('Admin Routes', () => {
  let adminToken: string;
  let userId: string;

  beforeEach(async () => {
    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'hashedpassword',
      role: 'admin',
    });
    await adminUser.save();
    userId = adminUser._id.toString();

    adminToken = jwt.sign(
      { userId: adminUser._id, email: adminUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      await request(app)
        .get('/api/admin/users')
        .expect(401);
    });
  });

  describe('Admin Authentication', () => {
    it('should require admin role', async () => {
      // Create regular user
      const regularUser = new User({
        firstName: 'Regular',
        lastName: 'User',
        email: 'user@example.com',
        password: 'hashedpassword',
        role: 'user',
      });
      await regularUser.save();

      const userToken = jwt.sign(
        { userId: regularUser._id, email: regularUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});