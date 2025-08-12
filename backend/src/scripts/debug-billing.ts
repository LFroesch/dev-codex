#!/usr/bin/env ts-node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

async function debugBilling() {
  try {
    console.log('🔍 Starting billing system debug...\n');

    // Connect to database
    await connectDatabase();

    // Check environment variables
    console.log('=== ENVIRONMENT CHECK ===');
    console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
    console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '❌ Missing');
    console.log('STRIPE_PRO_PRICE_ID:', process.env.STRIPE_PRO_PRICE_ID ? '✅ Set' : '❌ Missing');
    console.log('STRIPE_ENTERPRISE_PRICE_ID:', process.env.STRIPE_ENTERPRISE_PRICE_ID ? '✅ Set' : '❌ Missing');
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL || '❌ Missing');
    console.log('');

    // Check Stripe connectivity
    console.log('=== STRIPE CONNECTIVITY ===');
    try {
      const account = await stripe.accounts.retrieve();
      console.log('✅ Stripe connection successful');
      console.log('Account ID:', account.id);
      console.log('Account email:', account.email);
      console.log('');
    } catch (error) {
      console.log('❌ Stripe connection failed:', error);
      console.log('');
    }

    // Check products and prices
    console.log('=== STRIPE PRODUCTS & PRICES ===');
    try {
      const products = await stripe.products.list({ limit: 10 });
      console.log('Products found:', products.data.length);
      
      for (const product of products.data) {
        console.log(`- ${product.name} (${product.id})`);
        if (product.metadata?.plan) {
          console.log(`  Plan: ${product.metadata.plan}`);
        }
      }

      const prices = await stripe.prices.list({ limit: 20 });
      console.log('\\nPrices found:', prices.data.length);
      
      for (const price of prices.data) {
        if (price.recurring) {
          console.log(`- $${(price.unit_amount || 0) / 100}/${price.recurring.interval} (${price.id})`);
          if (price.metadata?.plan) {
            console.log(`  Plan: ${price.metadata.plan}`);
          }
        }
      }
      console.log('');
    } catch (error) {
      console.log('❌ Error fetching Stripe products/prices:', error);
      console.log('');
    }

    // Check users with subscriptions
    console.log('=== DATABASE USERS ===');
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({ planTier: { $ne: 'free' } });
    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'active' });
    
    console.log('Total users:', totalUsers);
    console.log('Paid users:', paidUsers);
    console.log('Active subscriptions:', activeSubscriptions);
    console.log('');

    // Show recent subscription users
    const recentPaidUsers = await User.find({ 
      planTier: { $ne: 'free' } 
    }).select('email planTier subscriptionStatus subscriptionId stripeCustomerId').limit(10);

    if (recentPaidUsers.length > 0) {
      console.log('Recent paid users:');
      for (const user of recentPaidUsers) {
        console.log(`- ${user.email}: ${user.planTier} (${user.subscriptionStatus})`);
        console.log(`  Subscription ID: [REDACTED]`);
        console.log(`  Customer ID: [REDACTED]`);
        console.log('');
      }
    }

    // Check webhook endpoints
    console.log('=== WEBHOOK ENDPOINTS ===');
    try {
      const webhookEndpoints = await stripe.webhookEndpoints.list();
      console.log('Webhook endpoints configured:', webhookEndpoints.data.length);
      
      for (const endpoint of webhookEndpoints.data) {
        console.log(`- ${endpoint.url}`);
        console.log(`  Status: ${endpoint.status}`);
        console.log(`  Events: ${endpoint.enabled_events.join(', ')}`);
        console.log('');
      }
    } catch (error) {
      console.log('❌ Error fetching webhook endpoints:', error);
      console.log('');
    }

    console.log('🎉 Debug completed!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  debugBilling();
}

export { debugBilling };
