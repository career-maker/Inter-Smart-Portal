# Project Management Module — Architecture Design (v2, Final Pre-Implementation)

> **Design-only document. No production code, migration, table, role, or permission has been created.** This is a full revision of the original design, incorporating every applicable finding from `PROJECT_MANAGEMENT_MODULE_VALIDATION_REPORT.md` (7 must-fix + 7 should-improve technical corrections) and every recommended option from `PROJECT_MANAGEMENT_MODULE_BUSINESS_DECISIONS.md` (12 decisions), reconciled against one final, overriding rule: **the HR Portal has exactly three user roles — Employee, Team Lead, Super Admin — and this design introduces none.** Where anything in the earlier documents implied otherwise, this document corrects it. Superseded content in the original design is not preserved elsewhere; this file is now the single source of truth.

---

## 0. What Changed From v1 (at a glance)

| Area | v1 | v2 |
|---|---|---|
| Task status | 5 generic values | Full 9-value legacy vocabulary retained (Decision 1) |
| Project status | 5 values, direction only | 5 values, confirmed never derived from task rows (Decision 1) |
| Corrections | `task_id` required | `task_id` **nullable** — corrections are project-scoped by default (Gap A2) |
| Coordinator | Project-level only, permission-based (`coordinate projects`) | Project- **and** task-level, pure FK-based, **no permission** — see §6 (Gap A1, Decision 6, three-role rule) |
| Checklists | 4 tables (templates → template-items → instances → items) | **2 tables** (Decision 5) |
| Sub-phases | Global only | Global + optional team-specific (Decision 4) |
| Multi-assignee | Master status only | Master status + optional per-assignee individual status (Decision 3) |
| Project↔Team | Implicit | Explicitly ratified: one optional owning team + per-task team scoping (Decision 7) |
| Activity/effort aggregation | Undefined | Weighted average (%) / sum (absolute), one formula everywhere (Decision 9) |
| Export | Not mentioned | CSV on Reports/Bug Analytics/Projects (+Workload) (Decision 11) |
| Hubstaff | Placeholder column only | Full read-through design: 2 new tables, 1 service, MUST/SHOULD/NOT-REQUIRED scope (Decision 10) |
| AI assistant | Not mentioned | Extends existing `ChatController`, no new page/system (Decision 12) |
| Permissions | 9, including `coordinate projects` | **8** — `coordinate projects` removed, replaced by pure object-level FK checks (see §6) |
| Roles | 3 (unchanged) | 3 (unchanged) — explicitly reconfirmed, no fourth role/tier introduced anywhere |

---

## 1. Module Boundaries

Unchanged from v1 and reconfirmed: Project Management (**PM**) is a self-contained vertical slice with exactly four touch points into the existing codebase, all additive —

1. One new comment-delimited route block appended to `backend/routes/api.php`.
2. One new nav section appended to `NAV_SECTIONS` in `frontend/src/app/(dashboard)/layout.tsx`.
3. New-tables-only migrations (zero `ALTER` on any existing HR table) — **including `users` and `teams`, which stay 100% untouched even for coordinator/Hubstaff linking, per §6/§7 below**.
4. New Spatie **permissions** (not roles) inserted via a new, separate seeder — `RolesAndPermissionsSeeder` itself is never edited, and **no new role is added to it, ever**.

**Naming convention** (unchanged): DB tables prefixed `pm_`. PHP model classes flat in `App\Models\*`, each prefixed `Project*` (`Project`, `ProjectTask`, `ProjectCorrection`, …) to avoid the dangerously-generic bare `Task`/`Correction`.

---

## 2. Role, Department & Coordinator Model — **the central correction in this revision**

### 2.1 The three roles, unchanged

