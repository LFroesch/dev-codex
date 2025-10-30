import { Request, Response, NextFunction } from 'express';
import RateLimit from '../models/RateLimit';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  endpoint?: string; // Optional: specific endpoint name
}

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
    endpoint
  } = options;

  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting if self-hosted mode is enabled
      if (process.env.SELF_HOSTED === 'true') {
        return next();
      }

      // Generate identifier
      let identifier: string;
      let type: 'ip' | 'user';

      if (keyGenerator) {
        identifier = keyGenerator(req);
        type = 'ip'; // Default to IP type for custom generators
      } else if (req.userId) {
        identifier = req.userId;
        type = 'user';
      } else {
        identifier = req.ip || req.connection.remoteAddress || 'unknown';
        type = 'ip';
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);

      // Find or create rate limit record
      let rateLimit = await RateLimit.findOne({
        identifier,
        type,
        endpoint,
        windowStart: { $gte: windowStart }
      });

      if (!rateLimit) {
        // Create new rate limit window
        rateLimit = new RateLimit({
          identifier,
          type,
          endpoint,
          count: 1,
          windowStart: now,
          windowDurationMs: windowMs
        });
        await rateLimit.save();
      } else {
        // Check if within rate limit
        if (rateLimit.count >= maxRequests) {
          const resetTime = new Date(rateLimit.windowStart.getTime() + windowMs);
          const remaining = Math.ceil((resetTime.getTime() - now.getTime()) / 1000);

          res.set({
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toISOString(),
            'Retry-After': remaining.toString()
          });

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message,
            retryAfter: remaining
          });
        }

        // Increment counter
        rateLimit.count += 1;
        await rateLimit.save();
      }

      // Set rate limit headers
      const remaining = Math.max(0, maxRequests - rateLimit.count);
      const resetTime = new Date(rateLimit.windowStart.getTime() + windowMs);

      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toISOString()
      });

      // Store rate limit info for potential cleanup
      res.locals.rateLimitRecord = rateLimit;

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Don't fail the request if rate limiting has issues
      next();
    }
  };
};

// Production-calibrated rate limiters
// Based on expected user behavior and abuse prevention

// Strict rate limiter for sensitive operations
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Reduced for stricter control
  endpoint: 'strict',
  message: 'Rate limit exceeded. Please wait 15 minutes before trying again.'
});

// Normal rate limiter for general API usage
export const normalRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'production' ? 60 : 200, // Production: 60/min, Dev: 200/min
  endpoint: 'normal',
  message: 'Too many requests. Please wait a moment before trying again.'
});

// Auth rate limiter - very conservative for security
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 10 : 20, // Production: 10/15min, Dev: 20/15min
  endpoint: 'auth',
  message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
});

// API rate limiter for general endpoints
export const apiRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'production' ? 100 : 120, // Slightly reduced for production
  endpoint: 'api',
  message: 'API rate limit exceeded. Please slow down your requests.'
});

// Development-friendly rate limiter (unchanged)
export const devRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 1000, // Very generous for development
  endpoint: 'dev'
});

// Premium user rate limiter - higher limits for paid users
export const premiumRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'production' ? 200 : 300, // Higher limits for premium
  endpoint: 'premium',
  message: 'Premium rate limit exceeded. Please contact support if you need higher limits.'
});

// Public routes rate limiter - more restrictive for unauthenticated users
export const publicRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'production' ? 30 : 60, // Lower for public access
  endpoint: 'public',
  message: 'Public API rate limit exceeded. Please register for higher limits.'
});

// Smart rate limiter that adjusts based on user plan tier
export const createSmartRateLimit = (baseOptions: RateLimitOptions & { maxRequests: number }) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Determine rate limit based on user plan
      let maxRequests = baseOptions.maxRequests || 60; // Default

      if (req.userId && req.user) {
        const planTier = req.user.planTier || 'free';

        switch (planTier) {
          case 'premium':
            maxRequests = Math.floor(maxRequests * 3); // 3x limit for premium
            break;
          case 'pro':
            maxRequests = Math.floor(maxRequests * 5); // 5x limit for pro
            break;
          case 'enterprise':
            maxRequests = Math.floor(maxRequests * 10); // 10x limit for enterprise
            break;
          default: // 'free'
            maxRequests = Math.floor(maxRequests * 0.8); // 20% reduction for free users
        }
      } else {
        // Unauthenticated users get stricter limits
        maxRequests = Math.floor(maxRequests * 0.5);
      }

      // Create dynamic rate limiter with calculated limit
      const dynamicRateLimit = createRateLimit({
        ...baseOptions,
        maxRequests,
        endpoint: `${baseOptions.endpoint}_${req.user?.planTier || 'anonymous'}`
      });

      return dynamicRateLimit(req, res, next);
    } catch (error) {
      console.error('Smart rate limiting error:', error);
      // Fall back to base rate limiter
      const fallbackRateLimit = createRateLimit({
        ...baseOptions,
        maxRequests: baseOptions.maxRequests || 60
      });
      return fallbackRateLimit(req, res, next);
    }
  };
};

// Ticket creation rate limiter - prevent support ticket spam
export const ticketRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // Max 5 tickets per hour
  endpoint: 'ticket_creation',
  message: 'Too many support tickets. Please wait an hour before submitting another ticket.'
});

// Terminal command execution rate limiter - prevent command spam
// Plan-based limits: free tier gets stricter limits to control costs
// Base: 12 → Free: ~10/min (0.8x), Pro: 60/min (5x), Enterprise: 120/min (10x)
export const terminalRateLimit = createSmartRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: process.env.NODE_ENV === 'production' ? 12 : 30, // Production: plan-based, Dev: 30/min
  endpoint: 'terminal_execution',
  message: 'Too many terminal commands. Please slow down or upgrade your plan for higher limits.'
});

// Admin operations rate limiter - stricter protection for admin routes
export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // Max 20 admin operations per 15 minutes
  endpoint: 'admin',
  message: 'Too many admin operations. Please wait 15 minutes before trying again.'
});