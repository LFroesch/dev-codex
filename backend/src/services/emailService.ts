import { Resend } from 'resend';
import type { EmailPreferences } from '../types/shared';
import { DEFAULT_EMAIL_PREFERENCES } from '../types/shared';

let resend: Resend;
const getResend = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set — cannot send emails');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const FROM = 'Dev Codex <noreply@dev-codex.com>';
const url = (path: string) => `${process.env.FRONTEND_URL || 'http://localhost:5002'}${path}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const prefsFooter = () => `
  <p style="color: #999; font-size: 11px; margin-top: 8px;">
    You can manage which emails you receive in
    <a href="${url('/account-settings?tab=notifications')}" style="color: #999;">Notification Settings</a>.
  </p>`;

const wrap = (body: string, showPrefsLink = true) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${body}
    <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
      Dev Codex &mdash; <a href="${url('/')}" style="color: #888;">dev-codex.com</a>
    </p>
    ${showPrefsLink ? prefsFooter() : ''}
  </div>
`;

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">${label}</a>`;

const send = async (to: string, subject: string, html: string) => {
  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error(`Failed to send email [${subject}]:`, error);
    throw new Error(`Failed to send email: ${subject}`);
  }
};

// ── Preference helper ──

/** Check if user has a given email category enabled. Defaults to true if prefs are missing. */
export const isEmailEnabled = (
  prefs: Partial<EmailPreferences> | undefined,
  category: keyof EmailPreferences
): boolean => {
  if (!prefs) return DEFAULT_EMAIL_PREFERENCES[category];
  return prefs[category] ?? DEFAULT_EMAIL_PREFERENCES[category];
};

// ── Exported email functions ──

export const sendEmail = async (options: { to: string; subject: string; text?: string; html: string; from?: string }) => {
  try {
    await getResend().emails.send({
      from: options.from || FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text })
    });
  } catch (error) {
    console.error(`Failed to send email [${options.subject}]:`, error);
    throw new Error(`Failed to send email: ${options.subject}`);
  }
};

export const sendProjectInvitationEmail = async (
  inviteeEmail: string,
  inviterName: string,
  projectName: string,
  invitationToken: string,
  role: string
) => {
  const invitationUrl = url(`/invitation/${invitationToken}`);
  await send(inviteeEmail, `You're invited to collaborate on "${projectName}"`, wrap(`
    <h2 style="color: #333;">Project Invitation</h2>
    <p><strong>${inviterName}</strong> invited you to <strong>${projectName}</strong> as ${cap(role)}.</p>
    ${btn(invitationUrl, 'Accept Invitation')}
    <p style="color: #888; font-size: 14px;">Expires in 7 days. If you don't have an account, you'll create one during acceptance.</p>
    <p style="color: #888; font-size: 12px;">Link: ${invitationUrl}</p>
  `, false));
};

// ── Billing emails (category: 'billing') ──

export const sendSubscriptionConfirmationEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  const plans: Record<string, { name: string; limit: string; price: string }> = {
    pro: { name: 'Pro', limit: '20 projects', price: '$5/mo' },
    premium: { name: 'Premium', limit: 'Unlimited projects', price: '$15/mo' }
  };
  const plan = plans[planTier] || { name: planTier, limit: '', price: '' };

  await send(userEmail, `Welcome to ${plan.name}`, wrap(`
    <h2 style="color: #333;">Welcome to ${plan.name}!</h2>
    <p>Hi ${userName}, your <strong>${plan.name}</strong> plan is now active.</p>
    <p style="color: #555;">${plan.price} &middot; ${plan.limit}</p>
    ${btn(url('/billing'), 'Manage Subscription')}
  `));
};

export const sendSubscriptionCancelledEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  await send(userEmail, 'Your Subscription Has Ended', wrap(`
    <h2 style="color: #333;">Subscription Ended</h2>
    <p>Hi ${userName}, your <strong>${cap(planTier)}</strong> plan has ended. You're now on the Free plan (3 projects).</p>
    <p style="color: #888; font-size: 14px;">Projects beyond the limit are locked in read-only mode.</p>
    ${btn(url('/billing'), 'Resubscribe')}
  `));
};

export const sendSubscriptionExpiredEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  await send(userEmail, 'Your Subscription Has Expired', wrap(`
    <h2 style="color: #333;">Subscription Expired</h2>
    <p>Hi ${userName}, your <strong>${cap(planTier)}</strong> plan has expired. You're now on the Free plan (3 projects).</p>
    <p style="color: #888; font-size: 14px;">Projects beyond the limit are locked in read-only mode.</p>
    ${btn(url('/billing'), 'Resubscribe')}
  `));
};

