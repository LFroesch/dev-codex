import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import RateLimit from '../models/RateLimit';
import { AnalyticsService } from '../middleware/analytics';
import { Project } from '../models/Project';
import Notification from '../models/Notification';
import { authRateLimit, createRateLimit } from '../middleware/rateLimit';
import { validateUserRegistration, validateUserLogin, validatePasswordReset } from '../middleware/validation';
import { sendEmail } from '../services/emailService';
import { asyncHandler, BadRequestError, NotFoundError, UnauthorizedError, ConflictError } from '../utils/errorHandler';

dotenv.config();

// Temporary store for linking user IDs (in production, use Redis or database)
const linkingStore = new Map<string, string>();

// Helper function to create login notifications for due today tasks
const createLoginNotifications = async (userId: string) => {
  try {
    const projects = await Project.find({
      $or: [
        { ownerId: userId },
        { userId: userId },
        { 'todos.assignedTo': userId }
      ]
    }).populate('ownerId');

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let dueTodayCount = 0;
    const dueTodayTasks: string[] = [];

    for (const project of projects) {
      for (const todo of project.todos) {
        if (todo.completed || !todo.dueDate) continue;

        const assignedToUser = todo.assignedTo?.toString() === userId;
        const isOwner = project.ownerId?.toString() === userId;
        
        if (!assignedToUser && !isOwner) continue;

        const dueDate = new Date(todo.dueDate);
        if (dueDate >= startOfDay && dueDate <= endOfDay) {
          dueTodayCount++;
          dueTodayTasks.push(`"${todo.title}" in ${project.name}`);
        }
      }
    }

    // Create notification if there are tasks due today
    if (dueTodayCount > 0) {
      // Check if we already sent a login notification today
      const existingNotification = await Notification.findOne({
        userId,
        type: 'todo_due_soon',
        title: 'Welcome Back!',
        createdAt: { $gte: startOfDay }
      });

      if (!existingNotification) {
        const message = dueTodayCount === 1 
          ? `You have 1 task due today: ${dueTodayTasks[0]}`
          : `You have ${dueTodayCount} tasks due today: ${dueTodayTasks.slice(0, 3).join(', ')}${dueTodayCount > 3 ? ` and ${dueTodayCount - 3} more` : ''}`;

        await Notification.create({
          userId,
          type: 'todo_due_soon',
          title: 'Welcome Back!',
          message,
          actionUrl: '/notes'
        });

      }
    }
  } catch (error) {
    
  }
};

const router = express.Router();

// Configure Google OAuth strategy (only if credentials are provided)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    passReqToCallback: true
  }, async (req, _accessToken, _refreshToken, profile, done) => {
    try {
      const googleId = profile.id;
      const email = profile.emails?.[0]?.value;

      // Validate that we have an email from Google
      if (!email) {
        return done(new Error('No email provided by Google account'), undefined);
      }

      // Check if this is an account linking flow by looking for the state parameter
      const stateParam = req.query.state as string;
      let linkingUserId: string | undefined;
      
      // Check if state parameter contains a valid linking user ID
      if (stateParam && linkingStore.has(stateParam)) {
        linkingUserId = linkingStore.get(stateParam);
        linkingStore.delete(stateParam); // Clean up
      }
      
      if (linkingUserId) {
        // Account linking flow
        const existingUser = await User.findById(linkingUserId);
        if (!existingUser) {
          return done(new Error('User not found for linking'), undefined);
        }
        
        // Check if Google account is already linked to another user
        const googleUser = await User.findOne({ googleId });
        if (googleUser && googleUser._id.toString() !== linkingUserId) {
          return done(new Error('Google account already linked to another user'), undefined);
        }
        
        // Link Google account
        existingUser.googleId = googleId;
        await existingUser.save();
        
        // Mark this as a linking operation
        (existingUser as any).isLinking = true;
        
        return done(null, existingUser);
      } else {
        // Regular OAuth login/signup flow
        let user = await User.findOne({ $or: [{ googleId }, { email }] });

        if (!user) {
          // Generate a unique username from email
          const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');
          let username = baseUsername;
          let counter = 1;

          // Ensure username is unique
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          // Create new user
          user = new User({
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            username,
            password: crypto.randomBytes(32).toString('hex'),
            googleId,
            planTier: 'free',
            projectLimit: 3
          });
          await user.save();
        } else if (!user.googleId) {
          // Existing user found by email, link Google ID
          user.googleId = googleId;
          await user.save();
        }
        
        return done(null, user);
      }
    } catch (error) {
      return done(error, undefined);
    }
  }));
}

