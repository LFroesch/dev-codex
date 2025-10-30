import request from 'supertest';
import express from 'express';
import { User } from '../models/User';
import billingRoutes from '../routes/billing';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => {
        // Parse the body as JSON and return it as the event
        return typeof body === 'string' ? JSON.parse(body) : body;
      })
    }
  }));
});

// Set up Stripe environment variables
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';

const app = express();
app.use(express.json());
app.use('/api/billing', billingRoutes);

describe('Stripe Webhooks', () => {
  let testUser: any;

  beforeEach(async () => {
    await User.deleteMany({});

    // Create a test user with Stripe customer ID
    testUser = await User.create({
      email: 'stripe@test.com',
      password: 'TestPassword123!',
      firstName: 'Stripe',
      lastName: 'User',
      username: 'stripeuser',
      stripeCustomerId: 'cus_test_123',
      planTier: 'free'
    });
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('customer.subscription.created', () => {
    it('should activate subscription when created', async () => {
      const webhookEvent = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            items: {
              data: [{
                price: { id: 'price_pro' }
              }]
            }
          } as Stripe.Subscription
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      // Verify user was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.subscriptionStatus).toBe('active');
      expect(updatedUser?.subscriptionId).toBe('sub_test_123');
      expect(updatedUser?.lastBillingUpdate).toBeDefined();
    });
  });

  describe('customer.subscription.updated', () => {
    it('should update subscription status when changed', async () => {
      // Set up user with existing subscription
      testUser.subscriptionId = 'sub_test_123';
      testUser.subscriptionStatus = 'active';
      await testUser.save();

      const webhookEvent = {
        id: 'evt_test_456',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'past_due',
            items: {
              data: [{
                price: { id: 'price_pro' }
              }]
            }
          } as Stripe.Subscription
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.subscriptionStatus).toBe('past_due');
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should downgrade user to free plan when subscription deleted', async () => {
      // Set up user with pro subscription
      testUser.subscriptionId = 'sub_test_123';
      testUser.subscriptionStatus = 'active';
      testUser.planTier = 'pro';
      testUser.projectLimit = 20;
      await testUser.save();

      const webhookEvent = {
        id: 'evt_test_789',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'canceled',
            items: {
              data: [{
                price: { id: 'price_pro' }
              }]
            }
          } as Stripe.Subscription
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.subscriptionStatus).toBe('canceled');
      expect(updatedUser?.planTier).toBe('free');
      expect(updatedUser?.projectLimit).toBe(3); // Free plan limit
    });

    it('should downgrade to free when subscription incomplete_expired', async () => {
      // Set up user with pro subscription
      testUser.subscriptionId = 'sub_test_456';
      testUser.subscriptionStatus = 'active';
      testUser.planTier = 'pro';
      testUser.projectLimit = 20;
      await testUser.save();

      const webhookEvent = {
        id: 'evt_test_999',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_456',
            customer: 'cus_test_123',
            status: 'incomplete_expired',
            items: {
              data: [{
                price: { id: 'price_pro' }
              }]
            }
          } as Stripe.Subscription
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.planTier).toBe('free');
    });
  });

  describe('invoice.payment_failed', () => {
    it('should log failed payment without crashing', async () => {
      const webhookEvent = {
        id: 'evt_test_fail',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            status: 'open',
            attempt_count: 1
          } as Stripe.Invoice
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('should update subscription status to active', async () => {
      // Set user with past_due status
      testUser.subscriptionStatus = 'past_due';
      await testUser.save();

      const webhookEvent = {
        id: 'evt_test_success',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_test_456',
            customer: 'cus_test_123',
            status: 'paid',
            subscription: 'sub_test_123'
          } as unknown as Stripe.Invoice
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.subscriptionStatus).toBe('active');
      expect(updatedUser?.lastBillingUpdate).toBeDefined();
    });
  });

  describe('checkout.session.completed', () => {
    it('should activate pro subscription on checkout completion', async () => {
      const webhookEvent = {
        id: 'evt_checkout_complete',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_new',
            metadata: {
              userId: testUser._id.toString(),
              planTier: 'pro'
            }
          } as unknown as Stripe.Checkout.Session
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.planTier).toBe('pro');
      expect(updatedUser?.projectLimit).toBe(20);
      expect(updatedUser?.subscriptionStatus).toBe('active');
      expect(updatedUser?.subscriptionId).toBe('sub_test_new');
      expect(updatedUser?.stripeCustomerId).toBe('cus_test_123');
    });

    it('should activate enterprise subscription on checkout completion', async () => {
      const webhookEvent = {
        id: 'evt_checkout_enterprise',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_456',
            customer: 'cus_test_123',
            subscription: 'sub_test_enterprise',
            metadata: {
              userId: testUser._id.toString(),
              planTier: 'enterprise'
            }
          } as unknown as Stripe.Checkout.Session
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.planTier).toBe('enterprise');
      expect(updatedUser?.projectLimit).toBe(-1); // Unlimited
      expect(updatedUser?.subscriptionStatus).toBe('active');
    });
  });

  describe('webhook signature validation', () => {
    it('should reject webhook without Stripe configured', async () => {
      // Save original key
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // Re-import routes without Stripe
      jest.resetModules();
      const billingRoutesNoStripe = require('../routes/billing').default;
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/billing', billingRoutesNoStripe);

      const webhookEvent = {
        id: 'evt_test',
        type: 'customer.subscription.created',
        data: { object: {} }
      };

      const res = await request(testApp)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test')
        .send(webhookEvent);

      expect(res.status).toBe(501);
      expect(res.body.error).toContain('Payment processing not configured');

      // Restore key
      process.env.STRIPE_SECRET_KEY = originalKey;
    });
  });

  describe('unknown event types', () => {
    it('should handle unknown webhook events gracefully', async () => {
      const webhookEvent = {
        id: 'evt_unknown',
        type: 'unknown.event.type',
        data: {
          object: {}
        }
      };

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookEvent);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });
});
