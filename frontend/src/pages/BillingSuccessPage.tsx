import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getContrastTextColor } from '../utils/contrastTextColor';

const BillingSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Apply saved theme on billing success page
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setError('Missing session ID');
      setLoading(false);
      return;
    }

    // Optional: Verify the session with your backend
    const verifySession = async () => {
      try {
        // You can add a backend endpoint to verify the session if needed
        setLoading(false);
      } catch (err) {
        setError('Failed to verify payment');
        setLoading(false);
      }
    };

    // Delay to show success message
    setTimeout(() => {
      verifySession();
    }, 2000);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body text-center">
          {loading ? (
            <>
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="loading loading-spinner loading-lg text-success"></span>
              </div>
              <h2 className="card-title justify-center text-2xl mb-2">
                Processing Payment...
              </h2>
              <p className="text-base-content/60 mb-4">
                Please wait while we confirm your subscription.
              </p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="card-title justify-center text-2xl mb-2 text-error">
                Payment Error
              </h2>
              <p className="text-base-content/60 mb-6">
                {error}
              </p>
              <button
                onClick={() => navigate('/billing')}
                className="btn btn-primary"
                style={{ color: getContrastTextColor('primary') }}
              >
                Back to Billing
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="card-title justify-center text-2xl mb-2 text-success">
                Payment Successful!
              </h2>
              <p className="text-base-content/60 mb-6">
                Your subscription has been activated. Welcome to your new plan!
              </p>
              <div className="card-actions justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="btn btn-primary"
                  style={{ color: getContrastTextColor('primary') }}
                >
                  Go to Projects
                </button>
                <button
                  onClick={() => navigate('/billing')}
                  className="btn btn-outline"
                >
                  View Billing
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingSuccessPage;