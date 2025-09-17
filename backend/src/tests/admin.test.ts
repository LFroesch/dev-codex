import request from 'supertest';
import express from 'express';
import adminRoutes from '../routes/admin';
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
        req.user = { _id: decoded.userId, email: decoded.email, role: decoded.role || 'user' };
        next();
      } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
      }
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  }
}));

app.use('/api/admin', adminRoutes);

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
      isAdmin: true,
    });
    await adminUser.save();
    userId = adminUser._id.toString();

    adminToken = jwt.sign(
      { userId: adminUser._id, email: adminUser.email, role: 'admin' },
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

      expect(Array.isArray(response.body.users)).toBe(true);
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