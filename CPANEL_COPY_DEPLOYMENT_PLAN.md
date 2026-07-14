# Complete cPanel Deployment Plan - Project Copy
## With Vercel Frontend + cPanel Backend + cPanel Database

**Architecture:** Frontend (Vercel) + Backend (cPanel) + Database (cPanel PostgreSQL)  
**Git Branch:** office (production code)  
**Current Production:** 100% UNTOUCHED  
**Timeline:** 3-4 hours  
**Risk Level:** ZERO (completely isolated environment)

---

## 🎯 Final Architecture

```
CURRENT PRODUCTION (UNCHANGED):
  intersmart-portal.vercel.app  → Vercel
  Render Backend API             → Render
  Supabase Database              → Supabase
  Status: LIVE - NO CHANGES

NEW COPY ON CPANEL (NEW):
  [new-domain].vercel.app        → Vercel (new project)
  cPanel Backend API             → cPanel (new server)
  cPanel PostgreSQL Database     → cPanel (new database)
  Status: TESTING - Completely independent
```

**Both run simultaneously, no interference.**

---

## 📋 WHAT YOU NEED TO PROVIDE NOW

**Before I start, please share:**

```
1. cPanel SSH Credentials:
   Host/IP: _________________________
   Username: _________________________
   Password: _________________________
   SSH Port: _________________________ (usually 22)

2. cPanel Control Panel:
   URL: _________________________
   Username: _________________________
   Password: _________________________

3. Domain for New Version:
   Domain/Subdomain: _________________________
   Example: api.company.com or v2.company.com
   
4. Email for SMTP (if you want email notifications):
   SMTP Host: _________________________
   SMTP Port: _________________________
   Email: _________________________
   Password: _________________________
   (If not available, leave blank - can use Render's SMTP)
```

---

## 🔧 EXECUTION PLAN - 9 PHASES

### PHASE 1: VERIFY EVERYTHING IS SAFE (No Actions)
**Duration:** 5 minutes  
**What I Do:** Just verify, no changes made

```
✓ Test current Render API still works
✓ Test current Vercel frontend still works
✓ Test Supabase database still accessible
✓ Verify SSH access to cPanel works
✓ Confirm sufficient disk space on cPanel
```

**Expected Outcome:** Confirmation all systems ready to proceed

---

### PHASE 2: CPANEL SERVER SETUP (15 minutes)
**Duration:** 15 minutes  
**What I Do:** SSH into cPanel and prepare environment

```bash
# Login to cPanel via SSH
ssh [username]@[host]

# 1. Verify PHP 8.2 is installed
php --version
→ Should show PHP 8.2+

# 2. Verify required extensions
php -m | grep -E 'pdo|pgsql|mbstring|curl|zip|gd'
→ All should be listed

# 3. Create project directory
mkdir -p ~/public_html/intersmart-api
cd ~/public_html/intersmart-api

# 4. Verify directory permissions
ls -la ~/public_html/
→ Should be rwx for intersmart-api
```

**Expected Outcome:** cPanel environment ready with correct PHP configuration

**Note:** If any extensions missing, you'll need to enable in cPanel → Select PHP Version → Extensions

---

### PHASE 3: DATABASE SETUP ON CPANEL (15 minutes)
**Duration:** 15 minutes  
**What I Do:** Create PostgreSQL database and user

#### Via cPanel Control Panel (You do this):
```
1. Log into cPanel
2. Go to: PostgreSQL Databases
3. Click: Create New Database
   Name: intersmart_copy
   Click: Create Database

4. Click: Create New User
   Username: intersmart_user
   Password: [Generate STRONG 16+ char password with symbols]
   Confirm password
   Click: Create User

5. Click: Manage User Privileges
   Select User: intersmart_user
   Select Database: intersmart_copy
   Check: All Privileges
   Click: Update

6. Verify connection (I'll do this via SSH):
   psql -h localhost -U intersmart_user -d intersmart_copy -c "SELECT version();"
   → Should show PostgreSQL version
```

**Expected Outcome:** Fresh, empty PostgreSQL database ready

---

