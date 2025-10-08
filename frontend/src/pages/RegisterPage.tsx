import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useLoadingState } from '../hooks/useLoadingState';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { toast } from '../services/toast';
import { getContrastTextColor } from '../utils/contrastTextColor';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });
  const { loading, withLoading } = useLoadingState();
  const { error, handleError, clearError} = useErrorHandler();

  useEffect(() => {
    // Apply saved theme on register page
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Check username availability with debounce
  useEffect(() => {
    const checkUsername = async () => {
      const username = formData.username.trim().toLowerCase();

      if (!username) {
        setUsernameStatus({ checking: false, available: null, message: '' });
        return;
      }

      if (username.length < 3) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Username must be at least 3 characters'
        });
        return;
      }

      if (!/^[a-z0-9_]+$/.test(username)) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Only lowercase letters, numbers, and underscores allowed'
        });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: 'Checking...' });

      try {
        const result = await authAPI.checkUsername(username);
        setUsernameStatus({
          checking: false,
          available: result.available,
          message: result.message
        });
      } catch (err) {
        setUsernameStatus({
          checking: false,
          available: null,
          message: 'Error checking username'
        });
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!formData.username) {
      handleError(new Error('Username is required'));
      return;
    }

    if (!usernameStatus.available) {
      handleError(new Error('Please choose an available username'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      handleError(new Error('Passwords do not match'));
      return;
    }

    if (formData.password.length < 6) {
      handleError(new Error('Password must be at least 6 characters long'));
      return;
    }

    await withLoading(async () => {
      try {
        await authAPI.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username.trim().toLowerCase(),
          password: formData.password
        });
        toast.success('Account created successfully! Welcome to Dev Codex.');
        navigate('/');
      } catch (err: any) {
        handleError(err);
      }
    });
  };

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5003'}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold text-center justify-center mb-6">
            Create Account
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
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First Name</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="input input-bordered"
                  required
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Last Name</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="input input-bordered"
                  required
                />
              </div>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Username</span>
                {usernameStatus.message && (
                  <span className={`label-text-alt ${
                    usernameStatus.checking ? 'text-info' :
                    usernameStatus.available ? 'text-success' : 'text-error'
                  }`}>
                    {usernameStatus.checking ? '⏳' : usernameStatus.available ? '✓' : '✗'} {usernameStatus.message}
                  </span>
                )}
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                className={`input input-bordered ${
                  usernameStatus.available === true ? 'input-success' :
                  usernameStatus.available === false ? 'input-error' : ''
                }`}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9_]+"
              />
              <label className="label">
                <span className="label-text-alt text-xs opacity-70">
                  3-30 characters, lowercase letters, numbers, and underscores only
                </span>
              </label>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                className="input input-bordered"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Confirm Password</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className="input input-bordered"
                required
                minLength={6}
              />
            </div>
            
            <div className="form-control mt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ color: getContrastTextColor('primary') }}
              >
                {loading ? (
                  <>
                    <span className="loading loading-spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
          
          <div className="divider">OR</div>
          
          <button 
            onClick={handleGoogleSignup}
            className="btn btn-outline w-full mb-4"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>
          
          <div className="text-center">
            <p className="text-sm text-base-content/70 mb-2">
              Already have an account?
            </p>
            <Link to="/login" className="link link-primary">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;