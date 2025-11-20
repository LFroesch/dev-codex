import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Like from '../models/Like';
import Post from '../models/Post';
import Comment from '../models/Comment';
import NotificationService from '../services/notificationService';
import { User } from '../models/User';
import { Project } from '../models/Project';
import mongoose from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

const router = Router();

// Like a post
router.post('/posts/:postId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Post',
      likeableId: new mongoose.Types.ObjectId(postId)
    });

    if (existingLike) {
      return res.status(400).json({ success: false, message: 'Post already liked' });
    }

    // Create like
    const like = new Like({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Post',
      likeableId: new mongoose.Types.ObjectId(postId),
      postId: new mongoose.Types.ObjectId(postId) // For backward compatibility
    });

    await like.save();

    // Increment post likes counter
    post.likes = (post.likes || 0) + 1;
    await post.save();

    // Send notification to post author (if not liking own post)
    if (post.userId.toString() !== userId) {
      const notificationService = NotificationService.getInstance();
      const liker = await User.findById(userId).select('firstName lastName username displayPreference').lean();
      const likerDisplayName = liker?.displayPreference === 'username'
        ? `@${liker?.username}`
        : `${liker?.firstName} ${liker?.lastName}`;

      const populatedPost = await Post.findById(postId)
        .populate('projectId', 'name publicSlug')
        .lean();

      const actionUrl = populatedPost?.postType === 'project' && populatedPost.projectId
        ? `/discover/project/${(populatedPost.projectId as any).publicSlug || populatedPost.projectId}`
        : `/discover/user/${liker?.username || userId}`;

      await notificationService.createNotification({
        userId: post.userId,
        type: 'post_like',
        title: 'New Like',
        message: `${likerDisplayName} liked your post`,
        actionUrl,
        relatedUserId: new mongoose.Types.ObjectId(userId),
        relatedProjectId: populatedPost?.projectId ? new mongoose.Types.ObjectId(populatedPost.projectId as any) : undefined
      });
    }

    res.status(201).json({
      success: true,
      like,
      likesCount: post.likes
    });
  } catch (error) {
    console.error(`Error liking post ${req.params.postId}:`, error);
    res.status(500).json({ success: false, message: 'Database error while liking post' });
  }
});

// Unlike a post
router.delete('/posts/:postId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    // Find and delete the like
    const like = await Like.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Post',
      likeableId: new mongoose.Types.ObjectId(postId)
    });

    if (!like) {
      return res.status(404).json({ success: false, message: 'Like not found' });
    }

    // Decrement post likes counter
    const post = await Post.findById(postId);
    if (post && !post.isDeleted) {
      post.likes = Math.max(0, (post.likes || 0) - 1);
      await post.save();

      res.json({
        success: true,
        message: 'Post unliked successfully',
        likesCount: post.likes
      });
    } else {
      res.json({
        success: true,
        message: 'Post unliked successfully',
        likesCount: 0
      });
    }
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ success: false, message: 'Failed to unlike post' });
  }
});

// Check if user liked a post
router.get('/posts/:postId/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.userId!;

    const like = await Like.exists({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Post',
      likeableId: new mongoose.Types.ObjectId(postId)
    });

    res.json({
      success: true,
      isLiked: !!like
    });
  } catch (error) {
    console.error('Error checking like status:', error);
    res.status(500).json({ success: false, message: 'Failed to check like status' });
  }
});