Employee, Team Lead, Super Admin. PM adds **zero** new roles. No `Project Coordinator`, `Project Manager`, `PM Admin`, `PM Coordinator`, `Manager`, or `QA Manager` role is created anywhere in this design — not as a Spatie role, and not as a permission that functions like one. (v1's `coordinate projects` permission is removed for exactly this reason — see §2.4.)

### 2.2 What a Project Coordinator actually is

A Project Coordinator is **not an identity**. It is a **relationship**: a specific `users.id` referenced by `pm_projects.project_coordinator_id` and/or `pm_tasks.coordinator_id` for one specific project or task. Nothing about a user's row changes when they become a coordinator — their `role` (Employee/Team Lead/Super Admin) and every HR permission they had before stays exactly as it was.

```
Project ──→ project_coordinator_id ──→ existing users.id
Task    ──→ coordinator_id (nullable, overrides the project's) ──→ existing users.id
```

No new identity table. No new login. No new session type. The coordinator **is** the same HR employee record used everywhere else in the portal.

### 2.3 Eligibility — the "Project Coordinators" department

The HR Portal's real, existing `teams` table already contains a department named **"Project Coordinators"** (confirmed directly against the live production data export, `database/migration/mysql/inter-smart-employee-portal-mysql.sql` — team id 7 as of that snapshot). This department is used as the **eligibility filter**, server-side, for who can be selected as a coordinator:

> When `project_coordinator_id` or `pm_tasks.coordinator_id` is set (by whoever has `manage projects`/`manage tasks` rights on that record), the backend validates the target user's `team_id` resolves to the HR team whose `name = 'Project Coordinators'` (looked up by name at write time, never a hardcoded ID — team IDs are not portable across environments). If the target user isn't in that department, the write is rejected with a clear validation error.

This is **eligibility**, not access. Being in the Project Coordinators department by itself grants nothing — it only makes someone a valid *candidate* to be picked. Access is granted exclusively by the actual assignment (§2.4).

- **A Project Coordinator Team Member** = Employee role + Project Coordinators department. Can be selected as coordinator on projects/tasks they're assigned to; remains an Employee in every other respect.
- **A Project Coordinator Team Lead** = Team Lead role + Project Coordinators department. Same coordinator eligibility, remains a Team Lead in every other respect. **No separate "Project Coordinator Team Lead" role or tier exists** — this is one person with two independent, additive facts about them (their HR role, and their department), never merged into a new composite role.

### 2.4 Coordinator capabilities — additive read/comment access, not a permission grant

Coordinator status grants **object-level access to the specific project(s)/task(s) actually assigned**, implemented as one more `OR` clause in the *same* inline authorization checks already used for project members and task assignees — never a Spatie permission, never a route-level gate. Concretely, every PM read/comment authorization check of the form:

```
allowed = isSuperAdmin
       OR hasPermission('view all projects')
       OR isProjectMember(user, project)
       OR (isTeamLead AND project.team_id == user.team_id)
```
gains one more clause:
```
       OR isResolvedCoordinator(user, project_or_task)
```
where `isResolvedCoordinator` checks the task's own `coordinator_id` first, falling back to the parent project's `project_coordinator_id` if the task has none set.

This grants exactly the capabilities listed in the brief, and nothing more:

| Capability | Mechanism |
|---|---|
| Be selected as project/task coordinator | `project_coordinator_id` / `pm_tasks.coordinator_id`, eligibility-checked per §2.3 |
| View projects/tasks they coordinate, progress, deadlines, blockers | `isResolvedCoordinator` clause added to the existing project/task read check |
| View checklist progress, relevant corrections | Same clause added to the checklist/correction read checks |
| Receive project/task notifications | The *resolved* coordinator for that specific project/task only — see §8 |
| Add coordination comments/updates | Same clause added to the existing comment-authorization check (`pm_task_comments`/`pm_correction_comments`) — a comment, not a planning-field edit (see §2.6) |

**Explicitly not granted, by construction** (none of these are reachable through any code path in this design, not merely disallowed by policy): user administration, department administration, role management, HR administration, leave/WFH/attendance administration, PM system administration, permission management, access to all projects, override of Team Lead or Super Admin rights. Coordinator status never touches Spatie roles or permissions at all — there is no mechanism by which it *could* grant any of these.

### 2.5 Role + Coordinator interaction

The underlying HR role is always authoritative and is never upgraded:

- **Employee + Coordinator** → remains an Employee. Gains read/comment access to the specific project(s)/task(s) they coordinate, on top of their normal baseline (own assigned tasks, per §6). Does **not** gain Team Lead capabilities, does not gain `manage projects`/`manage tasks`.
- **Team Lead + Coordinator** → remains a Team Lead. Their existing team-scoped management rights (assign tasks within their team, etc.) are completely unchanged. Their coordinator assignment adds read/comment access to whichever *other* project(s) they've been assigned to coordinate — including ones outside their own team — as a second, independent, additive grant. These two grants (role-based, team-scoped vs. assignment-based, project-scoped) are structurally separate and simply both apply to the same person; they are never merged into a new tier.
- **Super Admin + Coordinator** → remains Super Admin. Already has full access regardless; the coordinator assignment is redundant but harmless.

### 2.6 What coordinator status is not

Coordinator access is **view + comment/notification**, never **edit of planning fields**. An Employee who coordinates Project A can see everything about it and add coordination comments, but cannot rename it, change its dates, reassign its team, or edit its effort figures — those remain gated by `manage projects`/`manage tasks`, which an Employee doesn't hold regardless of coordinator status (§6, Decision 2). This keeps the planning/execution boundary from §6 intact even for coordinators.

### 2.7 No blanket department-wide notification

Belonging to the Project Coordinators department, by itself, triggers nothing. If John is in that department but is not the resolved coordinator of Project A, he receives no notification about Project A. Notification recipients are always resolved from the actual `project_coordinator_id`/`coordinator_id` FK on the specific record that changed — never from a department membership query. See §8.

---

## 3. Routes (Frontend — Next.js App Router)

Unchanged structurally from v1 — `frontend/src/app/(dashboard)/project-management/*`. Role-visibility column updated to reflect §2 (no "Coordinator-permission holders" language — replaced with the correct object-level framing):

| Route | Purpose | Visibility |
|---|---|---|
| `/project-management` | Landing — active project count, my open tasks, due-soon items | All 3 roles |
| `/project-management/projects` | Project list | Employee: member or coordinated projects; Team Lead: own team's + coordinated; Super Admin: all |
| `/project-management/projects/[id]` | Project detail | Same scoping as above; edit actions gated to `manage projects` holders |
| `/project-management/tasks` | All-tasks view with filters | Super Admin, Team Lead (own team); Employee sees only via `/tasks/my` |
| `/project-management/tasks/my` | Own assigned tasks | All 3 roles, self-scoped |
| `/project-management/schedule` | Calendar/timeline | All 3, scoped to visible projects |
| `/project-management/checklists` | Reusable checklist items + per-project/task assignment | Manage: Super Admin/Team Lead. Check off: any visible-project/task participant |
| `/project-management/corrections` | Rework/issue tracker | Raise: any participant. Status changes: `manage corrections` holders, resolved coordinator, or the assignee |
| `/project-management/reports` | Aggregated reporting, CSV export | Super Admin, Team Lead |
| `/project-management/bug-analytics` | Bug trend dashboards, CSV export | Super Admin, Team Lead |
| `/project-management/workload` | Effort/activity rollups | Super Admin, Team Lead (all); Employee (own row only) |
| `/project-management/project-coordinators` | Who coordinates what — derived view over `project_coordinator_id`/`coordinator_id` | Super Admin, Team Lead |
| `/project-management/sub-phases` | Global list: Super Admin manages. Team-specific: that team's Team Lead manages their own | Super Admin (global), Team Lead (own team) |
| `/project-management/settings` | `pm_settings` | Super Admin only |

**Open item, unchanged from v1**: no `/create` routes given in the brief — recommend inline modals on the list pages (matches `TAApplyModal.tsx`), confirm before implementing.

---

## 4. API Endpoints (Backend)

Flat `App\Http\Controllers\Api\*`, kebab-case, matching `ta-requests`/`leave-requests` style.

**Projects** — `ProjectController`
```
GET    /api/projects
POST   /api/projects                        [role:Super Admin|Team Lead]
GET    /api/projects/{id}
PUT    /api/projects/{id}                   [manage projects, own-team check]
DELETE /api/projects/{id}                   [manage projects] (soft delete)
POST   /api/projects/{id}/members           [manage projects]
DELETE /api/projects/{id}/members/{userId}  [manage projects]
POST   /api/projects/{id}/coordinator       [manage projects] — sets project_coordinator_id; server-side validates target user's department (§2.3)
```

**Sub-phases** — `ProjectSubPhaseController`
```
GET    /api/project-sub-phases                       (global + caller's own team's)
POST   /api/project-sub-phases                       [role:Super Admin for global rows, manage tasks for own-team rows]
PUT/DELETE /api/project-sub-phases/{id}               [same split]
```

**Tasks** — `ProjectTaskController`
```
GET    /api/project-tasks
GET    /api/project-tasks/my
POST   /api/project-tasks                            [manage tasks]
GET    /api/project-tasks/{id}
PUT    /api/project-tasks/{id}                        (planning fields: manage tasks / own-team TL; execution fields: assignee; comment-and-view: resolved coordinator — see §6)
DELETE /api/project-tasks/{id}                        [manage tasks]
POST   /api/project-tasks/{id}/assignees              [manage tasks]
DELETE /api/project-tasks/{id}/assignees/{userId}     [manage tasks]
POST   /api/project-tasks/{id}/coordinator            [manage tasks] — sets pm_tasks.coordinator_id; same department eligibility check as projects
POST   /api/project-tasks/{id}/comments               (member, assignee, or resolved coordinator)
POST   /api/project-tasks/{id}/attachments            (same)
POST   /api/project-tasks/{id}/bugs                   (same — self-reported bugs allowed)
PUT    /api/project-task-bugs/{id}
```

**Checklists** — `ProjectChecklistController` (simplified, see §5/Decision 5)
```
GET    /api/project-checklist-items                  (the reusable, named definitions)
POST   /api/project-checklist-items                   [manage checklists]
PUT/DELETE /api/project-checklist-items/{id}           [manage checklists]

GET    /api/projects/{id}/checklist                   (assignments + pass/fail state for this project)
GET    /api/project-tasks/{id}/checklist               (same, for a task)
POST   /api/project-checklist-assignments              [manage checklists] — attach an item to a project/task
PUT    /api/project-checklist-assignments/{id}         (toggle checked — visible participant, incl. resolved coordinator)
```

**Corrections** — `ProjectCorrectionController`
```
GET    /api/project-corrections              (filterable: project_id, task_id [nullable], status, assigned_to)
POST   /api/project-corrections              (any visible-project participant; task_id optional)
GET    /api/project-corrections/{id}
PUT    /api/project-corrections/{id}/status  [manage corrections, resolved coordinator, or the assignee]
POST   /api/project-corrections/{id}/comments
POST   /api/project-corrections/{id}/attachments
```

**Reports / Analytics** — `ProjectReportController`
```
GET /api/project-reports/summary
GET /api/project-reports/schedule
GET /api/project-reports/bug-analytics
GET /api/project-reports/workload            (own row only for Employee)
GET /api/project-reports/coordinators
GET /api/project-reports/{report}/export     (CSV — summary|projects|bug-analytics|workload; see §11)
```

**Hubstaff** — `ProjectHubstaffController` (new in this revision — see §7)
```
GET  /api/project-hubstaff/members           [manage hubstaff]
GET  /api/project-hubstaff/projects          [manage hubstaff]
POST /api/project-hubstaff/link-project      [manage hubstaff] — sets pm_projects.hubstaff_project_id
POST /api/project-hubstaff/link-user         [manage hubstaff] — writes pm_user_hubstaff_links
GET  /api/project-hubstaff/activity          (project-level, read-only, any visible-project participant)
```

**Settings** — `ProjectSettingController`
```
GET/POST /api/project-settings               [manage project settings]
```

**AI** — no new route. Extends the existing `POST /api/chat` / `GET /api/chat/context` — see §9.

---

## 5. Database Entities (revised: 16 tables, down from 17)

Every table verified against the full existing HR schema (61 migrations, enumerated in the original audit) — **no collisions**. Two structural simplifications applied this revision: checklists collapse from 4 tables to 2 (Decision 5); `pm_project_members.project_role` drops `'Coordinator'` as a value (§5.2) since coordinator status now lives exclusively in the dedicated FK columns — one source of truth, never two competing places recording the same fact.

### `pm_projects`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | **unique on `LOWER(TRIM(name))`** — new in this revision, closes legacy's #1 named data-quality defect (duplicate-named project rows, notes §7.2) |
| description | text, nullable | |
| status | string, validated `in:` [`Planning`,`Active`,`On Hold`,`Completed`,`Cancelled`] | **Never derived from task rows** — set explicitly only (Decision 1) |
| project_type, category | string, nullable | free validated strings, matches `Issue.category` convention |
| team_id | FK → `teams.id`, nullable | optional **primary/owning** team; cross-team participation expressed via each task's own `team_id`, not here (Decision 7 — ratifies, no schema change) |
| project_coordinator_id | FK → `users.id`, nullable | eligibility-checked against the "Project Coordinators" HR department at write time (§2.3) — **not a role, not a permission** |
| start_date, expected_end_date | date | |
| allotted_effort, confirmed_effort, expected_effort, committed_effort | decimal(8,2), nullable | |
| hubstaff_project_id | string, nullable | opaque external reference — see §7 |
| blockers, budget, live_notes, fixing_notes | text/decimal, nullable | narrative/metadata fields, kept as-is |
| created_by / updated_by | FK → `users.id` | |
| deleted_at | soft delete | |
| timestamps | | |

### `pm_project_members`
`id · project_id FK→pm_projects (cascade) · user_id FK→users · project_role string ('Member'\|'Lead'\|'Reviewer') · added_by FK→users · timestamps` — unique(`project_id`,`user_id`). **`'Coordinator'` removed as an allowed `project_role` value this revision** — coordinator status lives only in `pm_projects.project_coordinator_id`/`pm_tasks.coordinator_id`, never duplicated here.

### `pm_sub_phases`
`id · name string · team_id FK→teams nullable (NULL = global) · description text nullable · display_order int default 0 · is_active bool default true · created_by FK→users · timestamps` — unique(`name`, `team_id`). **`team_id` added this revision** (Decision 4).

### `pm_tasks`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| project_id | FK → `pm_projects`, cascade | |
| sub_phase_id | FK → `pm_sub_phases`, nullable, set-null | |
| coordinator_id | FK → `users.id`, nullable | **new this revision** — task-level override of the project's coordinator; same department-eligibility check as project-level (Gap A1, Decision 6) |
| title, description | string / text nullable | |
| status | string, validated `in:` **all 9 legacy values**: `Yet to Start`, `Being Developed`, `Ready for QA`, `Assigned to QA`, `In Progress`, `On Hold`, `Completed`, `Forecast`, `Rejected` (Decision 1) | default `In Progress`, matching legacy |
| priority | string, Low/Medium/High/Critical | matches `Issue.priority` |
| start_date, due_date, actual_start_date, actual_completion_date | date, nullable | Achievement-date (`actual_completion_date`) auto-filled with today when status transitions to `Completed` and it's still empty — **app logic in `ProjectTaskController@update`**, never a DB trigger (deliberately avoiding legacy's `auto_set_leave_team_id`-style trigger failure mode, notes §5.7) |
| include_saturday, include_sunday | boolean, default false | new this revision — weekend visibility on Schedule (Gap B3) |
| current_updates, deviation_reason | text, nullable | `deviation_reason` doubles as the rejection-reason field when status = `Rejected` |
| sprint, sprint_link | string, nullable | plain labels |
| allotted_days, time_taken, days_taken, deviation | decimal(6,2), nullable | `deviation = days_taken − allotted_days`, recomputed on save |
| activity_percentage | decimal(5,2), nullable | aggregation formula fixed in §7/Decision 9 |
| team_id | FK → `teams.id`, nullable | per-task team scope — the real cross-team-project mechanism (Decision 7) |
| created_by / updated_by | FK → `users.id` | |
| deleted_at | soft delete | |
| timestamps | | |

