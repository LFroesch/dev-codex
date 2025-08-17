import express from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Ticket } from '../models/Ticket';
import Analytics from '../models/Analytics';
import UserSession from '../models/UserSession';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PLAN_LIMITS } from '../config/planLimits';
import { CleanupService } from '../services/cleanupService';
import nodemailer from 'nodemailer';

const router = express.Router();

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

    const users = await User.find()
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

    const total = await User.countDocuments();
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

    // Active sessions and analytics
    const activeSessions = await UserSession.countDocuments({ isActive: true });
    const activeVisibleSessions = await UserSession.countDocuments({ isActive: true, isVisible: true });
    
    // Recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const recentActivity = await UserSession.countDocuments({ 
      lastActivity: { $gte: twentyFourHoursAgo }
    });

    res.json({
      totalUsers,
      totalProjects,
      activeSubscriptions,
      recentSignups,
      planDistribution: {
        free: freeUsers,
        pro: proUsers,
        enterprise: enterpriseUsers
      },
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

    let filter: any = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    const tickets = await Ticket.find(filter)
      .populate('userId', 'firstName lastName email planTier')
      .populate('adminUserId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ticket.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Get ticket stats
    const stats = {
      open: await Ticket.countDocuments({ status: 'open' }),
      inProgress: await Ticket.countDocuments({ status: 'in_progress' }),
      resolved: await Ticket.countDocuments({ status: 'resolved' }),
      closed: await Ticket.countDocuments({ status: 'closed' })
    };

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
        const supportMailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: 'dev.codex.contact@gmail.com',
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
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a temporary password reset token (you might want to add this to your User model)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Update user with reset token (assuming you add these fields to User model)
    await User.findByIdAndUpdate(req.params.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires
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

// Reset all analytics data
router.delete('/analytics/reset', async (_req, res) => {
  try {
    // Clear all analytics events
    const analyticsResult = await Analytics.deleteMany({});
    
    // Clear all user sessions (this also clears project time data)
    const sessionsResult = await UserSession.deleteMany({});
    
    res.json({ 
      message: 'Analytics data reset successfully',
      deletedAnalytics: analyticsResult.deletedCount,
      deletedSessions: sessionsResult.deletedCount,
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
                $subtract: [
                  { $ifNull: ['$lastActivity', new Date()] },
                  '$startTime'
                ]
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
                $subtract: [
                  { $ifNull: ['$lastActivity', new Date()] },
                  '$startTime'
                ]
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
          fieldEdits: { 
            $sum: { $cond: [{ $eq: ['$eventType', 'field_edit'] }, 1, 0] } 
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

    res.json({
      overview,
      topUsers,
      topProjects,
      recentActivity: [] // Can be populated later if needed
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
          fieldEdits: { $sum: { $cond: [{ $eq: ['$eventType', 'field_edit'] }, 1, 0] } },
          projectOpens: { $sum: { $cond: [{ $eq: ['$eventType', 'project_open'] }, 1, 0] } },
          pageViews: { $sum: { $cond: [{ $eq: ['$eventType', 'page_view'] }, 1, 0] } },
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


export default router;