import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import Follow from '../models/Follow';
import { User } from '../models/User';
import { Project } from '../models/Project';
import NotificationService from '../services/notificationService';
import mongoose from 'mongoose';

const router = Router();

// Get user's following list (users and projects they follow)
router.get('/following', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Database error while fetching following' });
  }
});

// Get user's followers
router.get('/followers', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Failed to fetch followers' });
  }
});

// Check if following a user or project
router.get('/check/:type/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;
    const userId = req.userId!;

    if (type !== 'user' && type !== 'project') {
      return res.status(400).json({ success: false, message: 'Invalid type' });
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Failed to check follow status' });
  }
});

// Follow a user
router.post('/user/:userId', requireAuth, blockDemoWrites, async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const userId = req.userId!;

    // Can't follow yourself
    if (targetUserId === userId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      followerId: new mongoose.Types.ObjectId(userId),
      followingType: 'user',
      followingUserId: new mongoose.Types.ObjectId(targetUserId)
    });

    if (existingFollow) {
      return res.status(400).json({ success: false, message: 'Already following this user' });
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Database error while following user' });
  }
});

// Follow a project
router.post('/project/:projectId', requireAuth, blockDemoWrites, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if already following
    const existingFollow = await Follow.findOne({
      followerId: new mongoose.Types.ObjectId(userId),
      followingType: 'project',
      followingProjectId: new mongoose.Types.ObjectId(projectId)
    });

    if (existingFollow) {
      return res.status(400).json({ success: false, message: 'Already following this project' });
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Failed to follow project' });
  }
});

// Unfollow
router.delete('/:type/:id', requireAuth, blockDemoWrites, async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;
    const userId = req.userId!;

    if (type !== 'user' && type !== 'project') {
      return res.status(400).json({ success: false, message: 'Invalid type' });
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
      return res.status(404).json({ success: false, message: 'Follow not found' });
    }

    res.json({
      success: true,
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Failed to unfollow' });
  }
});

// Get follower/following counts
router.get('/stats/:userId', async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export default router;
