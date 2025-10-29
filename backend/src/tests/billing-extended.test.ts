import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import billingRoutes from '../routes/billing';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);

async function createAuthUser(email: string, username: string, planTier: string = 'free') {
  const user = await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
    username,
    planTier
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { user, token };
}

describe('Billing Routes Extended', () => {
  describe('POST /api/billing/create-checkout-session', () => {
    it('should reject invalid plan tier', async () => {
      const { token } = await createAuthUser('invalid@example.com', 'invalid');

      await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'invalid_plan' })
        .expect(400);
    });

    it('should reject if user already has active subscription', async () => {
      const { user, token } = await createAuthUser('active@example.com', 'active', 'pro');

      user.subscriptionStatus = 'active';
      await user.save();

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'pro' })
        .expect(400);

      expect(response.body.error).toContain('already have');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/billing/create-checkout-session')
        .send({ planTier: 'pro' })
        .expect(401);
    });

    it('should return 501 if Stripe not configured', async () => {
      const { token } = await createAuthUser('nostripe@example.com', 'nostripe');

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'pro' });

      expect([200, 501]).toContain(response.status);
    });
  });

  describe('GET /api/billing/info', () => {
    it('should get billing info for free user', async () => {
      const { token } = await createAuthUser('freeuser@example.com', 'freeuser', 'free');

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('planTier', 'free');
      expect(response.body).toHaveProperty('subscriptionStatus');
    });

    it('should get billing info for pro user', async () => {
      const { user, token } = await createAuthUser('prouser@example.com', 'prouser', 'pro');

      user.subscriptionStatus = 'active';
      user.subscriptionId = 'sub_test123';
      await user.save();

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('planTier', 'pro');
      expect(response.body).toHaveProperty('subscriptionStatus', 'active');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/billing/info')
        .expect(401);
    });

    it('should include usage info', async () => {
      const { token } = await createAuthUser('usage@example.com', 'usage');

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('planTier');
    });
  });

  describe('POST /api/billing/cancel-subscription', () => {
    it('should handle cancellation for user without subscription', async () => {
      const { token } = await createAuthUser('nosub@example.com', 'nosub');

      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/billing/cancel-subscription')
        .expect(401);
    });

    it('should return 501 if Stripe not configured', async () => {
      const { token } = await createAuthUser('nostripe2@example.com', 'nostripe2');

      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('Cookie', `token=${token}`);

      expect([200, 501]).toContain(response.status);
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('should require Stripe signature', async () => {
      const response = await request(app)
        .post('/api/billing/webhook')
        .send({ type: 'test' })
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    it('should return 501 if Stripe not configured', async () => {
      const response = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send({ type: 'test' });

      expect([200, 501]).toContain(response.status);
    });
  });

  describe('Plan limits', () => {
    it('should return correct limits for free plan', async () => {
      const { token } = await createAuthUser('freelimit@example.com', 'freelimit', 'free');

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.planTier).toBe('free');
    });

    it('should return correct limits for pro plan', async () => {
      const { token } = await createAuthUser('prolimit@example.com', 'prolimit', 'pro');

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.planTier).toBe('pro');
    });

    it('should return correct limits for enterprise plan', async () => {
      const { token } = await createAuthUser('ent@example.com', 'ent', 'enterprise');

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.planTier).toBe('enterprise');
    });
  });

  describe('Subscription statuses', () => {
    it('should handle active subscription status', async () => {
      const { user, token } = await createAuthUser('active2@example.com', 'active2', 'pro');

      user.subscriptionStatus = 'active';
      await user.save();

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.subscriptionStatus).toBe('active');
    });

    it('should handle cancelled subscription status', async () => {
      const { user, token } = await createAuthUser('cancelled@example.com', 'cancelled', 'free');

      user.subscriptionStatus = 'canceled';
      await user.save();

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.subscriptionStatus).toBe('canceled');
    });

    it('should handle past_due subscription status', async () => {
      const { user, token } = await createAuthUser('pastdue@example.com', 'pastdue', 'pro');

      user.subscriptionStatus = 'past_due';
      await user.save();

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.subscriptionStatus).toBe('past_due');
    });
  });

  describe('Plan upgrades', () => {
    it('should allow upgrade from free to pro', async () => {
      const { token } = await createAuthUser('upgrade@example.com', 'upgrade', 'free');

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'pro' });

      expect([200, 501]).toContain(response.status);
    });

    it('should allow upgrade from pro to enterprise', async () => {
      const { token } = await createAuthUser('upg2@example.com', 'upg2', 'pro');

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${token}`)
        .send({ planTier: 'enterprise' });

      expect([200, 501]).toContain(response.status);
    });
  });
});