export const sendSubscriptionExpiringEmail = async (
  userEmail: string,
  userName: string,
  planTier: string,
  expirationDate: Date
) => {
  const dateStr = new Date(expirationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  await send(userEmail, 'Your Subscription Expires in 7 Days', wrap(`
    <h2 style="color: #333;">Expiring Soon</h2>
    <p>Hi ${userName}, your <strong>${cap(planTier)}</strong> plan expires on <strong>${dateStr}</strong>.</p>
    <p style="color: #888; font-size: 14px;">After that you'll revert to Free (3 projects). Excess projects become read-only.</p>
    ${btn(url('/billing'), 'Manage Subscription')}
  `));
};

export const sendPlanDowngradeEmail = async (
  userEmail: string,
  userName: string,
  oldPlan: string,
  newPlan: string
) => {
  const limits: Record<string, string> = { free: '3 projects', pro: '20 projects', premium: 'Unlimited projects' };

  await send(userEmail, 'Your Plan Has Changed', wrap(`
    <h2 style="color: #333;">Plan Changed</h2>
    <p>Hi ${userName}, you've moved from <strong>${cap(oldPlan)}</strong> to <strong>${cap(newPlan)}</strong>.</p>
    <p style="color: #555;">New limit: ${limits[newPlan] || 'N/A'}</p>
    <p style="color: #888; font-size: 14px;">Projects beyond your new limit are locked in read-only mode.</p>
    ${btn(url('/billing'), 'Manage Subscription')}
  `));
};

// ── Payment emails (category: 'payments') ──

export const sendPaymentReceiptEmail = async (
  userEmail: string,
  userName: string,
  amount: string,
  planTier: string,
  invoiceUrl?: string
) => {
  await send(userEmail, `Payment Receipt — ${amount}`, wrap(`
    <h2 style="color: #333;">Payment Received</h2>
    <p>Hi ${userName}, we received your payment of <strong>${amount}</strong> for the <strong>${cap(planTier)}</strong> plan.</p>
    ${invoiceUrl ? btn(invoiceUrl, 'View Invoice') : ''}
    ${btn(url('/billing'), 'Manage Subscription')}
  `));
};

export const sendPaymentFailedEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  await send(userEmail, 'Payment Failed — Action Required', wrap(`
    <h2 style="color: #e53e3e;">Payment Failed</h2>
    <p>Hi ${userName}, we couldn't process your payment for the <strong>${cap(planTier)}</strong> plan.</p>
    <p>Please update your payment method to avoid losing access to your paid features.</p>
    ${btn(url('/billing'), 'Update Payment Method')}
    <p style="color: #888; font-size: 14px;">If your payment fails again, your subscription may be cancelled.</p>
  `));
};

export const sendRefundEmail = async (
  userEmail: string,
  userName: string,
  amount: string
) => {
  await send(userEmail, `Refund Processed — ${amount}`, wrap(`
    <h2 style="color: #333;">Refund Processed</h2>
    <p>Hi ${userName}, a refund of <strong>${amount}</strong> has been issued to your original payment method.</p>
    <p style="color: #888; font-size: 14px;">It may take 5–10 business days to appear on your statement.</p>
    ${btn(url('/billing'), 'View Billing')}
  `));
};

// ── Security emails (category: 'security') — always sent, never disabled ──

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  await send(to, 'Reset your Dev Codex password', wrap(`
    <h2 style="color: #333;">Password Reset</h2>
    <p>You requested a password reset for your Dev Codex account.</p>
    <p>Click the button below to set a new password. This link expires in 15 minutes.</p>
    ${btn(resetUrl, 'Reset Password')}
    <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    <p style="color: #888; font-size: 12px;">Link: ${resetUrl}</p>
  `, false));
};

export const sendPasswordChangedEmail = async (
  userEmail: string,
  userName: string
) => {
  await send(userEmail, 'Your Password Was Changed', wrap(`
    <h2 style="color: #333;">Password Changed</h2>
    <p>Hi ${userName}, your Dev Codex password was successfully changed.</p>
    <p style="color: #888; font-size: 14px;">If you didn't make this change, please reset your password immediately or contact support.</p>
    ${btn(url('/'), 'Go to Dev Codex')}
  `));
};

// ── Weekly summary email (category: 'weeklySummary') ──

export const sendWeeklySummaryEmail = async (
  userEmail: string,
  userName: string,
  summary: {
    projectCount: number;
    todosCompleted: number;
    todosOverdue: number;
    todosDueThisWeek: number;
    devLogEntries: number;
    topProjects: { name: string; activity: string }[];
  }
) => {
  const projectRows = summary.topProjects
    .map(p => `<tr><td style="padding: 4px 8px;">${p.name}</td><td style="padding: 4px 8px; color: #555;">${p.activity}</td></tr>`)
    .join('');

  const statsHtml = `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; text-align: center; background: #f0fdf4; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${summary.todosCompleted}</div>
          <div style="font-size: 12px; color: #555;">Completed</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="padding: 8px; text-align: center; background: #fef2f2; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${summary.todosOverdue}</div>
          <div style="font-size: 12px; color: #555;">Overdue</div>
        </td>
        <td style="width: 8px;"></td>
        <td style="padding: 8px; text-align: center; background: #eff6ff; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: bold; color: #2563eb;">${summary.todosDueThisWeek}</div>
          <div style="font-size: 12px; color: #555;">Due This Week</div>
        </td>
      </tr>
    </table>`;

  await send(userEmail, 'Your Weekly Dev Codex Summary', wrap(`
    <h2 style="color: #333;">Weekly Summary</h2>
    <p>Hi ${userName}, here's what happened across your ${summary.projectCount} project${summary.projectCount !== 1 ? 's' : ''} this week.</p>
    ${statsHtml}
    ${summary.devLogEntries > 0 ? `<p style="color: #555;">${summary.devLogEntries} dev log entr${summary.devLogEntries === 1 ? 'y' : 'ies'} added.</p>` : ''}
    ${projectRows ? `
      <p style="font-weight: 600; margin-top: 16px;">Most Active Projects</p>
      <table style="width: 100%; font-size: 14px;">${projectRows}</table>
    ` : ''}
    ${btn(url('/'), 'Open Dev Codex')}
  `));
};
