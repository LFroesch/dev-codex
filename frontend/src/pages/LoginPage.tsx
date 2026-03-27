import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import { useApiCall } from '../hooks/useApiCall';
import { toast } from '../services/toast';
import { accountSwitchingManager } from '../utils/accountSwitching';
import { getContrastTextColor } from '../utils/contrastTextColor';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loading, error, call } = useApiCall();
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'retro';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await call(() => authAPI.login({ email, password }));
    if (result) {
      if (result.user?.email) {
        accountSwitchingManager.handleAccountSwitch(result.user.email);
      }
      toast.success('Welcome back! Successfully logged in.');
      navigate('/projects');
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const result = await authAPI.demoLogin();
      if (result) {
        toast.success('Welcome! Exploring a demo project with sample data.');
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
        <div className="rounded-xl overflow-hidden shadow-2xl border border-neutral-content/10">
          {/* Title bar */}
          <div className="bg-neutral-content/5 px-4 py-2.5 flex items-center border-b border-neutral-content/10">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
              <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
              <div className="w-2 h-2 rounded-full bg-neutral-content/15" />
            </div>
            <span className="text-neutral-content/25 text-xs font-mono mx-auto">~/my-project — dev-codex</span>
          </div>

          {/* Terminal body */}
          <div className="bg-neutral-content/[0.03] px-5 py-4 font-mono text-[13px] leading-relaxed space-y-3">
            {/* Command 1 — slash command */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-success/70 text-xs select-none">❯</span>
                <span className="text-neutral-content/70">/add todo <span className="text-warning/60">"Set up CI pipeline"</span> <span className="text-neutral-content/35">--priority high</span></span>
              </div>
              <div className="text-neutral-content/35 ml-5 mt-0.5">
                <span className="text-success/50">✓</span> Created todo #4: Set up CI pipeline
              </div>
            </div>

            {/* Command 2 — natural language → AI actions */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-success/70 text-xs select-none">❯</span>
                <span className="text-neutral-content/70">add auth and rate limiting to the API</span>
              </div>
              <div className="ml-5 mt-1 space-y-0.5">
                <div className="text-neutral-content/40 text-xs mb-1">AI parsed 3 actions:</div>
                <div className="text-info/50"><span className="text-neutral-content/20 mr-1.5">1.</span>/add feature "Auth"</div>
                <div className="text-info/50"><span className="text-neutral-content/20 mr-1.5">2.</span>/add feature "Rate Limiting"</div>
                <div className="text-info/50"><span className="text-neutral-content/20 mr-1.5">3.</span>/add todo "Implement JWT auth" <span className="text-neutral-content/30">--tag auth</span></div>
                <div className="text-neutral-content/25 mt-1">Confirm 3 actions? <span className="text-success/50">Y</span></div>
              </div>
            </div>

            {/* Command 3 — context export */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-success/70 text-xs select-none">❯</span>
                <span className="text-neutral-content/70">/context <span className="text-neutral-content/35">prompt all</span></span>
              </div>
              <div className="text-neutral-content/35 ml-5 mt-0.5">
                <span className="text-success/50">✓</span> Copied project context to clipboard <span className="text-neutral-content/20">(2.4k tokens)</span>
              </div>
            </div>

            {/* Cursor line */}
            <div className="flex items-center gap-2">
              <span className="text-success/70 text-xs select-none">❯</span>
              <span className="w-2 h-4 bg-neutral-content/30 animate-pulse" />
            </div>
          </div>
        </div>

        <div>
          <p className="text-neutral-content/30 text-xs font-mono">Free & open source — self-host or use dev-codex.com</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 bg-base-100 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-base-content">Dev Codex</h1>
            <p className="text-base-content/50 text-sm font-mono">Project management from the terminal</p>
          </div>

          <h2 className="text-2xl font-bold text-base-content mb-1">Welcome back</h2>
          <p className="text-base-content/50 text-sm mb-8">Sign in to your account</p>

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
            onClick={handleGoogleLogin}
            className="btn btn-outline w-full mb-3"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="btn btn-ghost w-full border border-base-300 mb-6 h-auto py-3"
          >
            {demoLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Loading demo...
              </>
            ) : (
              <span className="flex flex-col items-center">
                <span className="text-sm">Demo with pre-loaded sample data</span>
                <span className="text-xs text-base-content/40 font-normal">No signup needed</span>
              </span>
            )}
          </button>

          <div className="divider text-xs text-base-content/40 my-0 mb-6">or continue with email</div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label py-1" htmlFor="email">
                <span className="label-text text-sm">Email</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input input-bordered"
                required
              />
            </div>

            <div className="form-control">
              <label className="label py-1" htmlFor="password">
                <span className="label-text text-sm">Password</span>
                <Link to="/forgot-password" className="label-text-alt link link-primary text-xs">
                  Forgot?
                </Link>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="input input-bordered"
                required
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-base-content/50 mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="link link-primary font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
