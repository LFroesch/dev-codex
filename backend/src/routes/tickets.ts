import express from 'express';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
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

// Create a new ticket
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { subject, message, category, priority = 'medium' } = req.body;
    const userId = req.userId;

    if (!subject || !message || !category) {
      return res.status(400).json({ error: 'Subject, message, and category are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const ticketId = `TICK-${Date.now()}-${uuidv4().substr(0, 8).toUpperCase()}`;

    const ticket = new Ticket({
      ticketId,
      userId,
      userEmail: user.email,
      subject,
      message,
      category,
      priority
    });

    await ticket.save();

    // Send confirmation email to user and notification to support team
    try {
      const transporter = createTransporter();
      
      // Email to user
      const userMailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: `Support Ticket Created - ${ticketId}`,
        html: `
          <h2>Support Ticket Created</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your support ticket has been successfully created. Our team will review it and get back to you soon.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Ticket ID:</strong> ${ticketId}<br>
            <strong>Subject:</strong> ${subject}<br>
            <strong>Category:</strong> ${category}<br>
            <strong>Priority:</strong> ${priority}
          </div>
          
          <p>Your message:</p>
          <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #007bff;">
            ${message}
          </div>
          
          <p>You can reference this ticket using ID: <strong>${ticketId}</strong></p>
          <p>Thank you for contacting support!</p>
        `
      };

      // Email to support team
      const supportMailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: 'dev.codex.contact@gmail.com',
        subject: `🎫 New Support Ticket - ${ticketId}`,
        html: `
          <h2>🎫 New Support Ticket Created</h2>
          <p>A new support ticket has been submitted.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Ticket ID:</strong> ${ticketId}<br>
            <strong>User:</strong> ${user.firstName} ${user.lastName} (${user.email})<br>
            <strong>Plan:</strong> ${user.planTier}<br>
            <strong>Subject:</strong> ${subject}<br>
            <strong>Category:</strong> ${category}<br>
            <strong>Priority:</strong> ${priority}
          </div>
          
          <p><strong>Message:</strong></p>
          <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #dc3545;">
            ${message}
          </div>
          
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5002'}/admin" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Admin Dashboard</a></p>
        `
      };

      await Promise.all([
        transporter.sendMail(userMailOptions),
        transporter.sendMail(supportMailOptions)
      ]);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: {
        ticketId: ticket.ticketId,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: ticket.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Get user's tickets
router.get('/my-tickets', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const tickets = await Ticket.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const totalTickets = await Ticket.countDocuments({ userId });
    const totalPages = Math.ceil(totalTickets / limit);

    res.json({
      tickets,
      pagination: {
        currentPage: page,
        totalPages,
        totalTickets,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// Get single ticket (user's own ticket only)
router.get('/:ticketId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    const ticket = await Ticket.findOne({ 
      ticketId, 
      userId 
    }).populate('adminUserId', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

export default router;