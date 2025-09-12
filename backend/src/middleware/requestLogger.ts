import { Request, Response, NextFunction } from 'express';
import { logInfo, logWarn, createLogContext } from '../config/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    _id: string;
    email: string;
  };
}

export const requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const { method, url, ip, headers } = req;
  
  // Log incoming request
  const requestContext = createLogContext({
    method,
    url,
    ip: ip || req.connection.remoteAddress,
    userAgent: headers['user-agent'],
    userId: req.userId || req.user?._id,
    requestId: headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });

  logInfo('Incoming request', requestContext);

  // Capture the original end function
  const originalEnd = res.end;

  // Override the end function to log response
  res.end = function(chunk?: any, encoding?: any): Response {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    const responseContext = createLogContext({
      ...requestContext,
      statusCode,
      duration: `${duration}ms`,
      success: statusCode < 400
    });

    if (statusCode >= 500) {
      logWarn('Server error response', responseContext);
    } else if (statusCode >= 400) {
      logInfo('Client error response', responseContext);
    } else {
      logInfo('Successful response', responseContext);
    }

    // Call the original end function
    originalEnd.call(this, chunk, encoding);
    return this;
  };

  next();
};

// Middleware for logging authentication events
export const authLogger = (action: string, req: AuthenticatedRequest, additional?: Record<string, any>) => {
  const context = createLogContext({
    action,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.userId || req.user?._id,
    email: req.user?.email,
    ...additional
  });

  logInfo('Authentication event', context);
};

// Middleware for logging business operations
export const businessLogger = (operation: string, context: Record<string, any>) => {
  logInfo('Business operation', createLogContext({
    operation,
    ...context
  }));
};