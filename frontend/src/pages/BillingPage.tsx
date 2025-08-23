import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';

interface BillingInfo {
  planTier: 'free' | 'pro' | 'enterprise';
  projectLimit: number;
  subscriptionStatus: string;
  hasActiveSubscription: boolean;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  subscriptionEndsAt?: string | null;
  subscriptionId?: string | null;
}

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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
      current: billingInfo?.planTier === 'free',
      popular: false
    },
    {
      name: 'Pro',
      id: 'pro' as const,
      price: 5,
      projects: 20,
      features: [
        '20 Projects',
        'Advanced Development Tools',
        'Enhanced Documentation',
        'Priority Support',
        'Export Features'
      ],
      current: billingInfo?.planTier === 'pro',
      popular: true
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
      current: billingInfo?.planTier === 'enterprise',
      popular: false
    }
  ];

  const handleUpgrade = async (planTier: 'pro' | 'enterprise') => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiClient.post('/billing/create-checkout-session', {
        planTier
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to start checkout process. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setError(null);
    setSuccess(null);
    setShowCancelConfirm(false);
    
    try {
      const response = await apiClient.post('/billing/cancel-subscription');
      setSuccess(response.data.message || 'Subscription canceled. You will retain access until the end of your billing period.');
      refetch();
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to cancel subscription. Please try again.';
      setError(errorMessage);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setResumeLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiClient.post('/billing/resume-subscription');
      setSuccess(response.data.message || 'Subscription resumed successfully!');
      refetch();
    } catch (error: any) {
      console.error('Failed to resume subscription:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to resume subscription. Please try again.';
      setError(errorMessage);
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary gap-2 self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back to Projects</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          <div className="text-center sm:flex-1">
            <h1 className="text-2xl sm:text-4xl font-bold text-base-content">
              Billing & Plans
            </h1>
            <p className="text-sm sm:text-lg text-base-content/70 mt-1 sm:mt-2">
              Manage your subscription and upgrade your development workflow
            </p>
          </div>
          
          <div className="hidden sm:block w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Error/Success Notifications */}
        {error && (
          <div className="alert alert-error mb-6 shadow-lg">
            <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success mb-6 shadow-lg">
            <svg className="icon-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="btn btn-ghost btn-sm">
              <svg className="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Current Plan Status */}
        {billingInfo && (
          <div className="card-default mb-8 border border-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-center-gap-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="icon-md text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-base-content">Current Plan</h2>
                    <p className="text-base-content/60">Your active subscription details</p>
                  </div>
                </div>
                <div className="badge badge-primary badge-lg text-lg font-semibold px-4 py-3">
                  {billingInfo.planTier.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Project Limit</div>
                  <div className="stat-value text-2xl">
                    {billingInfo.projectLimit === -1 ? '∞' : billingInfo.projectLimit}
                  </div>
                  <div className="stat-desc">
                    {billingInfo.projectLimit === -1 ? 'Unlimited projects' : 'Active projects allowed'}
                  </div>
                </div>

                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Status</div>
                  <div className="stat-value text-2xl capitalize">
                    {billingInfo.subscriptionStatus === 'active' ? (
                      <span className="text-success">Active</span>
                    ) : (
                      <span className="text-warning">{billingInfo.subscriptionStatus}</span>
                    )}
                  </div>
                  <div className="stat-desc">Subscription status</div>
                </div>

                {billingInfo.nextBillingDate && (
                  <div className="stat bg-base-200 rounded-lg">
                    <div className="stat-title">
                      {billingInfo.cancelAtPeriodEnd ? 'Access Ends' : 'Renewal Date'}
                    </div>
                    <div className="stat-value text-lg">
                      {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="stat-desc">
                      {billingInfo.cancelAtPeriodEnd ? 'Plan expires on this date' : 'Next renewal & charge date'}
                    </div>
                  </div>
                )}

                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Actions</div>
                  <div className="stat-value text-sm">
                    {billingInfo.hasActiveSubscription && !billingInfo.cancelAtPeriodEnd && (
                      <button 
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={cancelLoading}
                        className="btn btn-outline btn-error btn-sm"
                      >
                        {cancelLoading ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Canceling...
                          </>
                        ) : (
                          'Cancel Plan'
                        )}
                      </button>
                    )}
                    {billingInfo.cancelAtPeriodEnd && (
                      <button 
                        onClick={handleResumeSubscription}
                        disabled={resumeLoading}
                        className="btn btn-success btn-sm"
                      >
                        {resumeLoading ? (
                          <>
                            <span className="loading loading-spinner loading-xs"></span>
                            Resuming...
                          </>
                        ) : (
                          'Resume Plan'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {billingInfo.cancelAtPeriodEnd && billingInfo.nextBillingDate && (
                <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="icon-md text-warning mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-warning mb-1">Subscription Cancelled</h4>
                      <p className="text-sm text-base-content/80">
                        You'll continue to have access to your {billingInfo.planTier} plan until{' '}
                        <strong>
                          {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </strong>
                        . After that, your account will be downgraded to the free plan. You can resume your subscription anytime before this date.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!billingInfo.cancelAtPeriodEnd && billingInfo.hasActiveSubscription && billingInfo.nextBillingDate && (
                <div className="mt-6 p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="icon-md text-success mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-success mb-1">Active Subscription</h4>
                      <p className="text-sm text-base-content/80">
                        Your {billingInfo.planTier} plan will automatically renew on{' '}
                        <strong>
                          {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </strong>
                        . You can cancel anytime and still enjoy your plan benefits until the end of the billing period.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-base-content mb-4">
            Choose Your Plan
          </h2>
          <p className="text-xl text-base-content/70">
            Scale your development workflow with the right plan for you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className={`card-default border-2 transition-all duration-200 hover:shadow-2xl ${
                plan.current ? 'border-primary ring-2 ring-primary/20' : 'border-base-300 hover:border-primary/50'
              } ${plan.popular ? 'transform lg:scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="badge badge-primary badge-lg text-white font-semibold px-4 py-2">
                    Most Popular
                  </div>
                </div>
              )}
              
              <div className="card-body text-center relative">
                {plan.current && (
                  <div className="absolute top-4 right-4">
                    <div className="badge badge-success gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Current
                    </div>
                  </div>
                )}
                
                <h3 className="text-2xl font-bold text-base-content mb-2">
                  {plan.name}
                </h3>
                
                <div className="mb-6">
                  <span className="text-5xl font-bold text-primary">${plan.price}</span>
                  <span className="text-base-content/60 text-lg">/month</span>
                </div>

                <div className="mb-6">
                  <p className="text-xl font-semibold text-base-content">
                    {plan.projects === -1 ? 'Unlimited' : plan.projects} Projects
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex-center-gap-2">
                      <svg className="icon-md text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-base-content">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="card-actions">
                  {plan.current ? (
                    <>
                      {plan.id !== 'free' && billingInfo?.hasActiveSubscription && !billingInfo?.cancelAtPeriodEnd && (
                        <button 
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={cancelLoading}
                          className="btn btn-outline btn-error w-full"
                        >
                          {cancelLoading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Canceling...
                            </>
                          ) : (
                            <>
                              <svg className="icon-sm mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Plan
                            </>
                          )}
                        </button>
                      )}
                      {plan.id !== 'free' && billingInfo?.cancelAtPeriodEnd && (
                        <button 
                          onClick={handleResumeSubscription}
                          disabled={resumeLoading}
                          className="btn btn-success w-full"
                        >
                          {resumeLoading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Resuming...
                            </>
                          ) : (
                            <>
                              <svg className="icon-sm mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.001 8.001 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Resume Plan
                            </>
                          )}
                        </button>
                      )}
                      {plan.id === 'free' && (
                        <button className="btn btn-outline w-full" disabled>
                          <svg className="icon-sm mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Current Plan
                        </button>
                      )}
                    </>
                  ) : plan.id === 'free' ? (
                    <></>
                  ) : (
                    <button 
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading}
                      className={`btn w-full ${plan.popular ? 'btn-primary' : 'btn-outline btn-primary'}`}
                    >
                      {loading ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="icon-sm mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                          Choose Plan
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="text-center py-8 border-t border-base-300">
          <p className="text-base-content/70 mb-4 text-lg">
            Trusted by developers worldwide • Cancel anytime
          </p>
          <div className="flex justify-center items-center space-x-8 text-base-content/60">
            <div className="flex-center-gap-2">
              <svg className="icon-md text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>SSL Encrypted</span>
            </div>
            <div className="flex-center-gap-2">
              <svg className="icon-md text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span>PCI Compliant</span>
            </div>
            <div className="flex-center-gap-2">
              <svg className="icon-md text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>30-day Money Back</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelConfirm}
        onConfirm={handleCancelSubscription}
        onCancel={() => setShowCancelConfirm(false)}
        title="Cancel Subscription"
        message="Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period, but you won't be charged again."
        confirmText={cancelLoading ? "Canceling..." : "Cancel Subscription"}
        cancelText="Keep Subscription"
        variant="warning"
      />
    </div>
  );
};

export default BillingPage;