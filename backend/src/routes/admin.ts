import express from 'express';
import mongoose, { isValidObjectId } from 'mongoose';
import Stripe from 'stripe';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Ticket } from '../models/Ticket';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import ActivityLog from '../models/ActivityLog';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PLAN_LIMITS } from '../config/planLimits';
import { CleanupService } from '../services/cleanupService';
import nodemailer from 'nodemailer';

const router = express.Router();

// Initialize Stripe only if API key is provided
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-07-30.basil',
  });
}

// Email configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

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
    const plan = req.query.plan as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const searchType = (req.query.searchType as string) || 'text';
    const createdAfter = req.query.createdAfter as string;
    const createdBefore = req.query.createdBefore as string;
    const lastLoginAfter = req.query.lastLoginAfter as string;
    const lastLoginBefore = req.query.lastLoginBefore as string;

    // Build filter object
    const filter: any = {};
    const andConditions: any[] = [];

    // Filter by plan
    if (plan && plan !== 'all') {
      filter.planTier = plan;
    }

    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        // Active = logged in within last 30 days and not banned
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.isBanned = false;
        filter.lastLogin = { $gte: thirtyDaysAgo };
      } else if (status === 'inactive') {
        // Inactive = not logged in for 30+ days or never logged in, and not banned
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.isBanned = false;
        andConditions.push({
          $or: [
            { lastLogin: { $lt: thirtyDaysAgo } },
            { lastLogin: { $exists: false } },
            { lastLogin: null }
          ]
        });
      } else if (status === 'banned') {
        filter.isBanned = true;
      }
    }

    // Search by name, email, ID, or email domain
    if (search && search.trim()) {
      if (searchType === 'id') {
        // Search by user ID
        if (isValidObjectId(search.trim())) {
          filter._id = search.trim();
        } else {
          // Invalid ID, will return no results
          filter._id = new mongoose.Types.ObjectId();
        }
      } else if (searchType === 'emailDomain') {
        // Search by email domain (e.g., gmail.com)
        const domain = search.trim().replace(/^@/, ''); // Remove @ if present
        andConditions.push({
          email: { $regex: `@${domain}$`, $options: 'i' }
        });
      } else {
        // Default: search by name or email
        andConditions.push({
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        });
      }
    }

    // Date range filters
    if (createdAfter) {
      const afterDate = new Date(createdAfter);
      afterDate.setHours(0, 0, 0, 0);
      if (!filter.createdAt) filter.createdAt = {};
      filter.createdAt.$gte = afterDate;
    }
    if (createdBefore) {
      const beforeDate = new Date(createdBefore);
      beforeDate.setHours(23, 59, 59, 999);
      if (!filter.createdAt) filter.createdAt = {};
      filter.createdAt.$lte = beforeDate;
    }
    if (lastLoginAfter) {
      const afterDate = new Date(lastLoginAfter);
      afterDate.setHours(0, 0, 0, 0);
      if (!filter.lastLogin) filter.lastLogin = {};
      filter.lastLogin.$gte = afterDate;
    }
    if (lastLoginBefore) {
      const beforeDate = new Date(lastLoginBefore);
      beforeDate.setHours(23, 59, 59, 999);
      if (!filter.lastLogin) filter.lastLogin = {};
      filter.lastLogin.$lte = beforeDate;
    }

    // Combine $and conditions if any exist
    if (andConditions.length > 0) {
      filter.$and = andConditions;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get project counts for each user
    // Optimize user fetching with aggregation pipeline to reduce N+1 queries
    const userIds = users.map(user => user._id);
    
    // Get project counts for all users at once
    const projectCounts = await Project.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);
    
    // Get active sessions for all users at once
    const activeSessions = await UserSession.find({
      userId: { $in: userIds },
      isActive: true
    }).sort({ startTime: -1 });
    
    // Get recent activity counts for all users at once
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessionCounts = await UserSession.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          startTime: { $gte: sevenDaysAgo }
        }
      },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    // Create lookup maps for efficiency
    const projectCountMap = new Map(projectCounts.map(pc => [pc._id.toString(), pc.count]));
    const activeSessionMap = new Map(activeSessions.map(session => [session.userId.toString(), session]));
    const recentSessionMap = new Map(recentSessionCounts.map(rsc => [rsc._id.toString(), rsc.count]));

    const usersWithProjectCounts = users.map(user => {
      const userId = user._id.toString();
      const activeSession = activeSessionMap.get(userId);
      
      return {
        ...user.toObject(),
        projectCount: projectCountMap.get(userId) || 0,
        activeSession: activeSession ? {
          sessionId: activeSession.sessionId,
          startTime: activeSession.startTime,
          lastActivity: activeSession.lastActivity,
          duration: activeSession.duration || (Date.now() - activeSession.startTime.getTime()),
          isVisible: activeSession.isVisible,
          totalEvents: activeSession.totalEvents
        } : null,
        recentSessions: recentSessionMap.get(userId) || 0
      };
    });

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersWithProjectCounts,
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
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

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
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { planTier } = req.body;

    if (!['free', 'pro', 'premium'].includes(planTier)) {
      return res.status(400).json({ error: 'Invalid plan tier' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        planTier,
        projectLimit: PLAN_LIMITS[planTier as keyof typeof PLAN_LIMITS]
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

// Ban user
router.post('/users/:id/ban', async (req: AuthRequest, res) => {
  try {
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't allow banning admins
    if (user.isAdmin) {
      return res.status(400).json({ error: 'Cannot ban admin users' });
    }

    // Don't allow banning yourself
    if (req.params.id === req.userId) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    user.isBanned = true;
    user.bannedAt = new Date();
    user.banReason = reason.trim();
    user.bannedBy = req.userId;
    await user.save();

    res.json({ message: 'User banned successfully', user });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

// Unban user
router.post('/users/:id/unban', async (req: AuthRequest, res) => {
  try {
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = false;
    user.bannedAt = undefined;
    user.banReason = undefined;
    user.bannedBy = undefined;
    await user.save();

    res.json({ message: 'User unbanned successfully', user });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

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
    // OPTIMIZED: Calculate date filters once
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // OPTIMIZED: Run all queries in parallel (10 queries → 5 queries)
    const [userStats, totalProjects, recentSignups, sessionStats, recentActivity] = await Promise.all([
      // Single aggregate for all user counts (replaces 5 queries with 1)
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            activeSubscriptions: [
              { $match: { subscriptionStatus: 'active' } },
              { $count: 'count' }
            ],
            planDistribution: [
              {
                $group: {
                  _id: '$planTier',
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ]),

      Project.countDocuments(),

      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),

      // Single aggregate for session counts (replaces 2 queries with 1)
      UserSession.aggregate([
        {
          $facet: {
            active: [
              { $match: { isActive: true } },
              { $count: 'count' }
            ],
            activeVisible: [
              { $match: { isActive: true, isVisible: true } },
              { $count: 'count' }
            ]
          }
        }
      ]),

      UserSession.countDocuments({ lastActivity: { $gte: twentyFourHoursAgo } })
    ]);

    // Extract user stats from aggregate result
    const totalUsers = userStats[0]?.total[0]?.count || 0;
    const activeSubscriptions = userStats[0]?.activeSubscriptions[0]?.count || 0;
    const planDistribution = { free: 0, pro: 0, premium: 0 };
    userStats[0]?.planDistribution.forEach((plan: any) => {
      if (plan._id && planDistribution.hasOwnProperty(plan._id)) {
        planDistribution[plan._id as 'free' | 'pro' | 'premium'] = plan.count;
      }
    });

    // Extract session stats from aggregate result
    const activeSessions = sessionStats[0]?.active[0]?.count || 0;
    const activeVisibleSessions = sessionStats[0]?.activeVisible[0]?.count || 0;

    res.json({
      totalUsers,
      totalProjects,
      activeSubscriptions,
      recentSignups,
      planDistribution,
      analytics: {
        activeSessions,
        activeVisibleSessions,
        recentActivity
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

// Get all tickets with pagination and filtering
router.get('/tickets', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const excludeStatus = req.query.excludeStatus as string;

    let filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (excludeStatus) {
      filter.status = { $ne: excludeStatus };
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // OPTIMIZED: Run all queries in parallel
    const [tickets, total, statusCounts] = await Promise.all([
      Ticket.find(filter)
        .populate('userId', 'firstName lastName email planTier')
        .populate('adminUserId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Ticket.countDocuments(filter),

      // FIXED: Single aggregate query instead of 4 separate countDocuments
      Ticket.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalPages = Math.ceil(total / limit);

    // Convert aggregate results to stats object
    const stats = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0
    };
    statusCounts.forEach((item: any) => {
      if (item._id === 'open') stats.open = item.count;
      else if (item._id === 'in_progress') stats.inProgress = item.count;
      else if (item._id === 'resolved') stats.resolved = item.count;
      else if (item._id === 'closed') stats.closed = item.count;
    });

    res.json({
      tickets,
      stats,
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
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket by ID
router.get('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('userId', 'firstName lastName email planTier')
      .populate('adminUserId', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Update ticket status and add admin response
router.put('/tickets/:ticketId', async (req: AuthRequest, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminResponse, priority } = req.body;
    const adminUserId = req.userId;

    const updateData: any = {
      adminUserId
    };

    if (status) {
      updateData.status = status;
      if (status === 'resolved' || status === 'closed') {
        updateData.resolvedAt = new Date();
      }
    }

    if (adminResponse) {
      updateData.adminResponse = adminResponse;
    }

    if (priority) {
      updateData.priority = priority;
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId },
      updateData,
      { new: true }
    ).populate('userId', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Send email notifications for ticket updates
    if (ticket.userId) {
      try {
        const user = ticket.userId as any;
        const admin = await User.findById(adminUserId);
        const transporter = createTransporter();
        
        // Email to user (if there's an admin response)
        if (adminResponse) {
          const userMailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: `Support Ticket Update - ${ticketId}`,
            html: `
              <h2>Support Ticket Update</h2>
              <p>Hi ${user.firstName},</p>
              <p>Your support ticket has been updated by our team.</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Ticket ID:</strong> ${ticketId}<br>
                <strong>Status:</strong> ${status || ticket.status}<br>
                <strong>Priority:</strong> ${priority || ticket.priority}
              </div>
              
              <p><strong>Admin Response:</strong></p>
              <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #28a745;">
                ${adminResponse}
              </div>
              
              <p>Thank you for your patience!</p>
              <p>Best regards,<br>Support Team</p>
            `
          };
          await transporter.sendMail(userMailOptions);
        }

        // Email to support team (for all updates)
        const supportEmail = process.env.SUPPORT_EMAIL;
        if (!supportEmail) {
          console.error('CRITICAL: SUPPORT_EMAIL environment variable is not set');
          return res.status(500).json({ error: 'Server configuration error' });
        }
        
        const supportMailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: supportEmail,
          subject: `🔄 Ticket Updated - ${ticketId}`,
          html: `
            <h2>🔄 Support Ticket Updated</h2>
            <p>A support ticket has been updated by ${admin?.firstName || 'Admin'}.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Ticket ID:</strong> ${ticketId}<br>
              <strong>User:</strong> ${user.firstName} ${user.lastName} (${user.email})<br>
              <strong>Plan:</strong> ${user.planTier}<br>
              <strong>Subject:</strong> ${ticket.subject}<br>
              <strong>Previous Status:</strong> ${ticket.status}<br>
              <strong>New Status:</strong> ${status || ticket.status}<br>
              ${priority ? `<strong>New Priority:</strong> ${priority}<br>` : ''}
              <strong>Updated by:</strong> ${admin?.firstName || 'Admin'} ${admin?.lastName || ''}
            </div>
            
            ${adminResponse ? `
              <p><strong>Admin Response:</strong></p>
              <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #28a745;">
                ${adminResponse}
              </div>
            ` : ''}
            
            <p><strong>Original Message:</strong></p>
            <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #6c757d;">
              ${ticket.message}
            </div>
            
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5002'}/admin" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Dashboard</a></p>
          `
        };

        await transporter.sendMail(supportMailOptions);
      } catch (emailError) {
        console.error('Failed to send update email:', emailError);
      }
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Delete ticket
router.delete('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOneAndDelete({ ticketId });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
});

// Send password reset email for user
router.post('/users/:id/password-reset', async (req, res) => {
  try {
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a temporary password reset token (you might want to add this to your User model)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token
    await User.findByIdAndUpdate(req.params.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires
    });

    try {
      const transporter = createTransporter();
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5002'}/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: 'Password Reset Request - Dev Codex',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${user.firstName},</p>
          <p>An administrator has initiated a password reset for your account.</p>
          
          <p>Click the link below to reset your password (this link expires in 1 hour):</p>
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Password</a>
          
          <p>If you didn't request this password reset, please contact support immediately.</p>
          <p>Best regards,<br>Dev Codex Team</p>
          
          <hr>
          <p style="font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${resetUrl}
          </p>
        `
      };

      await transporter.sendMail(mailOptions);
      
      res.json({ message: 'Password reset email sent successfully' });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Error initiating password reset:', error);
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// Refund user subscription
router.post('/users/:id/refund', async (req: AuthRequest, res) => {
  try {
    // SEC-008 FIX: Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!stripe) {
      return res.status(501).json({ error: 'Payment processing not configured' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'User has no Stripe customer ID' });
    }

    // Get the user's recent charges (last 6 months)
    const sixMonthsAgo = Math.floor(Date.now() / 1000) - (6 * 30 * 24 * 60 * 60);
    const charges = await stripe.charges.list({
      customer: user.stripeCustomerId,
      limit: 10,
      created: { gte: sixMonthsAgo }
    });

    if (charges.data.length === 0) {
      return res.status(404).json({ error: 'No recent charges found for this user' });
    }

    // Get the most recent successful charge
    const latestCharge = charges.data.find(charge => charge.status === 'succeeded' && !charge.refunded);

    if (!latestCharge) {
      return res.status(404).json({ error: 'No refundable charges found' });
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: latestCharge.id,
      reason: 'requested_by_customer',
      metadata: {
        refunded_by: req.userId || 'admin',
        reason: req.body.reason || 'Admin-initiated refund'
      }
    });

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status
      },
      charge: {
        id: latestCharge.id,
        amount: latestCharge.amount / 100,
        currency: latestCharge.currency
      }
    });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      details: error.message
    });
  }
});

// Reset all analytics data
router.delete('/analytics/reset', async (_req, res) => {
  try {
    // Clear all analytics events
    const analyticsResult = await Analytics.deleteMany({});

    // Clear all user sessions (this also clears project time data)
    const sessionsResult = await UserSession.deleteMany({});

    // Clear all activity logs
    const activityLogsResult = await ActivityLog.deleteMany({});

    res.json({
      message: 'Analytics data reset successfully',
      deletedAnalytics: analyticsResult.deletedCount,
      deletedSessions: sessionsResult.deletedCount,
      deletedActivityLogs: activityLogsResult.deletedCount,
      projectTimeDataCleared: true
    });
  } catch (error) {
    console.error('Error resetting analytics:', error);
    res.status(500).json({ error: 'Failed to reset analytics data' });
  }
});

// Reset only project time data
router.delete('/analytics/project-time/reset', async (_req, res) => {
  try {
    // Clear project time breakdown from all active sessions
    const result = await UserSession.updateMany(
      {},
      { 
        $unset: { 
          projectTimeBreakdown: 1,
          currentProjectStartTime: 1
        }
      }
    );
    
    res.json({ 
      message: 'Project time data reset successfully',
      updatedSessions: result.modifiedCount
    });
  } catch (error) {
    console.error('Error resetting project time data:', error);
    res.status(500).json({ error: 'Failed to reset project time data' });
  }
});

// Combined analytics endpoint for admin dashboard
router.get('/analytics/combined', async (req, res) => {
  try {
    const { days = '30', limit = '10' } = req.query;
    const daysInt = parseInt(days as string);
    const limitInt = parseInt(limit as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get overview stats
    const [totalUsers, totalSessions, totalEvents] = await Promise.all([
      User.countDocuments({}),
      UserSession.countDocuments({ startTime: { $gte: startDate } }),
      Analytics.countDocuments({ timestamp: { $gte: startDate } })
    ]);

    // Get session stats with total time
    const sessionStats = await UserSession.aggregate([
      { $match: { startTime: { $gte: startDate } } },
      {
        $addFields: {
          calculatedDuration: {
            $cond: {
              if: { $and: [{ $gt: ['$duration', 0] }] },
              then: '$duration',
              else: {
                $cond: {
                  if: { $and: [{ $ne: ['$lastActivity', null] }, { $gte: ['$lastActivity', '$startTime'] }] },
                  then: {
                    $min: [
                      { $subtract: ['$lastActivity', '$startTime'] },
                      86400000  // Cap at 24 hours (in milliseconds)
                    ]
                  },
                  else: 0  // Default to 0 if no valid lastActivity
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: '$calculatedDuration' },
          avgSessionTime: { $avg: '$calculatedDuration' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get top users with activity and time spent (simplified approach)
    const userSessions = await UserSession.aggregate([
      { $match: { startTime: { $gte: startDate } } },
      {
        $addFields: {
          calculatedDuration: {
            $cond: {
              if: { $and: [{ $gt: ['$duration', 0] }] },
              then: '$duration',
              else: {
                $cond: {
                  if: { $and: [{ $ne: ['$lastActivity', null] }, { $gte: ['$lastActivity', '$startTime'] }] },
                  then: {
                    $min: [
                      { 
                        $subtract: [
                          { $min: ['$lastActivity', { $add: ['$lastActivity', 900000] }] }, // Cap at lastActivity + 15 minutes
                          '$startTime'
                        ]
                      },
                      86400000  // Cap at 24 hours (in milliseconds)
                    ]
                  },
                  else: {
                    $cond: {
                      if: { $eq: ['$isActive', true] },
                      then: {
                        $min: [
                          900000,  // If still active but no lastActivity, assume 15 minutes max
                          { $subtract: [new Date(), '$startTime'] }
                        ]
                      },
                      else: 0
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalTime: { $sum: '$calculatedDuration' },
          sessionCount: { $sum: 1 },
          lastActivity: { $max: '$lastActivity' }
        }
      },
      { $sort: { totalTime: -1 } },
      { $limit: limitInt }
    ]);

    // Get analytics data for these users
    const userAnalytics = await Analytics.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate },
          userId: { $in: userSessions.map(u => u._id.toString()) }
        } 
      },
      {
        $group: {
          _id: '$userId',
          totalEvents: { $sum: 1 },
          projectOpens: { 
            $sum: { $cond: [{ $eq: ['$eventType', 'project_open'] }, 1, 0] } 
          }
        }
      }
    ]);

    // Get user info with proper ObjectId conversion
    const userIds = userSessions.map(u => new mongoose.Types.ObjectId(u._id));
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email planTier')
      .lean();

    // Combine the data
    const topUsers = userSessions.map(session => {
      const user = users.find(u => u._id.toString() === session._id.toString());
      const analytics = userAnalytics.find(a => a._id.toString() === session._id.toString());
      
      return {
        userId: session._id,
        firstName: user?.firstName || 'Unknown',
        lastName: user?.lastName || 'User',
        email: user?.email || 'unknown@email.com',
        planTier: user?.planTier || 'free',
        totalTime: session.totalTime || 0,
        totalEvents: analytics?.totalEvents || 0,
        fieldEdits: analytics?.fieldEdits || 0,
        lastActivity: session.lastActivity
      };
    }).filter(user => user.firstName !== 'Unknown');

    // Get top projects with time spent data (simplified approach)
    const projectTimeData = await UserSession.aggregate([
      {
        $match: {
          startTime: { $gte: startDate },
          projectTimeBreakdown: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$projectTimeBreakdown' },
      {
        $group: {
          _id: '$projectTimeBreakdown.projectId',
          totalTime: { $sum: '$projectTimeBreakdown.timeSpent' },
          uniqueUsers: { $addToSet: '$userId' },
          sessions: { $sum: 1 },
          lastActivity: { $max: '$projectTimeBreakdown.lastSwitchTime' }
        }
      },
      { $sort: { totalTime: -1 } },
      { $limit: limitInt }
    ]);

    // Get project names with proper ObjectId conversion
    const projectIds = projectTimeData.map(p => p._id).filter(id => id);
    const projects = await Project.find({ _id: { $in: projectIds } })
      .select('name')
      .lean();

    // Combine project data
    const topProjects = projectTimeData.map(projectData => {
      const project = projects.find(p => p._id.toString() === projectData._id?.toString());
      
      return {
        projectId: projectData._id,
        projectName: project?.name || `Project ${projectData._id?.toString().slice(-6)}`,
        totalTime: projectData.totalTime || 0,
        uniqueUserCount: projectData.uniqueUsers?.length || 0,
        sessions: projectData.sessions || 0,
        lastActivity: projectData.lastActivity
      };
    }).filter(project => project.projectId);

    // Calculate overview totals
    const overview = {
      totalUsers,
      totalSessions,
      totalEvents,
      avgSessionTime: sessionStats[0]?.avgSessionTime || 0,
      totalTimeSpent: sessionStats[0]?.totalTime || 0
    };

    // Get recent activity from Analytics collection
    const recentActivity = await Analytics.aggregate([
      { 
        $match: { 
          timestamp: { $gte: startDate }
        } 
      },
      {
        $addFields: {
          userObjectId: { $toObjectId: '$userId' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userObjectId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'eventData.projectId',
          foreignField: '_id',
          as: 'project'
        }
      },
      {
        $addFields: {
          user_email: { $arrayElemAt: ['$user.email', 0] },
          user_name: { 
            $concat: [
              { $arrayElemAt: ['$user.firstName', 0] },
              ' ',
              { $arrayElemAt: ['$user.lastName', 0] }
            ]
          },
          project_name: { $arrayElemAt: ['$project.name', 0] }
        }
      },
      {
        $project: {
          timestamp: 1,
          eventType: 1,
          event_type: '$eventType', // For frontend compatibility
          user_id: '$userId',
          user_email: 1,
          user_name: 1,
          project_name: 1,
          eventData: 1
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overview,
      topUsers,
      topProjects,
      recentActivity
    });

  } catch (error) {
    console.error('Error getting combined analytics:', error);
    res.status(500).json({ error: 'Failed to get combined analytics' });
  }
});

// Get user analytics leaderboard
router.get('/analytics/leaderboard', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 20;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all users first
    const allUsers = await User.find({}, { firstName: 1, lastName: 1, email: 1, planTier: 1 }).lean();
    const userMap = new Map();
    allUsers.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    // Get activity data for each user with last activity
    const activityData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalEvents: { $sum: 1 },
          projectOpens: { $sum: { $cond: [{ $eq: ['$eventType', 'project_open'] }, 1, 0] } },
          lastEvent: { $max: '$timestamp' }
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: limit }
    ]);

    // Get session data for each user with last activity
    const sessionData = await UserSession.aggregate([
      {
        $match: {
          startTime: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          totalTime: { 
            $sum: {
              $cond: {
                if: { $gt: ['$duration', 0] },
                then: '$duration',
                else: {
                  $subtract: [
                    { $ifNull: ['$lastActivity', new Date()] },
                    '$startTime'
                  ]
                }
              }
            }
          },
          sessionCount: { $sum: 1 },
          avgSessionTime: { 
            $avg: {
              $cond: {
                if: { $gt: ['$duration', 0] },
                then: '$duration',
                else: {
                  $subtract: [
                    { $ifNull: ['$lastActivity', new Date()] },
                    '$startTime'
                  ]
                }
              }
            }
          },
          lastActivity: { $max: '$lastActivity' }
        }
      },
      { $sort: { totalTime: -1 } },
      { $limit: limit }
    ]);

    // Build activity leaderboard with user info
    const activityLeaderboard = activityData.map(item => {
      const user = userMap.get(item._id);
      return {
        userId: item._id,
        firstName: user?.firstName || 'Unknown',
        lastName: user?.lastName || 'User',
        email: user?.email || 'unknown@email.com',
        planTier: user?.planTier || 'free',
        totalEvents: item.totalEvents,
        fieldEdits: item.fieldEdits,
        projectOpens: item.projectOpens,
        pageViews: item.pageViews,
        lastEvent: item.lastEvent
      };
    }).filter(item => item.firstName !== 'Unknown');

    // Build time leaderboard with user info
    const timeLeaderboard = sessionData.map(item => {
      const user = userMap.get(item._id);
      return {
        userId: item._id,
        firstName: user?.firstName || 'Unknown',
        lastName: user?.lastName || 'User',
        email: user?.email || 'unknown@email.com',
        planTier: user?.planTier || 'free',
        totalTime: item.totalTime || 0,
        sessionCount: item.sessionCount,
        avgSessionTime: item.avgSessionTime || 0,
        lastActivity: item.lastActivity
      };
    }).filter(item => item.firstName !== 'Unknown');

    // Get project activity with last activity
    const projectActivityRaw = await Analytics.aggregate([
      {
        $match: {
          'eventData.projectId': { $exists: true, $ne: null },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventData.projectId',
          totalEvents: { $sum: 1 },
          projectName: { $first: '$eventData.projectName' },
          uniqueUserCount: { $addToSet: '$userId' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          projectId: '$_id',
          totalEvents: 1,
          projectName: 1,
          uniqueUserCount: { $size: '$uniqueUserCount' },
          lastActivity: 1
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 10 }
    ]);

    // Fetch project names for projects that don't have names in analytics
    const projectLeaderboard = await Promise.all(
      projectActivityRaw.map(async (project) => {
        let projectName = project.projectName;
        
        // If projectName is missing or null, try to fetch from database
        if (!projectName || projectName === 'Unknown Project') {
          try {
            const dbProject = await Project.findById(project.projectId).select('name').lean();
            projectName = dbProject?.name || 'Deleted Project';
          } catch (error) {
            projectName = 'Deleted Project';
          }
        }
        
        return {
          ...project,
          projectName
        };
      })
    );

    res.json({
      timeLeaderboard,
      activityLeaderboard,
      projectLeaderboard,
      period: `Last ${days} days`,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch analytics leaderboard' });
  }
});


// Database cleanup endpoints
router.get('/cleanup/stats', async (req, res) => {
  try {
    const stats = await CleanupService.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching cleanup stats:', error);
    res.status(500).json({ error: 'Failed to fetch cleanup stats' });
  }
});

router.get('/cleanup/recommendations', async (req, res) => {
  try {
    const recommendations = await CleanupService.getCleanupRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching cleanup recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch cleanup recommendations' });
  }
});

router.post('/cleanup/run', async (req, res) => {
  try {
    const results = await CleanupService.runCompleteCleanup();
    res.json({
      message: 'Cleanup completed successfully',
      results
    });
  } catch (error) {
    console.error('Error running cleanup:', error);
    res.status(500).json({ error: 'Failed to run cleanup' });
  }
});

// Advanced cleanup endpoints
router.post('/cleanup/orphaned', async (req, res) => {
  try {
    const results = await CleanupService.cleanupOrphanedProjects();
    res.json({
      message: 'Orphaned data cleanup completed',
      results
    });
  } catch (error) {
    console.error('Error cleaning orphaned data:', error);
    res.status(500).json({ error: 'Failed to cleanup orphaned data' });
  }
});

router.post('/cleanup/optimize', async (req, res) => {
  try {
    const results = await CleanupService.optimizeDatabase();
    res.json({
      message: 'Database optimization completed',
      results
    });
  } catch (error) {
    console.error('Error optimizing database:', error);
    res.status(500).json({ error: 'Failed to optimize database' });
  }
});

router.post('/cleanup/emergency', async (req, res) => {
  try {
    const results = await CleanupService.emergencyCleanup();
    res.json({
      message: 'Emergency cleanup completed',
      results
    });
  } catch (error) {
    console.error('Error running emergency cleanup:', error);
    res.status(500).json({ error: 'Failed to run emergency cleanup' });
  }
});

router.post('/cleanup/archive-projects', async (req, res) => {
  try {
    const { daysInactive = 365 } = req.body;
    const results = await CleanupService.archiveOldProjects(daysInactive);
    res.json({
      message: 'Project archiving completed',
      results
    });
  } catch (error) {
    console.error('Error archiving projects:', error);
    res.status(500).json({ error: 'Failed to archive projects' });
  }
});

router.delete('/cleanup/analytics/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 180;
    const results = await CleanupService.cleanupOldAnalytics(days);
    res.json({
      message: `Analytics older than ${days} days cleaned up`,
      results
    });
  } catch (error) {
    console.error('Error cleaning analytics:', error);
    res.status(500).json({ error: 'Failed to cleanup analytics' });
  }
});

router.delete('/cleanup/notifications/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 90;
    const results = await CleanupService.cleanupOldNotifications(days);
    res.json({
      message: `Notifications older than ${days} days cleaned up`,
      results
    });
  } catch (error) {
    console.error('Error cleaning notifications:', error);
    res.status(500).json({ error: 'Failed to cleanup notifications' });
  }
});

router.delete('/cleanup/activity-logs/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 90;
    const results = await CleanupService.cleanupOldActivityLogs(days);
    res.json({
      message: `Activity logs older than ${days} days cleaned up`,
      results
    });
  } catch (error) {
    console.error('Error cleaning activity logs:', error);
    res.status(500).json({ error: 'Failed to cleanup activity logs' });
  }
});

router.delete('/cleanup/inactive-sessions', async (req, res) => {
  try {
    const results = await CleanupService.cleanupInactiveSessions();
    res.json({
      message: 'Inactive sessions cleaned up',
      results
    });
  } catch (error) {
    console.error('Error cleaning inactive sessions:', error);
    res.status(500).json({ error: 'Failed to cleanup inactive sessions' });
  }
});

router.delete('/cleanup/stale-locks', async (req, res) => {
  try {
    const results = await CleanupService.cleanupStaleNoteLocks();
    res.json({
      message: 'Stale note locks cleaned up',
      results
    });
  } catch (error) {
    console.error('Error cleaning stale locks:', error);
    res.status(500).json({ error: 'Failed to cleanup stale locks' });
  }
});

router.delete('/cleanup/rate-limits', async (req, res) => {
  try {
    const results = await CleanupService.cleanupOldRateLimits();
    res.json({
      message: 'Old rate limits cleaned up',
      results
    });
  } catch (error) {
    console.error('Error cleaning rate limits:', error);
    res.status(500).json({ error: 'Failed to cleanup rate limits' });
  }
});

// Performance monitoring endpoints
router.get('/performance/recommendations', async (req, res) => {
  try {
    const recommendations = await CleanupService.getPerformanceRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching performance recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch performance recommendations' });
  }
});

// Lock/Unlock project (Admin only)
router.post('/projects/:id/lock', requireAuth, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const { lock, reason } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.isLocked = lock === true;
    project.lockedReason = lock ? (reason || 'Locked by admin') : undefined;
    await project.save();

    res.json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        isLocked: project.isLocked,
        lockedReason: project.lockedReason
      }
    });
  } catch (error) {
    console.error('Error locking/unlocking project:', error);
    res.status(500).json({ error: 'Failed to update project lock status' });
  }
});

// Get user's projects (Admin only)
router.get('/users/:id/projects', requireAuth, adminMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const projects = await Project.find({
      $or: [{ userId: req.params.id }, { ownerId: req.params.id }]
    })
    .select('_id name description isLocked lockedReason isArchived createdAt updatedAt')
    .sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// =====================
// Admin Analytics Endpoints
// =====================

// Get analytics overview - key metrics for dashboard
router.get('/analytics/overview', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Calculate previous period for comparison
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysInt);

    // Get total users
    const totalUsers = await User.countDocuments();
    const previousUsers = await User.countDocuments({
      createdAt: { $lt: startDate }
    });
    const newUsers = totalUsers - previousUsers;
    const userGrowth = previousUsers > 0 ? ((newUsers / previousUsers) * 100).toFixed(2) : 0;

    // Get MRR (Monthly Recurring Revenue)
    const paidUsers = await User.find({
      planTier: { $in: ['pro', 'premium'] },
      subscriptionStatus: 'active'
    }).select('planTier');

    const mrr = paidUsers.reduce((sum, user) => {
      if (user.planTier === 'pro') return sum + 10; // $10/month
      if (user.planTier === 'premium') return sum + 25; // $25/month
      return sum;
    }, 0);

    // Get active projects
    const activeProjects = await Project.countDocuments({ isArchived: false });
    const previousProjects = await Project.countDocuments({
      isArchived: false,
      createdAt: { $lt: startDate }
    });
    const newProjects = activeProjects - previousProjects;
    const projectGrowth = previousProjects > 0 ? ((newProjects / previousProjects) * 100).toFixed(2) : 0;

    // Get error rate
    const totalEvents = await Analytics.countDocuments({
      timestamp: { $gte: startDate }
    });
    const errorEvents = await Analytics.countDocuments({
      timestamp: { $gte: startDate },
      eventType: 'error_occurred'
    });
    const errorRate = totalEvents > 0 ? ((errorEvents / totalEvents) * 100).toFixed(2) : '0';

    res.json({
      users: {
        total: totalUsers,
        new: newUsers,
        growth: parseFloat(userGrowth as string)
      },
      mrr: {
        current: mrr,
        growth: 0
      },
      projects: {
        total: activeProjects,
        new: newProjects,
        growth: parseFloat(projectGrowth as string)
      },
      errorRate: {
        percentage: parseFloat(errorRate),
        total: errorEvents
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get conversion rate metrics
router.get('/analytics/conversion-rate', async (_req: AuthRequest, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithProjects = await Project.distinct('userId');
    const paidUsers = await User.countDocuments({
      planTier: { $in: ['pro', 'premium'] }
    });

    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(2) : '0';
    const projectCreationRate = totalUsers > 0 ? ((usersWithProjects.length / totalUsers) * 100).toFixed(2) : '0';

    res.json({
      totalUsers,
      usersWithProjects: usersWithProjects.length,
      paidUsers,
      conversionRate: parseFloat(conversionRate),
      projectCreationRate: parseFloat(projectCreationRate)
    });
  } catch (error) {
    console.error('Error fetching conversion rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get feature adoption metrics
router.get('/analytics/features/adoption', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get feature usage events
    const featureUsage = await Analytics.aggregate([
      {
        $match: {
          eventType: 'feature_used',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventData.feature',
          totalUsers: { $addToSet: '$userId' },
          totalUsage: { $sum: 1 }
        }
      },
      {
        $project: {
          feature: '$_id',
          totalUsers: { $size: '$totalUsers' },
          totalUsage: 1,
          _id: 0
        }
      },
      {
        $sort: { totalUsers: -1 }
      }
    ]);

    // Get plan-based breakdown for each feature
    // OPTIMIZED: Calculate all user counts ONCE before the loop (prevents N+1 queries)
    const [totalUsersByPlan, totalUsers] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: '$planTier',
            count: { $sum: 1 }
          }
        }
      ]).then(results => {
        const counts: any = { free: 0, pro: 0, premium: 0 };
        results.forEach((r: any) => {
          if (r._id) counts[r._id] = r.count;
        });
        return counts;
      }),
      User.countDocuments()
    ]);

    const features = await Promise.all(
      featureUsage.map(async (feature) => {
        const byPlan = await Analytics.aggregate([
          {
            $match: {
              eventType: 'feature_used',
              'eventData.feature': feature.feature,
              timestamp: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: '$planTier',
              users: { $addToSet: '$userId' }
            }
          },
          {
            $project: {
              planTier: '$_id',
              users: { $size: '$users' },
              _id: 0
            }
          }
        ]);

        const planBreakdown: any = {};
        byPlan.forEach((plan: any) => {
          const totalPlanUsers = totalUsersByPlan[plan.planTier as 'free' | 'pro' | 'premium'] || 1;
          planBreakdown[plan.planTier] = {
            users: plan.users,
            percentage: ((plan.users / totalPlanUsers) * 100).toFixed(1)
          };
        });

        // FIXED: totalUsers now calculated ONCE outside the loop
        return {
          name: feature.feature,
          totalUsers: feature.totalUsers,
          totalUsage: feature.totalUsage,
          avgUsagePerUser: (feature.totalUsage / feature.totalUsers).toFixed(1),
          adoptionRate: ((feature.totalUsers / totalUsers) * 100).toFixed(1),
          byPlan: planBreakdown
        };
      })
    );

    res.json({ features });
  } catch (error) {
    console.error('Error fetching feature adoption:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get user growth data (for charts)
router.get('/analytics/users/growth', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({ growth: userGrowth });
  } catch (error) {
    console.error('Error fetching user growth:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get combined activity feed (analytics + activity logs)
router.get('/activity/feed', async (req: AuthRequest, res) => {
  try {
    const { limit = '50', hours = '24' } = req.query;
    const limitInt = parseInt(limit as string);
    const hoursInt = parseInt(hours as string);
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursInt);

    // Get recent analytics events
    const analyticsEvents = await Analytics.find({
      timestamp: { $gte: startDate },
      eventType: { $in: ['user_signup', 'user_upgraded', 'user_downgraded', 'project_created', 'error_occurred'] }
    })
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(limitInt / 2)
      .lean();

    // Get recent activity logs
    const activityLogs = await ActivityLog.find({
      timestamp: { $gte: startDate }
    })
      .populate('userId', 'firstName lastName email')
      .populate('projectId', 'name')
      .sort({ timestamp: -1 })
      .limit(limitInt / 2)
      .lean();

    // Combine and sort
    const combined = [
      ...analyticsEvents.map((e: any) => ({
        type: 'analytics',
        eventType: e.eventType,
        timestamp: e.timestamp,
        user: e.userId,
        data: e.eventData,
        category: e.category
      })),
      ...activityLogs.map((l: any) => ({
        type: 'activity',
        action: l.action,
        resourceType: l.resourceType,
        timestamp: l.timestamp,
        user: l.userId,
        project: l.projectId,
        details: l.details
      }))
    ]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limitInt);

    res.json({ feed: combined, period: `Last ${hours} hours` });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Export analytics data as CSV
router.get('/analytics/export', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysInt = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Fetch overview data
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    const totalProjects = await Project.countDocuments();
    const newProjects = await Project.countDocuments({
      createdAt: { $gte: startDate }
    });

    const paidUsers = await User.countDocuments({
      planTier: { $in: ['pro', 'premium'] }
    });

    const usersWithProjects = await User.countDocuments({
      'projects.0': { $exists: true }
    });

    const conversionRate = totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(2) : '0';
    const projectCreationRate = totalUsers > 0 ? ((usersWithProjects / totalUsers) * 100).toFixed(2) : '0';

    // Create CSV content
    const csvLines = [
      'Analytics Export',
      `Generated: ${new Date().toISOString()}`,
      `Period: Last ${days} days`,
      '',
      'Key Metrics',
      'Metric,Value',
      `Total Users,${totalUsers}`,
      `New Users (Period),${newUsers}`,
      `Total Projects,${totalProjects}`,
      `New Projects (Period),${newProjects}`,
      `Paid Users,${paidUsers}`,
      `Users With Projects,${usersWithProjects}`,
      '',
      'Conversion Metrics',
      'Metric,Value',
      `Conversion Rate,${conversionRate}%`,
      `Project Creation Rate,${projectCreationRate}%`,
    ];

    const csv = csvLines.join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

export default router;
