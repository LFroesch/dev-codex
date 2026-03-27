import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useLoadingState } from '../hooks/useLoadingState';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { toast } from '../services/toast';
import { accountSwitchingManager } from '../utils/accountSwitching';
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
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

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
        const result = await authAPI.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username.trim().toLowerCase(),
          password: formData.password
        });
        if (result.user?.email) {
          accountSwitchingManager.handleAccountSwitch(result.user.email);
        }
        toast.success('Account created successfully! Welcome to Dev Codex.');
        navigate('/');
      } catch (err: any) {
        handleError(err);
      }
    });
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const result = await authAPI.demoLogin();
      if (result) {
        toast.success('Welcome to demo mode! Explore all features.');
        navigate('/notes');
      }
    } catch (err) {
      toast.error('Demo mode is currently unavailable');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — terminal branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral relative overflow-hidden flex-col justify-between p-12">
        <div>
          <h1 className="text-4xl font-bold text-neutral-content tracking-tight">
            Dev Codex
          </h1>
          <p className="text-neutral-content/50 mt-1 text-sm font-mono">Project management from the terminal</p>
        </div>

        {/* Terminal mockup */}
        <div className="bg-base-300/10 border border-neutral-content/10 rounded-lg p-5 font-mono text-sm space-y-3">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
            <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
            <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
            <span className="text-neutral-content/30 text-xs ml-2">dev-codex</span>
          </div>
          <div>
            <span className="text-success/80">$</span>
            <span className="text-neutral-content/80 ml-2">/add todo "Set up CI pipeline" --priority high</span>
          </div>
          <div className="text-neutral-content/40 pl-4">Created todo #4: Set up CI pipeline</div>
          <div>
            <span className="text-success/80">$</span>
            <span className="text-neutral-content/80 ml-2">add auth and rate limiting to the API</span>
          </div>
          <div className="text-neutral-content/40 pl-4">
            AI: I'll add those as features with related todos.<br />
            <span className="text-info/60">{'>'} /add feature "Auth" && /add feature "Rate Limiting"</span><br />
            <span className="text-info/60">{'>'} /add todo "Implement JWT auth" --tag auth</span><br />
            <span className="text-neutral-content/30">Confirm 3 actions? [Y/n]</span>
          </div>
          <div>
            <span className="text-success/80">$</span>
            <span className="text-neutral-content/80 ml-2">/context prompt all</span>
          </div>
          <div className="text-neutral-content/40 pl-4">Copied project context to clipboard (2.4k tokens)</div>
        </div>

        <div>
          <p className="text-neutral-content/30 text-xs font-mono">Free & open source — self-host or use dev-codex.com</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 bg-base-100 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-base-content">Dev Codex</h1>
            <p className="text-base-content/50 text-sm font-mono">Project management from the terminal</p>
          </div>

          <h2 className="text-2xl font-bold text-base-content mb-1">Create your account</h2>
          <p className="text-base-content/50 text-sm mb-6">Get started for free</p>

          {error && (
            <div className="alert alert-error mb-4 text-sm">
              <svg className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Social buttons first */}
          <button
            onClick={handleGoogleSignup}
            className="btn btn-outline w-full mb-3"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>

          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="btn btn-ghost w-full border border-base-300 mb-6"
          >
            {demoLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Loading demo...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm">Demo with pre-loaded sample data</span>
              </>
            )}
          </button>

          <div className="divider text-xs text-base-content/40 my-0 mb-6">or continue with email</div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-sm">First Name</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="input input-bordered input-sm h-10"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text text-sm">Last Name</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="input input-bordered input-sm h-10"
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">Email</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input input-bordered input-sm h-10"
                required
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">Username</span>
                {usernameStatus.message && (
                  <span className={`label-text-alt text-xs ${
                    usernameStatus.checking ? 'text-info' :
                    usernameStatus.available ? 'text-success' : 'text-error'
                  }`}>
                    {usernameStatus.checking ? '' : usernameStatus.available ? '' : ''} {usernameStatus.message}
                  </span>
                )}
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
                className={`input input-bordered input-sm h-10 ${
                  usernameStatus.available === true ? 'input-success' :
                  usernameStatus.available === false ? 'input-error' : ''
                }`}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-z0-9_]+"
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">Password</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className="input input-bordered input-sm h-10"
                required
                minLength={6}
              />
            </div>

            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-sm">Confirm Password</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className="input input-bordered input-sm h-10"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2"
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
          </form>

          <p className="text-center text-sm text-base-content/50 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
