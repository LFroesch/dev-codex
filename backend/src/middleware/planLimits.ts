import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
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

    // Unlimited projects for premium users
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
    
    res.status(500).json({ error: 'Failed to check project limits' });
  }
};

// Team member limits by plan tier
const TEAM_MEMBER_LIMITS = {
  free: 3,
  pro: 10,
  premium: -1 // unlimited
};

export const checkTeamMemberLimit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.id;
    const userId = req.userId!;

    // Get the project to find the owner
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get the project owner
    const ownerId = project.ownerId || project.userId;
    const owner = await User.findById(ownerId);

    if (!owner) {
      return res.status(404).json({ error: 'Project owner not found' });
    }

    // Bypass limits for admin users
    if (owner.isAdmin) {
      return next();
    }

    // Get the limit for the owner's plan tier
    const planTier = owner.planTier || 'free';
    const memberLimit = TEAM_MEMBER_LIMITS[planTier as keyof typeof TEAM_MEMBER_LIMITS];

    // Unlimited members for premium
    if (memberLimit === -1) {
      return next();
    }

    // Count current team members (excluding the owner)
    const currentMemberCount = await TeamMember.countDocuments({ projectId });

    if (currentMemberCount >= memberLimit) {
      return res.status(403).json({
        error: 'Team member limit reached',
        message: `Your ${planTier} plan allows up to ${memberLimit} team members per project. Please upgrade to add more members.`,
        currentCount: currentMemberCount,
        limit: memberLimit,
        planTier: planTier
      });
    }

    next();
  } catch (error) {
    
    res.status(500).json({ error: 'Failed to check team member limits' });
  }
};