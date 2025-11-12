import request from 'supertest';
import crypto from 'crypto';
import { Project } from '../models/Project';
import ProjectInvitation from '../models/ProjectInvitation';
import TeamMember from '../models/TeamMember';
import invitationRoutes from '../routes/invitations';
import authRoutes from '../routes/auth';
import { createTestApp, createAuthenticatedUser as createAuthUser, createTestProject, expectSuccess } from './utils';

// Create test app using utility
const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/invitations': invitationRoutes
});

// Helper function wrapper for backward compatibility
async function createAuthenticatedUser(email: string, username: string) {
  const { user, authToken } = await createAuthUser(app, { email, username });
  return { user, token: authToken };
}

describe('Invitation Routes', () => {
  describe('GET /api/invitations/pending', () => {
    it('should get pending invitations for authenticated user', async () => {
      const { user, token } = await createAuthenticatedUser('invitee@example.com', 'invitee');
      const { user: inviter } = await createAuthenticatedUser('inviter@example.com', 'inviter');

      // Create a project
      const project = await Project.create({
        name: 'Test Project',
        description: 'Test Description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      // Create an invitation
      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get('/api/invitations/pending')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitations');
      expect(response.body.invitations).toHaveLength(1);
      expect(response.body.invitations[0]).toHaveProperty('token', invitationToken);
      expect(response.body.invitations[0]).toHaveProperty('role', 'editor');
    });

    it('should return empty array if no pending invitations', async () => {
      const { token } = await createAuthenticatedUser('noinvites@example.com', 'noinvites');

      const response = await request(app)
        .get('/api/invitations/pending')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.invitations).toHaveLength(0);
    });

    it('should not return expired invitations', async () => {
      const { user, token } = await createAuthenticatedUser('expired@example.com', 'expired');
      const { user: inviter } = await createAuthenticatedUser('inviter2@example.com', 'inviter2');

      const project = await Project.create({
        name: 'Test Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      // Create expired invitation
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      const response = await request(app)
        .get('/api/invitations/pending')
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.invitations).toHaveLength(0);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/invitations/pending')
        .expect(401);
    });
  });

  describe('POST /api/invitations/:token/accept', () => {
    it('should accept valid invitation', async () => {
      const { user, token } = await createAuthenticatedUser('accepter@example.com', 'accepter');
      const { user: inviter } = await createAuthenticatedUser('projectowner@example.com', 'projectowner');

      const project = await Project.create({
        name: 'Accepting Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Invitation accepted successfully');
      expect(response.body).toHaveProperty('project');
      expect(response.body).toHaveProperty('role', 'editor');

      // Verify team member was created
      const teamMember = await TeamMember.findOne({
        projectId: project._id,
        userId: user._id
      });
      expect(teamMember).toBeTruthy();
      expect(teamMember?.role).toBe('editor');

      // Verify invitation status was updated
      const invitation = await ProjectInvitation.findOne({ token: invitationToken });
      expect(invitation?.status).toBe('accepted');
      expect(invitation?.acceptedAt).toBeTruthy();
    });

    it('should reject invitation for non-invitee', async () => {
      const { user: invitee } = await createAuthenticatedUser('realinvitee@example.com', 'realinvitee');
      const { token: wrongToken } = await createAuthenticatedUser('wronguser@example.com', 'wronguser');
      const { user: inviter } = await createAuthenticatedUser('owner2@example.com', 'owner2');

      const project = await Project.create({
        name: 'Private Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: invitee.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', `token=${wrongToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Cannot accept this invitation');
    });

    it('should reject expired invitation', async () => {
      const { user, token } = await createAuthenticatedUser('late@example.com', 'late');
      const { user: inviter } = await createAuthenticatedUser('owner3@example.com', 'owner3');

      const project = await Project.create({
        name: 'Expired Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', `token=${token}`)
        .expect(404);
    });

    it('should reject if user is already a team member', async () => {
      const { user, token } = await createAuthenticatedUser('already@example.com', 'already');
      const { user: inviter } = await createAuthenticatedUser('owner4@example.com', 'owner4');

      const project = await Project.create({
        name: 'Duplicate Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      // Create existing team membership
      await TeamMember.create({
        projectId: project._id,
        userId: user._id,
        role: 'editor',
        invitedBy: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/accept`)
        .set('Cookie', `token=${token}`)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Already a team member of this project');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/invitations/sometoken/accept')
        .expect(401);
    });
  });

  describe('POST /api/invitations/:token/decline', () => {
    it('should decline valid invitation', async () => {
      const { user, token } = await createAuthenticatedUser('decliner@example.com', 'decliner');
      const { user: inviter } = await createAuthenticatedUser('owner5@example.com', 'owner5');

      const project = await Project.create({
        name: 'Declining Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: user.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/decline`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Invitation declined successfully');

      // Verify invitation status was updated
      const invitation = await ProjectInvitation.findOne({ token: invitationToken });
      expect(invitation?.status).toBe('cancelled');

      // Verify no team member was created
      const teamMember = await TeamMember.findOne({
        projectId: project._id,
        userId: user._id
      });
      expect(teamMember).toBeNull();
    });

    it('should reject declining someone else\'s invitation', async () => {
      const { user: invitee } = await createAuthenticatedUser('target@example.com', 'target');
      const { token: wrongToken } = await createAuthenticatedUser('interloper@example.com', 'interloper');
      const { user: inviter } = await createAuthenticatedUser('owner6@example.com', 'owner6');

      const project = await Project.create({
        name: 'Secure Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: invitee.email,
        role: 'editor',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/decline`)
        .set('Cookie', `token=${wrongToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Cannot decline this invitation');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/invitations/sometoken/decline')
        .expect(401);
    });
  });

  describe('GET /api/invitations/:token', () => {
    it('should get invitation details without authentication', async () => {
      const { user: inviter } = await createAuthenticatedUser('public@example.com', 'public');

      const project = await Project.create({
        name: 'Public Project',
        description: 'Public Description',
        color: '#ff0000',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: 'anyone@example.com',
        role: 'viewer',
        token: invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get(`/api/invitations/${invitationToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitation');
      expect(response.body.invitation).toHaveProperty('projectName', 'Public Project');
      expect(response.body.invitation).toHaveProperty('projectDescription', 'Public Description');
      expect(response.body.invitation).toHaveProperty('projectColor', '#ff0000');
      expect(response.body.invitation).toHaveProperty('role', 'viewer');
      expect(response.body.invitation).toHaveProperty('inviterName');
      expect(response.body.invitation).toHaveProperty('expiresAt');
    });

    it('should return 404 for invalid token', async () => {
      await request(app)
        .get('/api/invitations/invalidtoken123')
        .expect(404);
    });

    it('should return 404 for expired invitation', async () => {
      const { user: inviter } = await createAuthenticatedUser('expired2@example.com', 'expired2');

      const project = await Project.create({
        name: 'Expired Public Project',
        description: 'Test project description',
        ownerId: inviter._id,
        userId: inviter._id
      });

      const invitationToken = crypto.randomBytes(32).toString('hex');
      await ProjectInvitation.create({
        projectId: project._id,
        inviterUserId: inviter._id,
        inviteeEmail: 'someone@example.com',
        role: 'viewer',
        token: invitationToken,
        expiresAt: new Date(Date.now() - 1000) // Expired
      });

      await request(app)
        .get(`/api/invitations/${invitationToken}`)
        .expect(404);
    });
  });
});
