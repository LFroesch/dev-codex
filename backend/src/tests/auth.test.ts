import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import authRoutes from '../routes/auth';
import bcrypt from 'bcryptjs';

// Create test app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('firstName', 'John');
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await User.findOne({ email: 'test@example.com' });
      expect(user).toBeTruthy();
      expect(user?.email).toBe('test@example.com');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password must be at least 12 characters');
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid email format');
    });

    it('should reject registration with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!'
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required');
    });

    it('should reject registration with duplicate email', async () => {
      // Create first user
      const userData = {
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user (let the model hash the password)
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!', // Plain password - will be hashed by pre-save hook
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free',
        isEmailVerified: true
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'StrongPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).not.toHaveProperty('password');

      // Check if JWT cookie was set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('token='))).toBe(true);
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'StrongPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });

    it('should reject login with missing credentials', async () => {
      const loginData = {
        email: 'test@example.com'
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Email and password are required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');

      // Check if cookie was cleared
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('token=;'))).toBe(true);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Create and login user to get auth token
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!', // Plain password - will be hashed by pre-save hook
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free',
        isEmailVerified: true
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'StrongPass123!'
        })
        .expect(200);

      // Extract token from cookie
      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
      expect(authToken).toBeTruthy();
    });

    it('should return user data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('firstName', 'John');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Not authenticated');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'token=invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Invalid token');
    });
  });

  describe('GET /api/auth/check-username/:username', () => {
    beforeEach(async () => {
      // Create a user with a known username
      await User.create({
        email: 'existing@example.com',
        password: 'StrongPass123!',
        firstName: 'Existing',
        lastName: 'User',
        username: 'existinguser',
        planTier: 'free'
      });
    });

    it('should return available for new username', async () => {
      const response = await request(app)
        .get('/api/auth/check-username/newuser')
        .expect(200);

      expect(response.body).toHaveProperty('available', true);
      expect(response.body).toHaveProperty('message', 'Username is available');
    });

    it('should return unavailable for existing username', async () => {
      const response = await request(app)
        .get('/api/auth/check-username/existinguser')
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body).toHaveProperty('message', 'Username is already taken');
    });

    it('should reject username with invalid characters', async () => {
      const response = await request(app)
        .get('/api/auth/check-username/invalid-user!')
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body.message).toContain('lowercase letters, numbers, and underscores');
    });

    it('should reject username that is too short', async () => {
      const response = await request(app)
        .get('/api/auth/check-username/ab')
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body.message).toContain('between 3 and 30 characters');
    });

    it('should reject username that is too long', async () => {
      const longUsername = 'a'.repeat(31);
      const response = await request(app)
        .get(`/api/auth/check-username/${longUsername}`)
        .expect(200);

      expect(response.body).toHaveProperty('available', false);
      expect(response.body.message).toContain('between 3 and 30 characters');
    });
  });

  describe('PATCH /api/auth/theme', () => {
    let authToken: string;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should update theme successfully', async () => {
      const response = await request(app)
        .patch('/api/auth/theme')
        .set('Cookie', `token=${authToken}`)
        .send({ theme: 'dark' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Theme updated successfully');
      expect(response.body.user).toHaveProperty('theme', 'dark');
    });

    it('should accept custom themes', async () => {
      const response = await request(app)
        .patch('/api/auth/theme')
        .set('Cookie', `token=${authToken}`)
        .send({ theme: 'custom-123' })
        .expect(200);

      expect(response.body.user).toHaveProperty('theme', 'custom-123');
    });

    it('should reject invalid theme', async () => {
      const response = await request(app)
        .patch('/api/auth/theme')
        .set('Cookie', `token=${authToken}`)
        .send({ theme: 'invalid-theme' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid theme');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/auth/theme')
        .send({ theme: 'dark' })
        .expect(401);
    });
  });

  describe('PATCH /api/auth/update-name', () => {
    let authToken: string;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should update name successfully', async () => {
      const response = await request(app)
        .patch('/api/auth/update-name')
        .set('Cookie', `token=${authToken}`)
        .send({ firstName: 'Jane', lastName: 'Smith' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Name updated successfully');
      expect(response.body.user).toHaveProperty('firstName', 'Jane');
      expect(response.body.user).toHaveProperty('lastName', 'Smith');
    });

    it('should trim whitespace from names', async () => {
      const response = await request(app)
        .patch('/api/auth/update-name')
        .set('Cookie', `token=${authToken}`)
        .send({ firstName: '  Jane  ', lastName: '  Smith  ' })
        .expect(200);

      expect(response.body.user).toHaveProperty('firstName', 'Jane');
      expect(response.body.user).toHaveProperty('lastName', 'Smith');
    });

    it('should reject missing first name', async () => {
      const response = await request(app)
        .patch('/api/auth/update-name')
        .set('Cookie', `token=${authToken}`)
        .send({ lastName: 'Smith' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'First name and last name are required');
    });

    it('should reject missing last name', async () => {
      const response = await request(app)
        .patch('/api/auth/update-name')
        .set('Cookie', `token=${authToken}`)
        .send({ firstName: 'Jane' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'First name and last name are required');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/auth/update-name')
        .send({ firstName: 'Jane', lastName: 'Smith' })
        .expect(401);
    });
  });

  describe('PATCH /api/auth/update-username', () => {
    let authToken: string;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      await User.create({
        email: 'other@example.com',
        password: 'StrongPass123!',
        firstName: 'Other',
        lastName: 'User',
        username: 'takenusername',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should update username successfully', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'newusername' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Username updated successfully');
      expect(response.body.user).toHaveProperty('username', 'newusername');
    });

    it('should convert username to lowercase', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'NewUserName' })
        .expect(200);

      expect(response.body.user).toHaveProperty('username', 'newusername');
    });

    it('should reject taken username', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'takenusername' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Username already taken');
    });

    it('should reject username with invalid characters', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'invalid-user!' })
        .expect(400);

      expect(response.body.message).toContain('lowercase letters, numbers, and underscores');
    });

    it('should reject username that is too short', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({ username: 'ab' })
        .expect(400);

      expect(response.body.message).toContain('between 3 and 30 characters');
    });

    it('should reject missing username', async () => {
      const response = await request(app)
        .patch('/api/auth/update-username')
        .set('Cookie', `token=${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Username is required');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/auth/update-username')
        .send({ username: 'newusername' })
        .expect(401);
    });
  });

  describe('PATCH /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should update bio successfully', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ bio: 'Updated bio text' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.user).toHaveProperty('bio', 'Updated bio text');
    });

    it('should update public profile settings', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({
          isPublic: true,
          publicSlug: 'my-public-profile',
          publicDescription: 'My public description'
        })
        .expect(200);

      expect(response.body.user).toHaveProperty('isPublic', true);
      expect(response.body.user).toHaveProperty('publicSlug', 'my-public-profile');
      expect(response.body.user).toHaveProperty('publicDescription', 'My public description');
    });

    it('should update display preference to username', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ displayPreference: 'username' })
        .expect(200);

      expect(response.body.user).toHaveProperty('displayPreference', 'username');
    });

    it('should update display preference to name', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ displayPreference: 'name' })
        .expect(200);

      expect(response.body.user).toHaveProperty('displayPreference', 'name');
    });

    it('should reject invalid display preference', async () => {
      const response = await request(app)
        .patch('/api/auth/profile')
        .set('Cookie', `token=${authToken}`)
        .send({ displayPreference: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid display preference. Must be "name" or "username"');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/auth/profile')
        .send({ bio: 'Test bio' })
        .expect(401);
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password request for existing email', async () => {
      // Note: This will fail if email service is not configured, which is expected in test env
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      // Should return 501 if email service not configured, or 200 if configured
      expect([200, 501]).toContain(response.status);
    });

    it('should not reveal if email does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      // Should return 501 if email service not configured, or 200 if configured
      // Important: should not return 404 or reveal that email doesn't exist
      expect([200, 501]).toContain(response.status);
    });

    it('should reject password reset with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    it('should reject password reset without email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/custom-themes', () => {
    let authToken: string;

    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should save custom themes', async () => {
      const customThemes = [
        {
          id: 'custom-1',
          name: 'My Theme',
          colors: {
            primary: '#000000',
            secondary: '#111111',
            accent: '#222222',
            neutral: '#333333',
            'base-100': '#ffffff',
            'base-200': '#f0f0f0',
            'base-300': '#e0e0e0',
            info: '#0000ff',
            success: '#00ff00',
            warning: '#ffff00',
            error: '#ff0000'
          }
        }
      ];

      const response = await request(app)
        .post('/api/auth/custom-themes')
        .set('Cookie', `token=${authToken}`)
        .send({ customThemes })
        .expect(200);

      expect(response.body).toHaveProperty('customThemes');
      expect(response.body.customThemes).toHaveLength(1);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/auth/custom-themes')
        .send({ customThemes: [] })
        .expect(401);
    });
  });

  describe('GET /api/auth/custom-themes', () => {
    let authToken: string;

    beforeEach(async () => {
      const customThemes = [
        {
          id: 'custom-1',
          name: 'My Theme',
          colors: {
            primary: '#000000',
            secondary: '#111111',
            accent: '#222222',
            neutral: '#333333',
            'base-100': '#ffffff',
            'base-200': '#f0f0f0',
            'base-300': '#e0e0e0',
            info: '#0000ff',
            success: '#00ff00',
            warning: '#ffff00',
            error: '#ff0000'
          }
        }
      ];

      await User.create({
        email: 'test@example.com',
        password: 'StrongPass123!',
        firstName: 'John',
        lastName: 'Doe',
        username: 'testuser',
        planTier: 'free',
        customThemes
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      authToken = tokenCookie?.split('=')[1].split(';')[0] || '';
    });

    it('should get custom themes', async () => {
      const response = await request(app)
        .get('/api/auth/custom-themes')
        .set('Cookie', `token=${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customThemes');
      expect(response.body.customThemes).toHaveLength(1);
      expect(response.body.customThemes[0]).toHaveProperty('id', 'custom-1');
    });

    it('should return empty array if no custom themes', async () => {
      // Create a new user without custom themes
      await User.create({
        email: 'noThemes@example.com',
        password: 'StrongPass123!',
        firstName: 'No',
        lastName: 'Themes',
        username: 'nothemes',
        planTier: 'free'
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'noThemes@example.com', password: 'StrongPass123!' });

      const cookies = loginResponse.headers['set-cookie'] as unknown as string[];
      const tokenCookie = cookies?.find((cookie: string) => cookie.startsWith('token='));
      const newToken = tokenCookie?.split('=')[1].split(';')[0] || '';

      const response = await request(app)
        .get('/api/auth/custom-themes')
        .set('Cookie', `token=${newToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customThemes');
      expect(response.body.customThemes).toEqual([]);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/auth/custom-themes')
        .expect(401);
    });
  });
});