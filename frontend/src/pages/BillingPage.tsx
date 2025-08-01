import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { apiClient } from '../api/client';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface BillingInfo {
  planTier: 'free' | 'pro' | 'enterprise';
  projectLimit: number;
  subscriptionStatus: string;
  hasActiveSubscription: boolean;
}

const BillingPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise' | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: billingInfo, refetch } = useQuery({
    queryKey: ['billing-info'],
    queryFn: async (): Promise<BillingInfo> => {
      const response = await apiClient.get('/billing/info');
      return response.data;
    }
  });

  const plans = [
    {
      name: 'Free',
      id: 'free' as const,
      price: 0,
      projects: 3,
      features: [
        '3 Projects',
        'Basic Notes & Todos',
        'Basic Documentation',
        'Community Support'
      ],
      current: billingInfo?.planTier === 'free'
    },
    {
      name: 'Pro',
      id: 'pro' as const,
      price: 5,
      projects: 20,
      features: [
        '20 Projects',
        'Advanced Project Management',
        'Enhanced Documentation',
        'Priority Support',
        'Export Features'
      ],
      current: billingInfo?.planTier === 'pro'
    },
    {
      name: 'Enterprise',
      id: 'enterprise' as const,
      price: 20,
      projects: -1,
      features: [
        'Unlimited Projects',
        'Advanced Analytics',
        'Team Collaboration',
        'Admin Dashboard',
        'Custom Integrations',
        '24/7 Support'
      ],
      current: billingInfo?.planTier === 'enterprise'
    }
  ];

  const handleUpgrade = async (planTier: 'pro' | 'enterprise') => {
    setLoading(true);
    try {
      const response = await apiClient.post('/billing/create-checkout-session', {
        planTier
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    
    try {
      await apiClient.post('/billing/cancel-subscription');
      alert('Subscription canceled. You will retain access until the end of your billing period.');
      refetch();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-base-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-base-content mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-base-content/70">
            Scale your project management with the right plan for you
          </p>
        </div>

        {billingInfo && (
          <div className="mb-8 p-4 bg-base-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Current Plan: {billingInfo.planTier.toUpperCase()}</h2>
            <p>Project Limit: {billingInfo.projectLimit === -1 ? 'Unlimited' : billingInfo.projectLimit}</p>
            <p>Status: {billingInfo.subscriptionStatus}</p>
            <div className="flex gap-2 mt-2">
              {billingInfo.hasActiveSubscription && (
                <button 
                  onClick={handleCancelSubscription}
                  className="btn btn-outline btn-error btn-sm"
                >
                  Cancel Subscription
                </button>
              )}
              <button 
                onClick={async () => {
                  try {
                    await apiClient.post('/billing/update-plan-manual', { planTier: 'pro' });
                    refetch();
                    alert('Plan updated to Pro!');
                  } catch (e) { alert('Failed to update plan'); }
                }}
                className="btn btn-outline btn-primary btn-sm"
              >
                Fix Plan (Pro)
              </button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`card bg-base-200 shadow-xl ${
                plan.current ? 'ring-2 ring-primary' : ''
              } ${plan.id === 'pro' ? 'scale-105 bg-primary/10' : ''}`}
            >
              <div className="card-body text-center">
                {plan.id === 'pro' && (
                  <div className="badge badge-primary badge-lg mb-2">Most Popular</div>
                )}
                
                <h2 className="card-title justify-center text-2xl mb-2">
                  {plan.name}
                </h2>
                
                <div className="mb-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-base-content/60">/month</span>
                </div>

                <div className="mb-6">
                  <p className="text-lg font-semibold">
                    {plan.projects === -1 ? 'Unlimited' : plan.projects} Projects
                  </p>
                </div>

                <ul className="space-y-2 mb-6 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="card-actions">
                  {plan.current ? (
                    <button className="btn btn-outline w-full" disabled>
                      Current Plan
                    </button>
                  ) : plan.id === 'free' ? (
                    <button className="btn btn-ghost w-full" disabled>
                      Downgrade Contact Support
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading}
                      className="btn btn-primary w-full"
                    >
                      {loading ? 'Processing...' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-base-content/70 mb-4">
            All plans include 14-day free trial • Cancel anytime • Secure payments via Stripe
          </p>
          <div className="flex justify-center space-x-4 text-sm text-base-content/60">
            <span>✓ SSL Encrypted</span>
            <span>✓ PCI Compliant</span>
            <span>✓ 30-day Money Back</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;