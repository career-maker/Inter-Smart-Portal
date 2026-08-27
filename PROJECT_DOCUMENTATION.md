# Inter Smart Employee Portal — Complete Functional Documentation

> Companion to `CLAUDE.md` (infra/stack memory). This file documents **every module, workflow, business rule, and API surface** as implemented in the codebase, for onboarding, QA, and future development reference.

**Last generated:** 2026-08-25 · **Company:** Intersmart · **Stack:** Laravel 12 (PHP 8.2, PostgreSQL/Supabase) + Next.js 16 (App Router, TypeScript)

---

## 1. What This System Is

A full internal HR/Employee Management portal with three roles — **Super Admin**, **Team Lead**, **Employee** (an **HR** role also exists in backend middleware and frontend nav, sitting between TL and Super Admin for approvals/config) — covering leave & WFH management, biometric-integrated attendance, travel allowance claims, employee recognition, an AI assistant, a helpdesk, and standard HR admin (teams, documents, policies, announcements, holidays, audit logs).

---

## 2. Roles & Access Model

Roles are managed via **Spatie Laravel Permission**. Routes are gated with `role:` middleware; the frontend sidebar (`frontend/src/app/(dashboard)/layout.tsx`) additionally filters nav items per role so users never see links they can't use.

| Role | Summary |
|---|---|
| **Super Admin** | Full system access: employees, teams, all approvals, settings, audit logs, reports, leave balance overrides, recognition management, TA approval, document fulfillment, holiday/announcement management. Cannot apply for their own leave (no "Apply Leave" nav item), but a Super-Admin-created leave/WFH for someone else is auto-approved. |
| **HR** | Shares most Super-Admin-only middleware groups (`role:Super Admin|Team Lead|HR` and `role:Super Admin|HR`) — can manage employees/teams, approve leave/WFH (admin step), manage holidays & announcements, and view Leave Approvals from their own nav entry. Does not get Settings/Audit Logs/Leave Balances (Super-Admin-exclusive). |
| **Team Lead** | Manages their own team (`team_id` on `users`, `team_lead_id` on `teams`). First-line approver for their team's leave/WFH requests. Can apply for their own leave/WFH (goes straight to Admin — a TL cannot self-approve, and TL requests always require Super Admin, never another TL). |
| **Employee** | Own profile, own leave/WFH/attendance/TA/issues. Leave & WFH requests need TL approval, then Admin approval (unless single-day, see §5). |

### Navigation Map (role-filtered)

- **Dashboard** — all roles
- **Leave & WFH**
  - All Leaves (Super Admin) / My Leaves (Employee, TL, HR) / Apply Leave (Employee, TL only)
  - WFH Requests, Leave Calendar — all roles
  - Holidays (Super Admin, HR)
  - Leave Approvals (Super Admin, Team Lead, and separately HR / Employee-as-"My Requests")
  - Leave Balances (Super Admin only)
  - Manage Approved Leaves/WFH (Super Admin only)
- **Travel Allowance** (Employee, TL, Super Admin)
  - Apply for TA (Employee, TL) / TA Status (Employee, TL) / Manage TA Requests (Super Admin)
- **HR Services** — Updates & Announcements, Request Documents, HR Policies (all roles)
- **My Account** — Notifications, Raise an Issue (all roles)
- **People & Teams**
  - Employees, Departments (Super Admin, HR)
  - Attendance Management (Super Admin)
  - The Hall, Birthday Wishes, Recognition Leaderboard (all roles)
  - Manage Awards (Super Admin)
  - Team Tracker external link (Team Lead only, → qa-tracker-pro.vercel.app)
- **Administration** (Super Admin only) — Profile Approvals, Reports, Audit Logs, Settings

---

## 3. Authentication

- **Login** — `POST /api/login` via Laravel Sanctum, returns bearer token. Frontend Zustand store (`@/store/auth`) persists session; auto-refresh loop disabled on the login screen itself (fixed regression, see git history).
- **Forgot/Reset password** — `POST /api/forgot-password`, `POST /api/reset-password`, public routes, standard Laravel token flow.
- **Logout** — `POST /api/logout` (authenticated).
- All other routes require `auth:sanctum` bearer token; role-specific groups add `role:` middleware.

---

## 4. Employee & Team Management

