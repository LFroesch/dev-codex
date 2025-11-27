import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { blockDemoWrites } from '../middleware/blockDemoWrites';
import Notification from '../models/Notification';
import NotificationService from '../services/notificationService';
import { asyncHandler, NotFoundError } from '../utils/errorHandler';

const router = express.Router();

// GET /api/notifications - Get user's notifications
router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const notificationService = NotificationService.getInstance();
  const notification = await notificationService.markAsRead(id, userId);

  if (!notification) {
    throw NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  res.json({
    success: true,
    notification,
  });
}));

// PATCH /api/notifications/read-all - Mark all notifications as read
router.patch('/read-all', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
}));

// DELETE /api/notifications/clear-all - Clear all notifications
router.delete('/clear-all', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const userId = req.userId!;

  const notificationService = NotificationService.getInstance();
  const deletedCount = await notificationService.clearAllNotifications(userId);

  res.json({
    success: true,
    message: `Cleared ${deletedCount} notifications`,
    deletedCount,
  });
}));

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', requireAuth, blockDemoWrites, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const notificationService = NotificationService.getInstance();
  const deleted = await notificationService.deleteNotification(id, userId);

  if (!deleted) {
    throw NotFoundError('Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Notification deleted successfully',
  });
}));

// GET /api/notifications/invitation/:invitationId - Get invitation notification details
router.get('/invitation/:invitationId', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
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
    throw NotFoundError('Invitation notification not found', 'INVITATION_NOTIFICATION_NOT_FOUND');
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
}));

export default router;