**Overdue status is computed, never stored**: past 18:30 (`Asia/Kolkata`, configurable via `pm_settings`) on `due_date` → overdue, except `Rejected` (never overdue) and `Completed` (overdue only if `actual_completion_date` is after 23:59:59 on `due_date`, shown as `Completed (Overdue)`), with a 1-day calendar spillover before an overdue task drops off the following day's view (Gap B4).

### `pm_task_assignees`
`id · task_id FK→pm_tasks (cascade) · user_id FK→users · assigned_by FK→users · is_primary bool default false · individual_status string nullable · progress_percentage decimal nullable · assigned_at timestamp` — unique(`task_id`,`user_id`). **`individual_status`/`progress_percentage` added this revision** (Decision 3) — null = follows the task's master status; set = this assignee is tracked independently. Rollups (Reports/Schedule/Bug-Analytics) always use the task's one master `status`, never the individual overrides, so multi-assignee tasks never inflate row counts on aggregate views.

### `pm_task_comments`
`id · task_id FK→pm_tasks (cascade) · user_id FK→users · comment text · timestamps` — mirrors `issue_comments`.

### `pm_task_attachments`
`id · task_id FK→pm_tasks (cascade) · file_path, file_name string · file_type string nullable · uploaded_by FK→users · created_at` — mirrors `issue_attachments`.

