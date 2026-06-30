# Intersmart Employee Portal — Complete Project Memory
# For Claude Terminal / New Sessions

---

## 1. Project Identity

**Project Name:** Inter Smart Employee Portal  
**Company:** Intersmart  
**Purpose:** Internal HR & Employee Management System  
**Status:** Active development — core modules built, testing in progress  
**Developer Team:** Team QA (footer credit: "Developed By Team QA")

---

## 2. Infrastructure & Hosting

### GitHub
- **Repo:** `https://github.com/career-maker/Inter-Smart-Portal.git`
- **Branch:** `main`
- **Remote name:** `origin`
- **Workflow:** Push to main → Vercel auto-deploys frontend; Render rebuilds backend Docker image

### Frontend — Vercel
- **Platform:** Vercel (auto-deploy from GitHub main branch)
- **Framework:** Next.js 16 (App Router)
- **Package manager:** pnpm
- **Local dev port:** 3000
- **Build command:** `pnpm run build`
- **Dev command:** `pnpm run dev`

### Backend — Render
- **Platform:** Render (Docker-based)
- **Dockerfile location:** `backend/Dockerfile`
- **Runtime:** PHP 8.2 + Apache
- **Auto-deploy:** Yes, on push to main
- **Startup script** (in Dockerfile): Runs `php artisan storage:link --force`, then `php artisan migrate --force`, then starts Apache

### Database — Supabase
- **Platform:** Supabase (PostgreSQL 15+)
- **Driver:** `pdo_pgsql`
- **Connection:** Via `DATABASE_URL` environment variable in Render
- **Local backend:** Connects to same Supabase DB (configured in `backend/.env`)

