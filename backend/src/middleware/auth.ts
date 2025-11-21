import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import { logError } from '../config/logger';
import { setSentryUser } from '../config/sentry';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'owner' | 'editor' | 'viewer';
  projectAccess?: {
    isOwner: boolean;
    role: 'owner' | 'editor' | 'viewer';
    canEdit: boolean;
    canManageTeam: boolean;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!process.env.JWT_SECRET) {
      logError('CRITICAL: JWT_SECRET environment variable is not set', undefined, {
        severity: 'critical',
        component: 'auth',
        action: 'token_verification'
      });
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.userId = decoded.userId;

    // Set user context for Sentry
    try {
      setSentryUser({
        id: decoded.userId,
        email: decoded.email,
        planTier: decoded.planTier
      });
    } catch (error) {
      // Fail silently
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Allow both authenticated users and demo mode (unauthenticated becomes demo user)
export const requireAuthOrDemo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      // No token - try to find demo user
      const demoUser = await User.findOne({ isDemo: true });
      if (!demoUser) {
        return res.status(401).json({ message: 'Not authenticated and demo mode unavailable' });
      }
      req.userId = demoUser._id.toString();
      return next();
    }

    // Has token - validate it normally
    if (!process.env.JWT_SECRET) {
      logError('CRITICAL: JWT_SECRET environment variable is not set', undefined, {
        severity: 'critical',
        component: 'auth',
        action: 'token_verification'
      });
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.userId = decoded.userId;

    // Set user context for Sentry (skip for demo users)
    try {
      setSentryUser({
        id: decoded.userId,
        email: decoded.email,
        planTier: decoded.planTier
      });
    } catch (error) {
      // Fail silently
    }

    next();
  } catch (error) {
    // Invalid token - fall back to demo user
    const demoUser = await User.findOne({ isDemo: true });
    if (!demoUser) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.userId = demoUser._id.toString();
    next();
  }
};

// Check if user has access to a specific project
export const requireProjectAccess = (requiredPermission: 'view' | 'edit' | 'manage' = 'view') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id: projectId } = req.params;
    const userId = req.userId;
    
    try {

      if (!userId || !projectId) {
        return res.status(401).json({ message: 'Missing authentication or project ID' });
      }

      // Check if project exists
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Check if user is the owner (legacy userId or new ownerId)
      const isOwner = project.userId?.toString() === userId || project.ownerId?.toString() === userId;
      
      if (isOwner) {
        req.projectAccess = {
          isOwner: true,
          role: 'owner',
          canEdit: true,
          canManageTeam: true,
        };
        return next();
      }

      // Check team membership
      const teamMember = await TeamMember.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!teamMember) {
        return res.status(403).json({ message: 'Access denied: Not a team member' });
      }

      // Set project access based on role
      const canEdit = teamMember.role === 'editor' || teamMember.role === 'owner';
      const canManageTeam = teamMember.role === 'owner';

      req.projectAccess = {
        isOwner: false,
        role: teamMember.role,
        canEdit,
        canManageTeam,
      };

      // Check required permission
      if (requiredPermission === 'edit' && !canEdit) {
        return res.status(403).json({ message: 'Access denied: Edit permission required' });
      }

      if (requiredPermission === 'manage' && !canManageTeam) {
        return res.status(403).json({ message: 'Access denied: Team management permission required' });
      }

      next();
    } catch (error) {
      logError('Project access check failed', error as Error, {
        component: 'auth',
        action: 'project_access_check',
        userId: userId,
        projectId: projectId,
        requiredPermission: requiredPermission
      });
      res.status(500).json({ message: 'Server error checking project access' });
    }
  };
};

// SEC-007 FIX: Admin authentication middleware
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    logError('Admin access check failed', error as Error, {
      component: 'auth',
      action: 'admin_access_check',
      userId: req.userId
    });
    res.status(500).json({ message: 'Server error checking admin access' });
  }
};