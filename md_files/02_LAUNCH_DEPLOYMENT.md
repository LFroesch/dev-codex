# Launch & Deployment Guide - Dev Codex v1.0

## 🚀 **Project Overview**

**Dev Codex** - MERN stack project management platform  
- **Frontend**: React 18 + TypeScript + Vite (200KB gzipped, 32 themes included)  
- **Backend**: Express + MongoDB + Socket.io  
- **Features**: Projects, team collaboration, analytics, billing (Stripe)

---

## ⚙️ **Phase 1: Environment & Security Setup**

### Production Environment Configuration
- [ ] **Create production .env files** (backend & frontend)
- [ ] **Remove hardcoded credentials** from any remaining files
- [ ] **Set up environment variable templates** for deployment
- [ ] **Configure MongoDB connection** for production
- [ ] **Update authentication settings** for production domains
- [ ] **Security dependency audit** - Update all vulnerable packages

### Production Environment Variables

**Backend `.env.production`:**

```env
NODE_ENV=production
PORT=5003
MONGODB_URI=mongodb+srv://[PRODUCTION_CREDENTIALS]
JWT_SECRET=[SECURE_RANDOM_SECRET]
STRIPE_SECRET_KEY=[LIVE_KEY]
STRIPE_WEBHOOK_SECRET=[PRODUCTION_WEBHOOK]
GOOGLE_CLIENT_ID=[PRODUCTION_CLIENT_ID]
GOOGLE_CLIENT_SECRET=[PRODUCTION_SECRET]
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[PRODUCTION_EMAIL]
SMTP_PASS=[PRODUCTION_APP_PASSWORD]
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
```

**Frontend `.env.production`:**

```env
VITE_API_URL=https://api.yourdomain.com
VITE_STRIPE_PUBLISHABLE_KEY=[LIVE_PUBLISHABLE_KEY]
```

---

## 🐳 **Phase 2: Containerization**

### Docker Configuration Files

**Create these files:**
- [ ] **`backend/Dockerfile`** - Node.js production image
- [ ] **`frontend/Dockerfile`** - Nginx + built React app
- [ ] **`docker-compose.yml`** - Development/testing stack
- [ ] **`docker-compose.prod.yml`** - Production orchestration
- [ ] **`.dockerignore`** files (frontend & backend)
- [ ] **`nginx.conf`** - Reverse proxy configuration

### Build Configuration
- [ ] **Optimize Vite build** for production
- [ ] **Configure backend** for production mode
- [ ] **Test Docker builds** locally
- [ ] **Verify environment configs** work in containers

---

## 🗄️ **Phase 3: Database & External Services**

### MongoDB Production Setup
- [ ] **Production MongoDB Atlas** configuration
- [ ] **Database migration scripts** (if needed)
- [ ] **Backup/restore procedures** setup
- [ ] **Index optimization** for performance
- [ ] **Connection pooling** configuration
- [ ] **Test database connectivity** from production environment

### External Service Configuration
- [ ] **Email service setup** (Nodemailer/Gmail production)
- [ ] **Stripe webhook endpoints** for production
- [ ] **Google OAuth credentials** - production domain
- [ ] **Socket.io configuration** for production scaling

---

## 🔄 **Phase 4: CI/CD Pipeline**

### GitHub Actions Setup
- [ ] **Create `.github/workflows/deploy.yml`**
- [ ] **Automated testing pipeline** - run tests before deploy
- [ ] **Build verification** - ensure builds succeed
- [ ] **Deployment automation** - auto-deploy on main branch
- [ ] **Rollback procedures** - quick revert mechanism

### Pipeline Configuration

```yaml
# Example workflow structure
name: Deploy to Production
on:
  push:
    branches: [ main ]
jobs:
  test-and-deploy:
    - Build frontend & backend
    - Run test suites
    - Deploy to production
    - Verify deployment health
```

---

## 🌐 **Phase 5: Production Deployment**

### Hosting Platform Choice
**Choose one:**
- [ ] **Option A: VPS** (DigitalOcean, Linode, AWS EC2) - Full control
- [ ] **Option B: PaaS** (Railway, Render, Heroku) - Easier setup  
- [ ] **Option C: Container Service** (AWS ECS, Google Cloud Run) - Scalable

### Deployment Steps
- [ ] **Set up hosting platform** and configure resources
- [ ] **Configure domain** and DNS settings
- [ ] **Deploy application stack** (frontend + backend + database)
- [ ] **Set up SSL certificates** (Let's Encrypt or platform-provided)
- [ ] **Configure reverse proxy** (nginx or platform routing)
- [ ] **Verify all services** are running and accessible

---

## 🧪 **Phase 6: Production Testing & Verification**

### End-to-End Testing
- [ ] **User registration/login** flows
- [ ] **Google OAuth** authentication
- [ ] **Project CRUD** operations
- [ ] **Team collaboration** features
- [ ] **Real-time features** (Socket.io)
- [ ] **Billing system** (Stripe webhooks)
- [ ] **Email notifications** sending
- [ ] **Analytics tracking** functionality
- [ ] **Export/import** features
- [ ] **Public pages** and discovery

### Performance & Security
- [ ] **Load time verification** - < 2 seconds target
- [ ] **SSL certificate** validation
- [ ] **Security headers** check
- [ ] **Database performance** monitoring
- [ ] **Memory/CPU usage** baseline
- [ ] **Error logging** verification

---

## 📊 **Phase 7: Monitoring & Alerting Setup**

### Monitoring Infrastructure
- [ ] **Error logging** and tracking (Sentry/LogRocket)
- [ ] **Performance metrics** collection
- [ ] **Uptime monitoring** (UptimeRobot/Pingdom)
- [ ] **Database performance** tracking
- [ ] **SSL certificate** expiration monitoring
- [ ] **Custom alerting** for critical issues

---

## 🎯 **Go-Live Checklist**

### Final Verification Before Launch
- [ ] **All services running** and responsive
- [ ] **Database connectivity** verified
- [ ] **External integrations** working (Stripe, Google, Email)
- [ ] **SSL certificates** active and valid
- [ ] **DNS propagation** complete
- [ ] **Monitoring alerts** configured
- [ ] **Backup systems** tested
- [ ] **Team access** to monitoring dashboards

### Launch Communication
- [ ] **Internal team notification** - deployment complete
- [ ] **Documentation updated** with production URLs
- [ ] **User communication** (if beta users exist)
- [ ] **Social media announcement** (optional)

---

## 🚨 **Rollback Plan**

**If issues occur during deployment:**

1. **Immediate**: Revert to previous working deployment
2. **Database**: Restore from latest backup if needed
3. **DNS**: Point domain back to staging if necessary  
4. **Communication**: Alert team and users of temporary downtime
5. **Investigation**: Debug issues in staging environment
6. **Re-deploy**: Fix issues and re-attempt deployment

---

## ✅ **Success Criteria**

**Deployment considered successful when:**
- ✅ All application features work in production
- ✅ Performance meets targets (< 2s load time)
- ✅ No critical errors in logs
- ✅ SSL certificate active
- ✅ Monitoring systems operational
- ✅ Backups functioning

**Next**: Once deployment is stable → `03_POST_LAUNCH_MONITORING.md`

---

*Last Updated: 2025-08-20*  
*Estimated Duration: 2-3 days*
