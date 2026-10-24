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
| 4 Department work screens | **Slice 1 live** (flag `workflow`): UI pages, sections, status chain, page budgets, My Work. **Slice 2 (UX/Dev sprints) is BUILT BUT NOT RELEASED**, saved on branch `wip/phase4-slice2` (commit `f71b15d`). Slices 3 and 4 not started |
| 5 Team lead and resource screens, 6 Dashboards and feedback, 7 HR and go-live | Not started |

**Live server** (cPanel, MySQL 8): the live code last changed in commit `33ddf8d` (Phase 4 slice 1). Commits after it are docs-only; the server was brought level with `origin/main` on 2026-10-24. 4 flags are ON: accounts, sales, pmo, workflow. Live has 110 tables. Latest backup folders are `~/safety_backup_*` on the server (newest: `2026-10-24_0016_phase4a`).

**Tests:** 201 backend tests, 40 known old failures listed in `backend/tests/known-failures.txt` (CI fails only on NEW failures). Browser end-to-end: `docs/roadmap/e2e/` (48 steps; the first 40 passed together, the 8 new UI steps passed separately, one combined run is still to do).

**Manager-facing page:** the combined Live Report (System overview, Progress, Test workflows with tick boxes) is the Artifact at https://claude.ai/artifact/1YxcaJqixY6biuxQTmQ8K3. Update it after every unit of work (rule 4 below). The three PDFs exist too (`Progress Report.pdf`, `Test Workflows.pdf`, `System Overview.pdf`) but are no longer updated every time.

## 2. Next actions, in order

### 2.0 RESUME HERE: finish and release slice 2 (UX/Dev sprints)

State at the pause: the code is written and committed on branch `wip/phase4-slice2` (pushed to GitHub, NOT merged to `main`, NOT on the live server, no live migration run). Backend: migration `2026_10_24_140000_create_workflow_sprint_tables.php` (work_sprints, sprint_items, sprint_events), `SprintController`, models, `WorkAccess::sprintTeamIds/isLeadOf/canManageSprint`, `ProjectGate` ux and dev tabs now `ready`, 12 routes under `api/work`. `SprintWorkflowTest` (7 tests, 88 assertions) passes; the whole backend suite was last run at 201 tests before this slice. Frontend: `components/work/Sprints.tsx`, a "UX / Dev sprints" tab in `work/projects/[id]/page.tsx`; both side panels (`UiPages.tsx`, `Sprints.tsx`) now fill their forms once and refresh only after a save (fixes a real bug where a background reload wiped typing).

Rules implemented: team lead of a department (or PMO manager) plans a sprint with items (effort days, assignee from the same department) and a cost estimate, then submits; items and effort freeze after submit; the PMO manager approves (budget check against the department allocation, over budget needs `allow_over_budget` and tells the Super Admin) or rejects (reason needed; the team lead can fix and resubmit); after approval the coordinator requests dates, the team lead confirms ("Scheduled", assignees told); the assignee updates item status and days spent; finishing an item that overran its effort needs a reason and alerts the team lead and managers; first item in progress moves the sprint to "In progress"; all items Approved completes the sprint.

Steps to finish:
1. `git checkout wip/phase4-slice2` (or `git merge origin/wip/phase4-slice2`). Start the local stack (section 5, `e2e/README.md`): about 3 GB free memory is needed.
2. Run the whole browser test (`e2e/e2e.js`, 55 steps: A-F, I, J, G, H). Last results: first combined run 51/55 (B5 and J5 were outdated test expectations, I2 and I5 were the typing-wipe bug); all of those are now fixed in code and test. The second combined run was stopped at the pause with one failure seen, **F1** (the lead's status dropdown did not apply "Lost" under load; it passed in every earlier run, so treat it as a flaky step: make it wait for the PUT response, or retry). Need one clean 55/55 run.
3. Run `php -c <ini> vendor/bin/phpunit` and `python backend/tests/check_new_failures.py`; expected: 40 known failures, 0 new.
4. Merge to `main`, push (Vercel redeploys the frontend), then deploy with the standing routine: backup, `git pull --ff-only`, `migrate --pretend --force`, `migrate --force` (3 new tables), verify `/api/ping`=200 and fake login=401, check access with temporary tokens. The `workflow` flag is already ON, so the sprint tab becomes usable as soon as the code is live.
5. Update all three PDFs and this file: `test_workflows.json` add section **J** (steps: team lead plans a sprint with two tasks and submits; PMO manager approves; coordinator requests dates; team lead schedules, assignee told; team member works the task, over-effort asks for a reason; team lead approves tasks and sprint completes; outsiders cannot plan sprints), bump to v1.3, mark J as new, B5 text now says the Dev tab shows "Open the work view"; `progress.json` (Phase 4 percent about 50, sprint task Done); `overview.json` (UX and Dev stage becomes `live`).

### 2.1 Then

1. **Slice 3: QA hand-off.** When a sprint item becomes Completed it creates a QA review; QA team (name starts 'qa') lists bugs with priority; team lead verifies; if effort spent exceeds the department budget, notify the project manager and Super Admin ("budget exceeded").
2. **Slice 4: corrections and changes with budget approval.** Coordinator raises, team lead sets effort, project manager approves against the budget.
3. Phase 5: team lead and resource inbox (start/end task, budget and date exceeded reasons, team list, the fixed feedback questions: attitude, attire, learning new things, on-time completion). Phase 6/7: HR performance views, appreciation approval, dashboards.

## 3. Blocked on the manager (do not guess these)

Sales document fields; budget-per-department formula (sections x animation level) and who may change it; rating formula (needs HR approval); customer feedback questions and who enters them; meetings (simple request/approve vs calendar invites); appreciation sharing and Google review count (manual or automatic); keep or replace the old bug tracker; pilot-first or all-at-once go-live. The list is also in `progress.json` under `decisions`.
**Owner decisions pending:** approve the staging copy (sub-domain, DNS, certificate); require review before merging to `main` on GitHub; change the SSH password that was pasted in chat.

## 4. Standing rules (the owner asked for these)

1. **Never disturb the running site or database.** Every live change: back up the database and `.env` first, preview migrations with `php artisan migrate --pretend --force`, apply, then check `/api/ping` = 200 and a fake login = 401. New modules ship **dark** behind `module.<name>.enabled` and are switched on only after verification.
2. Add-only database changes: new tables, new nullable columns. No rename, drop or type changes on existing tables.
3. New roles and access follow the **department (team name)**, never edits to existing roles. See `App\Support\Access` and `WorkAccess`.
4. After every user-visible change update the **Live Report page** (owner's request, replaces regenerating PDFs each time): edit `progress.json`, `test_workflows.json` (mark sections `new`/`changed`, bump version, changelog) and `overview.json` (when a stage changes status), run `python docs/roadmap/make_live_report.py`, then republish `docs/roadmap/Live Report.html` with the Artifact tool using the SAME file path so the link stays `https://claude.ai/artifact/1YxcaJqixY6biuxQTmQ8K3` (private; the owner shares it from the page's Share menu). The three PDFs (`make_progress_pdf.py`, `make_test_pdf.py`, `make_overview_pdf.py`) are optional now: regenerate them only when the owner asks or at a milestone.
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
