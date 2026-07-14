# Migration to Office Server Checklist

## 1. Pre-Migration Planning

- [ ] Assess office server specifications (CPU, RAM, Storage, Network bandwidth)
- [ ] Plan downtime window (if migrating from live system)
- [ ] Create backup of current Supabase database
- [ ] Test migration process on staging server first
- [ ] Document all current environment variables and secrets
- [ ] Create rollback plan in case of issues

---

## 2. Office Server Infrastructure Setup

### 2.1 Operating System & Dependencies
- [ ] Install Linux (Ubuntu 20.04 LTS or later recommended) or Windows Server
- [ ] Install Node.js v18+ (for frontend build)
- [ ] Install PHP 8.2 + Apache/Nginx (for backend)
- [ ] Install PostgreSQL 15+ (if local database)
- [ ] Install Docker (optional, for containerization)
- [ ] Install Git for version control

### 2.2 Web Server Setup
- [ ] Configure Nginx/Apache with SSL/TLS certificates
- [ ] Set up reverse proxy (Nginx recommended)
- [ ] Configure firewall rules (allow ports 80, 443, SSH)
- [ ] Install SSL certificate (Let's Encrypt or self-signed)
- [ ] Configure domain name (DNS pointing to office server)

### 2.3 File System & Storage
- [ ] Create dedicated user for application (non-root)
- [ ] Set up directory structure:
  ```
  /var/www/intersmart/
  ├── frontend/
  ├── backend/
  └── shared/ (for storage, logs, etc.)
  ```
- [ ] Set proper file permissions (755 for dirs, 644 for files)
- [ ] Set up backup location (external drive or network storage)

---

## 3. Database Migration

### 3.1 PostgreSQL Setup
- [ ] Install PostgreSQL 15+
- [ ] Create database: `intersmart_portal`
- [ ] Create database user with password
- [ ] Grant proper permissions to user

### 3.2 Data Migration
- [ ] Export data from Supabase:
  ```bash
  pg_dump --host=<supabase-host> --username=postgres \
    --password --dbname=postgres > backup.sql
  ```
- [ ] Import to office PostgreSQL:
  ```bash
  psql --host=localhost --username=postgres \
    --dbname=intersmart_portal < backup.sql
  ```
- [ ] Verify data integrity (row counts, key records)
- [ ] Test database connections from both backend and local machine

### 3.3 Database Configuration
- [ ] Enable PostgreSQL remote access (if backend on different server)
- [ ] Configure pg_hba.conf for network access
- [ ] Set up automated backups (daily at off-hours)
- [ ] Configure backup retention (7-30 days recommended)
- [ ] Test backup restoration process

---

## 4. Backend (Laravel) Setup

### 4.1 Code Deployment
- [ ] Clone repository from GitHub:
  ```bash
  git clone https://github.com/career-maker/Inter-Smart-Portal.git /var/www/intersmart
  cd /var/www/intersmart/backend
  ```
- [ ] Checkout latest stable branch
- [ ] Install PHP dependencies:
  ```bash
  composer install --no-dev --optimize-autoloader
  ```

### 4.2 Environment Configuration
- [ ] Create `.env` file from `.env.example`:
  ```env
  APP_NAME="Intersmart Employee Portal"
  APP_ENV=production
  APP_KEY=<generate-new-key>
  APP_URL=https://your-office-domain.com
  
  DB_CONNECTION=pgsql
  DB_HOST=localhost
  DB_PORT=5432
  DB_DATABASE=intersmart_portal
  DB_USERNAME=<your-db-user>
  DB_PASSWORD=<strong-password>
  
  MAIL_MAILER=smtp
  MAIL_SCHEME=tls
  MAIL_HOST=<company-mail-server>
  MAIL_PORT=587
  MAIL_USERNAME=<noreply-email>
  MAIL_PASSWORD=<mail-password>
  MAIL_FROM_ADDRESS="noreply@your-company.com"
  
  SANCTUM_STATEFUL_DOMAINS=your-office-domain.com
  SESSION_DRIVER=cookie
  ```
- [ ] Generate new APP_KEY:
  ```bash
  php artisan key:generate
  ```
- [ ] Set environment to production

### 4.3 Laravel Setup
- [ ] Create required directories:
  ```bash
  mkdir -p storage/app/public storage/logs storage/framework/{sessions,views,cache}
  chmod -R 775 storage bootstrap/cache
  ```
- [ ] Run migrations:
  ```bash
  php artisan migrate --force
  ```
- [ ] Seed initial data:
  ```bash
  php artisan db:seed
  ```
- [ ] Create storage link:
  ```bash
  php artisan storage:link --force
  ```
- [ ] Clear caches:
  ```bash
  php artisan config:clear
  php artisan cache:clear
  php artisan view:clear
  ```

### 4.4 Web Server Configuration
- [ ] Configure Apache/Nginx to serve `/public` directory
- [ ] Set document root to `/var/www/intersmart/backend/public`
- [ ] Enable mod_rewrite for URL rewriting
- [ ] Configure PHP-FPM pool (for performance)
- [ ] Set PHP memory limit to 256M or higher
- [ ] Set max upload size (e.g., 50M):
  ```
  post_max_size = 50M
  upload_max_filesize = 50M
  ```

### 4.5 Process Management
- [ ] Set up supervisor/systemd for Laravel scheduler:
  ```bash
  * * * * * cd /var/www/intersmart/backend && php artisan schedule:run
  ```
- [ ] Set up supervisor for background jobs (if using queues later)

---

## 5. Frontend (Next.js) Setup

### 5.1 Code Deployment
- [ ] Clone/pull repository
- [ ] Navigate to frontend directory:
  ```bash
  cd /var/www/intersmart/frontend
  ```
- [ ] Install dependencies:
  ```bash
  pnpm install --frozen-lockfile
  ```

### 5.2 Environment Configuration
- [ ] Create `.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=https://your-office-domain.com/api
  ```

### 5.3 Build & Deployment
- [ ] Build production bundle:
  ```bash
  pnpm run build
  ```
- [ ] Export as static site or keep as standalone server
- [ ] Test build locally:
  ```bash
  pnpm start
  ```

### 5.4 Web Server Configuration
- [ ] Option A - Standalone Next.js Server:
  - Use systemd/supervisor to run Next.js server on port 3000
  - Configure Nginx as reverse proxy to localhost:3000
  
- [ ] Option B - Static Export:
  - Configure Next.js to export static site
  - Serve from `/var/www/intersmart/frontend/.next/out`
  - Configure Nginx to serve static files

### 5.5 Process Management (if using standalone)
- [ ] Create systemd service file for Next.js:
  ```bash
  /etc/systemd/system/intersmart-frontend.service
  ```
- [ ] Enable and start service

---

## 6. Reverse Proxy Configuration (Nginx)

### 6.1 Nginx Configuration
```nginx
upstream backend {
    server 127.0.0.1:8000;
}

upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name your-office-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-office-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;

    # API routes
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Storage/Public files
    location /storage {
        alias /var/www/intersmart/backend/storage/app/public;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. SSL/HTTPS Configuration

- [ ] Obtain SSL certificate:
  - Option A: Let's Encrypt (free, automated renewal)
    ```bash
    certbot certonly --nginx -d your-office-domain.com
    ```
  - Option B: Self-signed (for internal only)
  - Option C: Purchase from CA
- [ ] Install certificate on web server
- [ ] Set up auto-renewal (if Let's Encrypt)
- [ ] Test SSL configuration with SSL Labs
- [ ] Enable HSTS header for security

---

## 8. Email Configuration

- [ ] Identify company mail server details:
  - SMTP host
  - SMTP port (usually 587 or 465)
  - Username (noreply email)
  - Password
  - TLS/SSL requirement
- [ ] Test email sending:
  ```bash
  php artisan tinker
  Mail::raw('Test email', function($message) {
      $message->to('your-email@company.com')->subject('Test');
  });
  ```
- [ ] Configure leave application notifications to go to correct addresses

---

## 9. Monitoring & Logging

### 9.1 Application Logging
- [ ] Configure Laravel logging:
  ```env
  LOG_CHANNEL=stack
  LOG_LEVEL=info
  ```
- [ ] Set up log rotation:
  ```bash
  /etc/logrotate.d/intersmart
  ```
- [ ] Monitor error logs regularly:
  ```bash
  tail -f storage/logs/laravel.log
  ```

### 9.2 System Monitoring
- [ ] Install monitoring tools:
  - htop (system resources)
  - nethogs (network monitoring)
  - df (disk space)
- [ ] Set up alerts for:
  - Disk space > 80%
  - CPU usage > 80%
  - Memory usage > 85%
  - Database connection failures
- [ ] Monitor application response times

### 9.3 Backup Monitoring
- [ ] Verify backups run daily
- [ ] Test backup restoration monthly
- [ ] Monitor backup storage size
- [ ] Set up backup failure alerts

---

## 10. Security Hardening

- [ ] Enable firewall (UFW for Ubuntu):
  ```bash
  ufw allow 22/tcp  # SSH
  ufw allow 80/tcp  # HTTP
  ufw allow 443/tcp # HTTPS
  ufw enable
  ```
- [ ] Disable SSH password login (use keys only)
- [ ] Set up fail2ban to prevent brute force attacks
- [ ] Configure strong PHP and Laravel security settings
- [ ] Set CORS properly in Laravel:
  ```php
  'allowed_origins' => ['https://your-office-domain.com'],
  ```
- [ ] Keep all software updated:
  ```bash
  apt update && apt upgrade
  ```
- [ ] Regular security audits
- [ ] Implement VPN access if on separate network

---

## 11. Performance Optimization

- [ ] Enable PHP opcache:
  ```ini
  opcache.enable=1
  opcache.memory_consumption=256
  ```
- [ ] Configure database connection pooling
- [ ] Enable Nginx gzip compression
- [ ] Set up CDN for static assets (optional)
- [ ] Configure Redis for caching (optional):
  ```bash
  sudo apt install redis-server
  ```
- [ ] Optimize database:
  - Add indexes on frequently queried columns
  - Analyze query performance
  - Regular VACUUM and ANALYZE

---

## 12. Testing & Validation

- [ ] Test all user authentication (login, logout, forgot password)
- [ ] Test employee CRUD operations
- [ ] Test leave application workflow (apply → approve → reject)
- [ ] Test file uploads (profile photos, documents)
- [ ] Test email notifications (if configured)
- [ ] Test attendance check-in/check-out
- [ ] Test reports generation (all report types)
- [ ] Load testing (use Apache Bench or wrk):
  ```bash
  ab -n 1000 -c 10 https://your-office-domain.com/
  ```
- [ ] Verify API response times
- [ ] Test database backup/restore
- [ ] Test browser compatibility (Chrome, Firefox, Edge, Safari)

---

## 13. Documentation & Handover

- [ ] Document server access credentials (keep secure)
- [ ] Create system administration guide:
  - How to restart services
  - How to check logs
  - How to backup/restore
  - Troubleshooting common issues
- [ ] Document database backup procedures
- [ ] Create user documentation for admins
- [ ] Document any customizations made
- [ ] Set up remote access for support (if needed)

---

## 14. Post-Migration

- [ ] Monitor system for 24-48 hours
- [ ] Verify all users can access the system
- [ ] Check error logs for issues
- [ ] Test daily operations thoroughly
- [ ] Set up monitoring alerts
- [ ] Train office admins on server management
- [ ] Create maintenance schedule
- [ ] Decommission old services (Vercel, Render, Supabase) if not needed as backup

---

## Quick Commands Reference

```bash
# Check system resources
top
free -h
df -h
du -sh /var/www/intersmart

# View application logs
tail -f /var/www/intersmart/backend/storage/logs/laravel.log
tail -f /var/log/nginx/error.log

# Restart services
sudo systemctl restart php-fpm
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Database operations
psql -U postgres -d intersmart_portal
pg_dump -U postgres intersmart_portal > backup.sql

# Laravel commands
php artisan migrate
php artisan cache:clear
php artisan config:cache

# Build frontend
pnpm run build
```

---

## Estimated Timeline

- **Planning & Preparation:** 1-2 days
- **Infrastructure Setup:** 2-3 days
- **Database Migration:** 1 day
- **Backend Deployment:** 1-2 days
- **Frontend Deployment:** 1 day
- **Testing & Optimization:** 2-3 days
- **Training & Documentation:** 1 day
- **Total:** 1-2 weeks

---

## Support Contacts

- **Database Issues:** PostgreSQL documentation, office DBA
- **Mail Server Issues:** Company IT department
- **Domain/DNS Issues:** Network administrator
- **SSL Certificate Issues:** Let's Encrypt support
- **Application Issues:** Refer to CLAUDE.md and GitHub issues

---

## Risk Mitigation

- **Always backup before migration**
- **Test on staging server first**
- **Have rollback plan ready**
- **Keep old system running for 1-2 weeks**
- **Monitor closely after migration**
- **Have direct contact with IT support**
- **Document all changes made**

