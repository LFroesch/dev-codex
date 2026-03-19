import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { User } from '../models/User';

// Demo users get a daily write budget — data resets on next demo login anyway.
// This prevents abuse (bot spamming) without locking recruiters out of features.
const DEMO_DAILY_WRITES = parseInt(process.env.DEMO_DAILY_WRITES || '30', 10);
const demoWriteCounts = new Map<string, { count: number; date: string }>();

// Cleanup stale entries every 5 min
setInterval(() => {
  const today = new Date().toDateString();
  for (const [ip, entry] of demoWriteCounts) {
    if (entry.date !== today) demoWriteCounts.delete(ip);
  }
}, 300_000);

// Routes that affect shared state — always blocked for demo users
const BLOCKED_PATHS = ['/api/billing', '/api/follows', '/api/posts', '/api/likes', '/api/comments', '/api/notifications'];

/**
 * Middleware: demo users can write (up to daily limit) since data resets per login.
 * Blocks only shared-state routes (social, billing) and enforces a per-IP daily cap.
 */
export const blockDemoWrites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Allow all GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!req.userId) return next();

  try {
    const user = await User.findById(req.userId).select('isDemo').lean();
    if (!user?.isDemo) return next();

    // Block shared-state routes entirely
    if (BLOCKED_PATHS.some(p => req.originalUrl.startsWith(p))) {
      return res.status(403).json({
        message: 'This feature is not available in demo mode. Sign up to unlock!',
        demo: true, action: 'signup_required', signupUrl: '/register'
      });
    }

    // Enforce daily write budget per IP
    const ip = req.ip || 'unknown';
    const today = new Date().toDateString();
    const entry = demoWriteCounts.get(ip);

    if (!entry || entry.date !== today) {
      demoWriteCounts.set(ip, { count: 1, date: today });
    } else if (entry.count >= DEMO_DAILY_WRITES) {
      return res.status(429).json({
        message: `Demo write limit reached (${DEMO_DAILY_WRITES}/day). Sign up for unlimited access!`,
        demo: true, action: 'signup_required', signupUrl: '/register'
      });
    } else {
      entry.count++;
    }

    next();
  } catch (error) {
    next();
  }
};
