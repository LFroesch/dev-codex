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

// Pre-configured rate limiters
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500,
  endpoint: 'strict'
});

export const normalRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 200, // More generous for normal usage
  endpoint: 'normal'
});

export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20, // More generous for auth attempts
  endpoint: 'auth',
  message: 'Too many authentication attempts, please try again in 15 minutes.'
});

export const apiRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 120, // Double the previous limit
  endpoint: 'api'
});

// Development-friendly rate limiter
export const devRateLimit = createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 1000, // Very generous for development
  endpoint: 'dev'
});