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

---

### Setting Up Your First Admin (Self-Hosted)

After deploying, create an admin account to access admin features:

**1. Generate a secure secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**2. Add these variables to your `.env` file:**
```bash
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourSecurePassword123!
ADMIN_CREATION_SECRET=<paste-generated-secret>
EXPECTED_ADMIN_SECRET=<paste-same-secret>
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

**3. Run the admin creation script:**
```bash
cd backend
npm run create-admin
```

**4. IMPORTANT: Remove the secrets from your `.env` file after creating the admin** (for security)

**Security Notes:**
- Both `ADMIN_CREATION_SECRET` and `EXPECTED_ADMIN_SECRET` must match to prevent unauthorized admin creation
- The script can upgrade existing users to admin status or create new admin accounts
- Admin accounts automatically get premium tier (unlimited projects/members)
- Only run this script once during initial setup or when you need to add additional admins

**Admin Features:**
- Access to admin dashboard at `/admin`
- User management and analytics
- Support ticket management
- System monitoring and database cleanup
- News post creation