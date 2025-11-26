import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api';
import { useLoadingState } from '../hooks/useLoadingState';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ThemePreview from '../components/ThemePreview';
import { toast } from '../services/toast';
import { hexToOklch, oklchToCssValue, generateFocusVariant, generateContrastingTextColor } from '../utils/colorUtils';
import { getContrastTextColor } from '../utils/contrastTextColor';

const THEMES = [
  "dim", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
      "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
      "forest", "aqua", "sunset", "lofi", "pastel", "fantasy", "wireframe",
      "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid",
      "lemonade", "night", "coffee", "winter", "nord"
];

interface CustomTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    'base-100': string;
    'base-200': string;
    'base-300': string;
    info: string;
    success: string;
    warning: string;
    error: string;
  };
  createdAt: string;
}

const DEFAULT_CUSTOM_COLORS = {
  primary: '#5e576b',
  secondary: '#a56f98',
  accent: '#477998',
  neutral: '#9a6a6a',
  'base-100': '#baa1a1',
  'base-200': '#b48888',
  'base-300': '#a27676',
  info: '#146a90',
  success: '#8BBF9F',
  warning: '#FFF07C',
  error: '#B02E0C'
};

// Helper functions commented out - using OKLCH instead
// const hexToRgb = (hex: string) => {
//   const r = parseInt(hex.slice(1, 3), 16);
//   const g = parseInt(hex.slice(3, 5), 16);
//   const b = parseInt(hex.slice(5, 7), 16);
//   return { r, g, b };
// };

// const rgbToHsl = (r: number, g: number, b: number) => {
//   r /= 255;
//   g /= 255;
//   b /= 255;

//   const max = Math.max(r, g, b);
//   const min = Math.min(r, g, b);
//   let h = 0, s;

//   const l = (max + min) / 2;

//   if (max === min) {
//     h = s = 0;
//   } else {
//     const d = max - min;
//     s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
//     switch (max) {
//       case r: h = (g - b) / d + (g < b ? 6 : 0); break;
//       case g: h = (b - r) / d + 2; break;
//       case b: h = (r - g) / d + 4; break;
//       default: h = 0;
//     }
//     h /= 6;
//   }

//   return { h: h * 360, s: s * 100, l: l * 100 };
// };


const AccountSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'theme' | 'connections' | 'profile' | 'analytics' | 'billing'>('theme');
  const [profileSubTab, setProfileSubTab] = useState<'personal' | 'public' | 'privacy'>('personal');
  const [themeSubTab, setThemeSubTab] = useState<'preset' | 'custom'>('preset');
  const [currentTheme, setCurrentTheme] = useState('retro');
  const [user, setUser] = useState<any>(null);
  
  // Custom theme state
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [newThemeName, setNewThemeName] = useState('');
  const [editingThemeName, setEditingThemeName] = useState('');
  const [customColors, setCustomColors] = useState<CustomTheme['colors']>(DEFAULT_CUSTOM_COLORS);
  const [previewTheme, setPreviewTheme] = useState<CustomTheme | null>(null);
  
  const { loading, setLoading } = useLoadingState(true);
  const { loading: saving, withLoading: withSaving } = useLoadingState();
  const { loading: unlinkingGoogle, withLoading: withUnlinking } = useLoadingState();
  const { loading: savingProfile, withLoading: withSavingProfile } = useLoadingState();
  const { loading: savingName, withLoading: withSavingName } = useLoadingState();
  const { loading: savingUsername, withLoading: withSavingUsername } = useLoadingState();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [bio, setBio] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [displayPreference, setDisplayPreference] = useState<'name' | 'username'>('username');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });
  
  // Public profile settings
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [publicSlug, setPublicSlug] = useState('');
  const [savingPublicSettings, setSavingPublicSettings] = useState(false);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load custom themes from database or localStorage
  const loadCustomThemes = async () => {
    try {
      // Try to load from database first
      const response = await authAPI.getCustomThemes();
      const dbThemes = response.customThemes || [];
      setCustomThemes(dbThemes);
      // Sync with localStorage
      localStorage.setItem('customThemes', JSON.stringify(dbThemes));
    } catch (error) {
      // Fallback to localStorage if database fails
      const saved = localStorage.getItem('customThemes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCustomThemes(parsed);
        } catch (err) {
        }
      }
    }
  };

  // Save custom themes to database and localStorage
  const saveCustomThemes = async (themes: CustomTheme[]) => {
    try {
      // Save to database
      await authAPI.saveCustomThemes(themes);
      // Also save to localStorage as backup
      localStorage.setItem('customThemes', JSON.stringify(themes));
      setCustomThemes(themes);
    } catch (error) {
      // Fallback to localStorage only
      localStorage.setItem('customThemes', JSON.stringify(themes));
      setCustomThemes(themes);
      toast.warning('Failed to sync custom themes to your account. They are saved locally.');
    }
  };

  // Apply custom theme by updating tailwind config dynamically
  const applyCustomTheme = (theme: CustomTheme) => {
    // Remove existing custom theme styles
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add custom theme to DaisyUI themes dynamically
    const style = document.createElement('style');
    style.id = 'custom-theme-style';
    
    // Convert user's hex colors to HSL format for DaisyUI
    // const primaryRgb = hexToRgb(theme.colors.primary);
    // const primaryHsl = rgbToHsl(primaryRgb.r, primaryRgb.g, primaryRgb.b);

    // const secondaryRgb = hexToRgb(theme.colors.secondary);
    // const secondaryHsl = rgbToHsl(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b);
    
    // const accentRgb = hexToRgb(theme.colors.accent);
    // const accentHsl = rgbToHsl(accentRgb.r, accentRgb.g, accentRgb.b);
    
    // const neutralRgb = hexToRgb(theme.colors.neutral);
    // const neutralHsl = rgbToHsl(neutralRgb.r, neutralRgb.g, neutralRgb.b);
    
    // const base100Rgb = hexToRgb(theme.colors['base-100']);
    // const base100Hsl = rgbToHsl(base100Rgb.r, base100Rgb.g, base100Rgb.b);
    
    // const base200Rgb = hexToRgb(theme.colors['base-200']);
    // const base200Hsl = rgbToHsl(base200Rgb.r, base200Rgb.g, base200Rgb.b);
    
    // const base300Rgb = hexToRgb(theme.colors['base-300']);
    // const base300Hsl = rgbToHsl(base300Rgb.r, base300Rgb.g, base300Rgb.b);
    
    // const infoRgb = hexToRgb(theme.colors.info);
    // const infoHsl = rgbToHsl(infoRgb.r, infoRgb.g, infoRgb.b);
    
    // const successRgb = hexToRgb(theme.colors.success);
    // const successHsl = rgbToHsl(successRgb.r, successRgb.g, successRgb.b);
    
    // const warningRgb = hexToRgb(theme.colors.warning);
    // const warningHsl = rgbToHsl(warningRgb.r, warningRgb.g, warningRgb.b);
    
    // const errorRgb = hexToRgb(theme.colors.error);
    // const errorHsl = rgbToHsl(errorRgb.r, errorRgb.g, errorRgb.b);
    

    // Convert user colors to OKLCH format
    const primaryOklch = hexToOklch(theme.colors.primary);
    const secondaryOklch = hexToOklch(theme.colors.secondary);
    const accentOklch = hexToOklch(theme.colors.accent);
    const neutralOklch = hexToOklch(theme.colors.neutral);
    const base100Oklch = hexToOklch(theme.colors['base-100']);
    const base200Oklch = hexToOklch(theme.colors['base-200']);
    const base300Oklch = hexToOklch(theme.colors['base-300']);
    const infoOklch = hexToOklch(theme.colors.info);
    const successOklch = hexToOklch(theme.colors.success);
    const warningOklch = hexToOklch(theme.colors.warning);
    const errorOklch = hexToOklch(theme.colors.error);

    const css = `
      [data-theme="custom-${theme.id}"] {
        color-scheme: light;
        --p: ${oklchToCssValue(primaryOklch)};
        --pf: ${oklchToCssValue(generateFocusVariant(primaryOklch))};
        --pc: ${generateContrastingTextColor(primaryOklch)};
        --s: ${oklchToCssValue(secondaryOklch)};
        --sf: ${oklchToCssValue(generateFocusVariant(secondaryOklch))};
        --sc: ${generateContrastingTextColor(secondaryOklch)};
        --a: ${oklchToCssValue(accentOklch)};
        --af: ${oklchToCssValue(generateFocusVariant(accentOklch))};
        --ac: ${generateContrastingTextColor(accentOklch)};
        --n: ${oklchToCssValue(neutralOklch)};
        --nf: ${oklchToCssValue(generateFocusVariant(neutralOklch))};
        --nc: ${generateContrastingTextColor(neutralOklch)};
        --b1: ${oklchToCssValue(base100Oklch)};
        --b2: ${oklchToCssValue(base200Oklch)};
        --b3: ${oklchToCssValue(base300Oklch)};
        --bc: ${generateContrastingTextColor(base100Oklch)};
        --in: ${oklchToCssValue(infoOklch)};
        --inc: ${generateContrastingTextColor(infoOklch)};
        --su: ${oklchToCssValue(successOklch)};
        --suc: ${generateContrastingTextColor(successOklch)};
        --wa: ${oklchToCssValue(warningOklch)};
        --wac: ${generateContrastingTextColor(warningOklch)};
        --er: ${oklchToCssValue(errorOklch)};
        --erc: ${generateContrastingTextColor(errorOklch)};
      }
    `;
    
    
    style.textContent = css;
    document.head.appendChild(style);
    
    // Set the theme attribute
    document.documentElement.setAttribute('data-theme', `custom-${theme.id}`);
  };

  // Clear custom theme styles and apply standard theme
  const clearCustomTheme = (standardTheme: string) => {
    // Always remove any existing custom theme CSS
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    // Set the theme attribute to the standard theme
    document.documentElement.setAttribute('data-theme', standardTheme);
  };

  // Stop preview when leaving custom theme section
  useEffect(() => {
    if (themeSubTab !== 'custom' && previewTheme) {
      stopPreview();
    }
  }, [themeSubTab, previewTheme]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.user);
        setCurrentTheme(response.user.theme || 'retro');
        setBio(response.user.bio || '');
        setFirstName(response.user.firstName || '');
        setLastName(response.user.lastName || '');
        setUsername(response.user.username || '');
        setDisplayPreference(response.user.displayPreference || 'username');
        setIsPublicProfile(response.user.isPublic || false);
        setPublicSlug(response.user.publicSlug || '');
        
        // Load custom themes
        loadCustomThemes();
        
        // Apply theme from database
        const userTheme = response.user.theme || 'retro';
        if (userTheme.startsWith('custom-')) {
          // It's a custom theme, find and apply it
          const themeId = userTheme.replace('custom-', '');
          const saved = localStorage.getItem('customThemes');
          if (saved) {
            const customThemes = JSON.parse(saved);
            const customTheme = customThemes.find((t: CustomTheme) => t.id === themeId);
            if (customTheme) {
              applyCustomTheme(customTheme);
            } else {
              // Custom theme not found, fallback to retro
              document.documentElement.setAttribute('data-theme', 'retro');
              setCurrentTheme('retro');
            }
          }
        } else {
          // Standard theme
          clearCustomTheme(userTheme);
        }
      } catch (err) {
        // Fallback to localStorage if not authenticated
        const savedTheme = localStorage.getItem('theme') || 'retro';
        setCurrentTheme(savedTheme);
        loadCustomThemes();
        if (savedTheme.startsWith('custom-')) {
          const themeId = savedTheme.replace('custom-', '');
          const saved = localStorage.getItem('customThemes');
          if (saved) {
            const customThemes = JSON.parse(saved);
            const customTheme = customThemes.find((t: CustomTheme) => t.id === themeId);
            if (customTheme) {
              applyCustomTheme(customTheme);
            } else {
              clearCustomTheme('retro');
            }
          }
        } else {
          clearCustomTheme(savedTheme);
        }
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
      toast.success('Google account linked successfully!');
      // Refresh user data to show updated state
      authAPI.getMe().then(response => setUser(response.user)).catch(() => {});
      // Clean up URL using React Router
      setSearchParams({});
    } else if (googleLinked === 'error') {
      toast.error(message ? decodeURIComponent(message) : 'Failed to link Google account');
      // Clean up URL using React Router
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Check username availability with debounce
  useEffect(() => {
    if (!isEditingUsername) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const checkUsername = async () => {
      const trimmedUsername = username.trim().toLowerCase();

      // If username is same as current, it's available
      if (trimmedUsername === user?.username) {
        setUsernameStatus({ checking: false, available: true, message: 'Current username' });
        return;
      }

      if (!trimmedUsername) {
        setUsernameStatus({ checking: false, available: null, message: '' });
        return;
      }

      if (trimmedUsername.length < 3) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Username must be at least 3 characters'
        });
        return;
      }

      if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: 'Only lowercase letters, numbers, and underscores allowed'
        });
        return;
      }

      setUsernameStatus({ checking: true, available: null, message: 'Checking...' });

      try {
        const result = await authAPI.checkUsername(trimmedUsername);
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
  }, [username, isEditingUsername, user?.username]);

  const handleThemeChange = async (newTheme: string) => {
    await withSaving(async () => {
      
      // ALWAYS clear any existing custom theme CSS first
      clearCustomTheme(newTheme);
      
      // Update theme in database if user is authenticated
      if (user) {
        const response = await authAPI.updateTheme(newTheme);
        setUser(response.user);
      }
      
      // Update local state and apply theme
      setCurrentTheme(newTheme);
      
      if (newTheme.startsWith('custom-')) {
        // Apply custom theme AFTER clearing
        const themeId = newTheme.replace('custom-', '');
        const customTheme = customThemes.find(t => t.id === themeId);
        if (customTheme) {
          applyCustomTheme(customTheme);
        }
      }
      
      // Keep localStorage as fallback
      localStorage.setItem('theme', newTheme);
    }).catch((err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update theme');
      // Revert theme on error
      const previousTheme = user?.theme || localStorage.getItem('theme') || 'retro';
      setCurrentTheme(previousTheme);
      clearCustomTheme(previousTheme);
      if (previousTheme.startsWith('custom-')) {
        const themeId = previousTheme.replace('custom-', '');
        const customTheme = customThemes.find(t => t.id === themeId);
        if (customTheme) {
          applyCustomTheme(customTheme);
        }
      }
    });
  };

  // Custom theme management functions
  const createCustomTheme = () => {
    if (!newThemeName.trim()) {
      toast.error('Theme name is required');
      return;
    }
    
    const newTheme: CustomTheme = {
      id: Date.now().toString(),
      name: newThemeName.trim(),
      colors: { ...customColors },
      createdAt: new Date().toISOString()
    };
    
    const updatedThemes = [...customThemes, newTheme];
    saveCustomThemes(updatedThemes);
    
    setNewThemeName('');
    setCustomColors(DEFAULT_CUSTOM_COLORS);
    setIsCreatingTheme(false);
    toast.success(`Custom theme "${newTheme.name}" created successfully!`);
  };

  const updateCustomTheme = (themeId: string) => {
    if (!editingThemeName.trim()) {
      toast.error('Theme name is required');
      return;
    }

    const updatedThemes = customThemes.map(theme => 
      theme.id === themeId 
        ? { ...theme, name: editingThemeName.trim(), colors: { ...customColors } }
        : theme
    );
    saveCustomThemes(updatedThemes);
    
    // If currently using this theme, reapply it
    if (currentTheme === `custom-${themeId}`) {
      const updatedTheme = updatedThemes.find(t => t.id === themeId);
      if (updatedTheme) {
        applyCustomTheme(updatedTheme);
      }
    }
    
    setEditingThemeId(null);
    setEditingThemeName('');
    toast.success('Custom theme updated successfully!');
  };

  const deleteCustomTheme = (themeId: string) => {
    const themeToDelete = customThemes.find(t => t.id === themeId);
    const updatedThemes = customThemes.filter(theme => theme.id !== themeId);
    saveCustomThemes(updatedThemes);
    
    // If currently using this theme, switch to retro
    if (currentTheme === `custom-${themeId}`) {
      handleThemeChange('retro');
    }
    
    toast.success(`Custom theme "${themeToDelete?.name}" deleted successfully!`);
  };

  const startEditing = (theme: CustomTheme) => {
    setEditingThemeId(theme.id);
    setEditingThemeName(theme.name);
    setCustomColors(theme.colors);
  };

  const cancelEditing = () => {
    setEditingThemeId(null);
    setEditingThemeName('');
    setCustomColors(DEFAULT_CUSTOM_COLORS);
  };

  const previewCustomTheme = (theme: CustomTheme) => {
    setPreviewTheme(theme);
    clearCustomTheme(`custom-${theme.id}`);
    applyCustomTheme(theme);
  };

  const stopPreview = () => {
    setPreviewTheme(null);
    // Always clear custom CSS first
    clearCustomTheme(currentTheme);
    // Then reapply current theme if it's custom
    if (currentTheme.startsWith('custom-')) {
      const themeId = currentTheme.replace('custom-', '');
      const customTheme = customThemes.find(t => t.id === themeId);
      if (customTheme) {
        applyCustomTheme(customTheme);
      }
    }
  };

  const duplicateTheme = (theme: CustomTheme) => {
    const newTheme: CustomTheme = {
      id: Date.now().toString(),
      name: `${theme.name} Copy`,
      colors: { ...theme.colors },
      createdAt: new Date().toISOString()
    };
    
    const updatedThemes = [...customThemes, newTheme];
    saveCustomThemes(updatedThemes);
    toast.success(`Theme "${newTheme.name}" created successfully!`);
  };

  const handleLinkGoogle = () => {
    authAPI.linkGoogle();
  };

  const handleUnlinkGoogle = async () => {
    await withUnlinking(async () => {
      await authAPI.unlinkGoogle();
      toast.success('Google account unlinked successfully!');
      // Refresh user data to show updated state
      const response = await authAPI.getMe();
      setUser(response.user);
    }).catch((err: any) => {
      toast.error(err.response?.data?.message || 'Failed to unlink Google account');
    });
  };

  const handleSaveProfile = async () => {
    await withSavingProfile(async () => {
      const response = await authAPI.updateProfile({ bio });
      setUser(response.user);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    }).catch((err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    });
  };

  const handleCancelProfileEdit = () => {
    setBio(user?.bio || '');
    setIsEditingProfile(false);
  };

  const handleSaveName = async () => {
    await withSavingName(async () => {
      const response = await authAPI.updateName({ firstName, lastName });
      setUser(response.user);
      setIsEditingName(false);
      toast.success('Name updated successfully!');
    }).catch((err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update name');
    });
  };

  const handleCancelNameEdit = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setIsEditingName(false);
  };

  const handleSaveUsername = async () => {
    if (!usernameStatus.available) {
      toast.error('Please choose an available username');
      return;
    }

    await withSavingUsername(async () => {
      const response = await authAPI.updateUsername({ username: username.trim().toLowerCase() });
      setUser(response.user);
      setIsEditingUsername(false);
      setUsernameStatus({ checking: false, available: null, message: '' });
      toast.success('Username updated successfully!');
    }).catch((err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update username');
    });
  };

  const handleCancelUsernameEdit = () => {
    setUsername(user?.username || '');
    setIsEditingUsername(false);
    setUsernameStatus({ checking: false, available: null, message: '' });
  };

  const handleSaveDisplayPreference = async (preference: 'name' | 'username') => {
    try {
      const updateData: { displayPreference: 'name' | 'username'; publicSlug?: string } = { displayPreference: preference };

      // SAFETY FEATURE: If switching to username preference and no custom publicSlug is set,
      // automatically set publicSlug to username so the URL uses it
      if (preference === 'username' && !publicSlug && user?.username) {
        updateData.publicSlug = user.username;
        setPublicSlug(user.username);
      }

      const response = await authAPI.updateProfile(updateData);
      setUser(response.user);
      setDisplayPreference(preference);
      toast.success('Display preference updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update display preference');
    }
  };

  const generateSlugFromName = () => {
    // Generate slug based on display preference
    if (displayPreference === 'username' && user?.username) {
      // Use username as slug if display preference is username
      setPublicSlug(user.username);
    } else if (user?.firstName && user?.lastName) {
      // Use name-based slug if display preference is name
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

    try {
      const response = await authAPI.updateProfile({
        isPublic: isPublicProfile,
        publicSlug: publicSlug.trim() || undefined
      });
      setUser(response.user);
      toast.success('Public profile settings updated successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update public profile settings');
    } finally {
      setSavingPublicSettings(false);
    }
  };

  const copyPublicProfileUrl = () => {
    const url = `${window.location.origin}/user/${publicSlug || user?.username || user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Public profile URL copied to clipboard!');
  };

  const hasPublicChanges = () => {
    if (!user) return false;
    return (
      isPublicProfile !== (user.isPublic || false) ||
      publicSlug !== (user.publicSlug || '')
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
    <div className="space-y-6 p-2 rounded-lg">
      {/* Header */}
      <div className="items-center">
        
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
        <div className="tabs-container p-1">
          <button
            className={`tab-button ${activeTab === 'profile' ? 'tab-active' : ''}`}
            style={activeTab === 'profile' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`tab-button ${activeTab === 'theme' ? 'tab-active' : ''}`}
            style={activeTab === 'theme' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('theme')}
          >
            Theme
          </button>
          <button
            className={`tab-button ${activeTab === 'connections' ? 'tab-active' : ''}`}
            style={activeTab === 'connections' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('connections')}
          >
            Connections
          </button>
          <button
            className={`tab-button ${activeTab === 'analytics' ? 'tab-active' : ''}`}
            style={activeTab === 'analytics' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`tab-button ${activeTab === 'billing' ? 'tab-active' : ''}`}
            style={activeTab === 'billing' ? {color: getContrastTextColor()} : {}}
            onClick={() => setActiveTab('billing')}
          >
            Billing
          </button>
        </div>
      </div>


      {/* Tab Content */}
      <div>
        <div className="card-body p-6">
            {/* Theme Tab */}
            {activeTab === 'theme' && (
              <div className="space-y-6">
                <div className='text-center space-y-2'>
                  <h2 className="text-2xl font-bold mb-2">Theme Preferences</h2>
                  <p className="text-base-content/60">
                    Choose from preset themes or create your own custom themes with personalized colors.
                    {user ? ' Your preference will be saved to your account.' : ' Sign in to save your theme preference.'}
                  </p>
                </div>

                {/* Theme Sub-tabs */}
                <div className="flex justify-center">
                  <div className="tabs-container p-1">
                    <button
                      className={`tab-button ${themeSubTab === 'preset' ? 'tab-active' : ''}`}
                      style={themeSubTab === 'preset' ? {color: getContrastTextColor()} : {}}
                      onClick={() => setThemeSubTab('preset')}
                    >
                      Preset Themes
                    </button>
                    <button
                      className={`tab-button ${themeSubTab === 'custom' ? 'tab-active' : ''}`}
                      style={themeSubTab === 'custom' ? {color: getContrastTextColor()} : {}}
                      onClick={() => setThemeSubTab('custom')}
                    >
                      Custom Themes ({customThemes.length})
                    </button>
                  </div>
                </div>


                {previewTheme && (
                  <div className="alert alert-warning shadow-md border border-warning/30">
                    <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="font-medium">Previewing: {previewTheme.name}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            await handleThemeChange(`custom-${previewTheme.id}`);
                            // Only stop preview if theme change was successful
                            setPreviewTheme(null);
                          } catch (error) {
                            // Don't stop preview if there was an error
                          }
                        }} 
                        className="btn btn-sm btn-success border-2 border-success/50 hover:border-success shadow-sm"
                        disabled={saving}
                      >
                        {saving ? 'Applying...' : 'Apply Theme'}
                      </button>
                      <button 
                        onClick={stopPreview} 
                        className="btn btn-sm btn-ghost border-2 border-base-content/20 hover:border-base-content/40"
                      >
                        Stop Preview
                      </button>
                    </div>
                  </div>
                )}

                {/* Preset Themes */}
                {themeSubTab === 'preset' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
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
                  </div>
                )}

                {/* Custom Themes */}
                {themeSubTab === 'custom' && (
                  <div className="space-y-6">
                    {/* Create New Theme Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => {
                          setIsCreatingTheme(true);
                          setNewThemeName('');
                          setCustomColors(DEFAULT_CUSTOM_COLORS);
                        }}
                        className="btn btn-primary gap-2 border-thick"
                        style={{ color: getContrastTextColor('primary') }}
                        disabled={isCreatingTheme}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Custom Theme
                      </button>
                    </div>

                    {/* Theme Creation/Editing Form */}
                    {(isCreatingTheme || editingThemeId) && (
                      <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="bg-base-200 px-6 py-4 border-b border-base-300 rounded-t-2xl">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-base-content">
                              {isCreatingTheme ? 'Create New Theme' : 'Edit Theme'}
                            </h3>
                            <button
                              onClick={() => {
                                setIsCreatingTheme(false);
                                cancelEditing();
                              }}
                              className="btn btn-sm btn-circle btn-ghost hover:bg-base-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div className="card-body p-6 space-y-6">

                          {/* Theme Name */}
                          {isCreatingTheme && (
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text font-medium">Theme Name</span>
                                <span className="label-text-alt text-sm opacity-70">Required</span>
                              </label>
                              <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="My Awesome Theme"
                                value={newThemeName}
                                onChange={(e) => setNewThemeName(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Theme Name for Editing */}
                          {editingThemeId && (
                            <div className="form-control">
                              <label className="label">
                                <span className="label-text font-medium">Theme Name</span>
                                <span className="label-text-alt text-sm opacity-70">Required</span>
                              </label>
                              <input
                                type="text"
                                className="input input-bordered w-full"
                                placeholder="My Awesome Theme"
                                value={editingThemeName}
                                onChange={(e) => setEditingThemeName(e.target.value)}
                              />
                            </div>
                          )}

                          {/* Theme Color Guide */}
                          <div className="bg-base-100 rounded-xl p-6 border border-base-300 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <h4 className="text-xl font-semibold text-base-content mb-2">Color Guide</h4>
                                <p className="text-md text-base-content/70 mb-2">
                                  Base colors should be similar shades for backgrounds. Primary/Secondary/Accent are your main UI colors.
                                </p>
                                <p className="text-md text-base-content/70 mb-4">
                                  For color inspiration, coolors.co is a great color scheme generator that you can use to generate a palette from your primary color.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <a 
                                    href="https://coolors.co/generate" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="btn btn-primary btn-sm gap-2 shadow-md hover:shadow-lg transition-all"
                                    style={{ color: getContrastTextColor('primary') }}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Browse Coolors.co
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Color Pickers - Improved Layout */}
                          <div className="space-y-6">
                            {/* Main Colors */}
                            <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                              <h4 className="font-semibold mb-3">
                                Main Colors
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {['primary', 'secondary', 'accent'].map((colorKey) => (
                                  <div key={colorKey} className="form-control">
                                    <label className="label py-1">
                                      <span className="label-text font-medium capitalize">{colorKey}</span>
                                      <span className="label-text-alt text-xs opacity-60">
                                        {colorKey === 'primary' && 'buttons'}
                                        {colorKey === 'secondary' && 'alt buttons'}
                                        {colorKey === 'accent' && 'highlights'}
                                      </span>
                                    </label>
                                    <div className="join">
                                      <input
                                        type="color"
                                        className="join-item w-10 h-8 border-0 rounded-l-lg cursor-pointer"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => setCustomColors(prev => ({
                                          ...prev,
                                          [colorKey]: e.target.value
                                        }))}
                                      />
                                      <input
                                        type="text"
                                        className="input input-bordered join-item flex-1 input-sm"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value.startsWith('#') && value.length <= 7) {
                                            setCustomColors(prev => ({
                                              ...prev,
                                              [colorKey]: value
                                            }));
                                          }
                                        }}
                                        placeholder="#000000"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Background Colors */}
                            <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                              <h4 className="font-semibold mb-3">
                                Background Colors
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {['neutral', 'base-100', 'base-200', 'base-300'].map((colorKey) => (
                                  <div key={colorKey} className="form-control">
                                    <label className="label py-1">
                                      <span className="label-text font-medium">{colorKey}</span>
                                      <span className="label-text-alt text-xs opacity-60">
                                        {colorKey === 'neutral' && 'text/borders'}
                                        {colorKey === 'base-100' && 'main bg'}
                                        {colorKey === 'base-200' && 'cards'}
                                        {colorKey === 'base-300' && 'dividers'}
                                      </span>
                                    </label>
                                    <div className="join">
                                      <input
                                        type="color"
                                        className="join-item w-10 h-8 border-0 rounded-l-lg cursor-pointer"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => setCustomColors(prev => ({
                                          ...prev,
                                          [colorKey]: e.target.value
                                        }))}
                                      />
                                      <input
                                        type="text"
                                        className="input input-bordered join-item flex-1 input-sm"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value.startsWith('#') && value.length <= 7) {
                                            setCustomColors(prev => ({
                                              ...prev,
                                              [colorKey]: value
                                            }));
                                          }
                                        }}
                                        placeholder="#000000"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Status Colors */}
                            <div className="bg-base-100 rounded-lg p-4 border border-base-300">
                              <h4 className="font-semibold mb-3">
                                Status Colors
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {['info', 'success', 'warning', 'error'].map((colorKey) => (
                                  <div key={colorKey} className="form-control">
                                    <label className="label py-1">
                                      <span className="label-text font-medium capitalize">{colorKey}</span>
                                    </label>
                                    <div className="join">
                                      <input
                                        type="color"
                                        className="join-item w-10 h-8 border-0 rounded-l-lg cursor-pointer"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => setCustomColors(prev => ({
                                          ...prev,
                                          [colorKey]: e.target.value
                                        }))}
                                      />
                                      <input
                                        type="text"
                                        className="input input-bordered join-item flex-1 input-sm"
                                        value={customColors[colorKey as keyof typeof customColors]}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value.startsWith('#') && value.length <= 7) {
                                            setCustomColors(prev => ({
                                              ...prev,
                                              [colorKey]: value
                                            }));
                                          }
                                        }}
                                        placeholder="#000000"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Theme Preview */}
                          <ThemePreview colors={customColors} />

                          {/* Action Buttons */}
                          <div className="flex gap-2 justify-end pt-4 border-t border-base-300">
                            <button
                              onClick={() => {
                                setIsCreatingTheme(false);
                                cancelEditing();
                              }}
                              className="btn btn-ghost"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => isCreatingTheme ? createCustomTheme() : updateCustomTheme(editingThemeId!)}
                              className="btn btn-primary"
                              style={{ color: getContrastTextColor('primary') }}
                              disabled={isCreatingTheme ? !newThemeName.trim() : !editingThemeName.trim()}
                            >
                              {isCreatingTheme ? 'Create Theme' : 'Update Theme'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Themes List */}
                    {customThemes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customThemes.map((theme) => (
                          <div key={theme.id} className="bg-base-100 rounded-lg p-4 border-2 border-base-content/20 hover:border-primary/30 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold truncate">{theme.name}</h4>
                              <div className="relative">
                                <button 
                                  className="btn btn-ghost btn-sm btn-circle"
                                  onClick={() => setOpenDropdown(openDropdown === theme.id ? null : theme.id)}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                
                                {openDropdown === theme.id && (
                                  <div className="absolute right-0 top-full mt-2 bg-base-100 rounded-box z-[10000] p-2 shadow-lg border-2 border-base-content/20 w-52">
                                    <div className="max-h-80 overflow-y-auto">
                                      <div 
                                        className="p-2 rounded cursor-pointer hover:bg-base-200"
                                        onClick={() => {
                                          previewCustomTheme(theme);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        Preview
                                      </div>
                                      <div 
                                        className="p-2 rounded cursor-pointer hover:bg-base-200"
                                        onClick={() => {
                                          startEditing(theme);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        Edit
                                      </div>
                                      <div 
                                        className="p-2 rounded cursor-pointer hover:bg-base-200"
                                        onClick={() => {
                                          duplicateTheme(theme);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        Duplicate
                                      </div>
                                      <div 
                                        className="p-2 rounded cursor-pointer hover:bg-base-200"
                                        onClick={() => {
                                          deleteCustomTheme(theme.id);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        Delete
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Color Swatches */}
                            <div className="grid grid-cols-4 gap-1 mb-3">
                              <div className="w-full h-6 rounded" style={{ backgroundColor: theme.colors.primary }}></div>
                              <div className="w-full h-6 rounded" style={{ backgroundColor: theme.colors.secondary }}></div>
                              <div className="w-full h-6 rounded" style={{ backgroundColor: theme.colors.accent }}></div>
                              <div className="w-full h-6 rounded" style={{ backgroundColor: theme.colors.neutral }}></div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleThemeChange(`custom-${theme.id}`)}
                                className={`btn btn-sm flex-1 ${
                                  currentTheme === `custom-${theme.id}` 
                                    ? 'btn-primary' : 'btn-outline border-2'
                                }`}
                                style={{ color: getContrastTextColor('primary') }}
                                disabled={saving}
                              >
                                {currentTheme === `custom-${theme.id}` ? 'Active' : 'Apply'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isCreatingTheme && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-base-200 flex items-center justify-center">
                            <svg className="w-8 h-8 text-base-content/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                            </svg>
                          </div>
                          <h3 className="text-xl font-bold mb-2">No Custom Themes Yet</h3>
                          <p className="text-base-content/60 mb-4">Create your own personalized themes with custom colors</p>
                          <button
                            onClick={() => {
                              setIsCreatingTheme(true);
                              setNewThemeName('');
                              setCustomColors(DEFAULT_CUSTOM_COLORS);
                            }}
                            className="btn btn-primary gap-2"
                            style={{ color: getContrastTextColor('primary') }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Create Your First Theme
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Current Theme Info */}
                <div className="bg-base-200 rounded-lg p-4 border-thick">
                  <h3 className="font-semibold mb-2">
                    Current Theme: {currentTheme.startsWith('custom-') 
                      ? customThemes.find(t => t.id === currentTheme.replace('custom-', ''))?.name || 'Unknown Custom Theme'
                      : currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)
                    }
                  </h3>
                  <div className="text-sm text-base-content/60">
                    <p>Theme preference is saved to your account and will be applied across all devices.</p>
                    {currentTheme.startsWith('custom-') && (
                      <p className="mt-1">Custom themes are stored locally and may not sync across different browsers or devices.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Connections Tab */}
            {activeTab === 'connections' && (
              <div className="space-y-6">
                <div className='text-center space-y-2'>
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">Account Connections</h2>
                  <p className="text-sm sm:text-base text-base-content/60">
                    Link your account with external services for easier sign-in.
                  </p>
                </div>

                {/* Google Account */}
                <div className="bg-base-200 rounded-lg p-4 sm:p-6 border border-thick border-base-content/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-base-100 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg">Google</h3>
                        <p className="text-base-content/60 text-xs sm:text-sm">
                          {user?.hasGoogleAccount
                            ? 'Your Google account is connected'
                            : 'Connect your Google account for easier sign-in'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
                          style={{ color: getContrastTextColor('primary') }}
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
                  <div className="tabs-container p-1">
                    <button
                      className={`tab-button ${profileSubTab === 'personal' ? 'tab-active' : ''}`}
                      style={profileSubTab === 'personal' ? {color: getContrastTextColor()} : {}}
                      onClick={() => setProfileSubTab('personal')}
                    >
                      Personal Info
                    </button>
                    <button
                      className={`tab-button ${profileSubTab === 'public' ? 'tab-active' : ''}`}
                      style={profileSubTab === 'public' ? {color: getContrastTextColor()} : {}}
                      onClick={() => setProfileSubTab('public')}
                    >
                      Public Profile
                    </button>
                    <button
                      className={`tab-button ${profileSubTab === 'privacy' ? 'tab-active' : ''}`}
                      style={profileSubTab === 'privacy' ? {color: getContrastTextColor()} : {}}
                      onClick={() => setProfileSubTab('privacy')}
                    >
                      Privacy Info
                    </button>
                  </div>
                </div>

                {user && (
                  <>
                    {/* Personal Information */}
                    {profileSubTab === 'personal' && (
                    <div className="section-container mb-4">
                      <div className="section-header">
                        <div className="flex items-center gap-3">
                          <div className="section-icon">👤</div>
                          <span>Personal Information</span>
                        </div>
                      </div>
                        <div className="section-content space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div>
                              <h3 className="font-semibold text-base mb-3 flex items-center justify-between">
                                Account Details
                                {!isEditingName && (
                                  <button
                                    onClick={() => setIsEditingName(true)}
                                    className="btn btn-xs btn-primary"
                                    style={{ color: getContrastTextColor('primary') }}
                                  >
                                    Edit Name
                                  </button>
                                )}
                              </h3>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">First Name</label>
                                  {isEditingName ? (
                                    <input
                                      type="text"
                                      value={firstName}
                                      onChange={(e) => setFirstName(e.target.value)}
                                      className="input input-bordered input-sm w-full"
                                      required
                                    />
                                  ) : (
                                    <p className="text-base-content font-medium">{user.firstName}</p>
                                  )}
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70">Last Name</label>
                                  {isEditingName ? (
                                    <input
                                      type="text"
                                      value={lastName}
                                      onChange={(e) => setLastName(e.target.value)}
                                      className="input input-bordered input-sm w-full"
                                      required
                                    />
                                  ) : (
                                    <p className="text-base-content font-medium">{user.lastName}</p>
                                  )}
                                </div>
                                {isEditingName && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSaveName}
                                      className="btn btn-sm btn-primary"
                                      style={{ color: getContrastTextColor('primary') }}
                                      disabled={savingName || !firstName.trim() || !lastName.trim()}
                                    >
                                      {savingName ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={handleCancelNameEdit}
                                      className="btn btn-sm btn-ghost"
                                      disabled={savingName}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm font-medium text-base-content/70 flex items-center justify-between">
                                    Username
                                    {!isEditingUsername && (
                                      <button
                                        onClick={() => setIsEditingUsername(true)}
                                        className="btn btn-xs btn-primary"
                                        style={{ color: getContrastTextColor('primary') }}
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </label>
                                  {isEditingUsername ? (
                                    <div className="space-y-2">
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={username}
                                          onChange={(e) => setUsername(e.target.value)}
                                          className={`input input-bordered input-sm w-full ${
                                            usernameStatus.available === true ? 'input-success' :
                                            usernameStatus.available === false ? 'input-error' : ''
                                          }`}
                                          placeholder="Enter username"
                                          minLength={3}
                                          maxLength={30}
                                        />
                                        {usernameStatus.message && (
                                          <span className={`text-xs mt-1 block ${
                                            usernameStatus.checking ? 'text-info' :
                                            usernameStatus.available ? 'text-success' : 'text-error'
                                          }`}>
                                            {usernameStatus.checking ? '⏳' : usernameStatus.available ? '✓' : '✗'} {usernameStatus.message}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={handleSaveUsername}
                                          className="btn btn-sm btn-primary"
                                          style={{ color: getContrastTextColor('primary') }}
                                          disabled={savingUsername || !usernameStatus.available || !username.trim()}
                                        >
                                          {savingUsername ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={handleCancelUsernameEdit}
                                          className="btn btn-sm btn-ghost"
                                          disabled={savingUsername}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-base-content font-medium">@{user.username}</p>
                                  )}
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
                                    <span className={`badge h-6 font-semibold border-2 border-base-content/20 ${user.planTier === 'free' ? 'badge-ghost' : user.planTier === 'pro' ? 'badge-primary' : 'badge-secondary'}`}>
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
                                <div className="divider my-2"></div>
                                <div>
                                  <label className="text-sm font-medium text-base-content/70 mb-2 block">Public Display Preference</label>
                                  <div className="form-control">
                                    <label className="label cursor-pointer justify-start gap-3 py-2">
                                      <input
                                        type="radio"
                                        name="displayPreference"
                                        className="radio radio-primary"
                                        checked={displayPreference === 'name'}
                                        onChange={() => handleSaveDisplayPreference('name')}
                                      />
                                      <div>
                                        <span className="label-text font-medium">Show Full Name</span>
                                        <p className="text-xs text-base-content/60">Display as: {user.firstName} {user.lastName}</p>
                                      </div>
                                    </label>
                                  </div>
                                  <div className="form-control">
                                    <label className="label cursor-pointer justify-start gap-3 py-2">
                                      <input
                                        type="radio"
                                        name="displayPreference"
                                        className="radio radio-primary"
                                        checked={displayPreference === 'username'}
                                        onChange={() => handleSaveDisplayPreference('username')}
                                      />
                                      <div>
                                        <span className="label-text font-medium">Show Username</span>
                                        <p className="text-xs text-base-content/60">Display as: @{user.username}</p>
                                      </div>
                                    </label>
                                  </div>
                                  <p className="text-xs text-base-content/60 mt-2">
                                    This controls how your name appears in public profiles and discovery.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    )}


                    {/* Public Profile Settings */}
                    {profileSubTab === 'public' && (
                    <div className="section-container mb-4">
                      <div className="section-header">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="section-icon">🌐</div>
                          <span className="text-sm sm:text-base">Public Profile Settings</span>
                        </div>
                      </div>
                      <div className="section-content">
                        {/* Header with title and controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
                          <div className="flex-1">
                            <p className="text-xs sm:text-sm text-base-content/70">
                              {isPublicProfile ? 'Profile is public' : 'Profile is private'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                                  to={`/user/${publicSlug || user?.username || user?.id}`}
                                  className="btn btn-outline btn-sm gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                  </svg>
                                  {publicSlug ? `/user/${publicSlug}` : `/user/${user?.username || user?.id}`}
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
                                <div className="flex-1 mb-4">
                                  <span className="label-text text-lg font-semibold">🔓 Make Profile Public</span>
                                  <p className="text-sm text-base-content/60 mt-1">
                                    Enable this to create a public portfolio page showcasing your projects and skills.
                                    Others will be able to discover your profile and view your public projects.
                                  </p>
                                </div>

                                <div className="flex items-center justify-center gap-0 bg-base-200 border-thick rounded-lg p-1 w-fit mx-auto sm:mx-0">
                                  <button
                                    type="button"
                                    onClick={() => setIsPublicProfile(false)}
                                    className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                                      !isPublicProfile
                                        ? 'bg-warning text-warning-content shadow-md'
                                        : 'text-base-content/60 hover:text-base-content'
                                    }`}
                                    style={!isPublicProfile ? { color: getContrastTextColor('warning') } : {}}
                                  >
                                    Private
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setIsPublicProfile(true)}
                                    className={`px-4 sm:px-6 py-2 rounded-md font-semibold transition-all ${
                                      isPublicProfile
                                        ? 'bg-success text-success-content shadow-md'
                                        : 'text-base-content/60 hover:text-base-content'
                                    }`}
                                    style={isPublicProfile ? { color: getContrastTextColor('success') } : {}}
                                  >
                                    Public
                                  </button>
                                </div>

                                {isPublicProfile && (
                                  <p className="text-sm bg-success inline-block rounded-lg px-3 py-2 font-medium border-thick mt-3"
                                  style={{ color: getContrastTextColor('success') }}>
                                    ☑️ Your profile is publicly accessible
                                  </p>
                                )}
                              </div>

                              {/* Public Settings - Only show when public is enabled */}
                              {isPublicProfile && (
                                <div className="space-y-4 border-t border-base-300 pt-4">
                                  {/* Custom Slug */}
                                  <div className="form-control">
                                    <div className="label flex-col sm:flex-row justify-start items-start gap-2">
                                      <span className="label-text font-medium text-sm sm:text-base">Custom URL Slug:</span>
                                      <span className="label-text-alt text-xs flex flex-wrap items-center gap-1">
                                        <span className="hidden sm:inline">Accessible at:</span>
                                        {publicSlug ? (
                                          <a
                                            href={`${window.location.origin}/user/${publicSlug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-bold bg-primary/50 rounded-lg px-2 py-0.5 text-xs border border-base-content/20 hover:bg-primary transition inline-flex items-center gap-1"
                                            style={{ color: getContrastTextColor() }}
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                            <span className="truncate max-w-[120px]">/user/{publicSlug}</span>
                                          </a>
                                        ) : (
                                          <a
                                            href={`${window.location.origin}/user/${user?.username || user?.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-bold bg-primary/50 rounded-lg px-2 py-0.5 text-xs border border-base-content/20 hover:bg-primary transition inline-flex items-center gap-1"
                                            style={{ color: getContrastTextColor() }}
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                            <span className="truncate max-w-[120px]">/user/{user?.username || user?.id}</span>
                                          </a>
                                        )}
                                      </span>
                                      <span className="label-text-alt sm:ml-auto">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            generateSlugFromName();
                                          }}
                                          className="btn btn-ghost btn-xs text-xs bg-base-200 border border-base-content/20 hover:bg-base-300"
                                        >
                                          Generate
                                        </button>
                                      </span>
                                    </div>
                                    <div className="flex flex-row border-2 border-base-content/20 rounded-lg overflow-hidden">
                                      <span className="bg-base-200 px-2 sm:px-3 py-2 text-xs sm:text-sm text-base-content/70 flex items-center whitespace-nowrap">
                                        <span className="hidden md:inline">{window.location.origin}/user/</span>
                                        <span className="md:hidden">...user/</span>
                                      </span>
                                      <input
                                        type="text"
                                        className="input flex-1 border-none text-xs sm:text-sm w-0 min-w-0"
                                        placeholder={user?.id}
                                        value={publicSlug}
                                        onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                      />
                                    </div>
                                  </div>

                                  {/* Profile Bio */}
                                  <div className="form-control">
                                    <label className="label">
                                      <span className="label-text font-medium">Profile Bio</span>
                                      <span className="label-text-alt ml-auto px-2 rounded-lg py-0.5 text-xs font-semibold bg-base-200 border-2 border-base-content/20">
                                        {bio.length}/500 characters
                                      </span>
                                      {isEditingProfile ? (
                                        <div className="flex gap-2 ml-2">
                                          <button
                                            onClick={handleSaveProfile}
                                            className="btn btn-xs btn-primary border-2 border-base-content/20"
                                            style={{ color: getContrastTextColor('primary') }}
                                            disabled={savingProfile}
                                          >
                                            {savingProfile ? 'Saving...' : 'Save Bio'}
                                          </button>
                                          <button
                                            onClick={handleCancelProfileEdit}
                                            className="btn btn-xs bg-base-200 border-2 border-base-content/20 hover:bg-base-300"
                                            disabled={savingProfile}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setIsEditingProfile(true)}
                                          className="btn btn-xs btn-primary border-2 border-base-content/20 ml-2"
                                          style={{ color: getContrastTextColor('primary') }}
                                        >
                                          {bio ? 'Edit Bio' : 'Add Bio'}
                                        </button>
                                      )}
                                    </label>
                                    <div className="space-y-4">
                                      {isEditingProfile ? (
                                        <div className="space-y-4">
                                          <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            className="textarea textarea-bordered w-full h-32 resize-none"
                                            placeholder="Tell others about yourself, your interests, and what you're working on..."
                                            maxLength={500}
                                          />
                                        </div>
                                      ) : (
                                        <>
                                          <div className="textarea textarea-bordered">
                                            {bio ? (
                                              <p className="text-base-content whitespace-pre-wrap">{bio}</p>
                                            ) : (
                                              <p className="text-base-content/60 italic">No bio added yet. Click edit to add one.</p>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Profile Preview */}
                                  <div className="divider">Preview</div>
                                  <div className="mockup-browser border border-base-content/10 bg-base-300">
                                    <div className="mockup-browser-toolbar">
                                      <div className="input">
                                        {window.location.origin}/user/{publicSlug || user?.username || user?.id}
                                      </div>
                                    </div>
                                    <div className="bg-base-100 p-4">
                                      <div className="flex items-start gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl font-bold" style={{ color: getContrastTextColor('primary') }}>
                                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                                        </div>
                                        <div>
                                          <h3 className="text-xl font-bold">
                                            {displayPreference === 'username' ? `@${user?.username}` : `${user?.firstName} ${user?.lastName}`}
                                          </h3>
                                          {publicSlug && (
                                            <span className="text-base-content/60">
                                              @{publicSlug}
                                            </span>
                                          )}
                                          {bio && (
                                            <p className="text-sm text-base-content/70 mt-1">
                                              {bio}
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
                            </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Privacy Information */}
                    {profileSubTab === 'privacy' && (
                    <div className="section-container mb-4">
                      <div className="section-header">
                        <div className="flex items-center gap-3">
                          <div className="section-icon">📋</div>
                          <span>Privacy Information</span>
                        </div>
                      </div>
                      <div className="section-content">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-3">
                              <h4 className="font-medium text-success">✅ Included</h4>
                              <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-success"></div>
                                  Your name and profile bio
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

            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div className='text-center space-y-2'>
                  <h2 className="text-2xl font-bold mb-2">Billing & Subscription</h2>
                  <p className="text-base-content/60">
                    Manage your subscription plan, view billing history, and update payment methods.
                  </p>
                </div>

                {/* Quick Plan Summary */}
                <div className="card bg-base-200 border-2 border-base-content/20">
                  <div className="card-body p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="text-lg font-semibold text-base-content">Current Plan</h3>
                        <p className="text-sm text-base-content/60">View and manage your subscription</p>
                      </div>
                      <button
                        onClick={() => navigate('/billing')}
                        className="btn btn-primary gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                        Go to Billing Page
                      </button>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card bg-base-200 border border-base-content/20">
                    <div className="card-body p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-base-content mb-1">View Plans</h4>
                          <p className="text-sm text-base-content/70">Compare Free, Pro, and Premium plans to find the right fit for your projects.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200 border border-base-content/20">
                    <div className="card-body p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-base-content mb-1">Upgrade Anytime</h4>
                          <p className="text-sm text-base-content/70">Instantly unlock more projects and features by upgrading your subscription.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200 border border-base-content/20">
                    <div className="card-body p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-base-content mb-1">Flexible Billing</h4>
                          <p className="text-sm text-base-content/70">Cancel anytime and keep access until the end of your billing period.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-base-200 border border-base-content/20">
                    <div className="card-body p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-semibold text-base-content mb-1">Billing History</h4>
                          <p className="text-sm text-base-content/70">Access your invoices and payment history on the billing page.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center p-6 bg-primary/5 border-2 border-primary/20 rounded-lg">
                  <h3 className="text-xl font-bold text-base-content mb-2">Ready to upgrade?</h3>
                  <p className="text-base-content/70 mb-4">
                    Get more projects, advanced features, and priority support.
                  </p>
                  <button
                    onClick={() => navigate('/billing')}
                    className="btn btn-primary btn-lg gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    View Plans & Pricing
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;