### Employees (`EmployeeController`, role: Super Admin/Team Lead/HR for list/detail; mutations effectively Super Admin/HR in UI)
- Full CRUD via `apiResource('employees', ...)`.
- **Photo upload** — `POST /employees/{id}/photo` (multipart) or `/photo-url` (external URL), stored `storage/app/public/profile-photos/`, served via `/storage/...` (symlinked) and a `photos/{path}` fallback route.
- **Password reset by admin** — `POST /employees/{id}/password`.
- **Status change** — `POST /employees/{id}/status` (Active/Disabled/Resigned/Terminated).
- **CSV import** — `GET /employees/import/sample` (download template), `POST /employees/import/csv` (bulk create).
- **Public profile** — `GET /employees/{id}/public`, viewable by any authenticated user (used by Hall/Leaderboard/recognition cards).
- Employees have a **probation period**: `probationEndDate()` = explicit `probation_end_date` column, else `joining_date + 6 months`. `isInProbation()` is true while that date is in the future. **All leave taken during probation is automatically Loss-of-Pay (LOP)** — see §5.

### Teams / Departments (`TeamController`)
- Full CRUD via `apiResource('teams', ...)`.
- **Auto-generated `code`**: first 4 letters of the team name (stripped of non-letters, uppercased) + `-` + random 4-digit number, re-rolled until unique (e.g., "Quality Assurance" → `QUAL-3847`).
- `team_lead_id` designates the TL; `POST /teams/{team}/members` syncs member assignment.
- Frontend fetches teams live from `GET /api/teams` — no hardcoded department list anywhere.

---

## 5. Leave Management (the most complex module)

Controller: `LeaveRequestController`. Backed by `leave_requests`, `leave_balances`, `leave_balance_audit_logs`, `leave_audit_logs` (override trail), `holidays`, `working_days_overrides`.

### 5.1 Leave Types
`GET /leave-types` (read, all users) / admin CRUD via `apiResource('leave-types', ...)->except(index, show)`. Seeded types: Sick Leave, Casual Leave, Half Day Sick (AM/PM), Half Day Casual (AM/PM), Work From Home + halves.

### 5.2 Balances
- **Casual Leave (CL):** 12/year, allocated Jan 1. Unused balance **carries forward exactly one year** (`cl_carry_forward`, `cl_carry_forward_year`); if not used by Dec 31 of the carry-forward year it expires. Carry-forward is **consumed before** current-year balance on every deduction.
- **Sick Leave (SL):** 12/year, allocated Jan 1, **no carry forward** — resets/expires every Dec 31.
- Annual allocation cron: `php artisan leave:annual-allocation` (scheduled Jan 1 midnight in `routes/console.php`; manually triggerable via `POST /admin/run-annual-allocation`, Super Admin only, accepts a `year` override).
- `GET /leave-balances` — own balance for Employee/TL, all-employee list for Super Admin.
- `POST /leave-balances/{userId}` — Super Admin manual adjustment, writes a `leave_balance_audit_logs` row (previous/new balance, remarks, `modified_by`).
- `GET /leave-balance-audit-logs` — Super Admin full history.

### 5.3 Applying for Leave — `calculateLeaveImpact()` engine
Both the **live preview** (`POST /leaves/calculate`) and the actual **submit** (`POST /leave-requests`) run the same day-by-day impact calculator. It determines, for a given user/type/date-range/duration (`Full`, `Half-Morning`, `Half-Afternoon`):

1. **Probation check** — if the applicant is in probation, the *entire* requested range is Unpaid (LOP), no further rules apply, and the response includes the probation-end date in the explanation.
2. **Working-day resolution** — pulls all `holidays` (already includes weekends/company/public/festival holidays as rows) and `working_days_overrides` (days forced "working" despite falling on a weekend/holiday, e.g. a compensatory work Saturday) to classify each calendar day as working/non-working.
3. **3-calendar-day advance-notice rule (Casual Leave only)** — a working day is only "eligible" for paid CL if it falls on/after `today + 3 days`; anything requested with less notice becomes **penalty LOP**. Sick Leave is exempt from this rule.
4. **Sandwich Leave Policy** — non-working days (weekends/holidays) that fall **strictly between** two working leave days in the same request are converted to LOP ("sandwich days"), and the working days immediately adjacent to such a non-working block are *also* forced to LOP ("sandwich working days"). Non-working days at the very start/end of the range (nothing on one side) are **not** sandwiched. There is also **sandwich contamination**: if a penalized (late-notice) day is immediately followed by a sandwich block, the day after the block is dragged into LOP too, to prevent gaming the notice rule around a weekend.
5. **Cross-request sandwich detection** (`checkForSandwichLopConversion`, runs after save, outside the DB transaction) — scans for an *already-approved, already-paid* adjacent leave request (before or after the new one, across a weekend/holiday gap of up to 15 days) and flags it `pending_lop_conversion = true` with a `lop_conversion_source_id` pointer. This surfaces as an actionable item for Super Admin/HR to **confirm** (`POST /leave-requests/{id}/confirm-lop` — refunds the balance and forces the flagged request to LOP) or **decline** (`POST /leave-requests/{id}/reject-lop` — leaves it Paid). This is why `LeaveRequestController@index`'s "Pending" filter for admins also includes `pending_lop_conversion = true` rows even if otherwise already approved.
6. **Balance sufficiency** — of the remaining "eligible" days, pays out of CL (carry-forward first) or SL balance up to what's available; any shortfall becomes **balance LOP**.
7. **Half-day multiplier** — `Half-Morning`/`Half-Afternoon` (or any leave type with "half" in its name) applies a ×0.5 multiplier throughout.

