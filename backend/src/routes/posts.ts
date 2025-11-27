import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import Post from '../models/Post';
import Follow from '../models/Follow';
import Favorite from '../models/Favorite';
import { User } from '../models/User';
import { Project } from '../models/Project';
import NotificationService from '../services/notificationService';
import activityLogger from '../services/activityLogger';
import mongoose from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';
import { asyncHandler, BadRequestError, NotFoundError, ForbiddenError } from '../utils/errorHandler';

const router = Router();

// Get personalized feed (posts from followed users and favorited projects)
router.get('/feed', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { limit = SOCIAL_CONSTANTS.FEED_PAGE_LIMIT, page = 1 } = req.query;
  const limitNum = parseInt(limit as string);
  const skip = (parseInt(page as string) - 1) * limitNum;

    // Get users the current user follows
    const follows = await Follow.find({
      followerId: new mongoose.Types.ObjectId(userId),
      followingType: 'user'
    }).lean();

    const followedUserIds = follows
      .filter(f => f.followingUserId)
      .map(f => f.followingUserId);

    // Get projects the current user has favorited
    const favorites = await Favorite.find({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const favoritedProjectIds = favorites.map(f => f.projectId);

    // Build query for posts from followed users + favorited projects + own posts
    const query: any = {
      isDeleted: false,
      $or: [
        { userId: new mongoose.Types.ObjectId(userId) }, // Own posts
        {
          userId: { $in: followedUserIds },
          $or: [
            { visibility: 'public' },
            { visibility: 'followers' }
          ]
        },
        {
          postType: 'project',
          projectId: { $in: favoritedProjectIds },
          visibility: 'public'
        }
      ]
    };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
        .populate('projectId', 'name description color category publicSlug')
        .populate('linkedProjectId', 'name description color category publicSlug isPublic')
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
}));

// Get user's posts
router.get('/user/:userId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const currentUserId = req.userId;
  const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT, page = 1 } = req.query;
  const limitNum = parseInt(limit as string);
  const skip = (parseInt(page as string) - 1) * limitNum;

    // Check if viewing own posts or if following the user
    const isOwnProfile = currentUserId === userId;
    const isFollowing = currentUserId ? await Follow.exists({
      followerId: new mongoose.Types.ObjectId(currentUserId),
      followingType: 'user',
      followingUserId: new mongoose.Types.ObjectId(userId)
    }) : false;

    // Query based on visibility
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
      isDeleted: false
    };

    if (!isOwnProfile) {
      if (isFollowing) {
        query.visibility = { $in: ['public', 'followers'] };
      } else {
        query.visibility = 'public';
      }
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
        .populate('projectId', 'name description color category publicSlug')
        .populate('linkedProjectId', 'name description color category publicSlug isPublic')
        .lean(),
      Post.countDocuments(query)
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
}));

// Get project posts
router.get('/project/:projectId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT, page = 1 } = req.query;
  const limitNum = parseInt(limit as string);
  const skip = (parseInt(page as string) - 1) * limitNum;

  const [posts, total] = await Promise.all([
    Post.find({
      postType: 'project',
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
      visibility: 'public'
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
      .populate('projectId', 'name description color category publicSlug')
      .populate('linkedProjectId', 'name description color category publicSlug isPublic')
      .lean(),
    Post.countDocuments({
      postType: 'project',
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false,
      visibility: 'public'
    })
  ]);

  res.json({
    success: true,
    posts,
    pagination: {
      total,
      page: parseInt(page as string),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    }
  });
}));

