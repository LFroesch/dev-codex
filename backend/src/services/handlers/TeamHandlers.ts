import { BaseCommandHandler } from './BaseCommandHandler';
import { CommandResponse, ResponseType } from '../types';
import { ParsedCommand, getFlag, getFlagCount } from '../commandParser';
import { User } from '../../models/User';
import TeamMember from '../../models/TeamMember';
import ProjectInvitation from '../../models/ProjectInvitation';
import Notification from '../../models/Notification';
import { sendProjectInvitationEmail } from '../emailService';
import { isValidEmail, isValidRole, parseEmailOrUsername } from '../../utils/validation';
import { logError } from '../../config/logger';
import NotificationService from '../notificationService';
import {
  getProjectOwnerPlanTier,
  calculateTeamMemberExpiration,
  calculateInvitationExpiration,
} from '../../utils/retentionUtils';

/**
 * Handlers for team management and collaboration commands
 */
export class TeamHandlers extends BaseCommandHandler {
  /**
   * Handle /view team command
   */
  async handleViewTeam(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const members = await TeamMember.find({
      projectId: resolution.project._id,
      isActive: true  // Only show active team members
    })
      .populate('userId', 'firstName lastName email')
      .lean();

    if (members.length === 0) {
      return {
        type: ResponseType.INFO,
        message: `👥 No team members in ${resolution.project.name} (you're the owner)`,
        suggestions: ['/invite user@example.com --role=editor']
      };
    }

    return this.buildDataResponse(
      `👥 Team members in ${resolution.project.name} (${members.length})`,
      resolution.project,
      'view_team',
      {
        members: members.map((m: any) => ({
          name: `${m.userId.firstName} ${m.userId.lastName}`,
          email: m.userId.email,
          role: m.role,
          isOwner: m.isOwner || false
        }))
      }
    );
  }

  /**
   * Handle /invite command
   */
  async handleInviteMember(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const emailOrUsername = parsed.args[0];
    if (!emailOrUsername) {
      return {
        type: ResponseType.ERROR,
        message: 'Email or username is required',
        suggestions: ['/invite user@example.com --role=editor @project', '/invite username --role=editor']
      };
    }

    const role = (getFlag(parsed.flags, 'role') as string) || 'editor';
    if (!isValidRole(role)) {
      return {
        type: ResponseType.ERROR,
        message: 'Role must be editor or viewer',
        suggestions: ['/invite user@example.com --role=editor']
      };
    }

    const inviter = await User.findById(this.userId);
    const { type, value } = parseEmailOrUsername(emailOrUsername);

    // Find user by email or username
    const existingUser = type === 'email'
      ? await User.findOne({ email: value })
      : await User.findOne({ username: value });

    // Check self-invitation
    if (inviter && existingUser && inviter._id.toString() === existingUser._id.toString()) {
      return {
        type: ResponseType.ERROR,
        message: 'Cannot invite yourself to the project'
      };
    }

    // Check if already a member (only check active members)
    if (existingUser) {
      const existingMember = await TeamMember.findOne({
        projectId: resolution.project._id,
        userId: existingUser._id,
        isActive: true
      });

      if (existingMember) {
        return {
          type: ResponseType.ERROR,
          message: 'User is already a team member',
          suggestions: ['/view team']
        };
      }

      // Check if owner
      if (resolution.project.ownerId?.toString() === existingUser._id.toString()) {
        return {
          type: ResponseType.ERROR,
          message: 'User is already the project owner'
        };
      }
    }

    // Get invitee email
    const inviteeEmail = existingUser?.email || (type === 'email' ? value : null);

    if (!inviteeEmail) {
      return {
        type: ResponseType.ERROR,
        message: `User "${emailOrUsername}" not found. For new users, use their email address.`,
        suggestions: ['/view team']
      };
    }

    // Check for pending invitation
    const existingInvitation = await ProjectInvitation.findOne({
      projectId: resolution.project._id,
      inviteeEmail: inviteeEmail,
      status: 'pending'
    });

    if (existingInvitation) {
      return {
        type: ResponseType.ERROR,
        message: 'Invitation already sent to this email',
        suggestions: ['/view team']
      };
    }

    // Get plan tier for retention policy
    const planTier = await getProjectOwnerPlanTier(resolution.project._id);

    // Create invitation with plan-aware retention
    const invitation = new ProjectInvitation({
      projectId: resolution.project._id,
      inviterUserId: this.userId,
      inviteeEmail: inviteeEmail,
      inviteeUserId: existingUser?._id,
      role,
      token: require('crypto').randomBytes(32).toString('hex'),
      planTier,
      // Don't set deletionExpiresAt yet - will be set when status changes
    });

    await invitation.save();

    // Create notification if user exists
    if (existingUser) {
      const notificationService = NotificationService.getInstance();
      await notificationService.createNotification({
        userId: existingUser._id,
        type: 'project_invitation',
        title: 'Project Invitation',
        message: `${inviter?.firstName} ${inviter?.lastName} invited you to collaborate on "${resolution.project.name}"`,
        actionUrl: `/notifications/invitation/${invitation._id}`,
        relatedProjectId: resolution.project._id,
        relatedInvitationId: invitation._id
      });
    }

    // Send email
    try {
      const inviterName = `${inviter?.firstName || ''} ${inviter?.lastName || ''}`.trim() || 'Someone';
      await sendProjectInvitationEmail(
        inviteeEmail,
        inviterName,
        resolution.project.name,
        invitation.token,
        role
      );
    } catch (emailError) {
      logError('Failed to send invitation email', emailError as Error);
    }

    // Mark project as shared
    const wasShared = resolution.project.isShared;
    if (!resolution.project.isShared) {
      resolution.project.isShared = true;
      await resolution.project.save();
    }

    const sharedMessage = wasShared ? '' : ' (Project is now shared)';
    return this.buildSuccessResponse(
      `📧 Invitation sent to ${emailOrUsername} as ${role}${sharedMessage}`,
      resolution.project,
      'invite_member'
    );
  }

