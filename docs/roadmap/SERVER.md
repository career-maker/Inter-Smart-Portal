# Live server (verified 2026-10-23)

**No password is stored here.** Ask the owner. The old SSH password was pasted in a chat; it should be changed in cPanel.

| Item | Value |
|---|---|
| Host / port / user | `173.249.159.38` / `7936` / `workplaceintersm` (cPanel server "server3") |
| Hardware / software | 24 cores, ~40 GB RAM, PHP 8.2, MySQL 8.0 (same server), Laravel 12 |
| **Live app folder** | `~/public_html/api/Inter-Smart-Portal` (git branch `main`) |
| Backend code | `~/public_html/api/Inter-Smart-Portal/backend` |
| Web entry | `~/public_html/api/index.php` is a symlink into `backend/public` |
| Database | `workplaceintersm_intersmart_portal`, 92 tables, 38 migrations run |
| API URL | `https://workplace.intersmart.in/api` (routes are reached as `/api/api/...`, e.g. `/api/api/login`) |
| Health check | `GET https://workplace.intersmart.in/api/ping` returns 200 |
| Frontend | Vercel, `https://www.workplace.intersmart.in` (auto-deploys from `main`) |
| Scheduler | cron every minute: `php artisan schedule:run` in the backend folder |
| OLD unused copy | `~/public_html/backend` (branch `office`): DB login fails, files edited. **Do not use or deploy.** |
| Backups | `~/safety_backup_2026-10-23/` has DB dump, code tgz, `env.backup`, `stray/` |

## Live .env state (as of 2026-10-23)
`APP_ENV=production`, `APP_DEBUG=false` (changed from local/true on 2026-10-23). Cache, queue and sessions use the **database** driver. Config is **not** cached (do not run `config:cache`/`optimize` without checking).

## How to deploy (code only, no migrations)
1. Backup DB (`mysqldump --single-transaction`) and `.env`.
2. `cd ~/public_html/api/Inter-Smart-Portal && git fetch origin main && git diff --stat HEAD origin/main`
3. If migrations are in the diff: `php artisan migrate --pretend` in `backend` and read it first.
4. `git pull --ff-only origin main`; `curl https://workplace.intersmart.in/api/oc-reset.php` (opcache reset).
5. Check `/api/ping` = 200 and a fake login returns 401.
Rollback: `git reset --hard <previous commit>` (only safe if no migration ran).

## Local development
Local `backend/.env` points at local MySQL (`intersmart_local`, root, blank password, 127.0.0.1:3306). Old Supabase settings are in git-ignored `backend/.env.supabase.bak`. Local MySQL still needs to be created; `phpunit.xml` uses MySQL `hrms_test_db`. PHP is not on PATH (XAMPP not at `C:\xampp`).
