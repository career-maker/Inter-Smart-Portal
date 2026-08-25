# Project Management Module — Current Checkpoint

> Handoff checkpoint only. No production code, no HR migration, and no PostgreSQL compatibility fix was made or attempted while producing this document. Stage 8 has not started.

**Checkpoint date:** 2026-08-25

---

## Overall Status

| Area | Status |
|---|---|
| Database migrations | **COMPLETE** — 16 PM migrations successfully executed on cPanel MySQL 8.0.46 |
| Backend implementation | **COMPLETE** (Stage 7 scope) |
| Automated test validation | **BLOCKED** — by a pre-existing HR PostgreSQL migration incompatibility, unrelated to PM |
| Frontend / Stage 8 | **NOT STARTED** |
| AI assistant | **DEFERRED** — the existing HR chatbot remains as-is; no PM AI assistant has been implemented |
| User roles | **Unchanged: exactly three** — Employee, Team Lead, Super Admin/HR. No new role exists or was created for Project Coordinator, at any point in this module's implementation |
| Project Coordinator model | Ordinary Employee users who belong to the existing HR "Project Coordinators" department — a data relationship, not a role |
| Project Coordinator Team Lead | An ordinary Team Lead user — no special or new role |
| Additional PM-specific user roles | **None exist** |

---

## Database Status

Exactly **16** `pm_*` tables exist in the production MySQL database. All 16 PM migrations are recorded as **Ran**.

The PM migration chain completed successfully after three MySQL-compatibility fixes, applied in response to real production migration failures on cPanel (each root-caused from the actual MySQL 8.0.46 error before any fix was written — see commit history):

1. **PostgreSQL partial-index syntax** (`CREATE UNIQUE INDEX ... WHERE ...`, invalid on MySQL) replaced with a MySQL-**and**-PostgreSQL-compatible generated-column (`storedAs()`) + plain unique-index approach — `pm_projects.name_normalized`, `pm_sub_phases.scope_key`.
2. **`pm_sub_phases` generated-column / FK `CASCADE` conflict** — MySQL/InnoDB forbids `ON DELETE CASCADE`/`SET NULL` on a column a generated column depends on; `team_id`'s delete action changed to `RESTRICT` (also the architecturally correct choice independent of the MySQL restriction).
3. **`pm_hubstaff_tokens` AUTO_INCREMENT / CHECK conflict** — MySQL 8.0.16+ forbids a `CHECK` constraint referencing an auto-increment column; `id` changed to a plain (non-auto-increment) primary key, application code always upserts it as `id = 1`.

---

## Automated Test Result

**Full suite (`php artisan test`, all Feature + Unit tests):**
```
143 total
136 failed
7 passed
0 skipped
8 assertions reached
535.12 seconds
```

### Root cause

`backend/database/migrations/2026_07_01_000003_make_wfh_date_nullable.php` — dated **2026-07-01**, months before any Stage 6/7 Project Management work began.

The migration contains MySQL-specific DDL:
```php
DB::statement('ALTER TABLE wfh_requests MODIFY COLUMN wfh_date DATE NULL');
```
`MODIFY COLUMN` is MySQL-only syntax. PostgreSQL has no such clause (it requires `ALTER TABLE wfh_requests ALTER COLUMN wfh_date DROP NOT NULL` instead).

The test infrastructure (`phpunit.xml`, pre-existing in this repo, not created for PM) points at a PostgreSQL test database (`hrms_test_db`, `postgres:17`). Every test class uses Laravel's `RefreshDatabase` trait, which runs the **complete** migration chain from scratch before any test body executes. This statement is reached chronologically before any PM or HR test can run, and fails with a Postgres syntax error (`SQLSTATE[42601]`) every time.

### Important interpretation

- This is **NOT** evidence of a PM implementation failure.
- This is **NOT** a PM migration failure — all 16 PM migrations are separately confirmed **Ran** in production (MySQL), independent of this test-suite finding.
- This is **NOT** a Stage 7 code regression.
- This **IS** a pre-existing HR migration / test-environment PostgreSQL-compatibility issue, unrelated to and predating Project Management.
- The HR migration was **not** changed to make these tests pass.
- No PM code was changed to work around it.
- No passing test results were fabricated — the numbers above are the actual, observed `php artisan test` output.

The same failure (identical file, identical line, identical `SQLSTATE[42601]` syntax error) was independently confirmed across PM test files, pre-existing HR test files, and the full aggregate suite — proving it is universal and not specific to anything PM introduced.

### Test files attempted

