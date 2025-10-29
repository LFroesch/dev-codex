import { TeamHandlers } from '../../services/handlers/TeamHandlers';
import { ParsedCommand, CommandType } from '../../services/commandParser';
import { ResponseType } from '../../services/types';
import { Project } from '../../models/Project';
import { User } from '../../models/User';
import TeamMember from '../../models/TeamMember';
import ProjectInvitation from '../../models/ProjectInvitation';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../models/Project');
jest.mock('../../models/User');
jest.mock('../../models/TeamMember');
jest.mock('../../models/ProjectInvitation');
jest.mock('../../models/Notification');
jest.mock('../../services/ProjectCache');
jest.mock('../../config/logger');
jest.mock('../../services/activityLogger');
jest.mock('../../services/emailService');
jest.mock('../../services/notificationService');

describe('TeamHandlers', () => {
  let handler: TeamHandlers;
  const userId = new mongoose.Types.ObjectId().toString();
  const projectId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  const mockUser: any = {
    _id: new mongoose.Types.ObjectId(userId),
    email: 'owner@example.com',
    firstName: 'Owner',
    lastName: 'User'
  };

  const mockOtherUser: any = {
    _id: new mongoose.Types.ObjectId(otherUserId),
    email: 'member@example.com',
    username: 'testuser',
    firstName: 'Member',
    lastName: 'User'
  };

  const mockProject: any = {
    _id: new mongoose.Types.ObjectId(projectId),
    name: 'Test Project',
    userId: new mongoose.Types.ObjectId(userId),
    teamMembers: [],
    save: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new TeamHandlers(userId);
  });

  describe('handleViewTeam', () => {
    it('should view team members', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const mockMembers = [
        {
          projectId: projectId,
          userId: {
            _id: otherUserId,
            firstName: 'Member',
            lastName: 'User',
            email: 'member@example.com'
          },
          role: 'editor',
          isOwner: false
        }
      ];

      (TeamMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMembers)
        })
      });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_TEAM,
        command: 'view',
        raw: '/view team',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewTeam(parsed, projectId);

      expect(result.type).toBe(ResponseType.DATA);
      expect(result.data.members).toHaveLength(1);
      expect(result.data.members[0].role).toBe('editor');
    });

    it('should show message when no team members', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      (TeamMember.find as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      const parsed: ParsedCommand = {
        type: CommandType.VIEW_TEAM,
        command: 'view',
        raw: '/view team',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleViewTeam(parsed, projectId);

      expect(result.type).toBe(ResponseType.INFO);
      expect(result.message).toContain('No team members');
    });
  });

  describe('handleInviteMember', () => {
    it('should validate email/username is provided', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.INVITE_MEMBER,
        command: 'invite',
        raw: '/invite',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleInviteMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Email or username is required');
    });

    it('should validate role', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue(mockOtherUser);

      const parsed: ParsedCommand = {
        type: CommandType.INVITE_MEMBER,
        command: 'invite',
        raw: '/invite member@example.com',
        args: ['member@example.com'],
        flags: { role: 'invalid-role' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleInviteMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Role must be');
    });

    it('should prevent self-invitation', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const parsed: ParsedCommand = {
        type: CommandType.INVITE_MEMBER,
        command: 'invite',
        raw: '/invite owner@example.com',
        args: ['owner@example.com'],
        flags: { role: 'editor' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleInviteMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Cannot invite yourself');
    });

    it('should check if user is already a member', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProject').mockResolvedValue({ project: mockProject });
      (User.findById as jest.Mock).mockResolvedValue(mockUser);
      (User.findOne as jest.Mock).mockResolvedValue(mockOtherUser);
      (TeamMember.findOne as jest.Mock).mockResolvedValue({ userId: otherUserId });

      const parsed: ParsedCommand = {
        type: CommandType.INVITE_MEMBER,
        command: 'invite',
        raw: '/invite member@example.com',
        args: ['member@example.com'],
        flags: { role: 'editor' },
        isValid: true,
        errors: []
      };

      const result = await handler.handleInviteMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('already a member');
    });
  });

  describe('handleRemoveMember', () => {
    it('should validate member identifier is provided', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_MEMBER,
        command: 'remove',
        raw: '/remove member',
        args: [],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('Email or username is required');
    });

    it('should find and remove member by email', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });
      (User.findOne as jest.Mock).mockResolvedValue(mockOtherUser);
      (TeamMember.findOne as jest.Mock).mockResolvedValue({
        userId: otherUserId,
        projectId: projectId,
        role: 'editor'
      });
      (TeamMember.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_MEMBER,
        command: 'remove',
        raw: '/remove member member@example.com',
        args: ['member@example.com'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.SUCCESS);
      expect(TeamMember.deleteOne).toHaveBeenCalled();
    });

    it('should error when member not found', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_MEMBER,
        command: 'remove',
        raw: '/remove member nonexistent@example.com',
        args: ['nonexistent@example.com'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not found');
    });

    it('should error when user is not a team member', async () => {
      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      jest.spyOn(handler as any, 'resolveProjectWithEditCheck').mockResolvedValue({ project: mockProject });
      (User.findOne as jest.Mock).mockResolvedValue(mockOtherUser);
      (TeamMember.findOne as jest.Mock).mockResolvedValue(null);

      const parsed: ParsedCommand = {
        type: CommandType.REMOVE_MEMBER,
        command: 'remove',
        raw: '/remove member member@example.com',
        args: ['member@example.com'],
        flags: {},
        isValid: true,
        errors: []
      };

      const result = await handler.handleRemoveMember(parsed, projectId);

      expect(result.type).toBe(ResponseType.ERROR);
      expect(result.message).toContain('not a member');
    });
  });
});
