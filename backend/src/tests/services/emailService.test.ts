import { sendEmail, sendProjectInvitationEmail, sendPasswordResetEmail } from '../../services/emailService';

let mockResendSend: jest.Mock;
jest.mock('resend', () => {
  mockResendSend = jest.fn().mockResolvedValue({ id: 'test-id' });
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockResendSend }
    }))
  };
});

describe('emailService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.FRONTEND_URL = 'http://localhost:5002';
    process.env.RESEND_API_KEY = 'test-resend-key';
    mockResendSend = jest.fn().mockResolvedValue({ id: 'test-id' });
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should send via Resend with correct params', async () => {
      await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' });

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Dev Codex <noreply@dev-codex.com>',
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Hi</p>'
        })
      );
    });

    it('should use custom from when provided', async () => {
      await sendEmail({ to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>', from: 'Custom <c@x.com>' });
      expect(mockResendSend).toHaveBeenCalledWith(expect.objectContaining({ from: 'Custom <c@x.com>' }));
    });

    it('should throw on Resend failure', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('API error'));
      await expect(sendEmail({ to: 'x@x.com', subject: 'X', html: '' })).rejects.toThrow('Failed to send email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send reset email with link', async () => {
      await sendPasswordResetEmail('user@test.com', 'http://localhost:5002/reset?token=abc');

      const call = mockResendSend.mock.calls[0][0];
      expect(call.to).toBe('user@test.com');
      expect(call.subject).toContain('Reset');
      expect(call.html).toContain('http://localhost:5002/reset?token=abc');
    });
  });

  describe('sendProjectInvitationEmail', () => {
    it('should send invitation with correct details', async () => {
      await sendProjectInvitationEmail('inv@test.com', 'John', 'MyProject', 'tok-123', 'editor');

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'inv@test.com',
          subject: 'You\'re invited to collaborate on "MyProject"'
        })
      );
    });

    it('should include invitation URL', async () => {
      await sendProjectInvitationEmail('inv@test.com', 'John', 'MyProject', 'tok-123', 'editor');
      const call = mockResendSend.mock.calls[0][0];
      expect(call.html).toContain('http://localhost:5002/invitation/tok-123');
    });

    it('should include inviter name and project', async () => {
      await sendProjectInvitationEmail('inv@test.com', 'John', 'MyProject', 'tok-123', 'editor');
      const call = mockResendSend.mock.calls[0][0];
      expect(call.html).toContain('John');
      expect(call.html).toContain('MyProject');
    });

    it('should throw on send failure', async () => {
      mockResendSend.mockRejectedValueOnce(new Error('fail'));
      await expect(
        sendProjectInvitationEmail('inv@test.com', 'John', 'MyProject', 'tok-123', 'editor')
      ).rejects.toThrow('Failed to send email');
    });
  });
});
