# End-to-end browser test (local only)

Drives the real screens for Test Workflows A-H with one test user per role. **Never run it against the live site**: it creates data and sends notifications.

Needs about 3 GB of free memory (the Next.js dev server alone uses ~1.4 GB). Close other heavy apps first; on this PC an earlier run was stopped by the system for low memory.

## One-time setup
- `npm i playwright-core` in any scratch folder, and copy `e2e.js` there. It drives the installed Microsoft Edge (`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`).
- A local MySQL with an empty database `intersmart_local`, and the backend `.env` pointing to it (see `docs/roadmap/PROGRESS.md`, "Local test environment").

## Each run
1. Reset the database: drop and create `intersmart_local`, then `php artisan migrate --force`.
2. Seed users: `php artisan tinker --execute="require 'path/to/seed_e2e.php';"` (6 users, password `Test@12345`, teams Sales / Accounts / PMO 1 / Design / HTML, all three module flags on).
3. Start the stack: `php -S 127.0.0.1:8765 -t public` (with a php.ini that enables mbstring, pdo_mysql, etc.), `python corsproxy.py` (port 8766; the backend only allows CORS from port 3000), and `NEXT_PUBLIC_API_URL=http://127.0.0.1:8766/api npx next dev -p 3100`.
4. `node e2e.js <output-folder>`: prints PASS/FAIL per step, writes `e2e_results.json` and failure screenshots.
5. Stop the three servers.

## Last results (23 Oct 2026)
Run 3: 36 of 40 passed. The 4 failures were: two unclear error messages ("Required."), the Accounts team unable to list people for sales targets, and a test button selector. All fixed (commit 8f5e2a2). The re-run after the fixes was stopped by low memory and has not been repeated.