### PHASE 4: BACKUP SUPABASE DATABASE (10 minutes)
**Duration:** 10 minutes  
**What I Do:** Export data from Supabase

#### Via Command Line (I can do this):
```bash
# On local machine or any computer with pg_dump:
pg_dump \
  --host=aws-1-ap-northeast-1.pooler.supabase.com \
  --username=postgres.shczwbwsrnrygmmvyeue \
  --password \
  --dbname=postgres > supabase-backup.sql

# When prompted: Enter password: Abhihere1234@
# Wait for completion (2-5 minutes)
# File size: ~20-100MB (depending on data)
```

**Alternative (If you prefer):**
```
You can use Supabase Dashboard:
1. Go to: https://app.supabase.com
2. Select project
3. Database → Backups
4. Download latest backup (if available)
```

**Expected Outcome:** File `supabase-backup.sql` containing all data

---

### PHASE 5: RESTORE DATABASE TO CPANEL (15 minutes)
**Duration:** 15 minutes  
**What I Do:** Upload and import backup to cPanel

```bash
# 1. Upload backup to cPanel (via SCP)
scp supabase-backup.sql [username]@[host]:~/

# 2. SSH into cPanel
ssh [username]@[host]

# 3. Import backup into PostgreSQL
psql -U intersmart_user -d intersmart_copy < ~/supabase-backup.sql
# Wait for completion (2-5 minutes)

# 4. Verify data imported successfully
psql -U intersmart_user -d intersmart_copy -c "\dt"
→ Should list all tables

psql -U intersmart_user -d intersmart_copy -c "SELECT COUNT(*) FROM users;"
→ Should show number of users (not 0)

# 5. Cleanup
rm ~/supabase-backup.sql
```

**Expected Outcome:** All Supabase data now in cPanel database

---

### PHASE 6: CLONE & CONFIGURE BACKEND (25 minutes)
**Duration:** 25 minutes  
**What I Do:** Deploy Laravel API to cPanel

```bash
# SSH into cPanel
ssh [username]@[host]
cd ~/public_html/intersmart-api

# 1. Clone repository (office branch)
git clone https://github.com/career-maker/Inter-Smart-Portal.git .
git checkout office
git pull origin office

# 2. Navigate to backend
cd backend

# 3. Install dependencies
composer install --no-dev --optimize-autoloader
# Takes 2-3 minutes

# 4. Create .env file
cp .env.example .env

# 5. Configure .env with these values:
cat > .env << 'EOF'
APP_NAME="Intersmart Employee Portal - Copy"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://[your-new-domain]/api

LOG_CHANNEL=stack
LOG_LEVEL=info

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=intersmart_copy
DB_USERNAME=intersmart_user
DB_PASSWORD=[password-from-step-3]

CACHE_DRIVER=file
QUEUE_DRIVER=sync
SESSION_DRIVER=cookie

MAIL_MAILER=smtp
MAIL_HOST=[your-smtp-host]
MAIL_PORT=587
MAIL_USERNAME=[your-email]
MAIL_PASSWORD=[email-password]
MAIL_FROM_ADDRESS="noreply@intersmart.in"
MAIL_FROM_NAME="Intersmart Employee Portal"

SANCTUM_STATEFUL_DOMAINS=[your-new-domain]
EOF

# 6. Generate application key
php artisan key:generate
→ Should output: Application key set successfully

# 7. Run migrations (schema already exists from backup)
php artisan migrate --force
# If already migrated in Supabase, may show "nothing to migrate"

# 8. Create storage link
php artisan storage:link --force
→ Should output: Directory linked

# 9. Set permissions
chmod -R 755 storage bootstrap/cache
chmod -R 644 storage/app/public/*

# 10. Clear caches
php artisan config:cache
php artisan view:cache
php artisan cache:clear
```

**Expected Outcome:** Laravel backend fully configured and ready

---

### PHASE 7: APACHE ROUTING & SSL (20 minutes)
**Duration:** 20 minutes  
**What I Do:** Configure web server

