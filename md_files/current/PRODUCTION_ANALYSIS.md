# Production Readiness Guide - Railway Deployment

**Project:** Dev Codex
**Status:** ✅ 90% Ready - TypeScript errors fixed, deployment configs pending
**Target Platform:** Railway
**Estimated Time to Deploy:** 2-3 hours

---

## ✅ Completed Tasks

- [x] **TypeScript compilation errors fixed** - Frontend builds successfully
- [x] **Node version specified** - `.nvmrc` and `package.json` engines configured for Node 20.x
- [x] **Health check endpoints** - `/api/ready` and `/api/health` implemented
- [x] **Security hardening** - HSTS, CSP, CSRF, rate limiting configured
- [x] **Error tracking** - Sentry integrated (frontend + backend)
- [x] **Logging** - Winston with file rotation
- [x] **Database** - MongoDB with connection pooling and proper indexes
- [x] **Static serving** - Backend serves frontend in production mode
- [x] **Graceful shutdown** - SIGTERM/SIGINT handlers implemented

---

## 🚀 Remaining Tasks

### Priority 1: Critical (Required for Deployment)

#### 1. Fix NPM Security Vulnerabilities

```bash
# Run in root directory
npm audit fix

# Run in backend
cd backend && npm audit fix

# Run in frontend
cd frontend && npm audit fix

# If any vulnerabilities remain, review them:
npm audit

# For breaking changes, use:
npm audit fix --force  # Use with caution
```

**Current Status:** 1 moderate vulnerability in backend + frontend

---

#### 2. Create `railway.toml` Configuration

Create this file in the project root:

```toml
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/ready"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[env]
NODE_ENV = "production"
PORT = { default = "5003" }
```

**Why:** Explicit configuration ensures Railway uses correct build/start commands and health checks.

---

#### 3. Set Railway Environment Variables

In your Railway dashboard, add these variables:

