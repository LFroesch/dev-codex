import request from 'supertest';
import tutorialRoutes from '../routes/tutorial';
import authRoutes from '../routes/auth';
import { User } from '../models/User';
import { createTestApp, createAuthenticatedUser, expectSuccess, expectUnauthorized } from './utils';

const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/tutorial': tutorialRoutes
});

describe('Tutorial Routes', () => {
  describe('GET /api/tutorial/steps', () => {
    it('should return all tutorial steps without authentication', async () => {
      const response = await request(app).get('/api/tutorial/steps');

      expectSuccess(response);
      expect(response.body).toHaveProperty('steps');
      expect(Array.isArray(response.body.steps)).toBe(true);
      expect(response.body.steps.length).toBeGreaterThan(0);

      // Verify step structure
      const firstStep = response.body.steps[0];
      expect(firstStep).toHaveProperty('stepNumber');
      expect(firstStep).toHaveProperty('title');
      expect(firstStep).toHaveProperty('route');
      expect(firstStep).toHaveProperty('content');
    });
  });

  describe('GET /api/tutorial/progress', () => {
    it('should return tutorial progress for authenticated user', async () => {
      const { authToken, userId } = await createAuthenticatedUser(app);

      const response = await request(app)
        .get('/api/tutorial/progress')
        .set('Cookie', `token=${authToken}`);

      expectSuccess(response);
      expect(response.body).toHaveProperty('tutorialCompleted');
      expect(response.body).toHaveProperty('tutorialProgress');
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/tutorial/progress');
      expectUnauthorized(response);
    });
  });

  describe('PATCH /api/tutorial/progress', () => {
    it('should update tutorial progress', async () => {
      const { authToken } = await createAuthenticatedUser(app);

      const response = await request(app)
        .patch('/api/tutorial/progress')
        .set('Cookie', `token=${authToken}`)
        .send({
          currentStep: 3,
          completedSteps: [1, 2, 3]
        });

      expectSuccess(response);
      expect(response.body.tutorialProgress.currentStep).toBe(3);
      expect(response.body.tutorialProgress.completedSteps).toEqual([1, 2, 3]);
    });

    it('should require currentStep and completedSteps', async () => {
      const { authToken } = await createAuthenticatedUser(app);

      const response = await request(app)
        .patch('/api/tutorial/progress')
        .set('Cookie', `token=${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/tutorial/complete', () => {
    it('should mark tutorial as completed', async () => {
      const { authToken, userId } = await createAuthenticatedUser(app);

      const response = await request(app)
        .post('/api/tutorial/complete')
        .set('Cookie', `token=${authToken}`);

      expectSuccess(response);
      expect(response.body.tutorialCompleted).toBe(true);

      // Verify in database
      const user = await User.findById(userId);
      expect(user?.tutorialCompleted).toBe(true);
    });
  });

  describe('PATCH /api/tutorial/skip', () => {
    it('should mark tutorial as skipped', async () => {
      const { authToken } = await createAuthenticatedUser(app);

      const response = await request(app)
        .patch('/api/tutorial/skip')
        .set('Cookie', `token=${authToken}`);

      expectSuccess(response);
      expect(response.body.tutorialProgress.skipped).toBe(true);
    });
  });

  describe('POST /api/tutorial/reset', () => {
    it('should reset tutorial progress', async () => {
      const { authToken, userId } = await createAuthenticatedUser(app);

      // First complete it
      await request(app)
        .post('/api/tutorial/complete')
        .set('Cookie', `token=${authToken}`);

      // Then reset
      const response = await request(app)
        .post('/api/tutorial/reset')
        .set('Cookie', `token=${authToken}`);

      expectSuccess(response);
      expect(response.body.tutorialProgress.currentStep).toBe(0);
      expect(response.body.tutorialProgress.completedSteps).toEqual([]);

      // Verify in database
      const user = await User.findById(userId);
      expect(user?.tutorialCompleted).toBe(false);
    });
  });
});