#### Step 1: Create .htaccess
```bash
ssh [username]@[host]
cd ~/public_html/intersmart-api/backend/public

cat > .htaccess << 'EOF'
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
EOF
```

#### Step 2: Configure Addon Domain in cPanel (You do this):
```
1. Log into cPanel
2. Go to: Addon Domains
3. Click: Add Addon Domain
4. Settings:
   - New Domain Name: [your-new-domain]
   - Document Root: public_html/intersmart-api/backend/public
   - Click: Add Domain

Wait 5-10 minutes for propagation
```

#### Step 3: Enable SSL Certificate (You do this):
```
1. Log into cPanel
2. Go to: AutoSSL
3. Manage SSL Sites
4. Find [your-new-domain]
5. If not enabled, click to enable
6. Wait 5-10 minutes for installation
```

#### Step 4: Verify SSL
```bash
ssh [username]@[host]
curl -I https://[your-new-domain]/api/ping
→ Should show: HTTP/2 200 or similar (not 404 or 403)
```

**Expected Outcome:** API accessible via HTTPS with valid SSL certificate

---

### PHASE 8: SETUP CRON JOBS (10 minutes)
**Duration:** 10 minutes  
**What I Do:** Configure cron jobs for scheduled tasks

```bash
ssh [username]@[host]
cd ~/public_html/intersmart-api/backend

# 1. Edit crontab
crontab -e

# 2. Add this line (I'll provide exact cron command):
* * * * * cd /home/[username]/public_html/intersmart-api/backend && /usr/bin/php artisan schedule:run >> /dev/null 2>&1

# 3. Save and exit

# 4. Verify cron is set
crontab -l
→ Should show the line we added
```

**This will handle:**
- Annual leave allocation (Jan 1)
- SSL biometric sync (if configured)
- Any other scheduled tasks

**Expected Outcome:** Cron jobs running automatically every minute

---

### PHASE 9: FRONTEND VERCEL SETUP (15 minutes)
**Duration:** 15 minutes  
**What You Do:** Create new Vercel project

#### Option A: Create New Project (Recommended)
```
1. Go to: https://vercel.com/dashboard
2. Click: New Project
3. Import Git Repository: Inter-Smart-Portal
4. Settings:
   - Project Name: intersmart-copy
   - Framework: Next.js
   - Root Directory: frontend
   - Build Command: pnpm run build
   - Output Directory: .next

5. Environment Variables:
   Add Variable:
   Name: NEXT_PUBLIC_API_URL
   Value: https://[your-new-domain]/api

6. Click: Deploy
7. Wait for deployment (3-5 minutes)
8. Vercel will provide temporary URL
```

#### Option B: Use Existing intersmart-office Project
```
If you already have intersmart-office project:
1. Go to: https://vercel.com/dashboard/intersmart-office
2. Settings → Environment Variables
3. Update NEXT_PUBLIC_API_URL: https://[your-new-domain]/api
4. Click: Save
5. Redeploy
```

#### Step 2: Add Custom Domain (Optional)
```
1. In Vercel project: Settings → Domains
2. Add Domain: [your-new-domain] (or different domain)
3. Vercel provides DNS records
4. Update in domain registrar
5. Wait for DNS propagation (up to 48 hours)
```

**Expected Outcome:** Frontend deployed and connected to new backend API

---

## 🧪 PHASE 10: TESTING & VERIFICATION (20 minutes)
**Duration:** 20 minutes  
**What I Do:** Comprehensive testing

```bash
# 1. Test API connectivity
curl -X GET https://[your-new-domain]/api/ping
→ Should return: {"status":"alive"} or similar

# 2. Test database is accessible
ssh [username]@[host]
psql -U intersmart_user -d intersmart_copy -c "SELECT COUNT(*) FROM users;"
→ Should show number of users

# 3. Test login
Visit: https://[vercel-url]
→ Should see login form

# 4. Login with credentials
Email: admin@intersmart.in
Password: [from seeder]
→ Should redirect to dashboard

# 5. Test key features
✓ View employees
✓ View leave requests
✓ View dashboard
✓ Check browser DevTools → Network
  → All API calls should go to: https://[your-new-domain]/api/...

# 6. Verify current production STILL WORKS
curl -X GET https://your-render-api.onrender.com/api/ping
→ Should still return success

Visit: https://intersmart-portal.vercel.app
→ Should still load and work normally
```

