import { Request, Response, NextFunction } from 'express';
import { requestLogger, authLogger, businessLogger } from '../../middleware/requestLogger';
import * as logger from '../../config/logger';

// Mock logger
jest.mock('../../config/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  createLogContext: jest.fn((context) => context)
}));

interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    _id: string;
    email: string;
  };
}

describe('Request Logger Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/api/test',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'x-request-id': 'test-request-id'
      },
      connection: {} as any
    };
    mockRes = {
      statusCode: 200,
      end: jest.fn()
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('requestLogger', () => {
    it('should log incoming request', () => {
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        method: 'GET',
        url: '/api/test',
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        requestId: 'test-request-id'
      }));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use userId when available', () => {
      mockReq.userId = 'user-123';

      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        userId: 'user-123'
      }));
    });

    it('should use user._id when userId not available', () => {
      mockReq.user = { _id: 'user-456', email: 'test@example.com' };

      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        userId: 'user-456'
      }));
    });

    it('should generate request ID when not provided', () => {
      delete mockReq.headers!['x-request-id'];

      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      const logCall = (logger.logInfo as jest.Mock).mock.calls[0][1];
      expect(logCall.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should use connection.remoteAddress when ip not available', () => {
      const reqWithoutIp: Partial<AuthenticatedRequest> = {
        method: 'GET',
        url: '/api/test',
        headers: {
          'user-agent': 'test-agent',
          'x-request-id': 'test-request-id'
        },
        connection: { remoteAddress: '192.168.1.1' } as any
      };

      requestLogger(reqWithoutIp as AuthenticatedRequest, mockRes as Response, nextFunction);

      expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
        ip: '192.168.1.1'
      }));
    });

    it('should log successful response (2xx)', (done) => {
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      mockRes.statusCode = 200;
      (mockRes.end as jest.Mock)();

      // Use setImmediate to allow async logging to complete
      setImmediate(() => {
        expect(logger.logInfo).toHaveBeenCalledWith('Successful response', expect.objectContaining({
          statusCode: 200,
          success: true,
          duration: expect.stringContaining('ms')
        }));
        done();
      });
    });

    it('should log client error response (4xx)', (done) => {
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      mockRes.statusCode = 404;
      (mockRes.end as jest.Mock)();

      setImmediate(() => {
        expect(logger.logInfo).toHaveBeenCalledWith('Client error response', expect.objectContaining({
          statusCode: 404,
          success: false
        }));
        done();
      });
    });

    it('should log server error response (5xx)', (done) => {
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      mockRes.statusCode = 500;
      (mockRes.end as jest.Mock)();

      setImmediate(() => {
        expect(logger.logWarn).toHaveBeenCalledWith('Server error response', expect.objectContaining({
          statusCode: 500,
          success: false
        }));
        done();
      });
    });

    it('should measure request duration', (done) => {
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      // Simulate delay
      setTimeout(() => {
        mockRes.statusCode = 200;
        (mockRes.end as jest.Mock)();

        setImmediate(() => {
          try {
            const logCall = (logger.logInfo as jest.Mock).mock.calls.find(
              call => call[0] === 'Successful response'
            );
            expect(logCall).toBeDefined();
            expect(logCall[1].duration).toMatch(/^\d+ms$/);
            const duration = parseInt(logCall[1].duration);
            // Account for timer imprecision - just verify duration is a positive number
            expect(duration).toBeGreaterThanOrEqual(0);
            done();
          } catch (error) {
            done(error);
          }
        });
      }, 10);
    });

    it('should call original res.end with arguments', () => {
      const originalEnd = mockRes.end;
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      const chunk = Buffer.from('test data');
      const encoding = 'utf8';
      mockRes.end!(chunk, encoding as any);

      expect(originalEnd).toHaveBeenCalledWith(chunk, encoding);
    });

    it('should handle missing headers gracefully', () => {
      mockReq.headers = {};

      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      expect(logger.logInfo).toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        jest.clearAllMocks();
        mockReq.method = method;

        requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

        expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
          method
        }));
      });
    });
  });

  describe('authLogger', () => {
    it('should log authentication event', () => {
      authLogger('login', mockReq as AuthenticatedRequest);

      expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
        action: 'login',
        ip: '127.0.0.1',
        userAgent: 'test-agent'
      }));
    });

    it('should include userId when available', () => {
      mockReq.userId = 'user-123';

      authLogger('login', mockReq as AuthenticatedRequest);

      expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
        userId: 'user-123'
      }));
    });

    it('should include user email when available', () => {
      mockReq.user = { _id: 'user-456', email: 'test@example.com' };

      authLogger('login', mockReq as AuthenticatedRequest);

      expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
        userId: 'user-456',
        email: 'test@example.com'
      }));
    });

    it('should include additional context when provided', () => {
      authLogger('login', mockReq as AuthenticatedRequest, {
        loginMethod: 'password',
        twoFactorEnabled: true
      });

      expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
        action: 'login',
        loginMethod: 'password',
        twoFactorEnabled: true
      }));
    });

    it('should use connection.remoteAddress when ip not available', () => {
      const reqWithoutIp: Partial<AuthenticatedRequest> = {
        headers: {
          'user-agent': 'test-agent'
        },
        connection: { remoteAddress: '10.0.0.1' } as any
      };

      authLogger('logout', reqWithoutIp as AuthenticatedRequest);

      expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
        ip: '10.0.0.1'
      }));
    });

    it('should handle different authentication actions', () => {
      const actions = ['login', 'logout', 'register', 'password_reset', 'email_verification'];

      actions.forEach((action) => {
        jest.clearAllMocks();

        authLogger(action, mockReq as AuthenticatedRequest);

        expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.objectContaining({
          action
        }));
      });
    });

    it('should handle missing request data gracefully', () => {
      const minimalReq: Partial<AuthenticatedRequest> = {
        headers: {},
        connection: {} as any
      };

      authLogger('login', minimalReq as AuthenticatedRequest);

      expect(logger.logInfo).toHaveBeenCalled();
    });
  });

  describe('businessLogger', () => {
    it('should log business operation', () => {
      businessLogger('create_project', {
        projectId: 'proj-123',
        userId: 'user-456'
      });

      expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.objectContaining({
        operation: 'create_project',
        projectId: 'proj-123',
        userId: 'user-456'
      }));
    });

    it('should include all context fields', () => {
      businessLogger('update_project', {
        projectId: 'proj-123',
        userId: 'user-456',
        changes: ['name', 'description'],
        timestamp: '2023-10-01T00:00:00Z'
      });

      expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.objectContaining({
        operation: 'update_project',
        projectId: 'proj-123',
        userId: 'user-456',
        changes: ['name', 'description'],
        timestamp: '2023-10-01T00:00:00Z'
      }));
    });

    it('should handle empty context', () => {
      businessLogger('system_startup', {});

      expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.objectContaining({
        operation: 'system_startup'
      }));
    });

    it('should handle different operation types', () => {
      const operations = [
        'create_project',
        'delete_project',
        'invite_user',
        'remove_member',
        'export_data'
      ];

      operations.forEach((operation) => {
        jest.clearAllMocks();

        businessLogger(operation, { id: 'test' });

        expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.objectContaining({
          operation
        }));
      });
    });

    it('should handle complex context objects', () => {
      businessLogger('complex_operation', {
        nested: {
          data: {
            value: 123
          }
        },
        array: [1, 2, 3],
        boolean: true,
        null: null
      });

      expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.objectContaining({
        operation: 'complex_operation',
        nested: { data: { value: 123 } },
        array: [1, 2, 3],
        boolean: true,
        null: null
      }));
    });
  });

  describe('Integration', () => {
    it('should work together for authenticated request flow', (done) => {
      // Setup authenticated request
      mockReq.userId = 'user-123';
      mockReq.user = { _id: 'user-123', email: 'test@example.com' };

      // Log authentication
      authLogger('login', mockReq as AuthenticatedRequest);

      // Start request logging
      requestLogger(mockReq as AuthenticatedRequest, mockRes as Response, nextFunction);

      // Log business operation
      businessLogger('access_resource', {
        resourceId: 'resource-456',
        userId: 'user-123'
      });

      // Complete request
      mockRes.statusCode = 200;
      (mockRes.end as jest.Mock)();

      setImmediate(() => {
        expect(logger.logInfo).toHaveBeenCalledWith('Authentication event', expect.any(Object));
        expect(logger.logInfo).toHaveBeenCalledWith('Incoming request', expect.any(Object));
        expect(logger.logInfo).toHaveBeenCalledWith('Business operation', expect.any(Object));
        expect(logger.logInfo).toHaveBeenCalledWith('Successful response', expect.any(Object));
        done();
      });
    });
  });
});
