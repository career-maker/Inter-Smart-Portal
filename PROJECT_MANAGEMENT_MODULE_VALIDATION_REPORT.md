# Project Management Module — Design Validation Report

> Validation only. `PROJECT_MANAGEMENT_MODULE_DESIGN.md` has **not** been modified. No production code has been touched. This report cross-checks the design against (1) the existing HR Portal codebase and (2) `d:\iss\QA-Tracker-Pro-main\Documentation\PROJECT_MANAGEMENT_MODULE_MIGRATION_NOTES.md` (the legacy QA Tracker Pro spec — read in full, 918 lines), which was not available when the design was written.

**Scope note:** this legacy-notes document itself warns its schema section may drift from the live QA Tracker Pro Supabase project ("verify directly against the live Supabase project before finalizing"). This validation inherits that same caveat — it is a documented-schema-level review, not a live-database re-verification, since this session has no Supabase credentials for that separate project.

---

## 1. Functional Coverage Checklist

| # | Feature | Status | Note |
|---|---|---|---|
| 1 | Projects | **COVERED** | `pm_projects` |
| 2 | Project lifecycle | **PARTIALLY COVERED** | Real `status` field exists (an explicit improvement over legacy's derived-from-tasks non-system, §7.3/§7.6 of notes) but no validated transition set is defined — see Gap A/B below |
| 3 | Project overview | **PARTIALLY COVERED** | `/projects/[id]` + `/project-reports/summary` cover the concept; legacy's specific per-team "lane" rollup (§7.5 of notes) isn't explicitly specified |
| 4 | Project metadata | **COVERED** | Every `project_overview`-absorbed field (blockers, budget, effort ×4, live/fixing notes, category, project_type) has a 1:1 home on `pm_projects` |
| 5 | Tasks | **COVERED** | `pm_tasks` |
| 6 | Task statuses | **PARTIALLY COVERED** | Design's 5-value generic list drops legacy's domain-specific vocabulary — see Gap A3 |
| 7 | Task priorities | **COVERED (improved)** | Validated Low/Medium/High/Critical vs. legacy's unconstrained free text |
| 8 | Multiple assignees | **COVERED (improved)** | `pm_task_assignees` join table vs. legacy's row-duplication-per-assignee anti-pattern |
| 9 | Task dates | **PARTIALLY COVERED** | start/due/actual dates covered; `include_saturday`/`include_sunday`/`start_time`/`end_time` not modeled — see Gap B3 |
| 10 | Achievement/completion dates | **PARTIALLY COVERED** | Field exists; auto-fill-on-Completed and hide-on-Rejected business rules not documented — Gap B5 |
| 11 | Task comments | **COVERED (improved)** | `pm_task_comments` vs. legacy's overwritable flat text |
| 12 | Current updates | **COVERED** | `current_updates` field kept as-is |
| 13 | Effort tracking | **COVERED** | allotted/confirmed/expected/committed effort all present |
| 14 | Time tracking | **COVERED** | `time_taken`/`days_taken`/`allotted_days` present as decimals (cleaner than legacy's `HH:MM:SS` text) — entry/display format is a small open decision |
| 15 | Activity percentage | **PARTIALLY COVERED** | Field exists; aggregation method (sum vs. average) not decided — Gap A4 |
| 16 | Deviation | **COVERED** | `deviation` field, formula matches legacy (`allotted − taken`) |
| 17 | Bug counts | **COVERED (improved)** | `pm_task_bugs` normalized table vs. legacy's flat, unauditable counters |
| 18 | HTML bugs | **COVERED** | `bug_type = 'HTML'` |
| 19 | Functional bugs | **COVERED** | `bug_type = 'Functional'` |
| 20 | Project milestones | **MISSING** | No dedicated timeline view/entity; not in the approved page list either — Gap C3 |
| 21 | Project timeline | **PARTIALLY COVERED** | Global `/schedule` exists; legacy's per-project timeline view is not explicitly specified |
| 22 | Checklists | **COVERED, but restructured** | Design adds a nesting level (instance → items) legacy doesn't have — Decision E1 |
| 23 | Checklist templates | **COVERED** | `pm_checklist_templates` |
| 24 | Checklist assignment | **COVERED** | `pm_checklists` per-project (and per-task, a scope legacy never had) |
| 25 | Checklist completion tracking | **PARTIALLY COVERED** | Per-item tracking covered; legacy's aggregated pass/pending progress-bar dashboard (`/checklist-status`) isn't explicitly named as a `/checklists` page requirement |
| 26 | Sub-phases | **COVERED, but restructured** | Design is global; legacy is per-team — Decision E2 |
| 27 | Corrections | **COVERED, but restructured** | Richer than legacy (good) but `task_id` modeled as required when legacy corrections are project-scoped — Gap A2 |
| 28 | Team management relevant to PM | **COVERED** | Reuses HR `teams` entirely, `pm_project_members` for finer scoping |
| 29 | Project Coordinators | **PARTIALLY COVERED** | Project-level coordinator covered; legacy's **task-level** `pc` field and its notification trigger is not — Gap A1 |
| 30 | Notifications | **PARTIALLY COVERED** | Infra reuse is correct; the one legacy notification trigger that actually worked reliably (PC notified with a diff on every task create/update) has no equivalent in the design's notification class list — Gap A1 |
| 31 | Email notifications | **PARTIALLY COVERED** | Same gap as #30 — pattern is right, the specific trigger is missing |
| 32 | Schedule | **PARTIALLY COVERED** | Page exists; the 18:30-cutoff/Completed-Overdue/Rejected-exempt/1-day-spillover business rules aren't documented — Gap B4 |
| 33 | Calendar | **COVERED** | Part of `/schedule` |
| 34 | Day view | **PARTIALLY COVERED** | Not explicitly named as a required `/schedule` sub-view |
| 35 | Availability | **COVERED** | Folded into `/workload`'s leave/attendance cross-reference — no separate page was requested either, so this is a deliberate, reasonable merge, not a gap |
| 36 | Workload | **COVERED** | `/project-reports/workload` |
| 37 | Reports | **COVERED** | `/project-reports/*` |
| 38 | CSV export | **MISSING** | Design only mentions `jspdf`; CSV is never mentioned despite being explicit legacy functionality on both Reports and Bug Analytics — Gap A5 |
| 39 | Bug analytics | **COVERED** | Via `pm_task_bugs` aggregation |
| 40 | AI assistant | **MISSING** | No PM coverage anywhere in the design — Gap A7 |
| 41 | Hubstaff integration | **MISSING** | Only a placeholder `hubstaff_project_id` column; no OAuth/API/service design — Gap A6 |
| 42 | Hubstaff member mapping | **MISSING** | No employee↔Hubstaff-ID table — Gap A6 |
| 43 | Hubstaff project mapping | **PARTIALLY COVERED** | Storage column exists; no linking flow/API designed |
| 44 | Project settings | **COVERED** | `pm_settings` + dedicated controller |
| 45 | Migration/import requirements | **PARTIALLY COVERED** | Design's phased strategy was reasonable given no source access at the time; §11 below now supplies the detailed field-level mapping the design deferred |

**Intentionally Excluded** (confirmed correct, not gaps): separate login/guest-mode/Manager-passkey/PC-passkey/separate accounts (explicit brief requirement — confirmed nowhere in the design); the dead/duplicate Brevo + partial Resend email paths (correctly consolidating onto one mechanism per the notes' own §24.7 recommendation); historical Hubstaff activity storage (legacy never persisted this either — read-through is the *correct* behavior to keep, not a gap); the abandoned "Requests" stub module (nothing functional to port).

---

## 2. Legacy Behavior vs. New Design

### A. Business functionality that must be preserved
- Multi-assignee tasks, effort/time/deviation/activity tracking, bug counting split by type, checklists-as-launch-gates, corrections-as-post-hoc-issue-tracker, sub-phase taxonomy, PC/coordinator notification routing, bug analytics, live-task-context AI Q&A — all named explicitly in notes §24.10 as "genuinely valuable" and worth carrying over. Design covers all except the AI assistant and the specific PC-notify-on-task-change trigger (see Gaps).
- Real production data exists behind this (a client project "KIBS" is referenced in the notes, §21) — implying the eventual import in §11 below is not a hypothetical exercise.

### B. Behavior that should be improved (design already does this correctly)
- Real FKs instead of `ILIKE`-matched free text for project/task/assignee (notes §5.5, §23.5).
- A join table instead of duplicated task rows per assignee (notes §6.5, §23.7).
- A real, validated `project.status` field instead of one derived from an aggregate of unrelated task rows (notes §7.3, §23.6) — direction is right, transition rules still need definition (Gap B1).
- One authorization model instead of four overlapping ones, and route-level enforcement that can't be silently bypassed the way a Supabase service-role key bypasses RLS (notes §3, §23.2/§23.4) — structurally guaranteed by the Laravel/Sanctum architecture, not just a policy choice (see §12 below).
- One mutation path (server-validated API) instead of two (server route + direct-browser-to-DB, notes §8/§23.11) — structurally impossible to replicate here, since the frontend never holds direct DB credentials.
- Normalized bug records instead of flat counters (design's own addition, beyond what notes asked for, but consistent with its spirit).

### C. Legacy technical implementation that must NOT be copied (checked one-by-one against the design)

| Legacy anti-pattern (notes ref) | Present in design? |
|---|---|
| Hardcoded passkeys `'intersmart'`/`'inter224'`, shared static cookie secrets (§22) | **Not present.** Confirmed clean — design has zero new auth surface |
| Hardcoded "QA Team"/"Team React" UUIDs used as sentinels (§22, §5.12) | **Not present.** No hardcoded IDs anywhere in the design |
| Demo credentials (§21, §22) | **Not present** — no seeder in the design ships demo accounts (note: a `ProjectManagementDemoSeeder` is proposed but must not hardcode credentials; flagged here for implementation-time attention) |
| RLS-as-decoration, service-role key bypassing it, some routes with zero auth check (§3.6, §23.4) | **Not present, and structurally can't be** — Laravel has no equivalent "bypass" concept; every route is behind `auth:sanctum` + `role:` middleware uniformly |
| Free-text `project_name`/`assigned_to` string-matching (§5.5, §23.5) | **Not present** — real FKs throughout |
| Row-per-assignee duplication (§6.5, §23.7) | **Not present** — join table |
| Two parallel mutation paths (§8, §23.11) | **Structurally impossible** — no browser-to-DB path exists |
| Three inconsistent Hubstaff client/retry implementations (§19.7, §23.10) | **N/A yet** — Hubstaff isn't designed at all (Gap A6); the *eventual* implementation must consolidate to one service class, called out explicitly in Gap A6's fix |
| File-system debug logging on serverless (§23.13) | **N/A** — Laravel's `Log::` facade (already used everywhere in the HR codebase) is the natural fit; no new logging mechanism needed |
| Inconsistent sum-vs-average activity aggregation (§8, §23.9) | **Not yet decided** — design doesn't specify either way (Gap A4) |
| Dead/orphaned code paths (Brevo, unused Hubstaff panels) (§23.12) | **N/A** — greenfield, nothing to inherit |

---

## 3. Database Review — All 17 `pm_` Tables

For each: purpose, PK, FKs, relationships, indexes/uniques, nullability of note, delete behavior. (Full column lists already exist in the design doc §4 — this section is the audit pass, not a re-listing.)

| Table | Purpose | PK | FKs | Unique/Index | Cascade | Notes from this validation |
|---|---|---|---|---|---|---|
| `pm_projects` | Core project record + absorbed metadata | id | `team_id`→teams, `project_coordinator_id`→users, `created_by`/`updated_by`→users | none specified beyond PK — **recommend** unique on `LOWER(TRIM(name))` matching the exact duplicate-prevention legacy was missing (notes §7.2 explicitly names this as the fix a unique constraint should have provided) | soft delete | Add the name-uniqueness index — legacy's #1 named data-quality bug (duplicate-named project rows) is directly preventable here and currently isn't specified |
| `pm_project_members` | Project↔user roster + role | id | `project_id`→pm_projects (cascade), `user_id`→users, `added_by`→users | unique(project_id, user_id) | cascade from project | Sound |
| `pm_sub_phases` | Global phase taxonomy | id | `created_by`→users | unique(name) | n/a (lookup) | **Open decision**: global vs. per-team — Decision E2 |
| `pm_tasks` | Core work item | id | `project_id`→pm_projects (cascade), `sub_phase_id`→pm_sub_phases (nullable, set-null), `team_id`→teams, `created_by`/`updated_by`→users | none beyond PK | soft delete | Status vocabulary gap (A3); missing weekend/work-hour fields (B3); missing task-level PC field (A1) |
| `pm_task_assignees` | Task↔user M:N | id | `task_id`→pm_tasks (cascade), `user_id`→users, `assigned_by`→users | unique(task_id, user_id) | cascade from task | Sound — directly satisfies "no duplicate task rows for multiple assignees" |
| `pm_task_comments` | Attributed comment history | id | `task_id`→pm_tasks (cascade), `user_id`→users | none beyond PK | cascade from task | Sound |
| `pm_task_attachments` | File attachments | id | `task_id`→pm_tasks (cascade), `uploaded_by`→users | none beyond PK | cascade from task | Sound, mirrors `issue_attachments` |
| `pm_task_bugs` | Normalized bug records | id | `task_id`→pm_tasks (cascade), `reported_by`/`fixed_by`→users | none beyond PK | cascade from task | Sound. Note for §11: legacy has no per-bug records, only totals — import will be lossy/synthetic here (flagged in §11) |
| `pm_checklist_templates` | Reusable checklist titles | id | `created_by`→users | recommend unique(name) — legacy's real template list is unique-by-title | n/a (lookup) | Add unique(name) |
| `pm_checklist_template_items` | Items within a template | id | `checklist_template_id`→pm_checklist_templates (cascade) | none beyond PK | cascade | **Only needed if Decision E1 keeps the nested model** — see below |
| `pm_checklists` | Instance attached to project/task | id | `checklist_template_id`→pm_checklist_templates (nullable) | index(checklistable_type, checklistable_id); recommend unique(checklistable_type, checklistable_id, checklist_template_id) to prevent double-assigning the same template twice, mirroring legacy's implicit one-per-(project,checklist) rule | n/a | Add the uniqueness guard |
| `pm_checklist_items` | Items within an instance | id | `checklist_id`→pm_checklists (cascade), `checked_by`→users (nullable) | none beyond PK | cascade | Sound structurally; existence itself is Decision E1 |
| `pm_corrections` | Post-hoc issue tracker | id | `task_id`→pm_tasks (cascade), `project_id`→pm_projects (cascade), `raised_by`/`assigned_to`/`created_by`→users | none beyond PK | soft delete not specified — legacy allows hard delete from `/corrections`; **recommend soft delete for consistency with `pm_tasks`/`pm_projects`** | **`task_id` should be nullable** — legacy corrections are project-scoped, never required to reference one specific task (Gap A2) |
| `pm_correction_comments` | Comment thread on a correction | id | `correction_id`→pm_corrections (cascade), `user_id`→users | none beyond PK | cascade | Sound (legacy has no equivalent — pure addition, fine) |
| `pm_correction_attachments` | Attachments on a correction | id | `correction_id`→pm_corrections (cascade), `uploaded_by`→users | none beyond PK | cascade | Sound |
| `pm_settings` | PM config key-value | id | `updated_by`→users (nullable) | unique(key) | n/a | Sound |

**Verification against the brief's explicit checks:**
- ✅ Project → Task is a real FK (`pm_tasks.project_id`).
- ✅ Task → Employee is a proper relationship (`pm_task_assignees` M:N join, not a text column).
- ✅ Project Coordinator references the real HR user system (`project_coordinator_id → users.id`) — **stronger than legacy**, which routed PC identity through a disconnected flat `global_pcs` roster with no login/employee link at all.
- ✅ Team references the real HR team system (`team_id → teams.id`) — no parallel `pm_teams` table was created.
- ✅ No employee names used as relational identifiers anywhere.
- ✅ No project names used as relational identifiers anywhere.
- ✅ No duplicate task rows required for multiple assignees (join table).
- ✅ No hardcoded IDs required anywhere in the schema.
- **Missing entity found**: a task-level PC/coordinator target (see §1 #29/#30, Gap A1) — legacy notifies on the *task's own* `pc` field, not only the project's coordinator. Either add a nullable `pc_id`→users column to `pm_tasks`, or explicitly decide the project-level coordinator is sufficient going forward (Decision, folded into Gap A1's fix options).
- **Missing entity found**: nothing to support the Hubstaff OAuth/mapping requirements (Gap A6) — needs two new tables (`pm_hubstaff_tokens`, `pm_user_hubstaff_links`), detailed in §9 below.
- **Unnecessary-if-Decision-E1-goes-the-other-way**: `pm_checklist_template_items` and `pm_checklist_items` — if the module deliberately mirrors legacy's flatter one-flag-per-title model instead of the richer nested one, both tables collapse away and `pm_checklists` alone (with a boolean `is_checked`/`checked_by`/`checked_at`) suffices. Not a defect either way — a business decision (E1) that changes table count.

No other unnecessary tables found; no other missing entities found (Hubstaff tables aside, which are a distinct gap, not a DB-review defect in what's already there).

---

## 4. Existing HR Portal Safety

Checked against every item in the brief's list, using the actual HR codebase (not assumption):

| Must-not-touch | Verified |
|---|---|
| ALTER existing HR tables | **None required.** All 17 PM tables are new `create_*` migrations. The one place a temptation could arise — adding `hubstaff_user_id` directly to `users` per the legacy notes' own recommendation (§24.5) — is deliberately avoided in this validation's Hubstaff proposal (§9) by using a new join table (`pm_user_hubstaff_links`) instead |
| Rename existing HR tables | None proposed |
| Remove existing columns | None proposed |
| Change existing HR APIs | None — PM's routes are 100% new paths (`/api/projects`, `/api/project-*`), verified against the full existing `routes/api.php` route list — zero overlap |
| Change existing HR business rules | None — Leave/WFH/Attendance/TA/Recognition/Issues logic is read-only referenced (Workload page) or entirely untouched |
| Change leave logic | Untouched. PM reads `leave_requests`/`attendance` read-only for Workload context — no write path |
| Change WFH logic | Untouched |
| Change attendance logic | Untouched |
| Change TA logic | Untouched |
| Change recognition logic | Untouched |
| Change helpdesk (Issues) logic | Untouched — though `pm_task_comments`/`pm_task_attachments`/`pm_correction_comments`/`pm_correction_attachments` structurally *mirror* `issue_comments`/`issue_attachments` as a **pattern**, they are separate tables, not shared ones |
| Change existing dashboard behavior | Untouched by design (explicitly deferred — design's own §9/§12 recommendation is a *separate* PM landing page, not an edit to `DashboardController@index`) |

**If any existing table must eventually be modified — flag, don't modify:** One candidate surfaced by this validation: if the business wants Hubstaff employee-linking to live directly on the `users` table (as legacy notes literally suggest, §24.5) rather than in a new join table, that would require a new nullable column on `users`. **Flagging only — the recommended design in §9 below avoids this entirely by using a new table instead, so no HR table touch is actually required.** No other candidate modifications were found.

---

## 5. Authorization Review — Permission Matrix

Corrected to the **actual** seeded convention (`RolesAndPermissionsSeeder.php`: lowercase, space-separated strings, e.g. `'approve leaves'`) — no dot-notation, no invented style. Object-level checks (own project/task) remain inline-in-controller, matching the existing codebase's only real pattern (no Laravel Policies exist anywhere today).

| Permission (route/action) | Super Admin | HR | Team Lead | Employee |
|---|:---:|:---:|:---:|:---:|
| View projects (own/member) | ✅ | — | ✅ | ✅ (own membership only, inline check) |
| View all projects | ✅ | — | — *(Decision E8)* | — |
| Create projects | ✅ `manage projects` | — | ✅ `manage projects` (own team) | — |
| Edit projects | ✅ | — | ✅ (own team, inline check) | — |
| Archive projects (= soft delete) | ✅ | — | ✅ (own team) | — |
| Delete projects | ✅ | — | ✅ (own team, same perm — no separate "delete" permission exists anywhere else in this codebase either) | — |
| Create tasks | ✅ `manage tasks` | — | ✅ `manage tasks` (own team) | — |
| Edit tasks | ✅ | — | ✅ (own team) | ✅ *own assigned tasks only* — status/current_updates/actual dates, inline assignee check (Decision E4 if this should instead be whole-team-permissive like legacy) |
| Delete tasks | ✅ | — | ✅ (own team) | — |
| Assign tasks | ✅ | — | ✅ (own team) | — |
| Change task status | ✅ | — | ✅ | ✅ *own assigned tasks* |
| Edit task dates | ✅ | — | ✅ | ✅ *own assigned tasks, actual dates only* |
| Edit effort | ✅ | — | ✅ | — (allotted/confirmed/expected/committed effort is a planning figure, not a doer-editable field) |
| Manage checklists | ✅ `manage checklists` | — | ✅ `manage checklists` | — (check-off own-visible items only, no permission needed — inline membership check) |
| Manage corrections | ✅ `manage corrections` | — | ✅ `manage corrections` | ✅ *may raise one* on a project/task they're a member of (no permission needed, inline check); status changes need the permission |
| Manage sub-phases | ✅ `manage sub phases` | — | — | — |
| View reports | ✅ `view pm reports` | — *(Decision E8)* | ✅ `view pm reports` (own team) | — (Employee sees only own Workload row, no permission gate — inline "is this my own data" check) |
| Export reports | ✅ (same permission — no separate export permission exists elsewhere in this codebase) | — | ✅ | — |
| View bug analytics | ✅ | — | ✅ (own team) | — |
| View workload | ✅ (all) | — | ✅ (own team) | ✅ (own row only, inline check, no permission) |
| Manage Project Coordinators | ✅ `manage projects` (setting `project_coordinator_id` is part of project edit, no separate permission — mirrors how `TeamController` doesn't have a separate "manage team lead" permission distinct from team edit) | — | — *(Decision: should a TL be able to set a coordinator on their own team's project? Leaning yes, folded into `manage projects`)* | — |
| Manage Hubstaff | ✅ **new: `manage hubstaff`** | — | — | — |
| Use PM AI assistant | ✅ | ✅ | ✅ | ✅ — **no permission gate**, matches existing HR chat (open to all authenticated, scoped by data visibility not by role) |
| Manage PM settings | ✅ `manage project settings` | — | — | — |

**New permissions required beyond the design doc's original 9:** `manage hubstaff` (added by this validation for the Hubstaff gap, §9). No others needed — "export reports" and "archive projects" fold into existing permissions rather than inventing new ones, consistent with the existing codebase never having separate view/export or edit/archive permission pairs anywhere.

**Flagged as requiring a business decision (not invented/assumed by this report):**
- **E8**: Should HR get `view all projects` / `view pm reports` for cross-functional visibility? Original design said no HR grants at all; this validation doesn't overturn that, just flags it's a real open call, not a technical necessity either way.
- **E4**: Employee task-edit scope — assignee-only (design's default, tighter) vs. whole-team-permissive (legacy's actual behavior, notes §6.4: "any team member can edit any task belonging to their own team, not just tasks assigned to them"). This is a genuine behavior choice, not a bug in either direction.

No invented permission conflicts with the existing HR role model — `Super Admin`/`Team Lead`/`HR`/`Employee` stay exactly as defined; PM only adds new granular permissions, no new roles.

---

## 6. Routes

**Frontend** — checked the proposed `(dashboard)/project-management/*` tree against the full existing 37-page route list (enumerated during the initial HR audit). **Zero collisions** — no existing HR page uses `project`, `projects`, or `project-management` as a segment anywhere.

**Backend** — checked every proposed `/api/project*` path against the complete existing `routes/api.php` (433 lines, fully enumerated during the initial audit). **Zero collisions** — no existing route uses `project` as a resource name anywhere in the current API surface.

**Isolation check:** every proposed PM route is additive, appended in a new block; no existing route's middleware group, controller binding, or path is touched. Confirmed consistent with the design doc's own §1/§9 commitments.

**One addition needed from the gaps below:** if Hubstaff (Gap A6) and AI (Gap A7) extensions are approved, they'll need their own new paths — recommend `/api/project-hubstaff/*` (link/status endpoints, `manage hubstaff`-gated) and extending the *existing* `POST /api/chat` (not a new endpoint) with PM context, per Gap A7's fix. Neither collides with anything existing either.

---

## 7. Notifications

| Requirement | Status |
|---|---|
| Reuses existing in-app notification infra (`notifications` table, `Notifiable`, `NotificationDropdown`) | ✅ Confirmed, zero new infra |
| Reuses existing email infra (`EmailService` pattern, new `Mailable`s) | ✅ Confirmed |
| Recipient authorization | ✅ **Improved over legacy** — Laravel's `$user->notifications()` inherently scopes to the owning user; this *structurally* closes the exact vulnerability in notes §14.1/§23.2 ("any caller can read or mark-read any PC's notifications by passing a different name") — there is no equivalent query shape available in this architecture that could reproduce that hole |
| Notification history | ✅ Same `notifications` table/read endpoints as every other module |
| Task changes | ⚠️ **Gap A1** — no `TaskChangedNotification` with diff exists in the design's notification list; this was legacy's single most reliably-wired trigger (notes §6.4, §14.3) and has no equivalent |
| Project changes | Not explicitly covered either — same fix as Gap A1 should extend to `ProjectUpdatedNotification` if project-level changes (not just task) should also notify the coordinator |
| Assignments | ✅ `TaskAssignedNotification` covers this |
| Deadlines | ✅ `TaskDueSoonNotification` (scheduled) covers this — legacy had no deadline notification at all, so this is a pure improvement |
| Overdue events | ⚠️ Partially — `TaskDueSoonNotification` is proactive (before due); nothing currently fires *on* overdue transition. Minor, foldable into the same scheduled job's logic (check due-soon and newly-overdue in one pass) |

**No duplicate notification infrastructure was created or is needed** — every gap here is closed by adding new *Notification classes*, not new plumbing.

---

## 8. Audit Logging

Verified directly against the actual `audit_logs` migration (`backend/database/migrations/2026_06_28_173752_create_audit_logs_table.php`):

```
user_id · action · model_type · model_id · changes (json) · ip_address · timestamps
```

- `model_type` / `model_id`: ✅ present, polymorphic-capable — PM writes `model_type = 'Project'|'ProjectTask'|'ProjectCorrection'|...` (the flat PM model class basenames from the design's §1 naming convention) and `model_id` = the record's PK.
- `action`: ✅ present — PM namespace confirmed as `pm.<entity>.<event>` (e.g. `pm.project.created`, `pm.task.status_changed`, `pm.correction.raised`).
- `changes`: ✅ present, JSON — PM writes `{'previous': {...}, 'new': {...}}`, and per the notification gap fix (§7/A1), this same diff shape should be reused as the `TaskChangedNotification`'s `data` payload so both systems compute the diff once, not twice.
- `user_id`: ✅ present — the acting user.
- `ip_address`: ✅ present, populated from `$request->ip()`.

**Confirmed: no second audit table is needed.** This table is genuinely fit for purpose (it was simply unwritten-to by any controller before now, per the original audit's finding) — reusing it is correct and required no schema change to verify.

---

## 9. Hubstaff — Gap Analysis & Recommended Addition

**Current design state: essentially unaddressed.** `hubstaff_project_id` exists as an opaque nullable string on `pm_projects` with an explicit note that OAuth/sync was "out of scope unless separately requested." Given this validation's brief explicitly requires reviewing the OAuth flow, token handling, mapping, retrieval, and failure behavior, **and** the legacy notes document a complete, reasonably clean integration pattern worth keeping (read-through only, no historical storage — notes §19.3, §24.6), this is scored as **MISSING** (§1 #41/#42) and needs a real design pass, which this section supplies for review — **not written into the design doc, per instructions.**

**Recommended addition (for approval, not yet built):**
1. `pm_hubstaff_tokens` — new singleton table (`id=1` constrained, `access_token`, `refresh_token`, `expires_at`, `updated_at`), mirroring legacy's `hubstaff_tokens` shape (notes §5.11) — that part of legacy was already good practice, just needs to be PM-owned/isolated rather than shared.
2. `pm_user_hubstaff_links` — new table (`user_id`→users unique, `hubstaff_user_id` string, `linked_by`→users, timestamps). This satisfies notes §24.5's explicit recommendation ("link employees to Hubstaff via an explicit ID field on the employee record") **without** altering the `users` table — resolving the tension between that recommendation and the HR-safety requirement in §4 above.
3. One consolidated `HubstaffService` class — fixes legacy's documented defect of three separate, inconsistent retry/cache implementations (notes §19.7/§23.10). OAuth2 refresh-token exchange, DB-persisted + in-memory token cache, 429 backoff — one implementation only.
4. Credentials via real Laravel env vars (`HUBSTAFF_ORG_ID`, `HUBSTAFF_REFRESH_TOKEN` in `backend/.env`) — never hardcoded, correcting legacy's one dead alternate static-token implementation.
5. **Read-through only, no local activity history table** — matches legacy's own actual (good) behavior: `activity_percentage`/`time_taken` on `pm_tasks` stay user-entered fields, exactly as legacy's own columns were *never* auto-written from live Hubstaff data despite existing (notes §19.3). If live write-back is wanted later, that's a distinct, separately-approved enhancement — not assumed here.
6. **Failure behavior**: any PM view depending on live Hubstaff data must degrade to a "data unavailable" state rather than failing the request — matching the existing codebase's isolated-failure convention already used for `EmailService`.
7. **No cron/scheduled job for Hubstaff itself** — legacy's on-demand-only model (notes §19.6) is fine to keep as-is; this is distinct from the separately-recommended `project:notify-due-tasks` job.
8. No hardcoded name-matching dictionaries (legacy's Hubstaff-name↔short-name maps, notes §19.4) — the `pm_user_hubstaff_links` table above replaces that entirely with a real, explicit link.

---

## 10. AI Assistant — Gap Analysis & Recommended Addition

**Current design state: absent entirely.** Scored **MISSING** (§1 #40). The legacy notes (§16, §24.10) document a working pattern worth keeping — live task-context injection + stateless LLM Q&A — and the HR Portal already has directly-reusable infrastructure for exactly this shape (`ChatController`, per the original architecture audit's §13).

**Recommended addition (for approval, not yet built):**
- **Extend the existing `ChatController`**, do not build a second AI system. Same provider chain (Gemini primary, Ollama fallback), same `POST /chat` endpoint, same "read-only, redirect to UI for actions" constraint already enforced today.
- **Authorization before context generation — the literal requirement**: the PM context block added to the system prompt must be built by running the **exact same scoped queries** the list endpoints (`GET /api/projects`, `GET /api/project-tasks`) already use for the calling user — i.e., reuse the same inline membership/team/permission checks from §5/§6, then inject only that pre-filtered result into the prompt. Never build PM context from an unscoped query and rely on the LLM not to leak it — the filtering must happen in SQL/PHP before the prompt is assembled, exactly matching how the existing chat context is already scoped to the caller's own leave balance, never anyone else's.
- Useful questions this should be able to answer (mirroring legacy §16's actual scope): "what are my open tasks", "what's overdue", "what's due today/tomorrow", "what's the status of project X" (only if the caller can see project X) — all answerable once the context block above is correctly scoped.
- **No second authentication/user system** — confirmed nothing in this recommendation introduces one; it rides the same `auth:sanctum` session as every other PM/HR endpoint.

---

## 11. Data Migration — Legacy Concept Mapping

Per the design doc's own §13, this was correctly deferred pending source access. Source is now available (schema-level); this section supplies the mapping the design doc anticipated. **This is new information for this validation, not a design doc edit.**

| Legacy concept | Maps to | Clean or needs reconciliation? |
|---|---|---|
| `projects` (+ absorbed `project_overview`) | `pm_projects` | Mostly clean, field-for-field (see design §4). **Two reconciliation points**: `pc` (free-text name) → `project_coordinator_id` needs name-matching against `users`, flag unmatched; `budget_text`/`hubstaff_budget` (two legacy fields) → one `budget` field needs a merge decision. `team_id` is mostly `NULL` in legacy (global) — best-effort infer from majority of its tasks' `team_id`, else leave null. |
| `tasks` | `pm_tasks` | **Several reconciliation points**: `project_name` (free text) → `project_id` needs fuzzy/exact name matching against already-imported projects, flag ambiguous/unmatched (legacy's own de-dup logic, notes §7.2, confirms this is a real, not hypothetical, problem in the source data); `assigned_to` (already one-per-row post legacy's `20260219` migration) → `pm_task_assignees.user_id` needs name matching against `users`; `sub_phase` (free text, sometimes not in `team_subphases` at all) → `pm_sub_phases.id`, create new rows for unmatched free-typed values rather than dropping data; `status` (9-value legacy vocabulary) → needs either an expanded target enum or an explicit collapse map (Gap A3/Decision E3); `time_taken` (`HH:MM:SS` text) → decimal days, same ÷8-hour-workday formula legacy itself used (document it explicitly, since legacy was inconsistent about whether to sum or average it downstream — Gap A4). |
| `assigned_to`/`assigned_to2`/`additional_assignees` | `pm_task_assignees` | Legacy's own `20260219_split_tasks_per_assignee` migration already denormalized these into one-row-per-assignee, which conveniently simplifies this to a straightforward per-task-row → per-assignee-row import once names are matched |
| `teams` | Existing HR `teams` (reused, no new table) | **Not automatically clean** — legacy's delivery-pod names (Designers, HTML, PHP Team, Wordpress, QA Team, Server, PMO, Frontend Developers) must be matched by name against HR's actual `teams` table, which likely represents real departments, not delivery pods. **Decision E6.** `Dubai`/`Cochin` were location tabs special-cased as fake "teams" in legacy — recommend **excluding these from any team import entirely** (they're not organizational teams). |
| `team_subphases` | `pm_sub_phases` | Cardinality mismatch reinforces Decision E2 (global vs. per-team) — resolve that decision *before* writing this import step, since per-team source data collapsing into a global target list needs de-duplication-by-name across teams either way |
| `checklists` + `project_checklists` + `project_checklist_status` | `pm_checklist_templates` + `pm_checklists` (+ `pm_checklist_items` if Decision E1 keeps the nested model) | Field mapping is clean; **structural mapping depends on Decision E1** — legacy is exactly one flag per (project, title), no sub-item nesting |
| `project_corrections` | `pm_corrections` | Clean for the fields that exist (`project_name`→`project_id` fuzzy match; `submitter_name`→`raised_by` name match; `correction_text`→`description`; `is_completed`/`completed_at`→`status`/`resolved_at`). **Fields with no legacy source, default on import**: `correction_type` (default `'Other'`), `severity` (default `'Medium'`), `assigned_to` (null), `task_id` (null — reinforces Gap A2's nullability fix, since legacy corrections were never task-scoped to begin with) |
| `global_pcs` | `users` (via `project_coordinator_id`) | **Not always cleanly mappable.** Legacy PCs are a free notification-routing roster, not necessarily real employees — some entries may have no corresponding HR `users` row at all. Flag unmatched PCs for a manual decision: create a real HR account for them, or leave the coordinator field null with the original name preserved in a migration note. **This is the clearest example of source data that cannot be mapped cleanly by name-matching alone.** |
| `projects.hubstaff_id` | `pm_projects.hubstaff_project_id` | Clean, direct 1:1 copy, no reconciliation needed |

**Explicitly flagged as NOT cleanly mappable, requiring a human decision rather than an automated rule:**
1. Legacy `comments` (flat, unauthored, overwritable text) → `pm_task_comments` (attributed, timestamped rows). Can only import as **one synthetic system comment per task** ("Migrated from QA Tracker Pro", timestamped at import) — the individual comment history was never separately preserved in the source, so it cannot be split.
2. Legacy `bug_count`/`html_bugs`/`functional_bugs` (flat totals only) → `pm_task_bugs` (per-bug records). Can only import as **synthetic placeholder rows** (N rows per type, no individual descriptions) to preserve analytics totals — true per-bug history doesn't exist in the source.
3. `global_pcs` entries with no HR account — see above.
4. Team name reconciliation (delivery pods vs. departments) — see above, Decision E6.

**Confirms the design doc's original principle stands**: the new schema is authoritative; legacy data is reshaped into it, never the reverse — nothing above suggests weakening the new schema to ease import.

---

## 12. Security Review

| Threat | Status |
|---|---|
| IDOR (project/task) | Mitigated by inline ownership checks (§5/§6 of design) — contingent on those checks actually being implemented at every mutating/reading endpoint; not automatic, needs code-review verification at implementation time |
| Unauthorized project access | Same mitigation |
| Unauthorized task access | Same mitigation |
| Unauthorized employee data access | Mitigated by the existing codebase's selective-column-load convention (`select('id','first_name',...)`, already used by `RecognitionController`/`IssueController`) — PM controllers must follow the same discipline, never an unscoped `User::all()` |
| Mass assignment | `$guarded = []` on all new models — an **inherited, pre-existing codebase-wide convention**, not a new risk introduced by PM; flagged as accepted-by-consistency in the original design, restated here as unchanged |
| Unrestricted API mutations | Mitigated by FormRequest validation on every write, per §3/§9 of the design |
| Browser-direct DB mutations | **Structurally impossible** in this architecture — unlike legacy's Supabase anon-key browser client (notes §8/§23.11), the Next.js frontend here has no DB credentials at all, ever; every mutation must go through the Laravel API |
| Hardcoded credentials | None in the design; the Hubstaff addition in §9 explicitly uses env vars, not literals |
| Hardcoded IDs | None found anywhere in the design or this validation's additions |
| Unauthorized AI context | **Currently N/A since AI isn't designed at all (Gap A7)** — the recommended fix in §10 makes authorization-before-context-generation an explicit, literal requirement of the addition, not an afterthought |
| Unauthorized notifications | Mitigated structurally by reusing `Notifiable`/`notifications` — see §7, directly closes legacy's exact documented vulnerability |

---

## 13. Final Gap Report

### A. MUST FIX BEFORE IMPLEMENTATION
1. Add a task-level PC/coordinator-notify-on-change mechanism (`TaskChangedNotification` + diff, extending `EmailService`) — legacy's single most reliably-wired feature, currently absent (§1 #29/#30, §7).
2. Make `pm_corrections.task_id` nullable — legacy corrections are project-scoped, not task-required (§3, §11).
3. Expand/decide `pm_tasks.status` vocabulary to include real domain states (at minimum `Forecast`, `Rejected`) or define an explicit collapse map (§1 #6, §11).
4. Decide and document the activity-percentage/effort aggregation method (sum vs. average) before building `/project-reports/*` — legacy shipped this inconsistent and it's explicitly named as a defect not to repeat (§1 #15, §23.9 of notes).
5. Add CSV export to Reports and Bug Analytics — explicit legacy functionality, currently unaddressed (§1 #38).
6. Design the Hubstaff integration for real (§9) — OAuth token storage, employee/project mapping tables, one consolidated service, failure degradation.
7. Design PM AI assistant coverage as an extension of the existing `ChatController`, with authorization-before-context-generation as a hard requirement (§10).

### B. SHOULD IMPROVE BEFORE IMPLEMENTATION
1. Resolve the checklist nesting decision (E1) before writing checklist migrations.
2. Resolve the sub-phase scoping decision (E2) before writing sub-phase migrations/import.
3. Add `include_saturday`/`include_sunday` (and optionally `start_time`/`end_time`) to `pm_tasks`, or explicitly decide to drop the weekend-visibility/work-hour-window business rules.
4. Document the Schedule page's overdue business rules (18:30 IST cutoff, `Completed (Overdue)` state, `Rejected` exemption, 1-day spillover) so they aren't silently reinvented differently during implementation.
5. Document the Achievement-Date auto-fill-on-Completed and hide-on-Rejected UI rules.
6. Decide employee task-edit scope: assignee-restricted (design default) vs. whole-team-permissive (legacy's actual behavior) — Decision E4.
7. Add a unique constraint on `pm_projects` name (case/whitespace-insensitive) and on `pm_checklist_templates.name` — closes a data-quality bug legacy explicitly had (§3).

### C. OPTIONAL FUTURE ENHANCEMENTS
1. True `.xlsx` export (vs. plain CSV) — would need a new frontend dependency; not currently justified unless specifically requested.
2. Live Hubstaff activity write-back into task fields — legacy never did this either; fine to stay manual indefinitely.
3. A dedicated per-project Milestones timeline page/route (currently foldable into `/projects/[id]` or a filtered `/schedule`).
4. Formal project/task status transition state-machine enforcement (currently: real field, loosely validated — consistent with how the rest of the codebase already treats status fields, e.g. `Issue.status`).

### D. Missing Functionality From QA Tracker (consolidated)
Task-level PC field + notify-on-change (→A1) · Forecast/Rejected statuses + related rules (→A3, B4, B5) · CSV/XLSX export (→A5, C1) · Hubstaff OAuth/API/mapping (→A6) · AI assistant (→A7) · dedicated Milestones view (→C3) · weekend/work-hour fields (→B3) · a literal separate Availability page (judgment call — folded into Workload, not a hard miss).

### E. Business Decisions Required
1. Checklist model: flat legacy-parity vs. nested multi-item instances.
2. Sub-phase scoping: global vs. per-team.
3. Task status vocabulary: keep the QA-agency-specific legacy list, generalize it, or define an explicit collapse map.
4. Employee task-edit scope: assignee-restricted vs. whole-team-permissive.
5. Activity%/effort aggregation: sum vs. average.
6. Legacy team (delivery pod) → HR team (department) mapping approach; explicit exclusion of `Dubai`/`Cochin` location-tabs from any team import.
7. Unmatched legacy PCs/assignees/submitters with no HR account: create accounts, or leave the FK null with a preserved migration note.
8. Should `HR` get any default PM permissions (`view all projects`, `view pm reports`) for cross-functional visibility, or none as originally proposed?
9. Formal status-transition enforcement vs. the current loosely-validated field, matching existing codebase convention.
10. Whether a full legacy data import is wanted at all versus a fresh start (this fundamentally determines whether §11's mapping work is executed) — not assumed by either the design or this validation.

### F. Confirmed Safe to Implement (no blockers)
- Core Project/Task/Assignee/Comment/Attachment/Bug schema and relationships — FK-correct, no legacy anti-patterns, ready as designed (Gap A2's one-field nullability fix aside).
- Auth/role/permission reuse strategy, now confirmed against the actual seeded permission convention.
- Audit logging via the real, verified `audit_logs` table — zero schema change needed.
- Zero HR-table alteration, zero HR-route/controller edits, structurally guaranteed by the architecture (no browser-to-DB path exists to even risk it).
- Zero hardcoded credentials/IDs anywhere, checked against every item in legacy notes §22.
- Frontend/backend route namespaces — verified zero collisions against the complete existing route lists on both sides.
- Notification-authorization model — structurally closes legacy's exact documented PC-inbox vulnerability, for free.

---

**End of validation report. `PROJECT_MANAGEMENT_MODULE_DESIGN.md` was not modified. No production code was written or changed.**
