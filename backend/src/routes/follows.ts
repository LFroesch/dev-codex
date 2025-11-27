import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import Follow from '../models/Follow';
import { User } from '../models/User';
import { Project } from '../models/Project';
import NotificationService from '../services/notificationService';
import mongoose from 'mongoose';
import { asyncHandler, BadRequestError, NotFoundError, ConflictError } from '../utils/errorHandler';

const router = Router();

// Get user's following list (users and projects they follow)
router.get('/following', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const follows = await Follow.find({ followerId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .populate('followingUserId', 'firstName lastName username email displayPreference isPublic publicSlug')
    .populate('followingProjectId', 'name description color category publicSlug')
    .lean();

  const users = follows.filter(f => f.followingType === 'user' && f.followingUserId).map(f => ({
    ...f.followingUserId,
    followId: f._id,
    followedAt: f.createdAt
  }));

  const projects = follows.filter(f => f.followingType === 'project' && f.followingProjectId).map(f => ({
    ...f.followingProjectId,
    followId: f._id,
    followedAt: f.createdAt
  }));

  res.json({
    success: true,
    following: {
      users,
      projects
    },
    total: follows.length
  });
}));

// Get user's followers
router.get('/followers', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const followers = await Follow.find({
    followingType: 'user',
    followingUserId: new mongoose.Types.ObjectId(userId)
  })
    .sort({ createdAt: -1 })
    .populate('followerId', 'firstName lastName username email displayPreference isPublic publicSlug')
    .lean();

  const followersList = followers.map(f => ({
    ...f.followerId,
    followId: f._id,
    followedAt: f.createdAt
  }));

  res.json({
    success: true,
    followers: followersList,
    total: followers.length
  });
}));

// Check if following a user or project
router.get('/check/:type/:id', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, id } = req.params;
  const userId = req.userId!;

  if (type !== 'user' && type !== 'project') {
    throw BadRequestError('Invalid type', 'INVALID_TYPE');
  }

  const query: any = {
    followerId: new mongoose.Types.ObjectId(userId),
    followingType: type
  };

  if (type === 'user') {
    query.followingUserId = new mongoose.Types.ObjectId(id);
  } else {
    query.followingProjectId = new mongoose.Types.ObjectId(id);
  }

  const follow = await Follow.findOne(query);

  res.json({
    success: true,
    isFollowing: !!follow,
    followId: follow?._id
  });
}));

// Follow a user
router.post('/user/:userId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId: targetUserId } = req.params;
  const userId = req.userId!;

  // Can't follow yourself
  if (targetUserId === userId) {
    throw BadRequestError('Cannot follow yourself', 'FOLLOW_SELF');
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    followerId: new mongoose.Types.ObjectId(userId),
    followingType: 'user',
    followingUserId: new mongoose.Types.ObjectId(targetUserId)
  });

  if (existingFollow) {
    throw ConflictError('Already following this user', 'ALREADY_FOLLOWING');
  }

    // Create follow
    const follow = new Follow({
      followerId: new mongoose.Types.ObjectId(userId),
      followingType: 'user',
      followingUserId: new mongoose.Types.ObjectId(targetUserId)
    });

    await follow.save();

    // Create notification for followed user
    try {
      const follower = await User.findById(userId).select('firstName lastName username displayPreference').lean();
      const displayName = follower?.displayPreference === 'username'
        ? `@${follower?.username}`
        : `${follower?.firstName} ${follower?.lastName}`;

      const notificationService = NotificationService.getInstance();
      await notificationService.createNotification({
        userId: new mongoose.Types.ObjectId(targetUserId),
        type: 'new_follower',
        title: 'New Follower',
        message: `${displayName} started following you`,
        actionUrl: `/discover/user/${follower?.username || userId}`,
        relatedUserId: new mongoose.Types.ObjectId(userId)
      });
    } catch (notifError) {
      
      // Continue - don't fail the request if notification fails
    }

  res.status(201).json({
    success: true,
    follow: {
      _id: follow._id,
      followingUserId: follow.followingUserId,
      createdAt: follow.createdAt
    }
  });
}));// Follow a project
router.post('/project/:projectId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.userId!;

  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
  }

  // Check if already following
  const existingFollow = await Follow.findOne({
    followerId: new mongoose.Types.ObjectId(userId),
    followingType: 'project',
    followingProjectId: new mongoose.Types.ObjectId(projectId)
  });

  if (existingFollow) {
    throw ConflictError('Already following this project', 'ALREADY_FOLLOWING');
  }

    // Create follow
    const follow = new Follow({
      followerId: new mongoose.Types.ObjectId(userId),
      followingType: 'project',
      followingProjectId: new mongoose.Types.ObjectId(projectId)
    });

    await follow.save();

    // Notify project owner (if not following own project)
    if (project.userId.toString() !== userId) {
      try {
        const follower = await User.findById(userId).select('firstName lastName username displayPreference').lean();
        const displayName = follower?.displayPreference === 'username'
          ? `@${follower?.username}`
          : `${follower?.firstName} ${follower?.lastName}`;

        const notificationService = NotificationService.getInstance();
        await notificationService.createNotification({
          userId: project.userId,
          type: 'project_followed',
          title: 'Project Followed',
          message: `${displayName} started following "${project.name}"`,
          actionUrl: `/discover/project/${project.publicSlug || project._id}`,
          relatedProjectId: project._id,
          relatedUserId: new mongoose.Types.ObjectId(userId)
        });
      } catch (notifError) {
        
        // Continue - don't fail the request if notification fails
      }
    }

  res.status(201).json({
    success: true,
    follow: {
      _id: follow._id,
      followingProjectId: follow.followingProjectId,
      createdAt: follow.createdAt
    }
  });
}));// Unfollow
router.delete('/:type/:id', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type, id } = req.params;
  const userId = req.userId!;

  if (type !== 'user' && type !== 'project') {
    throw BadRequestError('Invalid type', 'INVALID_TYPE');
  }

  const query: any = {
    followerId: new mongoose.Types.ObjectId(userId),
    followingType: type
  };

  if (type === 'user') {
    query.followingUserId = new mongoose.Types.ObjectId(id);
  } else {
    query.followingProjectId = new mongoose.Types.ObjectId(id);
  }

  const result = await Follow.deleteOne(query);

  if (result.deletedCount === 0) {
    throw NotFoundError('Follow not found', 'FOLLOW_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Unfollowed successfully'
  });
}));

// Get follower/following counts
router.get('/stats/:userId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;

  const [followersCount, followingCount] = await Promise.all([
    Follow.countDocuments({
      followingType: 'user',
      followingUserId: new mongoose.Types.ObjectId(userId)
    }),
    Follow.countDocuments({
      followerId: new mongoose.Types.ObjectId(userId)
    })
  ]);

  res.json({
    success: true,
    stats: {
      followers: followersCount,
      following: followingCount
    }
  });
}));

export default router;
