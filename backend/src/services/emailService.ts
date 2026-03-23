import { Resend } from 'resend';

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

const wrap = (body: string) => `
  <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${body}
    <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
      Dev Codex &mdash; <a href="${url('/')}" style="color: #888;">dev-codex.com</a>
    </p>
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
  `));
};

export const sendSubscriptionConfirmationEmail = async (
  userEmail: string,
  userName: string,
  planTier: string
) => {
  const plans: Record<string, { name: string; limit: string; price: string }> = {
    pro: { name: 'Pro', limit: '20 projects', price: '$10/mo' },
    premium: { name: 'Premium', limit: '50 projects', price: '$25/mo' }
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
  planTier: string,
  endDate?: Date
) => {
  const endStr = endDate
    ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'the end of your billing period';

  await send(userEmail, 'Your Subscription Has Been Cancelled', wrap(`
    <h2 style="color: #333;">Subscription Cancelled</h2>
    <p>Hi ${userName}, your <strong>${cap(planTier)}</strong> plan has been cancelled.</p>
    <p>You'll keep access until <strong>${endStr}</strong>, then revert to Free.</p>
    ${btn(url('/billing'), 'Reactivate')}
    <p style="color: #888; font-size: 14px;">If you change your mind, reactivate anytime before it expires.</p>
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

export const sendPasswordResetEmail = async (to: string, resetUrl: string) => {
  await send(to, 'Reset your Dev Codex password', wrap(`
    <h2 style="color: #333;">Password Reset</h2>
    <p>You requested a password reset for your Dev Codex account.</p>
    <p>Click the button below to set a new password. This link expires in 15 minutes.</p>
    ${btn(resetUrl, 'Reset Password')}
    <p style="color: #888; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    <p style="color: #888; font-size: 12px;">Link: ${resetUrl}</p>
  `));
};

export const sendPlanDowngradeEmail = async (
  userEmail: string,
  userName: string,
  oldPlan: string,
  newPlan: string
) => {
  const limits: Record<string, string> = { free: '3 projects', pro: '20 projects', premium: '50 projects' };

  await send(userEmail, 'Your Plan Has Changed', wrap(`
    <h2 style="color: #333;">Plan Changed</h2>
    <p>Hi ${userName}, you've moved from <strong>${cap(oldPlan)}</strong> to <strong>${cap(newPlan)}</strong>.</p>
    <p style="color: #555;">New limit: ${limits[newPlan] || 'N/A'}</p>
    <p style="color: #888; font-size: 14px;">Projects beyond your new limit are locked in read-only mode.</p>
    ${btn(url('/billing'), 'Manage Subscription')}
  `));
};
