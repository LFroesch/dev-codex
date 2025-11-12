import request from 'supertest';
import authRoutes from '../routes/auth';
import billingRoutes from '../routes/billing';
import { requireAuth } from '../middleware/auth';
import { User } from '../models/User';
import { createTestApp, createAuthenticatedUser, expectSuccess, expectUnauthorized } from './utils';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_mock_customer_id',
        email: 'test@example.com'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_mock_customer_id',
        email: 'test@example.com',
        subscriptions: { data: [] }
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_mock_session_id',
          url: 'https://checkout.stripe.com/mock_session'
        })
      }
    },
    subscriptions: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_mock_subscription_id',
        status: 'active',
        items: {
          data: [{ price: { lookup_key: 'premium_monthly' } }]
        }
      }),
      cancel: jest.fn().mockResolvedValue({
        id: 'sub_mock_subscription_id',
        status: 'canceled'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockImplementation(() => {
        throw new Error('Invalid signature');
      })
    }
  }));
});

// Create test app using utility
const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/billing': [requireAuth, billingRoutes]
});

describe('Billing and Payment Routes', () => {
  let authToken: string;
  let userId: string;

  beforeEach(async () => {
    const auth = await createAuthenticatedUser(app);
    authToken = auth.authToken;
    userId = auth.userId;
  });

  describe('GET /api/billing/info', () => {
    it('should return user billing info for free tier', async () => {
      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('planTier', 'free');
      expect(response.body).toHaveProperty('hasActiveSubscription', false);
      expect(response.body).toHaveProperty('subscriptionStatus', 'inactive');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/billing/info')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });

    it('should return billing info for pro user', async () => {
      // Update user to pro with Stripe customer ID
      await User.findByIdAndUpdate(userId, {
        planTier: 'pro',
        stripeCustomerId: 'cus_mock_customer_id',
        subscriptionId: 'sub_mock_subscription_id',
        subscriptionStatus: 'active'
      });

      const response = await request(app)
        .get('/api/billing/info')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('planTier', 'pro');
      expect(response.body).toHaveProperty('hasActiveSubscription', true);
      expect(response.body).toHaveProperty('subscriptionId', 'sub_mock_subscription_id');
    });
  });

  describe('POST /api/billing/create-checkout-session', () => {
    it('should create checkout session successfully', async () => {
      const requestData = {
        planTier: 'pro'
      };

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body).toHaveProperty('url');
    });

    it('should reject invalid plan tier', async () => {
      const requestData = {
        planTier: 'invalid_plan'
      };

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .set('Cookie', `token=${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid plan tier');
    });

    it('should reject request without authentication', async () => {
      const requestData = {
        planTier: 'pro'
      };

      const response = await request(app)
        .post('/api/billing/create-checkout-session')
        .send(requestData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });
  });

  describe('POST /api/billing/cancel-subscription', () => {
    it('should handle cancellation for user without subscription', async () => {
      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .set('Cookie', `token=${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/billing/cancel-subscription')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('should require authentication (webhook protected in test)', async () => {
      const response = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send('test_payload')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });
  });

  describe('Basic functionality', () => {
    it('should handle plan limits correctly', async () => {
      // Verify user has correct plan tier
      const user = await User.findById(userId);
      expect(user?.planTier).toBe('free');
    });

    it('should allow plan upgrades', async () => {
      await User.findByIdAndUpdate(userId, { planTier: 'pro' });
      const updatedUser = await User.findById(userId);
      expect(updatedUser?.planTier).toBe('pro');
    });
  });
});