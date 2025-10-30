import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import ProjectInvitation from '../models/ProjectInvitation';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import invitationRoutes from '../routes/invitations';
import { requireAuth } from '../middleware/auth';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);
app.use('/api/invitations', invitationRoutes);

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
    const owner = {
      email: 'owner@test.com',
      password: 'Owner123!',
      firstName: 'Owner',
      lastName: 'User',
      username: 'owneruser'
    };

    await request(app).post('/api/auth/register').send(owner);
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: owner.email, password: owner.password });

    const ownerCookies = ownerLogin.headers['set-cookie'];
    const ownerCookie = Array.isArray(ownerCookies) 
      ? ownerCookies.find((c: string) => c.startsWith('token='))! 
      : ownerCookies;

    // Create project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Cookie', ownerCookie)
      .send({ name: 'Team Project', description: 'Test' });

    expect(projectRes.status).toBe(201);
    const projectId = projectRes.body.project.id;

    // Create member
    const member = {
      email: 'member@test.com',
      password: 'Member123!',
      firstName: 'Member',
      lastName: 'User',
      username: 'memberuser'
    };

    await request(app).post('/api/auth/register').send(member);
    const memberLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: member.email, password: member.password });

    const memberCookies = memberLogin.headers['set-cookie'];
    const memberCookie = Array.isArray(memberCookies) 
      ? memberCookies.find((c: string) => c.startsWith('token='))! 
      : memberCookies;

    // Send invitation
    const inviteRes = await request(app)
      .post(`/api/projects/${projectId}/invite`)
      .set('Cookie', ownerCookie)
      .send({ email: member.email, role: 'editor' });

    expect(inviteRes.status).toBe(200);

    // Get invitation token
    const invitation = await ProjectInvitation.findOne({ 
      projectId,
      inviteeEmail: member.email 
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
