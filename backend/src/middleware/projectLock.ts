import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { Project } from '../models/Project';

/**
 * Middleware to check if a project is locked
 * Blocks all modification attempts to locked projects
 */
export const checkProjectLock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;

    if (!projectId) {
      return next();
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return next(); // Let other middleware handle missing project
    }

    if (project.isLocked) {
      return res.status(403).json({
        error: 'Project is locked',
        message: project.lockedReason || 'This project is locked and cannot be modified. Please upgrade your plan to unlock it.',
        isLocked: true
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