Output includes: `requested_working_days`, `sandwich_leave_days`, `actual_leave_days` (what actually gets recorded), `penalty_lop_days`, `paid_casual_leave`, `paid_sick_leave`, `balance_lop_days`, `total_lop_days`, `is_unpaid`, `is_partial`, human-readable `reasons[]`/`unpaid_reason`, and a `balance` preview (before/after).

**Overlap guard**: both `calculate` and `store` reject if the user already has a Pending/Approved leave overlapping the requested dates.

### 5.4 Approval Workflow
- On submit, `tl_status`/`admin_status`/`status` are set based on the applicant's role:
  - **Employee**: `tl_status = Pending`, `admin_status = Pending` unless the request is a single day (then Admin becomes `Not Required` initially and TL approval alone can close it — see below) — multi-day or any LOP-containing request always needs Admin too.
  - **Team Lead applicant**: `tl_status = Not Required` (a TL cannot approve their own leave), goes straight to `admin_status = Pending`.
  - **Super Admin / HR applicant**: same — straight to Admin (effectively self-service since they *are* Admin).
- **Single-day requests**: either the TL *or* the Admin approving alone is sufficient to fully approve — whichever acts first closes out the other side as `Not Required`.
- **Multi-day requests**: need **both** TL approval and Admin approval before `status` flips to `Approved`.
- **Rejection**: either approver rejecting immediately sets `status = Rejected` (with `rejection_reason`); no balance is touched because balance is never deducted until full approval.
- **Balance deduction happens only at full approval** (not at submission) — CL draws from carry-forward first, then current-year balance; SL draws straight from `sick_leave_balance`; `total_leaves_taken` is incremented.
- In-app notifications (`LeaveRequestNotification`) go to: all Super Admins + the applicant's TL on submit; the applicant on approve/reject. Email notifications are sent via `EmailService::sendLeaveRequestEmail` (isolated — failures never block the leave transaction). Two **signed, no-auth email action links** exist (`GET /leave-requests/{id}/email-approve` / `email-reject`) for one-click approval from an email client.

### 5.5 Super Admin Overrides & Admin-Initiated Leave
- **`PUT /leave-requests/{id}/override`** (Super Admin only) — manually rewrites an existing request's dates and the exact paid-CL/paid-SL/LOP split, refunding the old deduction and applying the new one, with a full `leave_audit_logs` entry (previous vs. new value + remarks). Forces the request to `Approved`.
- **`POST /admin/leaves` → `storeForEmployee`** (Super Admin only) — creates a leave record on behalf of any employee, **always as unpaid LOP**, auto-approved, tagged `[Admin-initiated LOP]` in the reason, with its own `LeaveBalance::createAuditLog` entry. Used for after-the-fact/forgot-to-apply corrections.
- **`GET/DELETE /admin/approved-leaves`** — Super Admin can list and hard-delete already-approved leave records (`ApprovedLeaveManagementController`), e.g. to fix a mistaken entry.

### 5.6 Listing & Filtering
`GET /leave-requests` scopes by role (Employee: own; TL: own team; Super Admin/HR: everyone, with the pending-LOP-conversion inclusion noted above) and supports `status`, `from_date`/`to_date`, and `type` (`casual`/`sick`/`lop`) filters, plus a `filtered_totals` summary block (sums of approved days per bucket) alongside the paginated list.

---

## 6. Work From Home (WFH)

Controller: `WfhRequestController`. Structurally mirrors Leave but simpler — no paid-balance/LOP math, just a dual-approval chain.

