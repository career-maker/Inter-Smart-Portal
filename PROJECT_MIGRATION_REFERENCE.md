# Inter Smart Employee Portal - Complete Migration Reference Guide

**Last Updated:** 2026-07-14  
**Status:** Production Live + Office Testing Setup Ready  
**Purpose:** Single comprehensive reference for all project infrastructure, credentials, and deployment procedures

---

## Table of Contents

1. [GitHub Repository](#1-github-repository)
2. [Production Environment (LIVE - office branch)](#2-production-environment-live---office-branch)
3. [Testing Environment (main branch)](#3-testing-environment-main-branch)
4. [Supabase Database Configuration](#4-supabase-database-configuration)
5. [Environment Variables](#5-environment-variables)
6. [API Keys & Credentials Structure](#6-api-keys--credentials-structure)
7. [Deployment Procedures](#7-deployment-procedures)
8. [DNS Configuration](#8-dns-configuration)
9. [GitHub Workflow](#9-github-workflow)
10. [Quick Commands Reference](#10-quick-commands-reference)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [Emergency Procedures](#12-emergency-procedures)

---

## 1. GitHub Repository

### Repository Details
```
Repository Name: Inter-Smart-Portal
Repository URL: https://github.com/career-maker/Inter-Smart-Portal.git
Remote Name: origin
Owner: career-maker
Visibility: Private
Language: PHP (Backend), TypeScript/Next.js (Frontend)
```

### Branch Strategy
```
office
├── Status: PRODUCTION (LIVE)
├── Frontend: Vercel (intersmart-portal.vercel.app)
├── Backend: Render
├── Database: Supabase
├── Protection: Require PR, Status checks, Branch up-to-date
└── Deploy Trigger: Auto-deploy on push

main
├── Status: TESTING/STAGING
├── Frontend: Vercel (workplace.intersmart.in)
├── Backend: cPanel (173.249.159.38)
├── Database: Office PostgreSQL
├── Protection: Status checks required
└── Deploy Trigger: Auto-deploy on push

feature/*
├── Created from: main branch
├── PR to: main (testing first)
├── After stable: PR to office (production)
└── Naming: feature/xyz, fix/xyz, docs/xyz
```

### GitHub Secrets (if using Actions)
```
VERCEL_TOKEN: <obtain from Vercel Account Settings>
```

---

## 2. Production Environment (LIVE - office branch)

### Frontend - Vercel

**Project Configuration:**
```
Project Name: intersmart-portal
Dashboard: https://vercel.com/dashboard
Framework: Next.js 16 (App Router)
Build Command: pnpm run build
Dev Command: pnpm run dev
Root Directory: frontend
Node Version: 18.x
Package Manager: pnpm
```

**Domain Configuration:**
```
Primary Domain: intersmart-portal.vercel.app
Production URL: https://intersmart-portal.vercel.app
SSL: Auto-provisioned by Vercel
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL: https://your-render-api.onrender.com/api
```

### Backend - Render

**Service Configuration:**
```
Service Name: [Your Render API Service]
Dashboard: https://dashboard.render.com
Platform: Docker-based (Ubuntu)
Runtime: PHP 8.2 + Apache
Web Service Type: Web Service
Auto-Deploy: Enabled
Build Command: npm install (frontend only)
Start Command: See Dockerfile
```

**Dockerfile Location:**
```
backend/Dockerfile
Key startup scripts:
  1. php artisan storage:link --force
  2. php artisan migrate --force
  3. Apache starts
```

**Environment Variables (set in Render dashboard):**
```
APP_NAME: Intersmart Employee Portal
APP_ENV: production
APP_KEY: <base64 encoded key>
APP_URL: https://your-render-api.onrender.com/api
DB_CONNECTION: pgsql
DB_HOST: [from Supabase]
DB_PORT: 5432
DB_DATABASE: postgres
DB_USERNAME: postgres.[user]
DB_PASSWORD: [Supabase password]
MAIL_MAILER: smtp
MAIL_HOST: [company SMTP]
MAIL_PORT: 587
MAIL_USERNAME: [noreply email]
MAIL_PASSWORD: [email password]
MAIL_FROM_ADDRESS: noreply@intersmart.in
SANCTUM_STATEFUL_DOMAINS: intersmart-portal.vercel.app
SESSION_DRIVER: cookie
```

---

## 3. Testing Environment (main branch)

### Frontend - Vercel (Office Testing)

**Project Configuration:**
```
Project Name: intersmart-office
Dashboard URL: https://vercel.com/dashboard
Branch: main
Framework: Next.js 16
Root Directory: frontend
```

**Domain Configuration:**
```
Primary Domain: workplace.intersmart.in
Testing URL: https://workplace.intersmart.in
SSL: Auto-provisioned by Vercel (Let's Encrypt via cPanel)
```

**Environment Variables:**
```
NEXT_PUBLIC_API_URL: https://workplace.intersmart.in/api
```

### Backend - cPanel (Office Server)

**Server Configuration:**
```
Provider: cPanel Hosting
Domain: workplace.intersmart.in
Server IP: 173.249.159.38
Port: Standard (80/443 via cPanel)
cPanel Username: workplaceintersm
cPanel Password: f5D0&gdUeU)*e{^v#2
SSH Access: ssh workplaceintersm@173.249.159.38
cPanel URL: https://workplace.intersmart.in:2083 or https://173.249.159.38:2083
Quota: 30 GB
Package: smart30
Support Contact: systemadmin@intersmart.in
```

**PHP Configuration:**
```
Version: PHP 8.2
Extensions Required:
  - php-pdo
  - php-pgsql
  - php-mbstring
  - php-curl
  - php-zip
  - php-gd
  - php-json
  - mod_rewrite
Settings:
  post_max_size: 50M
  upload_max_filesize: 50M
  max_execution_time: 300
  memory_limit: 256M
```

**Database Configuration:**
```
Type: PostgreSQL (cPanel managed)
Database Name: intersmart_office
Database User: intersmart_user
Database Password: [strong password set during setup]
Host: localhost
Port: 5432
Connection String: psql -h localhost -U intersmart_user -d intersmart_office
```

**Environment Variables (.env on cPanel):**
```
APP_NAME: Intersmart Employee Portal - Office
APP_ENV: production
APP_KEY: [generate via php artisan key:generate]
APP_URL: https://workplace.intersmart.in/api
DB_CONNECTION: pgsql
DB_HOST: localhost
DB_PORT: 5432
DB_DATABASE: intersmart_office
DB_USERNAME: intersmart_user
DB_PASSWORD: [office-db-password]
MAIL_MAILER: smtp
MAIL_HOST: [company SMTP]
MAIL_PORT: 587
MAIL_USERNAME: [noreply email]
MAIL_PASSWORD: [email password]
MAIL_FROM_ADDRESS: noreply@intersmart.in
SANCTUM_STATEFUL_DOMAINS: workplace.intersmart.in
SESSION_DRIVER: cookie
CACHE_DRIVER: file
QUEUE_DRIVER: sync
```

---

## 4. Supabase Database Configuration

### Supabase Project Details

**Connection Information:**
```
Provider: Supabase (PostgreSQL 15+)
Host: aws-1-ap-northeast-1.pooler.supabase.com
Port: 5432
Database: postgres
Username: postgres.shczwbwsrnrygmmvyeue
Password: Abhihere1234@
Direct URL: postgresql://postgres.shczwbwsrnrygmmvyeue:Abhihere1234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**⚠️ SECURITY NOTE:**
These are PRODUCTION credentials. Store securely:
- Never commit to git
- Use environment variables on production servers
- Rotate passwords regularly
- Use read-only roles for backups

**Connection Usage:**
```env
# In Render .env:
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.shczwbwsrnrygmmvyeue
DB_PASSWORD=Abhihere1234@

# Or use DATABASE_URL:
DATABASE_URL=postgresql://postgres.shczwbwsrnrygmmvyeue:Abhihere1234@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres
```

**Key Tables:**
```
users - Employee accounts and profiles
teams - Departments
leave_balances - Leave allocation tracking
leave_balance_audit_logs - Audit trail for balance changes
leave_requests - Leave applications
attendance - Check-in/check-out records
And all other application tables (see CLAUDE.md for full schema)
```

**Backup & Recovery:**
```
Export via pg_dump:
  pg_dump --host=aws-1-ap-northeast-1.pooler.supabase.com \
          --username=postgres.shczwbwsrnrygmmvyeue \
          --password \
          --dbname=postgres > backup.sql

Restore:
  psql --host=[target] --username=[user] --dbname=[db] < backup.sql
```

---

## 5. Environment Variables

### Summary by Environment

#### Production (Render + Vercel office branch)
**Frontend (.env.local in Vercel):**
```
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api
```

**Backend (Render environment variables):**
```
APP_ENV=production
APP_DEBUG=false
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_USERNAME=postgres.shczwbwsrnrygmmvyeue
DB_PASSWORD=Abhihere1234@
SANCTUM_STATEFUL_DOMAINS=intersmart-portal.vercel.app
```

#### Testing (cPanel + Vercel main branch)
**Frontend (.env.local in Vercel):**
```
NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
```

**Backend (.env on cPanel):**
```
APP_ENV=production
APP_DEBUG=false
DB_HOST=localhost
DB_USERNAME=intersmart_user
DB_PASSWORD=[office-password]
SANCTUM_STATEFUL_DOMAINS=workplace.intersmart.in
```

#### Local Development
**Frontend (.env.local):**
```
NEXT_PUBLIC_API_URL=http://localhost:8765/api
```

**Backend (.env):**
```
APP_ENV=local
APP_DEBUG=true
DB_CONNECTION=pgsql
DB_HOST=localhost
DB_DATABASE=intersmart_dev
DB_USERNAME=[local-user]
DB_PASSWORD=[local-password]
```

---

## 6. API Keys & Credentials Structure

### What Credentials Are Needed

**⚠️ NEVER commit actual credentials to git. Always use `.gitignore`:**

```
backend/.env
backend/.env.*.local
frontend/.env.local
.env
.env.production
.env.local
```

### Credential Categories

#### 1. Database Credentials
```
Type: PostgreSQL
Needed for: Backend API connection
Environments:
  - Supabase (Production)
  - cPanel PostgreSQL (Office/Testing)
  - Local PostgreSQL/MySQL (Development)
Format: HOST, PORT, USERNAME, PASSWORD, DATABASE
```

#### 2. Application Keys
```
APP_KEY (Laravel)
Format: base64:xxxxx
Generation: php artisan key:generate
Needed on: Every environment
Purpose: Encryption key for sessions, cookies, cache
```

#### 3. SMTP/Mail Credentials
```
MAIL_HOST: Company SMTP server
MAIL_PORT: 587 (TLS) or 465 (SSL)
MAIL_USERNAME: noreply@intersmart.in
MAIL_PASSWORD: [email account password]
Purpose: Send notifications, approvals, etc.
```

#### 4. Third-Party API Keys (Future)
```
Structure:
  - API_KEY
  - API_SECRET
  - API_URL
  - API_WEBHOOK_SECRET
Purpose: Integrations (if any)
```

### Credential Rotation Policy

**Recommended Schedule:**
- Database passwords: Every 90 days
- Application keys: On major deployment
- SMTP passwords: Every 180 days
- API keys: Per provider recommendations

**Update Procedure:**
1. Generate new credential
2. Update environment variable
3. Restart service
4. Test connectivity
5. Document change in changelog

---

## 7. Deployment Procedures

### Production Deployment (office branch → Vercel + Render)

**Prerequisites:**
- All changes tested on main branch (testing environment)
- Stable for at least 24-48 hours
- Code reviewed
- No critical issues

**Steps:**

```bash
# 1. Ensure office branch is protected
# 2. Create PR: main → office in GitHub

# 3. Verify changes in PR
#    - Check code diff
#    - Review database migrations
#    - Verify environment variables

# 4. Merge PR to office branch
#    - GitHub auto-deploys to Vercel (intersmart-portal)
#    - Render auto-deploys backend API

# 5. Monitor deployment
#    - Check Vercel logs: https://vercel.com/dashboard
#    - Check Render logs: https://dashboard.render.com
#    - Wait for "Ready" status

# 6. Verify production
curl https://intersmart-portal.vercel.app
curl https://your-render-api.onrender.com/api/ping

# 7. Monitor for 24 hours
#    - Check error logs
#    - Test critical flows
#    - Monitor user feedback
```

### Testing Deployment (feature → main branch)

**Steps:**

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/xyz

# 2. Make changes
# ... code changes ...

# 3. Commit and push
git add .
git commit -m "feat: description"
git push -u origin feature/xyz

# 4. Create PR: feature/xyz → main
#    - GitHub branch deploys to Vercel (workplace.intersmart.in)
#    - Test on staging version

# 5. After testing, merge to main
#    - Vercel auto-deploys to workplace.intersmart.in

# 6. Keep testing version stable for 24-48 hours

# 7. Only then: Create PR main → office (production)
```

### Database Migration Deployment

**For both environments:**

```bash
# 1. Create migration file
php artisan make:migration create_table_name

# 2. Edit migration file
# backend/database/migrations/YYYY_MM_DD_HHMMSS_create_table_name.php

# 3. Commit to GitHub (feature → main → office)

# 4. On office branch merge:
#    Render runs: php artisan migrate --force (automatic)

# 5. On main branch merge:
#    SSH to cPanel and run: php artisan migrate --force

# 6. Test migration
psql -U [user] -d [db] -c "\dt"  # List tables
```

### Rollback Procedure

**If deployment fails:**

```bash
# Revert last commit on affected branch
git revert HEAD
git push origin [branch-name]

# Services auto-redeploy with reverted code
# Alternative: git reset --hard HEAD~1 (if not yet pushed)
```

---

## 8. DNS Configuration

### DNS Records for Production

**Domain:** intersmart-portal.vercel.app (auto-managed by Vercel)
```
Type: CNAME (handled by Vercel)
No manual DNS configuration needed
```

### DNS Records for Testing/Office

**Domain:** workplace.intersmart.in

```
Record Type  | Host                        | Value/Target
-------------|-----------------------------|-----------------------------------------
A            | workplace.intersmart.in     | 173.249.159.38
CNAME        | www.workplace.intersmart.in | workplace.intersmart.in
TXT          | (Vercel verification)      | (if needed, Vercel provides)
```

**DNS Propagation Check:**
```bash
nslookup workplace.intersmart.in
# Should return: 173.249.159.38

dig workplace.intersmart.in @8.8.8.8
# Verify resolution
```

**SSL Certificates:**
```
Production (intersmart-portal.vercel.app):
  - Managed by Vercel
  - Auto-renewal enabled
  - No action needed

Testing (workplace.intersmart.in):
  - Auto-installed via cPanel AutoSSL (Let's Encrypt)
  - Renews automatically
  - Check in cPanel → AutoSSL → Manage SSL Sites
```

---

## 9. GitHub Workflow

### Complete Development Workflow

```
Step 1: Create feature branch
  └─ git checkout main
  └─ git checkout -b feature/your-feature

Step 2: Make changes & commit
  └─ git add .
  └─ git commit -m "feat: add feature"
  └─ git push -u origin feature/your-feature

Step 3: Create PR to main (Testing)
  └─ Review on workplace.intersmart.in (auto-deployed)
  └─ Test thoroughly
  └─ Get approval

Step 4: Merge to main
  └─ Auto-deploy to workplace.intersmart.in
  └─ Monitor for 24-48 hours

Step 5: Create PR main → office (Production)
  └─ Final review (this is production!)
  └─ Verify all changes

Step 6: Merge to office
  └─ Auto-deploy to intersmart-portal.vercel.app
  └─ Auto-deploy backend to Render
  └─ Monitor production

Step 7: Tag release (optional)
  └─ git tag -a v1.x.x -m "Release notes"
  └─ git push --tags
```

### Branch Protection Rules

**main branch:**
- ✅ Require pull request reviews (1 approval)
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators

**office branch:**
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ⚠️ PR reviews (optional for speed)

---

## 10. Quick Commands Reference

### GitHub Operations

```bash
# Clone repository
git clone https://github.com/career-maker/Inter-Smart-Portal.git

# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/xyz

# Push changes
git add .
git commit -m "feat: description"
git push -u origin feature/xyz

# Update main from office (production fixes)
git checkout main
git pull origin main
git fetch origin office
git merge origin/office

# Tag release
git tag -a v1.x.x -m "Version 1.x.x"
git push --tags
```

### Vercel Operations

**Check deployment status:**
- Production: https://vercel.com/dashboard → intersmart-portal
- Testing: https://vercel.com/dashboard → intersmart-office

**Manual deployment (rare):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Render Backend Operations

```bash
# View logs
# https://dashboard.render.com → Your Backend Service → Logs

# Manual restart (if needed)
# https://dashboard.render.com → Service → Manual Redeploy

# Check deployed version
curl https://your-render-api.onrender.com/api/ping
```

### cPanel Backend Operations

```bash
# SSH access
ssh workplaceintersm@173.249.159.38

# Navigate to backend
cd ~/public_html/backend

# Run migrations
php artisan migrate --force

# Clear cache
php artisan config:cache
php artisan cache:clear

# Check logs
tail -f ~/public_html/backend/storage/logs/laravel.log

# Database operations
psql -U intersmart_user -d intersmart_office -c "SELECT COUNT(*) FROM users;"
```

### Database Operations

```bash
# Supabase backup
pg_dump --host=aws-1-ap-northeast-1.pooler.supabase.com \
        --username=postgres.shczwbwsrnrygmmvyeue \
        --password \
        --dbname=postgres > backup.sql

# Office DB backup
pg_dump -U intersmart_user -d intersmart_office > backup.sql

# Restore
psql -U [user] -d [db] < backup.sql

# Quick connection test
psql -h [host] -U [user] -d [db] -c "SELECT version();"
```

### Frontend Local Development

```bash
# Install dependencies
cd frontend
pnpm install

# Start dev server
pnpm run dev
# Runs on http://localhost:3000

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

### Backend Local Development

```bash
# Install dependencies
cd backend
composer install

# Start dev server
php artisan serve --port=8765
# Runs on http://localhost:8765/api

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Run migrations fresh
php artisan migrate:fresh --seed
```

---

## 11. Monitoring & Logs

### Production (Vercel + Render + Supabase)

**Vercel Logs:**
```
URL: https://vercel.com/dashboard → intersmart-portal → Deployments
What to watch: Build errors, runtime errors, deployment status
```

**Render Logs:**
```
URL: https://dashboard.render.com → Your Backend Service → Logs
What to watch: Database connection errors, Laravel errors, startup issues
Commands:
  curl https://your-render-api.onrender.com/api/ping
```

**Supabase Logs:**
```
URL: https://app.supabase.com → Your Project → Logs
What to watch: Database connection issues, slow queries
```

### Testing (Vercel + cPanel + Office DB)

**Vercel Logs (same as production):**
```
URL: https://vercel.com/dashboard → intersmart-office → Deployments
```

**cPanel Logs:**
```
SSH: ssh workplaceintersm@173.249.159.38
Laravel logs: tail -f ~/public_html/backend/storage/logs/laravel.log
Error logs: tail -f ~/public_html/backend/storage/logs/error.log
```

**Office Database:**
```
SSH: ssh workplaceintersm@173.249.159.38
Test connection: psql -U intersmart_user -d intersmart_office -c "SELECT 1;"
Monitor processes: psql -U intersmart_user -d intersmart_office -c "SELECT pid, query FROM pg_stat_statements WHERE query NOT LIKE '%pg_stat%';"
```

### Local Development Logs

```bash
# Laravel logs
tail -f backend/storage/logs/laravel.log

# Frontend dev server logs
# Check terminal where pnpm run dev is running

# Database errors
# Check PostgreSQL/MySQL logs on your system
```

---

## 12. Emergency Procedures

### Issue: Database Connection Fails

**Production (Supabase):**
```bash
# Test connection
psql -h aws-1-ap-northeast-1.pooler.supabase.com \
     -U postgres.shczwbwsrnrygmmvyeue \
     -d postgres \
     -c "SELECT 1;"

# Check Render environment variables
# https://dashboard.render.com → Environment

# Restart Render service
# https://dashboard.render.com → Manual Redeploy
```

**Testing (cPanel Office DB):**
```bash
# SSH
ssh workplaceintersm@173.249.159.38

# Test connection
psql -h localhost -U intersmart_user -d intersmart_office -c "SELECT 1;"

# Check credentials in .env
cat ~/public_html/backend/.env | grep DB_

# Restart services (if needed)
sudo systemctl restart php-fpm
sudo systemctl restart apache2
```

### Issue: Frontend Not Loading

**Steps:**
```bash
# 1. Check Vercel deployment status
#    https://vercel.com/dashboard → Recent deployments

# 2. Clear browser cache
#    Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

# 3. Check environment variable
#    Vercel → Settings → Environment Variables → NEXT_PUBLIC_API_URL

# 4. Check API connectivity
curl https://[api-url]/api/ping
#    Should return {"status":"alive"} or similar

# 5. Check browser console for errors
#    Open DevTools (F12) → Console tab
```

### Issue: API Returns 404 or 500

**Steps:**
```bash
# 1. Check Render/cPanel logs
#    Render: https://dashboard.render.com → Logs
#    cPanel: ssh and tail -f ~/public_html/backend/storage/logs/laravel.log

# 2. Verify .htaccess (cPanel only)
#    Should exist at ~/public_html/backend/public/.htaccess

# 3. Check mod_rewrite is enabled (cPanel)
#    In cPanel → Apache Modules → mod_rewrite should be enabled

# 4. Test API directly
curl -X GET https://[api-url]/api/ping

# 5. Check database connection
#    (see Database Connection Fails section)
```

### Issue: Stuck Deployment

**If deployment hangs:**
```bash
# Render:
#   1. Go to https://dashboard.render.com
#   2. Click "Cancel" on stuck deployment
#   3. Click "Manual Redeploy" to restart

# Vercel:
#   1. Go to https://vercel.com/dashboard
#   2. Click "Deployments"
#   3. Cancel stuck deployment
#   4. Go back to "Deployments" and check latest

# If still stuck, revert last commit:
git revert HEAD
git push origin [branch]
```

### Issue: Critical Data Corruption

**Recovery Steps:**
```bash
# 1. Stop accepting requests (take site down)

# 2. Backup current database state
pg_dump -U [user] -d [db] > backup-corrupted-$(date +%Y%m%d-%H%M%S).sql

# 3. Restore from latest clean backup
psql -U [user] -d [db] < backup-latest-clean.sql

# 4. Verify data integrity
psql -U [user] -d [db] -c "SELECT COUNT(*) FROM users;"
psql -U [user] -d [db] -c "SELECT COUNT(*) FROM leave_requests;"

# 5. Run migrations if schema changed
php artisan migrate --force

# 6. Bring application back online
```

---

## Credentials Checklist

### Before Migration, Collect:

- [x] GitHub repository URL and access credentials
- [x] GitHub branch names (office, main)
- [x] Supabase: Host, Port, Database, Username, Password
- [x] Render: Service name, API URL
- [x] Vercel: Project names and URLs (2 projects)
- [x] cPanel: IP, Username, Password, SSH access
- [x] Office PostgreSQL: Database name, Username, Password
- [x] Domain names and registrar access
- [x] SMTP credentials for email notifications
- [x] SSL certificate details (Let's Encrypt or paid)
- [x] APP_KEY (Laravel encryption key)
- [x] Any third-party API keys or webhooks

---

## Quick Reference Table

| Component | Production | Testing | Local |
|-----------|------------|---------|-------|
| **Frontend** | intersmart-portal.vercel.app | workplace.intersmart.in | localhost:3000 |
| **Backend** | Render API | cPanel (173.249.159.38) | localhost:8765 |
| **Database** | Supabase | Office PostgreSQL | Local PostgreSQL |
| **Branch** | office | main | feature/* |
| **Deploy** | Auto on push | Auto on push | Manual |
| **Domain** | vercel-managed | cPanel-managed | None |
| **SSL** | Vercel | cPanel AutoSSL | N/A |
| **Status** | LIVE | Staging | Development |

---

## Support Contacts

```
GitHub Issues: https://github.com/career-maker/Inter-Smart-Portal/issues
Vercel Support: https://vercel.com/support
Render Support: https://render.com/support
Supabase Support: https://supabase.com/support
cPanel Host Support: systemadmin@intersmart.in
Domain Registrar: [Your registrar support]
```

---

## Version History

| Date | Version | Status | Changes |
|------|---------|--------|---------|
| 2026-07-14 | 1.0 | Active | Initial comprehensive migration guide |

---

**End of Migration Reference Guide**

For specific implementation details, refer to:
- `CLAUDE.md` - Project rules and architecture
- `COMPLETE_DEPLOYMENT_GUIDE.md` - Detailed deployment steps
- `OFFICE_DEPLOYMENT_GUIDE.md` - Office server setup
- `GIT_BRANCH_STRATEGY.md` - Git workflow details

