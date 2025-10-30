## Deployment

### Self-Hosted Deployment

**Any platform that supports Node.js works:** Railway, Digital Ocean, AWS, Heroku, your own VPS, etc.

**Quick Railway Example:**
```bash
npm install -g @railway/cli
railway login && railway init && railway up
```

**Self-Hosted Checklist:**
- [ ] `NODE_ENV=production`
- [ ] `SELF_HOSTED=true` (disables rate limiting and billing)
- [ ] Generate JWT_SECRET & CSRF_SECRET (64 chars)
- [ ] Set FRONTEND_URL & CORS_ORIGINS
- [ ] MongoDB Atlas, Railway MongoDB, or your own instance
- [ ] (Optional) Sentry DSN for error tracking
- [ ] (Optional) Gmail app password for SMTP if you want email features
- [ ] (Optional) Google OAuth credentials

**What SELF_HOSTED=true does:**
- ✅ Disables all rate limiting (unlimited requests)
- ✅ Disables billing/subscription features
- ✅ Makes SMTP optional (email features won't work without it)
- ✅ Makes Stripe optional (no payment processing)
- ✅ Users get unlimited projects and team members