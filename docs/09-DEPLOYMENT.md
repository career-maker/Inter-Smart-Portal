# InterSmart Employee Portal - Deployment & Hosting Details

This document stores the configuration and environment variables required to host the InterSmart Employee Portal across different platforms (Render, Vercel, Supabase). This ensures smooth migrations if the project needs to be moved to different accounts in the future.

## 1. Database (Supabase PostgreSQL)
The project uses Supabase as a managed PostgreSQL database. Because the deployment environment (Render) may be on an IPv4 network, we use the **Session Pooler** connection string.

**Connection Variables:**
```env
DB_CONNECTION=pgsql
DB_HOST=aws-1-ap-northeast-1.pooler.supabase.com
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.shczwbwsrnrygmmvyeue
DB_PASSWORD=[STORED_SECURELY]
```
*Note: If migrating to a new Supabase project, remember to update the host and username with the new Session Pooler details.*

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
