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
    const enterpriseProduct = existingProducts.data.find(p => p.metadata?.plan === 'enterprise');

    let proProductId: string;
    let enterpriseProductId: string;

    // Create or use existing Pro Product
    if (proProduct) {
      console.log('✅ Pro product already exists:', proProduct.id);
      proProductId = proProduct.id;
    } else {
      const newProProduct = await stripe.products.create({
        name: 'Project Manager Pro',
        description: '20 projects with advanced features',
        metadata: {
          plan: 'pro'
        }
      });
      proProductId = newProProduct.id;
      console.log('✅ Created Pro product:', proProductId);
    }

    // Create or use existing Enterprise Product
    if (enterpriseProduct) {
      console.log('✅ Enterprise product already exists:', enterpriseProduct.id);
      enterpriseProductId = enterpriseProduct.id;
    } else {
      const newEnterpriseProduct = await stripe.products.create({
        name: 'Project Manager Enterprise',
        description: 'Unlimited projects with premium features',
        metadata: {
          plan: 'enterprise'
        }
      });
      enterpriseProductId = newEnterpriseProduct.id;
      console.log('✅ Created Enterprise product:', enterpriseProductId);
    }

    // Check existing prices
    const existingPrices = await stripe.prices.list({ limit: 100 });
    const proPrices = existingPrices.data.filter(p => p.product === proProductId);
    const enterprisePrices = existingPrices.data.filter(p => p.product === enterpriseProductId);

    let proPriceId: string;
    let enterprisePriceId: string;

    // Create or use existing Pro Price
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

    // Create or use existing Enterprise Price
    const existingEnterprisePrice = enterprisePrices.find(p => p.unit_amount === 2000 && p.recurring?.interval === 'month');
    if (existingEnterprisePrice) {
      console.log('✅ Enterprise price already exists:', existingEnterprisePrice.id);
      enterprisePriceId = existingEnterprisePrice.id;
    } else {
      const newEnterprisePrice = await stripe.prices.create({
        product: enterpriseProductId,
        unit_amount: 2000, // $20.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          plan: 'enterprise'
        }
      });
      enterprisePriceId = newEnterprisePrice.id;
      console.log('✅ Created Enterprise price:', enterprisePriceId);
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📝 Add these to your backend .env file:');
    console.log(`STRIPE_PRO_PRICE_ID=${proPriceId}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePriceId}`);
    
    console.log('\n🔗 Product URLs:');
    console.log(`Pro Product: https://dashboard.stripe.com/products/${proProductId}`);
    console.log(`Enterprise Product: https://dashboard.stripe.com/products/${enterpriseProductId}`);

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
    console.log('2. Use your production domain: https://yourdomain.com/api/billing/webhook');
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