**Expected Outcome:** Everything working, both versions independent

---

## ✅ SUCCESS CRITERIA

All of these must be true:

```
✓ New cPanel API responds to requests
✓ New cPanel database contains all data from Supabase
✓ New Vercel frontend loads without errors
✓ Login works on new version
✓ API calls from new frontend go to new cPanel backend
✓ All features work (employees, leaves, dashboard, etc.)
✓ Current Render API still works
✓ Current Vercel frontend still works
✓ Current Supabase database unchanged
✓ Cron jobs scheduled on cPanel
✓ SSL certificate installed and valid
```

---

## 📊 SUMMARY TABLE

| Component | Current Production | New Copy (cPanel) |
|-----------|-------------------|-------------------|
| **Frontend** | intersmart-portal.vercel.app | [new-vercel-url] |
| **Backend** | Render API | cPanel Backend |
| **Database** | Supabase | cPanel PostgreSQL |
| **Code Branch** | office | office (same) |
| **Domain** | Vercel-managed | cPanel + Vercel |
| **Status** | LIVE | Testing |
| **Users Affected** | None | None |
| **Data Affected** | None | Fresh copy |

---

## 🚨 WHAT WILL NOT HAPPEN

```
❌ Current Render API will NOT be stopped
❌ Current Vercel will NOT be redeployed
❌ Current Supabase will NOT be modified
❌ Current users will NOT be affected
❌ Current cron jobs on Render will NOT change
❌ Current Render environment variables will NOT touch
❌ Any production data will NOT be deleted
❌ Any existing workflows will NOT break
```

---

## ⏱️ TIMELINE

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Verify everything safe | 5 min |
| 2 | cPanel server setup | 15 min |
| 3 | Database setup | 15 min |
| 4 | Backup Supabase | 10 min |
| 5 | Restore to cPanel | 15 min |
| 6 | Clone & configure backend | 25 min |
| 7 | Apache & SSL setup | 20 min |
| 8 | Cron jobs setup | 10 min |
| 9 | Vercel frontend setup | 15 min |
| 10 | Testing & verification | 20 min |
| **TOTAL** | | **~2.5-3.5 hours** |

---

## 📝 INFORMATION I NEED FROM YOU

**Critical (must have to start):**
```
1. cPanel SSH Host: ___________________
2. cPanel SSH Username: ___________________
3. cPanel SSH Password: ___________________
4. New Domain: ___________________
5. cPanel Control Panel URL: ___________________
6. cPanel Control Panel Username: ___________________
7. cPanel Control Panel Password: ___________________
```

**Optional (for email notifications):**
```
8. SMTP Host: ___________________
9. SMTP Port: ___________________
10. Email Address: ___________________
11. Email Password: ___________________
```

---

## 🎬 READY TO EXECUTE?

Once you provide the information above, I will:

1. ✅ Phase 1: Verify all systems are safe
2. ✅ Phase 2: SSH into cPanel and prepare
3. ✅ Phase 3: Create database and user
4. ✅ Phase 4: Backup Supabase
5. ✅ Phase 5: Restore to cPanel
6. ✅ Phase 6: Clone and configure backend
7. ✅ Phase 7: Setup Apache routing and SSL
8. ✅ Phase 8: Configure cron jobs
9. ✅ Phase 9: You create Vercel project (I guide you)
10. ✅ Phase 10: Test everything

**I will provide detailed status updates and screenshots after each phase.**

---

## 🤝 QUESTIONS?

Before you provide credentials, ask anything:

- "What if X happens?"
- "Can we do Y instead?"
- "I don't understand Z"
- "How do we rollback?"

**I want you 100% confident before we start.**

---

## ✨ NEXT STEP

**Reply with:**
1. Confirmation you understand the plan
2. The 7 critical pieces of information above
3. Any questions or concerns

Then I'll start Phase 1: Verification (no changes, just checks)

