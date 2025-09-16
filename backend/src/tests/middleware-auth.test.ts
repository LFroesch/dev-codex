// Mock ObjectId constructor first
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    Types: {
      ...actualMongoose.Types,
      ObjectId: jest.fn().mockImplementation((id) => ({
        toString: () => id,
        equals: (other: any) => id === other || id === other?.toString?.()
      }))
    }
  };
});

// Mock other dependencies
jest.mock('jsonwebtoken');
jest.mock('../models/Project');
jest.mock('../models/TeamMember');
jest.mock('../config/logger');
jest.mock('../config/sentry');

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, requireProjectAccess, AuthRequest } from '../middleware/auth';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';

const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      cookies: {},
      params: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should authenticate valid token', () => {
      const mockUserId = 'user123';
      mockReq.cookies = { token: 'valid-token' };
      process.env.JWT_SECRET = 'test-secret';
      
      mockedJwt.verify.mockReturnValue({ userId: mockUserId } as any);

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockReq.userId).toBe(mockUserId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject missing token', () => {
      mockReq.cookies = {};

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockReq.cookies = { token: 'invalid-token' };
      process.env.JWT_SECRET = 'test-secret';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle expired token', () => {
      mockReq.cookies = { token: 'expired-token' };
      process.env.JWT_SECRET = 'test-secret';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Token expired' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET', () => {
      mockReq.cookies = { token: 'some-token' };
      delete process.env.JWT_SECRET;

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server configuration error' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed token', () => {
      mockReq.cookies = { token: 'malformed.token' };
      process.env.JWT_SECRET = 'test-secret';
      
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Malformed token');
      });

      requireAuth(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireProjectAccess', () => {
    const mockProject = {
      _id: 'project123',
      userId: 'user123',
      ownerId: 'user123',
      title: 'Test Project'
    };

    beforeEach(() => {
      mockReq.userId = 'user123';
      mockReq.params = { id: 'project123' };
    });

    it('should grant access to project owner', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(null);

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.projectAccess).toEqual({
        isOwner: true,
        role: 'owner',
        canEdit: true,
        canManageTeam: true
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should grant access to team member with editor role', async () => {
      const otherOwnerProject = { 
        ...mockProject, 
        userId: 'other-user',
        ownerId: 'other-user'
      };
      const teamMember = {
        userId: 'user123',
        projectId: 'project123',
        role: 'editor',
        status: 'active'
      };

      (Project.findById as jest.Mock).mockResolvedValue(otherOwnerProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(teamMember);

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.projectAccess).toEqual({
        isOwner: false,
        role: 'editor',
        canEdit: true,
        canManageTeam: false
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should grant limited access to team member with viewer role', async () => {
      const otherOwnerProject = { 
        ...mockProject, 
        userId: 'other-user',
        ownerId: 'other-user'
      };
      const teamMember = {
        userId: 'user123',
        projectId: 'project123',
        role: 'viewer',
        status: 'active'
      };

      (Project.findById as jest.Mock).mockResolvedValue(otherOwnerProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(teamMember);

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.projectAccess).toEqual({
        isOwner: false,
        role: 'viewer',
        canEdit: false,
        canManageTeam: false
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access if project not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(null);

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Project not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access if user has no permissions', async () => {
      const otherOwnerProject = { 
        ...mockProject, 
        userId: 'other-user',
        ownerId: 'other-user'
      };
      (Project.findById as jest.Mock).mockResolvedValue(otherOwnerProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(null);

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Not a team member' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access for edit permission when user only has view access', async () => {
      const otherOwnerProject = { 
        ...mockProject, 
        userId: 'other-user',
        ownerId: 'other-user'
      };
      const viewerMember = {
        userId: 'user123',
        projectId: 'project123',
        role: 'viewer'
      };

      (Project.findById as jest.Mock).mockResolvedValue(otherOwnerProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(viewerMember);

      const middleware = requireProjectAccess('edit');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied: Edit permission required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      (Project.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error checking project access' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require authentication first', async () => {
      mockReq.userId = undefined;

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing authentication or project ID' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require project ID in params', async () => {
      mockReq.params = {};

      const middleware = requireProjectAccess();
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Missing authentication or project ID' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow team management for owner role', async () => {
      const otherOwnerProject = { 
        ...mockProject, 
        userId: 'other-user',
        ownerId: 'other-user'
      };
      const ownerMember = {
        userId: 'user123',
        projectId: 'project123',
        role: 'owner'
      };

      (Project.findById as jest.Mock).mockResolvedValue(otherOwnerProject);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(ownerMember);

      const middleware = requireProjectAccess('manage');
      await middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockReq.projectAccess).toEqual({
        isOwner: false,
        role: 'owner',
        canEdit: true,
        canManageTeam: true
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});