### Local Development
- **PHP:** `C:\xampp\php\php.exe`
- **Backend local port:** 8765 (Laravel artisan serve)
- **Frontend local port:** 3000 (Next.js)
- **To run migrations locally:** `C:\xampp\php\php.exe artisan migrate`
- **To run seeders locally:** `C:\xampp\php\php.exe artisan migrate:fresh --seed`
- **Workspace path:** `d:\iss\Inter Smart-Employee-Portal\`

---

## 3. Technology Stack

### Backend
- **Laravel 12** (PHP 8.2+)
- **Auth:** Laravel Sanctum (token-based)
- **Roles/Permissions:** Spatie Laravel Permission package
- **Database:** PostgreSQL via Supabase
- **Storage:** Laravel local disk → `storage/app/public` → symlinked to `public/storage`
- **Queue:** Sync driver (no Redis)
- **Scheduler:** Laravel scheduler via `routes/console.php`
- **API:** REST, JSON responses, all routes prefixed `/api/`

### Frontend
- **Next.js 16** (App Router, TypeScript)
- **UI Library:** Shadcn/UI components
- **Styling:** Tailwind CSS v4
- **State:** Zustand (`@/store/auth`)
- **HTTP Client:** Axios wrapped in `@/services/api.ts`
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React
- **Date handling:** date-fns

---

## 4. Directory Structure

```
Inter Smart-Employee-Portal/
├── backend/                     # Laravel 12 API
│   ├── app/
│   │   ├── Console/Commands/    # Artisan commands
│   │   │   └── ProcessAnnualLeaveAllocation.php
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # All API controllers
│   │   │   ├── Requests/        # Form request validation
│   │   │   └── Resources/       # API resources (transformers)
│   │   └── Models/              # Eloquent models
│   ├── database/
│   │   ├── migrations/          # All migrations
│   │   └── seeders/             # Seeders
│   ├── routes/
│   │   ├── api.php              # All API routes
│   │   └── console.php          # Scheduled commands
│   ├── storage/                 # File uploads go here
│   ├── .env                     # Local env (DB, APP_KEY, etc.)
│   └── Dockerfile               # Docker config for Render
│
├── frontend/                    # Next.js 16 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, forgot-password, reset-password
│   │   │   └── (dashboard)/     # All protected pages
│   │   │       ├── layout.tsx   # Main nav layout (role-based menu)
│   │   │       ├── dashboard/   # Employee/TL dashboard
│   │   │       ├── employees/   # Employee management
│   │   │       ├── teams/       # Department management
│   │   │       ├── leaves/      # Leave management
│   │   │       ├── leave-balances/ # Super Admin balance management
│   │   │       ├── attendance/  # Attendance
│   │   │       ├── wfh/         # Work from home requests
│   │   │       ├── announcements/
│   │   │       ├── hall/        # Employee wall of fame
│   │   │       ├── holidays/
│   │   │       ├── calendar/
│   │   │       ├── reports/
│   │   │       ├── audit-logs/
│   │   │       ├── settings/
│   │   │       ├── profile/
│   │   │       ├── profile-requests/
│   │   │       ├── recognitions/
│   │   │       ├── issues/
│   │   │       ├── documents/
│   │   │       ├── policies/
│   │   │       └── notifications/
│   │   ├── components/
│   │   │   ├── ui/              # Shadcn/UI base components
│   │   │   ├── employees/       # EmployeeForm.tsx
│   │   │   └── layout/          # NotificationDropdown, RecognitionTicker
│   │   ├── services/api.ts      # Axios instance (baseURL from env)
│   │   ├── store/auth.ts        # Zustand auth store
│   │   └── middleware.ts        # Auth middleware (route protection)
│   └── .env.local               # NEXT_PUBLIC_API_URL
│
└── CLAUDE.md                    # This file + project rules
```

---

## 5. Roles & Permissions

Three roles managed by Spatie:

| Role | Access |
|------|--------|
| **Super Admin** | Full access to everything. Cannot apply for leave personally. |
| **Team Lead** | Own profile, own team members, leave approvals for their team, can apply leave |
| **Employee** | Own profile, own leave/wfh requests, own attendance |

### Navigation Visibility Rules (layout.tsx)
- **Apply Leave** → Only Employee & Team Lead (hidden for Super Admin)
- **Leave Balances** → Only Super Admin
- **Settings** → Only Super Admin
- **Audit Logs** → Only Super Admin
- **Holidays / Reports** → Super Admin + HR
- **Everything else** → All authenticated users

---

## 6. Database Schema (Key Tables)

### users
```
id, first_name, last_name, email, personal_email, employee_code (unique),
designation, team_id (FK→teams), joining_date, dob, gender, blood_group,
marital_status, permanent_address, current_address, contact_number,
alternate_contact_number, profile_photo_path, status (Active/Disabled/Resigned/Terminated),
password, created_by, updated_by, deleted_at, timestamps
```

### teams
```
id, name, code (unique, auto-generated), description, team_lead_id (FK→users),
created_by, updated_by, deleted_at, timestamps
```
> **Note:** `code` is auto-generated in TeamController from team name (e.g., "Quality Assurance" → "QUAL-3847")

### leave_balances
```
id, user_id (FK→users), casual_leave_balance (decimal 5,1),
cl_carry_forward (decimal 5,1), cl_carry_forward_year (int),
sick_leave_balance (decimal 5,1), total_leaves_taken (decimal 5,1), timestamps
```

### leave_balance_audit_logs
```
id, user_id (FK→users), leave_type (string: 'Casual Leave'/'Sick Leave'/'CL Carry Forward'),
previous_balance, new_balance, modified_by (FK→users), remarks, timestamps
```

### leave_requests
```
id, user_id, leave_type_id, start_date, end_date, reason,
tl_status, admin_status, status, days_taken, is_unpaid, approver_id, timestamps
```

### attendance
```
id, user_id, date, check_in, check_out, break_start, break_end, status, timestamps
```

---

## 7. API Routes Overview

**Base URL:** `/api` (auth via Sanctum `Bearer` token)

### Public
- `POST /api/login`
- `GET /api/ping`
- `POST /api/forgot-password`
- `POST /api/reset-password`

### Authenticated (all roles)
- `POST /api/logout`
- `GET /api/dashboard` — role-specific dashboard data
- `GET/POST /api/employees` — employee list and create
- `GET/PUT/DELETE /api/employees/{id}`
- `POST /api/employees/{id}/photo` — profile photo upload
- `POST /api/employees/{id}/password`
- `GET /api/teams` — list teams (dynamic, from DB)
- `GET/POST /api/leave-requests`
- `GET /api/leave-balances` — own balance (employee) or all employees (Super Admin)
- `GET /api/leave-types`
- `GET/POST /api/wfh-requests`
- `GET /api/attendance/status`, `POST /api/attendance/check-in`, etc.
- `GET/POST /api/announcements`
- `GET/POST /api/notifications`
- `GET /api/holidays`
- `GET /api/profile`

### Super Admin Only
- `POST /api/leave-balances/{userId}` — manually adjust employee leave balance
- `GET /api/leave-balance-audit-logs` — view all balance change history
- `POST /api/admin/run-annual-allocation` — manually trigger Jan 1 leave allocation
- `GET /api/audit-logs`
- `GET/POST /api/settings`
- `GET /api/profile-requests`, approve/reject endpoints
- `PUT /api/leave-requests/{id}/override`

---

## 8. Leave Management Rules

### Casual Leave (CL)
- **Annual allocation:** 12 CL on January 1 every year
- **Carry forward:** Unused CL carries forward ONE year only
- **Carry-forward expiry:** If not used in the carry-forward year, it expires Dec 31
- **Consumption order:** Carry-forward balance used FIRST, then current year balance
- **Tracked separately:** `casual_leave_balance` (current year) + `cl_carry_forward`
- **CL application rule:** Must apply at least 3 days in advance (enforced in backend)

### Sick Leave (SL)
- **Annual allocation:** 12 SL on January 1 every year
- **No carry forward:** All unused SL expires December 31
- **Auto-reset:** Resets to 12 on Jan 1

### Annual Allocation Cron
- **Command:** `php artisan leave:annual-allocation`
- **Schedule:** Jan 1 each year at midnight (via `routes/console.php`)
- **Manual trigger:** `POST /api/admin/run-annual-allocation` (Super Admin only)

### Carry-forward Example
```
2026: Allocated 12 CL, used 7 → remaining 5
Jan 1 2027: CF = 5, new allocation = 12, total = 17
If those 5 CF not used during 2027 → expire Dec 31 2027
Jan 1 2028: Only unused from the 12 (2027 allocation) carry forward
```

---

## 9. Key Implementation Details

### Team Code Auto-Generation (TeamController@store)
```php
$base = strtoupper(preg_replace('/[^A-Za-z]/', '', $data['name']));
$base = substr($base, 0, 4);
$code = $base . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
// Loop to ensure uniqueness
```

### Profile Photo Upload
- Route: `POST /api/employees/{id}/photo` with `photo` field (multipart/form-data)
- Stored in: `storage/app/public/profile-photos/`
- Accessible at: `/storage/profile-photos/filename.jpg` (requires `storage:link`)
- Column: `users.profile_photo_path` (migration added 2026_06_30_000002)
- **Render note:** `storage:link` runs automatically via Dockerfile startup script

### Service Duration (Welcome Card)
- Displayed on Employee/Team Lead dashboard welcome card
- Format: "You have been with Intersmart for X Years Y Months Z Days"
- Calculated from `users.joining_date` (set when Super Admin creates the employee)

### Department Fetch in EmployeeForm
- Departments are fetched dynamically from `GET /api/teams` — NO hardcoded dummy data

---

## 10. Pending Migrations (Must Run)

These migrations have been created but may not yet be applied to the database:

```bash
# Run in backend/ directory
php artisan migrate
```

Pending:
1. `2026_06_30_000001_add_carry_forward_and_audit_to_leave_balances.php`  
   → Adds `cl_carry_forward`, `cl_carry_forward_year` to `leave_balances`  
   → Creates `leave_balance_audit_logs` table

2. `2026_06_30_000002_add_profile_photo_path_to_users.php`  
   → Adds `profile_photo_path` to `users`

> On Render: These run automatically via the Dockerfile startup script (`php artisan migrate --force`)

---

## 11. UI/UX Standards

- **Theme:** Dark slate (`from-slate-900 via-slate-800 to-slate-900`) background for all pages
- **Cards:** `bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl` style
- **Accent colour:** Amber/gold (`text-amber-400`, `bg-amber-500`)
- **No horizontal scrolling:** `overflow-x: hidden` on html/body in globals.css
- **Breadcrumbs:** Auto-generated from URL path in `layout.tsx`
- **Nav:** Hamburger menu (universal) with role-based filtering
- **Font:** Inter (Google Fonts)
- **Icons:** Lucide React — page header icons use `text-amber-400` (NOT `text-primary` which is invisible on dark bg)

---

## 12. Seeder State

After `php artisan migrate:fresh --seed`, the database contains:
- **Super Admin only:** `admin@intersmart.in` (password: check `.env` or seeder)
- **Leave Types:** Sick Leave, Casual Leave, all Half Day variants, WFH variants
- **No dummy employees, teams, or departments**

---

## 13. Known Issues & Fixes Applied

| Issue | Fix Applied |
|-------|-------------|
| Departments icon invisible on dark bg | Changed from `text-primary` to `text-amber-400` |
| Profile photo upload fails | Added `profile_photo_path` migration + `storage:link` in Dockerfile |
| Employee form shows dummy departments | Now fetches from `GET /api/teams` dynamically |
| Team creation gives server error | `code` column auto-generated in backend (was required but not submitted) |
| Leave balance page shows 0 employees | Separated Promise.all into independent try/catch; audit log failure no longer blocks employee list |
| "You have been with Intersmart" text missing | Fixed in dashboard welcome card — shows full sentence format |
| Horizontal scrolling | `overflow-x: hidden` + `box-sizing: border-box` added to globals.css |

---

## 14. Git History (Recent Commits)

```
e5b3b4d  Fix: Leave balance page shows employees even if audit log table is pending
a10bead  Fix: Departments icon visible, add profile_photo_path migration, Dockerfile storage:link
58d07b8  Leave management enhancements: CL carry-forward, SL reset, admin balance UI, Super Admin restrictions
1caedba  Auto-generate team code in TeamController store method
c995c93  Fetch real teams from API in Employee form instead of using dummy data
5e291fb  Move service duration text from EmployeeForm to Dashboard welcome card
```

---

## 15. Environment Variables

### Backend (`backend/.env`)
```env
APP_NAME="Intersmart Employee Portal"
APP_ENV=production
APP_KEY=<generated>
APP_URL=https://your-render-url.onrender.com

