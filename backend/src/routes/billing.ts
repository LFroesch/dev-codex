import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Initialize Stripe only if API key is provided
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  });
}

const PLAN_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID || ''
};

const PLAN_LIMITS = {
  free: 3,
  pro: 20,
  enterprise: -1 // unlimited
};

// Create checkout session
router.post('/create-checkout-session', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    const { planTier } = req.body;
    const userId = req.userId!;

    if (!['pro', 'enterprise'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: userId }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: PLAN_PRICES[planTier as keyof typeof PLAN_PRICES],
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
      metadata: {
        userId: userId,
        planTier: planTier
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: 'Payment processing not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err: any) {
    console.log(`❌ Webhook signature verification failed:`, err.message);
    console.log('Signature:', sig);
    console.log('Endpoint secret set:', !!endpointSecret);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log(`📧 Received webhook: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('🛒 Processing checkout.session.completed:', session.id);
        await handleSuccessfulPayment(session);
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Processing invoice.payment_succeeded:', invoice.id);
        await handleSuccessfulSubscriptionPayment(invoice);
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`🔄 Processing ${event.type}:`, subscription.id);
        await handleSubscriptionChange(subscription);
        break;
      
      default:
        console.log(`⚠️ Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  console.log('🔍 Processing payment for session:', JSON.stringify(session.metadata, null, 2));
  
  const userId = session.metadata?.userId;
  const planTier = session.metadata?.planTier as 'pro' | 'enterprise';
  
  console.log('📊 Payment details:', { userId, planTier });
  
  if (!userId || !planTier) {
    console.log('❌ Missing userId or planTier in session metadata');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.log('❌ User not found:', userId);
    return;
  }

  console.log('👤 Found user:', user.email, 'current plan:', user.planTier);

  user.planTier = planTier;
  user.projectLimit = PLAN_LIMITS[planTier];
  user.subscriptionStatus = 'active';
  user.subscriptionId = session.subscription as string;
  
  await user.save();
  
  console.log('✅ User plan updated:', {
    email: user.email,
    newPlan: user.planTier,
    projectLimit: user.projectLimit,
    subscriptionId: user.subscriptionId
  });
}

async function handleSuccessfulSubscriptionPayment(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) return;
  
  user.subscriptionStatus = 'active';
  await user.save();
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) return;

  user.subscriptionStatus = subscription.status as any;
  
  if (subscription.status === 'canceled') {
    user.planTier = 'free';
    user.projectLimit = PLAN_LIMITS.free;
  }
  
  await user.save();
}

// Get user's billing info
router.get('/info', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.userId!).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const billingInfo = {
      planTier: user.planTier,
      projectLimit: user.projectLimit,
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: user.subscriptionStatus === 'active'
    };

    res.json(billingInfo);
  } catch (error) {
    console.error('Error fetching billing info:', error);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    const user = await User.findById(req.userId!);
    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true
    });

    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// TEMPORARY: Manual plan update endpoint for testing
router.post('/update-plan-manual', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { planTier } = req.body;
    const userId = req.userId!;

    if (!['free', 'pro', 'enterprise'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const PLAN_LIMITS = {
      free: 3,
      pro: 20,
      enterprise: -1
    };

    user.planTier = planTier as 'free' | 'pro' | 'enterprise';
    user.projectLimit = PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS];
    user.subscriptionStatus = planTier === 'free' ? 'inactive' : 'active';
    
    await user.save();

    console.log(`✅ Manually updated user ${userId} to ${planTier} plan`);

    res.json({ 
      success: true, 
      message: `Plan updated to ${planTier}`,
      user: {
        planTier: user.planTier,
        projectLimit: user.projectLimit,
        subscriptionStatus: user.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Error updating plan manually:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

export default router;