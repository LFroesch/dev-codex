import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createRateLimit } from '../middleware/rateLimit';
import { logInfo, logError, logWarn } from '../config/logger';

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
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

const PLAN_PRICES = {
  pro: process.env.STRIPE_PRO_PRICE_ID || '',
  premium: process.env.STRIPE_PREMIUM_PRICE_ID || ''
};

const PLAN_LIMITS = {
  free: 3,
  pro: 20,
  premium: 50
};

// Create checkout session
router.post('/create-checkout-session', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if self-hosted mode is enabled
    if (process.env.SELF_HOSTED === 'true') {
      return res.status(501).json({ error: 'Billing is disabled in self-hosted mode' });
    }

    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    const { planTier } = req.body;
    const userId = req.userId!;

    logInfo('Creating checkout session', { userId, planTier });

    if (!['pro', 'premium'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logInfo('User checkout details', { email: user.email, currentPlan: user.planTier, subscriptionStatus: user.subscriptionStatus });

    // Check if user is trying to subscribe to the same plan they already have
    if (user.planTier === planTier && user.subscriptionStatus === 'active') {
      logInfo('User already has this plan', { planTier });
      return res.status(400).json({ 
        error: `You already have an active ${planTier} subscription.`,
        currentPlan: user.planTier,
        subscriptionStatus: user.subscriptionStatus
      });
    }

    // If user has an active subscription but wants to upgrade, we'll need to handle the upgrade
    // Stripe will manage the proration automatically
    if (user.subscriptionStatus === 'active' && user.subscriptionId && stripe) {
      logInfo('User has active subscription, checking if this is an upgrade/downgrade');
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(user.subscriptionId);
        if (existingSubscription.status === 'active') {
          logInfo('Found active Stripe subscription, will create new checkout for plan change');
        }
      } catch (error) {
        logError('Error checking existing subscription', error as Error);
        // Continue with checkout creation if we can't verify the existing subscription
      }
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
      logInfo('Created new Stripe customer', { customerId });
    } else {
      logInfo('Using existing Stripe customer', { customerId });
    }

    const priceId = PLAN_PRICES[planTier as keyof typeof PLAN_PRICES];
    if (!priceId) {
      logError('Price ID not found for plan', new Error(`Plan tier: ${planTier}`));
      return res.status(400).json({ error: 'Plan pricing not configured' });
    }

    logInfo('Using price ID', { priceId, planTier });

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

    logInfo('Checkout session created', { sessionId: session.id, url: session.url });

    res.json({ url: session.url });
  } catch (error) {
    logError('Error creating checkout session', error as Error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle Stripe webhooks
router.post('/webhook', async (req, res) => {
  // Check if self-hosted mode is enabled
  if (process.env.SELF_HOSTED === 'true') {
    return res.status(501).json({ error: 'Billing is disabled in self-hosted mode' });
  }

  if (!stripe) {
    return res.status(501).json({ error: 'Payment processing not configured' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logError('Webhook signature verification failed', new Error(err.message));
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    logInfo('Webhook event received', { eventType: event.type, eventId: event.id });

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        logInfo('Processing checkout.session.completed');
        await handleSuccessfulPayment(session);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        logInfo('Processing invoice.payment_succeeded');
        await handleSuccessfulSubscriptionPayment(invoice);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        logInfo('Processing subscription event', { eventType: event.type });
        await handleSubscriptionChange(subscription);
        break;

      case 'invoice.payment_failed':
        logWarn('Payment failed for invoice', { invoice: event.data.object });
        // You might want to handle failed payments here
        break;

      default:
        logInfo('Unhandled event type', { eventType: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logError('Error handling webhook', error as Error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  logInfo('Processing successful payment', { sessionId: session.id, metadata: session.metadata, subscription: session.subscription });

  const userId = session.metadata?.userId;
  let planTier = session.metadata?.planTier as 'pro' | 'premium';

  if (!userId) {
    logError('Missing userId in session metadata');
    return;
  }

  // If planTier is not in metadata, try to determine it from the subscription
  if (!planTier && session.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      logInfo('Retrieved subscription price ID', { priceId });

      // Determine plan tier from price ID
      if (priceId === PLAN_PRICES.pro) {
        planTier = 'pro';
      } else if (priceId === PLAN_PRICES.premium) {
        planTier = 'premium';
      }
      logInfo('Determined plan tier from price ID', { planTier });
    } catch (error) {
      logError('Error retrieving subscription for plan detection', error as Error);
    }
  }

  if (!planTier) {
    logError('Could not determine planTier for session', new Error(`Session ID: ${session.id}`));
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    logError('User not found', new Error(`User ID: ${userId}`));
    return;
  }

  logInfo('Updating user plan', { userId, planTier });
  user.planTier = planTier;
  user.projectLimit = PLAN_LIMITS[planTier];
  user.subscriptionStatus = 'active';
  user.subscriptionId = session.subscription as string;
  user.stripeCustomerId = session.customer as string;
  user.lastBillingUpdate = new Date();

  await user.save();
  logInfo('Successfully updated user to new plan', {
    userId,
    planTier: user.planTier,
    projectLimit: user.projectLimit,
    subscriptionStatus: user.subscriptionStatus
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
  logInfo('Processing subscription change', {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer
  });

  const customerId = subscription.customer as string;
  const user = await User.findOne({ stripeCustomerId: customerId });

  if (!user) {
    logError('User not found for customer', new Error(`Customer ID: ${customerId}`));
    return;
  }

  logInfo('Handling subscription change for user', { userId: user._id, status: subscription.status });

  // Update subscription status
  user.subscriptionStatus = subscription.status as any;
  user.subscriptionId = subscription.id;
  user.lastBillingUpdate = new Date();

  if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
    // Subscription was cancelled or expired
    const oldPlanTier = user.planTier;
    user.planTier = 'free';
    user.projectLimit = PLAN_LIMITS.free;
    logInfo('Downgraded user to free plan', { userId: user._id, reason: subscription.status });

    // Handle excess projects by locking them
    await handleDowngradeExcess(user._id.toString(), 'free');

    // Update retention for existing data when downgrading
    if (oldPlanTier !== 'free') {
      const { updateExpirationOnPlanChange } = await import('../utils/retentionUtils');
      await updateExpirationOnPlanChange(user._id.toString(), oldPlanTier, 'free');
      logInfo('Updated data retention after downgrade', { userId: user._id, from: oldPlanTier, to: 'free' });
    }
  } else if (subscription.status === 'active') {
    // Determine plan tier from price ID
    const priceId = subscription.items.data[0]?.price.id;
    let newPlanTier: 'pro' | 'premium' | null = null;

    logInfo('Active subscription price details', { priceId, availablePrices: PLAN_PRICES });

    if (priceId === PLAN_PRICES.pro) {
      newPlanTier = 'pro';
    } else if (priceId === PLAN_PRICES.premium) {
      newPlanTier = 'premium';
    }

    if (newPlanTier) {
      const oldPlanTier = user.planTier;
      user.planTier = newPlanTier;
      user.projectLimit = PLAN_LIMITS[newPlanTier];
      logInfo('Updated user plan via subscription change', { userId: user._id, planTier: newPlanTier });

      // Update retention for existing data when plan changes
      if (oldPlanTier !== newPlanTier) {
        const { updateExpirationOnPlanChange } = await import('../utils/retentionUtils');
        await updateExpirationOnPlanChange(user._id.toString(), oldPlanTier, newPlanTier);
        logInfo('Updated data retention after plan change', { userId: user._id, from: oldPlanTier, to: newPlanTier });
      }
    } else {
      logError('Could not determine plan tier for price ID', new Error(`Price ID: ${priceId}`));
    }
  } else if (subscription.status === 'past_due') {
    // Keep current plan but mark as past due
    logWarn('User subscription is past due', { userId: user._id });
  }

  await user.save();
  logInfo('Updated user state after subscription change', {
    userId: user._id,
    planTier: user.planTier,
    projectLimit: user.projectLimit,
    subscriptionStatus: user.subscriptionStatus
  });
}

// Get user's billing info
router.get('/info', requireAuth, async (req: AuthRequest, res) => {
  try {
    logInfo('Billing info request', { userId: req.userId });

    const user = await User.findById(req.userId!).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If self-hosted, return basic info without billing details
    if (process.env.SELF_HOSTED === 'true') {
      return res.json({
        planTier: user.planTier || 'free',
        projectLimit: -1, // Unlimited for self-hosted
        subscriptionStatus: 'self_hosted',
        hasActiveSubscription: false,
        nextBillingDate: null,
        cancelAtPeriodEnd: false,
        selfHosted: true
      });
    }

    logInfo('User billing details', {
      planTier: user.planTier,
      hasSubscription: !!user.subscriptionId,
      subscriptionStatus: user.subscriptionStatus
    });

    // Get user's current project count
    const { Project } = await import('../models/Project');
    const projectCount = await Project.countDocuments({
      $or: [{ userId: user._id }, { ownerId: user._id }],
      isArchived: false
    });

    let billingInfo: any = {
      planTier: user.planTier,
      projectLimit: user.projectLimit,
      projectCount: projectCount,
      subscriptionStatus: user.subscriptionStatus,
      hasActiveSubscription: user.subscriptionStatus === 'active',
      nextBillingDate: null,
      cancelAtPeriodEnd: false,
      subscriptionId: user.subscriptionId
    };

    // If user has a subscription, get additional details from Stripe
    if (user.subscriptionId && stripe) {
      logInfo('Fetching subscription details from Stripe');
      try {
        const subscription = await stripe.subscriptions.retrieve(user.subscriptionId, {
          expand: ['default_payment_method', 'items.data.price']
        });

        logInfo('Stripe subscription retrieved', {
          id: subscription.id,
          status: (subscription as any).status,
          currentPeriodEnd: (subscription as any).current_period_end,
          cancelAt: (subscription as any).cancel_at,
          cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
        });

        // Get the renewal date from the subscription items if not available at top level
        let renewalDate = (subscription as any).current_period_end;
        if (!renewalDate && (subscription as any).items?.data?.[0]?.current_period_end) {
          renewalDate = (subscription as any).items.data[0].current_period_end;
          logInfo('Using current_period_end from subscription item', { renewalDate });
        }
        // If subscription is cancelled, use cancel_at date
        if (!renewalDate && (subscription as any).cancel_at) {
          renewalDate = (subscription as any).cancel_at;
          logInfo('Using cancel_at date', { renewalDate });
        }

        billingInfo.nextBillingDate = renewalDate
          ? new Date(renewalDate * 1000).toISOString()
          : null;
        billingInfo.cancelAtPeriodEnd = (subscription as any).cancel_at_period_end || false;

        logInfo('Calculated billing dates', {
          nextBillingDate: billingInfo.nextBillingDate,
          cancelAtPeriodEnd: billingInfo.cancelAtPeriodEnd
        });

        // If cancelled, the subscription will end at the current period end
        if ((subscription as any).cancel_at_period_end) {
          billingInfo.subscriptionEndsAt = billingInfo.nextBillingDate;
        }

        // Update hasActiveSubscription based on actual subscription status
        billingInfo.hasActiveSubscription = ['active', 'trialing', 'past_due'].includes((subscription as any).status);

      } catch (stripeError) {
        logError('Error fetching subscription details from Stripe', stripeError as Error);
        // Continue without Stripe details rather than failing the request
      }
    } else {
      logInfo('No subscription ID or Stripe not configured', {
        hasSubscriptionId: !!user.subscriptionId,
        stripeConfigured: !!stripe
      });
    }

    res.json(billingInfo);
  } catch (error) {
    logError('Error fetching billing info', error as Error);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// Handle excess projects when downgrading
async function handleDowngradeExcess(userId: string, targetPlan: 'free' | 'pro' | 'premium') {
  const { Project } = await import('../models/Project');

  const targetLimit = PLAN_LIMITS[targetPlan];

  // If unlimited projects, no need to lock anything
  if (targetLimit === -1) {
    return;
  }

  // Find all active projects
  const projects = await Project.find({
    $or: [{ userId: userId }, { ownerId: userId }],
    isArchived: false
  }).sort({ updatedAt: -1 }); // Most recently updated first

  // If user has more projects than allowed, lock the excess oldest ones
  if (projects.length > targetLimit) {
    const projectsToLock = projects.slice(targetLimit);

    for (const project of projectsToLock) {
      project.isLocked = true;
      project.lockedReason = `Project locked due to plan downgrade. Upgrade to ${targetPlan === 'free' ? 'Pro' : 'Premium'} to unlock.`;
      await project.save();
    }

    logInfo('Locked excess projects on downgrade', {
      userId,
      targetPlan,
      lockedCount: projectsToLock.length
    });
  }
}

// Cancel subscription
router.post('/cancel-subscription', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if self-hosted mode is enabled
    if (process.env.SELF_HOSTED === 'true') {
      return res.status(501).json({ error: 'Billing is disabled in self-hosted mode' });
    }

    logInfo('Cancel subscription request', { userId: req.userId });

    const user = await User.findById(req.userId!);
    if (user) {
      logInfo('User cancellation details', {
        email: user.email,
        planTier: user.planTier,
        hasSubscriptionId: !!user.subscriptionId,
        subscriptionStatus: user.subscriptionStatus
      });
    }

    if (!user || !user.subscriptionId) {
      logWarn('No user or subscription ID found for cancellation', { userId: req.userId });
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Check if this is a fake subscription ID (for testing)
    if (user.subscriptionId.startsWith('sub_fake_')) {
      logInfo('Detected fake subscription ID - simulating cancellation');
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
      logError('Stripe not configured for cancellation');
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    logInfo('Attempting to cancel subscription');
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: true
    });
    logInfo('Subscription marked for cancellation at period end', { userId: user._id });

    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' });
  } catch (error) {
    logError('Error canceling subscription', error as Error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Resume cancelled subscription
router.post('/resume-subscription', billingRateLimit, requireAuth, async (req: AuthRequest, res) => {
  try {
    // Check if self-hosted mode is enabled
    if (process.env.SELF_HOSTED === 'true') {
      return res.status(501).json({ error: 'Billing is disabled in self-hosted mode' });
    }

    logInfo('Resume subscription request', { userId: req.userId });

    const user = await User.findById(req.userId!);
    if (!user || !user.subscriptionId) {
      logWarn('No subscription found to resume', { userId: req.userId });
      return res.status(404).json({ error: 'No subscription found to resume' });
    }

    if (!stripe) {
      logError('Stripe not configured for resume');
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    logInfo('Attempting to resume subscription');
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false
    });

    logInfo('Subscription resumed successfully', { userId: user._id });
    res.json({ success: true, message: 'Subscription resumed successfully' });
  } catch (error) {
    logError('Error resuming subscription', error as Error);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

export default router;