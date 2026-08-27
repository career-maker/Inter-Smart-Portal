# Project Management — Business Decisions

> Extracted from `PROJECT_MANAGEMENT_MODULE_VALIDATION_REPORT.md`'s 10 business decisions, expanded to 12 per your framing (Decision 3 "multi-assignee behavior" and Decision 7 "project↔team relationship" are new here, surfaced by re-examining the legacy notes and the existing design more closely — not assumptions, findings). No files were modified to produce this. Every recommendation is a recommendation, not a choice made on your behalf — nothing here is applied to the design doc.

---

## Decision 1 — Task Status Model

### Question
Should Project Management keep all 9 legacy task statuses, generalize them, or something else — and should Project status be a separate field, never derived from task statuses?

### Legacy behavior
Free-text, no DB constraint: `Yet to Start → Being Developed → Ready for QA → Assigned to QA → In Progress → On Hold → Completed → Forecast → Rejected`, any transition from any status, default `In Progress`. Layered business rules: `Completed` auto-fills Achievement Date if empty; Achievement Date hidden entirely when `Rejected`; `Rejected` tasks are never "overdue"; `Completed` after 23:59:59 on the due date shows as `Completed (Overdue)`; all other statuses become overdue at **18:30** on the due date (not midnight), with a 1-day calendar spillover grace window. Project's own `status` column is separately confirmed dead — always `'active'`, never changed by any code path; "project state" was faked by aggregating task rows instead (explicitly flagged in the notes as a pattern to redesign, not copy).

### Options
- **A. Keep all 9 legacy statuses**, formalized as a validated string list (matching the existing `Issue.status` convention — plain string + `in:` rule, no DB enum, no lookup table).
- **B. Generalize** into a shorter list (e.g. `To Do, In Progress, In Review, On Hold, Completed, Forecast, Rejected`), collapsing `Being Developed`→`In Progress` and `Ready for QA`/`Assigned to QA`→`In Review`.
- **C. Fully configurable per-project-type statuses** (Jira-style custom workflows).

For **Project status** (separate field, all options assume this): a small, distinct enum — `Planning, Active, On Hold, Completed, Cancelled` — set explicitly by a human (Coordinator/TL/Admin), never computed from task rows.

### Recommended option
**A** for task status (keep all 9, formalized), **the 5-value list above** for project status, kept structurally separate from task status.

### Why
The people using this module today are the exact team currently using legacy QA Tracker Pro under this vocabulary — real legacy task data (to be imported per the migration notes) already contains these exact values, and collapsing them risks silently losing an operationally meaningful QA-handoff gate (`Ready for QA` vs `Assigned to QA` may be a real distinct step your QA process relies on) without being asked. Keeping the full list costs nothing structurally (a validated string column doesn't care if the list has 5 or 9 values) — the only reason to shrink it is if the team explicitly confirms those distinctions don't matter operationally, which is exactly the kind of thing this decision-approval step exists to check rather than assume. Project status must be separate and explicit — this directly fixes legacy's single most-named architectural defect (notes §7.3/§7.6/§23.6): "project state" derived from an aggregate of unrelated task rows.

### Schema impact
`pm_tasks.status`: validated string, 9-value list (or fewer, per your answer). `pm_projects.status`: separate validated string, 5-value list — **no FK/lookup table for either**, no schema change beyond what's already in the design. Achievement-date auto-fill and overdue-state computation are **application logic**, not DB triggers (a DB trigger caused five separate corrective migrations for an unrelated field in legacy's leave table — notes §5.7 — that failure mode is explicitly not being repeated here).

### UI impact
Task form: status dropdown; Achievement Date field hidden when status = `Rejected`; `deviation_reason` (already in the schema) shown/required when status = `Rejected`, doubling as the rejection-reason field. `Completed (Overdue)` and plain overdue badges are computed on read, never stored. Project detail page: its own separate status control, edited explicitly, never auto-updated by task activity.

### Workflow impact
No strict transition state-machine is assumed here (any-status-to-any-status stays allowed, matching how `Issue.status` already behaves elsewhere in this codebase) unless you want one — that's flagged separately as a lower-priority open item, not decided here.

