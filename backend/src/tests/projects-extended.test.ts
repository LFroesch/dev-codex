import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import TeamMember from '../models/TeamMember';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import { requireAuth } from '../middleware/auth';

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);

// Helper function
async function createAuthenticatedUser(email: string, username: string) {
  const user = await User.create({
    email,
    password: 'StrongPass123!',
    firstName: 'Test',
    lastName: 'User',
    username,
    planTier: 'free'
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'StrongPass123!' });

  const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
  const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
  const token = tokenCookie?.split('=')[1].split(';')[0] || '';

  return { user, token };
}

describe('Project Extended Features', () => {
  describe('Todo Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('todo@example.com', 'todouser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Todo Project',
        description: 'Test project for todos',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should create a todo', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/todos`)
        .set('Cookie', `token=${token}`)
        .send({
          text: 'Test Todo',
          description: 'Test Description',
          status: 'not_started',
          priority: 'high'
        })
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.todos).toHaveLength(1);
      expect(response.body.project.todos[0]).toHaveProperty('title', 'Test Todo');
      expect(response.body.project.todos[0]).toHaveProperty('priority', 'high');
    });

    it('should update a todo', async () => {
      const todoResponse = await request(app)
        .post(`/api/projects/${project._id}/todos`)
        .set('Cookie', `token=${token}`)
        .send({ text: 'Original Todo', status: 'not_started' });

      const todoId = todoResponse.body.project.todos[0].id;

      const response = await request(app)
        .put(`/api/projects/${project._id}/todos/${todoId}`)
        .set('Cookie', `token=${token}`)
        .send({
          text: 'Updated Todo',
          status: 'completed',
          completed: true
        })
        .expect(200);

      expect(response.body.project.todos[0]).toHaveProperty('title', 'Updated Todo');
      expect(response.body.project.todos[0]).toHaveProperty('status', 'completed');
      expect(response.body.project.todos[0]).toHaveProperty('completed', true);
    });

    it('should delete a todo', async () => {
      const todoResponse = await request(app)
        .post(`/api/projects/${project._id}/todos`)
        .set('Cookie', `token=${token}`)
        .send({ text: 'To Delete', status: 'not_started' });

      const todoId = todoResponse.body.project.todos[0].id;

      const response = await request(app)
        .delete(`/api/projects/${project._id}/todos/${todoId}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.todos).toHaveLength(0);
    });

    it('should require authentication for todo operations', async () => {
      await request(app)
        .post(`/api/projects/${project._id}/todos`)
        .send({ text: 'Unauthorized', status: 'not_started' })
        .expect(401);
    });
  });

  describe('Notes Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('notes@example.com', 'notesuser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Notes Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should create a note', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/notes`)
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Test Note',
          content: 'Note content here'
        })
        .expect(200);

      expect(response.body).toHaveProperty('project');
      expect(response.body.project.notes).toHaveLength(1);
      expect(response.body.project.notes[0]).toHaveProperty('title', 'Test Note');
    });

    it('should update a note', async () => {
      const noteResponse = await request(app)
        .post(`/api/projects/${project._id}/notes`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'Original', content: 'Original content' });

      const noteId = noteResponse.body.project.notes[0].id;

      const response = await request(app)
        .put(`/api/projects/${project._id}/notes/${noteId}`)
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Updated Note',
          content: 'Updated content'
        })
        .expect(200);

      expect(response.body.project.notes[0]).toHaveProperty('title', 'Updated Note');
      expect(response.body.project.notes[0]).toHaveProperty('content', 'Updated content');
    });

    it('should delete a note', async () => {
      const noteResponse = await request(app)
        .post(`/api/projects/${project._id}/notes`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'To Delete', content: 'Will be deleted' });

      const noteId = noteResponse.body.project.notes[0].id;

      const response = await request(app)
        .delete(`/api/projects/${project._id}/notes/${noteId}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.notes).toHaveLength(0);
    });
  });

  describe('Technologies Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('tech@example.com', 'techuser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Tech Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should add a technology', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/technologies`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'frontend',
          name: 'React',
          version: '18.0.0'
        })
        .expect(200);

      expect(response.body.project.technologies.frontend).toBeDefined();
      expect(response.body.project.technologies.frontend).toHaveLength(1);
      expect(response.body.project.technologies.frontend[0]).toHaveProperty('name', 'React');
    });

    it('should delete a technology', async () => {
      await request(app)
        .post(`/api/projects/${project._id}/technologies`)
        .set('Cookie', `token=${token}`)
        .send({ category: 'frontend', name: 'Vue' });

      const response = await request(app)
        .delete(`/api/projects/${project._id}/technologies/frontend/Vue`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.technologies.frontend || []).toHaveLength(0);
    });

    it('should update a technology', async () => {
      await request(app)
        .post(`/api/projects/${project._id}/technologies`)
        .set('Cookie', `token=${token}`)
        .send({ category: 'backend', name: 'Node.js', version: '14.0.0' });

      const response = await request(app)
        .put(`/api/projects/${project._id}/technologies/backend/Node.js`)
        .set('Cookie', `token=${token}`)
        .send({ version: '20.0.0' })
        .expect(200);

      const nodeTech = response.body.project.technologies.backend.find((t: any) => t.name === 'Node.js');
      expect(nodeTech).toHaveProperty('version', '20.0.0');
    });
  });

  describe('Packages Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('pkg@example.com', 'pkguser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Package Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should add a package', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/packages`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'dependencies',
          name: 'express',
          version: '4.18.0'
        })
        .expect(200);

      expect(response.body.project.packages.dependencies).toBeDefined();
      expect(response.body.project.packages.dependencies).toHaveLength(1);
    });

    it('should delete a package', async () => {
      await request(app)
        .post(`/api/projects/${project._id}/packages`)
        .set('Cookie', `token=${token}`)
        .send({ category: 'dependencies', name: 'lodash' });

      const response = await request(app)
        .delete(`/api/projects/${project._id}/packages/dependencies/lodash`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.packages.dependencies || []).toHaveLength(0);
    });
  });

  describe('Devlog Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('devlog@example.com', 'devloguser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Devlog Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should create a devlog entry', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/devlog`)
        .set('Cookie', `token=${token}`)
        .send({
          title: 'Day 1',
          description: 'Started the project'
        })
        .expect(200);

      expect(response.body.entry).toHaveProperty('title', 'Day 1');
    });

    it('should update a devlog entry', async () => {
      const entryResponse = await request(app)
        .post(`/api/projects/${project._id}/devlog`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'Original', description: 'Original content' });

      const entryId = entryResponse.body.entry.id;

      const response = await request(app)
        .put(`/api/projects/${project._id}/devlog/${entryId}`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'Updated', description: 'Updated content' })
        .expect(200);

      expect(response.body.project.devlog[0]).toHaveProperty('title', 'Updated');
    });

    it('should delete a devlog entry', async () => {
      const entryResponse = await request(app)
        .post(`/api/projects/${project._id}/devlog`)
        .set('Cookie', `token=${token}`)
        .send({ title: 'To Delete', description: 'Will be deleted' });

      const entryId = entryResponse.body.entry.id;

      const response = await request(app)
        .delete(`/api/projects/${project._id}/devlog/${entryId}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.devlog).toHaveLength(0);
    });
  });

  describe('Components Management', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('comp@example.com', 'compuser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Component Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id
      });
    });

    it('should create a component', async () => {
      const response = await request(app)
        .post(`/api/projects/${project._id}/components`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'backend',
          type: 'service',
          title: 'UserService',
          content: 'Handles user operations',
          feature: 'Authentication'
        })
        .expect(200);

      expect(response.body.project.components).toHaveLength(1);
      expect(response.body.project.components[0]).toHaveProperty('title', 'UserService');
      expect(response.body.project.components[0]).toHaveProperty('type', 'service');
    });

    it('should update a component', async () => {
      const compResponse = await request(app)
        .post(`/api/projects/${project._id}/components`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'backend',
          type: 'service',
          title: 'OldName',
          content: 'Old content',
          feature: 'Feature1'
        });

      const componentId = compResponse.body.project.components[0].id;

      const response = await request(app)
        .put(`/api/projects/${project._id}/components/${componentId}`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'backend',
          type: 'service',
          title: 'NewName',
          content: 'Updated',
          feature: 'Feature1'
        })
        .expect(200);

      expect(response.body.project.components[0]).toHaveProperty('title', 'NewName');
    });

    it('should delete a component', async () => {
      const compResponse = await request(app)
        .post(`/api/projects/${project._id}/components`)
        .set('Cookie', `token=${token}`)
        .send({
          category: 'backend',
          type: 'component',
          title: 'ToDelete',
          content: 'Will be deleted',
          feature: 'ToDelete'
        });

      const componentId = compResponse.body.project.components[0].id;

      const response = await request(app)
        .delete(`/api/projects/${project._id}/components/${componentId}`)
        .set('Cookie', `token=${token}`)
        .expect(200);

      expect(response.body.project.components).toHaveLength(0);
    });
  });

  describe('Team Member Management', () => {
    let owner: any, ownerToken: string, project: any, member: any;

    beforeEach(async () => {
      const ownerAuth = await createAuthenticatedUser('owner@example.com', 'owner');
      owner = ownerAuth.user;
      ownerToken = ownerAuth.token;

      const memberAuth = await createAuthenticatedUser('member@example.com', 'member');
      member = memberAuth.user;

      project = await Project.create({
        name: 'Team Project',
        description: 'Test project description',
        ownerId: owner._id,
        userId: owner._id
      });

      // Add member to team
      await TeamMember.create({
        projectId: project._id,
        userId: member._id,
        role: 'editor',
        invitedBy: owner._id
      });
    });

    it('should get team members', async () => {
      const response = await request(app)
        .get(`/api/projects/${project._id}/members`)
        .set('Cookie', `token=${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('members');
      expect(response.body.members.length).toBeGreaterThan(0);
    });

    it('should remove a team member', async () => {
      const response = await request(app)
        .delete(`/api/projects/${project._id}/members/${member._id}`)
        .set('Cookie', `token=${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify member was removed
      const membersResponse = await request(app)
        .get(`/api/projects/${project._id}/members`)
        .set('Cookie', `token=${ownerToken}`)
        .expect(200);

      const removedMember = membersResponse.body.members.find((m: any) => m.userId._id === member._id.toString());
      expect(removedMember).toBeUndefined();
    });

    it('should update member role', async () => {
      const response = await request(app)
        .patch(`/api/projects/${project._id}/members/${member._id}`)
        .set('Cookie', `token=${ownerToken}`)
        .send({ role: 'manager' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('role', 'manager');
    });
  });

  describe('Archive/Restore Functionality', () => {
    let user: any, token: string, project: any;

    beforeEach(async () => {
      const auth = await createAuthenticatedUser('archive@example.com', 'archiveuser');
      user = auth.user;
      token = auth.token;

      project = await Project.create({
        name: 'Archive Project',
        description: 'Test project description',
        ownerId: user._id,
        userId: user._id,
        isArchived: false
      });
    });

    it('should archive a project', async () => {
      const response = await request(app)
        .patch(`/api/projects/${project._id}/archive`)
        .set('Cookie', `token=${token}`)
        .send({ isArchived: true })
        .expect(200);

      expect(response.body.project).toHaveProperty('isArchived', true);
      expect(response.body).toHaveProperty('message', 'Project archived successfully');
    });

    it('should restore an archived project', async () => {
      // First archive it
      await request(app)
        .patch(`/api/projects/${project._id}/archive`)
        .set('Cookie', `token=${token}`)
        .send({ isArchived: true });

      // Then restore it
      const response = await request(app)
        .patch(`/api/projects/${project._id}/archive`)
        .set('Cookie', `token=${token}`)
        .send({ isArchived: false })
        .expect(200);

      expect(response.body.project).toHaveProperty('isArchived', false);
      expect(response.body).toHaveProperty('message', 'Project restored successfully');
    });
  });
});