Run individually, each producing the identical root-cause failure (0 assertions, 0 passed):
- `tests/Feature/ProjectAuthorizationTest.php` — 8 failed
- `tests/Feature/ProjectTest.php` — 13 failed
- `tests/Feature/ProjectTaskTest.php` — 8 failed
- `tests/Feature/AuthTest.php` — 4 failed
- `tests/Feature/EmployeeTest.php` — 2 failed
- `tests/Feature/LeaveRequestTest.php` — 3 failed

Additionally covered **only via the full aggregate suite** (not run individually in this validation pass): the existing Biometric-related HR tests (`BiometricFoundationTest.php`, `BiometricIngestionTest.php`, `BiometricReconciliationTest.php`, `ProcessBiometricEventsTest.php`), `SchedulerEndpointTest.php`, and the two framework default stub tests (`tests/Unit/ExampleTest.php`, `tests/Feature/ExampleTest.php`) — these are among the 143 total in the full-suite run above; they were not separately isolated and re-run one by one.

**Full suite:** 136 failed, 7 passed, 8 assertions, 535.12s (all failures share the identical root cause above).

---

## Implementation Status (Git)

| Commit | Content |
|---|---|
| `8a1a294` | Stage 7 backend foundation — 16 models, 4 services, 8 form requests, 3 controllers, 1 additive route block, permissions seeder, notifications, tests |
| `e6e531b` | Migration fix — foreign keys aligned with the real HR schema (`pm_sub_phases.team_id` CASCADE → RESTRICT) |
| `71a1996` | Migration fix — `pm_hubstaff_tokens` singleton made MySQL-compatible |

These are historical commits and have not been altered.

(For completeness, the two earlier commits that first created and then MySQL-compatibility-fixed the 16 migration files: `8e102e3`, `a6361aa`.)

---

## Important Business Rules for Future Work

1. **Only three HR roles exist**: Employee, Team Lead, Super Admin/HR.
2. **Never create**: a Project Coordinator role, a Project Coordinator Team Lead role, any other PM-specific user role, or a separate PM account type.
3. **Project Coordinator eligibility** is determined entirely through the existing HR department **"Project Coordinators"** — membership in that department, looked up by name, never a hardcoded ID.
4. **Project Coordinator Team Members** are ordinary Employees.
5. **Project Coordinator Team Leads** are ordinary Team Leads.
6. **No special powers** are automatically granted merely by Project Coordinators department membership, beyond the explicitly designed PM object-level permissions/relationships (see `ProjectAuthorizationService`) — access is granted only by an actual `project_coordinator_id`/`pm_tasks.coordinator_id` assignment, never by department membership alone.
7. **The existing HR chatbot must remain as-is.** A PM-aware AI assistant is deferred for future implementation — not built, not started.
8. **Do not start Stage 8** until this checkpoint has been reviewed and accepted.

---

## Next Stages

### Stage 8 — Frontend PM Implementation: NOT STARTED

Per the finalized PM design (`PROJECT_MANAGEMENT_MODULE_DESIGN.md`), future frontend work should include:
- PM navigation (additive entry in the existing sidebar)
- PM landing/dashboard page
- Project UI (list, detail)
- Project creation/editing
- Project members UI
- Sub-phases UI
- Task UI (list, detail, "my tasks")
- Task assignment UI
- Comments UI
- Attachments UI
- Bugs UI
- Checklists UI
- Corrections UI
- PM settings UI
- Hubstaff display/integration UI, exactly as scoped in the finalized architecture (display-only, read-through)
- Notifications UI integration (reusing the existing `NotificationDropdown`)
- Responsive behavior matching the existing HR Portal's UI conventions
- Authorization-aware UI (hide/disable actions the current user cannot perform — cosmetic only; server-side authorization, already implemented in Stage 7, remains the real boundary)

**None of the above has been implemented.** This checkpoint documents scope only.

### Standing architectural facts (unchanged, for any future session to rely on)

- The existing HR dashboard (`GET /dashboard`) remains completely untouched. PM has its own separate landing page (not yet built).
- Existing HR authentication (Sanctum) is unchanged — no new login, account, or passkey system exists or is planned.
- The existing chatbot is unchanged — no PM-specific AI assistant has been built.
- The existing HR notification infrastructure (`notifications` table, `NotificationController`, `NotificationDropdown`) is reused by PM, not duplicated.
- The existing generic `audit_logs` table is reused by PM (`pm.`-prefixed actions), not duplicated.

---

**End of checkpoint. No production code, migration, or architecture was modified while producing this document.**
