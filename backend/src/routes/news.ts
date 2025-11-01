import { Router, Request, Response } from 'express';
import { NewsPost } from '../models/NewsPost';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Admin middleware
const adminMiddleware = async (req: AuthRequest, res: any, next: any) => {
  try {
    const user = await User.findById(req.userId!);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Get all published news posts (public endpoint)
router.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await NewsPost.find({
      isPublished: true
    }).sort({ publishedAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error('Error fetching news posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get important announcements (public endpoint)
router.get('/important', async (req: Request, res: Response) => {
  try {
    const posts = await NewsPost.find({
      isPublished: true,
      type: 'important'
    }).sort({ publishedAt: -1 });

    res.json({ posts });
  } catch (error) {
    console.error('Error fetching important announcements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all news posts for admin (including drafts)
router.get('/admin', requireAuth, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await NewsPost.find({}).sort({ updatedAt: -1 });
    
    res.json({ posts });
  } catch (error) {
    console.error('Error fetching admin news posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single news post by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await NewsPost.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // If post is not published, require admin access
    if (!post.isPublished) {
      // Check if request has valid auth and user is admin
      const token = req.cookies?.token;
      if (!token) {
        return res.status(403).json({ error: 'Post not available' });
      }
      
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        const user = await User.findById(decoded.userId);
        if (!user || !user.isAdmin) {
          return res.status(403).json({ error: 'Post not available' });
        }
      } catch {
        return res.status(403).json({ error: 'Post not available' });
      }
    }
    
    res.json({ post });
  } catch (error) {
    console.error('Error fetching news post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new news post (admin only)
router.post('/', requireAuth, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, type, isPublished } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
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
  } catch (error) {
    console.error('Error creating news post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update news post (admin only)
router.put('/:id', requireAuth, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, summary, type, isPublished } = req.body;
    
    const post = await NewsPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
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
  } catch (error) {
    console.error('Error updating news post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete news post (admin only)
router.delete('/:id', requireAuth, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const post = await NewsPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting news post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;