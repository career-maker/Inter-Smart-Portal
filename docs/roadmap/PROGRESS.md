# Progress log (update after every work session)

_Last updated: 2026-10-23_

## Goal
Manager asked to implement the features in `SOURCE_Internal_software_plan.xlsx` (Sales, Accounts, PMO, PC, TLs, resources, QA, HR workflow) in the portal, and asked whether 100+ simultaneous users would break the DB or cause performance/security issues. Existing modules must not break.

## Status: PHASE 0 about 85%; PHASE 1 (Accounts) LIVE for the Accounts team (flag ON since 2026-10-23, about 15% overall). PHASE 2 (Sales) LIVE; PHASE 3 (Project Office) built + LIVE for PMO teams (about 40% overall). Next: Phase 3 PMO/PC core (needs budget-per-department rules), staging + load test. Remaining items need owner approval/access: staging subdomain+DNS+SSL, GitHub branch protection, then load test on staging. Live server and GitHub `main` are at `4307a9e` (+ later docs-only commits).
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

### Phase 1 Accounts (deployed 2026-10-23, commit a001ad7 + EmployeeForm role tweak; live backup `~/safety_backup_2026-10-23_2104_phase1`)
- Live: migration `2026_10_24_100000_create_accounts_module_tables` applied (5 tables: project_finance, project_payments, project_budget_changes, sales_targets, amc_contracts; role `Accounts`). Live now 97 tables. Flag `module.accounts.enabled` is NOT set = module hidden (routes 404, nav hidden, Accounts role option hidden).
- Code: `backend/app/Http/Controllers/Api/Accounts/*`, models, `App\Support\ProjectPaymentState`, `AccountsNotification`, routes under `api/accounts` (middleware `feature:accounts` + `role:Accounts|Super Admin`), `GET /api/features`, frontend `src/app/(dashboard)/accounts/{page,targets,amc}`, nav group in layout.tsx, role option in EmployeeForm.
- To enable on live (after owner OK): on server in backend folder run `php artisan tinker --execute="App\Support\Feature::set('accounts', true);"` then create the Accounts user via Employees form (role 'Accounts' now appears). Disable again with `Feature::set('accounts', false)` (cached up to 60s).
- Not yet done: eyeball the UI (browser extension was not connected; only compile + API flow verified); link projects to sales person (Phase 2 sets `project_finance.sales_user_id`); 'HR' role does not exist on live, so HR notifications reach no one until it exists; pm_projects already has a `budget` column, unrelated to `project_finance.contract_value`.
- Local test setup notes: `php artisan serve` ignores `-c`; run `php -c <ini> -S 127.0.0.1:8765 -t public` instead. Local frontend on port 3000 belongs to another process; backend CORS only allows port 3000, so a small proxy rewrote CORS for a test on 3100. `artisan tinker file.php` does not execute; use `--execute="require 'file.php';"`.

### Accounts switched ON (2026-10-23 night, commit 75f67a3)
- Access is by DEPARTMENT, not role: `App\Support\Access::accounts()` = Super Admin, or team name starts with 'accounts', or role 'Accounts'. Middleware alias `accounts.access`. `/api/features` returns accounts=true only for people who can use it. PMO teams (name starts 'pmo') get payment notifications.
- Live teams (id: name, lead, members): 10 Sales (Ann Mary Elias, 1), 11 Accounts (Ameesha Helan O R, 1), 5 PMO 2, 8 PMO 1, plus QA, HTML, WordPress, PHP, Design, React. There is no HR role/team on live.
- Verified on live with temp tokens (deleted): Accounts lead -> 200; Sales lead -> 403. Disable with `Feature::set('accounts', false)` (cached up to 60 s).
- Phase 2 Sales should use the same pattern (team name starts 'sales'; `Access` helper + middleware + flag) and set `project_finance.sales_user_id`.

### Phase 2 Sales (deployed 2026-10-23 late night; commits ad8fb0a, a0d0da4; live backup `~/safety_backup_2026-10-23_2124_phase2`)
- Built from the manager's sheet (no sales doc yet). Tables: leads, lead_activities, project_intake (live now 100 tables). Flag `module.sales.enabled` = true. Access: `Access::sales()` (Super Admin or team name starts 'sales'); `Access::salesSeesAll()` (Super Admin or lead of a 'sales%' team). Middleware `sales.access`.
- API under `api/sales/*`: dashboard, leads (+ activities), inbox, projects (create/list/status). Creating a project makes pm_projects row (status Planning, project_type=platform, category=site_category) + project_finance (sales_user_id = creator, contract_value = budget) + project_intake, marks the lead Won, and notifies Accounts team members.
- Frontend: `src/app/(dashboard)/sales/{page,leads,inbox,projects}`, nav group 'sales' (feature-gated per person via /api/features).
- Live data note: Accounts staff had already put a contract value on project 380 (no salesperson). Sales views ignore finance rows without a salesperson.
- Disable: `App\Support\Feature::set('sales', false)`.
- Not built yet: meetings, completed-project fields (free support/AMC/feedback), out-of-scope and 'action required' items from PC (Phase 3).