// Check username availability - rate limited to prevent enumeration attacks
router.get('/check-username/:username', authRateLimit, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { username } = req.params;

  // Validate username format
  if (!/^[a-z0-9_]+$/.test(username)) {
    return res.json({
      available: false,
      message: 'Username can only contain lowercase letters, numbers, and underscores'
    });
  }

  if (username.length < 3 || username.length > 30) {
    return res.json({
      available: false,
      message: 'Username must be between 3 and 30 characters'
    });
  }

  const existingUser = await User.findOne({ username: username.toLowerCase() });

  res.json({
    available: !existingUser,
    message: existingUser ? 'Username is already taken' : 'Username is available'
  });
}));

// Register route
router.post('/register', authRateLimit, validateUserRegistration, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password, firstName, lastName, username, theme } = req.body;

  // Validate username
  if (!username) {
    throw BadRequestError('Username is required', 'USERNAME_REQUIRED');
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    throw BadRequestError('Username can only contain lowercase letters, numbers, and underscores', 'INVALID_USERNAME_FORMAT');
  }

  if (username.length < 3 || username.length > 30) {
    throw BadRequestError('Username must be between 3 and 30 characters', 'INVALID_USERNAME_LENGTH');
  }

  // Check if user already exists (email or username)
  const existingUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw ConflictError('Email already exists', 'EMAIL_EXISTS');
    } else {
      throw ConflictError('Username already taken', 'USERNAME_TAKEN');
    }
  }

  // Create new user (password will be hashed by the pre-save hook)
  const user = new User({
    email,
    password,
    firstName,
    lastName,
    username: username.toLowerCase(),
    theme: theme || 'retro'
  });

  await user.save();

  // Track user signup
  try {
    const { AnalyticsService } = await import('../middleware/analytics');
    await AnalyticsService.trackEvent(
      user._id.toString(),
      'user_signup',
      {
        source: req.headers.referer || 'direct',
        referrer: req.headers.referer,
        theme: theme || 'retro',
        category: 'engagement'
      }
    );
  } catch (error) {
    
  }

  // Create JWT token
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only over HTTPS in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme
    }
  });
}));

// Login route
router.post('/login', authRateLimit, validateUserLogin, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Update last login timestamp
  user.lastLogin = new Date();
  await user.save();

  // Create JWT token
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Create login notifications for due today tasks
  await createLoginNotifications(user._id.toString());

  res.json({
    message: 'Login successful',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      isAdmin: user.isAdmin
    }
  });
}));

// Demo login route - no password required
router.post('/demo-login', authRateLimit, asyncHandler(async (req: express.Request, res: express.Response) => {
  // Find the demo user
  const demoUser = await User.findOne({ isDemo: true });

  if (!demoUser) {
    throw NotFoundError('Demo mode not available', 'DEMO_UNAVAILABLE');
  }

  // Create JWT token for demo user
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const token = jwt.sign(
    { userId: demoUser._id, email: demoUser.email, isDemo: true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    message: 'Demo login successful',
    user: {
      id: demoUser._id,
      email: demoUser.email,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
      username: demoUser.username,
      displayPreference: demoUser.displayPreference,
      theme: demoUser.theme,
      isDemo: true,
      bio: demoUser.bio || '',
      planTier: demoUser.planTier || 'free',
      projectLimit: demoUser.projectLimit || 3,
      isPublic: demoUser.isPublic || false,
      publicSlug: demoUser.publicSlug,
      publicDescription: demoUser.publicDescription,
      tutorialCompleted: demoUser.tutorialCompleted,
      tutorialProgress: demoUser.tutorialProgress,
      createdAt: demoUser.createdAt
    }
  });
}));

// Logout route
router.post('/logout', asyncHandler(async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['x-session-id'] as string;

  // End the analytics session if one exists
  if (sessionId) {
    await AnalyticsService.endSession(sessionId);
  }

  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
}));

// Exchange OAuth token for cookie (mobile-friendly approach)
router.post('/exchange-token', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { token } = req.body;

  if (!token) {
    throw BadRequestError('Token is required', 'TOKEN_REQUIRED');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  // Verify the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    throw UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  // Set HTTP-only cookie (this is a same-site request, works on mobile)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    message: 'Token exchanged successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      hasGoogleAccount: !!user.googleId,
      isAdmin: user.isAdmin,
      bio: user.bio || '',
      planTier: user.planTier || 'free',
      projectLimit: user.projectLimit || 3,
      isPublic: user.isPublic || false,
      publicSlug: user.publicSlug,
      publicDescription: user.publicDescription,
      tutorialCompleted: user.tutorialCompleted,
      tutorialProgress: user.tutorialProgress,
      createdAt: user.createdAt
    }
  });
}));