// Get users who liked a post
router.get('/posts/:postId/users', async (req: AuthRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT, page = 1 } = req.query;
    const limitNum = parseInt(limit as string);
    const skip = (parseInt(page as string) - 1) * limitNum;

    const [likes, total] = await Promise.all([
      Like.find({
        likeableType: 'Post',
        likeableId: new mongoose.Types.ObjectId(postId)
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
        .lean(),
      Like.countDocuments({
        likeableType: 'Post',
        likeableId: new mongoose.Types.ObjectId(postId)
      })
    ]);

    res.json({
      success: true,
      likes,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching post likes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch post likes' });
  }
});

// Get posts liked by a user
router.get('/user/:userId/posts', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT, page = 1 } = req.query;
    const limitNum = parseInt(limit as string);
    const skip = (parseInt(page as string) - 1) * limitNum;

    const [likes, total] = await Promise.all([
      Like.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate({
          path: 'postId',
          populate: [
            { path: 'userId', select: 'firstName lastName username email displayPreference isPublic publicSlug' },
            { path: 'projectId', select: 'name description color category publicSlug' }
          ]
        })
        .lean(),
      Like.countDocuments({ userId: new mongoose.Types.ObjectId(userId) })
    ]);

    // Filter out deleted posts
    const validLikes = likes.filter((like: any) => like.postId && !like.postId.isDeleted);

    res.json({
      success: true,
      likes: validLikes,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching user likes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user likes' });
  }
});

// ============ COMMENT LIKES ============

// Like a comment
router.post('/comments/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    // Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Comment',
      likeableId: new mongoose.Types.ObjectId(commentId)
    });

    if (existingLike) {
      return res.status(400).json({ success: false, message: 'Comment already liked' });
    }

    // Create like
    const like = new Like({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Comment',
      likeableId: new mongoose.Types.ObjectId(commentId)
    });

    await like.save();

    // Increment comment likes counter
    comment.likes = (comment.likes || 0) + 1;
    await comment.save();

    // Send notification to comment author (if not liking own comment)
    if (comment.userId.toString() !== userId) {
      const notificationService = NotificationService.getInstance();
      const liker = await User.findById(userId).select('firstName lastName username displayPreference').lean();
      const likerDisplayName = liker?.displayPreference === 'username'
        ? `@${liker?.username}`
        : `${liker?.firstName} ${liker?.lastName}`;

      const project = await Project.findById(comment.projectId).select('name publicSlug').lean();

      await notificationService.createNotification({
        userId: comment.userId,
        type: 'comment_like',
        title: 'Comment Liked',
        message: `${likerDisplayName} liked your comment`,
        actionUrl: `/discover/project/${project?.publicSlug || comment.projectId}`,
        relatedUserId: new mongoose.Types.ObjectId(userId),
        relatedProjectId: comment.projectId,
        relatedCommentId: new mongoose.Types.ObjectId(commentId)
      });
    }

    res.status(201).json({
      success: true,
      like,
      likesCount: comment.likes
    });
  } catch (error) {
    console.error(`Error liking comment ${req.params.commentId}:`, error);
    res.status(500).json({ success: false, message: 'Database error while liking comment' });
  }
});

// Unlike a comment
router.delete('/comments/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    // Find and delete the like
    const like = await Like.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Comment',
      likeableId: new mongoose.Types.ObjectId(commentId)
    });

    if (!like) {
      return res.status(404).json({ success: false, message: 'Like not found' });
    }

    // Decrement comment likes counter
    const comment = await Comment.findById(commentId);
    if (comment && !comment.isDeleted) {
      comment.likes = Math.max(0, (comment.likes || 0) - 1);
      await comment.save();

      res.json({
        success: true,
        message: 'Comment unliked successfully',
        likesCount: comment.likes
      });
    } else {
      res.json({
        success: true,
        message: 'Comment unliked successfully',
        likesCount: 0
      });
    }
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ success: false, message: 'Failed to unlike comment' });
  }
});

// Check if user liked a comment
router.get('/comments/:commentId/check', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const like = await Like.exists({
      userId: new mongoose.Types.ObjectId(userId),
      likeableType: 'Comment',
      likeableId: new mongoose.Types.ObjectId(commentId)
    });

    res.json({
      success: true,
      isLiked: !!like
    });
  } catch (error) {
    console.error('Error checking comment like status:', error);
    res.status(500).json({ success: false, message: 'Failed to check like status' });
  }
});

// Get users who liked a comment
router.get('/comments/:commentId/users', async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT, page = 1 } = req.query;
    const limitNum = parseInt(limit as string);
    const skip = (parseInt(page as string) - 1) * limitNum;

    const [likes, total] = await Promise.all([
      Like.find({
        likeableType: 'Comment',
        likeableId: new mongoose.Types.ObjectId(commentId)
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
        .lean(),
      Like.countDocuments({
        likeableType: 'Comment',
        likeableId: new mongoose.Types.ObjectId(commentId)
      })
    ]);

    res.json({
      success: true,
      likes,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching comment likes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comment likes' });
  }
});

export default router;
