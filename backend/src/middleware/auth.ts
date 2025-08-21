import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';

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
      console.error('CRITICAL: JWT_SECRET environment variable is not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Check if user has access to a specific project
export const requireProjectAccess = (requiredPermission: 'view' | 'edit' | 'manage' = 'view') => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id: projectId } = req.params;
      const userId = req.userId;

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
      console.error('Project access check error:', error);
      res.status(500).json({ message: 'Server error checking project access' });
    }
  };
};