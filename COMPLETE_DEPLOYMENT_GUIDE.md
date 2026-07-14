# Complete Deployment Guide: Office Server + Vercel + Custom Domain

**Last Updated:** 2026-07-14  
**Status:** Ready for Implementation  
**Timeline:** 1 Full Day

---

## Table of Contents
1. [GitHub Setup](#1-github-setup)
2. [Vercel Configuration](#2-vercel-configuration)
3. [Office Server (cPanel) Setup](#3-office-server-cPanel-setup)
4. [Domain Configuration](#4-domain-configuration)
5. [Complete Deployment Checklist](#5-complete-deployment-checklist)
6. [Testing & Verification](#6-testing--verification)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. GitHub Setup

### 1.1 Branch Structure (ALREADY DONE ✅)
```bash
# ✅ Branches created and ready
# office branch = Production (LIVE) - Vercel + Render + Supabase
# main branch = Testing - Vercel + cPanel + Office DB
git branch -a
```

**Current Status:**
- ✅ `office` branch: **Production** (Vercel + Render + Supabase) — **LIVE SYSTEM**
- ✅ `main` branch: **Testing** (Vercel + cPanel + Office DB) — Staging/Testing

### 1.2 Branch Protection Rules

**STEP 1: Protect office branch (Production)**
1. Go to GitHub: https://github.com/career-maker/Inter-Smart-Portal
2. Click **Settings** → **Branches**
3. Click **Add rule** under "Branch protection rules"
4. Branch name pattern: `office`
5. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1 or 2 for safety)
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators

**STEP 2: Protect main branch (Testing)**
1. Click **Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date before merging
   - ⚠️ PR reviews optional (faster testing cycle)

### 1.3 GitHub Secrets (if using Actions)
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add `VERCEL_TOKEN`:
   - Go to Vercel → Account Settings → Tokens
   - Create new token
   - Copy and paste in GitHub Secrets

---

## 2. Vercel Configuration

### 2.1 Production Vercel Project (office branch - LIVE)

**Already exists:** `intersmart-portal`
- Domain: intersmart-portal.vercel.app
- **Branch: office** (Production - LIVE)
- Auto-deploy: Yes

**Verify settings:**
1. Go to https://vercel.com/dashboard
2. Select `intersmart-portal` project
3. Go to **Settings** → **Environment Variables**
4. Verify:
   ```
   NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api
   ```
5. Go to **Settings** → **Git** and ensure branch is `office`

### 2.2 Create New Vercel Project for Testing (main branch)

**STEP 1: Create new project**
1. Go to https://vercel.com/new
2. Select **Import Project**
3. Select **GitHub**
4. Search and select: `Inter-Smart-Portal`

**STEP 2: Configure project**
1. **Project Name:** `intersmart-office` (or `intersmart-testing`)
2. **Framework:** Next.js
3. **Root Directory:** `frontend`
4. **Build Command:** `pnpm run build`
5. **Output Directory:** `.next`

**STEP 3: Connect main branch (Testing)**
1. Scroll to **Branch Configuration**
2. Click **Add**
3. **Production Branch:** `main` (Testing/Staging branch)
4. **Environment:** Production

**STEP 4: Add Environment Variables**
1. Go to **Settings** → **Environment Variables**
2. Add new variable:
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: https://workplace.intersmart.in/api
   ```

**STEP 5: Deploy**
1. Click **Deploy**
2. Wait for build to complete
3. Vercel will deploy to a temporary URL (will become workplace.intersmart.in after DNS)

---

## 3. Office Server (cPanel) Setup

### 3.1 Access cPanel

```
URL: https://workplace.intersmart.in:2083
Or: https://173.249.159.38:2083
Username: workplaceintersm
Password: f5D0&gdUeU)*e{^v#2
```

### 3.2 PHP Configuration

**STEP 1: Select PHP Version**
1. In cPanel, find **Select PHP Version**
2. Choose: **PHP 8.2**
3. Keep Extensions view open

**STEP 2: Verify Extensions**
Click **Extensions** and ensure enabled:
- ✅ curl
- ✅ gd
- ✅ json
- ✅ mbstring
- ✅ pdo
- ✅ pgsql (PostgreSQL)
- ✅ zip

If any missing, enable them now.

**STEP 3: Configure PHP Settings**
1. Find **PHP Configuration Editor** or **php.ini**
2. Update:
   ```
   post_max_size = 50M
   upload_max_filesize = 50M
   max_execution_time = 300
   memory_limit = 256M
   ```

### 3.3 Database Setup (PostgreSQL)

**STEP 1: Create Database**
1. In cPanel, find **PostgreSQL Databases**
2. Click **Create New Database**
3. Database Name: `intersmart_office`
4. Click **Create Database**

**STEP 2: Create Database User**
1. In PostgreSQL Databases → **Create New User**
2. Username: `intersmart_user`
3. Password: `<Create strong password>`
4. Confirm password
5. Click **Create User**

**STEP 3: Add User to Database**
1. In PostgreSQL Databases → **Manage User Privileges**
2. Select User: `intersmart_user`
3. Select Database: `intersmart_office`
4. Enable: **All Privileges**
5. Click **Update**

**STEP 4: Verify Connection (via Terminal)**
```bash
# SSH into cPanel
ssh workplaceintersm@173.249.159.38

# Test database connection
psql -h localhost -U intersmart_user -d intersmart_office -c "SELECT version();"

# Should show PostgreSQL version
```

### 3.4 Import Data from Supabase

**STEP 1: Export from Supabase (on your local machine)**
```bash
# Download backup from Supabase or use pg_dump
pg_dump --host=<supabase-host> \
        --username=postgres \
        --password \
        --dbname=postgres > backup.sql
```

**STEP 2: Upload backup to cPanel**
1. In cPanel → **File Manager**
2. Navigate to **public_html**
3. Upload `backup.sql`

**STEP 3: Import to Office Database**
```bash
# SSH into cPanel
ssh workplaceintersm@173.249.159.38

# Navigate to home
cd ~

# Import backup
psql -U intersmart_user -d intersmart_office < backup.sql

# Verify import
psql -U intersmart_user -d intersmart_office -c "SELECT COUNT(*) FROM users;"
```

### 3.5 Deploy Backend Code

**STEP 1: Clone Repository**
```bash
# SSH into cPanel
ssh workplaceintersm@173.249.159.38

# Navigate to public_html
cd ~/public_html

# Clone repo (if not already cloned)
git clone https://github.com/career-maker/Inter-Smart-Portal.git temp
mv temp/* .
rm -rf temp

# Checkout office branch
git checkout office
```

**STEP 2: Install Dependencies**
```bash
# Navigate to backend
cd ~/public_html/backend

# Install Composer packages
composer install --no-dev --optimize-autoloader
```

**STEP 3: Configure Environment**
```bash
# Copy example file
cp .env.example .env

# Edit .env with office configuration
nano .env
```

**STEP 4: Update .env Content**
```env
APP_NAME="Intersmart Employee Portal - Office"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://workplace.intersmart.in

LOG_CHANNEL=stack
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=intersmart_office
DB_USERNAME=intersmart_user
DB_PASSWORD=<your-office-db-password>

CACHE_DRIVER=file
SESSION_DRIVER=cookie
QUEUE_DRIVER=sync

MAIL_MAILER=smtp
MAIL_HOST=<company-smtp-server>
MAIL_PORT=587
MAIL_USERNAME=<noreply-email>
MAIL_PASSWORD=<mail-password>
MAIL_FROM_ADDRESS="noreply@intersmart.in"
MAIL_FROM_NAME="Intersmart Employee Portal"

SANCTUM_STATEFUL_DOMAINS=workplace.intersmart.in
SESSION_DRIVER=cookie
```

**STEP 5: Generate APP_KEY**
```bash
php artisan key:generate
```

**STEP 6: Run Migrations**
```bash
php artisan migrate --force
```

**STEP 7: Seed Data (if fresh setup)**
```bash
php artisan db:seed
```

**STEP 8: Create Storage Link**
```bash
php artisan storage:link --force
```

**STEP 9: Set File Permissions**
```bash
chmod -R 755 ~/public_html/backend/storage
chmod -R 755 ~/public_html/backend/bootstrap/cache
chmod -R 644 ~/public_html/backend/storage/app/public/*
```

**STEP 10: Clear Caches**
```bash
php artisan config:cache
php artisan view:cache
php artisan cache:clear
```

### 3.6 Configure Apache/Routing

**STEP 1: Setup .htaccess**
1. In cPanel → **File Manager**
2. Navigate to `public_html/backend/public/`
3. Create `.htaccess` file:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteRule ^ index.php [QSA,L]
</IfModule>

<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

**STEP 2: Configure Addon Domain**
1. In cPanel → **Addon Domains**
2. Click **Add Addon Domain**
3. New Domain Name: `workplace.intersmart.in`
4. Document Root: `public_html/backend/public`
5. Click **Add Domain**

**STEP 3: Enable SSL**
1. In cPanel → **AutoSSL**
2. Manage SSL Sites
3. Enable SSL for `workplace.intersmart.in`
4. Certificate will auto-install from Let's Encrypt

---

## 4. Domain Configuration

### 4.1 DNS Records

Contact your domain registrar (likely same as cPanel host) and add:

```
Type    | Subdomain                  | Value
--------|----------------------------|----------------------------------
A       | workplace.intersmart.in    | 173.249.159.38
CNAME   | www.workplace.intersmart.in| workplace.intersmart.in
TXT     | (Vercel verification)      | (Vercel provides this, if needed)
```

**STEP 1: Add A Record**
1. Log in to domain registrar
2. Go to DNS Settings
3. Add A Record:
   - Host: `workplace.intersmart.in`
   - Value: `173.249.159.38`
   - TTL: 3600

**STEP 2: Add CNAME Record**
1. Add CNAME Record:
   - Host: `www.workplace.intersmart.in`
   - Value: `workplace.intersmart.in`
   - TTL: 3600

**STEP 3: Verify DNS Propagation**
```bash
# Test DNS resolution
nslookup workplace.intersmart.in

# Should return: 173.249.159.38
```

### 4.2 Connect Vercel Domain

**STEP 1: In Vercel Dashboard**
1. Go to https://vercel.com/dashboard
2. Select `intersmart-office` project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**

**STEP 2: Add Domain**
1. Enter: `workplace.intersmart.in`
2. Click **Add**

**STEP 3: Configure Domain**
Vercel may provide DNS records to add (usually handled by cPanel):
- If needed, add provided records in domain registrar
- Otherwise, DNS from Step 4.1 should work

**STEP 4: Wait for SSL**
- Vercel will auto-provision SSL certificate
- Takes 5-10 minutes
- Status will show "Valid Configuration"

---

## 5. Complete Deployment Checklist

### GitHub Setup ✅
- [x] office branch created from main
- [x] Branch protection rules set for main
- [x] Branch protection rules set for office
- [x] GitHub Secrets configured (optional)

### Office Server (cPanel) ✅
- [ ] SSH access verified
- [ ] PHP 8.2 selected
- [ ] Required extensions enabled
- [ ] PHP settings updated (50M uploads, 256M memory)
- [ ] PostgreSQL database created
- [ ] Database user created with privileges
- [ ] Data imported from Supabase
- [ ] Backend code cloned from office branch
- [ ] Composer dependencies installed
- [ ] .env file configured
- [ ] APP_KEY generated
- [ ] Migrations run
- [ ] Database seeded
- [ ] Storage link created
- [ ] File permissions set (755/644)
- [ ] Caches cleared
- [ ] .htaccess configured
- [ ] Addon domain configured
- [ ] SSL certificate installed

### Vercel Setup ✅
- [ ] Production project `intersmart-portal` verified
- [ ] New project `intersmart-office` created
- [ ] office branch connected
- [ ] Environment variables set:
  - [ ] NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
- [ ] Project deployed successfully
- [ ] Domain added to Vercel
- [ ] SSL certificate provisioned

### Domain Configuration ✅
- [ ] A record added: workplace.intersmart.in → 173.249.159.38
- [ ] CNAME record added: www → workplace.intersmart.in
- [ ] DNS propagation verified
- [ ] Domain connected to Vercel

---

## 6. Testing & Verification

### 6.1 Backend API Testing

```bash
# Test API endpoint
curl -X GET https://workplace.intersmart.in/api/ping

# Should return: {"status":"alive"}

# Test with authentication (if needed)
curl -X POST https://workplace.intersmart.in/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@intersmart.in","password":"password"}'
```

### 6.2 Database Testing

```bash
# SSH into cPanel
ssh workplaceintersm@173.249.159.38

# Test database connection
psql -U intersmart_user -d intersmart_office -c "\dt"

# Should list all tables
```

### 6.3 Frontend Testing

1. **Visit office version:** https://workplace.intersmart.in
2. **Expected behavior:**
   - Page loads with no errors
   - Login form appears
   - CSS/styling loads correctly

3. **Test login:**
   - Email: admin@intersmart.in
   - Password: (from seeder)
   - Should redirect to dashboard

4. **Test API connection:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Perform an action (e.g., load employees)
   - Verify API calls to https://workplace.intersmart.in/api/...
   - Status should be 200 OK

### 6.4 Verify Both Versions Work

**Production Version:**
1. Visit: https://intersmart-portal.vercel.app
2. Verify login works
3. Check API: https://your-render-api.onrender.com/api/ping

**Office Version:**
1. Visit: https://workplace.intersmart.in
2. Verify login works
3. Check API: https://workplace.intersmart.in/api/ping

---

## 7. Troubleshooting

### Issue: API returns 404

**Solution:**
1. SSH into cPanel:
   ```bash
   ssh workplaceintersm@173.249.159.38
   tail -f ~/public_html/api/storage/logs/laravel.log
   ```
2. Check logs for errors
3. Verify .htaccess exists in `public_html/backend/public/`
4. Verify mod_rewrite enabled in cPanel

### Issue: Database Connection Error

**Solution:**
```bash
# Test connection
psql -h localhost -U intersmart_user -d intersmart_office -c "SELECT 1;"

# Verify user has privileges
psql -h localhost -U postgres -c "\du intersmart_user"
```

### Issue: SSL Certificate Not Showing

**Solution:**
1. In cPanel → AutoSSL → Manage SSL Sites
2. Enable SSL for workplace.intersmart.in
3. Wait 5-10 minutes
4. Clear browser cache

### Issue: Frontend Not Loading

**Solution:**
1. Check Vercel deployment logs
2. Verify Environment Variable: NEXT_PUBLIC_API_URL
3. Check browser console (F12) for errors
4. Clear browser cache

### Issue: Uploads Not Working

**Solution:**
```bash
# Check storage permissions
ls -la ~/public_html/backend/storage/

# Should be: drwxr-xr-x (755)

# Fix if needed
chmod -R 755 ~/public_html/backend/storage
chmod -R 755 ~/public_html/backend/bootstrap/cache
```

---

## 8. Quick Reference Commands

### SSH Access
```bash
ssh workplaceintersm@173.249.159.38
```

### Check Status
```bash
# Backend is running
curl https://workplace.intersmart.in/api/ping

# Database is responding
psql -U intersmart_user -d intersmart_office -c "SELECT COUNT(*) FROM users;"

# Check logs
tail -f ~/public_html/backend/storage/logs/laravel.log
```

### Emergency Restart (if needed)
```bash
# In cPanel → Restart Services or via SSH
sudo systemctl restart php-fpm
sudo systemctl restart apache2
```

### Backup Database
```bash
pg_dump -U intersmart_user -d intersmart_office > backup-$(date +%Y%m%d).sql
```

---

## 9. Next Steps After Deployment

### Once Everything is Live:

1. **Monitor for 24-48 hours:**
   - Check logs regularly
   - Test all features
   - Verify no errors

2. **Set up automated backups:**
   - Daily database backups
   - Store backup files securely

3. **Configure monitoring:**
   - Set up error alerts
   - Monitor API response times
   - Check database performance

4. **Document access credentials:**
   - Keep secure list of:
     - cPanel access
     - Database credentials
     - Admin email/password
     - Vercel project access

5. **Create runbook:**
   - How to restart services
   - How to check logs
   - How to backup/restore
   - Emergency contacts

---

## 10. Support Contacts

- **cPanel Host Support:** systemadmin@intersmart.in
- **Domain Registrar:** (your registrar support)
- **Vercel Support:** https://vercel.com/support
- **GitHub Support:** https://github.com/support

---

## Summary

✅ **GitHub:** Both branches ready
   - `office` = Production (LIVE)
   - `main` = Testing (Staging)

✅ **Current Production (office branch):**
   - Vercel (intersmart-portal.vercel.app)
   - Render Backend API
   - Supabase Database
   - Status: LIVE & RUNNING

✅ **Testing (main branch) - Ready to deploy:**
   - Vercel (workplace.intersmart.in)
   - cPanel Backend (173.249.159.38)
   - Office PostgreSQL Database
   - Status: Ready for implementation

✅ **Workflow:** Features → main (test) → office (production)

🚀 **Status:** Ready for deployment!

---

**Total Estimated Time:** 1 full day for cPanel + Vercel setup
**Complexity:** Intermediate  
**Risk Level:** Low (testing on main branch, no impact to live office branch)

