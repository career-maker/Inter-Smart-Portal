# CHECKPOINT: read this first, then continue

_Last updated: 2026-10-24. Update this file and commit it after every unit of work (see "Standing rules")._

You are continuing the **Internal Software Plan** for the Intersmart Employee Portal. The owner is a developer on Team QA; the manager's sheet is `SOURCE_Internal_software_plan.xlsx`. Work in small, tested, reversible slices. Never break the existing modules.

**Read order for a new agent:** this file, then `PROGRESS.md` (history and gotchas), then `EXECUTION_PLAN.md` (rules and phase order), then `SOFTWARE_PLAN.md` (have vs build per role). `SERVER.md` has the live server layout.

## 1. Where we are

| Phase | State |
|---|---|
| 0 Safety net and hardening | About 85% done. Left: staging copy (needs owner approval: sub-domain, DNS, certificate), GitHub branch protection (owner decision), load test (needs staging), review of the 40 old failing tests |
| 1 Accounts | **Live** (flag `accounts`), access = Accounts team + Super Admin |
| 2 Sales | **Live** (flag `sales`), built from the manager's sheet because the Sales document has not arrived |
| 3 Project Office (PMO) | **Live** (flag `pmo`). Assumption: PMO 1/PMO 2 team leads = project managers, PMO team members = coordinators |
| 4 Department work screens | **Slice 1 live** (flag `workflow`): UI pages, sections, status chain, page budgets, My Work. **Slices 2 to 4 not started** |
| 5 Team lead and resource screens, 6 Dashboards and feedback, 7 HR and go-live | Not started |

**Live server** (cPanel, MySQL 8): code is at commit `33ddf8d` (Phase 4 slice 1). `origin/main` is ahead only by docs commits. 4 flags are ON: accounts, sales, pmo, workflow. Live has 110 tables. Latest backup folders are `~/safety_backup_*` on the server (newest: `2026-10-24_0016_phase4a`).

**Tests:** 201 backend tests, 40 known old failures listed in `backend/tests/known-failures.txt` (CI fails only on NEW failures). Browser end-to-end: `docs/roadmap/e2e/` (48 steps; the first 40 passed together, the 8 new UI steps passed separately, one combined run is still to do).

**Manager-facing PDFs** (regenerate after every change, they copy to `D:\downloads`): `Progress Report.pdf`, `Test Workflows.pdf`, `System Overview.pdf`.

## 2. Next actions, in order

