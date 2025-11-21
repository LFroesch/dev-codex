import express from 'express';
import Stripe from 'stripe';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import { createRateLimit } from '../middleware/rateLimit';
import { logInfo, logError, logWarn } from '../config/logger';
import NotificationService from '../services/notificationService';
import {
  sendEmail,
  sendSubscriptionConfirmationEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionExpiredEmail,
  sendPlanDowngradeEmail
} from '../services/emailService';

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
router.post('/create-checkout-session', billingRateLimit, requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
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

  const previousPlan = user.planTier;

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

  // Send subscription confirmation email
  try {
    await sendSubscriptionConfirmationEmail(
      user.email,
      user.firstName || 'there',
      planTier
    );
    logInfo('Subscription confirmation email sent', { userId, planTier });
  } catch (error) {
    logError('Failed to send subscription confirmation email', error as Error);
    // Don't fail the whole process if email fails
  }

  // Track conversion/upgrade event
  try {
    const { AnalyticsService } = await import('../middleware/analytics');

    // Calculate conversion value (price in dollars)
    const conversionValue = planTier === 'pro' ? 10 : 25;

    // Track checkout completion
    await AnalyticsService.trackEvent(
      userId,
      'checkout_completed',
      {
        plan: planTier,
        amount: conversionValue,
        stripeSessionId: session.id,
        previousPlan: previousPlan,
        category: 'business',
        isConversion: true,
        conversionValue: conversionValue
      }
    );

    // Track user upgrade event
    await AnalyticsService.trackEvent(
      userId,
      'user_upgraded',
      {
        fromPlan: previousPlan,
        toPlan: planTier,
        category: 'business',
        isConversion: true,
        conversionValue: conversionValue
      }
    );

    logInfo('Tracked conversion analytics', { userId, fromPlan: previousPlan, toPlan: planTier });
  } catch (error) {
    logError('Failed to track conversion analytics', error as Error);
  }
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

    // Send appropriate email based on status
    try {
      if (subscription.status === 'canceled') {
        await sendSubscriptionCancelledEmail(
          user.email,
          user.firstName || 'there',
          oldPlanTier,
          new Date((subscription as any).current_period_end * 1000)
        );
        logInfo('Subscription cancelled email sent', { userId: user._id });
      } else if (subscription.status === 'incomplete_expired') {
        await sendSubscriptionExpiredEmail(
          user.email,
          user.firstName || 'there',
          oldPlanTier
        );
        logInfo('Subscription expired email sent', { userId: user._id });
      }
    } catch (error) {
      logError('Failed to send subscription status email', error as Error);
      // Don't fail the whole process if email fails
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

        // Determine if this is an upgrade or downgrade
        const planHierarchy = { free: 0, pro: 1, premium: 2 };
        const isUpgrade = planHierarchy[newPlanTier] > planHierarchy[oldPlanTier];

        if (isUpgrade) {
          // Unlock projects on upgrade
          await handleUpgradeUnlock(user._id.toString(), newPlanTier);
        } else {
          // Lock excess projects on downgrade (e.g., premium -> pro)
          await handleDowngradeExcess(user._id.toString(), newPlanTier);

          // Send downgrade email
          try {
            await sendPlanDowngradeEmail(
              user.email,
              user.firstName || 'there',
              oldPlanTier,
              newPlanTier
            );
            logInfo('Plan downgrade email sent', { userId: user._id, from: oldPlanTier, to: newPlanTier });
          } catch (error) {
            logError('Failed to send plan downgrade email', error as Error);
            // Don't fail the whole process if email fails
          }
        }
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

// Send email notification for locked projects
async function sendProjectsLockedEmail(user: any, lockedProjects: any[], planTier: string) {
  try {
    const projectList = lockedProjects.map(p => `  • ${p.name}`).join('\n');

    const html = `
      <h2>Projects Locked Due to Plan Change</h2>
      <p>Hi ${user.firstName},</p>
      <p>Your subscription plan has changed to <strong>${planTier}</strong>. As a result, ${lockedProjects.length} project${lockedProjects.length > 1 ? 's have' : ' has'} been locked because you've exceeded your plan limit.</p>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Locked Projects:</strong><br>
        <pre style="margin: 10px 0;">${projectList}</pre>
      </div>

      <p>These projects are in <strong>read-only mode</strong>. You can still view them, but you won't be able to make changes.</p>

      <p><strong>To unlock these projects:</strong></p>
      <ul>
        <li>Upgrade your plan to ${planTier === 'free' ? 'Pro or Premium' : 'Premium'}</li>
        <li>Or archive some of your active projects to fit within your current plan limit</li>
      </ul>

      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5002'}/billing" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Manage Subscription</a></p>

      <p>Best regards,<br>Dev Codex Team</p>
    `;

    const text = `Projects Locked Due to Plan Change\n\nHi ${user.firstName},\n\nYour subscription plan has changed to ${planTier}. As a result, ${lockedProjects.length} project${lockedProjects.length > 1 ? 's have' : ' has'} been locked because you've exceeded your plan limit.\n\nLocked Projects:\n${projectList}\n\nThese projects are in read-only mode. You can still view them, but you won't be able to make changes.\n\nTo unlock these projects:\n- Upgrade your plan to ${planTier === 'free' ? 'Pro or Premium' : 'Premium'}\n- Or archive some of your active projects to fit within your current plan limit\n\nManage Subscription: ${process.env.FRONTEND_URL || 'http://localhost:5002'}/billing\n\nBest regards,\nDev Codex Team`;

    await sendEmail({
      to: user.email,
      subject: `${lockedProjects.length} Project${lockedProjects.length > 1 ? 's' : ''} Locked - Plan Change`,
      text,
      html
    });

    logInfo('Sent projects locked email', { userId: user._id, count: lockedProjects.length });
  } catch (error) {
    logError('Failed to send projects locked email', error as Error);
  }
}

// Send email notification for unlocked projects
async function sendProjectsUnlockedEmail(user: any, unlockedProjects: any[], planTier: string) {
  try {
    const projectList = unlockedProjects.map(p => `  • ${p.name}`).join('\n');

    const html = `
      <h2>Projects Unlocked - Plan Upgrade</h2>
      <p>Hi ${user.firstName},</p>
      <p>Great news! Your subscription plan has been upgraded to <strong>${planTier}</strong>. As a result, ${unlockedProjects.length} previously locked project${unlockedProjects.length > 1 ? 's have' : ' has'} been unlocked.</p>

      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
        <strong>Unlocked Projects:</strong><br>
        <pre style="margin: 10px 0;">${projectList}</pre>
      </div>

      <p>You now have <strong>full access</strong> to these projects and can make changes again!</p>

      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5002'}/projects" style="background: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">View Your Projects</a></p>

      <p>Thank you for your continued support!</p>
      <p>Best regards,<br>Dev Codex Team</p>
    `;

    const text = `Projects Unlocked - Plan Upgrade\n\nHi ${user.firstName},\n\nGreat news! Your subscription plan has been upgraded to ${planTier}. As a result, ${unlockedProjects.length} previously locked project${unlockedProjects.length > 1 ? 's have' : ' has'} been unlocked.\n\nUnlocked Projects:\n${projectList}\n\nYou now have full access to these projects and can make changes again!\n\nView Your Projects: ${process.env.FRONTEND_URL || 'http://localhost:5002'}/projects\n\nThank you for your continued support!\n\nBest regards,\nDev Codex Team`;

    await sendEmail({
      to: user.email,
      subject: `${unlockedProjects.length} Project${unlockedProjects.length > 1 ? 's' : ''} Unlocked - Welcome Back!`,
      text,
      html
    });

    logInfo('Sent projects unlocked email', { userId: user._id, count: unlockedProjects.length });
  } catch (error) {
    logError('Failed to send projects unlocked email', error as Error);
  }
}

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

    // Send notification and email
    const user = await User.findById(userId);
    if (user && projectsToLock.length > 0) {
      const notificationService = NotificationService.getInstance();

      // Create in-app notification
      await notificationService.createNotification({
        userId: user._id,
        type: 'projects_locked',
        title: `${projectsToLock.length} Project${projectsToLock.length > 1 ? 's' : ''} Locked`,
        message: `${projectsToLock.length} of your projects ${projectsToLock.length > 1 ? 'have' : 'has'} been locked due to your plan change to ${targetPlan}. Upgrade to unlock them.`,
        actionUrl: '/billing',
        metadata: {
          lockedProjectIds: projectsToLock.map(p => p._id.toString()),
          lockedProjectNames: projectsToLock.map(p => p.name),
          planTier: targetPlan
        }
      });

      // Send email notification
      await sendProjectsLockedEmail(user, projectsToLock, targetPlan);
    }
  }
}

