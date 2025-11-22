import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import Notification from '../models/Notification';
import NotificationService from '../services/notificationService';

const router = express.Router();

// GET /api/notifications - Get user's notifications
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { limit = 20, skip = 0, unread_only = false } = req.query;

    const notificationService = NotificationService.getInstance();
    const result = await notificationService.getNotifications(userId, {
      limit: parseInt(limit as string),
      skip: parseInt(skip as string),
      unreadOnly: unread_only === 'true',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notificationService = NotificationService.getInstance();
    const notification = await notificationService.markAsRead(id, userId);

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
router.patch('/read-all', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get all unread notifications before updating
    const unreadNotifications = await Notification.find({ userId, isRead: false });

    const result = await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    // Emit socket events for each updated notification
    const io = (global as any).io;
    if (io && result.modifiedCount > 0) {
      // Fetch updated notifications with populated fields
      const updatedNotifications = await Notification.find({
        _id: { $in: unreadNotifications.map(n => n._id) }
      })
        .populate('relatedProjectId', 'name color')
        .populate('relatedUserId', 'firstName lastName')
        .populate('relatedInvitationId');

      // Emit update events for each notification
      updatedNotifications.forEach(notification => {
        io.to(`user-${userId}`).emit('notification-updated', notification);
      });
    }

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

// DELETE /api/notifications/clear-all - Clear all notifications
router.delete('/clear-all', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const notificationService = NotificationService.getInstance();
    const deletedCount = await notificationService.clearAllNotifications(userId);

    res.json({
      success: true,
      message: `Cleared ${deletedCount} notifications`,
      deletedCount,
    });
  } catch (error) {
    console.error('Clear all notifications error:', error);
    res.status(500).json({ message: 'Server error clearing notifications' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', requireAuth, blockDemoWrites, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notificationService = NotificationService.getInstance();
    const deleted = await notificationService.deleteNotification(id, userId);

    if (!deleted) {
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