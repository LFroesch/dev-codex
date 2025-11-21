import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { User } from '../models/User';

/**
 * Middleware to block demo users from performing write operations
 * Allows GET requests, blocks POST, PUT, PATCH, DELETE
 */
export const blockDemoWrites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Allow all GET requests (read-only)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Check if user is authenticated
  if (!req.userId) {
    // No user - let the regular auth middleware handle it
    return next();
  }

  try {
    // Check if user is demo user
    const user = await User.findById(req.userId).select('isDemo').lean();

    if (user?.isDemo) {
      return res.status(403).json({
        message: 'Demo users cannot perform this action',
        demo: true,
        action: 'signup_required',
        hint: 'Sign up to create, edit, and manage your own data!'
      });
    }

    next();
  } catch (error) {
    // If error checking user, just proceed (fail open for safety)
    next();
  }
};
