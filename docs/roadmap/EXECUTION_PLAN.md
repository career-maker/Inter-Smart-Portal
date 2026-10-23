# Execution Plan: what first, and keeping existing modules safe

## Five rules
1. **Add, never change.** New tables, controllers, pages. No rewrites of existing ones.
2. **Add-only DB changes.** New tables; new columns nullable/with default. No rename/drop/type change on live tables.
3. **Everything behind a flag.** Reuse the `system_settings` table (key/value). Flag off = portal looks as today.
4. **New roles, old roles untouched.** Sales, Accounts, PMO, PC, TLs, QA are new roles; never edit Employee/Team Lead/HR/Super Admin permissions.
5. **Nothing live without the safety net:** tests + staging check + backup + rollback path.

## Risks that exist today
- Push to `main` reaches live when someone runs `git pull` on the server (see `SERVER.md`).
- Old unused copy in `~/public_html/backend` can be mistaken for live.
- No CI. Only 13 backend test files and no frontend tests (WFH, TA, Hubstaff, BugSmart, chat, hall, issues untested).
- Shared files every module touches: User model, roles, `layout.tsx` nav, DashboardController, Project/ProjectTask models. Add-only edits, separate small PRs, extra review.

## Step 0: safety net (weeks 1-2, no features)
| # | Task | Done when |
|---|---|---|
| 0.1 | Back up live MySQL; restore once on staging | A restore works |
| 0.2 | Staging: separate MySQL DB, staging subdomain on cPanel, Vercel preview | Staging has copy of live data, emails off |
| 0.3 | Local dev points to local MySQL, never live | Live creds on no laptop |
| 0.4 | Branch protection: no direct push to main, 1 review | GitHub rule on |
| 0.5 | GitHub Actions runs backend tests on every PR | Red check blocks merge |
| 0.6 | Smoke tests for existing modules (add WFH, TA, Hubstaff, BugSmart, chat, hall, issues, Playwright page check as each role) | All green on staging |
| 0.7 | Feature-flag helper reading `module.<name>.enabled` | Flag off hides routes + menu |
| 0.8 | Hardening: rate limits (login, uploads, general), Sanctum token expiry, cache/sessions off DB, load-test baseline | Baseline numbers recorded |

## Build order (risk to old modules)
| # | Phase | Touches | Risk |
|---|---|---|---|
| 0 | Safety net + hardening | config only | none |
| 1 | Accounts: payments, targets, AMC | new tables/pages | very low |
| 2 | Sales: leads, project intake, inbox | new tables/pages | very low |
| 3 | PMO + PC core: accept project, dept budget, tabbed view, payment gate | extends Project | medium |
| 4 | UI/UX/Dev workflow: pages, sections, sprints, effort approval, QA hand-off, corrections | extends tasks/corrections/bugs | high (build as parallel flow) |
| 5 | TL + resource screens | reads existing data | medium |
| 6 | Dashboards, customer feedback, appreciation approval | new screens | low |
| 7 | HR performance, regression, load test, rollout | read-only | low |

First release = Phases 1+2 (about 7 weeks): Sales creates project -> Accounts approves payment -> notification back. Pilot 2 sales + 1 accounts user.

## Release routine (every phase)
1. Feature branch, flag OFF. 2. PR: tests + smoke suite pass; review edits to shared files. 3. Deploy to staging; run old-module smoke + new tests. 4. QA written sign-off. 5. Backup live MySQL; deploy in a quiet window (not Monday morning, not payroll/leave-cycle). 6. Run migrations (confirm add-only), flag still OFF. 7. Flag ON for pilot group, watch 3-5 days. 8. Everyone.

**If something breaks:** switch flag off first (seconds, no redeploy). Faulty code: revert PR and redeploy previous commit. DB: add-only, so no rollback needed; restore backup only if data was damaged. Write a short incident note.

## Cautions per area
Roles: new roles only, test each old role after any roles migration. User table: optional columns only. Project/ProjectTask: nullable fields; keep statuses Planning/Active/On Hold/Completed/Cancelled valid. Nav (`layout.tsx`): add items inside role+flag check, never reorder/rename. Dashboard: new endpoints per role, leave current alone. Notifications: new types only. Scheduler: add jobs with `withoutOverlapping`; never touch leave/biometric/retention jobs. Performance: paginate + index every new list, cache dashboards, re-run load test per phase.