1. **Phase 4 slice 2: UX and Dev sprints with effort approval.** Design (follow the UI slice's pattern in `UiWorkflowController`, `WorkAccess`, `components/work/UiPages.tsx`):
   - Tables (new migration, add-only): `work_sprints` (project_id, team_id = department, title, status, effort_days, created_by, approved_by/at, requested start/end, confirmed start/end), `sprint_items` (sprint_id, title, effort_days, assigned_to, status chain: Pending, In progress, Completed, Testing bugs 1/2/3, Waiting for approval, Corrections 1/2/3, Approved, time_spent_days), `sprint_events` (history).
   - Flow: team lead (lead of the department team) creates a sprint with items and effort and submits; project manager (`Access::pmoManager`) approves or rejects (reason needed) against the department budget; coordinator requests start and end dates; team lead schedules and assigns resources; resources update item status daily. Notifications at each hand-off through `App\Support\Notify`.
   - Same gates as UI: `WorkAccess::requireOpenTab($project, 'ux'|'dev')`, flip those tabs' `ready` to true in `ProjectGate`, add tabs to `work/projects/[id]/page.tsx`.
2. **Slice 3: QA hand-off.** When an item becomes Completed it creates a QA review; QA team (name starts 'qa') lists bugs with priority; team lead verifies; if effort spent exceeds the department budget, notify the project manager and Super Admin ("budget exceeded").
3. **Slice 4: corrections and changes with budget approval.** Coordinator raises, team lead sets effort, project manager approves against the budget.
4. Phase 5: team lead and resource inbox (start/end task, budget and date exceeded reasons, team list, the fixed feedback questions: attitude, attire, learning new things, on-time completion), Phase 6/7: HR performance views, appreciation approval, dashboards.
5. Whenever memory allows: one combined run of all 48 browser steps, then update the docs.

## 3. Blocked on the manager (do not guess these)

Sales document fields; budget-per-department formula (sections x animation level) and who may change it; rating formula (needs HR approval); customer feedback questions and who enters them; meetings (simple request/approve vs calendar invites); appreciation sharing and Google review count (manual or automatic); keep or replace the old bug tracker; pilot-first or all-at-once go-live. The list is also in `progress.json` under `decisions`.
**Owner decisions pending:** approve the staging copy (sub-domain, DNS, certificate); require review before merging to `main` on GitHub; change the SSH password that was pasted in chat.

## 4. Standing rules (the owner asked for these)

1. **Never disturb the running site or database.** Every live change: back up the database and `.env` first, preview migrations with `php artisan migrate --pretend --force`, apply, then check `/api/ping` = 200 and a fake login = 401. New modules ship **dark** behind `module.<name>.enabled` and are switched on only after verification.
2. Add-only database changes: new tables, new nullable columns. No rename, drop or type changes on existing tables.
3. New roles and access follow the **department (team name)**, never edits to existing roles. See `App\Support\Access` and `WorkAccess`.
4. After every user-visible change update **both** PDFs: `progress.json` then `python docs/roadmap/make_progress_pdf.py`; `test_workflows.json` (mark sections `new`/`changed`, bump version, changelog) then `python docs/roadmap/make_test_pdf.py`; and `overview.json` then `python docs/roadmap/make_overview_pdf.py` when a stage changes status.
5. After every unit of work update this file (section 1 and 2) and `PROGRESS.md`, then commit and push. Commit messages end with the co-author lines from the session's instructions.
6. Test yourself before telling the owner it works: PHPUnit for logic, the browser test for screens. Never claim a test run you did not do.
7. Never run browser tests or write data on the **live** site. Use the local copy.
8. Never put passwords in files. The SSH password is not stored anywhere; ask the owner.

## 5. How to work (commands and facts)

**Repo:** `D:\iss\Inter Smart-Employee-Portal` (Laravel 12 backend in `backend/`, Next.js frontend in `frontend/`). GitHub `career-maker/Inter-Smart-Portal`, branch `main`; push auth is already in the local git remote. Pushing `main` redeploys the Vercel frontend; the backend only changes when someone pulls on the server.

**Live server:** host `173.249.159.38`, SSH port `7936`, user `workplaceintersm` (details in `SERVER.md`). App folder `~/public_html/api/Inter-Smart-Portal` (NOT `~/public_html/backend`, an old unused copy). Deploy = backup, `git pull --ff-only origin main`, `php artisan migrate --pretend --force` then `migrate --force` if needed, switch the flag on with `php artisan tinker --execute="App\Support\Feature::set('<name>', true);"`, verify. Use `paramiko` from Python for SSH. Create short-lived Sanctum tokens named `verify-tmp` to check access per person, then delete them. Remote writes and production deploys may be blocked by the tool's permission system until the owner grants it; do not work around a block, tell the owner.

**Local stack for testing** (no XAMPP): PHP 8.2 and MySQL 8.4 binaries come from Local by Flywheel at `C:\Users\Abhiram P M\AppData\Roaming\Local\lightning-services\` (`php-8.2.29+0\bin\win64\php.exe`, `mysql-8.4.0\bin\win64\bin\mysqld.exe`). Copy `dev-env/php.ini.template` to a scratch folder and set `extension_dir`. Start your own MySQL: `mysqld --initialize-insecure --datadir=<scratch>\mysql-data` then `mysqld --datadir=... --port=3306 --mysqlx=OFF`; create databases `intersmart_local` and `hrms_test_db`. Backend `.env` already points at local MySQL (root, blank password). Run tests: `php -c <ini> vendor/bin/phpunit` (put the Local `mysql.exe` folder on PATH so the schema file loads). Browser test: see `e2e/README.md`. The machine has about 16 GB RAM and little free: close apps, cap Next with `NODE_OPTIONS=--max-old-space-size=900`, and the system will kill background jobs when memory is critical.

**Database facts:** fresh databases are built from `backend/database/schema/mysql-schema.sql` (the live structure) plus later migrations, because old migrations break on MySQL. Do not regenerate that file; new tables arrive as migrations.

**Code map:** access helpers `backend/app/Support/{Access,WorkAccess,ProjectGate,Feature,Notify,ProjectPaymentState}.php`; controllers `backend/app/Http/Controllers/Api/{Accounts,Sales,Pmo,Work}/`; routes in `backend/routes/api.php` (module groups with `feature:<name>`); module flags are checked by `FeatureController` (`GET /api/features`, per person); frontend pages `frontend/src/app/(dashboard)/{accounts,sales,pmo,work}/`, shared `frontend/src/components/work/UiPages.tsx`, navigation groups in `frontend/src/app/(dashboard)/layout.tsx` (a group with `feature:` is hidden unless that flag is true for the person).

## 6. Gotchas that cost time before

- The shell and edit tools collapse double backslashes inside heredocs and Python strings. Write PHP/JS files with the Write tool, and use `chr(92)` in scripts.
- `php artisan serve` ignores `-c php.ini`; run `php -c ini -S 127.0.0.1:8765 -t public`. `artisan tinker file.php` does not execute; use `--execute="require 'file.php';"` with `< /dev/null`.
- The frontend caches GET requests for 2 minutes, but mutations invalidate by the first URL segment (see `frontend/src/services/api.ts`). The backend only allows CORS from port 3000, so tests on port 3100 go through `e2e/corsproxy.py`.
- Refused actions must carry a full sentence in BOTH `message` and `errors.<field>[0]`, because the app's error handler shows the field text.
- The dialog component is already a right-hand side panel. Put content in a header plus a `flex-1 overflow-y-auto` body with `shrink-0` children or cards get squashed.
- `Role` access in this app is a single `user.role` string; module access is therefore by team name (`Access::inTeam`), not Spatie roles.
- Live `.env`: `APP_ENV=production`, `APP_DEBUG=false`, cache and sessions use files, queue uses the database.
- `public/oc-reset.php` and `public/uploads/` in the live repo folder are untracked on purpose; leave them.
