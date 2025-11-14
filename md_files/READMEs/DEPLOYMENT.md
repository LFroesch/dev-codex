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
- [ ] (Optional) Email: SMTP credentials **OR** Resend API key (pick one or both)
- [ ] (Optional) Google OAuth credentials for social login
- [ ] (Optional) Sentry DSN for error tracking

**What SELF_HOSTED=true does:**
- ✅ Disables all rate limiting (unlimited requests)
- ✅ Disables billing/subscription features
- ✅ Makes Stripe optional (no payment processing)
- ✅ Makes Google OAuth optional (users can still register with email/password)
- ✅ Makes email optional (but recommended for invitations/password resets)
- ✅ Users get unlimited projects and team members

**Email Setup (Optional but Recommended):**

The app uses a **unified email service** that supports **either** Resend **or** SMTP. You only need **one** of them:

**Option 1: SMTP (Recommended for self-hosting)**
- Works with: Gmail, SendGrid, Mailgun, your own mail server
- **Gmail setup:**
  1. Enable 2FA on your Google Account
  2. Generate App Password: https://myaccount.google.com/apppasswords
  3. Set environment variables:
     ```bash
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your@gmail.com
     SMTP_PASS=your-app-password-here
     ```
- **Other providers:** Use their SMTP credentials

**Option 2: Resend (What production uses)**
- Free tier: 100 emails/day, 3,000/month
- Get API key: https://resend.com/api-keys
- Set environment variable:
  ```bash
  RESEND_API_KEY=re_your_key_here
  ```

**Option 3: Both (automatic failover)**
- Set both RESEND_API_KEY and SMTP_* variables
- App tries Resend first, falls back to SMTP if it fails

**How it works:**
```
All emails (invitations, password resets, tickets, etc.)
    ↓
Tries Resend first (if RESEND_API_KEY is set)
    ↓
Falls back to SMTP (if Resend fails or not configured)
    ↓
Email delivered! ✉️
```

**If no email configured:**
- ✅ App works for all non-email features
- ❌ Can't send invitations, password resets, or ticket notifications
- ⚠️ Admin can manually reset passwords using CLI script

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

---

### Database Backup & Restore

**Option 1: MongoDB Atlas (Recommended)**
- Atlas has automatic backups built-in (Cloud Backup)
- Point-in-time recovery available on M10+ clusters
- Manual backups via UI or API
- Configure backup schedule in Atlas dashboard
- Backups are encrypted and stored in cloud

**Option 2: mongodump/mongorestore (Manual)**

Backup:
```bash
mongodump --uri="your-mongo-connection-string" --out=/backup/directory
```

Restore:
```bash
mongorestore --uri="your-mongo-connection-string" /backup/directory
```

**Recommended Backup Strategy:**
1. Set up automated daily backups using a cron job or cloud scheduler
2. Store backups in S3/cloud storage (encrypted)
3. Test restore process monthly to verify backups work
4. Keep at least 7 daily + 4 weekly backups
5. Monitor backup success/failure with alerts

**Railway-Specific:**
If using Railway's MongoDB plugin, check your plan for built-in backup features.

**Example Automated Backup Script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb_$DATE"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR"
# Optional: Upload to S3
# aws s3 cp "$BACKUP_DIR" s3://your-bucket/backups/ --recursive
```