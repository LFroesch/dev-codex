import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api';
import { useLoadingState } from '../hooks/useLoadingState';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'theme' | 'connections' | 'profile' | 'analytics'>('theme');
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'bio' | 'public' | 'privacy'>('personal');
  const [currentTheme, setCurrentTheme] = useState('retro');
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
  const [isPublicProfileExpanded, setIsPublicProfileExpanded] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.user);
        setCurrentTheme(response.user.theme || 'retro');
        setBio(response.user.bio || '');
        setIsPublicProfile(response.user.isPublic || false);
        setPublicSlug(response.user.publicSlug || '');
        setPublicDescription(response.user.publicDescription || '');
        // Apply theme from database
        document.documentElement.setAttribute('data-theme', response.user.theme || 'retro');
      } catch (err) {
        // Fallback to localStorage if not authenticated
        const savedTheme = localStorage.getItem('theme') || 'retro';
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
    const googleLinked = searchParams.get('google_linked');
    const message = searchParams.get('message');

    if (googleLinked === 'success') {
      setSuccess('Google account linked successfully!');
      // Refresh user data to show updated state
      authAPI.getMe().then(response => setUser(response.user)).catch(() => {});
      // Clean up URL using React Router
      setSearchParams({});
    } else if (googleLinked === 'error') {
      setError(message ? decodeURIComponent(message) : 'Failed to link Google account');
      // Clean up URL using React Router
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
      const previousTheme = user?.theme || localStorage.getItem('theme') || 'retro';
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
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="btn btn-primary gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </button>
        
        <div className="text-center">
          <h1 className="text-3xl font-bold text-base-content">
            Account Settings
          </h1>
          <p className="text-base-content/70 mt-1">
            Customize your account preferences and connections
          </p>
        </div>
        
        <div className="w-32"></div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="tabs tabs-boxed border-subtle shadow-sm">
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeTab === 'theme' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            Theme
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeTab === 'connections' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('connections')}
          >
            Connections
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeTab === 'profile' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button 
            className={`tab tab-sm min-h-10 font-bold text-sm ${activeTab === 'analytics' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Success Display */}
      {success && (
        <div className="alert alert-success">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="alert alert-error">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button onClick={() => setError('')} className="btn btn-ghost btn-sm">×</button>
        </div>
      )}

      {/* Tab Content */}
      <div>
        <div className="card-body p-6">
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

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                  {THEMES.map((theme) => (
                    <button
                      key={theme}
                      className={`group flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg transition-all hover:scale-105 ${
                        currentTheme === theme 
                          ? "bg-primary/20 ring-2 ring-primary" 
                          : "hover:bg-base-200"
                      }`}
                      onClick={() => handleThemeChange(theme)}
                      disabled={saving}
                    >
                      <div className="h-8 sm:h-12 w-full rounded-lg overflow-hidden shadow-sm" data-theme={theme}>
                        <div className="h-full grid grid-cols-4 gap-px p-1">
                          <div className="rounded bg-primary"></div>
                          <div className="rounded bg-secondary"></div>
                          <div className="rounded bg-accent"></div>
                          <div className="rounded bg-neutral"></div>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-center capitalize">
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
                      <div className="w-12 h-12 bg-base-100 rounded-lg flex items-center justify-center shadow-sm">
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
                {/* Sub-navigation for Profile sections */}
                <div className="flex justify-center">
                  <div className="tabs tabs-boxed border-subtle shadow-sm">
                    <button 
                      className={`tab tab-sm min-h-10 font-bold text-sm ${profileSubTab === 'personal' ? 'tab-active' : ''}`}
                      onClick={() => setProfileSubTab('personal')}
                    >
                      Personal Information
                    </button>
                    <button 
                      className={`tab tab-sm min-h-10 font-bold text-sm ${profileSubTab === 'bio' ? 'tab-active' : ''}`}
                      onClick={() => setProfileSubTab('bio')}
                    >
                      Profile Bio
                    </button>
                    <button 
                      className={`tab tab-sm min-h-10 font-bold text-sm ${profileSubTab === 'public' ? 'tab-active' : ''}`}
                      onClick={() => setProfileSubTab('public')}
                    >
                      Public Profile Settings
                    </button>
                    <button 
                      className={`tab tab-sm min-h-10 font-bold text-sm ${profileSubTab === 'privacy' ? 'tab-active' : ''}`}
                      onClick={() => setProfileSubTab('privacy')}
                    >
                      Public Information
                    </button>
                  </div>
                </div>

                {user && (
                  <>
                    {/* Personal Information */}
                    {profileSubTab === 'personal' && (
                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="text-lg font-semibold bg-base-200 border-b border-base-content/10 p-4">
                        👤 Personal Information
                      </div>
                        <div className="p-4 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    )}

                    {/* Bio Section */}
                    {profileSubTab === 'bio' && (
                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="text-lg font-semibold bg-base-200 border-b border-base-content/10 p-4">
                        📝 Profile Bio
                      </div>
                      <div className="p-4">
                        {/* Header with title and controls */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <p className="text-sm text-base-content/70">
                              {bio ? 'Bio added' : 'No bio added yet'}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            {isEditingProfile ? (
                              <>
                                <button
                                  onClick={handleSaveProfile}
                                  className="btn btn-sm btn-primary"
                                  disabled={savingProfile}
                                >
                                  {savingProfile ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={handleCancelProfileEdit}
                                  className="btn btn-sm btn-ghost"
                                  disabled={savingProfile}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setIsEditingProfile(true)}
                                className="btn btn-sm btn-ghost"
                              >
                                Edit Bio
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div>
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
                    )}

                    {/* Public Profile Settings */}
                    {profileSubTab === 'public' && (
                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="text-lg font-semibold bg-base-200 border-b border-base-content/10 p-4">
                        🌐 Public Profile Settings
                      </div>
                      <div className="p-4">
                        {/* Header with title and controls */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <p className="text-sm text-base-content/70">
                              {isPublicProfile ? 'Profile is public' : 'Profile is private'}
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            {isPublicProfile && (
                              <>
                                <button
                                  onClick={copyPublicProfileUrl}
                                  className="btn btn-outline btn-sm gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /> 
                                  </svg>
                                  Copy URL
                                </button>
                                <Link
                                  to={`/user/${publicSlug || user?.id}`}
                                  className="btn btn-outline btn-sm gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  {publicSlug ? `/user/${publicSlug}` : `/user/${user?.id}`}
                                </Link>
                              </>
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

                        {/* Content */}
                        <div>
                            <div className="space-y-4">
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
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            generateSlugFromName();
                                          }}
                                          className="btn btn-primary btn-xs gap-1"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                          Generate from name
                                        </button>
                                      </span>
                                    </label>
                                    <div className="join">
                                      <span className="join-item bg-base-200 px-3 py-2 text-lg text-base-content/70 h-12">
                                        {window.location.origin}/user/
                                      </span>
                                      <input
                                        type="text"
                                        className="input input-bordered join-item text-lg flex-1 h-12"
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setIsPublicProfile(true);
                                    }}
                                    className="btn btn-primary"
                                  >
                                    Enable Public Profile
                                  </button>
                                </div>
                              )}
                            </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Privacy Information */}
                    {profileSubTab === 'privacy' && (
                    <div className="bg-base-100 rounded-lg border-subtle shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-200">
                      <div className="text-lg font-semibold bg-base-200 border-b border-base-content/10 p-4">
                        📋 Privacy Information
                      </div>
                      <div className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    )}
                  </>
                )}
              </div>
            )}


            {activeTab === 'analytics' && (
              <div className="space-y-6">
                
                
                {/* Enhanced Analytics Dashboard */}
                <AnalyticsDashboard />
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;