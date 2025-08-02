import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { AuthRequest } from './auth';

export const checkProjectLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Bypass limits for admin users
    if (user.isAdmin) {
      return next();
    }

    // Unlimited projects for enterprise users
    if (user.projectLimit === -1) {
      return next();
    }

    const currentProjectCount = await Project.countDocuments({ userId });
    
    if (currentProjectCount >= user.projectLimit) {
      return res.status(403).json({ 
        error: 'Project limit reached',
        message: `Your ${user.planTier} plan allows up to ${user.projectLimit} projects. Please upgrade to create more projects.`,
        currentCount: currentProjectCount,
        limit: user.projectLimit,
        planTier: user.planTier
      });
    }

    next();
  } catch (error) {
    console.error('Error checking project limit:', error);
    res.status(500).json({ error: 'Failed to check project limits' });
  }
};