---

## Decision 2 — Task Edit Permissions

### Question
Exactly what can an Employee edit on a task assigned to them — and do Employee / Team Lead / HR / Super Admin each get a distinct answer?

### Legacy behavior
Any team member can edit **any field on any task belonging to their own team** — not restricted to tasks they're personally assigned to. No field-level distinction between planning fields and execution fields exists anywhere in the legacy code.

### Options
- **A.** Employee edits only progress/comments.
- **B.** Employee edits progress + dates.
- **C.** Employee edits most task fields (closest to legacy's actual permissiveness).
- **D.** Team Lead controls planning fields; Employee controls execution fields on their own assigned tasks.

### Recommended option
**D**, with roles resolved explicitly as:

| Field group | Fields | Employee (own assigned task) | Team Lead (own team) | HR | Super Admin |
|---|---|:---:|:---:|:---:|:---:|
| **Planning** | title, description, project, sub-phase, priority, planned start/due dates, effort figures, team, assignees | ❌ | ✅ | ❌ | ✅ |
| **Execution** | status, current_updates, actual start/completion dates, time_taken/days_taken, comments, bug logging, corrections | ✅ (own task only) | ✅ | ❌ | ✅ |

### Why
Option D is the safest enterprise model: it prevents an employee from silently moving their own due date, reassigning effort, or reassigning who's on the task (which would quietly undermine planning/reporting integrity), while keeping the frictionless day-to-day updates (status, time, comments, bug reports) fully self-service, exactly what's needed operationally. **HR is deliberately given zero PM task-edit rights** — being an HR/administrative role doesn't imply operational project-delivery rights, and nothing in the HR Portal's existing role model grants HR editing power over operational modules it doesn't own (HR doesn't get Leave-approval-override rights either, for the same reason: distinct domains). This is stated explicitly, not assumed by omission.

### Schema impact
None — this is pure authorization logic in `ProjectTaskController@update` (split the incoming payload into planning-vs-execution fields, reject planning-field changes from a non-planning-authorized caller).

### UI impact
Full task-edit modal (all fields) shown to Team Lead/Super Admin. A lighter "update my progress" form (execution fields only) shown to an assignee who lacks edit rights on the rest.

### Workflow impact
No scope-creep risk from doers silently replanning; still zero-friction for status/time/comment updates, which is the vast majority of day-to-day interaction volume.

---

## Decision 3 — Multi-Assignee Behavior

### Question
When a task has multiple assignees: one shared status for everyone, fully independent status per assignee, or a master status plus optional individual progress?

### Legacy behavior
Row-duplication: each additional assignee got their **own entirely separate task row**, sharing only the initial project/phase/bug-count context at creation — meaning each assignee genuinely *did* track independent status/dates in legacy, just via a broken mechanism (duplicated rows, no join table, clutter on every list/calendar view, no single source of truth for "the task").

### Options
- **A.** One shared task, one shared status — simplest, but **loses** legacy's actual observed capability (two assignees on one task can't independently show "done" vs "still working").
- **B.** Each assignee has a fully independent status (matches legacy's real behavior, achieved cleanly via a status field on the join row instead of duplicating the task).
- **C.** Master status on the task (used for all rollups/reports/schedule — one row, one line item) **plus** an optional per-assignee individual status/progress on `pm_task_assignees`, defaulting to "follows master" when unset.

### Recommended option
**C.**

### Why
This is the option that literally satisfies "preserve the useful legacy functionality without duplicating tasks." A always loses real capability; B fixes the duplication but creates a new problem — what does "the task's status" mean on a Schedule/Reports/Bug-Analytics rollup if there is no single status? C keeps exactly one row per task for every aggregate view (clean Schedule/Reports, no legacy-style row-count inflation) while still letting two people on the same task diverge when they genuinely need to.

### Schema impact
`pm_task_assignees` gains two optional columns beyond the design's current shape: `individual_status` (nullable string, same vocabulary as Decision 1's task status), `progress_percentage` (nullable decimal). Both null = "follows the task's master status," matching the common case with zero extra UI noise.