### Phase 3 Project Office (deployed 2026-10-24 early; commit 96181b8; live backup `~/safety_backup_2026-10-23_2152_phase3`)
- Tables (live now 107): project_acceptance, project_budget_allocations, project_holds, project_overrides, project_business_analysis, project_resources, out_of_scope_requests. Flag `module.pmo.enabled` = true.
- Access: `Access::pmo()` = Super Admin or team name starts 'pmo'; `Access::pmoManager()` = Super Admin or lead of a 'pmo%' team (ASSUMPTION: PMO 1/2 leads = project managers, PMO members = coordinators; live leads are users 71 and 11); `Access::pmoManagers()` for notifications. Middleware `pmo.access`. Notify helper `App\Support\Notify`.
- Tab lock rules in `ProjectGate`: payment open when advance approved or Super Admin override; working tabs (ui/ux/dev/qa) also need a department budget or PMO override. Locked tabs return HTTP 423 from the API.
- API under `api/pmo/*`; frontend `src/app/(dashboard)/pmo/{page,approvals,projects/[id]}`, nav group 'pmo'.
- Default PMO list = projects with a finance or coordinator record (the sales pipeline); `scope=all` adds older projects.
- Not built: PC rating, project category tree, UI/UX/Dev/QA/bugs/system-admin tab contents (Phase 4), PM dashboard (Phase 6), meeting requests.
- Disable: `Feature::set('pmo', false)` via tinker.

### Phase 4 slice 1: UI department work screens (deployed 2026-10-24; commit 33ddf8d; live backup `~/safety_backup_2026-10-24_0016_phase4a`)
- Tables (live now 110): project_pages, page_sections, page_events. Flag `module.workflow.enabled` = true. No role middleware: access is per project via `App\Support\WorkAccess` (manager, coordinator, member/lead of a department that has a budget on the project, or a QA team member). UI department = team name starts 'design' (UI lead = lead of that team).
- API under `api/work/*`; frontend `src/app/(dashboard)/work/{page,projects/[id]}` and `src/components/work/UiPages.tsx` (add more tabs there for sprints, QA, changes), nav group 'work' (`workflow` feature, true only for people with a project on their list).
- Extra pages beyond `project_intake.pages_count` are Pending until a PMO manager approves. Page budgets are capped by the design allocation.
- Slice plan: 2 = UX/Dev sprints + effort approval; 3 = QA hand-off + budget overrun alerts; 4 = corrections with budget approval.
- Test run note: end-to-end test now has 48 steps (section I added); the 40 old steps and the 8 new ones have each passed, but not yet together in one run. Use `until(...)` and `act(...)` helpers; never fixed sleeps.

### Visual check recipe (browser extension is not connected in this setup)
Install `playwright-core` in a scratch folder and drive the installed Edge headlessly (`executablePath: C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`) against a LOCAL stack: `php -c ini -S 127.0.0.1:8765 -t public`, a CORS proxy on 8766 (backend only allows origin port 3000), and `NEXT_PUBLIC_API_URL=http://127.0.0.1:8766/api npx next dev -p 3100`. Log in with a locally seeded Super Admin, screenshot pages, then stop the servers. The dialog component is already a right-hand side panel (like BirthdayWishDrawer); put content in a header + `flex-1 overflow-y-auto` body with `shrink-0` children, otherwise Cards get squashed (fixed 2026-10-23, commit 2ce1336).

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
8. **After every change that users can see:** (a) update `docs/roadmap/progress.json` and run `python docs/roadmap/make_progress_pdf.py` (manager's Progress Report); (b) update `docs/roadmap/test_workflows.json` (add/change steps, mark the section `new` or `changed`, bump `version` and `updated`, add a changelog line) and run `python docs/roadmap/make_test_pdf.py` (testers' Test Workflows). Both scripts copy the PDF to `D:\downloads`. Commit the JSON and PDFs.
9. **After every unit of work update `docs/roadmap/CHECKPOINT.md`** (section 1 state and section 2 next actions), and also `overview.json` + `make_overview_pdf.py` when a stage changes from planned to building to live. Commit and push so another agent can resume from GitHub alone.

### Pause note (2026-10-24 night)
Owner paused work. See `CHECKPOINT.md` section 2.0 for exactly how to resume: slice 2 (sprints) lives on branch `wip/phase4-slice2`, tested by 7 unit tests, final combined browser run still to do, not released. Local MySQL, PHP server, proxy and Next dev were all shut down; the local MySQL data folder was in the old session's scratch folder, so re-initialise it with the commands in `CHECKPOINT.md` section 5.
