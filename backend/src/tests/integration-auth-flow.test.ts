import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import { Project } from '../models/Project';
import authRoutes from '../routes/auth';
import projectRoutes from '../routes/projects';
import { requireAuth } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// Create test app with full middleware stack
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireAuth, projectRoutes);

describe('Integration: Complete Auth Flow', () => {
  let testUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  };

  beforeAll(() => {
    testUser = {
      email: 'integration@test.com',
      password: 'IntegrationTest123!',
      firstName: 'Integration',
      lastName: 'Test'
    };
  });

  beforeEach(async () => {
    // Clean up database before each test
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  describe('Complete User Journey: Register → Login → Create Project → Access Project', () => {
    it('should allow full user workflow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user.email).toBe(testUser.email);

      // Verify user was created in database
      const createdUser = await User.findOne({ email: testUser.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser?.firstName).toBe(testUser.firstName);
      
      // Step 2: Login with created user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.user.email).toBe(testUser.email);

      // Extract auth token from cookies
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const authCookie = Array.isArray(cookies) 
        ? cookies.find((cookie: string) => cookie.startsWith('token='))
        : cookies;
      expect(authCookie).toBeDefined();

      // Step 3: Create project using auth token
      const projectData = {
        name: 'Integration Test Project',
        description: 'A project created during integration testing',
        category: 'web-development'
      };

      const createProjectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', authCookie!)
        .send(projectData);

      expect(createProjectResponse.status).toBe(201);
      expect(createProjectResponse.body.success).toBe(true);
      expect(createProjectResponse.body.project.title).toBe(projectData.name);

      const projectId = createProjectResponse.body.project._id;

      // Verify project was created in database
      const createdProject = await Project.findById(projectId);
      expect(createdProject).toBeTruthy();
      expect(createdProject?.name).toBe(projectData.name);
      expect(createdProject?.ownerId.toString()).toBe(createdUser?._id.toString());

      // Step 4: Access created project
      const getProjectResponse = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', authCookie!);

      expect(getProjectResponse.status).toBe(200);
      expect(getProjectResponse.body.success).toBe(true);
      expect(getProjectResponse.body.project.title).toBe(projectData.name);

      // Step 5: Update project
      const updateData = {
        title: 'Updated Integration Test Project',
        description: 'Updated during integration testing'
      };

      const updateProjectResponse = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Cookie', authCookie!)
        .send(updateData);

      expect(updateProjectResponse.status).toBe(200);
      expect(updateProjectResponse.body.success).toBe(true);
      expect(updateProjectResponse.body.project.title).toBe(updateData.title);

      // Step 6: Get user's projects list
      const getProjectsResponse = await request(app)
        .get('/api/projects')
        .set('Cookie', authCookie!);

      expect(getProjectsResponse.status).toBe(200);
      expect(getProjectsResponse.body.success).toBe(true);
      expect(getProjectsResponse.body.projects).toHaveLength(1);
      expect(getProjectsResponse.body.projects[0].title).toBe(updateData.title);

      // Step 7: Delete project
      const deleteProjectResponse = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Cookie', authCookie!);

      expect(deleteProjectResponse.status).toBe(200);
      expect(deleteProjectResponse.body.success).toBe(true);

      // Verify project was deleted
      const deletedProject = await Project.findById(projectId);
      expect(deletedProject).toBeNull();

      // Step 8: Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie!);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);

      // Step 9: Verify logout worked - should not be able to access protected route
      const protectedResponse = await request(app)
        .get('/api/projects')
        .set('Cookie', authCookie!);

      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Authentication Security Flow', () => {
    it('should prevent access without authentication', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('authenticated');
    });

    it('should prevent access with invalid token', async () => {
      const response = await request(app)
        .get('/api/projects')
        .set('Cookie', 'token=invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should prevent duplicate user registration', async () => {
      // Register user first time
      const firstRegister = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(firstRegister.status).toBe(201);

      // Try to register same user again
      const duplicateRegister = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(duplicateRegister.status).toBe(400);
      expect(duplicateRegister.body.message).toContain('already exists');
    });

    it('should prevent login with wrong password', async () => {
      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Try to login with wrong password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        });

      expect(loginResponse.status).toBe(401);
      expect(loginResponse.body.message).toContain('Invalid credentials');
    });

    it('should prevent access to other users projects', async () => {
      // Create first user and project
      const firstUser = { ...testUser, email: 'first@test.com' };
      const firstRegister = await request(app)
        .post('/api/auth/register')
        .send(firstUser);
      
      const firstLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: firstUser.email, password: firstUser.password });
      
      const firstCookies = firstLogin.headers['set-cookie'];
      const firstCookie = Array.isArray(firstCookies) 
        ? firstCookies.find((cookie: string) => cookie.startsWith('token='))
        : firstCookies;

      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', firstCookie!)
        .send({ name: 'First User Project', description: 'Private project' });

      const projectId = projectResponse.body.project._id;

      // Create second user
      const secondUser = { ...testUser, email: 'second@test.com' };
      await request(app)
        .post('/api/auth/register')
        .send(secondUser);
      
      const secondLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: secondUser.email, password: secondUser.password });
      
      const secondCookies = secondLogin.headers['set-cookie'];
      const secondCookie = Array.isArray(secondCookies) 
        ? secondCookies.find((cookie: string) => cookie.startsWith('token='))
        : secondCookies;

      // Try to access first user's project with second user's token
      const accessResponse = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', secondCookie!);

      expect(accessResponse.status).toBe(404); // Should not find project for different user
    });
  });

  describe('Password Security', () => {
    it('should hash passwords in database', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      const user = await User.findOne({ email: testUser.email });
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(testUser.password);
      
      // Verify password can be compared
      if (user?.password) {
        const isValidPassword = await bcrypt.compare(testUser.password, user.password);
        expect(isValidPassword).toBe(true);
      }
    });

    it('should not return password in API responses', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(registerResponse.body.user.password).toBeUndefined();

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(loginResponse.body.user.password).toBeUndefined();
    });
  });
});