  /**
   * Handle /remove member command
   */
  async handleRemoveMember(parsed: ParsedCommand, currentProjectId?: string): Promise<CommandResponse> {
    const resolution = await this.resolveProject(parsed.projectMention, currentProjectId);
    if (!resolution.project) {
      return this.buildProjectErrorResponse(resolution);
    }

    const emailOrUsername = parsed.args[0];
    if (!emailOrUsername) {
      return {
        type: ResponseType.ERROR,
        message: 'Email or username is required',
        suggestions: ['/remove member user@example.com', '/kick username']
      };
    }

    const { type, value } = parseEmailOrUsername(emailOrUsername);

    // Find user
    const userToRemove = type === 'email'
      ? await User.findOne({ email: value })
      : await User.findOne({ username: value });

    if (!userToRemove) {
      return {
        type: ResponseType.ERROR,
        message: `User "${emailOrUsername}" not found`,
        suggestions: ['/view team']
      };
    }

    // Check if owner
    if (resolution.project.ownerId?.toString() === userToRemove._id.toString() ||
        resolution.project.userId?.toString() === userToRemove._id.toString()) {
      return {
        type: ResponseType.ERROR,
        message: 'Cannot remove the project owner'
      };
    }

    // Find and remove team member (only active members)
    const teamMember = await TeamMember.findOne({
      projectId: resolution.project._id,
      userId: userToRemove._id,
      isActive: true
    });

    if (!teamMember) {
      return {
        type: ResponseType.ERROR,
        message: `${emailOrUsername} is not a member of this project`,
        suggestions: ['/view team']
      };
    }

    // Soft delete the team member with plan-aware retention
    const planTier = await getProjectOwnerPlanTier(resolution.project._id);
    const removedAt = new Date();
    const expiresAt = calculateTeamMemberExpiration(planTier, removedAt);

    await TeamMember.findByIdAndUpdate(teamMember._id, {
      isActive: false,
      removedAt,
      removalReason: 'removed_by_owner',
      expiresAt,
    });

    // Create notification
    const notificationService = NotificationService.getInstance();
    await notificationService.createNotification({
      userId: userToRemove._id,
      type: 'team_member_removed',
      title: 'Removed from Project',
      message: `You have been removed from the project "${resolution.project.name}"`,
      relatedProjectId: resolution.project._id
    });

    // Check remaining active members
    const remainingMembers = await TeamMember.countDocuments({
      projectId: resolution.project._id,
      isActive: true
    });

    if (remainingMembers === 0) {
      resolution.project.isShared = false;
      await resolution.project.save();
    }

    return this.buildSuccessResponse(
      `🗑️ Removed ${emailOrUsername} from ${resolution.project.name}`,
      resolution.project,
      'remove_member'
    );
  }
}
