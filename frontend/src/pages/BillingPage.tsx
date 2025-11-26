import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from '../services/toast';
import { getContrastTextColor } from '../utils/contrastTextColor';

interface BillingInfo {
  planTier: 'free' | 'pro' | 'premium';
  projectLimit: number;
  subscriptionStatus: string;
  hasActiveSubscription: boolean;
  nextBillingDate?: string | null;
  cancelAtPeriodEnd?: boolean;
  subscriptionEndsAt?: string | null;
  subscriptionId?: string | null;
  projectCount?: number;
}

const BillingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
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
      price: 10,
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
      name: 'Premium',
      id: 'premium' as const,
      price: 20,
      projects: 50,
      features: [
        '50 Projects',
        'Advanced Analytics',
        'Team Collaboration',
        'Admin Dashboard',
        'Custom Integrations',
        '24/7 Support'
      ],
      current: billingInfo?.planTier === 'premium',
      popular: false
    }
  ];

  const handleUpgrade = async (planTier: 'pro' | 'premium') => {
    setLoading(true);
    
    try {
      const response = await apiClient.post('/billing/create-checkout-session', {
        planTier
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to start checkout process. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    setShowCancelConfirm(false);
    
    try {
      const response = await apiClient.post('/billing/cancel-subscription');
      toast.success(response.data.message || 'Subscription canceled. You will retain access until the end of your billing period.');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to cancel subscription. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setResumeLoading(true);
    
    try {
      const response = await apiClient.post('/billing/resume-subscription');
      toast.success(response.data.message || 'Subscription resumed successfully!');
      refetch();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to resume subscription. Please try again.';
      toast.error(errorMessage);
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="max-w-7xl mx-auto p-2">
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

        {/* Excess Projects Warning Banner */}
        {billingInfo && billingInfo.cancelAtPeriodEnd && billingInfo.projectCount && billingInfo.projectCount > 3 && (
          <div className="alert alert-warning mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="font-bold">Project Limit Warning</h3>
              <div className="text-sm">
                You have <strong>{billingInfo.projectCount} projects</strong> but the free plan allows only <strong>3</strong>.
                When your subscription ends on <strong>{billingInfo.subscriptionEndsAt ? new Date(billingInfo.subscriptionEndsAt).toLocaleDateString() : billingInfo.nextBillingDate ? new Date(billingInfo.nextBillingDate).toLocaleDateString() : 'the end date'}</strong>,
                your <strong>{billingInfo.projectCount - 3} oldest projects will be locked</strong> (read-only).
                You can unlock them by upgrading again.
              </div>
            </div>
          </div>
        )}

        {/* Current Plan Status */}
        {billingInfo && (
          <div className={`card-default mb-8 border-2 ${
            billingInfo.planTier === 'free'
              ? 'border-thick border-base-content/40'
              : 'border-primary shadow-lg'
          }`}>
            <div className="card-body">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-base-content/10">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center ${
                    billingInfo.planTier === 'free'
                      ? 'bg-base-300'
                      : 'bg-primary/20'
                  }`}>
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-base-content">Current Plan</h2>
                    <p className="text-sm text-base-content/60">Your subscription overview</p>
                  </div>
                </div>
                <div className="badge badge-primary badge-lg text-base sm:text-lg font-semibold px-4 py-3" style={{ color: getContrastTextColor('primary') }}>
                  {billingInfo.planTier.toUpperCase()}
                </div>
              </div>

              {/* Stats Grid */}
              <div className={`grid gap-4 sm:gap-6 mt-6 ${
                billingInfo.hasActiveSubscription && billingInfo.nextBillingDate
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1 sm:grid-cols-2'
              }`}>
                {/* Project Limit */}
                <div className="stat bg-base-200 rounded-lg border border-thick border-base-content/20 p-4">
                  <div className="stat-title text-xs sm:text-sm text-base-content/60 mb-2">Project Limit</div>
                  <div className="stat-value text-2xl sm:text-3xl text-primary font-bold mb-1">
                    {billingInfo.projectLimit === -1 ? '∞' : billingInfo.projectLimit}
                  </div>
                  <div className="stat-desc text-xs text-base-content/70">
                    {billingInfo.projectLimit === -1 ? 'Unlimited projects' : 'Active projects allowed'}
                  </div>
                </div>

                {/* Status */}
                <div className="stat bg-base-200 rounded-lg border border-thick border-base-content/20 p-4">
                  <div className="stat-title text-xs sm:text-sm text-base-content/60 mb-2">Status</div>
                  <div className="stat-value text-base sm:text-lg mb-1">
                    {billingInfo.subscriptionStatus === 'active' ? (
                      <span className="badge badge-success badge-lg gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Active
                      </span>
                    ) : (
                      <span className="badge badge-warning badge-lg capitalize">{billingInfo.subscriptionStatus}</span>
                    )}
                  </div>
                  <div className="stat-desc text-xs text-base-content/70">Subscription status</div>
                </div>

                {/* Billing Date */}
                {billingInfo.nextBillingDate && (
                  <div className="stat bg-base-200 rounded-lg border border-thick border-base-content/20 p-4">
                    <div className="stat-title text-xs sm:text-sm text-base-content/60 mb-2">
                      {billingInfo.cancelAtPeriodEnd ? 'Access Ends' : 'Next Renewal'}
                    </div>
                    <div className="stat-value text-base sm:text-lg text-base-content font-semibold mb-1">
                      {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="stat-desc text-xs text-base-content/70">
                      {billingInfo.cancelAtPeriodEnd ? 'Plan expires on this date' : 'Automatic renewal date'}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons - Only show if there are active subscription actions */}
              {billingInfo.hasActiveSubscription && (
                <div className="mt-6 pt-6 border-t border-base-content/10">
                  <div className="flex flex-wrap gap-3">
                    {!billingInfo.cancelAtPeriodEnd ? (
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
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancel Subscription
                          </>
                        )}
                      </button>
                    ) : (
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
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Resume Subscription
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Warning/Info Alerts */}
              {billingInfo.cancelAtPeriodEnd && billingInfo.nextBillingDate && (
                <div className="mt-6 p-4 bg-warning/10 border-2 border-warning/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-warning mb-1">Subscription Ending</h4>
                      <p className="text-sm text-base-content/80">
                        You'll have access to your <strong className="capitalize">{billingInfo.planTier}</strong> plan until{' '}
                        <strong>
                          {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </strong>
                        . After that, your account will revert to the Free plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!billingInfo.cancelAtPeriodEnd && billingInfo.hasActiveSubscription && billingInfo.nextBillingDate && (
                <div className="mt-6 p-4 bg-success/10 border-2 border-success/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-success mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-success mb-1">Active Subscription</h4>
                      <p className="text-sm text-base-content/80">
                        Your <strong className="capitalize">{billingInfo.planTier}</strong> plan renews on{' '}
                        <strong>
                          {new Date(billingInfo.nextBillingDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </strong>
                        . Cancel anytime to retain access until the billing period ends.
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
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-base-content mb-4">
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
                plan.current ? 'border-primary ring-2 ring-primary/20' : 'border-thick border-base-content/40 hover:border-primary/50'
              } ${plan.popular ? 'transform lg:scale-105' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="badge badge-primary badge-lg font-semibold px-4 py-2" style={{ color: getContrastTextColor('primary') }}>
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

        {/* Open Source Section */}
        <div className="card-default border-2 border-base-content/20 mt-8">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-base-content mb-3">
              Free & Open Source
            </h3>
            <p className="text-base-content/70 max-w-2xl mx-auto mb-6">
              This project is open source! You can use this cloud-hosted version with our managed infrastructure,
              or download and self-host the application on your own servers for free.
            </p>
            <a
              href="https://github.com/LFroesch/project-management"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-primary gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelConfirm}
        onConfirm={handleCancelSubscription}
        onCancel={() => setShowCancelConfirm(false)}
        title="Cancel Subscription"
        message={
          billingInfo && billingInfo.projectCount && billingInfo.projectCount > 3
            ? `Are you sure you want to cancel your subscription? You have ${billingInfo.projectCount} projects, but the free plan allows only 3. Your ${billingInfo.projectCount - 3} oldest projects will be locked (read-only) when your subscription ends. You'll retain access until the end of your billing period.`
            : "Are you sure you want to cancel your subscription? You'll retain access until the end of your billing period, but you won't be charged again."
        }
        confirmText={cancelLoading ? "Canceling..." : "Cancel Subscription"}
        cancelText="Keep Subscription"
        variant="warning"
      />
    </div>
  );
};

export default BillingPage;