// Check auth status
router.get('/me', asyncHandler(async (req: express.Request, res: express.Response) => {
  const token = req.cookies.token;

  if (!token) {
    throw UnauthorizedError('Not authenticated', 'NOT_AUTHENTICATED');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
  const user = await User.findById(decoded.userId).select('-password');

  if (!user) {
    throw UnauthorizedError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    message: 'User retrieved successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      hasGoogleAccount: !!user.googleId,
      isAdmin: user.isAdmin,
      isDemo: user.isDemo || false,
      bio: user.bio || '',
      planTier: user.planTier || 'free',
      projectLimit: user.projectLimit || 3,
      isPublic: user.isPublic || false,
      publicSlug: user.publicSlug,
      publicDescription: user.publicDescription,
      tutorialCompleted: user.tutorialCompleted,
      tutorialProgress: user.tutorialProgress,
      createdAt: user.createdAt
    }
  });
}));

// NEW: Update user theme
router.patch('/theme', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { theme } = req.body;
  
  const validThemes = [
    "dim", "light", "dark", "cupcake", "bumblebee", "emerald", "corporate",
    "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden",
    "forest", "aqua", "sunset", "lofi", "pastel", "fantasy", "wireframe",
    "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid",
    "lemonade", "night", "coffee", "winter", "nord"
  ];

  // Allow custom themes (format: "custom-{id}") in addition to preset themes
  const isCustomTheme = typeof theme === 'string' && theme.startsWith('custom-');
  if (!validThemes.includes(theme) && !isCustomTheme) {
    throw BadRequestError('Invalid theme', 'INVALID_THEME');
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { theme },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    message: 'Theme updated successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      theme: user.theme
    }
  });
}));

// NEW: Update user name
router.patch('/update-name', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { firstName, lastName } = req.body;

  if (!firstName || !lastName) {
    throw BadRequestError('First name and last name are required', 'NAME_REQUIRED');
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { firstName: firstName.trim(), lastName: lastName.trim() },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    message: 'Name updated successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      hasGoogleAccount: !!user.googleId,
      isAdmin: user.isAdmin,
      bio: user.bio || '',
      planTier: user.planTier || 'free',
      projectLimit: user.projectLimit || 3,
      isPublic: user.isPublic || false,
      publicSlug: user.publicSlug,
      publicDescription: user.publicDescription,
      createdAt: user.createdAt
    }
  });
}));

// NEW: Update username
router.patch('/update-username', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { username } = req.body;

  if (!username) {
    throw BadRequestError('Username is required', 'MISSING_USERNAME');
  }

  const trimmedUsername = username.trim().toLowerCase();

  // Validate username format
  if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
    throw BadRequestError('Username can only contain lowercase letters, numbers, and underscores', 'INVALID_USERNAME_FORMAT');
  }

  if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
    throw BadRequestError('Username must be between 3 and 30 characters', 'INVALID_USERNAME_LENGTH');
  }

  // Check if username is already taken by another user
  const existingUser = await User.findOne({
    username: trimmedUsername,
    _id: { $ne: req.userId } // Exclude current user
  });

  if (existingUser) {
    throw ConflictError('Username already taken', 'USERNAME_TAKEN');
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { username: trimmedUsername },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    message: 'Username updated successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      hasGoogleAccount: !!user.googleId,
      isAdmin: user.isAdmin,
      bio: user.bio || '',
      planTier: user.planTier || 'free',
      projectLimit: user.projectLimit || 3,
      isPublic: user.isPublic || false,
      publicSlug: user.publicSlug,
      publicDescription: user.publicDescription,
      createdAt: user.createdAt
    }
  });
}));

// NEW: Update user profile
router.patch('/profile', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { bio, isPublic, publicSlug, publicDescription, displayPreference } = req.body;

  const updateData: any = {};
  if (bio !== undefined) updateData.bio = bio;
  if (isPublic !== undefined) updateData.isPublic = isPublic;
  if (publicSlug !== undefined) updateData.publicSlug = publicSlug;
  if (publicDescription !== undefined) updateData.publicDescription = publicDescription;
  if (displayPreference !== undefined) {
    if (!['name', 'username'].includes(displayPreference)) {
      throw BadRequestError('Invalid display preference. Must be "name" or "username"', 'INVALID_DISPLAY_PREFERENCE');
    }
    updateData.displayPreference = displayPreference;
  }
  
  const user = await User.findByIdAndUpdate(
    req.userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({
    message: 'Profile updated successfully',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      displayPreference: user.displayPreference,
      theme: user.theme,
      hasGoogleAccount: !!user.googleId,
      isAdmin: user.isAdmin,
      bio: user.bio || '',
      planTier: user.planTier || 'free',
      projectLimit: user.projectLimit || 3,
      isPublic: user.isPublic || false,
      publicSlug: user.publicSlug,
      publicDescription: user.publicDescription,
      createdAt: user.createdAt
    }
  });
}));

