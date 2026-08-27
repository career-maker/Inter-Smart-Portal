# Architectural Assessment — Adding a "Project Management" Module

> Pre-implementation audit only. No Project Management code has been written. Findings below are based on direct inspection of the current codebase on 2026-08-25 (branch `main`).

---

## 1. Authentication Architecture

**Implementation:** Laravel Sanctum, **personal access tokens** (not SPA cookie-session flow, despite `withCredentials: true` on the frontend axios client — that flag is currently a no-op since the app authenticates via `Authorization: Bearer <token>`). Login validates credentials + `status === 'Active'`, issues `createToken('auth_token')->plainTextToken`. Frontend stores the token in `localStorage` (Zustand-persisted) and an axios request interceptor attaches it as a Bearer header.

**Files:** `backend/app/Http/Controllers/Api/AuthController.php`, `backend/app/Http/Requests/LoginRequest.php`, `frontend/src/services/api.ts`, `frontend/src/store/auth.ts`, `frontend/src/middleware.ts` (currently a no-op pass-through — route protection is done client-side per the comment in the file, not at the Next.js edge).

**⚠️ Finding:** `forgotPassword()` and `resetPassword()` in `AuthController` are **stub implementations** (`// TODO`, return canned JSON) — not wired to real email/token reset flow despite being documented as implemented in `CLAUDE.md`. Not a Project Management concern, but noted since an assessment should report ground truth.

**Tables:** `users`, `personal_access_tokens` (Sanctum standard).

**APIs:** `POST /login`, `GET /me`, `POST /logout`, `POST /forgot-password` (stub), `POST /reset-password` (stub).

- **Reusable by PM:** Yes — every PM endpoint should sit behind the existing `auth:sanctum` middleware exactly like every other module. No new auth mechanism needed.
- **Must remain untouched:** Yes, entirely. PM must not add new token guards, alter `AuthController`, or change the frontend token-storage mechanism.

---

## 2. Role / Permission Architecture

**Implementation:** **Spatie `laravel-permission`**, `HasRoles` trait on `User`. Guard name `web`. Roles are DB-driven (`roles`, `model_has_roles`, `permissions`, `model_has_permissions`, `role_has_permissions` — Spatie's standard tables), not hardcoded enums. Route-level enforcement via aliased middleware (`role`, `permission`, `role_or_permission` — registered in `backend/bootstrap/app.php`) applied as `Route::middleware(['role:Super Admin|Team Lead|HR'])->group(...)` etc. Four roles currently exist in practice: `Super Admin`, `Team Lead`, `HR`, `Employee`. Frontend additionally filters nav/UI per role from `user.role` / `user.permissions` returned at login (does **not** re-derive authorization — it's a UX filter only, real enforcement is server-side).

**Files:** `backend/app/Models/User.php` (trait), `backend/bootstrap/app.php` (middleware aliases), every controller's route group in `backend/routes/api.php`, `frontend/src/app/(dashboard)/layout.tsx` (nav filtering).

