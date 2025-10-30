import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../models/User';
import authRoutes from '../routes/auth';

// Mock nodemailer to capture emails
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn(async (mailOptions) => {
      // Store the last email for test inspection
      (global as any).lastEmail = mailOptions;
      return { messageId: 'test-message-id' };
    })
  }))
}));

// Set up email environment variables for tests
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.SMTP_PORT = '587';
process.env.FRONTEND_URL = 'http://localhost:5002';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Password Reset Flow', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    (global as any).lastEmail = null;
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  it('should complete full password reset flow', async () => {
    // 1. Create user
    const user = {
      email: 'reset@test.com',
      password: 'OldPassword123!',
      firstName: 'Reset',
      lastName: 'User',
      username: 'resetuser'
    };

    await request(app).post('/api/auth/register').send(user);

    // 2. Request password reset
    const resetReq = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    expect(resetReq.status).toBe(200);
    expect(resetReq.body.message).toContain('reset link has been sent');

    // 3. Verify email was sent with token
    expect((global as any).lastEmail).toBeDefined();
    expect((global as any).lastEmail.to).toBe(user.email);
    expect((global as any).lastEmail.subject).toContain('Password Reset');

    // 4. Extract token from email HTML
    const emailHtml = (global as any).lastEmail.html;
    const tokenMatch = emailHtml.match(/token=([a-f0-9]+)/);
    expect(tokenMatch).toBeDefined();
    const resetToken = tokenMatch[1];

    // 5. Verify token is stored (hashed) in database
    const dbUser = await User.findOne({ email: user.email });
    expect(dbUser?.resetPasswordToken).toBeDefined();
    expect(dbUser?.resetPasswordExpires).toBeDefined();
    expect(dbUser!.resetPasswordExpires!.getTime()).toBeGreaterThan(Date.now());

    // 6. Reset password with token
    const newPassword = 'NewPassword456!';
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: resetToken,
        password: newPassword
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toBe('Password reset successful');

    // 7. Verify token is cleared from database
    const updatedUser = await User.findOne({ email: user.email });
    expect(updatedUser?.resetPasswordToken).toBeUndefined();
    expect(updatedUser?.resetPasswordExpires).toBeUndefined();

    // 8. Verify old password no longer works
    const oldLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    expect(oldLoginRes.status).toBe(400);
    expect(oldLoginRes.body.message).toBe('Invalid credentials');

    // 9. Verify new password works
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: newPassword });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.email).toBe(user.email);
  });

  it('should reject invalid reset tokens', async () => {
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: 'invalid-token-that-does-not-exist-in-database',
        password: 'NewPassword123!'
      });

    expect(resetRes.status).toBe(400);
    expect(resetRes.body.message).toContain('Invalid or expired');
  });

  it('should reject expired reset tokens', async () => {
    // Create user
    const user = {
      email: 'expired@test.com',
      password: 'OldPassword123!',
      firstName: 'Expired',
      lastName: 'User',
      username: 'expireduser'
    };

    await request(app).post('/api/auth/register').send(user);

    // Request password reset
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    // Extract token
    const emailHtml = (global as any).lastEmail.html;
    const tokenMatch = emailHtml.match(/token=([a-f0-9]+)/);
    const resetToken = tokenMatch[1];

    // Manually expire the token in database
    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    await User.findOneAndUpdate(
      { email: user.email },
      {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() - 1000) // 1 second in the past
      }
    );

    // Try to reset with expired token
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewPassword123!'
      });

    expect(resetRes.status).toBe(400);
    expect(resetRes.body.message).toContain('Invalid or expired');
  });

  it('should not reveal if email exists (enumeration prevention)', async () => {
    // Request reset for non-existent email
    const resetReq = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' });

    // Should return same 200 status and message as if email existed
    expect(resetReq.status).toBe(200);
    expect(resetReq.body.message).toContain('reset link has been sent');

    // Should not have sent an email
    expect((global as any).lastEmail).toBeNull();
  });
});
