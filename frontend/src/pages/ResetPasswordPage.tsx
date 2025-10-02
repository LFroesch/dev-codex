import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api';
import { getContrastTextColor } from '../utils/contrastTextColor';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    // Apply saved theme on reset password page
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title text-2xl font-bold text-error justify-center mb-4">Invalid Reset Link</h2>
            <p className="mb-4">This password reset link is invalid or has expired.</p>
            <Link to="/forgot-password" className="btn btn-primary" style={{ color: getContrastTextColor('primary') }}>
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-8">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="text-success text-6xl mb-4">✓</div>
            <h2 className="card-title text-2xl font-bold justify-center mb-4">Password Reset Successful!</h2>
            <p className="mb-4">Your password has been reset successfully.</p>
            <p className="text-sm text-base-content/70">
              Redirecting to login page in 3 seconds...
            </p>
            <Link to="/login" className="btn btn-primary mt-4" style={{ color: getContrastTextColor('primary') }}>
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold text-center justify-center mb-6">
            Set New Password
          </h2>

            {error && (
              <div className="alert alert-error mb-4">
                <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label" htmlFor="password">
                <span className="label-text">New Password</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="input input-bordered"
                required
                minLength={6}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="confirmPassword">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="input input-bordered"
                required
                minLength={6}
              />
            </div>

            <div className="form-control">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ color: getContrastTextColor('primary') }}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>
          
          <div className="text-center">
            <p className="text-sm text-base-content/70 mb-2">
              Remember your password?
            </p>
            <Link to="/login" className="link link-primary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;