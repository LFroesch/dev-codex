import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import SessionTracker from '../components/SessionTracker';
import NotificationBell from '../components/NotificationBell';

interface SupportFormData {
  category: string;
  priority: string;
  subject: string;
  message: string;
}

const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SupportFormData>({
    category: '',
    priority: 'medium',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'account', label: 'Account Issues' },
    { value: 'billing', label: 'Billing' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'other', label: 'Other' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userResponse = await authAPI.getMe();
        setUser(userResponse.user);
      } catch (err) {
        // User not authenticated, but that's ok for support
        console.log('User not authenticated');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket');
      }

      await response.json();
      setSubmitSuccess(true);
      setFormData({
        category: '',
        priority: 'medium',
        subject: '',
        message: ''
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 flex items-center justify-center p-6">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="card-title text-success">Ticket Created Successfully!</h2>
            <p className="text-base-content/70 mb-4">
              Your support request has been submitted. You'll receive a confirmation email shortly.
            </p>
            <div className="card-actions">
              <button 
                className="btn btn-primary" 
                onClick={() => setSubmitSuccess(false)}
              >
                Submit Another Ticket
              </button>
              <button 
                className="btn btn-outline" 
                onClick={() => navigate('/')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Header */}
      <header className="bg-base-100 border-b border-base-content/10 shadow-sm sticky top-0 z-40">
        {/* Mobile Layout */}
        <div className="block lg:hidden px-4 py-2">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
              </div>
              
              {user ? (
                <div className="flex items-center gap-2">
                  <SessionTracker />
                  <NotificationBell />
                  <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-circle btn-sm bg-base-100/80 hover:bg-base-300 border border-base-content/10 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-xl border border-base-content/10 w-52 z-50">
                        <li>
                          <a onClick={() => navigate('/billing')} className="flex items-center gap-3 w-full cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Billing & Plans
                          </a>
                        </li>
                        <li>
                          <a onClick={() => navigate('/account-settings')} className="flex items-center gap-3 w-full cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Account Settings
                          </a>
                        </li>
                        {user?.isAdmin && (
                          <li>
                            <a onClick={() => navigate('/admin')} className="flex items-center gap-3 w-full cursor-pointer">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Admin Dashboard
                            </a>
                          </li>
                        )}
                        <div className="divider my-1"></div>
                        <li>
                          <a onClick={() => handleLogout()} className="text-error flex items-center gap-3 w-full cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </a>
                        </li>
                      </ul>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-sm"
                >
                  Sign In
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button 
                className="btn btn-primary btn-sm gap-2"
                onClick={() => navigate('/')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back to Projects</span>
                <span className="sm:hidden">Back</span>
              </button>
              <h1 className="text-lg font-bold text-base-content">Contact Support</h1>
              <div className="w-20 sm:w-32"></div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block px-6 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/notes?view=projects')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-primary-content" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Dev Codex</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                className="btn btn-primary btn-sm gap-2"
                onClick={() => navigate('/')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </button>
              <h1 className="text-2xl font-bold text-base-content">Contact Support</h1>
            </div>
            
            {user ? (
              <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm">
                <SessionTracker />
                <NotificationBell />
                
                <span className="text-sm font-medium text-base-content/80">Hi, {user?.firstName}!</span>
                
                <div className="dropdown dropdown-end">
                  <div tabIndex={0} role="button" className="btn btn-circle btn-sm bg-base-100/80 hover:bg-base-300 border border-base-content/10 shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <ul tabIndex={0} className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-xl border border-base-content/10 w-52 z-50">
                      <li>
                        <a onClick={() => navigate('/billing')} className="flex items-center gap-3 w-full cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          Billing & Plans
                        </a>
                      </li>
                      <li>
                        <a onClick={() => navigate('/account-settings')} className="flex items-center gap-3 w-full cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Account Settings
                        </a>
                      </li>
                      {user?.isAdmin && (
                        <li>
                          <a onClick={() => navigate('/admin')} className="flex items-center gap-3 w-full cursor-pointer">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin Dashboard
                          </a>
                        </li>
                      )}
                      <div className="divider my-1"></div>
                      <li>
                        <a onClick={() => handleLogout()} className="text-error flex items-center gap-3 w-full cursor-pointer">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </a>
                      </li>
                    </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-base-200/50 backdrop-blur-sm border border-base-content/10 rounded-xl px-4 py-2 h-12 shadow-sm">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary btn-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 bg-gradient-to-br from-base-100 to-base-200">
        <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Support Form */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Selection */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Category *</span>
                </label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Selection */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Priority</span>
                </label>
                <select 
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Subject *</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Brief description of your issue"
                  className="input input-bordered w-full"
                  maxLength={200}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    {formData.subject.length}/200 characters
                  </span>
                </label>
              </div>

              {/* Message */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Message *</span>
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Please provide detailed information about your issue, including steps to reproduce if applicable..."
                  className="textarea textarea-bordered h-32 w-full resize-none"
                  maxLength={2000}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    {formData.message.length}/2000 characters
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-error">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="card-actions justify-end pt-4">
                <button 
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate('/')}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting || !formData.category || !formData.subject || !formData.message}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-base-content/60">
          <p className="text-sm">
            For urgent issues, please use the "Urgent" priority. We typically respond within 24 hours for most inquiries.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;