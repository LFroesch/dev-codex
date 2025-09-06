import { BaseApiService } from './base';
import type { TeamMember, ProjectInvitation, InviteUserData } from './types';

class TeamService extends BaseApiService {
  constructor() {
    super('/projects');
  }

  async getMembers(projectId: string): Promise<{ success: boolean; members: TeamMember[] }> {
    return this.get(`/${projectId}/members`);
  }

  async inviteUser(projectId: string, data: InviteUserData): Promise<{ success: boolean; message: string; invitation: any }> {
    return this.post(`/${projectId}/invite`, data);
  }

  async removeMember(projectId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.delete(`/${projectId}/members/${userId}`);
  }

  async updateMemberRole(projectId: string, userId: string, role: 'editor' | 'viewer'): Promise<{ success: boolean; message: string; member: TeamMember }> {
    return this.patch(`/${projectId}/members/${userId}`, { role });
  }
}

class InvitationService extends BaseApiService {
  constructor() {
    super('/invitations');
  }

  async getPending(): Promise<{ success: boolean; invitations: ProjectInvitation[] }> {
    return this.get('/pending');
  }

  async acceptInvitation(token: string): Promise<{ success: boolean; message: string; project: any; role: string }> {
    return this.post(`/${token}/accept`);
  }

  async declineInvitation(token: string): Promise<{ success: boolean; message: string }> {
    return this.post(`/${token}/decline`);
  }

  async getDetails(token: string): Promise<{ success: boolean; invitation: any }> {
    return this.get(`/${token}`);
  }
}

export const teamAPI = new TeamService();
export const invitationAPI = new InvitationService();