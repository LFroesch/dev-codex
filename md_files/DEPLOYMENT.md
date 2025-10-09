# Deployment & Launch

## CI/CD Pipeline

### GitHub Actions
- ✅ `test.yml` - Runs tests on push
- ✅ `deploy.yml` - Auto-deploys to Digital Ocean (main branch)
- ✅ Flow: Tests → Build → Deploy → Health Check → Smoke Tests

### Digital Ocean Setup
- ✅ Configuration in `.do/app.yaml`
- Backend: Node.js API service
- Frontend: React static site
- Auto-scaling & health checks
- Security headers configured

---

## Quick Deployment

### 1. Digital Ocean (5 min)
```bash
# Create account at digitalocean.com
# Apps → Create App → Connect GitHub repo
# Uses .do/app.yaml automatically
```

### 2. Add GitHub Secrets (10 min)
In GitHub repo: Settings → Secrets → Actions
```
DO_API_TOKEN          # From DO dashboard
DO_APP_NAME           # dev-codex
MONGODB_URI           # MongoDB Atlas connection
JWT_SECRET            # 64-char random string
STRIPE_SECRET_KEY     # Production key
GOOGLE_CLIENT_ID      # OAuth credentials
GOOGLE_CLIENT_SECRET
```

### 3. MongoDB Atlas (5 min)
```bash
# Create free cluster at cloud.mongodb.com
# Whitelist IP: 0.0.0.0/0
# Copy connection string to MONGODB_URI
```

### 4. Deploy
```bash
git push origin main
# GitHub Actions handles the rest
```

---

## Health Endpoints
- `/api/health` - Basic app status
- `/api/ready` - Database connectivity
- `/api/live` - Load balancer check

---

## Pre-Launch Checklist

### Required
- [ ] Cross-device testing (mobile, tablet, desktop)
- [ ] Stripe webhook testing with production keys
- [ ] Account Settings page polish
- [ ] Performance monitoring setup
- [ ] Backup strategy configured

### Post-Launch
- [ ] Regular backups scheduled
- [ ] User analytics tracking
- [ ] Accessibility audit
- [ ] SEO optimization
- [ ] Error monitoring (Sentry, etc.)

---

## Troubleshooting

### If Deployment Fails
1. Check GitHub Actions logs
2. Check DO App Platform logs
3. Verify environment variables
4. Test database connection
5. Check health endpoints

### Common Issues
- **Build fails:** Check dependencies in package.json
- **Database connection:** Verify MongoDB URI and IP whitelist
- **Auth issues:** Check JWT_SECRET is set
- **Stripe errors:** Verify production keys

---

## Environment Variables

### Backend
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NODE_ENV=production
PORT=5003
```

### Frontend
```env
REACT_APP_API_URL=https://api.yourapp.com
REACT_APP_STRIPE_PUBLIC_KEY=...
```

---

**Last Updated:** 2025-10-08
