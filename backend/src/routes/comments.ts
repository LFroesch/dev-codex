import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Comment from '../models/Comment';
import { Project } from '../models/Project';
import { User } from '../models/User';
import TeamMember from '../models/TeamMember';
import NotificationService from '../services/notificationService';
import activityLogger from '../services/activityLogger';
import mongoose from 'mongoose';
import { SOCIAL_CONSTANTS } from '../config/socialConstants';

const router = Router();

// Get all comments for a project
router.get('/project/:projectId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId!;

    // Verify user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Check if user is project owner, team member, or project is public
    const isOwner = project.userId.toString() === userId;
    const isMember = await TeamMember.exists({ projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(userId) });
    const isPublic = project.isPublic === true;
    const hasAccess = isOwner || isMember || isPublic;

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get all comments for this project
    const comments = await Comment.find({
      projectId: new mongoose.Types.ObjectId(projectId),
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean();

    // Populate user information
    const userIds = [...new Set(comments.map(c => c.userId.toString()))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName username email displayPreference isPublic publicSlug')
      .lean();

    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    // Build nested comment tree (recursive)
    const commentsWithUsers: any[] = comments.map((comment: any) => ({
      ...comment,
      user: userMap.get(comment.userId.toString()),
      replies: []
    }));

    const commentMap = new Map(commentsWithUsers.map((c: any) => [c._id.toString(), c]));
    const topLevelComments: any[] = [];

    // Build tree structure
    commentsWithUsers.forEach(comment => {
      if (!comment.parentCommentId) {
        topLevelComments.push(comment);
      } else {
        const parent = commentMap.get(comment.parentCommentId.toString());
        if (parent) {
          parent.replies.push(comment);
        } else {
          // Orphaned comment (parent deleted/missing) - treat as top-level
          topLevelComments.push(comment);
        }
      }
    });

    // Sort replies recursively (oldest first for natural conversation flow)
    const sortReplies = (comment: any) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        comment.replies.forEach(sortReplies);
      }
    };

    topLevelComments.forEach(sortReplies);
    const commentsWithReplies = topLevelComments;

    res.json({
      success: true,
      comments: commentsWithReplies,
      total: comments.length
    });
  } catch (error) {
    console.error(`Error fetching comments for project ${req.params.projectId}:`, error);
    res.status(500).json({ success: false, message: 'Database error while fetching comments' });
  }
});

// Create a new comment on a project
router.post('/project/:projectId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    if (content.length > SOCIAL_CONSTANTS.COMMENT_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `Comment too long (max ${SOCIAL_CONSTANTS.COMMENT_MAX_LENGTH} characters)` });
    }

    // Verify user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isOwner = project.userId.toString() === userId;
    const isMember = await TeamMember.exists({ projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(userId) });
    const isPublic = project.isPublic === true;
    const hasAccess = isOwner || isMember || isPublic;

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Create comment
    const comment = new Comment({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
      content: content.trim()
    });

    await comment.save();

    // Populate user information
    const user = await User.findById(userId).select('firstName lastName username email displayPreference').lean();

    // Notify project owner (auto-aggregates multiple comments)
    if (project.userId.toString() !== userId) {
      try {
        const displayName = user?.displayPreference === 'username'
          ? `@${user?.username}`
          : `${user?.firstName} ${user?.lastName}`;

        const notificationService = NotificationService.getInstance();
        await notificationService.createNotification({
          userId: project.userId,
          type: 'comment_on_project',
          title: 'New Comment',
          message: `${displayName} commented on "${project.name}"`,
          actionUrl: `/discover/project/${project.publicSlug || project._id}?tab=comments`,
          relatedProjectId: project._id,
          relatedUserId: new mongoose.Types.ObjectId(userId),
          relatedCommentId: comment._id
        });
      } catch (notifError) {
        console.error('Error creating comment notification:', notifError);
        // Continue - don't fail the request if notification fails
      }
    }

    res.status(201).json({
      success: true,
      comment: {
        ...comment.toObject(),
        user
      }
    });
  } catch (error) {
    console.error(`Error creating comment on project ${req.params.projectId}:`, error);
    res.status(500).json({ success: false, message: 'Database error while creating comment' });
  }
});

