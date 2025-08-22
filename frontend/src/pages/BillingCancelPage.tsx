import React from 'react';
import { useNavigate } from 'react-router-dom';

const BillingCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="card-title justify-center text-2xl mb-2 text-warning">
            Payment Cancelled
          </h2>
          <p className="text-base-content/60 mb-6">
            Your payment was cancelled. No charges were made to your account.
          </p>
          <div className="card-actions justify-center">
            <button
              onClick={() => navigate('/billing')}
              className="btn btn-primary"
            >
              Back to Billing
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-outline"
            >
              Go to Projects
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingCancelPage;