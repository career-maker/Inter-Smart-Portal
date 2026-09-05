# InterSmart Employee Portal - Deployment & Hosting Details

This document stores the configuration and environment variables required to host the InterSmart Employee Portal across different platforms (Render, Vercel, Supabase). This ensures smooth migrations if the project needs to be moved to different accounts in the future.

> **IMPORTANT NOTE ON PRODUCTION INFRASTRUCTURE:**
> The active production database is **MySQL 8.0+ hosted on cPanel** (`workplace.intersmart.in`).
> Frontend is hosted on **Vercel**. Backend is hosted on **cPanel** (PHP 8.2+).
> Older sections referencing Render and Supabase PostgreSQL represent legacy/superseded infrastructure from earlier prototyping.

## 1. Production Database (MySQL on cPanel)
Production uses MySQL managed via cPanel.
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=[CPANEL_DB_NAME]
DB_USERNAME=[CPANEL_DB_USER]
DB_PASSWORD=[STORED_SECURELY]
```

## Legacy Reference: Database (Supabase PostgreSQL)
Supabase was used during initial development.
```env
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.[PROJECT_REF]
DB_PASSWORD=[STORED_SECURELY]
```

## 2. Backend (Render via Docker)
The backend is a Laravel (PHP 8.2) API. Since Render does not natively support PHP in their web dashboard dropdown, the repository includes a custom `Dockerfile` at `backend/Dockerfile` that containerizes the application using Apache and PHP 8.2.

**Render Setup Instructions:**
- **Service Type**: Web Service
- **Language**: Docker
- **Root Directory**: `backend` (Crucial for Render to find the Dockerfile)
- **Branch**: `main`

**Required Environment Variables on Render:**
```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:QPAxiCpApR38c8nmhcDcAe8QEcHnwn7GVPVL1AodZiU=
APP_URL=https://[YOUR-RENDER-URL].onrender.com
FRONTEND_URL=https://[YOUR-VERCEL-URL].vercel.app
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.shczwbwsrnrygmmvyeue
DB_PASSWORD=[STORED_SECURELY]
```
*(The `FRONTEND_URL` is used in `config/cors.php` to secure API requests).*

**"Never Sleep" Trick (Cron):**
To prevent Render's free tier from sleeping after 15 minutes of inactivity, an external ping service (like cron-job.org or UptimeRobot) is configured to ping the backend API URL every 10 minutes.

## 3. Frontend (Vercel)
The frontend is a Next.js React application. Vercel automatically detects Next.js projects and provides native support.

**Vercel Setup Instructions:**
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`

**Required Environment Variables on Vercel:**
```env
NEXT_PUBLIC_API_URL=https://[YOUR-RENDER-URL].onrender.com/api
```
*(Ensure the `/api` suffix is included and there is no trailing slash).*

## 4. Migration Guide (Account to Account)
If you ever need to migrate this project to a new Render or Vercel account:
1. Re-import the `career-maker/Inter-Smart-Portal` GitHub repo into the new Render/Vercel accounts.
2. Follow the exact Root Directory configurations above (`backend` for Render, `frontend` for Vercel).
3. Update `NEXT_PUBLIC_API_URL` in the new Vercel project to point to the new Render URL.
4. Update `FRONTEND_URL` in the new Render project to point to the new Vercel URL.
5. Update `APP_URL` in Render to match its own new URL.
