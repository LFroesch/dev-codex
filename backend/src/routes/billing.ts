import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createRateLimit } from '../middleware/rateLimit';

const router = express.Router();

// Rate limiting for billing operations
const billingRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // Max 10 billing operations per 15 minutes
  endpoint: 'billing',
  message: 'Too many billing operations. Please try again in 15 minutes.'
});

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
router.post('/create-checkout-session', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    const { planTier } = req.body;
    const userId = req.userId!;

    console.log('=== CREATING CHECKOUT SESSION ===');
    console.log('User ID:', userId);
    console.log('Plan tier:', planTier);

    if (!['pro', 'enterprise'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User found:', user.email);
    console.log('Current plan:', user.planTier);
    console.log('Current subscription status:', user.subscriptionStatus);

    // Check if user is trying to subscribe to the same plan they already have
    if (user.planTier === planTier && user.subscriptionStatus === 'active') {
      console.log('User already has this plan:', planTier);
      return res.status(400).json({ 
        error: `You already have an active ${planTier} subscription.`,
        currentPlan: user.planTier,
        subscriptionStatus: user.subscriptionStatus
      });
    }

    // If user has an active subscription but wants to upgrade, we'll need to handle the upgrade
    // Stripe will manage the proration automatically
    if (user.subscriptionStatus === 'active' && user.subscriptionId && stripe) {
      console.log('User has active subscription, checking if this is an upgrade/downgrade');
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        if (existingSubscription.status === 'active') {
          console.log('Found active Stripe subscription, will create new checkout for plan change');
        }
      } catch (error) {
        console.error('Error checking existing subscription:', error);
        // Continue with checkout creation if we can't verify the existing subscription
      }
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      console.log('Creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: userId }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log('Created Stripe customer:', customerId);
    } else {
      console.log('Using existing Stripe customer:', customerId);
    }

    const priceId = PLAN_PRICES[planTier as keyof typeof PLAN_PRICES];
    if (!priceId) {
      console.error('Price ID not found for plan:', planTier);
      console.error('Available plan prices:', PLAN_PRICES);
      return res.status(400).json({ error: 'Plan pricing not configured' });
    }

    console.log('Using price ID:', priceId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
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

    console.log('Checkout session created:', session.id);
    console.log('Session URL:', session.url);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle Stripe webhooks
router.post('/webhook', async (req, res) => {
  if (!stripe) {
    return res.status(501).json({ error: 'Payment processing not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    console.log('=== WEBHOOK EVENT RECEIVED ===');
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Processing checkout.session.completed');
        await handleSuccessfulPayment(session);
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Processing invoice.payment_succeeded');
        await handleSuccessfulSubscriptionPayment(invoice);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Processing subscription event:', event.type);
        await handleSubscriptionChange(subscription);
        break;
      
      case 'invoice.payment_failed':
        console.log('Payment failed for invoice:', event.data.object);
        // You might want to handle failed payments here
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  console.log('=== PROCESSING SUCCESSFUL PAYMENT ===');
  console.log('Session ID:', session.id);
  console.log('Session metadata:', session.metadata);
  console.log('Session subscription:', session.subscription);
  
  const userId = session.metadata?.userId;
  let planTier = session.metadata?.planTier as 'pro' | 'enterprise';
  
  if (!userId) {
    console.error('Missing userId in session metadata');
    return;
  }

  // If planTier is not in metadata, try to determine it from the subscription
  if (!planTier && session.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      console.log('Retrieved subscription price ID:', priceId);
      
      // Determine plan tier from price ID
      if (priceId === PLAN_PRICES.pro) {
        planTier = 'pro';
      } else if (priceId === PLAN_PRICES.enterprise) {
        planTier = 'enterprise';
      }
      console.log('Determined plan tier from price ID:', planTier);
    } catch (error) {
      console.error('Error retrieving subscription for plan detection:', error);
    }
  }

  if (!planTier) {
    console.error('Could not determine planTier for session:', session.id);
    console.error('Available plan prices:', PLAN_PRICES);
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  console.log(`Updating user ${userId} to plan: ${planTier}`);
  user.planTier = planTier;
  user.projectLimit = PLAN_LIMITS[planTier];
  user.subscriptionStatus = 'active';
  user.subscriptionId = session.subscription as string;
  user.stripeCustomerId = session.customer as string;
  user.lastBillingUpdate = new Date();
  
  await user.save();
  console.log(`Successfully updated user ${userId} to ${planTier} plan`);
  console.log('New user state:', {
    planTier: user.planTier,
    projectLimit: user.projectLimit,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionId: user.subscriptionId
  });
}

async function handleSuccessfulSubscriptionPayment(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) return;
  
  user.subscriptionStatus = 'active';
  user.lastBillingUpdate = new Date();
  await user.save();
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log('=== PROCESSING SUBSCRIPTION CHANGE ===');
  console.log('Subscription ID:', subscription.id);
  console.log('Subscription status:', subscription.status);
  console.log('Customer ID:', subscription.customer);
  
  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });
  
  if (!user) {
    console.error('User not found for customer:', customerId);
    return;
  }

  console.log(`Handling subscription change for user ${user._id}, status: ${subscription.status}`);
  
  // Update subscription status
  user.subscriptionStatus = subscription.status as any;
  user.subscriptionId = subscription.id;
  user.lastBillingUpdate = new Date();
  
  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    // Subscription was cancelled or expired
    user.planTier = 'free';
    user.projectLimit = PLAN_LIMITS.free;
    console.log(`Downgraded user ${user._id} to free plan due to cancellation/expiration`);
  } else if (subscription.status === 'active') {
    // Determine plan tier from price ID
    const priceId = subscription.items.data[0]?.price.id;
    let newPlanTier: 'pro' | 'enterprise' | null = null;
    
    console.log('Active subscription price ID:', priceId);
    console.log('Available plan prices:', PLAN_PRICES);
    
    if (priceId === PLAN_PRICES.pro) {
      newPlanTier = 'pro';
    } else if (priceId === PLAN_PRICES.enterprise) {
      newPlanTier = 'enterprise';
    }
    
    if (newPlanTier) {
      user.planTier = newPlanTier;
      user.projectLimit = PLAN_LIMITS[newPlanTier];
      console.log(`Updated user ${user._id} to ${newPlanTier} plan via subscription change`);
    } else {
      console.error('Could not determine plan tier for price ID:', priceId);
    }
  } else if (subscription.status === 'past_due') {
    // Keep current plan but mark as past due
    console.log(`User ${user._id} subscription is past due, keeping current plan but updating status`);
  }
  
  await user.save();
  console.log('Updated user state:', {
    planTier: user.planTier,
    projectLimit: user.projectLimit,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionId: user.subscriptionId
  });
}

// Get user's billing info
router.get('/info', requireAuth, async (req: AuthRequest, res) => {
  try {
    console.log('=== BILLING INFO REQUEST ===');
    console.log('User ID:', req.userId);
    
    const user = await User.findById(req.userId!).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User plan:', user.planTier);
    console.log('User subscription ID:', user.subscriptionId ? '[REDACTED]' : 'None');
    console.log('User subscription status:', user.subscriptionStatus);

    let billingInfo: any = {
      planTier: user.planTier,
      projectLimit: user.projectLimit,
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: user.subscriptionStatus === 'active',
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      subscriptionId: user.subscriptionId
    };

    // If user has a subscription, get additional details from Stripe
    if (user.subscriptionId && stripe) {
      console.log('Fetching subscription details from Stripe: [REDACTED]');
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ['default_payment_method', 'items.data.price']
        });
        
        console.log('Stripe subscription retrieved:', {
          id: subscription.id,
          status: (subscription as any).status,
          current_period_end: (subscription as any).current_period_end,
          cancel_at: (subscription as any).cancel_at,
          cancel_at_period_end: (subscription as any).cancel_at_period_end
        });
        
        // Get the renewal date from the subscription items if not available at top level
        let renewalDate = (subscription as any).current_period_end;
        if (!renewalDate && (subscription as any).items?.data?.[0]?.current_period_end) {
          renewalDate = (subscription as any).items.data[0].current_period_end;
          console.log('Using current_period_end from subscription item:', renewalDate);
        }
        // If subscription is cancelled, use cancel_at date
        if (!renewalDate && (subscription as any).cancel_at) {
          renewalDate = (subscription as any).cancel_at;
          console.log('Using cancel_at date:', renewalDate);
        }
        
        billingInfo.nextBillingDate = renewalDate 
          ? new Date(renewalDate * 1000).toISOString()
          : null;
        billingInfo.cancelAtPeriodEnd = (subscription as any).cancel_at_period_end || false;
        
        console.log('Calculated nextBillingDate:', billingInfo.nextBillingDate);
        console.log('Calculated cancelAtPeriodEnd:', billingInfo.cancelAtPeriodEnd);
        
        // If cancelled, the subscription will end at the current period end
        if ((subscription as any).cancel_at_period_end) {
          billingInfo.subscriptionEndsAt = billingInfo.nextBillingDate;
        }
        
        // Update hasActiveSubscription based on actual subscription status
        billingInfo.hasActiveSubscription = ['active', 'trialing', 'past_due'].includes((subscription as any).status);
        
      } catch (stripeError) {
        console.error('Error fetching subscription details from Stripe:', stripeError);
        // Continue without Stripe details rather than failing the request
      }
    } else {
      console.log('No subscription ID or Stripe not configured');
      console.log('Subscription ID exists:', !!user.subscriptionId);
      console.log('Stripe configured:', !!stripe);
    }

    console.log('Final billing info being returned:', billingInfo);
    res.json(billingInfo);
  } catch (error) {
    console.error('Error fetching billing info:', error);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    console.log('=== CANCEL SUBSCRIPTION DEBUG ===');
    console.log('User ID:', req.userId);
    
    const user = await User.findById(req.userId!);
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('User email:', user.email);
      console.log('User plan:', user.planTier);
      console.log('User subscription ID:', user.subscriptionId ? '[REDACTED]' : 'None');
      console.log('User subscription status:', user.subscriptionStatus);
    }
    
    if (!user || !user.subscriptionId) {
      console.log('ERROR: No user or subscription ID');
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Check if this is a fake subscription ID (for testing)
    if (user.subscriptionId.startsWith('sub_fake_')) {
      console.log('Detected fake subscription ID - simulating cancellation');
      // For fake subscriptions, just update the user directly
      user.planTier = 'free';
      user.projectLimit = 3;
      user.subscriptionStatus = 'canceled'; // Fixed to match Stripe's spelling
      user.subscriptionId = undefined;
      await user.save();
      
      return res.json({ 
        success: true, 
        message: 'Subscription canceled successfully (test mode)' 
      });
    }

    if (!stripe) {
      console.log('ERROR: Stripe not configured');
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    console.log('Attempting to cancel subscription: [REDACTED]');
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true
    });
    console.log('Subscription marked for cancellation at period end');

    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Resume cancelled subscription
router.post('/resume-subscription', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    console.log('=== RESUME SUBSCRIPTION ===');
    console.log('User ID:', req.userId);
    
    const user = await User.findById(req.userId!);
    if (!user || !user.subscriptionId) {
      return res.status(404).json({ error: 'No subscription found to resume' });
    }

    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    console.log('Attempting to resume subscription: [REDACTED]');
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false
    });
    
    console.log('Subscription resumed successfully');
    res.json({ success: true, message: 'Subscription resumed successfully' });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

export default router;