// Google OAuth routes (only if Google OAuth is configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  // Link Google account route (for authenticated users)
  router.get('/google/link', requireAuth, (req: AuthRequest, res, next) => {
    // Generate a unique linking token and store user ID
    const linkingToken = crypto.randomBytes(32).toString('hex');
    linkingStore.set(linkingToken, req.userId!);
    
    // Clean up expired tokens after 10 minutes
    setTimeout(() => {
      linkingStore.delete(linkingToken);
    }, 10 * 60 * 1000);
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      state: linkingToken // Pass linking token as state parameter
    })(req, res, next);
  });

  // Unlink Google account route
  router.delete('/google/unlink', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
    const user = await User.findById(req.userId);
    if (!user) {
      throw NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    if (!user.googleId) {
      throw BadRequestError('Google account not linked', 'NOT_LINKED');
    }

    user.googleId = undefined;
    await user.save();

    res.json({ message: 'Google account unlinked successfully' });
  }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req: any, res) => {
      try {
        const user = req.user;
        const isLinking = !!(user as any).isLinking;

        if (isLinking) {
          // Account linking flow - redirect to account settings with success
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5002'}/account-settings?google_linked=success`);
        } else {
          // Regular OAuth login flow
          // Update last login timestamp
          await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

          if (!process.env.JWT_SECRET) {
            
            return res.status(500).json({ message: 'Server configuration error' });
          }

          const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          // Create login notifications for due today tasks
          await createLoginNotifications(user._id.toString());

          // NEW: Redirect with token in URL instead of setting cookie directly
          // This works reliably on mobile browsers (Safari, Chrome mobile, etc.)
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5002'}/auth/callback?token=${token}`);
        }
      } catch (error) {
        
        const errorMsg = error instanceof Error ? error.message : 'auth_failed';
        const stateParam = req.query.state as string;

        // Check if this was a linking attempt
        if (stateParam && linkingStore.has(stateParam)) {
          linkingStore.delete(stateParam); // Clean up
          // Account linking error
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5002'}/account-settings?google_linked=error&message=${encodeURIComponent(errorMsg)}`);
        } else {
          // Regular OAuth error
          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5002'}/login?error=${encodeURIComponent(errorMsg)}`);
        }
      }
    }
  );
} else {
  // Fallback routes when Google OAuth is not configured
  router.get('/google', (_req, res) => {
    res.status(501).json({ error: 'Google OAuth not configured' });
  });
  
  router.get('/google/callback', (_req, res) => {
    res.status(501).json({ error: 'Google OAuth not configured' });
  });
}

// Password reset request
// Stricter rate limit for password reset requests
const passwordResetRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 3, // Only 3 password reset attempts per 15 minutes
  endpoint: 'password_reset',
  message: 'Too many password reset attempts. Please try again in 15 minutes.'
});

router.post('/forgot-password', passwordResetRateLimit, validatePasswordReset, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // SEC-002 FIX: Don't reveal if email exists - return same message as success case
    
    return res.status(200).json({
      message: 'If that email exists, a reset link has been sent'
    });
  }

  // SEC-004 FIX: Generate token, hash it before storing, send raw token to user
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes (reduced from 1 hour)
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5002'}/reset-password?token=${rawToken}`;

  // Send password reset email (tries Resend first, falls back to SMTP)
  const htmlContent = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 15 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    text: `Password Reset Request\n\nYou requested a password reset. Visit this link to reset your password:\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: htmlContent
  });

  res.json({ message: 'If that email exists, a reset link has been sent' });
}));

// Password reset
router.post('/reset-password', passwordResetRateLimit, validatePasswordReset, asyncHandler(async (req: express.Request, res: express.Response) => {
  const { token, password } = req.body;

  // SEC-004 FIX: Hash the submitted token before comparing
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw BadRequestError('Invalid or expired reset token', 'INVALID_TOKEN');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
}));

// Emergency clear rate limits endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/clear-rate-limits', asyncHandler(async (req: express.Request, res: express.Response) => {
    const result = await RateLimit.deleteMany({});
    res.json({ 
      message: 'All rate limits cleared',
      deletedCount: result.deletedCount 
    });
  }));
}

// Custom themes routes
router.post('/custom-themes', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { customThemes } = req.body;

  const user = await User.findByIdAndUpdate(
    req.userId,
    { customThemes },
    { new: true }
  );

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({ customThemes: user.customThemes });
}));

router.get('/custom-themes', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  res.json({ customThemes: user.customThemes || [] });
}));

export default router;