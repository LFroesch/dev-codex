import request from 'supertest';
import { User } from '../models/User';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import invitationRoutes from '../routes/invitations';
import { requireAuth } from '../middleware/auth';
import { createTestApp, createAuthenticatedUser } from './utils';

const app = createTestApp({
  '/api/auth': authRoutes,
  '/api/projects': [requireAuth, projectRoutes],
  '/api/invitations': invitationRoutes
});

describe('Integration: Team Collaboration', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await ProjectInvitation.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await ProjectInvitation.deleteMany({});
  });

  it('should handle team invitation workflow', async () => {
    // Create owner
    const { user: ownerUser, authToken: ownerToken } = await createAuthenticatedUser(app, {
      email: 'owner@test.com',
      username: 'owneruser'
    });
    const ownerCookie = `token=${ownerToken}`;

    // Create project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Team Project', description: 'Test' });

    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.project.id;

    // Create member
    const { user: memberUser, authToken: memberToken } = await createAuthenticatedUser(app, {
      email: 'member@test.com',
      username: 'memberuser'
    });
    const memberCookie = `token=${memberToken}`;

    // Send invitation
    const inviteRes = await request(app)
      .post(`/api/projects/${projectId}/invite`)
      .set('Cookie', ownerCookie)
      .send({ email: memberUser.email, role: 'editor' });

    expect(inviteRes.status).toBe(200);

    // Get invitation token
    const invitation = await ProjectInvitation.findOne({
      projectId,
      inviteeEmail: memberUser.email
    });
    
    expect(invitation).toBeTruthy();

    // Accept invitation
    const acceptRes = await request(app)
      .post(`/api/invitations/${invitation!.token}/accept`)
      .set('Cookie', memberCookie);

    expect(acceptRes.status).toBe(200);

    // Member can now access project
    const accessRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', memberCookie);

    expect(accessRes.status).toBe(200);
  });
});