// Reply to a comment
router.post('/project/:projectId/reply/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Reply content is required' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ success: false, message: 'Reply too long (max 5000 characters)' });
    }

    // Verify parent comment exists
    const parentComment = await Comment.findById(commentId);
    if (!parentComment || parentComment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }

    // Verify user has access to this project
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isOwner = project.userId.toString() === userId;
    const isMember = await TeamMember.exists({ projectId: new mongoose.Types.ObjectId(projectId), userId: new mongoose.Types.ObjectId(userId) });
    const isPublic = project.isPublic === true;
    const hasAccess = isOwner || isMember || isPublic;

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Create reply
    const reply = new Comment({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(userId),
      content: content.trim(),
      parentCommentId: new mongoose.Types.ObjectId(commentId)
    });

    await reply.save();

    // Populate user information
    const user = await User.findById(userId).select('firstName lastName username email displayPreference').lean();

    // Notify parent comment author (auto-aggregates multiple replies)
    if (parentComment.userId.toString() !== userId) {
      try {
        const displayName = user?.displayPreference === 'username'
          ? `@${user?.username}`
          : `${user?.firstName} ${user?.lastName}`;

        const notificationService = NotificationService.getInstance();
        await notificationService.createNotification({
          userId: parentComment.userId,
          type: 'reply_to_comment',
          title: 'New Reply',
          message: `${displayName} replied to your comment on "${project.name}"`,
          actionUrl: `/discover/project/${project.publicSlug || project._id}?tab=comments`,
          relatedProjectId: project._id,
          relatedUserId: new mongoose.Types.ObjectId(userId),
          relatedCommentId: reply._id
        });
      } catch (notifError) {
        console.error('Error creating reply notification:', notifError);
        // Continue - don't fail the request if notification fails
      }
    }

    res.status(201).json({
      success: true,
      comment: {
        ...reply.toObject(),
        user
      }
    });
  } catch (error) {
    console.error(`Error creating reply to comment ${req.params.commentId}:`, error);
    res.status(500).json({ success: false, message: 'Database error while creating reply' });
  }
});

// Edit a comment
router.put('/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.userId!;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Comment content is required' });
    }

    if (content.length > SOCIAL_CONSTANTS.COMMENT_MAX_LENGTH) {
      return res.status(400).json({ success: false, message: `Comment too long (max ${SOCIAL_CONSTANTS.COMMENT_MAX_LENGTH} characters)` });
    }

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Only comment author can edit
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments' });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    await comment.save();

    // Populate user information
    const user = await User.findById(userId).select('firstName lastName username email displayPreference').lean();

    res.json({
      success: true,
      comment: {
        ...comment.toObject(),
        user
      }
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({ success: false, message: 'Failed to edit comment' });
  }
});

// Delete a comment
router.delete('/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.userId!;

    const comment = await Comment.findById(commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Verify user has permission (comment author or project owner)
    const project = await Project.findById(comment.projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const isAuthor = comment.userId.toString() === userId;
    const isProjectOwner = project.userId.toString() === userId;

    if (!isAuthor && !isProjectOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content = '[deleted]';
    await comment.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
});

// Get comments on my projects (for activity feed)
router.get('/my-projects', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit = SOCIAL_CONSTANTS.DEFAULT_PAGE_LIMIT } = req.query;
    const limitNum = parseInt(limit as string);

    // Find all projects owned by user
    const projects = await Project.find({ userId: new mongoose.Types.ObjectId(userId) }).select('_id');
    const projectIds = projects.map(p => p._id);

    // Find recent comments on these projects (excluding user's own comments)
    const comments = await Comment.find({
      projectId: { $in: projectIds },
      userId: { $ne: new mongoose.Types.ObjectId(userId) },
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .populate('userId', 'firstName lastName username email displayPreference isPublic publicSlug')
      .populate('projectId', 'name color publicSlug')
      .lean();

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('Error fetching my project comments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
});

export default router;
