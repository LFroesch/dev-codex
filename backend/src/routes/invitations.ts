import express from 'express';
import mongoose from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } from '../utils/errorHandler';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import Notification from '../models/Notification';
import { User } from '../models/User';
import NotificationService from '../services/notificationService';

const router = express.Router();

// GET /api/invitations/pending - Get user's pending invitations
router.get('/pending', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const userId = req.userId!;
  const user = await User.findById(userId);

  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

    // Get invitations by email and by userId
    const invitations = await ProjectInvitation.find({
      $or: [
        { inviteeEmail: user.email.toLowerCase(), status: 'pending' },
        { inviteeUserId: userId, status: 'pending' }
      ],
      expiresAt: { $gt: new Date() }, // Not expired
    })
      .populate('projectId', 'name description color')
      .populate('inviterUserId', 'firstName lastName username displayPreference email')
      .sort({ createdAt: -1 });

  res.json({
    success: true,
    invitations,
  });
}));

// POST /api/invitations/:token/accept - Accept invitation
router.post('/:token/accept', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { token } = req.params;
  const userId = req.userId!;

  // Find invitation
  const invitation = await ProjectInvitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).populate('projectId').populate('inviterUserId', 'firstName lastName username displayPreference');

  if (!invitation) {
    throw NotFoundError('Invitation not found or expired', 'INVITATION_NOT_FOUND');
  }

  // Verify user can accept this invitation
  const user = await User.findById(userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const canAccept = invitation.inviteeEmail === user.email.toLowerCase() || 
                    invitation.inviteeUserId?.toString() === userId;

  if (!canAccept) {
    throw ForbiddenError('Cannot accept this invitation', 'CANNOT_ACCEPT');
  }

  // Check if user is already a team member
  const existingMember = await TeamMember.findOne({
    projectId: invitation.projectId,
    userId,
  });

  if (existingMember) {
    throw BadRequestError('Already a team member of this project', 'ALREADY_MEMBER');
  }

  // Check if user is the project owner
  const project = invitation.projectId as any;
  if (project.ownerId?.toString() === userId) {
    throw BadRequestError('Cannot accept invitation to own project', 'CANNOT_ACCEPT_OWN_PROJECT');
  }

    // Create team membership
    const teamMember = new TeamMember({
      projectId: invitation.projectId,
      userId,
      role: invitation.role,
      invitedBy: invitation.inviterUserId,
    });

    await teamMember.save();

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    if (!invitation.inviteeUserId) {
      invitation.inviteeUserId = new mongoose.Types.ObjectId(userId);
    }
    await invitation.save();

    // Clear the invitation notification and create acceptance notification
    await Notification.updateMany(
      { relatedInvitationId: invitation._id },
      { isRead: true }
    );

    // Notify inviter of acceptance
    const notificationService = NotificationService.getInstance();
    await notificationService.createNotification({
      userId: invitation.inviterUserId,
      type: 'team_member_added',
      title: 'Invitation Accepted',
      message: `${user.displayPreference === 'username' ? `@${user.username}` : `${user.firstName} ${user.lastName}`} accepted your invitation to "${project.name}"`,
      relatedProjectId: project._id,
      relatedUserId: userId,
    });

  res.json({
    success: true,
    message: 'Invitation accepted successfully',
    project: {
      id: project._id,
      name: project.name,
      description: project.description,
      color: project.color,
    },
    role: invitation.role,
  });
}));

// POST /api/invitations/:token/decline - Decline invitation
router.post('/:token/decline', requireAuth, asyncHandler(async (req: AuthRequest, res: express.Response) => {
  const { token } = req.params;
  const userId = req.userId!;

  // Find invitation
  const invitation = await ProjectInvitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  }).populate('projectId', 'name').populate('inviterUserId', 'firstName lastName username displayPreference');

  if (!invitation) {
    throw NotFoundError('Invitation not found or expired', 'INVITATION_NOT_FOUND');
  }

  // Verify user can decline this invitation
  const user = await User.findById(userId);
  if (!user) {
    throw NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const canDecline = invitation.inviteeEmail === user.email.toLowerCase() || 
                     invitation.inviteeUserId?.toString() === userId;

  if (!canDecline) {
    throw ForbiddenError('Cannot decline this invitation', 'CANNOT_DECLINE');
  }

    // Update invitation status
    invitation.status = 'cancelled';
    await invitation.save();

    // Clear the invitation notification
    await Notification.updateMany(
      { relatedInvitationId: invitation._id },
      { isRead: true }
    );

  res.json({
    success: true,
    message: 'Invitation declined successfully',
  });
}));

// GET /api/invitations/:token - Get invitation details (public, no auth required)
router.get('/:token', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { token } = req.params;

  const invitation = await ProjectInvitation.findOne({
    token,
    status: 'pending',
    expiresAt: { $gt: new Date() },
  })
    .populate('projectId', 'name description color')
    .populate('inviterUserId', 'firstName lastName username displayPreference');

  if (!invitation) {
    throw NotFoundError('Invitation not found or expired', 'INVITATION_NOT_FOUND');
  }

  res.json({
    success: true,
    invitation: {
      id: invitation._id,
      projectName: (invitation.projectId as any).name,
      projectDescription: (invitation.projectId as any).description,
      projectColor: (invitation.projectId as any).color,
      inviterName: (invitation.inviterUserId as any).displayPreference === 'username'
        ? `@${(invitation.inviterUserId as any).username}`
        : `${(invitation.inviterUserId as any).firstName} ${(invitation.inviterUserId as any).lastName}`,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
  });
}));

export default router;