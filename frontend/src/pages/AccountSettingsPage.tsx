import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { useLoadingState } from '../hooks/useLoadingState';
import { useApiCall } from '../hooks/useApiCall';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const THEMES = [
  "dim", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
      "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
      "forest", "aqua", "sunset", "lofi", "pastel", "fantasy", "wireframe",
      "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid",
      "lemonade", "night", "coffee", "winter", "nord"
];

const AccountSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'theme' | 'connections' | 'profile' | 'analytics'>('theme');
  const [currentTheme, setCurrentTheme] = useState('cyberpunk');
  const [user, setUser] = useState<any>(null);
  
  const { loading, setLoading } = useLoadingState(true);
  const { loading: saving, withLoading: withSaving } = useLoadingState();
  const { loading: unlinkingGoogle, withLoading: withUnlinking } = useLoadingState();
  const { loading: savingProfile, withLoading: withSavingProfile } = useLoadingState();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [bio, setBio] = useState('');
  
  // Public profile settings
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [publicDescription, setPublicDescription] = useState('');
  const [savingPublicSettings, setSavingPublicSettings] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.user);
        setCurrentTheme(response.user.theme || 'cyberpunk');
        setBio(response.user.bio || '');
        setIsPublicProfile(response.user.isPublic || false);
        setPublicSlug(response.user.publicSlug || '');
        setPublicDescription(response.user.publicDescription || '');
        // Apply theme from database
        document.documentElement.setAttribute('data-theme', response.user.theme || 'cyberpunk');
      } catch (err) {
        // Fallback to localStorage if not authenticated
        const savedTheme = localStorage.getItem('theme') || 'cyberpunk';
        setCurrentTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);

  useEffect(() => {
    // Handle Google linking URL params
    const urlParams = new URLSearchParams(window.location.search);
    const googleLinked = urlParams.get('google_linked');
    const message = urlParams.get('message');

    if (googleLinked === 'success') {
      setSuccess('Google account linked successfully!');
      // Refresh user data to show updated state
      authAPI.getMe().then(response => setUser(response.user)).catch(() => {});
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (googleLinked === 'error') {
      setError(message ? decodeURIComponent(message) : 'Failed to link Google account');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleThemeChange = async (newTheme: string) => {
    await withSaving(async () => {
      setError('');
      
      // Update theme in database if user is authenticated
      if (user) {
        const response = await authAPI.updateTheme(newTheme);
        setUser(response.user);
      }
      
      // Update local state and apply theme
      setCurrentTheme(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      
      // Keep localStorage as fallback
      localStorage.setItem('theme', newTheme);
    }).catch((err: any) => {
      setError(err.response?.data?.message || 'Failed to update theme');
      // Revert theme on error
      const previousTheme = user?.theme || localStorage.getItem('theme') || 'cyberpunk';
      setCurrentTheme(previousTheme);
      document.documentElement.setAttribute('data-theme', previousTheme);
    });
  };

  const handleLinkGoogle = () => {
    setError('');
    setSuccess('');
    authAPI.linkGoogle();
  };

  const handleUnlinkGoogle = async () => {
    await withUnlinking(async () => {
      setError('');
      setSuccess('');

      await authAPI.unlinkGoogle();
      setSuccess('Google account unlinked successfully!');
      // Refresh user data to show updated state
      const response = await authAPI.getMe();
      setUser(response.user);
    }).catch((err: any) => {
      setError(err.response?.data?.message || 'Failed to unlink Google account');
    });
  };

  const handleSaveProfile = async () => {
    await withSavingProfile(async () => {
      setError('');
      setSuccess('');

      const response = await authAPI.updateProfile({ bio });
      setUser(response.user);
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully!');
    }).catch((err: any) => {
      setError(err.response?.data?.message || 'Failed to update profile');
    });
  };

  const handleCancelProfileEdit = () => {
    setBio(user?.bio || '');
    setIsEditingProfile(false);
    setError('');
  };

  const generateSlugFromName = () => {
    if (user?.firstName && user?.lastName) {
      const slug = `${user.firstName}-${user.lastName}`
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      setPublicSlug(slug);
    }
  };

  const handleSavePublicSettings = async () => {
    setSavingPublicSettings(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.updateProfile({
        isPublic: isPublicProfile,
        publicSlug: publicSlug.trim() || undefined,
        publicDescription: publicDescription.trim() || undefined
      });
      setUser(response.user);
      setSuccess('Public profile settings updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update public profile settings');
    } finally {
      setSavingPublicSettings(false);
    }
  };

  const copyPublicProfileUrl = () => {
    const url = `${window.location.origin}/user/${publicSlug || user?.id}`;
    navigator.clipboard.writeText(url);
    setSuccess('Public profile URL copied to clipboard!');
  };

  const hasPublicChanges = () => {
    if (!user) return false;
    return (
      isPublicProfile !== (user.isPublic || false) ||
      publicSlug !== (user.publicSlug || '') ||
      publicDescription !== (user.publicDescription || '')
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-base-content">
              Account Settings
            </h1>
            <p className="text-lg text-base-content/70 mt-2">
              Customize your account preferences and connections
            </p>
            {user && (
              <p className="text-base-content/80 mt-1">
                Welcome, {user.firstName} {user.lastName}!
              </p>
            )}
          </div>
          
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-8 bg-base-100 shadow-lg justify-center">
          <button 
            className={`tab ${activeTab === 'theme' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z" />
            </svg>
            Theme Preferences
          </button>
          <button 
            className={`tab ${activeTab === 'connections' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Account Connections
          </button>
          <button 
            className={`tab ${activeTab === 'profile' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile & Public Settings
          </button>
          <button 
            className={`tab ${activeTab === 'analytics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Usage Analytics
          </button>
        </div>

        {/* Success Display */}
        {success && (
          <div className="alert alert-success mb-6">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="btn btn-ghost btn-sm">×</button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-6">
            <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
          </div>
        )}

        {/* Tab Content */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Theme Preferences</h2>
                  <p className="text-base-content/60">
                    Choose a theme that suits your style. 
                    {user ? ' Your preference will be saved to your account.' : ' Sign in to save your theme preference.'}
                  </p>
                </div>

                {saving && (
                  <div className="alert alert-info">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Saving theme preference...</span>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme}
                      className={`group flex flex-col items-center gap-2 p-3 rounded-lg transition-all hover:scale-105 ${
                        currentTheme === theme 
                          ? "bg-primary/20 ring-2 ring-primary" 
                          : "hover:bg-base-200"
                      }`}
                      onClick={() => handleThemeChange(theme)}
                      disabled={saving}
                    >
                      <div className="h-12 w-full rounded-lg overflow-hidden shadow-sm" data-theme={theme}>
                        <div className="h-full grid grid-cols-4 gap-px p-1">
                          <div className="rounded bg-primary"></div>
                          <div className="rounded bg-secondary"></div>
                          <div className="rounded bg-accent"></div>
                          <div className="rounded bg-neutral"></div>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-center capitalize">
                        {theme}
                      </span>
                      {currentTheme === theme && (
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Theme Info */}
                <div className="bg-base-200 rounded-lg p-4 mt-6">
                    <h3 className="font-semibold mb-2">Current Theme: {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</h3>
                  <div className="text-sm text-base-content/60">
                    <p>Theme preference is saved to your account and will be applied across all devices.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Connections Tab */}
            {activeTab === 'connections' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Account Connections</h2>
                  <p className="text-base-content/60">
                    Link your account with external services for easier sign-in.
                  </p>
                </div>

                {/* Google Account */}
                <div className="bg-base-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Google</h3>
                        <p className="text-base-content/60 text-sm">
                          {user?.hasGoogleAccount 
                            ? 'Your Google account is connected' 
                            : 'Connect your Google account for easier sign-in'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {user?.hasGoogleAccount ? (
                        <>
                          <div className="badge h-8 badge-success gap-2">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Connected
                          </div>
                          <button
                            onClick={handleUnlinkGoogle}
                            disabled={unlinkingGoogle}
                            className="btn btn-error btn-sm"
                          >
                            {unlinkingGoogle ? (
                              <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Unlinking...
                              </>
                            ) : (
                              'Unlink'
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleLinkGoogle}
                          className="btn btn-primary btn-sm"
                        >
                          Link Google Account
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {user && (
                  <>
                    {/* Personal Information */}
                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                      <input type="checkbox" defaultChecked />
                      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
                        👤 Personal Information
                      </div>
                      <div className="collapse-content">
                        <div className="pt-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="font-semibold text-base mb-3">Account Details</h3>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">First Name</label>
                                  <p className="text-base-content font-medium">{user.firstName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Last Name</label>
                                  <p className="text-base-content font-medium">{user.lastName}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Email</label>
                                  <p className="text-base-content font-medium">{user.email}</p>
                                </div>
                              </div>
                            </div>

                            <div>
                              <h3 className="font-semibold text-base mb-3">Plan & Limits</h3>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Plan</label>
                                  <div className="flex items-center gap-2">
                                    <span className={`badge ${user.planTier === 'free' ? 'badge-ghost' : user.planTier === 'pro' ? 'badge-primary' : 'badge-secondary'}`}>
                                      {(user.planTier || 'free').toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Project Limit</label>
                                  <p className="text-base-content font-medium">
                                    {user.projectLimit === -1 ? 'Unlimited' : user.projectLimit} projects
                                  </p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Member Since</label>
                                  <p className="text-base-content font-medium">
                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    }) : 'Unknown'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                      <input type="checkbox" defaultChecked />
                      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10 flex items-center justify-between">
                        <span>📝 Profile Bio</span>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          {isEditingProfile ? (
                            <>
                              <button
                                onClick={handleCancelProfileEdit}
                                className="btn btn-ghost btn-sm"
                                disabled={savingProfile}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveProfile}
                                className="btn btn-primary btn-sm"
                                disabled={savingProfile}
                              >
                                {savingProfile ? 'Saving...' : 'Save'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="btn btn-outline btn-sm"
                            >
                              Edit Bio
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="collapse-content">
                        <div className="pt-4">
                          {isEditingProfile ? (
                            <div className="space-y-4">
                              <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="textarea textarea-bordered w-full h-32 resize-none"
                                placeholder="Tell others about yourself, your interests, and what you're working on..."
                                maxLength={500}
                              />
                              <div className="text-right">
                                <span className="text-xs text-base-content/60">
                                  {bio.length}/500 characters
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-base-200 rounded-lg p-4 border border-base-300">
                              {bio ? (
                                <p className="text-base-content whitespace-pre-wrap">{bio}</p>
                              ) : (
                                <p className="text-base-content/60 italic">No bio added yet. Click edit to add one.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Public Profile Settings */}
                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                      <input type="checkbox" defaultChecked />
                      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10 flex items-center justify-between">
                        <span>🌐 Public Profile Settings</span>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {isPublicProfile && (
                            <button
                              onClick={copyPublicProfileUrl}
                              className="btn btn-outline btn-sm gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Copy URL
                            </button>
                          )}
                          <button
                            onClick={handleSavePublicSettings}
                            disabled={savingPublicSettings || !hasPublicChanges()}
                            className={`btn btn-sm ${hasPublicChanges() ? 'btn-primary' : 'btn-ghost'}`}
                          >
                            {savingPublicSettings ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Saving...
                              </>
                            ) : hasPublicChanges() ? (
                              'Save Changes'
                            ) : (
                              'Saved'
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="collapse-content">
                        <div className="pt-4 space-y-4">
                          {/* Public Profile Toggle */}
                          <div className="form-control">
                            <label className="label cursor-pointer">
                              <div className="flex-1">
                                <span className="label-text text-lg font-semibold">🔓 Make Profile Public</span>
                                <p className="text-sm text-base-content/60 mt-1">
                                  Enable this to create a public portfolio page showcasing your projects and skills.
                                  Others will be able to discover your profile and view your public projects.
                                </p>
                                {isPublicProfile && (
                                  <p className="text-sm text-success font-medium mt-2">
                                    ✅ Your profile is publicly accessible
                                  </p>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                className="toggle toggle-primary toggle-lg"
                                checked={isPublicProfile}
                                onChange={(e) => setIsPublicProfile(e.target.checked)}
                              />
                            </label>
                          </div>

                          {/* Public Settings - Only show when public is enabled */}
                          {isPublicProfile && (
                            <div className="space-y-4 border-t border-base-300 pt-4">
                              {/* Custom Slug */}
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-medium">Custom URL Slug (Optional)</span>
                                  <span className="label-text-alt">
                                    <button
                                      type="button"
                                      onClick={generateSlugFromName}
                                      className="btn btn-ghost btn-xs"
                                    >
                                      Generate from name
                                    </button>
                                  </span>
                                </label>
                                <div className="join">
                                  <span className="join-item bg-base-200 px-3 py-2 text-sm text-base-content/70">
                                    {window.location.origin}/user/
                                  </span>
                                  <input
                                    type="text"
                                    className="input input-bordered join-item flex-1"
                                    placeholder={user?.id}
                                    value={publicSlug}
                                    onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    pattern="^[a-z0-9-]+$"
                                  />
                                </div>
                                <div className="label">
                                  <span className="label-text-alt">
                                    {publicSlug ? (
                                      <>Your profile will be accessible at: <a 
                                        href={`${window.location.origin}/user/${publicSlug}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="link link-primary font-bold"
                                      >
                                        /user/{publicSlug}
                                      </a></>
                                    ) : (
                                      <>Your profile will be accessible at: <a 
                                        href={`${window.location.origin}/user/${user?.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="link link-primary font-bold"
                                      >
                                        /user/{user?.id}
                                      </a></>
                                    )}
                                  </span>
                                </div>
                              </div>

                              {/* Public Description */}
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-medium">Public Profile Description (Optional)</span>
                                  <span className="label-text-alt">
                                    {publicDescription.length}/200 characters
                                  </span>
                                </label>
                                <textarea
                                  className="textarea textarea-bordered h-24 resize-none"
                                  placeholder="Describe yourself professionally for public viewers (will show at the top of your profile)"
                                  value={publicDescription}
                                  onChange={(e) => setPublicDescription(e.target.value.slice(0, 200))}
                                />
                              </div>

                              {/* Profile Preview */}
                              <div className="divider">Preview</div>
                              <div className="mockup-browser border bg-base-300">
                                <div className="mockup-browser-toolbar">
                                  <div className="input">
                                    {window.location.origin}/user/{publicSlug || user?.id}
                                  </div>
                                </div>
                                <div className="bg-base-100 p-4">
                                  <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold text-white">
                                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-bold">
                                        {user?.firstName} {user?.lastName}
                                      </h3>
                                      {publicSlug && (
                                        <span className="text-base-content/60">
                                          @{publicSlug}
                                        </span>
                                      )}
                                      {publicDescription && (
                                        <p className="text-sm text-base-content/70 mt-1">
                                          {publicDescription}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-base-content/60">
                                    📂 Your public projects will be listed below
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Call to action when public is disabled */}
                          {!isPublicProfile && (
                            <div className="text-center py-8 border-t border-base-300">
                              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <h3 className="text-xl font-bold mb-2">Create Your Public Portfolio</h3>
                              <p className="text-base-content/70 mb-4 max-w-md mx-auto">
                                Showcase your work to the world! Enable your public profile to share your projects, 
                                skills, and experience with the developer community.
                              </p>
                              <button 
                                onClick={() => setIsPublicProfile(true)}
                                className="btn btn-primary"
                              >
                                Enable Public Profile
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Privacy Information */}
                    <div className="collapse collapse-arrow bg-base-100 shadow-lg border border-base-content/10">
                      <input type="checkbox" />
                      <div className="collapse-title text-lg font-semibold bg-base-200 border-b border-base-content/10">
                        📋 Privacy Information
                      </div>
                      <div className="collapse-content">
                        <div className="pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium text-success">✅ Included</h4>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Your name and profile description
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Your bio (from above section)
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  All your public projects
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Tech stack summary from projects
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Project categories and count
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Member since date
                                </li>
                              </ul>
                            </div>
                            
                            <div className="space-y-3">
                              <h4 className="font-medium text-error">❌ Not Included</h4>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-error"></div>
                                  Email address
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-error"></div>
                                  Private/team projects
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-error"></div>
                                  Account settings or preferences
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-error"></div>
                                  Billing or plan information
                                </li>
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-error"></div>
                                  Private project details
                                </li>
                              </ul>
                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-info mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <h5 className="font-medium text-info mb-1">Privacy & Control</h5>
                                <p className="text-sm text-base-content/70">
                                  Your public profile only shows information from projects you've explicitly made public. 
                                  You can disable your public profile at any time, and no private information is ever exposed.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}


            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <AnalyticsDashboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;