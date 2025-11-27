import { Router, Request, Response } from 'express';
import { NewsPost } from '../models/NewsPost';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler, ForbiddenError, NotFoundError, BadRequestError } from '../utils/errorHandler';

const router = Router();

// Admin middleware
const adminMiddleware = asyncHandler(async (req: AuthRequest, res: any, next: any) => {
  const user = await User.findById(req.userId!);
  if (!user || !user.isAdmin) {
    throw ForbiddenError('Admin access required', 'ADMIN_REQUIRED');
  }
  next();
});

// Get all published news posts (public endpoint)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const posts = await NewsPost.find({
    isPublished: true
  }).sort({ publishedAt: -1 });

  res.json({ posts });
}));

// Get important announcements (public endpoint)
router.get('/important', asyncHandler(async (req: Request, res: Response) => {
  const posts = await NewsPost.find({
    isPublished: true,
    type: 'important'
  }).sort({ publishedAt: -1 });

  res.json({ posts });
}));

// Get all news posts for admin (including drafts)
router.get('/admin', requireAuth, adminMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const posts = await NewsPost.find({}).sort({ updatedAt: -1 });
  
  res.json({ posts });
}));

// Get single news post by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const post = await NewsPost.findById(req.params.id);
  
  if (!post) {
    throw NotFoundError('Post not found', 'POST_NOT_FOUND');
  }

  // If post is not published, require admin access
  if (!post.isPublished) {
    // Check if request has valid auth and user is admin
    const token = req.cookies?.token;
    if (!token) {
      throw ForbiddenError('Post not available', 'POST_NOT_AVAILABLE');
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      const user = await User.findById(decoded.userId);
      if (!user || !user.isAdmin) {
        throw ForbiddenError('Post not available', 'POST_NOT_AVAILABLE');
      }
    } catch {
      throw ForbiddenError('Post not available', 'POST_NOT_AVAILABLE');
    }
  }
  
  res.json({ post });
}));

// Create new news post (admin only)
router.post('/', requireAuth, adminMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, summary, type, isPublished } = req.body;

  if (!title || !content) {
    throw BadRequestError('Title and content are required', 'MISSING_FIELDS');
  }

  const newsPost = new NewsPost({
    title,
    content,
    summary,
    type: type || 'news',
    isPublished: isPublished || false,
    publishedAt: isPublished ? new Date() : undefined,
    authorId: req.userId
  });

  await newsPost.save();
  
  res.status(201).json({ post: newsPost });
}));

// Update news post (admin only)
router.put('/:id', requireAuth, adminMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, summary, type, isPublished } = req.body;
  
  const post = await NewsPost.findById(req.params.id);
  if (!post) {
    throw NotFoundError('Post not found', 'POST_NOT_FOUND');
  }

  // Update fields
  if (title !== undefined) post.title = title;
  if (content !== undefined) post.content = content;
  if (summary !== undefined) post.summary = summary;
  if (type !== undefined) post.type = type;
  
  // Handle publishing
  if (isPublished !== undefined) {
    const wasPublished = post.isPublished;
    post.isPublished = isPublished;
    
    // Set publishedAt when first published
    if (isPublished && !wasPublished) {
      post.publishedAt = new Date();
    }
  }

  await post.save();
  
  res.json({ post });
}));

// Delete news post (admin only)
router.delete('/:id', requireAuth, adminMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const post = await NewsPost.findByIdAndDelete(req.params.id);
  if (!post) {
    throw NotFoundError('Post not found', 'POST_NOT_FOUND');
  }
  
  res.json({ message: 'Post deleted successfully' });
}));

export default router;