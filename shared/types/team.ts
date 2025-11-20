export interface BaseTeamMember {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  role: 'owner' | 'editor' | 'viewer';
  invitedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  joinedAt: string;
  isOwner?: boolean;
}

export interface BaseProjectInvitation {
  _id: string;
  projectId: {
    _id: string;
    name: string;
    description: string;
    color: string;
  };
  inviterUserId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  inviteeEmail: string;
  role: 'editor' | 'viewer';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface BaseNotification {
  _id: string;
  userId: string;
  type: 'project_invitation' | 'project_shared' | 'team_member_added' | 'team_member_removed' | 'todo_assigned' | 'todo_due_soon' | 'todo_overdue' | 'subtask_completed' | 'stale_items_summary' | 'daily_todo_summary' | 'post_like' | 'comment_on_project' | 'reply_to_comment' | 'project_favorited' | 'project_followed' | 'new_follower' | 'user_post' | 'project_update' | 'admin_message';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  relatedProjectId?: {
    _id: string;
    name: string;
    color: string;
  };
  relatedInvitationId?: string;
  relatedUserId?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  relatedTodoId?: string;
  relatedCommentId?: string;
  relatedPostId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface InviteUserData {
  email: string;
  role: 'editor' | 'viewer';
}