**Tables:** `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `role_has_permissions`.

**APIs:** N/A (infrastructure, not a resource) — consumed via `$user->hasRole()`, `role:` middleware, `getAllPermissions()` in `AuthController`.

- **Reusable by PM:** Yes, directly. PM authorization should be expressed as **new Spatie permissions** (e.g. `project.view`, `project.manage`, `task.assign`) rather than new roles, so existing roles gain PM capability by permission assignment, not by redefining what "Team Lead" or "Super Admin" means. See §I below for naming.
- **Must remain untouched:** The four existing roles and their existing permission grants must not be modified as a side effect of adding PM permissions.

---

## 3. Existing User / Employee Model

**Implementation:** Single `users` table serves as both the auth principal and the HR employee record (`first_name`, `last_name`, `employee_code`, `designation`, `team_id`, `joining_date`, `dob`, `status`, `probation_end_date`, profile fields, etc.) — `protected $guarded = []`. Relations already on the model: `team()`, `leaveBalances()`/`leaveBalance()`, `leaveRequests()`, `wfhRequests()`, `favorites()`. Helper methods: `isInProbation()`, `probationEndDate()`, `profilePhotoUrl()`.

**Files:** `backend/app/Models/User.php`, `backend/app/Http/Controllers/Api/EmployeeController.php`, `backend/app/Http/Requests/{Store,Update}EmployeeRequest.php`.

**Tables:** `users`.

**APIs:** full `apiResource('employees', ...)` plus photo/password/status/CSV-import endpoints (see prior `PROJECT_DOCUMENTATION.md` §4).

- **Reusable by PM:** Yes — PM must reference `users.id` as its foreign key for "assignee", "reporter", "project member", etc. Do **not** create a parallel employee table.
- **Must remain untouched:** The `users` table schema and `User` model's existing relations/columns must not be altered. New PM relations should be added as **new methods on `User`** (e.g. `projects()`, `assignedTasks()`) purely additive — never touching existing ones.

---

## 4. Existing Team / Department Model

**Implementation:** `teams` table — `name`, auto-generated unique `code` (first 4 letters of name + random 4-digit suffix, generated in `Team::boot()`'s `creating` hook), `team_lead_id` → `users`. `hasMany` to `users` as `members()`.

**Files:** `backend/app/Models/Team.php`, `backend/app/Http/Controllers/Api/TeamController.php`.

**Tables:** `teams`.

**APIs:** `apiResource('teams', ...)`, `POST /teams/{team}/members`.

- **Reusable by PM:** Yes, if PM wants a "project belongs to a department" concept — reference `teams.id`. Not mandatory; PM could equally scope purely by project membership instead of by department.
- **Must remain untouched:** Yes. Team's code-generation and `team_lead_id` semantics (used throughout leave/WFH/attendance approval-chain logic) must not change.

---

## 5. Existing Notification Infrastructure

**Implementation:** Standard Laravel database-notifications (`Notifiable` trait on `User`, `notifications` table via `$user->notify(new SomeNotification(...))`). Seven notification classes exist today, one per domain event type: `LeaveRequestNotification`, `WfhRequestNotification`, `IssueNotification`, `RecognitionNotification`, `BirthdayWishNotification`, `DocumentRequestNotification`, `ProfileUpdateRequestNotification`. Every call site wraps `->notify()` in try/catch so a notification failure never blocks the underlying business transaction — this pattern is consistent everywhere and should be followed by PM too.

**Files:** `backend/app/Notifications/*.php`, consumed from the relevant controllers; surfaced via `backend/app/Http/Controllers/Api/NotificationController.php` and `frontend/src/components/layout/NotificationDropdown.tsx`.

**Tables:** `notifications` (Laravel's polymorphic standard: `id`, `type`, `notifiable_type`, `notifiable_id`, `data` JSON, `read_at`).

**APIs:** `GET /notifications`, `GET /notifications/unread`, `POST /notifications/mark-as-read/{id?}`, `DELETE /notifications/{id}`.

- **Reusable by PM:** Yes, fully — add new notification classes (e.g. `TaskAssignedNotification`, `ProjectDeadlineNotification`) following the exact same pattern; they land in the same `notifications` table/endpoint/dropdown automatically, no new infra needed.
- **Must remain untouched:** The existing 7 notification classes and their call sites must not be modified. `NotificationController` needs no changes — it's already generic.

---

## 6. Existing Email Infrastructure

**Implementation:** A static-method `EmailService` (`app/Services/Email/EmailService.php`) with one `send*Email()` method per domain event, each internally resolving recipients (e.g. team lead + HR addresses) and building a `Mailable` (`App\Mail\LeaveRequestMail`, `WfhRequestMail`, `RecognitionMail`, TA equivalents). Every call is wrapped in try/catch with heavy `Log::info`/`Log::error` tracing, and **every call site wraps the `EmailService::send...()` call itself in another try/catch** — a deliberate double-isolation so email can never break a request/response cycle. Also home to the **signed-URL email action links** (leave & TA approve/reject-by-email, validated via Laravel's signed-URL feature, no auth required on those specific routes).

**Files:** `backend/app/Services/Email/EmailService.php`, `backend/app/Mail/*.php`.

**Tables:** none directly (reads from `LeaveRequest`, `WfhRequest`, `User`, `Team`).

**APIs:** the signed email-approve/reject routes documented in `PROJECT_DOCUMENTATION.md` §5.4 and §8.

- **Reusable by PM:** Yes, as a **pattern** to copy (`EmailService::sendTaskAssignedEmail()` etc., new `Mailable` classes) — not by adding new methods onto the *existing* domain methods.
- **Must remain untouched:** Existing `send*Email()` methods, their recipient-resolution logic, and the signed email-action routes for Leave/TA must not change.

---

## 7. Existing File / Attachment Storage

**Implementation:** Laravel local disk (`storage/app/public`), symlinked to `public/storage` (`storage:link`, run automatically in the Render Dockerfile). Convention observed across modules: `$file->store('<feature>-attachments', 'public')` then persist the returned relative path — e.g. `profile-photos/`, `issue-attachments/`. Issues use a dedicated child table (`issue_attachments`) for multi-file-per-record association; other modules (leave, TA) instead store a single `attachment_link`/`bill_link` string column (often an **external URL**, not an uploaded file, per the `nullable|url|max:2048` validation rule seen in `StoreLeaveRequest`). So there are actually **two attachment patterns** in play: (a) uploaded-file-with-child-table (Issues), (b) plain URL column (Leave/TA/WFH).

**Files:** `backend/app/Http/Controllers/Api/IssueController.php` (pattern a), `backend/app/Http/Requests/StoreLeaveRequest.php` (pattern b), `backend/app/Models/IssueAttachment.php`, `backend/app/Models/DocumentUpload.php`.

**Tables:** `issue_attachments`, `document_uploads`, plus flat `attachment_link`/`bill_link` columns on `leave_requests`/`wfh_requests`/`ta_requests`.

**APIs:** `POST /employees/{id}/photo`, issue attachment upload inline with issue/comment creation, `POST /document-requests/{id}/upload`.

- **Reusable by PM:** Yes — the "uploaded-file-with-child-table" pattern (Issues' approach) is the right template for PM task/project attachments (multiple files per task). New disk folder, e.g. `project-attachments/`, on the same public disk.
- **Must remain untouched:** The two existing patterns and their storage paths must not be consolidated or renamed as part of this work, even though they're inconsistent — that's a separate refactor decision, out of scope and explicitly disallowed by the brief.

---

## 8. Existing Audit-Log Infrastructure

**Implementation:** Two *separate*, non-generic audit mechanisms exist — **there is no shared/reusable generic audit-log service today**:
1. **General `AuditLogController`/`AuditLog` model** — `protected $guarded = []`, `belongsTo(User)`, exposed read-only at `GET /audit-logs` (Super Admin only) and surfaced in the Super-Admin dashboard widget. Write path is not centralized — it's an open model any controller could call `AuditLog::create()` on, but in the current codebase it is not actually being written to from most controllers (no `AuditLog::create` call sites found in Leave/WFH/TA/Employee controllers) — appears to be lightly used / possibly legacy or aspirational infrastructure.
2. **Domain-specific audit trails** — `leave_audit_logs` (`LeaveAuditLog`, written from `override()`/`confirmLopConversion()`) and `leave_balance_audit_logs` (written from `LeaveBalanceController::adjust()` and `LeaveBalance::createAuditLog()`), each with its own previous/new-value JSON shape, purpose-built for leave/balance changes only.

**Files:** `backend/app/Models/AuditLog.php`, `backend/app/Http/Controllers/Api/AuditLogController.php`, `backend/app/Models/LeaveAuditLog.php`, `backend/app/Models/LeaveBalanceAuditLog.php`.

**Tables:** `audit_logs`, `leave_audit_logs`, `leave_balance_audit_logs`.

**APIs:** `GET /audit-logs`, `GET /leave-balance-audit-logs`.

- **Reusable by PM:** Partially. The generic `AuditLog` model/table *could* be reused for PM's own change history (it's schema-guarded/generic, `user_id` + free-form fields), but given it appears under-used and its exact intended shape is unclear from usage, **the safer, isolated choice is a dedicated `project_activity_logs`/`task_activity_logs` table** scoped to PM, following the `LeaveAuditLog` pattern (previous/new JSON + remarks + `modified_by`) rather than entangling with the ambiguous general `AuditLog`.
- **Must remain untouched:** `leave_audit_logs` and `leave_balance_audit_logs` are leave-domain-specific and must not be repurposed for PM under any circumstance.

---

## 9. Existing API / Controller Structure

**Implementation:** Flat `App\Http\Controllers\Api\*Controller` namespace (no sub-namespacing by domain), one controller per resource/feature (30 controllers currently). All routes declared in a single `backend/routes/api.php` (433 lines), fully qualified class references inline (`[\App\Http\Controllers\Api\XController::class, 'method']`) rather than a `use` + short-name pattern in most of the file. Route groups are organized by **auth requirement then role**, not by feature — i.e., `Route::middleware('auth:sanctum')->group(...)` is one giant block containing nearly everything, with nested `role:` sub-groups inside it. Validation is via dedicated `FormRequest` classes in `app/Http/Requests/` for the more complex writes (Leave, WFH, Employee, Team, Login), inline `$request->validate([...])` for simpler ones.

**Files:** `backend/routes/api.php`, `backend/app/Http/Controllers/Api/*.php`, `backend/app/Http/Requests/*.php`.

**Tables:** N/A (structural).

**APIs:** all of them — see `PROJECT_DOCUMENTATION.md` §17 for the full route map.

- **Reusable by PM:** Yes, as a **pattern to follow**: `App\Http\Controllers\Api\ProjectController`, `TaskController`, etc., each with matching `Store*Request`/`Update*Request` classes, registered as their own clearly-delimited block in `api.php` (ideally grouped together and comment-headed, e.g. `// ── Project Management ──`) rather than interleaved into the existing blocks.
- **Must remain untouched:** No existing controller class should gain PM-related methods. No existing route group should have PM routes threaded into it — PM's routes must be a self-contained addition to `api.php`, appended, not interleaved.

---

## 10. Existing Frontend Route Structure

**Implementation:** Next.js 16 App Router. Two route groups: `(auth)` (login, forgot/reset password — no shared chrome) and `(dashboard)` (everything else, wrapped by `frontend/src/app/(dashboard)/layout.tsx` which renders the hamburger nav + breadcrumbs + auth guard). Every feature is a **flat top-level segment** under `(dashboard)/` — `leaves/`, `leaves/apply/`, `leaves/approvals/`, `attendance/`, `attendance/management/`, `attendance/details/[date]/`, `ta/apply|status|management/`, `teams/[id]/`, `employees/[id]/`, etc. No nested "module" folder groups it — the URL namespace *is* the module boundary (e.g. everything under `/leaves/*` is understood to be the Leave module).

**Files:** `frontend/src/app/(dashboard)/*/page.tsx` (37 page files currently), `frontend/src/app/(dashboard)/layout.tsx` (nav + breadcrumb generation, auto-derived from the URL path).

- **Reusable by PM:** The **pattern** (flat top-level segment, nested dynamic `[id]` routes, breadcrumbs auto-derived from path) should be followed exactly: a new top-level `frontend/src/app/(dashboard)/projects/` segment tree.
- **Must remain untouched:** No existing page directory should be touched. The only shared file PM must touch is `layout.tsx`, and only **additively** — new nav entries appended to the existing `NAV_SECTIONS` array (see §12), never reordering/renaming/removing existing entries.

---

## 11. Existing Database Migration Structure

**Implementation:** Standard Laravel timestamped migrations (`YYYY_MM_DD_HHMMSS_description.php`), 61 files currently, in `backend/database/migrations/`. Convention observed: initial `create_x_table` migrations followed by many small incremental `add_x_to_y_table` / `update_x_table` migrations as features evolved in place (e.g. `leave_requests` has been altered by at least 8 separate follow-up migrations). No down-migration discipline enforced strictly, but standard `Schema::table`/`Schema::create` Blueprint style throughout. Migrations run automatically on deploy via the Render Dockerfile (`php artisan migrate --force`) and are also idempotently re-runnable via the public `POST /admin/run-migrations` maintenance endpoint.

**Files:** `backend/database/migrations/*.php`.

- **Reusable by PM:** Yes — same timestamped convention, same `Schema::create`/`Schema::table` Blueprint style. PM should ship its schema as a **small number of fresh `create_*_table` migrations** (not `add_*_to_*` against existing tables), since it's a wholly new domain.
- **Must remain untouched:** No existing migration file should be edited (Laravel migrations are append-only in a shared history — editing an already-run migration is a production-breaking anti-pattern regardless of module boundaries). Any PM-required change to an *existing* table (e.g., adding `users.can_manage_projects` — should not be needed, see §2) must be its own new, explicitly-approved migration, per the brief's requirement.

---

## 12. Existing Dashboard / Navigation Architecture

**Implementation:** Two distinct things:
1. **Sidebar nav** — a hardcoded `NAV_SECTIONS` array of `{ label, icon, items: [{ href, label, roles? }] }` objects in `frontend/src/app/(dashboard)/layout.tsx`, rendered with role filtering (an item with no `roles` array shows to everyone; otherwise only to listed roles) plus a small `STANDALONE` array for single top-level links.
2. **Dashboard data payload** — one large role-adaptive `GET /dashboard` endpoint (`DashboardController@index`) assembling profile/leave/attendance/widgets/charts/admin-KPI blocks all in a single response, consumed by `frontend/src/app/(dashboard)/dashboard/page.tsx` and its widget components (`components/dashboard/*.tsx`).

**Files:** `frontend/src/app/(dashboard)/layout.tsx`, `backend/app/Http/Controllers/Api/DashboardController.php`, `frontend/src/app/(dashboard)/dashboard/page.tsx`, `frontend/src/components/dashboard/*.tsx`.

- **Reusable by PM:** The nav array accepts a new section (`"Project Management"`, its own icon, its own `items[]` with `roles` filters) as a pure append. The dashboard endpoint is a **much higher-risk touch point** — it's one large method already handling five+ domains inline; adding PM KPIs here would mean editing a function that leave/attendance/recognition all depend on.
- **Must remain untouched:** `DashboardController@index`'s existing response shape and computation blocks. **Recommendation:** if PM needs dashboard visibility, expose it as small, additive keys only (e.g. an isolated `project_summary` block guarded in its own try/catch, exactly like the existing Super-Admin-only blocks already are), or better, keep PM's own summary entirely on its own `GET /project-management/dashboard`-style endpoint and let the frontend fetch it separately — avoids any risk to the existing endpoint's stability.

---

## 13. Existing AI Assistant Architecture

**Implementation:** `ChatController` — every chat turn rebuilds a **fresh system prompt from live DB reads** (caller's leave balance, who's on leave today, teams+leads, next 5 holidays), then proxies to **Google Gemini** (`gemini-2.0-flash` via `GEMINI_API_KEY`) with graceful fallback to a **local Ollama** instance. Explicitly constrained to **read-only** behavior via prompt instructions (refuses to "perform" actions, redirects the user to the relevant page instead). No tool-calling/function-calling — it's a plain context-stuffed chat completion, not an agent with real DB-write ability.

**Files:** `backend/app/Http/Controllers/Api/ChatController.php`, `frontend/src/components/ChatWidget.tsx`, `frontend/src/components/ChatbaseLottieButton.tsx`.

**Tables:** none of its own — reads from `LeaveBalance`, `LeaveRequest`, `Team`, `Holiday`.

**APIs:** `GET /chat/context`, `POST /chat`.

- **Reusable by PM:** Yes, as a **pattern** — if PM wants "ask about my tasks" chat support later, add PM facts (assigned tasks, project deadlines) into the *same* system-prompt-building logic as new context blocks, following the identical read-only constraint. Do not give the assistant write access to PM data any more than it has to HR data today.
- **Must remain untouched:** The core proxy/fallback mechanism and the "read-only, redirect to UI for actions" instruction must not be weakened. If PM context is added to the prompt, it must not risk exceeding reasonable prompt size or leaking cross-project data the caller isn't authorized to see (the existing context blocks are all either globally-visible facts or the caller's own data — PM must preserve that scoping discipline).

---

## 14. Existing Scheduler / Cron Infrastructure

**Implementation:** Laravel's `Schedule::command(...)` facade in `backend/routes/console.php`, four jobs currently: `leave:annual-allocation` (yearly Jan 1), `leave:monthly-accrual` (daily 00:10 — note: **not yet documented in `CLAUDE.md`**, a newer addition), `leave:year-end-expiration` (yearly Dec 31), `biometric:process` (every 5 min, `withoutOverlapping()`). Since typical hosts (Render) don't run a real cron daemon for the scheduler loop, there's a manually-securable trigger: `POST /system/scheduler/run`, guarded by a bearer secret from `config('services.scheduler_secret')`, throttled 5/min, calling `Artisan::call('schedule:run')` — presumably pinged by an external cron service (e.g. cron-job.org, GitHub Actions schedule) hitting the production URL.

**Files:** `backend/routes/console.php`, `backend/app/Console/Commands/*.php`, `backend/routes/api.php` (scheduler-run endpoint).

- **Reusable by PM:** Yes — if PM needs e.g. "notify on task overdue" or "auto-close stale projects," add a new `Schedule::command('project:...')` line the same way; it rides the same external-trigger mechanism for free.
- **Must remain untouched:** The four existing scheduled commands and the scheduler-trigger endpoint's secret-check logic.

---

## 15. Existing Reusable UI Components

**Implementation:** Two component tiers:
1. **Base primitives** (`components/ui/*.tsx`) — Shadcn/UI-style: `button`, `card`, `dialog`, `dropdown-menu`, `input`, `select`, `table`, `tabs`, `textarea`, `toast`, `form`, `label`, `badge`, `avatar`, plus a couple of house-built ones (`RoyalAvatar.tsx`, `PageLoader.tsx`, `WishButton.tsx`, `input-group.tsx`, `command.tsx`).
2. **Feature components** (`components/{attendance,dashboard,employees,layout,recognition,ta,teams}/*.tsx`) — each folder scoped to one existing module (e.g. `components/ta/TAApplyModal.tsx`).

Shared layout-level pieces PM will definitely touch: `components/layout/NotificationDropdown.tsx` (generic, PM notifications appear here automatically per §5), `components/layout/FavoriteButton.tsx`/`FavoritesNav.tsx` (generic favorites, PM pages can opt in for free), `components/CommandPalette.tsx` (global cmd-K — likely wants PM pages indexed).

**Files:** as listed above.

- **Reusable by PM:** All of tier 1 (`ui/*`) directly, no changes needed. Tier 2 layout components (Notifications, Favorites, CommandPalette) are reusable **read-only** — PM plugs into their existing generic APIs/props, doesn't edit their internals.
- **Must remain untouched:** Every existing feature-scoped component folder (`attendance/`, `dashboard/`, `employees/`, `recognition/`, `ta/`, `teams/`) — PM gets its **own** `components/projects/` folder, mirroring the existing per-module convention, rather than adding PM-specific props/branches into an existing feature component.

---

## 16. Existing Validation / Security Middleware

**Implementation:**
- `CorsMiddleware` — appended globally to every request (`bootstrap/app.php`).
- `VerifyBiometricAgent` — Bearer-secret check for the single biometric-ingest route, `hash_equals()` comparison, supports both bcrypt-hash and plaintext-dev-secret modes.
- Spatie `role`/`permission`/`role_or_permission` middleware aliases (§2).
- The public "scheduler run" and "biometric ingest" routes are the only two non-Sanctum-guarded authenticated surfaces, each with their own bespoke secret-bearer check — **note this is a distinct pattern from Sanctum**, used only for machine-to-machine (non-human) callers.
- Request-level validation is FormRequest-class-based (§9) with `authorize()` mostly hardcoded `return true` (i.e., authorization is enforced at the route-middleware layer, not inside the FormRequest) — an important convention: **PM's FormRequests should follow the same split** (route `role:`/`permission:` middleware decides *who*, FormRequest `rules()` decides *what shape*).

**Files:** `backend/app/Http/Middleware/{CorsMiddleware,VerifyBiometricAgent}.php`, `backend/bootstrap/app.php`, `backend/app/Http/Requests/*.php`.

- **Reusable by PM:** Yes, entirely — no new middleware class is needed for standard PM CRUD. Only if PM needs its own machine-integration endpoint (e.g., a webhook from an external PM tool) would a `VerifyBiometricAgent`-style bespoke secret-check middleware be an appropriate pattern to copy.
- **Must remain untouched:** `CorsMiddleware` and `VerifyBiometricAgent` as-is; the biometric secret must never be reused for a different integration.

---

## 17. Existing Reporting / Export Utilities

**Implementation:** Backend `ReportController` exposes **JSON aggregation endpoints only** (`/reports/employees`, `/leaves`, `/leave-balances`, `/attendance-summary`, `/employee-list`) — there is **no server-side CSV/PDF/Excel generation** (no `maatwebsite/excel`, `dompdf`, or similar in `composer.json`). Export-to-file is done **client-side**: the frontend has `jspdf` (`^4.2.1`) in `package.json` and presumably builds PDFs in-browser from the JSON the report endpoints return (e.g. from `components/employees/MonthlyReportModal.tsx` or the `reports/page.tsx`). No CSV export library is present either — any CSV export, if it exists, is likely a hand-rolled client-side blob/string builder.

**Files:** `backend/app/Http/Controllers/Api/ReportController.php`, `frontend/src/app/(dashboard)/reports/page.tsx`, `frontend/src/components/employees/MonthlyReportModal.tsx`, `frontend/package.json` (`jspdf`).

- **Reusable by PM:** Yes — same pattern: PM adds its own JSON aggregation endpoint(s) (e.g. `GET /project-management/reports/...`) and reuses the existing client-side `jspdf` dependency for any PM PDF export, rather than introducing a new export library.
- **Must remain untouched:** `ReportController`'s five existing methods and their query shapes.

---

# Summary

## A. Existing Architecture Summary

A Laravel 12 + Sanctum-token API backend (flat controller namespace, FormRequest validation, Spatie roles/permissions, one Postgres/Supabase database) paired with a Next.js 16 App-Router frontend (flat per-module route segments under a single `(dashboard)` layout, Shadcn/UI primitives, Zustand + localStorage auth, axios with a GET-response cache). The system is **feature-additive by convention already** — 18 months of incremental migrations and controllers show the existing pattern *is* "add a new table + new controller + new route block + new page folder + new nav entry," which is exactly the shape Project Management should take. Cross-cutting infrastructure (auth, roles, notifications, email, file storage, scheduler, dashboard, AI assistant) is generic enough to extend without modification in every case except the single `GET /dashboard` endpoint, which is a monolithic per-role aggregator best treated as **read-only** from PM's perspective (see §12).

## B. Safe Reusable Infrastructure (use as-is, no modification)

- Sanctum auth (`auth:sanctum` middleware) — §1
- Spatie roles/permissions middleware + `HasRoles` on `User` — §2
- `users` table as the assignee/reporter/member foreign-key target — §3
- `teams` table as an optional project→department link — §4
- Notification system (`Notifiable`, `notifications` table, `NotificationDropdown`) — §5
- `EmailService` **pattern** (new methods, not edits) + existing `Mailable` convention — §6
- Public-disk file storage **pattern** (new folder, new child-attachment table à la `issue_attachments`) — §7
- Migration convention (new `create_*_table` files) — §11
- Nav `NAV_SECTIONS` array (additive new section) — §12
- `CorsMiddleware`, FormRequest validation convention — §16
- `jspdf` client-side export — §17
- Scheduler (`Schedule::command`, existing external-trigger endpoint) — §14
- Shadcn/UI primitives (`components/ui/*`) — §15
- Generic layout widgets: NotificationDropdown, FavoriteButton/FavoritesNav, CommandPalette — §15

## C. Existing Modules That Must Not Be Touched

Dashboard (`DashboardController@index` internals), Leave & WFH (calculation engine, approval chain, LOP/sandwich logic), Attendance (biometric timeline/processor services), Travel Allowance workflow, Recognition/leaderboard logic, all 7 existing Notification classes, `EmailService`'s existing methods, `AuditLogController`/`LeaveAuditLog`/`LeaveBalanceAuditLog`, every existing frontend page/component folder, `AuthController`, role/permission definitions for the 4 existing roles, all 61 existing migrations, `ReportController`'s 5 existing methods, biometric ingestion pipeline.

## D. Recommended Project Management Module Boundary

Treat PM as a **vertical slice** that touches the shared codebase in exactly four additive places and owns everything else outright:
1. **New backend controllers** under the existing flat `App\Http\Controllers\Api` namespace (e.g. `ProjectController`, `TaskController`, `ProjectMemberController`), each with matching new `Store*/Update*Request` classes.
2. **New route block** appended to the end of `routes/api.php`, clearly comment-delimited, under its own `role:`/`permission:` groups.
3. **New migrations only** (`create_projects_table`, `create_project_members_table`, `create_tasks_table`, `create_task_comments_table`, `create_task_attachments_table`, etc.) — no `add_x_to_users` unless a later, explicitly-approved shared-integration need arises (none identified in this audit).
4. **New frontend route tree** `(dashboard)/projects/*` + **new component folder** `components/projects/*`, with exactly one additive edit to `layout.tsx` (append a nav section) and zero edits to any other existing page/component.

Everything else — new `Project`, `Task`, `ProjectMember`, `TaskComment`, `TaskAttachment`, (optionally) `TaskActivityLog` Eloquent models, new Notification classes, new Mailable classes, new `EmailService` methods — is wholly new code with no shared ownership.

## E. Potential Collision Risks

| Risk | Where | Mitigation |
|---|---|---|
| Dashboard payload bloat/breakage | `DashboardController@index` is already a very large method touching 6+ domains; adding PM inline risks a regression in an unrelated widget | Keep PM dashboard data on its **own endpoint**; if inline is truly required later, add as one small try/catch-wrapped block only, matching the existing defensive pattern |
| Nav array merge conflicts | `layout.tsx`'s `NAV_SECTIONS`/`STANDALONE` arrays are hand-maintained single arrays | Append a new section object at the end; don't interleave |
| Route file sprawl | `api.php` is already 433 lines with routes grouped by auth/role rather than feature | Append PM's block at the very end with a clear comment header, so future audits can find the boundary instantly |
| Notification/Email volume | New PM notification types add to the same `notifications` table/dropdown — fine functionally, but could add UI noise | Design PM notification types distinctly and let users filter, don't merge into existing notification "buckets" |
| Ambiguous audit-log reuse | The generic `AuditLog` model is technically reusable but its current real-world usage is unclear/thin | Default to a **dedicated** PM activity-log table rather than writing into the ambiguous shared one |
| `users`/`teams` schema changes | Any temptation to add `users.default_project_id` or similar | Avoid; model the relationship from the PM side (`project_members.user_id`) instead, keeping `users`/`teams` migration-untouched |
| Role explosion | Temptation to add a `Project Manager` role | Prefer new **permissions** attached to existing roles (§2) unless the business genuinely needs a role that exists *only* for PM and nothing else — flag this as a decision for the user, not an assumption |
| File-storage inconsistency | Two existing attachment patterns already coexist (§7) | Pick one deliberately for PM (recommend the Issues child-table pattern) rather than introducing a third variant |

## F. Recommended Database Naming Convention

Prefix every new table with `project_` to keep PM instantly greppable and collision-free against the existing 60+ tables, following the existing pluralized-snake-case Laravel convention:

`project_projects` *(or simply `projects` — no existing table collides with that name; `project_` prefix is only strictly necessary for child/junction tables)*, `project_members`, `project_tasks`, `project_task_comments`, `project_task_attachments`, `project_task_status_history` / `project_activity_logs` (if a dedicated activity trail is built per §8/§C), `project_milestones` (if needed). Foreign keys follow existing convention: `user_id`, `team_id`, `created_by`, `updated_by`, `deleted_at` (soft-deletes, matching `ta_requests`'/`teams`' pattern) where lifecycle tracking matters.

## G. Recommended Frontend Route Namespace

`frontend/src/app/(dashboard)/projects/` as the top-level segment (matching the existing flat-module convention — `leaves/`, `attendance/`, `ta/`), with nested segments mirroring existing depth patterns: `projects/page.tsx` (list), `projects/[id]/page.tsx` (detail — matching `teams/[id]`, `employees/[id]`), `projects/[id]/tasks/[taskId]/page.tsx` if task detail warrants its own route (matching the `attendance/details/[date]` depth precedent), `projects/create/page.tsx` (matching `employees/create`, `teams/create`).

## H. Recommended API Namespace

Keep the existing flat `/api/*` convention (no versioned or nested `/api/pm/*` prefix exists anywhere else in the app, so introducing one would be inconsistent) but prefix every PM resource path with `project-` to mirror the existing `ta-requests`/`document-requests`/`leave-requests` kebab-case-resource style: `/api/projects`, `/api/projects/{id}/members`, `/api/project-tasks`, `/api/project-tasks/{id}/comments`, `/api/project-tasks/{id}/attachments`. Controller namespace stays `App\Http\Controllers\Api` (flat, matching §9) — do **not** introduce a `Api\ProjectManagement\*` sub-namespace, since no other module uses sub-namespacing and doing so only for PM would be an inconsistent precedent.

## I. Recommended Permission Namespace

New Spatie permissions, dot-namespaced by resource + action (no existing permission-naming convention was found in seeders to conflict with — this audit did not find seeded permissions beyond roles themselves, so PM is free to establish the pattern going forward): `project.view`, `project.create`, `project.update`, `project.delete`, `project.manage-members`, `task.view`, `task.create`, `task.update`, `task.assign`, `task.delete`, `task.comment`. Assign these to existing roles rather than inventing new roles (e.g. grant the full set to `Super Admin`, a project-lead subset to `Team Lead`, and `task.view`/`task.update`/`task.comment` to `Employee`) unless the user explicitly wants a dedicated `Project Manager` role — that's a product decision this audit surfaces but does not make.

---

**STOP — audit only, per instructions. No Project Management implementation code has been written.**