### UI impact
Task detail shows the master status prominently; if any assignee has set an individual override, a small per-assignee status chip list appears alongside it.

### Workflow impact
Reports/Schedule/Bug-analytics roll up on the one master status only — no duplicate-row inflation, exactly the defect legacy's row-per-assignee approach caused (notes §6.5/§23.7).

---

## Decision 4 — Sub-Phase Scope

### Question
Should sub-phases be global, team-specific, or both?

### Legacy behavior
`team_subphases`, strictly per-team, **except** one hardcoded "QA Team" UUID special-cased in code to return all teams' sub-phases unfiltered — an ad-hoc, fragile stand-in for "global," explicitly called out in the notes as "a special case worth simplifying in a redesign."

### Options
- **A. Global only** — one shared list for every team.
- **B. Team-specific only** — matches legacy's intent, minus the hardcoded special case.
- **C. Both** — a shared global baseline (e.g. `Development, QA, UAT, Deployment`) plus optional team-specific additions (e.g. QA's own `Smoke Test, Dev Test, Before Live`).

### Recommended option
**C.**

### Why
Your own two example lists in the prompt are actually two different *kinds* of taxonomy — generic project phases everyone uses, and QA's own granular internal steps. Global-only (A) loses the QA team's real granularity; team-only (B) forces every team to redefine `Development`/`QA`/`UAT` from scratch and re-creates exactly the "is this team special-cased as global" fragility legacy had, just spread across every team instead of one hardcoded ID. C needs only one extra nullable column, not a second table — "flexible without unnecessary complexity" as asked.

### Schema impact
Add nullable `team_id` (FK → `teams`) to `pm_sub_phases` — `NULL` = global/visible to everyone, non-null = that team's own addition, visible to them plus the global set.

### UI impact
Task's sub-phase dropdown shows Global phases + the caller's own team's phases, visually grouped. `/sub-phases` admin page: Super Admin manages the global list; Team Lead can add/edit their own team's entries (using `manage tasks`, not the stricter `manage sub phases` permission, for their own rows only).

### Workflow impact
No hardcoded "this one team is secretly global" logic ever needed again.

---

## Decision 5 — Checklist Structure

### Question
Flat items, sections+items, or sections+nested+sub-items?

### Legacy behavior
Genuinely flat: a "checklist" **is** a single named item (e.g. "Domain Access Available"), defined once (`checklists`), assigned to specific projects (`project_checklists`), with one pass/fail flag per (project, item) pair (`project_checklist_status`) — no grouping, no sub-items, ever.

### Options
- **A. Flat items** under a named, reusable list — matches legacy exactly.
- **B. Sections/categories + items** — adds one grouping layer.
- **C. Sections + nested items + sub-items** — full hierarchy.

### Recommended option
**A**, with one refinement: **this validation is revising the original design doc's checklist schema down**, not just picking a level. The original design had four tables (`pm_checklist_templates` → `pm_checklist_template_items` → `pm_checklists` → `pm_checklist_items`) — that's real over-engineering relative to what legacy (or any of your three given examples) actually needs. Recommend collapsing to **two tables**:
1. `pm_checklist_items` — the reusable, named definitions (id, label, `applies_to`: project|task, is_active) — directly equivalent to legacy's `checklists`.
2. `pm_checklist_assignments` — one row per (project-or-task, checklist_item), holding `is_checked`, `checked_by`, `checked_at` — directly equivalent to legacy's `project_checklists` + `project_checklist_status` merged (they were always 1:1 keyed the same way in legacy anyway).

A cheap, optional enhancement if flat ever feels unwieldy: a nullable `category` **string label** (not a table) on `pm_checklist_items`, purely for display grouping — this is the low-cost version of Option B, offered without paying for Option C's real complexity.

### Why
"Do not over-engineer it" was explicit, and the four-table version genuinely is over-engineered — every real example given (payment gateway access, domain access, etc.) is a flat item, never a section header. Two tables still fully support everything asked: reusable templates (✅ — the items *are* the templates), project assignment (✅), pass/fail (✅), `checked_by`/`checked_at` (✅), progress percentage (✅, computed at read time as checked/total — this is a legitimate direct-child aggregate, unlike project-status-from-tasks which spans an unrelated hierarchy and must never be auto-derived per Decision 1).

### Schema impact
**Revises the design doc's checklist section**: drop `pm_checklist_templates` and `pm_checklist_template_items` as separate concepts; the two tables above replace all four. Net: 2 tables instead of 4.

### UI impact
`/checklists` page: manage the flat reusable item list (Super Admin/Team Lead), assign items to a project or task, tick pass/fail inline (from the task-edit view too, matching legacy's actual most-used entry point).

### Workflow impact
Checklist completion stays fully independent of task/project status by default — no automatic linkage. If you later want completion to gate a status transition (e.g. can't mark a project `Completed` with open checklist items), that's a distinct, separately-approved `pm_settings` toggle for the future, not built now — this decision only confirms the *default* is independence, per your own wording ("unless explicitly configured").

---

## Decision 6 — Project Coordinator

### Question
What is a "Project Coordinator" in the new system, and how does task-level vs. project-level coordination work?

### Legacy behavior
`global_pcs` — a flat name+email roster, not a real login or employee record, assignable as free text on **both** `project_overview.pc` (project-level) **and** `tasks.pc` (task-level) independently, used purely to route email/in-app notifications. No ownership check on the PC-mode notification inbox at all (a real, documented vulnerability — notes §14.1/§23.2).

### Options
- **A.** Existing HR employee assigned to a project only.
- **B.** Existing HR employee assigned to a project **and/or** a specific task (task-level can override project-level).
- **C.** A dedicated PM role (new Spatie role).
- **D.** A project member carrying a "coordinator" permission/tag.

### Recommended option
**B.**

### Why
Legacy genuinely has coordination at *both* levels (`pc` exists independently on both `project_overview` and `tasks`) — Option A alone would silently drop the task-level override capability, which is exactly the gap this validation's report flagged as the single most important missing notification trigger (Gap A1). **Not C** — a global "Coordinator" Spatie role would be wrong, since coordination is inherently per-project/per-task, not a portal-wide identity tier (the same reasoning the original architecture audit already applied to avoid role explosion elsewhere). **Not a hard version of D** — requiring project-membership as a DB constraint before someone can be coordinator adds friction legacy never had; simpler to let `coordinator_id` be an independent FK. **Confirmed by real production data**: the HR Portal's live `teams` table already has a department literally named **"Project Coordinators"** (9 people... well, department id 7) — real employees in this exact role already exist in the HR system today, which strongly supports "a real HR employee, drawn from wherever, most naturally that department" rather than any parallel identity system.

**On your specific sub-questions:**
- **Multiple coordinators per project?** Not for v1 — keep the single `project_coordinator_id` FK (matches both legacy and the original design). If true co-coordination is wanted later, `pm_project_members` with `project_role = 'Coordinator'` already supports multiple people holding that label with zero schema change — the escape hatch already exists without building it now.
- **Task-level coordinator different from project's?** Yes — add nullable `coordinator_id` on `pm_tasks`; null = inherit the project's coordinator.
- **Does task-level override project-level?** Yes, for that task's own notifications only.
- **Who receives task-created/updated notifications?** The *resolved* coordinator for that specific task (its own override if set, otherwise the project's coordinator) — this directly closes Gap A1.

### Schema impact
Add nullable `coordinator_id` (FK → `users`) to `pm_tasks`, beyond the design's current shape. `pm_projects.project_coordinator_id` stays as already designed.

### UI impact
Task form gets an optional "Override Coordinator" field, defaulting to "(inherits project coordinator: `<name>`)". Project detail shows/edits the coordinator under `manage projects` rights.

### Workflow impact
Notification routing resolves per task, formalizing what were two disconnected free-text fields in legacy into one clean inherit-or-override relationship.

---

## Decision 7 — Project ↔ Team Relationship

### Question
Does a project belong to one team, many teams, or one primary team plus multiple participating teams?

### Legacy behavior
Started as one-team-owns-a-project, then a later migration (`20260217_unify_projects_global.sql`) **deliberately made `projects.team_id` global/null for every row** because cross-team projects were common enough to break the single-owner model — and **`tasks.team_id` became what actually scopes work to a team**, independent of the project's own (now-inert) team field. This was a real, intentional architectural evolution in response to a real operational need, not an accident.

### Options
- **A. One team owns the project** — doesn't fit what legacy organically evolved away from.
- **B. Many teams, explicit M:N** — a new junction table for a relationship that's already derivable.
- **C. One optional primary/owning team + participation expressed through each task's own team** — no new table needed.

### Recommended option
**C** — and notably, **the design doc's existing shape already implements this without it being stated explicitly**: `pm_projects.team_id` (nullable) as the optional primary/owning team, `pm_tasks.team_id` (denormalized per task) as the real per-contribution scope. This decision **ratifies** that shape as intentional rather than changing anything.

### Why
This is precisely the shape legacy organically evolved into after real cross-team-project pain — strong evidence it's correct, not a guess. Option B would add a whole `pm_project_teams` junction table for a relationship that's already fully derivable with a single query (`SELECT DISTINCT team_id FROM pm_tasks WHERE project_id = ?`) — unnecessary schema for zero extra capability.

### Schema impact
**None** — confirms the existing design's `pm_projects.team_id` + `pm_tasks.team_id` shape as deliberate.

### UI impact
Project detail page should show a "Participating Teams" chip list, derived live from its tasks' distinct `team_id`s — a display feature only, closing the validation report's §1 #3 gap (legacy's per-team "lane" rollup, notes §7.5) as a natural byproduct, no new storage.

### Workflow impact
Team-scoping checks (a Team Lead can only touch their own team's stuff) apply primarily at the **task** level — a TL can create tasks for their own team under a project "owned" by a different team's coordinator. Project-level edit rights (rename, delete, change coordinator) stay gated to the project's own owning team's TL plus Super Admin.

---

## Decision 8 — Legacy Team → HR Team Mapping

### Question
How do QA Tracker Pro's teams map onto the HR Portal's real teams?

### Legacy behavior
Team names observed in the source: `Designers, HTML, PHP Team, Wordpress, Team React/React, QA Team, Server, PMO, Dubai, Cochin, Super Admin (a guest-login remap artifact, not real), Frontend Developers, Demo Team (test data)`.

### The HR Portal's actual current teams (verified directly, not invented)
Pulled from the real production database export (`database/migration/mysql/inter-smart-employee-portal-mysql.sql`, the live `teams` table's INSERT rows — a snapshot, not a guess): **`QA`, `HTML`, `PHP`, `WordPress`, `React`, `Digital Marketing`, `Project Coordinators`, `Project Management`, `Accounts`** (9 teams).

### Mapping

| Legacy team | HR team | Mapping confidence |
|---|---|---|
| `HTML` | `HTML` | **Direct match** |
| `PHP Team` | `PHP` | **Direct match** (name variant) |
| `Wordpress` | `WordPress` | **Direct match** (case variant) |
| `Team React` / `React` | `React` | **Direct match** |
| `QA Team` | `QA` | **Direct match** (name variant) |
| `Designers` | *(none)* | **UNMAPPED — no equivalent HR team exists.** Requires manual decision: create a new HR team, or fold into an existing one? |
| `Server` | *(none)* | **UNMAPPED.** No Server/DevOps/Infrastructure HR team exists. |
| `PMO` | possibly `Project Coordinators` or `Project Management` | **AMBIGUOUS, requires manual confirmation** — genuinely could be either, or neither; not auto-mapped |
| `Frontend Developers` | possibly `HTML`+`React` (many-to-one) | **AMBIGUOUS, requires manual confirmation** — could be a distinct pod or an overlap with the two existing frontend teams |
| `Dubai` / `Cochin` | *(exclude)* | These are **locations, not teams** — recommend excluding entirely from any team import |
| `Super Admin` (guest-login artifact) | *(exclude)* | Not a real team — a remap side-effect in legacy's auth code |
| `Demo Team` | *(exclude)* | Legacy's own test/seed data — never import |

`Digital Marketing` and `Accounts` (real HR teams) have **no legacy counterpart at all** — expected; they simply won't have PM data on initial import, which is fine.

### Recommended option
Apply the 5 direct matches automatically (by name); **do not** auto-guess `Designers`, `Server`, `PMO`, or `Frontend Developers` — surface these 4 explicitly for your confirmation before any import touches them.

### Why
"Do not invent team mappings" was explicit — 5 of 9 legacy teams have an unambiguous real HR counterpart today; the other 4 genuinely don't, and guessing would risk silently misattributing real project/task history to the wrong department.

### Schema impact
None new — this only affects the *data* used when writing the (already-designed) `team_id` foreign keys during import; no schema change.

### UI impact
None — this is a one-time import-time decision, not a runtime feature.

### Workflow impact
The 4 unmapped/ambiguous names should block that portion of the import (or import with `team_id = NULL`, editable later) rather than proceed on a guess.

---

## Decision 9 — Activity / Effort Aggregation

### Question
One consistent formula for activity percentage, allotted/actual effort, days taken, and deviation, at every rollup level (project/team/employee).

### Legacy behavior
Two disagreeing code paths on the *same page*: the server route sums activity percentage; the frontend then re-derives the same figure using an average once real task rows load. Genuinely inconsistent, explicitly named in the notes as a defect not to repeat (§8, §23.9).

### Options (for activity percentage specifically)
- **A. Sum** — mathematically meaningless for a percentage (a 3-task rollup could show 250%).
- **B. Simple average** — better, but treats a 5-minute task and an 8-hour task as equally significant.
- **C. Weighted average**, weighted by `time_taken` — a task with more tracked time contributes proportionally more to the rollup.
- **D. Other.**

### Recommended option
**C** for activity percentage, at every rollup level. **Sum** for the absolute-quantity fields (allotted effort, actual effort/days taken) — these aren't rates, so summing them across tasks is the mathematically correct operation (a 3-task project's total allotted days really is the sum of each task's allotted days).

**Exact formulas:**
```
activity_percentage (project/team/employee rollup)
   = Σ(task.activity_percentage × task.time_taken) / Σ(task.time_taken)
     [tasks with time_taken = 0 excluded from both sides]

allotted_effort (rollup)  = Σ(task.allotted_days)
actual_effort / days_taken (rollup) = Σ(task.days_taken)
deviation (rollup) = Σ(task.days_taken) − Σ(task.allotted_days)
     [equivalent to Σ(task.deviation) — both give the same number, since deviation is linear]
```
- **Project-level**: over all tasks in the project.
- **Team-level**: over all tasks where `task.team_id` = that team (across any project, per Decision 7).
- **Employee-level**: over all tasks that employee is assigned to via `pm_task_assignees` — **note:** if a task has multiple assignees sharing one `time_taken` figure, per-employee attribution is only fully precise if Decision 3's optional per-assignee tracking is used; otherwise the task's whole figure is attributed to each assignee equally (a known, disclosed approximation, not a silent one).

### Why
Percentages are rates and must be weight-averaged to mean anything across multiple tasks of different sizes; absolute quantities are correctly summed. Documenting one formula, computed fresh at query time (never stored/denormalized), removes the exact defect legacy shipped.

### Schema impact
None — computed in `ProjectReportController` at read time, not stored.

### UI impact
Reports, Workload, and Bug Analytics all display numbers computed by this one shared formula — no page-specific reinterpretation.

### Workflow impact
None beyond consistency — the same number means the same thing everywhere in the module.

---

## Decision 10 — Hubstaff Scope

### Question
Exactly which Hubstaff capabilities does v1 need, and does Hubstaff data ever write into task fields?

### Legacy behavior
Read-through only — members, projects, daily/monthly/project activity fetched live on demand, **never persisted historically**. OAuth2 refresh-token flow. `time_taken`/`activity_percentage` columns exist on `tasks` but were **never** auto-written from Hubstaff in any code path — always user-typed, despite existing as columns for years.

### Scope split

| Capability | Priority |
|---|---|
| OAuth2 refresh-token flow + secure server-side token storage | **MUST HAVE** (prerequisite for everything else) |
| Org members retrieval | **MUST HAVE** (needed for employee mapping) |
| Org projects retrieval | **MUST HAVE** (needed for project linking) |
| Per-project activity (daily/range) | **MUST HAVE** (the core value proposition — live time on a project) |
| Employee↔Hubstaff mapping (new table, not a `users` column) | **MUST HAVE** (prerequisite for any per-employee display) |
| Daily/Monthly activity dashboard tabs (attendance-style) | **SHOULD HAVE** |
| Employee-level activity rollup feeding Workload (display only) | **SHOULD HAVE** |
| Org teams/members-by-Hubstaff-team | **SHOULD HAVE** (lower priority — HR's own team structure is already authoritative) |
| "HR-daily" specialized dashboard (legacy's own half-finished feature, notes §19.5) | **NOT REQUIRED** |
| WhatsApp-style Markdown "daily report" + PNG export | **NOT REQUIRED** |
| `bulk-activity` heavy batch-sync-everything-on-page-load endpoint | **NOT REQUIRED** — fetch per-project on demand instead; this was legacy's single most fragile route (3 inconsistent rate-limit implementations, notes §19.7) |
| Debug/dump endpoints | **NOT REQUIRED**, ever |

### A/B/C/D question
**A — display only**, for v1.

### Why
Not B/C/D: Workload's effort figures should stay driven by user-entered `allotted_days`/`time_taken`/`days_taken` (Decision 9's formulas operate on those, not on live Hubstaff pulls) — this matches legacy's own actual behavior exactly (it never auto-fed Hubstaff into those fields either, despite years of having the columns to do so). Auto-updating task fields from Hubstaff is explicitly not assumed, per your instruction — that would be a deliberate, separately-approved v2 decision if ever wanted. No local historical-activity table is created, matching legacy's one genuinely good practice.

### Schema impact
Two new tables (detailed in the validation report §9): `pm_hubstaff_tokens` (singleton OAuth store) and `pm_user_hubstaff_links` (`user_id`→`users`, `hubstaff_user_id`) — the latter deliberately avoids adding a column to `users` itself, keeping the HR table untouched.

### UI impact
Read-only activity figures shown alongside tasks/projects (e.g. "Live Hubstaff activity: 62% today"), clearly informational, never editable, degrading gracefully to "unavailable" if Hubstaff is unreachable.

### Workflow impact
No cron/scheduled sync needed — on-demand only, matching legacy's actual (fine) approach.

---

## Decision 11 — Report Export

### Question
What exactly needs export capability, and CSV or XLSX?

### Legacy behavior
Documented CSV/XLSX export exists on: Reports (`/reports`), Bug Analytics (`/analytics/bugs`), and the Project Overview page. **Not** documented anywhere for Checklists or Corrections.

### Recommended minimum complete set
CSV export on: **Reports, Bug Analytics, Projects list** — matches documented legacy scope exactly. **Workload**: recommended as an *addition* (structurally identical tabular data, cheap to add via the same mechanism, useful for capacity planning) — flagged as beyond documented legacy scope, confirm wanted. **Checklists, Corrections**: **not required** — legacy never had this either; these are worked *in* the app, not typically exported.

### XLSX question
The HR Portal's only existing reusable export infra is `jspdf` (PDF-only) — there is **no** existing CSV/XLSX capability to reuse, so this isn't a "just reuse what's there" situation either way; a new dependency would be needed for true `.xlsx`. Recommend **plain CSV** (a hand-rolled text/blob writer, zero new dependencies, opens fine in Excel/Sheets) for v1. True `.xlsx` stays an optional future enhancement (already flagged as such in the validation report), not built now.

### Schema impact
None.

### UI impact
Export button on Reports, Bug Analytics, Projects list (+ Workload if approved) — generates a CSV client-side from the same data already rendered.

### Workflow impact
None beyond giving users a file to hand off/archive, matching legacy's actual use case.

---

## Decision 12 — Project AI Assistant

### Question
Dedicated PM AI page, a context-mode inside the existing assistant, or both?

### Legacy behavior
`/api/chat` — Groq `llama-3.3-70b-versatile`, live task-context (top 100 active + last 50 completed tasks) injected fresh every request, fully stateless, no conversation persistence.

### Options
- **A.** A PM-specific page using the existing AI backend.
- **B.** A PM-specific context mode inside the existing (already-deployed, already-familiar) assistant.
- **C.** Both.

### Recommended option
**B.**

### Why
The HR Portal already has a working chat widget users know, on every page, with an established read-only contract. A separate PM AI page would fragment the experience and edge toward "a second AI system," which the brief explicitly warns against. The right version of "both capabilities" (A and C's intent) is achieved for free by making the *existing* assistant context-aware of which area of the app the caller is in — no second page, no second component needed.

**The non-negotiable part**: authorization must happen **before** context generation. The PM context block must be built from the exact same scoped queries the list endpoints (`GET /api/projects`, `GET /api/project-tasks`) already use for that caller — never an unscoped query filtered only by prompt instructions. This mirrors how the existing assistant already only ever injects the caller's *own* leave balance, never anyone else's.

**Minimum useful PM questions** (mirroring legacy's demonstrated scope, plus natural PM-specific extensions): "what are my open tasks", "what's overdue / due today / this week", "what's the status of project X" (only if the caller can see project X), "who's the coordinator for project X", "what's blocking project X" (from the `blockers` field), "how many open bugs on task/task X". **Read-only, no exceptions**, in this first implementation — matches the existing assistant's hard constraint unchanged.

### Schema impact
None — reuses `ChatController` entirely.

### UI impact
None new — same existing chat widget, context now includes PM facts when relevant.

### Workflow impact
None beyond the existing "redirect to the UI for any action" behavior extending naturally to PM pages (e.g. "go apply that status change at `/project-management/tasks/{id}`").

---

## Final Decisions Requiring User Approval

| # | Decision | Recommended Choice | User Approval |
|---|---|---|---|
| 1 | Task status model | Keep all 9 legacy task statuses (formalized); Project status is a separate 5-value field, never derived from tasks | REQUIRED |
| 2 | Employee task editing | Option D — TL/Admin control planning fields, Employee controls execution fields on own tasks; HR gets none | REQUIRED |
| 3 | Multi-assignee behavior | Option C — master task status + optional per-assignee individual status/progress | REQUIRED |
| 4 | Sub-phase scope | Option C — global baseline + optional team-specific additions (one nullable `team_id` column) | REQUIRED |
| 5 | Checklist structure | Option A, refined — flat, reusable items; **revises design doc down from 4 tables to 2** | REQUIRED |
| 6 | Project Coordinator | Option B — real HR employee, project-level + optional task-level override (new `coordinator_id` on tasks) | REQUIRED |
| 7 | Project↔Team relationship | Option C — ratifies the design's existing shape (optional project owning-team + per-task team scoping); no schema change | REQUIRED |
| 8 | Legacy team → HR team mapping | 5 direct matches applied automatically; 4 legacy teams (Designers, Server, PMO, Frontend Developers) require your explicit confirmation | REQUIRED |
| 9 | Activity/effort aggregation | Weighted average (by `time_taken`) for activity %; straight sum for absolute-quantity fields | REQUIRED |
| 10 | Hubstaff scope | Display-only (Option A) for v1; MUST/SHOULD/NOT-REQUIRED split as tabled above; no auto task-field updates | REQUIRED |
| 11 | Report export | CSV (not XLSX) on Reports, Bug Analytics, Projects (+Workload if you confirm); Checklists/Corrections excluded | REQUIRED |
| 12 | PM AI assistant | Option B — context-mode inside the existing assistant, not a separate page; read-only, authorization before context generation | REQUIRED |

**No file has been modified. This document stands alone pending your decisions.**
