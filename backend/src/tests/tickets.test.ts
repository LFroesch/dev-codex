// Mock nodemailer before imports
const mockCreateTransport = jest.fn(() => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
}));

jest.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  },
  createTransport: mockCreateTransport
}));

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import authRoutes from '../routes/auth';
import ticketRoutes from '../routes/tickets';
import { requireAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);

describe('Ticket Routes', () => {
  let authToken: string;
  let userId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    testUser = new User({
      email: 'testuser@example.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User'
    });
    await testUser.save();
    userId = testUser._id.toString();

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test_secret'
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Ticket.deleteMany({});
  });

  beforeEach(async () => {
    await Ticket.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/tickets', () => {
    it('should create a new support ticket', async () => {
      const ticketData = {
        subject: 'Test Issue',
        message: 'I need help with something',
        category: 'technical',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Cookie', `token=${authToken}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Ticket created successfully');
      expect(response.body.ticket).toMatchObject({
        subject: ticketData.subject,
        category: ticketData.category,
        priority: ticketData.priority
      });

      // Verify ticket was saved to database
      const savedTicket = await Ticket.findOne({ subject: ticketData.subject });
      expect(savedTicket).toBeTruthy();
      expect(savedTicket?.userId.toString()).toBe(userId);
    });

    it('should create ticket with default priority', async () => {
      const ticketData = {
        subject: 'Default Priority Test',
        message: 'Testing default priority',
        category: 'billing'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Cookie', `token=${authToken}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body.ticket.priority).toBe('medium');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        subject: 'Test',
        // missing message and category
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Cookie', `token=${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should validate category values', async () => {
      const invalidData = {
        subject: 'Test',
        message: 'Test message',
        category: 'invalid-category'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Cookie', `token=${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid category');
    });

    it('should validate priority values', async () => {
      const invalidData = {
        subject: 'Test',
        message: 'Test message',
        category: 'technical',
        priority: 'invalid-priority'
      };

      const response = await request(app)
        .post('/api/tickets')
        .set('Cookie', `token=${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid priority');
    });

    it('should require authentication', async () => {
      const ticketData = {
        subject: 'Test',
        message: 'Test message',
        category: 'technical'
      };

      const response = await request(app)
        .post('/api/tickets')
        .send(ticketData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tickets', () => {
    beforeEach(async () => {
      // Create test tickets
      await Ticket.create([
        {
          userId,
          userEmail: 'testuser@example.com',
          ticketId: 'TICKET-001',
          subject: 'First Ticket',
          message: 'First message',
          category: 'technical',
          priority: 'high',
          status: 'open'
        },
        {
          userId,
          userEmail: 'testuser@example.com',
          ticketId: 'TICKET-002',
          subject: 'Second Ticket',
          message: 'Second message',
          category: 'billing',
          priority: 'low',
          status: 'closed'
        }
      ]);
    });

    it('should get user tickets with pagination', async () => {
      const response = await request(app)
        .get('/api/tickets/my-tickets')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.pagination.totalTickets).toBe(2);
    });

    it('should filter tickets by status', async () => {
      const response = await request(app)
        .get('/api/tickets?status=open')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
      expect(response.body.tickets[0].status).toBe('open');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/tickets?limit=1&skip=1')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(1);
    });

    it('should only return user own tickets', async () => {
      // Create another user and their ticket
      const otherUser = new User({
        email: 'other@example.com',
        password: await bcrypt.hash('pass', 10),
        firstName: 'Other',
        lastName: 'User'
      });
      await otherUser.save();

      await Ticket.create({
        userId: otherUser._id,
        userEmail: 'other@example.com',
        ticketId: 'OTHER-TICKET',
        subject: 'Other User Ticket',
        message: 'Should not see this',
        category: 'technical',
        priority: 'medium',
        status: 'open'
      });

      const response = await request(app)
        .get('/api/tickets/my-tickets')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.tickets).toHaveLength(2);
      expect(response.body.tickets.every((ticket: any) => 
        ticket.userId === userId
      )).toBe(true);
    });
  });

  describe('GET /api/tickets/:ticketId', () => {
    let testTicket: any;

    beforeEach(async () => {
      testTicket = await Ticket.create({
        userId,
        userEmail: 'testuser@example.com',
        ticketId: 'TEST-TICKET',
        subject: 'Test Ticket',
        message: 'Test message',
        category: 'technical',
        priority: 'medium',
        status: 'open'
      });
    });

    it('should get specific ticket', async () => {
      const response = await request(app)
        .get(`/api/tickets/${testTicket.ticketId}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.ticket.ticketId).toBe('TEST-TICKET');
    });

    it('should return 404 for non-existent ticket', async () => {
      const response = await request(app)
        .get('/api/tickets/NON-EXISTENT')
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should not allow access to other users tickets', async () => {
      // Create another user
      const otherUser = new User({
        email: 'other@example.com',
        password: await bcrypt.hash('pass', 10),
        firstName: 'Other',
        lastName: 'User'
      });
      await otherUser.save();

      const otherTicket = await Ticket.create({
        userId: otherUser._id,
        userEmail: 'other@example.com',
        ticketId: 'OTHER-TICKET',
        subject: 'Other User Ticket',
        message: 'Should not access',
        category: 'technical',
        priority: 'medium',
        status: 'open'
      });

      const response = await request(app)
        .get(`/api/tickets/${otherTicket.ticketId}`)
        .set('Cookie', `token=${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});