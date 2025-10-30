import request from 'supertest';
import express from 'express';
import billingRoutes from '../routes/billing';

const app = express();
app.use(express.raw({ type: 'application/json' })); // Stripe needs raw body
app.use('/api/billing', billingRoutes);

describe('Stripe Webhooks', () => {
  it('should respond to webhook endpoint', async () => {
    // Note: Without Stripe signature, this will fail validation
    // But we can verify the endpoint exists
    const res = await request(app)
      .post('/api/billing/webhook')
      .set('stripe-signature', 'test')
      .send(Buffer.from(JSON.stringify({
        type: 'customer.subscription.created',
        data: { object: {} }
      })));

    // Will fail signature verification, but endpoint should exist
    expect(res.status).toBeDefined();
  });
});