### `pm_task_bugs`
`id · task_id FK→pm_tasks (cascade) · bug_type string ('HTML'\|'Functional'\|'Other') · severity string (Low/Medium/High/Critical) · status string (Open/Fixed/Verified/Reopened/Closed) · description text nullable · reported_by FK→users · fixed_by FK→users nullable · reported_at timestamp · fixed_at timestamp nullable · timestamps`.

### `pm_checklist_items` — **renamed and simplified this revision** (was `pm_checklist_templates`; `pm_checklist_template_items` removed)
`id · label string · description text nullable · applies_to string ('project'\|'task') · category string nullable (display-grouping label only, no sections table) · is_active bool default true · created_by FK→users · timestamps` — unique(`label`). Directly equivalent to legacy's flat `checklists` table (Decision 5).

### `pm_checklist_assignments` — **renamed and simplified this revision** (replaces `pm_checklists` + `pm_checklist_items` from v1)
`id · checklistable_type string ('Project'\|'Task') · checklistable_id unsignedBigInteger · checklist_item_id FK→pm_checklist_items · is_checked bool default false · checked_by FK→users nullable · checked_at timestamp nullable · timestamps` — unique(`checklistable_type`,`checklistable_id`,`checklist_item_id`); index(`checklistable_type`,`checklistable_id`). Directly equivalent to legacy's `project_checklists` + `project_checklist_status` merged (they were always 1:1 in legacy anyway). Progress % computed at read time (checked/total), never stored. Independent of task/project status by default (Decision 5).

### `pm_corrections`
`id · task_id FK→pm_tasks (cascade), NULLABLE · project_id FK→pm_projects (cascade) · correction_type string (Bug/Rework/Client Feedback/QA Rejection/Other) · severity string (Low/Medium/High/Critical) · status string (Open/In Progress/Fixed/Verified/Closed) · description text · raised_by FK→users · assigned_to FK→users nullable · raised_at timestamp · resolved_at timestamp nullable · created_by FK→users · deleted_at (soft delete, added this revision) · timestamps`. **`task_id` is nullable** — corrections are project-scoped by default, matching legacy's actual behavior exactly (they were never task-required); a correction may optionally be pinned to a specific task (Gap A2).

### `pm_correction_comments` / `pm_correction_attachments`
Same shape as the task equivalents, scoped to `correction_id`.

### `pm_settings`
`id · key string unique · value text/json · updated_by FK→users nullable · timestamps` — dedicated table, not a reuse of the generic `system_settings` (which is hardcoded Super-Admin-only and used for unrelated HR config).

### `pm_hubstaff_tokens` — **new this revision** (§7, Decision 10)
`id (constrained =1) · access_token text · refresh_token text · expires_at bigint · updated_at`.

### `pm_user_hubstaff_links` — **new this revision** (§7, Decision 10)
`id · user_id FK→users unique · hubstaff_user_id string · linked_by FK→users · timestamps`. Deliberately a new table, **not** a column on `users` — resolves the legacy notes' own recommendation ("link employees to Hubstaff via an explicit ID field on the employee record") without touching the HR `users` table.

**Total: 16 tables** (was 17 — checklists went from 4→2, net +1 for the 2 new Hubstaff tables, −2 for checklist simplification, +1 for `pm_user_hubstaff_links`... net: 17 − 2 (checklist) − 1 (project_role no longer needs anything new) + 2 (Hubstaff) = 16).

---

## 6. Permission Model — 8 permissions, 3 roles, zero new tiers

**Confirmed**: `RolesAndPermissionsSeeder.php`'s actual convention (lowercase, space-separated: `'approve leaves'`) is followed exactly. No route uses `permission:` middleware anywhere in the existing app; PM matches that — `role:` gates routes, permissions are checked inline (`$user->can(...)`), object-level scoping is inline manual checks, no Laravel Policies.

