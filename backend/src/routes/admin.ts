import express from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

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

// Use auth and admin middleware for all admin routes
router.use(requireAuth, adminMiddleware);

// Get all users with pagination
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const projectCount = await Project.countDocuments({ userId: user._id });
    
    res.json({
      ...user.toObject(),
      projectCount
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user plan
router.put('/users/:id/plan', async (req, res) => {
  try {
    const { planTier } = req.body;
    
    if (!['free', 'pro', 'enterprise'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const projectLimits = { free: 3, pro: 20, enterprise: -1 };
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        planTier,
        projectLimit: projectLimits[planTier as keyof typeof projectLimits]
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user plan:', error);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

// Admin promotion is only available through secure server-side scripts
// This endpoint is disabled for security reasons

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow deleting the last admin
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }

    // Delete user's projects
    await Project.deleteMany({ userId: req.params.id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProjects = await Project.countDocuments();
    const activeSubscriptions = await User.countDocuments({ subscriptionStatus: 'active' });
    const freeUsers = await User.countDocuments({ planTier: 'free' });
    const proUsers = await User.countDocuments({ planTier: 'pro' });
    const enterpriseUsers = await User.countDocuments({ planTier: 'enterprise' });

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSignups = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    res.json({
      totalUsers,
      totalProjects,
      activeSubscriptions,
      recentSignups,
      planDistribution: {
        free: freeUsers,
        pro: proUsers,
        enterprise: enterpriseUsers
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get all projects with user info
router.get('/projects', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const projects = await Project.find()
      .populate('userId', 'firstName lastName email planTier')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Project.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

export default router;