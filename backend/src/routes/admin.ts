import express from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Ticket } from '../models/Ticket';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PLAN_LIMITS } from '../config/planLimits';
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
    const usersWithProjectCounts = await Promise.all(
      users.map(async (user) => {
        const projectCount = await Project.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          projectCount
        };
      })
    );

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

export default router;