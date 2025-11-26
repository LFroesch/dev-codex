import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/auth';

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setError('No token received from OAuth provider');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Exchange the URL token for an HTTP-only cookie
        const response = await authAPI.exchangeToken(token);

        if (response.user) {
          // Successfully authenticated - redirect to home
          navigate('/?auth=success', { replace: true });
        }
      } catch (err) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-error">Authentication Error</h2>
            <p>{error}</p>
            <p className="text-sm text-base-content/60">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body items-center text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <h2 className="card-title">Completing sign in...</h2>
          <p className="text-base-content/60">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
