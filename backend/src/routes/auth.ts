import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import RateLimit from '../models/RateLimit';

dotenv.config();

// Temporary store for linking user IDs (in production, use Redis or database)
const linkingStore = new Map<string, string>();

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
      const email = profile.emails?.[0].value;
      
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
          // Create new user
          user = new User({
            email,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
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

// Email transporter configuration (optional)
let transporter: any = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, theme } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user (password will be hashed by the pre-save hook)
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      theme: theme || 'cyberpunk'
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
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
        theme: user.theme
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
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
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Logout route
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Check auth status
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    res.json({
      message: 'User retrieved successfully',  
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        theme: user.theme,
        hasGoogleAccount: !!user.googleId,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// NEW: Update user theme
router.patch('/theme', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { theme } = req.body;
    
    const validThemes = [
      "light", "dark", "cupcake", "bumblebee", "emerald", "corporate", 
      "synthwave", "retro", "cyberpunk", "valentine", "halloween", 
      "garden", "forest", "aqua", "lofi", "pastel", "fantasy", 
      "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", 
      "business", "acid", "lemonade", "night", "coffee", "winter", "dim"
    ];

    if (!validThemes.includes(theme)) {
      return res.status(400).json({ message: 'Invalid theme' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { theme },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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
  router.delete('/google/unlink', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!user.googleId) {
        return res.status(400).json({ message: 'Google account not linked' });
      }

      user.googleId = undefined;
      await user.save();

      res.json({ message: 'Google account unlinked successfully' });
    } catch (error) {
      console.error('Unlink Google account error:', error);
      res.status(500).json({ message: 'Failed to unlink Google account' });
    }
  });

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
          const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'fallback-secret',
            { expiresIn: '7d' }
          );

          res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
          });

          res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5002'}/?auth=success`);
        }
      } catch (error) {
        console.error('Google OAuth callback error:', error);
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
router.post('/forgot-password', async (req, res) => {
  try {
    if (!transporter) {
      return res.status(501).json({ message: 'Email service not configured' });
    }

    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5002'}/reset-password?token=${resetToken}`;
    
    await transporter.sendMail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Failed to send password reset email' });
  }
});

// Password reset
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Emergency clear rate limits endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/clear-rate-limits', async (req, res) => {
    try {
      const result = await RateLimit.deleteMany({});
      res.json({ 
        message: 'All rate limits cleared',
        deletedCount: result.deletedCount 
      });
    } catch (error) {
      console.error('Error clearing rate limits:', error);
      res.status(500).json({ error: 'Failed to clear rate limits' });
    }
  });
}

export default router;