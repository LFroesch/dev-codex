import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

const router = express.Router();

// GET /api/notifications - Get user's notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { limit = 20, skip = 0, unread_only = false } = req.query;

    const query: any = { userId };
    if (unread_only === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('relatedProjectId', 'name color')
      .populate('relatedUserId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip(parseInt(skip as string));

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      total: await Notification.countDocuments(query),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error updating notification' });
  }
});

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// GET /api/notifications/invitation/:invitationId - Get invitation notification details
router.get('/invitation/:invitationId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.userId!;

    const notification = await Notification.findOne({
      userId,
      relatedInvitationId: invitationId,
      type: 'project_invitation',
    })
      .populate('relatedProjectId', 'name description color')
      .populate('relatedInvitationId');

    if (!notification) {
      return res.status(404).json({ message: 'Invitation notification not found' });
    }

    // Mark as read when accessed
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }

    res.json({
      success: true,
      notification,
      invitation: notification.relatedInvitationId,
      project: notification.relatedProjectId,
    });
  } catch (error) {
    console.error('Get invitation notification error:', error);
    res.status(500).json({ message: 'Server error fetching invitation notification' });
  }
});

export default router;