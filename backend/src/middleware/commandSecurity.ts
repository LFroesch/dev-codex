import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { logDebug, logWarn, logError } from '../config/logger';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Rate limiter for terminal command execution
 * Stricter than normal API rate limits to prevent abuse
 */
export const terminalCommandRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 commands per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // We key on userId, not IP
  message: {
    type: 'error',
    message: 'Too many commands. Please wait before trying again.',
    data: {
      retryAfter: '1 minute'
    }
  },
  keyGenerator: (req: Request) => {
    // Rate limit per user (behind auth middleware, userId always present)
    return (req as AuthRequest).userId || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logWarn('Terminal command rate limit exceeded', {
      userId: (req as AuthRequest).userId,
      ip: req.ip,
      component: 'commandSecurity',
      action: 'rate_limit'
    });

    res.status(429).json({
      type: 'error',
      message: 'Too many commands. Please slow down.',
      suggestions: ['Wait a moment before trying again']
    });
  }
});

/**
 * Rate limiter for autocomplete/suggestions endpoints
 * More lenient than command execution
 */
export const terminalSuggestionsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false }, // We key on userId, not IP
  keyGenerator: (req: Request) => {
    return (req as AuthRequest).userId || 'unknown';
  }
});

/**
 * Sanitize command input to prevent injection attacks
 */
export const sanitizeCommand = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.body.command && typeof req.body.command === 'string') {
      // Basic sanitization
      const sanitized = DOMPurify.sanitize(req.body.command, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: []
      });

      // Check for suspicious patterns (slash commands only — AI natural language
      // input legitimately contains terms like "process.env" or "require()")
      if (req.body.command.trimStart().startsWith('/')) {
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /eval\(/i,
          /exec\(/i,
          /require\(/i,
          /process\./i,
          /__proto__/i,
          /constructor\[/i
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(req.body.command)) {
            logWarn('Suspicious command detected', {
              userId: req.userId,
              command: req.body.command.slice(0, 100),
              component: 'commandSecurity',
              action: 'suspicious_pattern'
            });

            return res.status(400).json({
              type: 'error',
              message: 'Invalid command format detected'
            });
          }
        }
      }

      // Limit command length (slash commands only — AI input has its own limits in terminal.ts)
      const MAX_COMMAND_LENGTH = 500;
      if (req.body.command.trimStart().startsWith('/') && req.body.command.length > MAX_COMMAND_LENGTH) {
        return res.status(400).json({
          type: 'error',
          message: `Command too long (max ${MAX_COMMAND_LENGTH} characters)`
        });
      }

      req.body.command = sanitized.trim();
    }

    next();
  } catch (error) {
    logError('Command sanitization error', error as Error, {
      userId: req.userId,
      component: 'commandSecurity',
      action: 'sanitize'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to process command'
    });
  }
};

/**
 * Validate command format
 */
export const validateCommandFormat = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        type: 'error',
        message: 'Command is required'
      });
    }

    if (typeof command !== 'string') {
      return res.status(400).json({
        type: 'error',
        message: 'Command must be a string'
      });
    }

    // Don't enforce slash prefix — natural language input routes to AI
    // Slash validation is implicit: non-slash input goes to AI in terminal.ts

    next();
  } catch (error) {
    logError('Command validation error', error as Error, {
      userId: req.userId,
      component: 'commandSecurity',
      action: 'validate_format'
    });

    res.status(500).json({
      type: 'error',
      message: 'Failed to validate command'
    });
  }
};

/**
 * Log command execution for audit trail
 */
export const logCommandExecution = (req: AuthRequest, res: Response, next: NextFunction) => {
  const { command } = req.body;
  const userId = req.userId;

  // Log the command (truncate for security)
  logDebug('Terminal command execution', {
    userId,
    command: command?.slice(0, 100),
    timestamp: new Date().toISOString(),
    ip: req.ip,
    component: 'commandSecurity',
    action: 'execute_command'
  });

  next();
};

/**
 * Security middleware for terminal command execution
 * Applies sanitization + format validation + rate limiting + audit logging
 */
export const terminalCommandSecurity = [
  terminalCommandRateLimit,
  sanitizeCommand,
  validateCommandFormat,
  logCommandExecution,
];

/**
 * Security middleware for suggestion endpoints
 */
export const terminalSuggestionsSecurity = [
  terminalSuggestionsRateLimit
];
