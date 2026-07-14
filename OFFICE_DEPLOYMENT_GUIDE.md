# Office Server Deployment Guide
## Hybrid Setup: cPanel Office Server + Vercel Frontend + GitHub

### Architecture Overview
```
Current (Production):
  intersmart-portal.vercel.app (Frontend - Vercel)
  + Render Backend (API)
  + Supabase Database

Office Version (New):
  workplace.intersmart.in (Frontend - Vercel)
  + Office Server Backend (cPanel)
  + Office Server Database (PostgreSQL)
```

---

## 1. cPanel Hosting Setup (Office Server)

### 1.1 Hosting Details
```
Domain: workplace.intersmart.in
IP: 173.249.159.38
Username: workplaceintersm
Password: f5D0&gdUeU)*e{^v#2
Quota: 30 GB
Package: smart30
Contact: systemadmin@intersmart.in
```

### 1.2 Access cPanel
- **URL:** https://workplace.intersmart.in:2083
- **Or:** https://173.249.159.38:2083
- **Username:** workplaceintersm
- **Password:** f5D0&gdUeU)*e{^v#2

---

## 2. Backend Deployment on cPanel

### 2.1 PHP & Dependencies Setup
1. **Login to cPanel**
2. **Select PHP Version:**
   - Go to **Select PHP Version**
   - Choose **PHP 8.2** (or latest available)
3. **Install Required Extensions:**
   - Go to **Modules/Extensions**
   - Ensure these are installed:
     - `php-pdo` (database access)
     - `php-pgsql` (PostgreSQL support)
     - `php-mbstring`
     - `php-curl`
     - `php-zip`
     - `php-gd`

### 2.2 Create Public HTML Directory
1. **Go to File Manager**
2. **Navigate to:** `public_html`
3. **Create new folders:**
   ```
   public_html/
   ├── api/          (backend code)
   ├── storage/      (uploads, logs)
   └── index.php     (entry point)
   ```

### 2.3 Deploy Backend Code via Git
1. **Access Terminal (SSH)**
   - Go to **Terminal** in cPanel
   - Or use SSH: `ssh workplaceintersm@173.249.159.38`

2. **Navigate to public_html:**
   ```bash
   cd ~/public_html/api
   ```

3. **Clone backend repository:**
   ```bash
   git clone https://github.com/career-maker/Inter-Smart-Portal.git .
   cd backend
   ```

4. **Install Composer dependencies:**
   ```bash
   composer install --no-dev --optimize-autoloader
   ```

5. **Create .env file:**
   ```bash
   cp .env.example .env
   ```

6. **Edit .env with office server configuration:**
   ```env
   APP_NAME="Intersmart Employee Portal - Office"
   APP_ENV=production
   APP_KEY=<generate-new-key>
   APP_URL=https://workplace.intersmart.in/api
   
   # Database (local PostgreSQL)
   DB_CONNECTION=pgsql
   DB_HOST=localhost
   DB_PORT=5432
   DB_DATABASE=intersmart_office
   DB_USERNAME=intersmart_user
   DB_PASSWORD=<strong-password>
   
   # Mail
   MAIL_MAILER=smtp
   MAIL_HOST=<company-smtp>
   MAIL_PORT=587
   MAIL_USERNAME=<noreply-email>
   MAIL_PASSWORD=<password>
   MAIL_FROM_ADDRESS="noreply@intersmart.in"
   
   # Sanctum
   SANCTUM_STATEFUL_DOMAINS=workplace.intersmart.in
   SESSION_DRIVER=cookie
   ```

7. **Generate APP_KEY:**
   ```bash
   php artisan key:generate
   ```

### 2.4 Database Setup (PostgreSQL on cPanel)
1. **Go to cPanel → PostgreSQL Databases**
2. **Create new database:**
   - Database name: `intersmart_office`
   - Click Create Database

3. **Create PostgreSQL user:**
   - Username: `intersmart_user`
   - Password: `<strong-password>`
   - Priv: Check "All"

4. **Via Terminal, run migrations:**
   ```bash
   cd ~/public_html/api
   php artisan migrate --force
   ```

5. **Seed initial data:**
   ```bash
   php artisan db:seed
   ```

### 2.5 File Permissions & Storage
```bash
cd ~/public_html/api
chmod -R 755 storage bootstrap/cache
chmod -R 644 storage/app/*
php artisan storage:link --force
```

### 2.6 Clear Caches
```bash
php artisan config:cache
php artisan view:cache
php artisan cache:clear
```

### 2.7 Apache/mod_rewrite Configuration
1. **Go to cPanel → .htaccess Manager**
2. **Select Directory:** `public_html/api/public`
3. **Create/Edit .htaccess:**
   ```apache
   <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule ^(.*)$ index.php/$1 [L]
   </IfModule>
   ```

---

## 3. Frontend Deployment on Vercel

### 3.1 Create New Vercel Project
1. **Go to https://vercel.com**
2. **Click "New Project"**
3. **Import Git Repository:**
   - Select: `Inter-Smart-Portal`
   - Select branch: `main`
   - Root directory: `frontend`

### 3.2 Configure Environment Variables
1. **In Vercel Project Settings → Environment Variables**
2. **Add:**
   ```
   NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api
   ```

### 3.3 Add Custom Domain
1. **Go to Project Settings → Domains**
2. **Add Domain:**
   - Domain: `workplace.intersmart.in`
   - Click "Add"
3. **Configure DNS:**
   - In your domain registrar (likely same as cPanel host):
     - Add CNAME: `workplace.intersmart.in` → `cname.vercel-dns.com`
     - Or follow Vercel's DNS configuration

### 3.4 Deploy
1. **Vercel auto-deploys from GitHub**
2. **Or manually trigger deploy from Vercel dashboard**
3. **Test:** Visit https://workplace.intersmart.in

---

## 4. Routing Configuration (cPanel)

### 4.1 API Routes (Backend)
Configure in cPanel addon domains or subdomains:

**Option A: Via Addon Domain (Recommended)**
1. **Go to Addon Domains**
2. **Create:**
   - Domain: `workplace.intersmart.in`
   - Directory: `public_html/api/public`
   - This serves backend at root, frontend via Vercel

**Option B: Via Subdomain**
1. **Create subdomain:** `api.workplace.intersmart.in`
2. **Point to:** `public_html/api/public`
3. **Update Vercel env:**
   ```
   NEXT_PUBLIC_API_URL=https://api.workplace.intersmart.in
   ```

### 4.2 SSL Certificate
1. **Go to AutoSSL**
2. **Manage SSL Sites**
3. **Enable SSL for workplace.intersmart.in**
4. **Certificate will auto-install from Let's Encrypt**

---

## 5. Database Migration (Supabase → Office PostgreSQL)

### 5.1 Export Data from Current Database
```bash
# On your local machine
pg_dump --host=<supabase-host> \
        --username=postgres \
        --password \
        --dbname=postgres > backup.sql
```

### 5.2 Import to Office Server
```bash
# Via Terminal on cPanel
psql --host=localhost \
     --username=intersmart_user \
     --password \
     --dbname=intersmart_office < backup.sql
```

---

## 6. GitHub Repository Management

### 6.1 Single Repo, Multiple Deployments
Since you're using the same GitHub repo for both versions:

1. **Main branch** = Both versions auto-deploy on push
2. **Tags for versions:**
   ```bash
   git tag -a production-vercel-v1.0 -m "Production Vercel version"
   git tag -a office-v1.0 -m "Office server version"
   git push --tags
   ```

3. **Environment variables manage differences:**
   - `NEXT_PUBLIC_API_URL` differs per deployment
   - Backend `.env` differs (office DB vs Supabase)

### 6.2 Workflow
```
1. Develop on feature branch
2. Create PR, review, test on staging
3. Merge to main
4. GitHub Actions auto-trigger:
   - Vercel builds both versions (office + production)
   - Updates both deployments
5. Tag for version tracking
```

---

## 7. Environment Variables Summary

### Production (Current)
```env
# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com/api

# Backend (Render) - uses Supabase DB
DATABASE_URL=postgresql://user:pass@supabase-host/database
```

### Office (New)
```env
# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://workplace.intersmart.in/api

# Backend (cPanel) - uses office PostgreSQL
DB_HOST=localhost
DB_DATABASE=intersmart_office
DB_USERNAME=intersmart_user
DB_PASSWORD=<strong-password>
```

---

## 8. Testing & Verification

### 8.1 Backend API Testing
```bash
# Test API endpoint
curl -X GET https://workplace.intersmart.in/api/ping

# Should return: {"status": "alive"}
```

### 8.2 Database Connection Test
```bash
# Via Terminal
psql --host=localhost --username=intersmart_user --dbname=intersmart_office

# Should connect without errors
```

### 8.3 Frontend Testing
1. Visit https://workplace.intersmart.in
2. Test login with default credentials
3. Test employee CRUD operations
4. Test leave application workflow
5. Check browser console for API errors

### 8.4 Verify Both Versions Work
- **Production:** https://intersmart-portal.vercel.app
  - Uses current Render backend
  - Uses current Supabase database
  
- **Office:** https://workplace.intersmart.in
  - Uses office server backend
  - Uses office server database

---

## 9. Monitoring & Maintenance

### 9.1 cPanel Error Logs
1. **Go to Error Log** in cPanel
2. **Monitor for:**
   - Database connection errors
   - Permission issues
   - Missing extensions

### 9.2 Laravel Logs
```bash
# Check application logs
tail -f ~/public_html/api/storage/logs/laravel.log
```

### 9.3 Regular Backups
1. **Set up cPanel backups** (weekly)
2. **Backup database separately:**
   ```bash
   pg_dump intersmart_office > backup-$(date +%Y%m%d).sql
   ```

---

## 10. Keeping Both Versions in Sync

### 10.1 Code Changes
```bash
# Make changes on feature branch
git checkout -b feature/new-feature
# ... make changes ...
git add .
git commit -m "feat: add new feature"
git push

# Both versions will auto-deploy after merge to main
```

### 10.2 Database Schema Changes
1. **Create migration in backend/database/migrations**
2. **Push to GitHub**
3. **Run on both databases:**
   ```bash
   # Production (Render)
   # - Auto-runs via Render startup script
   
   # Office
   php artisan migrate --force
   ```

### 10.3 Handling Divergence
If you need version-specific code:
```php
// In backend, check environment
if (env('APP_ENV') === 'office') {
    // Office-specific code
} else {
    // Production code
}
```

---

## 11. DNS Configuration

### Prerequisite
- Domain registrar must support DNS changes
- Usually cPanel host provides DNS management

### DNS Records for workplace.intersmart.in
```
Record Type  | Host                        | Value
A            | workplace.intersmart.in     | 173.249.159.38
CNAME        | www.workplace.intersmart.in | workplace.intersmart.in
CNAME        | api.workplace.intersmart.in | workplace.intersmart.in (if using subdomain)
TXT          | (for Vercel verification)   | (Vercel provides this)
```

---

## 12. Troubleshooting

### Issue: API returns 404 errors
**Solution:**
1. Check .htaccess in `public_html/api/public/`
2. Verify `mod_rewrite` is enabled in cPanel
3. Check file permissions (755 for directories)

### Issue: Database connection fails
**Solution:**
1. Verify PostgreSQL is running: `psql --version`
2. Check credentials in `.env`
3. Ensure user has database privileges

### Issue: Vercel can't reach API
**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check SSL certificate is valid
3. Test API manually: `curl https://workplace.intersmart.in/api/ping`

### Issue: File uploads not working
**Solution:**
1. Check `storage/` folder permissions
2. Verify cPanel quota is not exceeded
3. Check `post_max_size` in PHP settings

---

## 13. Quick Commands Reference

```bash
# SSH Access
ssh workplaceintersm@173.249.159.38

# Database
psql -U intersmart_user -d intersmart_office
pg_dump intersmart_office > backup.sql

# Laravel
php artisan migrate --force
php artisan cache:clear
php artisan storage:link --force

# Logs
tail -f ~/public_html/api/storage/logs/laravel.log

# Permissions
chmod -R 755 ~/public_html/api/storage
chmod -R 755 ~/public_html/api/bootstrap/cache
```

---

## 14. Deployment Checklist

- [ ] cPanel SSH access working
- [ ] PHP 8.2 enabled
- [ ] PostgreSQL extensions installed
- [ ] Backend code cloned from GitHub
- [ ] Composer dependencies installed
- [ ] .env configured with office database
- [ ] Database created and migrated
- [ ] Storage permissions set correctly
- [ ] .htaccess configured for routing
- [ ] SSL certificate installed
- [ ] Vercel project created
- [ ] Environment variables set in Vercel
- [ ] Custom domain added to Vercel
- [ ] DNS records configured
- [ ] API endpoint tested and responding
- [ ] Frontend loads and connects to backend
- [ ] Both versions (production + office) working
- [ ] Backups configured

---

## 15. Support Contacts

- **cPanel Host Support:** systemadmin@intersmart.in
- **DNS Issues:** Domain registrar support
- **Vercel Issues:** Vercel support dashboard
- **GitHub Issues:** GitHub documentation
- **Application Issues:** Refer to CLAUDE.md

---

## Estimated Timeline

- **cPanel Setup:** 1-2 hours
- **Backend Deployment:** 2-3 hours
- **Database Migration:** 1 hour
- **Vercel Configuration:** 1 hour
- **Testing & Verification:** 2-3 hours
- **Total:** 1 day

---

## Important Notes

✅ **Both versions share same codebase** - no duplication  
✅ **Independent databases** - no data conflict  
✅ **Independent environments** - can test office version separately  
✅ **Auto-deployments** - any GitHub push updates both versions  
✅ **Easy to manage** - same repo, different environments  
✅ **Rollback capability** - can revert both together  

⚠️ **Remember:** Keep `.env` files secure and private  
⚠️ **Remember:** Backup office database regularly  
⚠️ **Remember:** Monitor both versions for issues  