- **Apply** (`POST /wfh-requests`) — `duration_type` (`Full`, `Half-Morning`, `Half-Afternoon`); half-day sets `end_date = start_date`.
  - Super Admin/HR applicant → auto-approved instantly.
  - Team Lead applicant → skips TL step (can't self-approve), straight to Admin `Pending`.
  - Employee → both TL and Admin required.
- **Approve/Reject** (`POST /wfh-requests/{id}/status`) — same dual-gate logic as leave: rejection by either party is immediate; approval needs both (unless one side was `Not Required`). Employee is only notified once *fully* resolved (not on the intermediate TL-approved-awaiting-admin state).
- **Admin-initiated WFH** (`POST /admin/wfh` → `storeForEmployee`, Super Admin only) — creates + optionally auto-approves a WFH entry for any employee, with overlap checking against existing Pending/Approved WFH.
- **Manage Approved WFH** — `GET/DELETE /admin/approved-wfh` (Super Admin), same pattern as approved-leave management.
- A `diagnose/schema` debug endpoint (`GET /wfh-requests/diagnose/schema`) reports column presence for `wfh_requests` — used for production schema-drift troubleshooting.

---

## 7. Attendance

Controller: `AttendanceController`, backed by `attendance` + `attendance_breaks` tables, plus raw `biometric_events` and the `BiometricTimelineService`.

### 7.1 Manual Punch
- `POST /attendance/check-in` — one per day, rejects if already checked in.
- `POST /attendance/check-out` — requires no open break; computes `total_working_minutes = elapsed − break minutes`.
- `POST /attendance/break-start` / `break-end` — one open break at a time; accumulates `total_break_minutes`.
- `GET /attendance/status` — today's status widget (`Not Checked In` / `Checked In` / `On Break` / `Checked Out`) for the logged-in user.

### 7.2 Biometric Integration
- Device agent pushes punches to `POST /v1/biometric/ingest`, guarded by `VerifyBiometricAgent` middleware (Bearer secret — plaintext dev secret or bcrypt hash in production, compared with `hash_equals`).
- Raw events land in `biometric_events` (`employee_code`-mapped to `user_id`, `direction` in/out, `local_punch_time`). Insertion previously used raw SQL (bypassing Eloquent observers) — a `processInsertedEventsManually()` step now mimics the observer to keep attendance in sync immediately (see `[[biometric-events-capture-fix]]`).
- **`BiometricTimelineService`** builds a canonical in/out/break timeline per day per user from the raw punch sequence (`buildTimeline`) and derives working minutes, completed breaks, open-break state, and a `requires_review` flag for anomalies like a missing punch-out (`interpretTimeline`). It also detects an **open shift carried over from the previous day** (checked in, never checked out) to avoid double counting.
- `AttendanceController@status` and `@details` both rebuild the timeline **on the fly** from raw events for instant UI accuracy, while a **scheduler job every 5 minutes** (`biometric:process` Artisan command → `BiometricProcessorService`) does the authoritative, persisted reconciliation into the `attendance`/`attendance_breaks` tables.
- `GET /attendance/details?date=YYYY-MM-DD&user_id=` — full drill-down: raw punches, working sessions, completed/open breaks, status label (`Checked In`/`Missing Punch Out / Requires Review`/`Complete`/`Open Shift`/`No Activity`), all times shown in `Asia/Kolkata`. Authorization: Employees see only themselves; Team Leads only their own team's members; HR/Super Admin see anyone.
- `GET /attendance` (`index`) — paginated history list, role-scoped exactly like the details endpoint (Employee: self; TL: self + team; HR/Admin: everyone); supports a `month` filter that switches to an unpaginated full-month result set (used by calendar-style monthly views).
- `Attendance Management` nav page (Super Admin only) — administrative view/correction surface; `POST /admin/fix-attendance-timezone` (Super Admin) repairs timezone-corrupted historical rows via the `attendance:fix-timezone-corruption` Artisan command.
- System scheduler can also be invoked remotely: `POST /system/scheduler/run` with a bearer secret from `config('services.scheduler_secret')`, rate-limited to 5/min — lets an external cron ping (e.g., Render doesn't run cron natively) trigger `schedule:run`.

---

## 8. Travel Allowance (TA)

Controller: `TARequestController`. Tables: `ta_requests`, `ta_request_items`.

- **Apply** (`POST /ta-requests`, Employee/TL) — reason, `date_travelled`, itemized expense breakdown (category: Travel/Food/Accommodation/Other, amount, description) stored as `ta_request_items`, optional bill/receipt upload → `bill_link`. `total_amount` is the sum of items. Initial `status = Applied`.
- **Notification on apply** — emails `HR@intersmart.in` and `Ameesha@intersmart.in` with employee details, expense breakdown, and two signed **one-click action buttons**:
  - `GET /ta-requests/{id}/email-approve` / `email-reject` — no-auth signed URLs that redirect to `/ta/management?action=approve&id=...` (or reject). Frontend checks the visitor is a logged-in Super Admin; if so, auto-expands that request and prompts to confirm (with optional notes) rather than approving blind from the link itself.
- **Own status view** — `GET /ta-requests` (own requests), `GET /ta-requests/{id}` (own detail).
- **Admin management** (`GET /admin/ta-requests`, Super Admin) — all requests with status filtering.
- **Approve / Reject / Mark Paid** (Super Admin only) — `POST /ta-requests/{id}/approve|reject|mark-paid`. Status lifecycle: `Applied → Approved/Rejected`, then `Approved → Paid/Unpaid` via mark-paid (toggles `is_paid`, stamps `paid_at`).
- A `diagnose/schema` debug endpoint reports whether `ta_requests`/`ta_request_items` tables and columns exist (Super Admin) — same production-schema-drift safety net pattern as WFH.

---

## 9. Documents, Policies, Announcements, Holidays, Calendar

- **Document Requests** (`DocumentRequestController`) — any employee can `POST /document-requests` (e.g., request an experience letter, salary slip); `GET /document-requests` lists own (or all, per controller scoping); HR/Admin fulfills via `POST /document-requests/{id}/upload` attaching the completed file.
- **HR Policies** (`HrPolicyController`) — `GET /hr-policies` open to all; `POST`/`DELETE` restricted to Super Admin/HR. Employee-facing "HR Policies" nav page is read-only.
- **Announcements** (`AnnouncementController` + `AnnouncementCategoryController`) — `GET` open to all; create/update/delete restricted to Super Admin/HR. Supports `scheduled_at` (don't show until a future time) and `expires_at` (auto-hide after), plus `is_pinned` (surfaces at top of dashboard's "Company Updates" widget). Categorized via a separate categories endpoint.
- **Holidays** (`HolidayController`) — `GET /holidays` open to all; mutating routes (`POST`/`PUT`/`DELETE`) restricted to Super Admin/HR. Holiday rows double as the "non-working day" source for the leave-impact calculator (§5.3) — a holiday isn't just a calendar marker, it directly changes payroll math.
- **Working Days Overrides** (`WorkingDaysOverride` model) — the inverse: explicit dates that should count as *working* even though they'd otherwise be a weekend/holiday (e.g., a compensatory Saturday), consumed by the same leave-impact engine.
- **Calendar** (`CalendarController`) — `GET /calendar`, aggregated view (holidays + approved leave/WFH) for the Leave Calendar page, open to all authenticated users.

---

## 10. Recognition, The Hall, Leaderboard, Birthday Wishes

Controller: `RecognitionController`. Table: `recognitions` (title, description, icon/emoji, `start_date`/`end_date` window, `is_custom`, `is_active`, `created_by`).

- **Award management** (Super Admin only, `/recognitions` CRUD + `PUT /{id}/toggle` to activate/deactivate) — awards are date-windowed, not permanent badges; a recognition is only "active" while today falls inside its `start_date`–`end_date` range **and** `is_active` is true.
- **Active recognitions** — `GET /active-recognitions`, drives the dashboard's animated trophy-near-name treatment and the golden avatar ring for whoever currently holds an active award (see recent commits: "show active recognition animating trophy near name... royal gold avatar ring").
- **My recognitions** — `GET /me/recognitions` (own history).
- **Leaderboard** — `GET /recognitions/leaderboard?period=overall|week`. Ranks every active employee by total lifetime recognitions received (ties broken by earliest joining date, then name), returns each person's latest/active achievement, plus summary stats: total issued, count of currently-active holders, top performer, and the single most-frequently-awarded title.
- **Top Awardee** — `GET /recognitions/top-awardee` — whoever has received the most awards lifetime; drives the "Growing Together" gold loyalty header / top-awardee sync between dashboard and leaderboard.
- **Employee-specific history** — `GET /recognitions/employee/{userId}` (public, any authenticated user, used from employee profile cards).
- **The Hall** (`HallController`, `GET /hall`) — a public "wall of fame" listing across the company, viewable by everyone.
- **Birthday Wishes** (`BirthdayWishController`) — `POST /birthday-wishes` to leave a wish on a colleague's birthday; `GET /birthday-wishes/my-wishes`, `GET /users/{id}/wishes`, `GET /today-wishes`; `GET /today-birthdays` (`ReportController@todaysBirthdays`) surfaces who's celebrating today for the wishing UI. Dashboard also independently computes upcoming birthdays/anniversaries (next 14 days for the widget, configurable "upcoming window" in days via a `SystemSetting` for the dedicated widget list) — cached daily via `Cache::remember` keyed by date.

---

## 11. Issues / Helpdesk

Controller: `IssueController`. Tables: `issues`, `issue_comments`, `issue_attachments`.

- **Raise an issue** (`POST /issues`) — title, category, priority (`Low/Medium/High/Critical`), description, optional `related_module`, optional file attachments (stored `issue-attachments` disk) and/or an external `attachment_link`. Auto-assigned to the first Super Admin found (`assigned_to`); status starts `Open`. All Super Admins get an in-app notification.
- **List/detail** — `GET /issues` (Super Admin: all, with `status`/`priority`/`category` filters; Employee/TL: own only), `GET /issues/{id}` (403 if not owner and not Super Admin).
- **Comment thread** — `POST /issues/{id}/comments`, with optional attachments; owner or Super Admin only.
- **Status transitions** (`PUT /issues/{id}/status`) — Super Admin can set any of `Open, In Progress, Waiting for User Response, Resolved, Closed, Rejected`; a non-admin is only allowed the special case of **reopening** their own resolved/closed issue back to `Open`. Resolving/closing/rejecting stamps `resolved_at`; reopening clears it. Notifies the submitter of the status change.

---

## 12. Profile & Profile Update Requests

- **Own profile** — `GET/PUT /profile` (`ProfileController`) for direct-editable fields; `PUT /me/profile` also updates certain self-service fields.
- **Change-request workflow for restricted fields** (`ProfileUpdateRequestController`) — an employee submits `POST /me/profile/request` proposing changes to fields that require approval (e.g. name, sensitive identity fields); `GET /me/profile/request` shows their current pending request. Super Admin reviews the full queue at `GET /profile-requests` and approves (`POST /profile-requests/{id}/approve`, applies the change to the `users` row) or rejects (`POST /profile-requests/{id}/reject`) it. This dual-track (direct edit vs. approval-gated edit) is why the nav has a dedicated "Profile Approvals" admin page.

---

## 13. Notifications, Favorites, AI Chatbot

- **Notifications** (`NotificationController`) — standard Laravel notifiable-model pattern: `GET /notifications` (paginated list), `GET /notifications/unread`, `POST /notifications/mark-as-read/{id?}` (omit id to mark all read), `DELETE /notifications/{id}`. Generated by `LeaveRequestNotification`, `WfhRequestNotification`, `IssueNotification`, `RecognitionNotification`, etc. throughout the other controllers.
- **Favorites** (`FavoriteController`) — lets any user pin/star a nav page for quick access: `GET /favorites`, `POST /favorites`, `DELETE /favorites/{pageHref}`, `GET /favorites/check/{pageHref}` (href is the URL-encoded page path).
- **AI Chatbot** (`ChatController`) — `GET /chat/context` returns the compiled system prompt (for debugging/inspection); `POST /chat` is the actual chat turn. Every request rebuilds a **live, per-user system prompt** from real DB state: the caller's own leave balances, who's on approved leave today, every team + its team lead, and the next 5 upcoming holidays — then calls **Google Gemini** (`gemini-2.0-flash`, via `GEMINI_API_KEY`) with the caller's chat history, falling back to a **local Ollama** instance (`OLLAMA_API_URL`/`OLLAMA_MODEL`, default `llama3.2`) if no Gemini key is configured. The assistant is explicitly instructed to be **read-only** — it must refuse any request to actually perform an action (apply leave, approve, edit profile) and instead point the user to the relevant page (`/leaves/apply`, `/attendance`, `/profile`, `/calendar`, `/policies`).

---

## 14. Reports, Audit Logs, Settings (Super Admin / Administration)

- **Reports** (`ReportController`) — `GET /reports/employees`, `/reports/leaves`, `/reports/leave-balances`, `/reports/attendance-summary`, `/reports/employee-list` (a lightweight list used to populate report filter dropdowns), and `GET /today-birthdays`. All under the `role:Super Admin|Team Lead|HR` middleware group (though the nav only surfaces the Reports page itself to Super Admin).
- **Audit Logs** (`AuditLogController`, Super Admin only) — `GET /audit-logs`, a general system audit trail (distinct from the leave-specific `leave_audit_logs`/`leave_balance_audit_logs`); also feeds the dashboard's "recent audit logs" widget for Super Admins.
- **Settings** (`SystemSettingController`, Super Admin only) — `GET/POST /settings`, a generic key-value store (`system_settings` table) — e.g. `upcoming_birthdays_days` controls how far ahead the dashboard's upcoming-birthdays widget looks (default 30 days).

---

## 15. Dashboard (role-adaptive single endpoint)

`GET /dashboard` (`DashboardController@index`) assembles one large payload the frontend renders differently per role:

**Everyone gets:**
- `profile` — name, employee code, designation, team, joining date, **service duration** ("X Years Y Months Z Days" + raw stats), any currently-active recognition(s), profile photo, and today's attendance status (falls back to raw biometric events if the cron hasn't materialized an `attendance` row yet).
- `leave_metrics` — CL/SL totals & used/remaining (12 + carry-forward for CL, 12 flat for SL), carry-forward amount and its expiry date, total leaves taken this year, own pending-leave count, who's on approved leave today (count + names/types), and probation status/end-date.
- `widgets` — next 5 upcoming holidays, latest 5 pinned/recent announcements (respecting `scheduled_at`/`expires_at`), birthdays & work anniversaries in the next 14 days (cached daily), a separately-configurable "upcoming birthdays" list (default 30-day window, includes days-remaining, sorted soonest-first), and open-issue count.
- `charts.leaves_by_month` — own approved-leave days bucketed per calendar month for the current year.
- `recent_activities` — the user's own last 6 notifications.

**Super Admin & Team Lead additionally get** an `admin_data` block: total active employees, present-today count/list (derived from unique `biometric_events` for today) and its trend vs. yesterday, on-leave-today and WFH-today counts/lists, a role-scoped pending-approvals count (TL: their team's pending TL-step items; Admin/HR: all pending admin-step items including pending LOP conversions), and a merged recent-activity feed (new leave applications, new hires, new policies from the last 2 days).

**Team Lead specifically also gets:** their pending-approval list (next 5) and a live team-member roster with each member's today status (`Present`/`On Leave`/`WFH`/`Not Checked In`).

**Super Admin specifically also gets:** critical alerts (auto-generated if absence rate > 30% or pending requests > 10), the 10 most recent system audit log entries, and headline KPIs (total/active/absent employee counts).

A separate `GET /activities` endpoint paginates the same "global feed" concept (30-day window, 15/page) for a dedicated Activities page.

---

## 16. Database Schema — Key Tables

(See `CLAUDE.md` §6 for the original core set — `users`, `teams`, `leave_balances`, `leave_balance_audit_logs`, `leave_requests`, `attendance`, `ta_requests`, `ta_request_items`. Additional tables discovered in the models directory:)

| Table / Model | Purpose |
|---|---|
| `attendance_breaks` (`AttendanceBreak`) | Break start/end + duration, child of `attendance`. |
| `biometric_events` (`BiometricEvent`) | Raw punch events from the biometric device agent (`employee_code`, `direction`, `local_punch_time`). |
| `biometric_sync_state` (`BiometricSyncState`) | Cursor/checkpoint bookkeeping for biometric ingestion/processing. |
| `working_days_overrides` (`WorkingDaysOverride`) | Dates forced "working" despite falling on a weekend/holiday — feeds the leave-impact calculator. |
| `holidays` (`Holiday`) | Company/public/festival holidays (and, per code comments, sometimes weekend rows too) — the other input to the leave-impact calculator. |
| `leave_audit_logs` (`LeaveAuditLog`) | Trail of Super-Admin overrides / LOP conversions on individual `leave_requests` (previous vs. new value JSON + remarks). |
| `leave_ledger` (`LeaveLedger`) | Supplementary leave transaction ledger. |
| `wfh_requests` (`WfhRequest`) | Mirrors `leave_requests` structurally: `tl_status`, `admin_status`, `status`, `duration_type`, `wfh_type_id`, `attachment_link`. |
| `document_requests` / `document_uploads` (`DocumentRequest`, `DocumentUpload`) | Employee document requests and their HR-fulfilled uploads. |
| `hr_policies` (`HrPolicy`) | Published HR policy documents. |
| `announcements` / `announcement_categories` (`Announcement`, `AnnouncementCategory`) | Company updates with scheduling/expiry/pinning. |
| `recognitions` (`Recognition`) | Date-windowed employee awards (title, description, icon, `is_active`, `is_custom`). |
| `issues` / `issue_comments` / `issue_attachments` (`Issue`, `IssueComment`, `IssueAttachment`) | Helpdesk ticketing. |
| `birthday_wishes` (`BirthdayWish`) | Peer birthday messages. |
| `profile_update_requests` (`ProfileUpdateRequest`) | Approval-gated self-service profile edits. |
| `user_favorites` (`UserFavorite`) | Per-user pinned nav pages. |
| `audit_logs` (`AuditLog`) | General system-wide audit trail. |
| `system_settings` (`SystemSetting`) | Generic key-value app configuration. |

---

## 17. Complete API Route Map

**Public (no auth):** `GET /ping`, `GET /debug-employee` (dev), `GET /photos/{path}`, `GET /wfh-requests/diagnose/schema`, signed email-action links for leave & TA (`.../email-approve`, `.../email-reject`), `POST /login`, `/forgot-password`, `/reset-password`, `POST /admin/run-migrations`, `POST /admin/optimize-cache` (both intended as one-off deploy-maintenance endpoints), `POST /v1/biometric/ingest` (secret-guarded), `POST /system/scheduler/run` (secret-guarded, throttled).

**Authenticated (`auth:sanctum`), all roles unless noted:**
`POST /logout`, `GET /me`, `GET /profile`, `GET/POST /me/profile/request`, `PUT /me/profile`, `GET /me/recognitions`, leave-types (read), `GET /leave-balances`, `POST /leaves/calculate`, `GET/POST /leave-requests` (index+store only), `GET/POST /wfh-requests` (index+store only), full `/attendance/*` group, full `/ta-requests/*` group (self-scoped) + `GET/POST /document-requests`, `GET /hr-policies`, `GET/POST /chat*`, birthday-wishes group, `GET /dashboard`, `GET /activities`, `GET /calendar`, `GET /holidays`, `GET /employees/{id}/public`, `GET /announcements`, `GET /announcement-categories`, full `/notifications/*`, full `/issues/*`, recognition read endpoints (`active-recognitions`, `leaderboard`, `top-awardee`, `employee/{id}`), `GET /hall`, full `/favorites/*`.

**`role:Super Admin|Team Lead|HR`:** full employee & team CRUD + employee photo/password/status/CSV-import, leave-type mutations, `/reports/*`, leave/WFH status approval (`POST .../status`).

**`role:Super Admin|HR`:** holiday mutations, announcement mutations, announcement-category creation.

**`role:Super Admin`:** settings, audit-logs, admin leave/WFH marking & creation, approved-leave/WFH management, profile-request approvals, leave override & LOP confirm/reject, annual-allocation trigger, attendance-timezone-fix trigger, ensure-leave-types / ensure-database-columns maintenance endpoints, TA admin approve/reject/mark-paid + admin index + schema-diagnose, recognition mutations (`/recognitions` CRUD, toggle).

---

## 18. Cross-Cutting Business Rules (quick reference)

- **Balance deduction timing:** never at submission — always at the moment a leave/WFH request reaches full `Approved` status.
- **Carry-forward consumption order:** CL carry-forward is always drawn down before current-year CL balance, on every deduction path (normal approval, override, admin-initiated).
- **Single-day exception:** a single-day Leave or WFH request can be fully approved by *either* the TL *or* the Admin acting alone — multi-day always needs both.
- **A Team Lead never approves their own or another TL's request** — Team Lead requests always skip straight to Super Admin.
- **Rejection never needs to touch balances** (nothing was deducted yet); approval-then-later-override does need refund-then-rededuct logic, which `override()` and `confirmLopConversion()` both implement explicitly.
- **Probation ⇒ 100% LOP**, regardless of balance availability, for both types.
- **Admin-initiated leave/WFH (`storeForEmployee`) is always LOP/unpaid** for leave, and **auto-approved by default** for WFH (`auto_approve` flag) — this path exists for after-the-fact corrections, not normal self-service.
- **Sandwich Leave Policy** applies to both intra-request non-working gaps and cross-request adjacency (flagged for manual admin confirm/decline rather than auto-applied, to avoid silently clawing back an already-paid leave).
- **Email side-effects are always isolated in try/catch** — a failed email (leave, WFH, TA, recognition) never rolls back or blocks the underlying database transaction.
- **Notifications are always best-effort** — same isolation pattern as email, wrapped separately from the core write.

---

## 19. Known Debug/Maintenance Endpoints (not for normal use)

These exist in the codebase for production troubleshooting and should not be exposed to end users or linked from the UI:
`GET /debug-employee`, `POST /admin/run-migrations`, `POST /admin/optimize-cache`, `GET /ta-requests/diagnose/schema`, `GET /wfh-requests/diagnose/schema`, `POST /admin/ensure-leave-types`, `POST /admin/ensure-database-columns`, `POST /admin/fix-attendance-timezone`, `GET /leave-balances/debug`, `POST /system/scheduler/run`.

---

*For infrastructure, environment variables, deployment pipeline, and directory structure, see `CLAUDE.md` in the project root — this document focuses purely on functional behavior and workflows.*