// Create a post
router.post('/', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { content, postType = 'profile', projectId, linkedProjectId, visibility = 'public' } = req.body;

  if (!content || content.trim().length === 0) {
    throw BadRequestError('Content is required', 'MISSING_CONTENT');
  }

  if (content.length > SOCIAL_CONSTANTS.POST_MAX_LENGTH) {
    throw BadRequestError(`Content too long (max ${SOCIAL_CONSTANTS.POST_MAX_LENGTH} characters)`, 'CONTENT_TOO_LONG');
  }

  // Validate project if postType is 'project'
  if (postType === 'project') {
    if (!projectId) {
      throw BadRequestError('Project ID required for project posts', 'MISSING_PROJECT_ID');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw NotFoundError('Project not found', 'PROJECT_NOT_FOUND');
    }

    // Check if user owns the project
    if (project.userId.toString() !== userId) {
      throw ForbiddenError('Can only post updates to your own projects', 'NOT_PROJECT_OWNER');
    }
  }

  // Validate linked project if provided
  if (linkedProjectId) {
    const linkedProject = await Project.findById(linkedProjectId);
    if (!linkedProject) {
      throw NotFoundError('Linked project not found', 'LINKED_PROJECT_NOT_FOUND');
    }
    // Check if linked project is public or owned by user
    if (!linkedProject.isPublic && linkedProject.userId.toString() !== userId) {
      throw ForbiddenError('Cannot link to private projects you don\'t own', 'CANNOT_LINK_PRIVATE');
    }
  }

    const post = new Post({
      userId: new mongoose.Types.ObjectId(userId),
      postType,
      projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
      linkedProjectId: linkedProjectId ? new mongoose.Types.ObjectId(linkedProjectId) : undefined,
      content: content.trim(),
      visibility
    });

    await post.save();

    // Populate user info
    const populatedPost = await Post.findById(post._id)
      .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
      .populate('projectId', 'name description color category publicSlug')
      .lean();

    // Notify followers (for user posts) or users who favorited (for project posts)
    let notificationRecipients: any[] = [];

    if (postType === 'project' && projectId) {
      // Get users who favorited this project
      const favorites = await Favorite.find({
        projectId: new mongoose.Types.ObjectId(projectId)
      }).select('userId').lean();
      notificationRecipients = favorites.map(f => ({ followerId: f.userId }));
    } else {
      // Get followers for user posts
      const followers = await Follow.find({
        followingType: 'user',
        followingUserId: new mongoose.Types.ObjectId(userId)
      }).select('followerId').lean();
      notificationRecipients = followers;
    }

    const user = await User.findById(userId).select('firstName lastName username displayPreference').lean();
    const displayName = user?.displayPreference === 'username'
      ? `@${user?.username}`
      : `${user?.firstName} ${user?.lastName}`;

    // Create notifications for recipients
    if (notificationRecipients.length > 0 && visibility !== 'private') {
      const project = postType === 'project' && projectId ? await Project.findById(projectId).select('name publicSlug').lean() : null;
      const notificationService = NotificationService.getInstance();

      const notificationPromises = notificationRecipients.map(recipient =>
        notificationService.createNotification({
          userId: recipient.followerId,
          type: postType === 'project' ? 'project_update' : 'user_post',
          title: postType === 'project' ? 'Project Update' : 'New Post',
          message: postType === 'project'
            ? `${displayName} posted an update to "${project?.name}"`
            : `${displayName} shared a new post`,
          actionUrl: postType === 'project'
            ? `/discover/project/${project?.publicSlug || projectId}`
            : `/discover/user/${user?.username || userId}`,
          relatedUserId: new mongoose.Types.ObjectId(userId),
          relatedProjectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined
        }).catch(err => {
          
          return null;
        })
      );

      await Promise.allSettled(notificationPromises);
    }

    // Log activity
    if (postType === 'project' && projectId) {
      if (populatedPost && populatedPost.projectId) {
        const projData = populatedPost.projectId as any;
        await activityLogger.log({
          sessionId: 'social',
          userId: userId,
          projectId: projectId,
          action: 'posted_update',
          resourceType: 'project',
          resourceId: post._id.toString(),
          details: {
            resourceName: projData.name || 'Project',
            metadata: {
              postPreview: content.substring(0, 100)
            }
          }
        });
      }
    }

    res.status(201).json({
      success: true,
      post: populatedPost
    });
}));

// Edit a post
router.put('/:postId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.userId!;

  if (!content || content.trim().length === 0) {
    throw BadRequestError('Content is required', 'MISSING_CONTENT');
  }

  if (content.length > SOCIAL_CONSTANTS.POST_MAX_LENGTH) {
    throw BadRequestError(`Content too long (max ${SOCIAL_CONSTANTS.POST_MAX_LENGTH} characters)`, 'CONTENT_TOO_LONG');
  }

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw NotFoundError('Post not found', 'POST_NOT_FOUND');
  }

  // Only post author can edit
  if (post.userId.toString() !== userId) {
    throw ForbiddenError('Can only edit your own posts', 'NOT_POST_AUTHOR');
  }

  post.content = content.trim();
  post.isEdited = true;
  await post.save();

  const populatedPost = await Post.findById(post._id)
    .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
    .populate('projectId', 'name description color category publicSlug')
    .lean();

  res.json({
    success: true,
    post: populatedPost
  });
}));

// Delete a post
router.delete('/:postId', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { postId } = req.params;
  const userId = req.userId!;

  const post = await Post.findById(postId);
  if (!post || post.isDeleted) {
    throw NotFoundError('Post not found', 'POST_NOT_FOUND');
  }

  // Only post author can delete
  if (post.userId.toString() !== userId) {
    throw ForbiddenError('Can only delete your own posts', 'NOT_POST_AUTHOR');
  }

  post.isDeleted = true;
  post.deletedAt = new Date();
  await post.save();

  res.json({
    success: true,
    message: 'Post deleted successfully'
  });
}));

export default router;
