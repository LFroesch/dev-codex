#!/usr/bin/env ts-node
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
});

async function setupStripeProducts() {
  try {
    console.log('🚀 Setting up Stripe products and prices...\n');

    // Check if products already exist
    const existingProducts = await stripe.products.list({ limit: 100 });
    const proProduct = existingProducts.data.find(p => p.metadata?.plan === 'pro');
    const premiumProduct = existingProducts.data.find(p => p.metadata?.plan === 'premium');

    let proProductId: string;
    let premiumProductId: string;

    // Create or use existing Pro Product
    if (proProduct) {
      console.log('✅ Pro product already exists:', proProduct.id);
      proProductId = proProduct.id;
    } else {
      const newProProduct = await stripe.products.create({
        name: 'Dev Codex Pro',
        description: '20 projects, 500k AI tokens/mo, 10 team members/project',
        metadata: {
          plan: 'pro'
        }
      });
      proProductId = newProProduct.id;
      console.log('✅ Created Pro product:', proProductId);
    }

    // Create or use existing Premium Product
    if (premiumProduct) {
      console.log('✅ Premium product already exists:', premiumProduct.id);
      premiumProductId = premiumProduct.id;
    } else {
      const newPremiumProduct = await stripe.products.create({
        name: 'Dev Codex Premium',
        description: 'Unlimited projects, 2M AI tokens/mo, unlimited team members',
        metadata: {
          plan: 'premium'
        }
      });
      premiumProductId = newPremiumProduct.id;
      console.log('✅ Created Premium product:', premiumProductId);
    }

    // Check existing prices
    const existingPrices = await stripe.prices.list({ limit: 100 });
    const proPrices = existingPrices.data.filter(p => p.product === proProductId);
    const premiumPrices = existingPrices.data.filter(p => p.product === premiumProductId);

    let proPriceId: string;
    let premiumPriceId: string;

    // Create or use existing Pro Price ($5/mo)
    const existingProPrice = proPrices.find(p => p.unit_amount === 500 && p.recurring?.interval === 'month');
    if (existingProPrice) {
      console.log('✅ Pro price already exists:', existingProPrice.id);
      proPriceId = existingProPrice.id;
    } else {
      const newProPrice = await stripe.prices.create({
        product: proProductId,
        unit_amount: 500, // $5.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan: 'pro'
        }
      });
      proPriceId = newProPrice.id;
      console.log('✅ Created Pro price:', proPriceId);
    }

    // Create or use existing Premium Price ($15/mo)
    const existingPremiumPrice = premiumPrices.find(p => p.unit_amount === 1500 && p.recurring?.interval === 'month');
    if (existingPremiumPrice) {
      console.log('✅ Premium price already exists:', existingPremiumPrice.id);
      premiumPriceId = existingPremiumPrice.id;
    } else {
      const newPremiumPrice = await stripe.prices.create({
        product: premiumProductId,
        unit_amount: 1500, // $15.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan: 'premium'
        }
      });
      premiumPriceId = newPremiumPrice.id;
      console.log('✅ Created Premium price:', premiumPriceId);
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📝 Add these to your backend .env file:');
    console.log(`STRIPE_PRO_PRICE_ID=${proPriceId}`);
    console.log(`STRIPE_PREMIUM_PRICE_ID=${premiumPriceId}`);

    console.log('\n🔗 Product URLs:');
    console.log(`Pro Product: https://dashboard.stripe.com/products/${proProductId}`);
    console.log(`Premium Product: https://dashboard.stripe.com/products/${premiumProductId}`);

    console.log('\n⚠️  Next steps for LOCAL DEVELOPMENT:');
    console.log('1. Update your .env file with the price IDs above');
    console.log('2. Install Stripe CLI: https://stripe.com/docs/stripe-cli');
    console.log('3. Login to Stripe CLI: stripe login');
    console.log('4. Forward webhooks to your local server:');
    console.log('   stripe listen --forward-to localhost:5003/api/billing/webhook');
    console.log('5. Copy the webhook signing secret from the CLI output and add it to .env:');
    console.log('   STRIPE_WEBHOOK_SECRET=whsec_...');
    console.log('\n🚀 For PRODUCTION:');
    console.log('1. Create webhook endpoint in Stripe Dashboard');
    console.log('2. Use your production domain: https://dev-codex.com/api/billing/webhook');
    console.log('3. Add these events to your webhook:');
    console.log('   - checkout.session.completed');
    console.log('   - customer.subscription.created');
    console.log('   - customer.subscription.updated');
    console.log('   - customer.subscription.deleted');
    console.log('   - invoice.payment_succeeded');
    console.log('   - invoice.payment_failed');

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe error details:', error.message);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  setupStripeProducts();
}

export { setupStripeProducts };