**New Spatie permissions** (8 — `coordinate projects` from v1 is **removed**; coordinator access is now purely the FK-based object-level mechanism in §2, never a grantable permission):
```
manage projects          — create/update/delete a project, manage its members, set/change its coordinator
view all projects        — cross-team project visibility beyond own membership/team/coordination
manage tasks              — create/update/delete/assign tasks, set/change a task's coordinator
manage checklists         — manage the reusable checklist item list and project/task assignments
manage corrections        — change correction status, assign a correction owner
view pm reports           — Reports, Bug Analytics, full (non-self) Workload
manage sub phases         — CRUD the global sub-phase list (own-team rows are covered by manage tasks instead)
manage hubstaff           — new this revision (§7) — configure Hubstaff linking, view org-level Hubstaff data
manage project settings   — read/write pm_settings
```
(9 listed above minus the removed `coordinate projects` = 8 net-new relative to v1's list; `manage hubstaff` is genuinely new.)

**Default grants** — unchanged in spirit from v1, restated:

| Role | Grants |
|---|---|
| Super Admin | all permissions |
| Team Lead | `manage projects`, `manage tasks`, `manage checklists`, `manage corrections`, `view pm reports` (own-team scope, inline) — not `view all projects`, `manage sub phases` (global rows), `manage hubstaff`, `manage project settings` |
| Employee | none — baseline participation (own assigned tasks per §6.1, comment, log bugs, raise corrections, check off visible checklists) via inline checks only |

**Field-level edit split on tasks** (Decision 2 — reconfirmed here as the authoritative rule):

| Field group | Fields | Employee (own assigned task) | Team Lead (own team) | Super Admin |
|---|---|:---:|:---:|:---:|
| Planning | title, description, project, sub-phase, priority, planned dates, effort figures, team, assignees, coordinator | ❌ | ✅ | ✅ |
| Execution | status, current_updates, actual dates, time_taken/days_taken, comments, bugs, corrections | ✅ (own task) | ✅ | ✅ |

**HR gets zero PM permissions and zero PM edit rights**, by explicit decision (§6, Decision 2) — being an HR/administrative role does not imply operational project-delivery rights, mirroring how HR doesn't get Leave-approval-override rights either.

**Object-level scoping (inline, updated to include the coordinator clause from §2.4):**
```
Can view/edit a project  = isSuperAdmin
                          OR hasPermission('view all projects')
                          OR isProjectMember(user, project)
                          OR (isTeamLead AND project.team_id == user.team_id)
                          OR isResolvedCoordinator(user, project)   ← view/comment only, not edit

Can update a task's execution fields = isAssignee(user, task)

Can comment/raise a bug or correction = isProjectMember OR isAssignee OR isResolvedCoordinator
```

---

## 7. Hubstaff Architecture (new this revision — Decision 10, Gap A6)

**Scope for this implementation:**

| Capability | Priority |
|---|---|
| OAuth2 refresh-token flow, secure server-side token storage (`pm_hubstaff_tokens`) | MUST HAVE |
| Org members retrieval | MUST HAVE |
| Org projects retrieval | MUST HAVE |
| Per-project activity (daily/range) | MUST HAVE |
| Employee↔Hubstaff mapping (`pm_user_hubstaff_links`) | MUST HAVE |
| Daily/Monthly activity dashboard, employee-level activity feeding Workload (display only) | SHOULD HAVE |
| Org teams/members-by-Hubstaff-team | SHOULD HAVE |
| HR-daily specialized dashboard, WhatsApp-style report generator, bulk-activity batch sync, debug endpoints | NOT REQUIRED |

**Mechanism**: one consolidated `App\Services\HubstaffService` (fixing legacy's documented defect of three inconsistent retry/cache implementations, notes §19.7) — OAuth2 refresh-token exchange, DB-persisted token cache (`pm_hubstaff_tokens`), 429 backoff/retry, one implementation only. Credentials via real `backend/.env` vars (`HUBSTAFF_ORG_ID`, `HUBSTAFF_REFRESH_TOKEN`), never hardcoded. **Read-through only** — no local historical-activity table; `pm_tasks.activity_percentage`/`time_taken` remain user-entered fields, exactly matching legacy's own actual behavior (those columns existed in legacy for years and were never once auto-written from a live Hubstaff response). **Display only for v1** (not B/C/D from the decision menu) — Hubstaff figures never feed Workload calculations or task fields automatically; that would be a distinct, separately-approved future decision. **Failure behavior**: any PM view depending on live Hubstaff data degrades to "data unavailable," never fails the request — matching the existing `EmailService` isolated-failure convention. **No cron** — on-demand only, matching legacy's own (fine) approach. **No hardcoded name-matching dictionaries** — `pm_user_hubstaff_links` replaces legacy's fragile static Hubstaff-name↔short-name maps entirely.

---

## 8. Notification Model

Reuses the existing infrastructure exactly — `Notifiable`, the shared `notifications` table, the existing `NotificationController` and `NotificationDropdown.tsx`, zero changes to any of them.

**Notification classes:**
- `ProjectMemberAddedNotification` — on `pm_project_members` insert
- `TaskAssignedNotification` — on `pm_task_assignees` insert
- `TaskChangedNotification` — **new this revision, the single most important fix** (Gap A1) — fires on task create/update, sent to the *resolved* coordinator for that specific task (task-level `coordinator_id` if set, else the project's `project_coordinator_id`, else nobody) with a computed field-level diff, directly replacing legacy's one reliably-wired trigger (notes §6.3/§6.4/§14.3)
- `ProjectUpdatedNotification` — same resolution logic, for project-level metadata changes
- `TaskDueSoonNotification` — scheduled job, tasks due within N days
- `CorrectionRaisedNotification` — to `assigned_to`, or the resolved coordinator if unassigned
- `CorrectionResolvedNotification` — to `raised_by`

**Recipient resolution is always computed from the actual FK on the record that changed — never from department membership.** John, a member of the Project Coordinators department who is not the coordinator of Project A, receives nothing about Project A — there is no code path that queries "everyone in the Project Coordinators department" for notification purposes anywhere in this design. This directly satisfies the brief's explicit example and structurally closes legacy's exact documented vulnerability (notes §14.1/§23.2 — "any caller can read or mark-read any PC's notifications by passing a different name") for free, since Laravel's `Notifiable` pattern scopes to the owning `notifiable_id` inherently.

Every dispatch wrapped in try/catch, matching the unbroken existing convention.

---

## 9. AI Assistant Architecture (new this revision — Decision 12, Gap A7)

**No new page, no new component, no new backend system.** Extends the existing `ChatController`/`POST /api/chat`/`GET /api/chat/context` and the existing global chat widget already on every HR page.

**Mechanism**: when the caller is on a `/project-management/*` page (or asks a PM-shaped question), the same context-building step that already injects the caller's own leave balance/today's-leaves/teams/holidays also runs the **exact same scoped queries** the list endpoints use (`GET /api/projects`, `GET /api/project-tasks`, filtered by the calling user's own membership/team/coordinator status per §6) and injects only that pre-filtered result into the prompt. **Authorization happens before context generation, not after** — the PM context block is never built from an unscoped query with the LLM trusted to filter it.

**Minimum useful questions**: "what are my open tasks", "what's overdue / due today / this week", "what's the status of project X" (only if visible to the caller), "who's the coordinator for project X", "what's blocking project X" (from `blockers`), "how many open bugs on task X". **Read-only, no exceptions** — same hard constraint the existing HR assistant already enforces, unchanged.

---

## 10. Report Export (Decision 11)

CSV (plain, hand-rolled client-side blob — zero new dependency; the HR Portal's only existing export tool, `jspdf`, is PDF-only and not reused here since CSV needs no library at all) on: **Reports, Bug Analytics, Projects list**, plus **Workload** (an extension beyond documented legacy scope, included since it's the same tabular mechanism at near-zero cost — flagged in §14 as a light confirm-you-want-this item). **Checklists and Corrections are not exported** — legacy never had this either, and both are meant to be worked in-app.

---

## 11. Integration Points

| Integration | Direction | Nature |
|---|---|---|
| `users` | reads/references | every "who" field, including coordinator — **no new column added to `users`, ever** (Hubstaff linking uses `pm_user_hubstaff_links` instead, §7) |
| `teams` | reads/references | `Project.team_id`/`Task.team_id`, and the Project Coordinators department eligibility check (§2.3) |
| Notifications | writes | new classes only, §8 |
| Email (`EmailService`) | extends | new methods for `TaskChangedNotification`/`CorrectionRaisedNotification` etc., existing methods untouched |
| File storage | writes | new folders on the existing public disk |
| `audit_logs` | writes | additive rows, `pm.` action prefix, see §12 |
| Leave/Attendance | reads only | Workload page capacity context, no write access |
| Nav, Command Palette, Favorites | extends | additive only |
| Scheduler | extends | new `project:notify-due-tasks` command line |
| HR Dashboard (`GET /dashboard`) | **not integrated** | PM gets its own landing page instead, per the original audit's fragility finding — unchanged in this revision |

---

## 12. Audit Model

Unchanged from v1 (already validated as correct): reuses the real, existing `audit_logs` table (`user_id, action, model_type, model_id, changes, ip_address`), zero schema change, `pm.` action namespace (e.g. `pm.project.created`, `pm.task.coordinator_changed`, `pm.correction.raised`). The `changes` JSON diff doubles as the payload for `TaskChangedNotification`'s `data` field (§8) — computed once, used twice.

---

## 13. Things Deliberately NOT Copied From QA Tracker

Unchanged list from v1, plus this revision's additions:
- Free-text assignee/coordinator/team-name fields — real FKs throughout, including the new `coordinator_id`.
- Flat overwritable `comments` column, flat bug counters — `pm_task_comments`/`pm_task_bugs`.
- Any separate login/guest-mode/passkey/separate accounts — zero new auth surface.
- Hardcoded Hubstaff name-matching dictionaries — `pm_user_hubstaff_links` instead (§7).
- **New this revision**: any notion of "Project Coordinator" as a role, permission, or identity tier — it is a data relationship only (§2), directly addressing legacy's PC being a disconnected, unauthenticated flat roster.
- **New this revision**: activity-percentage sum/average inconsistency — one documented formula (§ below, Decision 9).
- **New this revision**: the over-nested 4-table checklist model from v1 itself — simplified to 2 tables (§5, Decision 5), since v1 had drifted from "don't over-engineer" without any legacy justification for the extra nesting.

---

## 14. Activity/Effort Aggregation (Decision 9)

One formula, everywhere (Reports, Workload, Bug Analytics), computed at query time, never stored:
```
activity_percentage (any rollup) = Σ(task.activity_percentage × task.time_taken) / Σ(task.time_taken)
     [tasks with time_taken = 0 excluded from both sides]
allotted_effort (rollup)         = Σ(task.allotted_days)
actual_effort / days_taken (rollup) = Σ(task.days_taken)
deviation (rollup)               = Σ(task.days_taken) − Σ(task.allotted_days)
```
Percentages are weighted-averaged (a task with more tracked time counts proportionally more); absolute quantities are summed. Employee-level rollups use each assignee's own `individual_status`/tracked figures where set (§5, Decision 3), otherwise attribute the task's shared figures evenly across its assignees (a disclosed approximation, not a silent one).

---

## 15. Security Model

Unchanged from v1, confirmed still accurate: Sanctum reuse, `role:` route gates, inline object-level checks (no Policies), FormRequest validation, `$guarded=[]` inherited convention, soft deletes on `pm_projects`/`pm_tasks`/`pm_corrections` (added this revision), no new public/webhook routes except the Hubstaff service's own outbound calls (never inbound), CORS unchanged. **New this revision**: the coordinator-eligibility check (§2.3) is itself a security control — it's server-side, evaluated on every coordinator-assignment write, not a frontend-only filter, satisfying the brief's explicit "do not rely on frontend visibility" instruction.

---

## 16. Data Migration Strategy

**Phase 1 — schema only**: 16 new `create_pm_*_table` migrations (down from 17), dependency-ordered, zero edits to any existing migration.

**Phase 2 — demo/seed data**: optional, isolated `ProjectManagementDemoSeeder`, never merged into the existing `DatabaseSeeder` calls without being asked.

**Phase 3 — legacy import, field-level mapping now documented** (previously deferred in v1 for lack of source access; now available via the migration notes doc):

| Legacy | Maps to | Reconciliation needed |
|---|---|---|
| `projects` + `project_overview` | `pm_projects` | `pc` (free text) → `project_coordinator_id`: name-match against `users`, **and the matched user must be in the Project Coordinators department (§2.3) — a legacy PC with no HR account, or whose HR account isn't in that department, cannot be cleanly mapped and must be flagged for manual resolution**, not silently imported |
| `tasks` | `pm_tasks` | `project_name`→`project_id` fuzzy match; `assigned_to`→`pm_task_assignees.user_id` name match; `sub_phase`→`pm_sub_phases.id` (create unmatched free-typed values); `status` maps directly (all 9 legacy values now kept, Decision 1) |
| `teams` | existing HR `teams` | **5 direct name matches** (`HTML`→HTML, `PHP Team`→PHP, `Wordpress`→WordPress, `Team React`/`React`→React, `QA Team`→QA — all verified against real production data). **4 require manual confirmation**: `Designers`, `Server`, `PMO`, `Frontend Developers` — no HR equivalent exists or the mapping is ambiguous. `Dubai`/`Cochin` (locations, not teams), the `Super Admin` remap artifact, and `Demo Team` (test data) are **excluded** from import entirely (Decision 8) |
| `team_subphases` | `pm_sub_phases` | now cleanly maps given the new `team_id` column (Decision 4) — no cardinality mismatch to work around |
| `checklists`/`project_checklists`/`project_checklist_status` | `pm_checklist_items`/`pm_checklist_assignments` | clean, 1:1, now that the target schema itself matches legacy's flat shape (Decision 5) |
| `project_corrections` | `pm_corrections` | clean for existing fields; `correction_type`/`severity` default (`'Other'`/`'Medium'`) since legacy has no equivalent; `task_id` stays null (Decision, §5) |
| `global_pcs` | `users` via `project_coordinator_id`/`coordinator_id` | same department-eligibility caveat as above — some legacy PCs may have no importable HR match at all |
| `projects.hubstaff_id` | `pm_projects.hubstaff_project_id` | clean, direct copy |

**Not cleanly mappable** (flagged for manual decision, not automated): legacy's flat `comments` (import as one synthetic system comment, timestamped at import — individual history was never separately preserved in the source); legacy's flat bug counters (import as synthetic placeholder `pm_task_bugs` rows to preserve totals, no individual bug descriptions exist to recover).

---

## 17. Testing Strategy

Unchanged approach from v1 (flat PHPUnit under `backend/tests/Feature/`, no new frontend test framework introduced), extended to cover this revision's additions:
`ProjectCoordinatorEligibilityTest.php` (department-check enforcement, both accept and reject cases), `ProjectTaskStatusTest.php` (achievement-date auto-fill, overdue computation, Rejected exemption), `ProjectChecklistTest.php` (updated for the 2-table model), `ProjectHubstaffServiceTest.php` (token refresh, failure-degradation), `ProjectAggregationTest.php` (the exact weighted-average/sum formulas from §14). Explicit assertion in every role-boundary test that a coordinator assignment **never** grants `manage projects`/`manage tasks`/any Spatie permission — verifying §2's "not a role" guarantee holds in code, not just in this document.

---

# Final Summary (as requested)

## 1. Updated Architecture Summary
PM remains a fully isolated vertical slice — 16 new `pm_`-prefixed tables, one new route block, one new nav section, one new permission seeder — with zero alteration to any existing HR table, route, controller, role, or permission. This revision's central change is structural, not additive: Project Coordinator is formalized as a pure data relationship (a foreign key from a project or task to an existing `users.id`, eligibility-filtered by HR department membership), never a role or permission, closing the gap between v1's design and the HR Portal's fixed three-role model. Alongside that, all 7 validation-report must-fixes and all 12 business decisions' recommended options are applied: full legacy task-status vocabulary retained, nullable correction `task_id`, one documented aggregation formula, CSV export, a real (if scoped-down) Hubstaff design, AI assistant coverage via the existing chat system, and a checklist model simplified from 4 tables to 2.

## 2. Final Database Model
16 tables (§5): `pm_projects`, `pm_project_members`, `pm_sub_phases`, `pm_tasks`, `pm_task_assignees`, `pm_task_comments`, `pm_task_attachments`, `pm_task_bugs`, `pm_checklist_items`, `pm_checklist_assignments`, `pm_corrections`, `pm_correction_comments`, `pm_correction_attachments`, `pm_settings`, `pm_hubstaff_tokens`, `pm_user_hubstaff_links`. Every relationship is a real FK; no free-text identity field anywhere; `users`/`teams` untouched.

## 3. Final Role/Department/Coordinator Model
Three roles only (Employee, Team Lead, Super Admin) — no fourth tier, disguised or otherwise. Project Coordinator = existing HR employee, eligibility-gated by membership in the real "Project Coordinators" HR department, assigned per-project (`pm_projects.project_coordinator_id`) and optionally per-task (`pm_tasks.coordinator_id`, overrides project-level). Grants object-level view/comment/notification access to only the specific project(s)/task(s) actually assigned — never a permission, never portal-wide, never an upgrade of the person's underlying role.

## 4. Final Authorization Model
Route-level: `role:` middleware (unchanged HR convention). Capability-level: 8 new Spatie permissions, checked inline, never via route middleware. Object-level: inline manual checks (membership / team match / assignee / resolved coordinator), no Laravel Policies, matching the existing codebase's only real pattern. Every check evaluates, in order: authenticated user → HR role → department membership (coordinator eligibility only) → project/task membership or coordinator assignment → requested action. Enforced server-side exclusively; frontend visibility is cosmetic only.

## 5. Final Task/Project Lifecycle
Task status: all 9 legacy values retained, free validated string, any-to-any transition (matching the rest of the codebase's status-field looseness). Achievement date auto-fills on transition to `Completed`; hidden when `Rejected`; overdue is computed (never stored) using an 18:30 IST cutoff, `Rejected` exemption, `Completed (Overdue)` state, 1-day spillover. Project status: separate 5-value field (`Planning`/`Active`/`On Hold`/`Completed`/`Cancelled`), changed only by explicit human action, never derived from its tasks.

## 6. Final Checklist Model
Two tables: `pm_checklist_items` (flat, reusable, named definitions — direct equivalent of legacy's own model) and `pm_checklist_assignments` (per-project-or-task pass/fail state, `checked_by`/`checked_at`). No sections, no sub-items. Progress % computed at read time. Independent of task/project status by default.

## 7. Final Hubstaff Architecture
Read-through only, on-demand, OAuth2 refresh-token flow with server-side token storage (`pm_hubstaff_tokens`), explicit employee linking (`pm_user_hubstaff_links`, not a `users` column), one consolidated service class, display-only in v1 (never auto-writes task fields), graceful failure degradation, no cron, no hardcoded credentials or name-mapping dictionaries.

## 8. Final AI Architecture
No new system — extends the existing `ChatController`/chat widget with an authorization-scoped PM context block, built from the same queries the list endpoints already use, injected only after filtering. Read-only, no exceptions.

## 9. Final Notification Architecture
Reuses the existing `notifications` table/infrastructure entirely. Recipients always resolved from the actual coordinator/assignee FK on the changed record — never from department membership. `TaskChangedNotification` (new) replaces legacy's one reliably-working trigger; `ProjectUpdatedNotification`, `TaskDueSoonNotification`, `CorrectionRaisedNotification`, `CorrectionResolvedNotification`, `TaskAssignedNotification`, `ProjectMemberAddedNotification` round out the set.

## 10. Final Migration Strategy
Phase 1: 16 fresh `create_pm_*` migrations, no existing table touched. Phase 2: optional isolated demo seeder. Phase 3: legacy import with full field-level mapping now documented (§16) — 5 of 9 legacy teams auto-map by confirmed real name match, 4 require manual confirmation, coordinator/PC names require both a `users` match *and* Project Coordinators department membership to import cleanly, flat legacy comments/bug-counts import as disclosed, synthetic, best-effort rows.

## 11. Remaining Unresolved Decisions
None blocking — all 7 must-fix items and all 12 business decisions now have an applied resolution in this document. Two small items remain genuinely open, both non-blocking and easy to answer later without a redesign:
- Whether Workload's CSV export is wanted (recommended and included by default in §10, but was an extension beyond documented legacy scope — a one-line confirm, not a design question).
- The `/create` route question for Projects/Tasks (inline modal recommended, §3) — a UI-pattern choice, not an architectural one.

**End of design document. No implementation has begun.**
