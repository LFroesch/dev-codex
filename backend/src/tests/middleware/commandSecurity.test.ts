import { Request, Response, NextFunction } from 'express';
import { sanitizeCommand, validateCommandFormat, logCommandExecution } from '../../middleware/commandSecurity';
import { AuthRequest } from '../../middleware/auth';

describe('commandSecurity middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      userId: 'user123',
      body: {},
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('validateCommandFormat', () => {
    it('should allow valid commands starting with /', () => {
      mockReq.body = { command: '/help' };

      validateCommandFormat(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject commands not starting with /', () => {
      mockReq.body = { command: 'invalid command' };

      validateCommandFormat(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject missing command', () => {
      mockReq.body = {};

      validateCommandFormat(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('sanitizeCommand', () => {
    it('should allow safe commands', () => {
      mockReq.body = { command: '/todo create New task' };

      sanitizeCommand(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should block commands with script tags', () => {
      mockReq.body = { command: '/todo <script>alert("xss")</script>' };

      sanitizeCommand(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should block commands with eval', () => {
      mockReq.body = { command: '/todo eval(malicious)' };

      sanitizeCommand(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject commands that are too long', () => {
      mockReq.body = { command: '/todo ' + 'a'.repeat(600) };

      sanitizeCommand(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('logCommandExecution', () => {
    it('should log command and call next', () => {
      mockReq.body = { command: '/help' };

      logCommandExecution(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
