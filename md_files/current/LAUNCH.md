# Production Launch - Day 0
**Date:** October 30, 2025

## Final Todos BLOCKING PROD:
- [HIGH] Tune FeaturesGraph.tsx autosort etc
- [HIGH] Record Gifs for the README to demonstrate functionality
IF THERES TIME:
- [MEDIUM] Improve /llm primer with better context ('you are...')
    - /llm [format] components [@project]
    - /llm [format] todos
    - ... etc

## Today's Launch Schedule (9am - 5pm)

### Block 1: Railway Setup (9am - 12pm | 2-3 hours)

**Install Railway CLI:**
```bash
npm install -g @railway/cli
railway login
railway init
```

**Set Production Environment Variables:**

Generate secrets first:
```bash
# JWT_SECRET (32+ chars required)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# CSRF_SECRET (64 chars recommended)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Required Railway variables:
```bash
# Core
NODE_ENV=production
MONGODB_URI=<railway-mongodb-url>
JWT_SECRET=<generated-64-char-string>
CSRF_SECRET=<generated-64-char-string>
FRONTEND_URL=<your-production-domain>
CORS_ORIGINS=<your-production-domain>

# Auth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
GOOGLE_CALLBACK_URL=<production-url>/api/auth/google/callback

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<gmail-app-password>
SMTP_FROM=<your-email@gmail.com>

# Stripe (LIVE KEYS ONLY)
STRIPE_SECRET_KEY=<sk_live_...>
STRIPE_PUBLISHABLE_KEY=<pk_live_...>
STRIPE_WEBHOOK_SECRET=<whsec_...>
STRIPE_PRO_PRICE_ID=<live-price-id>
STRIPE_ENTERPRISE_PRICE_ID=<live-price-id>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
SENTRY_RELEASE=v1.0.0
SUPPORT_EMAIL=<your-support-email>
```

**Deploy:**
```bash
railway up
```

---

### Block 2: Lunch Break (12pm - 1pm)

---

### Block 3: Production Testing (1pm - 4pm | 2-3 hours)

Test these flows in production:

**Auth & Security:**
- [ ] Register new account
- [ ] Email verification received
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Password reset flow (token expires in 15min)
- [ ] 12-char password requirement enforced
- [ ] CSRF protection on forms

**Core Features:**
- [ ] Create project
- [ ] Add todos/notes
- [ ] Update project (verify ownerId can't be modified)
- [ ] Delete project
- [ ] Socket.io real-time updates work

**Team & Admin:**
- [ ] Invite team member
- [ ] Team member accepts invite
- [ ] Admin endpoints require authentication
- [ ] Free tier limits enforced (3 projects, 3 members)

**Payments:**
- [ ] Stripe checkout session creates
- [ ] Test webhook locally first: `stripe trigger checkout.session.completed`
- [ ] Configure Stripe webhook in dashboard
- [ ] Test upgrade to Pro plan
- [ ] Verify plan limits increase

**Monitoring:**
- [ ] Check Sentry dashboard for errors
- [ ] Health endpoints respond: `/api/health`, `/api/ready`, `/api/live`

---

### Block 4: Launch & Monitor (4pm - 5pm | 1 hour)

**Final Checks:**
- [ ] All production tests passed
- [ ] No errors in Sentry
- [ ] Database connected
- [ ] HTTPS working
- [ ] All services responding

**Go Live:**
- [ ] Announce on LinkedIn (optional)
- [ ] Share live link with friends
- [ ] Monitor Sentry for first hour
- [ ] Test from different browser/device

**Post-Launch Monitoring:**
- Set up UptimeRobot (free): pings `/api/health` every 5min
- Check Sentry daily for first week
- Fix critical bugs immediately
- Log non-critical bugs for later

---

## If Things Break

**App won't start:**
- Check Sentry dashboard for startup errors
- Verify all required env vars are set
- Check Railway logs: `railway logs`
- Verify MongoDB connection string

**Users can't log in:**
- Check JWT_SECRET is set correctly
- Check FRONTEND_URL matches actual domain
- Check CORS_ORIGINS includes frontend domain
- Check Railway logs for auth errors

**Payments not working:**
- Verify STRIPE_SECRET_KEY starts with `sk_live_` not `sk_test_`
- Check webhook secret matches Stripe dashboard
- Check Stripe dashboard → Webhooks for delivery status
- Verify webhook endpoint URL is correct

**Database issues:**
- Check MongoDB Atlas dashboard
- Verify connection string is correct
- Check if IP whitelist includes Railway IPs
- Check database user has correct permissions

---

## Post-Launch Tasks (First Week)

### Day 1-2: Monitoring
- Check Sentry 2-3x daily
- Fix any critical errors immediately
- Note non-critical bugs for weekend

### Day 3-4: Job Search Prep
- Update LinkedIn with live demo link
- Update GitHub README with deployed link
- Polish portfolio presentation

### Day 5-7: Feature Gates (Medium Priority)
- Export limits for free tier
- Advanced analytics for paid tiers only
- Storage limits per project tier
- Usage tracking dashboard

---

## Cost Tracking

**Monthly Estimate:**
- Railway: $15-25/month (scales with usage)
- MongoDB Atlas: $0 (free tier, 512MB)
- Sentry: $0 (free tier, 5k events/month)
- Stripe: 2.9% + $0.30 per transaction

**Monitor Railway billing daily for first week to avoid surprises.**

---

## You're Ready

**What you built:**
- Production SaaS with auth, payments, real-time features
- Comprehensive security (A- grade)
- 434+ passing tests covering critical paths
- Sentry monitoring configured
- Rate limiting to control costs

**What's left:**
- 2-3 hours: Railway setup
- 2-3 hours: Production testing
- 1 hour: Launch & monitor

**Total: 5-7 hours**

You've done the hard part. Today is execution day.

Launch it. Monitor it. Fix bugs as they come. That's how real products work.
