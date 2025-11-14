import { sendEmail, sendProjectInvitationEmail } from '../../services/emailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

// Mock resend - must mock require
let mockResendSend: jest.Mock;
jest.mock('resend', () => {
  mockResendSend = jest.fn().mockResolvedValue({ id: 'test-resend-id' });
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: mockResendSend
      }
    }))
  };
});

describe('emailService', () => {
  let mockSendMail: jest.Mock;
  let mockTransporter: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Setup nodemailer mock
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter = {
      sendMail: mockSendMail
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Reset resend mock
    mockResendSend = jest.fn().mockResolvedValue({ id: 'test-resend-id' });

    // Set base env vars
    process.env.FRONTEND_URL = 'http://localhost:5002';

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore env
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    const testEmailOptions = {
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test text content',
      html: '<p>Test html content</p>'
    };

    it('should send email via Resend when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 'test-resend-key';

      await sendEmail(testEmailOptions);

      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Dev Codex <noreply@dev-codex.com>',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
        html: '<p>Test html content</p>'
      });
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should use custom from address when provided via Resend', async () => {
      process.env.RESEND_API_KEY = 'test-resend-key';

      await sendEmail({
        ...testEmailOptions,
        from: 'Custom <custom@example.com>'
      });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Custom <custom@example.com>'
        })
      );
    });

    it('should fallback to SMTP when Resend fails', async () => {
      process.env.RESEND_API_KEY = 'test-resend-key';
      process.env.SMTP_USER = 'smtp@example.com';
      process.env.SMTP_PASS = 'smtp-password';

      // Make Resend fail
      mockResendSend.mockRejectedValueOnce(new Error('Resend failed'));

      await sendEmail(testEmailOptions);

      expect(mockResendSend).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Dev Codex" <smtp@example.com>',
        to: 'test@example.com',
        subject: 'Test Subject',
        text: 'Test text content',
        html: '<p>Test html content</p>'
      });
    });

    it('should send via SMTP when no RESEND_API_KEY is set', async () => {
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_USER = 'smtp@example.com';
      process.env.SMTP_PASS = 'smtp-password';

      await sendEmail(testEmailOptions);

      expect(mockResendSend).not.toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'smtp@example.com',
          pass: 'smtp-password'
        }
      });
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should use custom SMTP host and port when provided', async () => {
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_USER = 'smtp@example.com';
      process.env.SMTP_PASS = 'smtp-password';
      process.env.SMTP_HOST = 'smtp.custom.com';
      process.env.SMTP_PORT = '465';

      await sendEmail(testEmailOptions);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.custom.com',
        port: 465,
        secure: false,
        auth: {
          user: 'smtp@example.com',
          pass: 'smtp-password'
        }
      });
    });

    it('should throw error when SMTP fails', async () => {
      delete process.env.RESEND_API_KEY;
      process.env.SMTP_USER = 'smtp@example.com';
      process.env.SMTP_PASS = 'smtp-password';

      mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));

      await expect(sendEmail(testEmailOptions)).rejects.toThrow('Failed to send email via SMTP');
    });

    it('should not throw when no email service is configured', async () => {
      delete process.env.RESEND_API_KEY;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      // Should not throw, just log warning
      await sendEmail(testEmailOptions);

      expect(mockResendSend).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendProjectInvitationEmail', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test-resend-key';
    });

    it('should send invitation email with correct details', async () => {
      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: 'You\'re invited to collaborate on "Test Project"'
        })
      );
    });

    it('should include invitation URL in email', async () => {
      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      const emailCall = mockResendSend.mock.calls[0][0];
      expect(emailCall.html).toContain('http://localhost:5002/invitation/test-token-123');
      expect(emailCall.text).toContain('http://localhost:5002/invitation/test-token-123');
    });

    it('should include project name and inviter name', async () => {
      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      const emailCall = mockResendSend.mock.calls[0][0];
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('Test Project');
      expect(emailCall.html).toContain('editor');
      expect(emailCall.text).toContain('John Doe');
      expect(emailCall.text).toContain('Test Project');
    });

    it('should use custom FRONTEND_URL when provided', async () => {
      process.env.FRONTEND_URL = 'https://custom-domain.com';

      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      const emailCall = mockResendSend.mock.calls[0][0];
      expect(emailCall.html).toContain('https://custom-domain.com/invitation/test-token-123');
    });

    it('should throw error when email sending fails', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('Resend API error'));
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      await expect(
        sendProjectInvitationEmail(
          'invitee@example.com',
          'John Doe',
          'Test Project',
          'test-token-123',
          'editor'
        )
      ).rejects.toThrow('Failed to send invitation email');
    });

    it('should work with SMTP fallback', async () => {
      process.env.SMTP_USER = 'smtp@example.com';
      process.env.SMTP_PASS = 'smtp-password';

      // Make Resend fail to trigger fallback
      mockResendSend.mockRejectedValueOnce(new Error('Resend failed'));

      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'viewer'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: 'You\'re invited to collaborate on "Test Project"'
        })
      );
    });
  });
});
