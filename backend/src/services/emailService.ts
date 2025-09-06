import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

export const sendProjectInvitationEmail = async (
  inviteeEmail: string,
  inviterName: string,
  projectName: string,
  invitationToken: string,
  role: string
) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const invitationUrl = `${frontendUrl}/invitation/${invitationToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Project Invitation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 30px 0;
          border-bottom: 2px solid #3B82F6;
        }
        .content {
          padding: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #3B82F6;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .cta-button:hover {
          background-color: #2563EB;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
        .project-info {
          background-color: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Project Manager</h1>
        <h2>You're invited to collaborate!</h2>
      </div>
      
      <div class="content">
        <p>Hi there!</p>
        
        <p><strong>${inviterName}</strong> has invited you to collaborate on their project as a <strong>${role}</strong>.</p>
        
        <div class="project-info">
          <h3>📋 Project: ${projectName}</h3>
          <p><strong>Your role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
        </div>
        
        <p>Click the button below to accept the invitation and start collaborating:</p>
        
        <div style="text-align: center;">
          <a href="${invitationUrl}" class="cta-button">Accept Invitation</a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${invitationUrl}">${invitationUrl}</a></p>
        
        <p>This invitation will expire in 7 days. If you don't have an account yet, you'll be able to create one during the acceptance process.</p>
      </div>
      
      <div class="footer">
        <p>This invitation was sent by ${inviterName} through Project Manager.</p>
        <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Project Manager - Collaboration Invitation

Hi there!

${inviterName} has invited you to collaborate on their project "${projectName}" as a ${role}.

Accept your invitation by visiting this link:
${invitationUrl}

This invitation will expire in 7 days. If you don't have an account yet, you'll be able to create one during the acceptance process.

If you weren't expecting this invitation, you can safely ignore this email.

---
Project Manager Team
  `;

  try {
    await transporter.sendMail({
      from: `"Project Manager" <${process.env.SMTP_USER}>`,
      to: inviteeEmail,
      subject: `You're invited to collaborate on "${projectName}"`,
      text: textContent,
      html: htmlContent,
    });
    
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
};