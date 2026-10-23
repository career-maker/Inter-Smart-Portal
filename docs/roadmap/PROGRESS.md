# Progress log (update after every work session)

_Last updated: 2026-10-23_

## Goal
Manager asked to implement the features in `SOURCE_Internal_software_plan.xlsx` (Sales, Accounts, PMO, PC, TLs, resources, QA, HR workflow) in the portal, and asked whether 100+ simultaneous users would break the DB or cause performance/security issues. Existing modules must not break.

## Status: PHASE 0 about 85% (6% overall). Remaining items need owner approval/access: staging subdomain+DNS+SSL, GitHub branch protection, then load test on staging. Live server and GitHub `main` are at `4307a9e` (+ later docs-only commits).
Follow `EXECUTION_PLAN.md`: finish Phase 0, then Accounts, then Sales.

### Manager progress PDF (update after every phase/change)
Edit `docs/roadmap/progress.json` (phase status/percent, tasks, done list, changelog, `updated` date), then run
`python docs/roadmap/make_progress_pdf.py` (needs `pip install reportlab`). It writes `docs/roadmap/Progress Report.pdf` and copies it to `D:\downloads`. Share that PDF with the manager.

### Phase 0 results so far (2026-10-23). Deployed to live with backup `~/safety_backup_2026-10-23_2035` and verified: ping 200, fake login 401, throttle returns 429 after 10 tries; GitHub 'Backend tests' run passed.
- DONE: live backup taken; live schema saved as `backend/database/schema/mysql-schema.sql` (fresh MySQL DBs now build from it because the old migrations break on MySQL at `2026_06_29_083830`); feature switch (`App\Support\Feature`, middleware `feature:<module>`, setting `module.<name>.enabled`); login throttle per email+IP (10/min, not IP only because the office shares one IP); GitHub Actions `.github/workflows/backend-tests.yml` fails only on NEW test failures vs `backend/tests/known-failures.txt`; live debug off.
- Test baseline: 159 tests, 119 pass, 40 already failing (listed in `known-failures.txt`; mostly ProcessBiometricEvents 23, BiometricReconciliation 4, LeaveRequest 3, ProjectAuthorization 3, ProjectTask 3 and a few singles).
- TODO: staging copy + restore test, branch protection (GitHub admin), smoke tests for WFH/TA/Hubstaff/BugSmart/chat/hall/issues, token expiry + general rate limits + cache/sessions off DB (careful not to log everyone out), load test 150 users, review 40 old failing tests.

### Later 2026-10-23 additions (all deployed to live, verified)
- Sanctum token expiry 90 days (`SANCTUM_EXPIRATION_MINUTES`, live had 636 tokens, none older than 90 days); `throttle:api` 300/min per user on the authenticated group; `sanctum:prune-expired` daily 01:30.
- Live `.env`: `CACHE_STORE=file`, `SESSION_DRIVER=file` (queue still database). Rollback: `~/safety_backup_2026-10-23_2035/env.before_cache_change`.
- Fixed Super Admin dashboard widgets (audit_logs has no `description` column). Confirm on next Super Admin dashboard load that no new 'dashboard widgets error' lines appear in laravel.log after 15:13 UTC.
- Restore test passed (dump restored to temp DB with identical counts; temp DB deleted). The unused DB `workplaceintersm_intersmart_office` still exists (belongs to old copy).
- `uapi` on the server works as a normal user (no `--user`): used for DB create/delete.
- New tests: SmokeReadEndpointsTest (about 90 GET screens x 3 roles), ApiHardeningTest, SuperAdminDashboardTest. Suite: 165 tests, 40 known failures, 0 new.
- Note: tool text mangles double backslashes in heredocs; use chr(92) in scripts.

### Local test environment (no XAMPP needed)
PHP 8.2 and MySQL 8.4 come from Local by Flywheel (`%APPDATA%\Local\lightning-services`). A private MySQL was initialised in the session scratchpad on port 3306 (root, blank password, DBs `intersmart_local` and `hrms_test_db`); it must be started again in a new session with `mysqld --datadir=<dir> --port=3306 --mysqlx=OFF`. Run PHP with a custom ini enabling curl, fileinfo, mbstring, openssl, pdo_mysql, zip, gd, intl, sodium. Put the Local `mysql.exe` folder on PATH so `migrate` can load the schema file. Run tests with `php vendor/bin/phpunit`.

