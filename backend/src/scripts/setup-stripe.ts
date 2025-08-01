import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

async function setupStripeProducts() {
  try {
    console.log('🚀 Setting up Stripe products and prices...');

    // Create Pro Plan Product
    const proProduct = await stripe.products.create({
      name: 'Project Manager Pro',
      description: '20 projects with advanced features',
      metadata: {
        plan: 'pro'
      }
    });

    // Create Pro Plan Price (Monthly)
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 500, // $5.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'pro'
      }
    });

    // Create Enterprise Plan Product
    const enterpriseProduct = await stripe.products.create({
      name: 'Project Manager Enterprise',
      description: 'Unlimited projects with premium features',
      metadata: {
        plan: 'enterprise'
      }
    });

    // Create Enterprise Plan Price (Monthly)
    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 2000, // $20.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      metadata: {
        plan: 'enterprise'
      }
    });

    console.log('\n✅ Products and prices created successfully!');
    console.log('\n📝 Add these to your backend .env file:');
    console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
    console.log(`STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`);
    
    console.log('\n🔗 Product URLs:');
    console.log(`Pro Product: https://dashboard.stripe.com/products/${proProduct.id}`);
    console.log(`Enterprise Product: https://dashboard.stripe.com/products/${enterpriseProduct.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
  }
}

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY environment variable is required');
  process.exit(1);
}

setupStripeProducts();