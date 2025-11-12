import request from 'supertest';
import { Express } from 'express';
import { User } from '../../models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export interface TestUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  planTier?: 'free' | 'pro' | 'premium';
  isAdmin?: boolean;
  isEmailVerified?: boolean;
}

export interface AuthenticatedTestUser {
  user: any;
  userId: string;
  authToken: string;
}

/**
 * Default test user data
 */
export const defaultUserData: TestUserData = {
  email: 'test@example.com',
  password: 'StrongPass123!',
  firstName: 'Test',
  lastName: 'User',
  username: 'testuser',
  planTier: 'free',
  isEmailVerified: true
};

/**
 * Creates a test user in the database and returns auth token
 * Note: Does NOT require auth routes to be mounted in the app
 */
export async function createAuthenticatedUser(
  app: Express,
  userData: Partial<TestUserData> = {}
): Promise<AuthenticatedTestUser> {
  const fullUserData = { ...defaultUserData, ...userData };

  // Create user (password will be hashed by pre-save hook)
  const user = await User.create(fullUserData);
  const userId = user._id.toString();

  // Generate auth token with user info
  const role = fullUserData.isAdmin ? 'admin' : 'user';
  const authToken = generateAuthToken(userId, fullUserData.email, role);

  return { user, userId, authToken };
}

/**
 * Creates a user with manually hashed password (for tests that need direct password control)
 */
export async function createUserWithHashedPassword(
  userData: Partial<TestUserData> = {}
): Promise<{ user: any; userId: string }> {
  const fullUserData = { ...defaultUserData, ...userData };
  const hashedPassword = await bcrypt.hash(fullUserData.password, 10);

  const user = await User.create({
    ...fullUserData,
    password: hashedPassword
  });

  return { user, userId: user._id.toString() };
}

/**
 * Generates JWT token for a user (bypasses login)
 */
export function generateAuthToken(userId: string, email?: string, role?: string): string {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'test_secret'
  );
}

/**
 * Creates an admin user
 */
export async function createAuthenticatedAdmin(
  app: Express,
  userData: Partial<TestUserData> = {}
): Promise<AuthenticatedTestUser> {
  return createAuthenticatedUser(app, {
    ...userData,
    isAdmin: true,
    email: userData.email || 'admin@example.com',
    username: userData.username || 'admin'
  });
}