DB_CONNECTION=pgsql
DB_HOST=<supabase-host>
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=<supabase-password>

SANCTUM_STATEFUL_DOMAINS=intersmart-portal.vercel.app,localhost:3000
SESSION_DRIVER=cookie
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com/api
```

---

## 16. What's Implemented ✅

- [x] Authentication (login, logout, forgot/reset password)
- [x] Role-based access (Super Admin, Team Lead, Employee)
- [x] Employee CRUD (create, view, edit, delete, photo upload)
- [x] Department/Team CRUD
- [x] Dashboard (KPI cards, attendance widget, company updates, birthdays)
- [x] Service duration display ("You have been with Intersmart for X Years...")
- [x] Leave request application (with 3-day advance rule for CL)
- [x] Leave approvals (TL approval → Admin approval workflow)
- [x] Leave balance display (CL + SL with carry-forward tracking)
- [x] Leave Balance Management page (Super Admin: view all, edit, audit log)
- [x] Annual leave allocation cron (Jan 1 automation)
- [x] WFH requests
- [x] Attendance check-in/check-out
- [x] Announcements / Company Updates
- [x] Notifications system
- [x] Holidays management
- [x] Calendar
- [x] Hall (Employee recognition wall)
- [x] Issues / Raise a concern
- [x] Employee recognitions
- [x] Audit logs
- [x] Settings
- [x] Profile page
- [x] Profile update requests (with Super Admin approval)
- [x] Breadcrumbs on all pages
- [x] Horizontal scroll prevention
- [x] Responsive layout

## 17. What's Pending / Future

- [ ] Profile photo actually serving on Render (needs redeployment with new Dockerfile)
- [ ] Email notifications (SMTP not yet configured)
- [ ] Reports (PDF/Excel export)
- [ ] Documents page
- [ ] Policies page
- [ ] Full unit test coverage
- [ ] Production performance audit

---

## 18. Quick Reference Commands

```bash
# Local development
cd backend && C:\xampp\php\php.exe artisan serve --port=8765
cd frontend && pnpm run dev

# Run migrations (local)
cd backend && C:\xampp\php\php.exe artisan migrate

# Fresh DB with seed (Super Admin only)
cd backend && C:\xampp\php\php.exe artisan migrate:fresh --seed

# Build frontend
cd frontend && pnpm run build

# Push to GitHub
git add . && git commit -m "message" && git push

# Manual annual leave allocation
POST /api/admin/run-annual-allocation   (Super Admin token required)
```