## Done so far
- [x] Read sheet; compared with code. Result: HAVE 7 / PARTIAL 29 / BUILD 30 (see `SOFTWARE_PLAN.md`).
- [x] Capacity/security review (summary below). PDFs: `Internal Software Plan - Implementation Roadmap.pdf`, `Execution Plan - Safe Rollout Order.pdf` (copies here and in `D:\downloads`).
- [x] Verified real live setup over SSH (see `SERVER.md`): MySQL 8 on cPanel, live app in `~/public_html/api/Inter-Smart-Portal` on `main`. CLAUDE.md corrected.
- [x] Local code aligned to MySQL: bug search `ilike` -> `like` (this was a real live bug), `phpunit.xml` to MySQL, biometric race test rewritten to `insertOrIgnore`, comments cleaned. Local `backend/.env` switched to local MySQL.
- [x] Login heading changed to "Welcome Back! Let's Get Started" and "Need help?" badge overlap fixed. Commits `07e5e9f`, `788dd82`.
- [x] Live server: backup taken (`~/safety_backup_2026-10-23`), `APP_ENV=production` / `APP_DEBUG=false` set, stray files moved aside, code updated to `main` `788dd82` (user ran the pull). Ping 200, fake login 401.
- [x] Git commits pushed to `origin/main` (repo `career-maker/Inter-Smart-Portal`): `07e5e9f`, `3ae735d`, `788dd82`.

## Findings still open (capacity + security)
| Risk | Level | Action (planned in Step 0) |
|---|---|---|
| Cache, queue AND sessions use the database driver on live | medium | Move cache/sessions to file (or Redis) |
| ~600-800 idle requests/min from 100 users (chat 20s, notifications 30s, tickers 5min polling) | medium | Cache unread counts, lengthen when tab hidden, later push/SSE |
| Only one throttle rule in whole API (forgot-password) | high | Throttle login, uploads, general API |
| Sanctum tokens never expire (`expiration` null) | medium | Set expiry; revoke on password change |
| No object-level Policies (0 Policy classes); route-role only | high for new roles | Add Policies before building Sales/PC screens |
| PHP and MySQL share one server (24 cores/40 GB, fine today) | medium | Index, cache dashboards, slow-query log; load test 150 users |
| MySQL limits (max_connections, buffer pool, cPanel per-account caps) | medium | Check and tune |
| Few tests (13 backend, 0 frontend), no CI | medium | Step 0.5 / 0.6 |
| Stale copy `~/public_html/backend` on server | medium | Archive/remove (ask owner first) |
| `public/oc-reset.php` is publicly callable (harmless opcache reset) | low | Keep or protect |
| SSH password pasted in chat | high | **Owner must change it in cPanel** |

Verdict given to manager: DB will not break at 100+ users; with Step 0 fixes expect 150-300 simultaneous users to be fine; confirm with a load test.

## Pending / not done
- [ ] Owner to change SSH password.
- [ ] Open decisions from manager (list in `SOFTWARE_PLAN.md`): sales doc fields, budget formula, rating formula, feedback questions, meetings scope, etc.
- [ ] Create local MySQL (`intersmart_local`, `hrms_test_db`); run `migrate` and tests locally; fix anything that fails.
- [ ] Step 0 tasks 0.1-0.8 (staging, branch protection, CI, smoke tests, feature flags, hardening).
- [ ] Live sessions/cache still in DB; unused `~/public_html/backend` still on server.
- [ ] Commit these roadmap docs (currently uncommitted) if the owner wants them in git.

## Rules for any future session (important)
1. **Never test or deploy in `~/public_html/backend`** on the server. Live = `~/public_html/api/Inter-Smart-Portal`.
2. Never trust local `.env` or old docs for live facts; verify over SSH (read-only first).
3. Before any live change: backup, preview, apply, check `/api/ping` and fake login; get owner approval. Production deploys and remote writes need the owner's permission rule; do not work around a block.
4. Do not store passwords in files; the SSH password is not in this repo.
5. Do not run `config:cache`, `optimize` or `migrate` on live without a preview and backup.
6. Add-only DB changes, feature flags, new roles only (see `EXECUTION_PLAN.md`).
7. Commit messages end with the Claude co-author line; push only when asked. `main` pushes reach Vercel immediately; backend goes live only when someone pulls on the server.
