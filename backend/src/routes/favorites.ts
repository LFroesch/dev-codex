import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errorHandler';
import Favorite from '../models/Favorite';
import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import NotificationService from '../services/notificationService';
import activityLogger from '../services/activityLogger';
import mongoose from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

const router = Router();

// Get all favorites for the current user
router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const favorites = await Favorite.find({
    userId: new mongoose.Types.ObjectId(userId)
  })
    .sort({ createdAt: -1 })
    .populate({
      path: 'projectId',
      select: 'name description color category isArchived'
    })
    .lean();

  res.json({
    success: true,
    favorites: favorites.map(f => ({
      _id: f._id,
      project: f.projectId,
      createdAt: f.createdAt
    })),
    total: favorites.length
  });
}));

// Check if a project is favorited by the current user
router.get('/check/:projectId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  const favorite = await Favorite.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    projectId: new mongoose.Types.ObjectId(projectId)
  });

  res.json({
    success: true,
    isFavorited: !!favorite
  });
}));

// Add a project to favorites
router.post('/:projectId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if user has access to this project (owner, member, or public)
  const isOwner = project.userId.toString() === userId;
  const isMember = await TeamMember.exists({ projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(userId) });
  const isPublic = project.isPublic === true;
  const hasAccess = isOwner || isMember || isPublic;

  if (!hasAccess) {
    throw ForbiddenError('Access denied', 'ACCESS_DENIED');
  }

  // Check if already favorited
  const existingFavorite = await Favorite.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    projectId: new mongoose.Types.ObjectId(projectId)
  });

  if (existingFavorite) {
    throw BadRequestError('Project already favorited', 'ALREADY_FAVORITED');
  }

    // Create favorite
    const favorite = new Favorite({
      userId: new mongoose.Types.ObjectId(userId),
      projectId: new mongoose.Types.ObjectId(projectId)
    });

    await favorite.save();

    // Notify project owner (auto-aggregates multiple favorites)
    if (project.userId.toString() !== userId) {
      try {
        const user = await User.findById(userId).select('firstName lastName username displayPreference').lean();
        const displayName = user?.displayPreference === 'username'
          ? `@${user?.username}`
          : `${user?.firstName} ${user?.lastName}`;

        const notificationService = NotificationService.getInstance();
        await notificationService.createNotification({
          userId: project.userId,
          type: 'project_favorited',
          title: 'Project Favorited',
          message: `${displayName} favorited your project "${project.name}"`,
          actionUrl: `/discover/project/${project.publicSlug || project._id}`,
          relatedProjectId: project._id,
          relatedUserId: new mongoose.Types.ObjectId(userId)
        });
      } catch (notifError) {
        
        // Continue - don't fail the request if notification fails
      }
    }

    // Log activity
    try {
      await activityLogger.log({
        sessionId: 'social',
        userId: userId,
        projectId: projectId,
        action: 'favorited_project',
        resourceType: 'project',
        resourceId: favorite._id.toString(),
        details: {
          resourceName: project.name
        }
      });
    } catch (logError) {
      
      // Continue - don't fail the request if logging fails
    }

  res.status(201).json({
    success: true,
    favorite: {
      _id: favorite._id,
      projectId: favorite.projectId,
      createdAt: favorite.createdAt
    }
  });
}));

// Remove a project from favorites
router.delete('/:projectId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  const result = await Favorite.deleteOne({
    userId: new mongoose.Types.ObjectId(userId),
    projectId: new mongoose.Types.ObjectId(projectId)
  });

  if (result.deletedCount === 0) {
    throw NotFoundError('Favorite not found', 'FAVORITE_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Favorite removed successfully'
  });
}));

// Get favorite count for a project
router.get('/count/:projectId', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const count = await Favorite.countDocuments({
    projectId: new mongoose.Types.ObjectId(projectId)
  });

  res.json({
    success: true,
    count
  });
}));

// Get favorites on my projects (for activity feed)
router.get('/my-projects', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT } = req.query;
  const limitNum = parseInt(limit as string);

  // Find all projects owned by user
  const projects = await Project.find({ userId: new mongoose.Types.ObjectId(userId) }).select('_id');
  const projectIds = projects.map(p => p._id);

  // Find recent favorites on these projects (excluding user's own favorites)
  const favorites = await Favorite.find({
    projectId: { $in: projectIds },
    userId: { $ne: new mongoose.Types.ObjectId(userId) }
  })
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
    .populate('projectId', 'name color publicSlug')
    .lean();

  res.json({
    success: true,
    favorites
  });
}));

export default router;
