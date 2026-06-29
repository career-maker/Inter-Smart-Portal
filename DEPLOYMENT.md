# Deployment Guide: Inter Smart Employee Portal

This guide provides instructions for deploying the Inter Smart Employee Portal to a standard Linux/Nginx/MySQL environment.

## Prerequisites
- **Server:** Ubuntu 22.04 LTS (or similar)
- **Web Server:** Nginx
- **Database:** MySQL 8.0+
- **PHP:** PHP 8.2 with extensions (bcmath, ctype, fileinfo, json, mbstring, openssl, pdo_mysql, tokenizer, xml)
- **Node.js:** Node.js 18+ and pnpm
- **Composer:** PHP package manager

## Step 1: Server Setup & Dependencies
Ensure your server is up to date and all required services are installed:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install nginx mysql-server php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl unzip -y
```

Install Composer:
```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

Install Node.js & pnpm:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm
```

## Step 2: Database Setup
Create a MySQL database and user for the application:
```sql
CREATE DATABASE intersmart_portal;
CREATE USER 'portal_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON intersmart_portal.* TO 'portal_user'@'localhost';
FLUSH PRIVILEGES;
```

## Step 3: Backend Deployment (Laravel)
1. Clone the repository to your server (e.g., `/var/www/intersmart-portal`).
2. Navigate to the backend directory:
   ```bash
   cd /var/www/intersmart-portal/backend
   ```
3. Install PHP dependencies:
   ```bash
   composer install --optimize-autoloader --no-dev
   ```
4. Configure the environment:
   ```bash
   cp .env.example .env
   # Edit .env with your DB credentials and set APP_ENV=production, APP_DEBUG=false
   nano .env
   ```
5. Generate application key and run migrations:
   ```bash
   php artisan key:generate
   php artisan migrate --force
   php artisan db:seed --force
   ```
6. Optimize the application:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   php artisan event:cache
   ```
7. Set permissions:
   ```bash
   chown -R www-data:www-data /var/www/intersmart-portal/backend
   chmod -R 775 /var/www/intersmart-portal/backend/storage
   chmod -R 775 /var/www/intersmart-portal/backend/bootstrap/cache
   ```

## Step 4: Frontend Deployment (React)
1. Navigate to the frontend directory:
   ```bash
   cd /var/www/intersmart-portal/frontend
   ```
2. Install dependencies and build:
   ```bash
   pnpm install
   # Ensure .env production file is pointing to your backend URL (VITE_API_BASE_URL)
   pnpm run build
   ```
3. Move the `dist` folder to your webroot (e.g., `/var/www/intersmart-portal/frontend/dist`).

## Step 5: Nginx Configuration
Create an Nginx configuration file (`/etc/nginx/sites-available/intersmart-portal`):

```nginx
server {
    listen 80;
    server_name yourdomain.com; # Replace with your domain

    # Frontend block (React SPA)
    root /var/www/intersmart-portal/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API block (Laravel)
    location /api {
        alias /var/www/intersmart-portal/backend/public;
        try_files $uri $uri/ @api;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    location @api {
        rewrite /api/(.*)$ /api/index.php?/$1 last;
    }
}
```
Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/intersmart-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: SSL (Let's Encrypt)
Secure your site with HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 7: Queue and Scheduler (Optional but Recommended)
For background tasks and email notifications:
- Configure a Supervisor worker for `php artisan queue:work`.
- Add the Laravel scheduler to your crontab:
  ```bash
  * * * * * cd /var/www/intersmart-portal/backend && php artisan schedule:run >> /dev/null 2>&1
  ```