**CRITICAL (App won't start without these):**
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
JWT_SECRET=<generate-64-char-random-string>
CSRF_SECRET=<generate-64-char-random-string>
CORS_ORIGINS=https://your-app.railway.app
FRONTEND_URL=https://your-app.railway.app
PORT=5003
```

**Generate secrets:**
```bash
# Generate JWT_SECRET and CSRF_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**HIGHLY RECOMMENDED:**
```bash
SELF_HOSTED=true                    # Disables billing/Stripe requirements
SENTRY_DSN=https://...              # Error tracking
SENTRY_ENVIRONMENT=production
LOG_LEVEL=info
```

**OPTIONAL (Email Features):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM=noreply@yourdomain.com
```

**OPTIONAL (Google OAuth):**
```bash
GOOGLE_CLIENT_ID=<oauth-client-id>
GOOGLE_CLIENT_SECRET=<oauth-secret>
GOOGLE_CALLBACK_URL=https://your-app.railway.app/api/auth/google/callback
```

**OPTIONAL (Stripe Billing):**
```bash
# Only if SELF_HOSTED=false
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DISABLE_BILLING=false
```

---

#### 4. Create `frontend/.env.example`

Create this file for documentation:

```bash
# Frontend Environment Variables

# API URL (optional - defaults to /api proxy)
# VITE_API_URL=http://localhost:5003/api

# Sentry Error Tracking (optional)
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_ORG=your-org
```

---

#### 5. Test Production Build Locally

```bash
# From project root
NODE_ENV=production npm run build

# Start production server
NODE_ENV=production npm start

# In another terminal, test the application
curl http://localhost:5003/api/health
# Should return: {"status":"ok"}

curl http://localhost:5003/api/ready
# Should return: {"status":"ok","database":"connected"}

# Open browser to http://localhost:5003
# Verify:
# - Frontend loads correctly
# - API endpoints work
# - Authentication works
# - Database connections successful
```

**Common Issues:**
- If frontend doesn't load: Check `backend/dist/` contains compiled files
- If API fails: Check environment variables are set
- If database fails: Verify MONGODB_URI is correct

---

### Priority 2: Recommended (Improves Reliability)

#### 6. Create CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npm ci --prefix backend
          npm ci --prefix frontend

      - name: Run backend tests
        run: npm run test --prefix backend
        env:
          NODE_ENV: test

      - name: Build application
        run: npm run build

      - name: Security audit
        run: |
          npm audit --audit-level=high --production || true
          npm audit --audit-level=high --production --prefix backend || true
          npm audit --audit-level=high --production --prefix frontend || true
        continue-on-error: true

  deploy:
    needs: test-and-build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Railway Deployment
        run: echo "Railway will auto-deploy via GitHub integration"
```

**Setup:**
1. Create `.github/workflows/` directory
2. Add the file above
3. Push to GitHub
4. Enable Railway GitHub integration in Railway dashboard

**Benefits:**
- Runs tests before deployment
- Catches build failures early
- Security audit on every push
- Prevents broken deployments

---

#### 7. MongoDB Setup

**Option A: Railway MongoDB Plugin (Recommended)**
1. In Railway dashboard → Add Plugin → MongoDB
2. Railway will automatically set `MONGODB_URI`
3. No additional configuration needed

**Option B: MongoDB Atlas (Free Tier)**
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create free M0 cluster
3. Add IP whitelist: `0.0.0.0/0` (allow from anywhere)
4. Create database user
5. Get connection string and set as `MONGODB_URI`

**Backup Strategy:**
- Atlas: Enable automatic backups in cluster settings
- Railway: Backups not included - use mongodump manually or Atlas

---

#### 8. Sentry Setup (Error Tracking)

1. Create account at https://sentry.io
2. Create new project for Node.js (backend)
3. Create new project for React (frontend)
4. Get DSN from project settings
5. Set environment variables:
   - `SENTRY_DSN` (backend)
   - `VITE_SENTRY_DSN` (frontend)
   - `SENTRY_ENVIRONMENT=production`

**Benefits:**
- Real-time error notifications
- Performance monitoring
- User session replay
- Release tracking

---

### Priority 3: Optional Enhancements

#### 9. Custom Domain Setup

**In Railway:**
1. Go to Settings → Domains
2. Add custom domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed
4. Update environment variables:
   ```bash
   CORS_ORIGINS=https://app.yourdomain.com
   FRONTEND_URL=https://app.yourdomain.com
   ```

**Free SSL/TLS:** Railway provides automatic HTTPS

---

#### 10. Environment-Specific Configs

Create different configs for staging/production:

**`config/production.json`:**
```json
{
  "rateLimit": {
    "normal": 60,
    "auth": 10,
    "terminal": 12
  },
  "session": {
    "timeout": 3600000
  }
}
```

**`config/staging.json`:**
```json
{
  "rateLimit": {
    "normal": 200,
    "auth": 50,
    "terminal": 50
  },
  "session": {
    "timeout": 7200000
  }
}
```

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests pass: `npm run test:all`
- [ ] Production build succeeds: `npm run build`
- [ ] Security vulnerabilities resolved: `npm audit`
- [ ] `.nvmrc` exists with `20`
- [ ] `railway.toml` created
- [ ] `frontend/.env.example` documented
- [ ] CI/CD workflow created (optional)

### Railway Setup

- [ ] Create Railway account
- [ ] Create new project from GitHub repo
- [ ] Add MongoDB plugin OR configure Atlas
- [ ] Set all required environment variables
- [ ] Configure health check: `/api/ready`
- [ ] Deploy initial version

### Post-Deployment Verification

- [ ] Health check passes: `https://your-app.railway.app/api/ready`
- [ ] Frontend loads: `https://your-app.railway.app`
- [ ] Register new user account
- [ ] Login/logout works
- [ ] Create test project
- [ ] Test terminal commands
- [ ] Check Railway logs for errors
- [ ] Verify Sentry receives events (if configured)

### Production Setup

- [ ] Create admin user:
  ```bash
  # SSH into Railway container or run locally against prod DB
  npm run create-admin
  ```
- [ ] Set up monitoring alerts
- [ ] Configure MongoDB backups
- [ ] Test password reset email (if SMTP configured)
- [ ] Document rollback procedure

---

## 🔍 Monitoring & Maintenance

### Railway Dashboard Metrics

Monitor these in Railway dashboard:
- CPU usage (should stay < 80%)
- Memory usage (backend uses ~150-300MB)
- Request rate
- Error rate
- Deployment logs

### Health Checks

```bash
# Liveness check (always returns 200 if running)
curl https://your-app.railway.app/api/live

# Readiness check (verifies database connection)
curl https://your-app.railway.app/api/ready

# Full health check
curl https://your-app.railway.app/api/health
```

### Log Access

**Railway Logs:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs
```

**Application Logs:**
- Check `logs/` directory (if using persistent storage)
- Or stream to external service (Papertrail, LogDNA)

### Backup Strategy

**Database:**
```bash
# Manual backup with mongodump
mongodump --uri="$MONGODB_URI" --out=./backup-$(date +%Y%m%d)

# Restore
mongorestore --uri="$MONGODB_URI" ./backup-20250112
```

**Automated Backups:**
- Use MongoDB Atlas automated backups, or
- Set up cron job with Railway Cron plugin

---

## ⚠️ Common Issues & Solutions

### Issue: Build fails with "Cannot find module"

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
npm install --prefix backend
npm install --prefix frontend
npm run build
```

### Issue: Database connection timeout

**Solution:**
1. Check `MONGODB_URI` is correct
2. Verify IP whitelist includes Railway IPs (or use `0.0.0.0/0`)
3. Check MongoDB server is running
4. Verify network connectivity

### Issue: 502 Bad Gateway

**Solutions:**
- Check Railway logs for startup errors
- Verify `PORT` environment variable is set
- Ensure health check passes
- Check backend starts successfully

### Issue: CORS errors in browser

**Solution:**
```bash
# Verify CORS_ORIGINS includes your domain
CORS_ORIGINS=https://your-app.railway.app,https://www.your-app.railway.app
```

### Issue: Session timeouts too frequent

**Solution:**
```bash
# Increase session timeout (default: 1 hour)
SESSION_TIMEOUT_MS=7200000  # 2 hours
```

---

## 📊 Performance Optimization

### Current Performance

- Backend response time: ~50-200ms
- Frontend bundle size: ~1.5MB (gzipped: ~500KB)
- Database query time: ~5-50ms
- Cold start time: ~2-3 seconds

### Optimization Opportunities

1. **CDN for static assets** (CloudFlare, Fastly)
   - Reduces frontend load time by 50-70%
   - Offloads traffic from Railway

2. **Redis caching** (Railway Redis plugin)
   - Cache frequent database queries
   - Session storage
   - Rate limiting storage

3. **Database indexes**
   - Already implemented (30+ indexes)
   - Monitor slow queries with MongoDB Atlas

4. **Bundle optimization**
   - Already code-split (Vite chunks)
   - Further split large routes if needed

---

## 🔐 Security Checklist

- [x] **HTTPS enforced** - Railway automatic
- [x] **HSTS enabled** - 1 year preload
- [x] **CSP configured** - Strict policy
- [x] **CSRF protection** - Double-submit cookie
- [x] **Rate limiting** - Plan-based limits
- [x] **Secure cookies** - HttpOnly, Secure, SameSite
- [x] **Environment secrets** - Not in source code
- [x] **SQL injection** - Mongoose parameterization
- [x] **XSS protection** - React escaping + Helmet
- [ ] **Security headers audit** - Run securityheaders.com
- [ ] **Penetration testing** - Optional for sensitive data
- [ ] **Dependency scanning** - GitHub Dependabot

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **Sentry Docs:** https://docs.sentry.io
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/

---

## 🎯 Quick Deploy Commands

```bash
# 1. Fix any remaining security issues
npm audit fix
npm audit fix --prefix backend
npm audit fix --prefix frontend

# 2. Test production build locally
NODE_ENV=production npm run build
NODE_ENV=production npm start

# 3. Commit changes
git add .
git commit -m "Production readiness: Railway deployment configs"
git push origin main

# 4. Deploy to Railway
# Option A: Use Railway dashboard to link GitHub repo (auto-deploys)
# Option B: Use Railway CLI
railway login
railway up
```

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ Build completes without errors
2. ✅ Health check returns 200: `/api/ready`
3. ✅ Frontend loads at root URL
4. ✅ User registration works
5. ✅ Authentication (login/logout) works
6. ✅ Projects can be created
7. ✅ Terminal commands execute
8. ✅ Database persistence confirmed
9. ✅ No errors in Railway logs
10. ✅ Sentry receives test event (if configured)

---

**Good luck with your deployment! 🚀**

*Last updated: 2025-01-12*
