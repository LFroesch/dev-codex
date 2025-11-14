import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    });
  } catch (error) {
    console.error('Resend error:', error);
    throw error;
  }
};

export const sendProjectInvitationEmail = async (
  inviteeEmail: string,
  inviterName: string,
  projectName: string,
  invitationToken: string,
  role: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const invitationUrl = `${frontendUrl}/invitation/${invitationToken}`;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: inviteeEmail,
      subject: `You've been invited to collaborate on ${projectName}`,
      html: `
        <h2>Project Invitation</h2>
        <p>${inviterName} has invited you to collaborate on the project "${projectName}" as ${role}.</p>
        <a href="${invitationUrl}">Accept Invitation</a>
      `
    });
  } catch (error) {
    console.error('Resend error:', error);
    throw error;
  }
};
