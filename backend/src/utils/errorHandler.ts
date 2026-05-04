import { Response } from 'express';
import { logError } from '../config/logger';

// Custom error class for operational errors
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler wrapper to catch promise rejections
export const asyncHandler = (fn: any) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

type OperationalErrorDetails = {
  statusCode: number;
  message: string;
  code?: string;
};

const getOperationalErrorDetails = (error: any): OperationalErrorDetails | null => {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code
    };
  }

  if (!error || typeof error !== 'object') {
    return null;
  }

  const statusCode =
    typeof error.statusCode === 'number'
      ? error.statusCode
      : typeof error.status === 'number'
        ? error.status
        : null;
  const message = typeof error.message === 'string' ? error.message : null;
  const code = typeof error.code === 'string' ? error.code : undefined;

  if (statusCode && statusCode >= 400 && statusCode < 500 && message) {
    return { statusCode, message, code };
  }

  return null;
};

// Standardized error response
export const sendErrorResponse = (res: Response, error: any) => {
  // Operational errors (expected)
  const operationalError = getOperationalErrorDetails(error);
  if (operationalError) {
    return res.status(operationalError.statusCode).json({
      success: false,
      message: operationalError.message,
      code: operationalError.code,
      statusCode: operationalError.statusCode
    });
  }

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: error.errors
    });
  }

  // Mongoose cast errors (invalid ObjectId)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      code: 'INVALID_ID',
      statusCode: 400
    });
  }

  // Duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      code: 'DUPLICATE_ERROR',
      statusCode: 409
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      statusCode: 401
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      statusCode: 401
    });
  }

  // Log unexpected errors
  logError('Unexpected error', error as Error, {
    severity: 'high',
    component: 'error-handler',
    isOperational: false
  });

  // Generic server error (don't leak details)
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500
  });
};

// Common error creators for convenience
export const BadRequestError = (message: string, code = 'BAD_REQUEST') =>
  new AppError(400, message, code);

export const UnauthorizedError = (message = 'Authentication required', code = 'UNAUTHORIZED') =>
  new AppError(401, message, code);

export const ForbiddenError = (message = 'Access denied', code = 'FORBIDDEN') =>
  new AppError(403, message, code);

export const NotFoundError = (message = 'Resource not found', code = 'NOT_FOUND') =>
  new AppError(404, message, code);

export const ConflictError = (message: string, code = 'CONFLICT') =>
  new AppError(409, message, code);

export const TooManyRequestsError = (message = 'Too many requests', code = 'RATE_LIMIT') =>
  new AppError(429, message, code);
