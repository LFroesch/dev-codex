import express, { Request, Response } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { checkProjectLock } from '../middleware/projectLock';
import { AuthRequest } from '../middleware/auth';

describe('Project Lock Middleware', () => {
  let app: express.Application;

  afterEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.put('/test/:id', (req: AuthRequest, res: Response, next) => {
      req.userId = req.body.userId;
      next();
    }, checkProjectLock, (req: Request, res: Response) => {
      res.json({ success: true, message: 'Project updated' });
    });
  });

  it('should allow modifications to unlocked projects', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isEmailVerified: true
    });

    const project = await Project.create({
      name: 'Test Project',
      description: 'Test',
      userId: user._id,
      ownerId: user._id,
      isLocked: false
    });

    const response = await request(app)
      .put(`/test/${project._id}`)
      .send({ userId: user._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should block modifications to locked projects', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isEmailVerified: true
    });

    const project = await Project.create({
      name: 'Test Project',
      description: 'Test',
      userId: user._id,
      ownerId: user._id,
      isLocked: true,
      lockedReason: 'Project is locked due to payment failure'
    });

    const response = await request(app)
      .put(`/test/${project._id}`)
      .send({ userId: user._id.toString() });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Project is locked');
    expect(response.body.message).toBe('Project is locked due to payment failure');
    expect(response.body.isLocked).toBe(true);
  });

  it('should use default message if no lockedReason provided', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isEmailVerified: true
    });

    const project = await Project.create({
      name: 'Test Project',
      description: 'Test',
      userId: user._id,
      ownerId: user._id,
      isLocked: true
    });

    const response = await request(app)
      .put(`/test/${project._id}`)
      .send({ userId: user._id.toString() });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Project is locked');
    expect(response.body.message).toContain('This project is locked and cannot be modified');
  });

  it('should continue if no projectId in params', async () => {
    const appNoId = express();
    appNoId.use(express.json());
    appNoId.put('/test', checkProjectLock, (req: Request, res: Response) => {
      res.json({ success: true });
    });

    const response = await request(appNoId)
      .put('/test')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should continue if project not found', async () => {
    const fakeProjectId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/test/${fakeProjectId}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should handle database errors gracefully', async () => {
    // Use invalid ObjectId to trigger an error
    const invalidId = 'invalid-id';

    const appWithErrorHandler = express();
    appWithErrorHandler.use(express.json());
    appWithErrorHandler.put('/test/:id', checkProjectLock, (req: Request, res: Response) => {
      res.json({ success: true });
    });
    // Error handler middleware
    appWithErrorHandler.use((err: Error, req: Request, res: Response, next: any) => {
      res.status(500).json({ error: 'Internal server error' });
    });

    const response = await request(appWithErrorHandler)
      .put(`/test/${invalidId}`)
      .send({});

    expect(response.status).toBe(500);
  });

  it('should allow modifications when isLocked is false', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isEmailVerified: true
    });

    const project = await Project.create({
      name: 'Test Project',
      description: 'Test',
      userId: user._id,
      ownerId: user._id,
      isLocked: false,
      lockedReason: 'Should be ignored'
    });

    const response = await request(app)
      .put(`/test/${project._id}`)
      .send({ userId: user._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should allow modifications when isLocked is undefined', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      isEmailVerified: true
    });

    const project = await Project.create({
      name: 'Test Project',
      description: 'Test',
      userId: user._id,
      ownerId: user._id
      // isLocked not set
    });

    const response = await request(app)
      .put(`/test/${project._id}`)
      .send({ userId: user._id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
