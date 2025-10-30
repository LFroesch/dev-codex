import { sendProjectInvitationEmail } from '../../services/emailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('emailService', () => {
  let mockSendMail: jest.Mock;
  let mockTransporter: any;

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
    mockTransporter = {
      sendMail: mockSendMail
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Set required env vars
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'test-password';
    process.env.FRONTEND_URL = 'http://localhost:5002';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendProjectInvitationEmail', () => {
    it('should send invitation email with correct details', async () => {
      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee@example.com',
          subject: expect.stringContaining('invitation')
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

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('http://localhost:5002/invitation/test-token-123');
    });

    it('should include project name and inviter name', async () => {
      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('John Doe');
      expect(emailCall.html).toContain('Test Project');
      expect(emailCall.html).toContain('editor');
    });

    it('should not send email if SMTP credentials are missing', async () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      await sendProjectInvitationEmail(
        'invitee@example.com',
        'John Doe',
        'Test Project',
        'test-token-123',
        'editor'
      );

      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });
});
