import nodemailer from 'nodemailer';

/**
 * Unified Email Service
 * Tries Resend first (production), falls back to SMTP (self-hosted)
 */

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

/**
 * Send email using Resend (preferred) or SMTP (fallback)
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const { to, subject, text, html, from } = options;

  // Try Resend first (production)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: from || 'Dev Codex <noreply@dev-codex.com>',
        to,
        subject,
        text,
        html
      });

      
      return;
    } catch (error) {
      
      // Fall through to SMTP
    }
  }

  // Fallback to SMTP (self-hosted or Resend failed)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      await transporter.sendMail({
        from: from || `"Dev Codex" <${process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html
      });

      
      return;
    } catch (error) {
      
      throw new Error('Failed to send email via SMTP');
    }
  }

  // No email configured - throw error
  
  throw new Error('No email service configured');
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
    await sendEmail({
      to: inviteeEmail,
      subject: `You're invited to collaborate on "${projectName}"`,
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
    throw new Error('Failed to send invitation email');
  }
};

/**
 * Send subscription confirmation email
 */
export const sendSubscriptionConfirmationEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const billingUrl = `${frontendUrl}/billing`;

  const planDetails = {
    pro: { name: 'Pro', projectLimit: '20 projects', price: '$10/month' },
    premium: { name: 'Premium', projectLimit: '50 projects', price: '$25/month' }
  };

  const plan = planDetails[planTier as keyof typeof planDetails] || { name: planTier, projectLimit: '', price: '' };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Welcome to ${plan.name}</title>
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
          border-bottom: 2px solid #10b981;
        }
        .content {
          padding: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .plan-info {
          background-color: #ecfdf5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Dev Codex</h1>
        <h2>Welcome to ${plan.name}!</h2>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>Thank you for subscribing! Your <strong>${plan.name}</strong> plan is now active.</p>

        <div class="plan-info">
          <h3>Your Plan Details:</h3>
          <p><strong>Plan:</strong> ${plan.name}</p>
          <p><strong>Price:</strong> ${plan.price}</p>
          <p><strong>Project Limit:</strong> ${plan.projectLimit}</p>
        </div>

        <p>You now have access to all the features of the ${plan.name} plan. Get started by creating new projects and unlocking the full potential of Dev Codex!</p>

        <div style="text-align: center;">
          <a href="${billingUrl}" class="cta-button">Manage Subscription</a>
        </div>
      </div>

      <div class="footer">
        <p>Need help? Contact us anytime.</p>
        <p>Thank you for choosing Dev Codex!</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dev Codex - Welcome to ${plan.name}!

Hi ${userName},

Thank you for subscribing! Your ${plan.name} plan is now active.

Your Plan Details:
- Plan: ${plan.name}
- Price: ${plan.price}
- Project Limit: ${plan.projectLimit}

You now have access to all the features of the ${plan.name} plan. Get started by creating new projects and unlocking the full potential of Dev Codex!

Manage Subscription: ${billingUrl}

Need help? Contact us anytime.
Thank you for choosing Dev Codex!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: `Welcome to ${plan.name} - Subscription Confirmed`,
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
  }
};

/**
 * Send subscription cancelled email
 */
export const sendSubscriptionCancelledEmail = async (
  userEmail: string,
  userName: string,
  planTier: string,
  endDate?: Date
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const billingUrl = `${frontendUrl}/billing`;

  const endDateStr = endDate ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the end of your billing period';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Cancelled</title>
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
          border-bottom: 2px solid #f59e0b;
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
        .info-box {
          background-color: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Dev Codex</h1>
        <h2>Subscription Cancelled</h2>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>We've received your cancellation request for your <strong>${planTier.charAt(0).toUpperCase() + planTier.slice(1)}</strong> subscription.</p>

        <div class="info-box">
          <h3>What Happens Next:</h3>
          <p><strong>Access Until:</strong> ${endDateStr}</p>
          <p>You'll continue to have access to your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} features until ${endDateStr}.</p>
          <p>After that, your account will revert to the Free plan.</p>
        </div>

        <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime before it expires.</p>

        <div style="text-align: center;">
          <a href="${billingUrl}" class="cta-button">Reactivate Subscription</a>
        </div>
      </div>

      <div class="footer">
        <p>Have feedback? We'd love to hear from you.</p>
        <p>Thank you for being part of Dev Codex!</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dev Codex - Subscription Cancelled

Hi ${userName},

We've received your cancellation request for your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} subscription.

What Happens Next:
- Access Until: ${endDateStr}
- You'll continue to have access to your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} features until ${endDateStr}.
- After that, your account will revert to the Free plan.

We're sorry to see you go! If you change your mind, you can reactivate your subscription anytime before it expires.

Reactivate Subscription: ${billingUrl}

Have feedback? We'd love to hear from you.
Thank you for being part of Dev Codex!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Your Subscription Has Been Cancelled',
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
  }
};

/**
 * Send subscription expired email
 */
export const sendSubscriptionExpiredEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const billingUrl = `${frontendUrl}/billing`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Expired</title>
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
          border-bottom: 2px solid #ef4444;
        }
        .content {
          padding: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .info-box {
          background-color: #fee2e2;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #ef4444;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Dev Codex</h1>
        <h2>Your Subscription Has Expired</h2>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>Your <strong>${planTier.charAt(0).toUpperCase() + planTier.slice(1)}</strong> subscription has expired, and your account has been moved to the Free plan.</p>

        <div class="info-box">
          <h3>What This Means:</h3>
          <p>Your account is now on the <strong>Free plan</strong> with a limit of <strong>3 projects</strong>.</p>
          <p>If you had more than 3 projects, the excess projects have been locked and are in read-only mode.</p>
        </div>

        <p>Want to unlock your projects and access all premium features again? Resubscribe now!</p>

        <div style="text-align: center;">
          <a href="${billingUrl}" class="cta-button">Resubscribe Now</a>
        </div>
      </div>

      <div class="footer">
        <p>Questions? We're here to help.</p>
        <p>Thank you for being part of Dev Codex!</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dev Codex - Your Subscription Has Expired

Hi ${userName},

Your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} subscription has expired, and your account has been moved to the Free plan.

What This Means:
- Your account is now on the Free plan with a limit of 3 projects.
- If you had more than 3 projects, the excess projects have been locked and are in read-only mode.

Want to unlock your projects and access all premium features again? Resubscribe now!

Resubscribe Now: ${billingUrl}

Questions? We're here to help.
Thank you for being part of Dev Codex!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Your Subscription Has Expired',
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
  }
};

/**
 * Send subscription expiring soon email (7 days warning)
 */
export const sendSubscriptionExpiringEmail = async (
  userEmail: string,
  userName: string,
  planTier: string,
  expirationDate: Date
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const billingUrl = `${frontendUrl}/billing`;

  const expirationDateStr = new Date(expirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Subscription Expiring Soon</title>
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
          border-bottom: 2px solid #f59e0b;
        }
        .content {
          padding: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #10b981;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning-box {
          background-color: #fef3c7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Dev Codex</h1>
        <h2>Your Subscription is Expiring Soon</h2>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>This is a reminder that your <strong>${planTier.charAt(0).toUpperCase() + planTier.slice(1)}</strong> subscription will expire in 7 days.</p>

        <div class="warning-box">
          <h3>Important Information:</h3>
          <p><strong>Expiration Date:</strong> ${expirationDateStr}</p>
          <p>After this date, your account will revert to the Free plan (3 projects limit).</p>
          <p>Any projects beyond the limit will be locked in read-only mode.</p>
        </div>

        <p>To keep your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} features and avoid any interruption, please update your billing information or reactivate your subscription.</p>

        <div style="text-align: center;">
          <a href="${billingUrl}" class="cta-button">Manage Subscription</a>
        </div>
      </div>

      <div class="footer">
        <p>Questions about your subscription? Contact us anytime.</p>
        <p>Thank you for using Dev Codex!</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dev Codex - Your Subscription is Expiring Soon

Hi ${userName},

This is a reminder that your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} subscription will expire in 7 days.

Important Information:
- Expiration Date: ${expirationDateStr}
- After this date, your account will revert to the Free plan (3 projects limit).
- Any projects beyond the limit will be locked in read-only mode.

To keep your ${planTier.charAt(0).toUpperCase() + planTier.slice(1)} features and avoid any interruption, please update your billing information or reactivate your subscription.

Manage Subscription: ${billingUrl}

Questions about your subscription? Contact us anytime.
Thank you for using Dev Codex!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Reminder: Your Subscription Expires in 7 Days',
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
  }
};

/**
 * Send plan downgrade email
 */
export const sendPlanDowngradeEmail = async (
  userEmail: string,
  userName: string,
  oldPlan: string,
  newPlan: string
) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5002';
  const billingUrl = `${frontendUrl}/billing`;

  const planLimits = {
    free: '3 projects',
    pro: '20 projects',
    premium: '50 projects'
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Plan Downgraded</title>
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
        .info-box {
          background-color: #eff6ff;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #3B82F6;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 Dev Codex</h1>
        <h2>Your Plan Has Changed</h2>
      </div>

      <div class="content">
        <p>Hi ${userName},</p>

        <p>Your subscription plan has been changed from <strong>${oldPlan.charAt(0).toUpperCase() + oldPlan.slice(1)}</strong> to <strong>${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}</strong>.</p>

        <div class="info-box">
          <h3>Your New Plan:</h3>
          <p><strong>Plan:</strong> ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}</p>
          <p><strong>Project Limit:</strong> ${planLimits[newPlan as keyof typeof planLimits] || 'N/A'}</p>
        </div>

        <p>If you had more projects than your new limit allows, some projects may have been locked in read-only mode.</p>

        <p>You can upgrade anytime to unlock more features and projects!</p>

        <div style="text-align: center;">
          <a href="${billingUrl}" class="cta-button">Manage Subscription</a>
        </div>
      </div>

      <div class="footer">
        <p>Questions about your plan? We're here to help.</p>
        <p>Thank you for using Dev Codex!</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Dev Codex - Your Plan Has Changed

Hi ${userName},

Your subscription plan has been changed from ${oldPlan.charAt(0).toUpperCase() + oldPlan.slice(1)} to ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}.

Your New Plan:
- Plan: ${newPlan.charAt(0).toUpperCase() + newPlan.slice(1)}
- Project Limit: ${planLimits[newPlan as keyof typeof planLimits] || 'N/A'}

If you had more projects than your new limit allows, some projects may have been locked in read-only mode.

You can upgrade anytime to unlock more features and projects!

Manage Subscription: ${billingUrl}

Questions about your plan? We're here to help.
Thank you for using Dev Codex!
  `;

  try {
    await sendEmail({
      to: userEmail,
      subject: 'Your Subscription Plan Has Changed',
      text: textContent,
      html: htmlContent
    });
  } catch (error) {
    
  }
};