// Handle unlocking projects when upgrading
async function handleUpgradeUnlock(userId: string, newPlan: 'free' | 'pro' | 'premium') {
  const { Project } = await import('../models/Project');

  const newLimit = PLAN_LIMITS[newPlan];

  // If unlimited projects, unlock all
  if (newLimit === -1) {
    const lockedProjects = await Project.find({
      $or: [{ userId: userId }, { ownerId: userId }],
      isLocked: true
    });

    for (const project of lockedProjects) {
      project.isLocked = false;
      project.lockedReason = undefined;
      await project.save();
    }

    logInfo('Unlocked all projects on upgrade to unlimited', {
      userId,
      newPlan,
      unlockedCount: lockedProjects.length
    });

    // Send notification if any were unlocked
    if (lockedProjects.length > 0) {
      const user = await User.findById(userId);
      if (user) {
        const notificationService = NotificationService.getInstance();

        await notificationService.createNotification({
          userId: user._id,
          type: 'projects_unlocked',
          title: `${lockedProjects.length} Project${lockedProjects.length > 1 ? 's' : ''} Unlocked`,
          message: `Great news! ${lockedProjects.length} of your projects ${lockedProjects.length > 1 ? 'have' : 'has'} been unlocked with your upgrade to ${newPlan}.`,
          actionUrl: '/projects',
          metadata: {
            unlockedProjectIds: lockedProjects.map(p => p._id.toString()),
            unlockedProjectNames: lockedProjects.map(p => p.name),
            planTier: newPlan
          }
        });

        await sendProjectsUnlockedEmail(user, lockedProjects, newPlan);
      }
    }

    return;
  }

  // Find locked projects sorted by most recently updated
  const lockedProjects = await Project.find({
    $or: [{ userId: userId }, { ownerId: userId }],
    isLocked: true
  }).sort({ updatedAt: -1 });

  // Count active (non-locked, non-archived) projects
  const activeProjects = await Project.countDocuments({
    $or: [{ userId: userId }, { ownerId: userId }],
    isArchived: false,
    isLocked: false
  });

  // Calculate how many we can unlock
  const slotsAvailable = newLimit - activeProjects;

  if (slotsAvailable > 0 && lockedProjects.length > 0) {
    const projectsToUnlock = lockedProjects.slice(0, slotsAvailable);

    for (const project of projectsToUnlock) {
      project.isLocked = false;
      project.lockedReason = undefined;
      await project.save();
    }

    logInfo('Unlocked projects on upgrade', {
      userId,
      newPlan,
      unlockedCount: projectsToUnlock.length
    });

    // Send notification and email
    const user = await User.findById(userId);
    if (user) {
      const notificationService = NotificationService.getInstance();

      await notificationService.createNotification({
        userId: user._id,
        type: 'projects_unlocked',
        title: `${projectsToUnlock.length} Project${projectsToUnlock.length > 1 ? 's' : ''} Unlocked`,
        message: `Great news! ${projectsToUnlock.length} of your projects ${projectsToUnlock.length > 1 ? 'have' : 'has'} been unlocked with your upgrade to ${newPlan}.`,
        actionUrl: '/projects',
        metadata: {
          unlockedProjectIds: projectsToUnlock.map(p => p._id.toString()),
          unlockedProjectNames: projectsToUnlock.map(p => p.name),
          planTier: newPlan
        }
      });

      await sendProjectsUnlockedEmail(user, projectsToUnlock, newPlan);
    }
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