# Inter Smart Employee Management Portal — Complete Features, Roles & Workflows Specification

> **Document Version:** 2.0 (Production Master)  
> **Last Updated:** August 2026  
> **Typography Standard:** Proxima Nova (Universal Portal Standard)  
> **Infrastructure:** Next.js (App Router, TypeScript) + Laravel API (PHP 8.2+, MySQL on cPanel)

---

## 1. System Overview & Architecture

The **Inter Smart Employee Portal** is an enterprise-grade Human Resource Management, Biometric Attendance, Project Delivery, and Internal Community platform designed specifically for Inter Smart.

### Core User Roles

| Role | Key Scope & Authority | Primary Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | Full Master System Authority | Global portal configuration, Leave Policy Management, Biometric attendance audit & overrides, Hubstaff integration, Add-ons management, TA approval & payment, Employee master data, System settings, Database integrity. |
| **HR (Human Resources)** | Human Resource Operations | Employee onboarding/offboarding, Leave approvals & balance monitoring, Document request fulfillment, HR policy management, Announcements publishing, Birthday/Anniversary administration, Hall of Fame awards. |
| **Team Lead** | Project & Team Delivery | Project & task management, Task forecasting & overdue tracking, Team QA bug tracking, Team attendance/Hubstaff monitoring, Travel Allowance (apply/status), Peer praise & community feed. |
| **Employee** | Self-Service & Workspace | Biometric clock & timeline viewing, Leave & WFH applications, Travel allowance claims, My Tasks execution, Document requests, Issue ticketing, Community participation, Peer recognition, Profile self-management. |

---

## 2. User Roles & Permission Matrix

| Feature / Workflow | Super Admin | HR | Team Lead | Employee |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Profile Management** | ✅ Full | ✅ Full | ✅ Self | ✅ Self |
| **Dashboard & Flash Ticker** | ✅ View / Manage | ✅ View / Manage | ✅ View | ✅ View |
| **Biometric Clock & Daily Timeline** | ✅ Global Audit | ✅ Global Audit | ✅ Team Audit | ✅ Self |
| **Apply Leave / WFH** | ✅ Apply / Override | ✅ Apply | ✅ Apply | ✅ Apply |
| **Leave & WFH Approvals** | ✅ Final Approve | ✅ Review & Approve | ❌ | ❌ |
| **Leave Balances Management** | ✅ Edit & Adjust | ✅ View | ❌ | ❌ (View self) |
| **Leave Policy Management (Add-on)** | ✅ Full Control | ❌ | ❌ | ❌ |
| **Attendance Matrix & Daily Detail** | ✅ Global Edit | ✅ Global View | ✅ Team View | ✅ Self |
| **Project & Task Management** | ✅ Full | ✅ Task Catalog | ✅ Lead Projects | ✅ Assigned Tasks |
| **QA Bug Tracking & Reports** | ✅ Full | ❌ | ✅ Assigned Teams | ✅ Assigned Teams |
| **Hubstaff Integration & Sync** | ✅ Full Config | ❌ | ✅ Team View | ❌ |
| **Add-ons Configuration** | ✅ Full Control | ❌ | ❌ | ❌ |
| **Travel Allowance (Apply)** | ✅ Apply | ❌ | ✅ Apply | ✅ Apply |
| **Travel Allowance (Approvals & Payment)**| ✅ Approve & Pay | ❌ | ❌ | ❌ |
| **Updates & Announcements** | ✅ Publish / Pin | ✅ Publish / Pin | ✅ View | ✅ View |
| **Document Requests (Salary/Exp/NOC)** | ✅ Manage | ✅ Fulfill & Upload | ✅ Request | ✅ Request |
| **HR Policies Handbook** | ✅ Full Manage | ✅ Full Manage | ✅ View / Download | ✅ View / Download |
| **Employee Master Directory** | ✅ Full CRUD | ✅ Full CRUD | ✅ Directory View | ✅ Directory View |
| **Departments / Teams Management** | ✅ Full CRUD | ✅ Full CRUD | ✅ View Lead | ✅ View |
| **Hall of Fame & Awards Management** | ✅ Full Manage | ✅ Full Manage | ✅ Nominate | ✅ Nominate / View |
| **Birthday & Anniversary Wishes** | ✅ Full Manage | ✅ Full Manage | ✅ Wish & View | ✅ Wish & View |
| **Community Feed (Posts, Polls, Praise)**| ✅ Moderate / Post | ✅ Moderate / Post | ✅ Post / Praise | ✅ Post / Praise |
| **Issue Ticketing (Helpdesk)** | ✅ Resolve / Assign | ✅ Resolve / Assign | ✅ Raise / View | ✅ Raise / View |

---

## 3. Detailed Module Workflows

### 3.1. Authentication & Security Workflow

- **JWT / Laravel Sanctum Bearer Authentication**: Secure session persistence with client-side state hydration.
- **Login Flow**:
  - Employee logs in with work email and password.
  - Multi-tenant role resolution routes the user to the relevant dashboard view.
- **Password Reset Flow**:
  - "Forgot Password" sends secure time-limited cryptographic token to the registered corporate email.
  - "Reset Password" enforces standard complexity rules.
- **Role Guards**: Next.js middleware and client navigation intercept unauthorized route visits, redirecting non-permitted roles to `/dashboard`.

---

### 3.2. Dashboard & Navigation System

- **Global Navigation Bar & Sidebar**:
  - Brand identity with high-contrast Inter Smart purple theme (`#56348f`).
  - Strict **Proxima Nova** font hierarchy across all headers, metrics, and data tables.
  - Global `Alt + K` **Command Palette** for rapid search of employees, pages, actions, and tasks.
  - Notification center with unread badge indicators and live toast alerts.
  - Favorite Bookmarks dropdown for instant access to pinned workflows.
- **Live Recognition & Announcements Flash Ticker**:
  - Infinite auto-scrolling marquee bar at the top of the portal.
  - Displays:
    1. **Pinned Announcements** (📢 cyan styling with live title and truncated content).
    2. **Today's Birthdays** (🎉 yellow styling with animated cake).
    3. **Active Employee Recognitions** (⭐ gold star awards and badges).
  - Hover-to-pause capability for reading long text.
- **Biometric Attendance Widget**:
  - Live clock showing current day punch timeline (First IN, breaks, last OUT, current status).
  - Status pills: `WORKING NOW`, `ON BREAK`, `CHECKED OUT`, `ON LEAVE`, `ON WFH`.
- **Quick Action Bar**: One-click modals for Apply Leave, Apply WFH, Apply TA, Raise Issue, and Request Document.
- **Live Celebrations & Milestones Widget**:
  - Today's birthdays with direct "Send Wish" drawer.
  - Work anniversaries with year badges.
  - New joiners welcome cards.

---

### 3.3. Leave & Work From Home (WFH) Management

#### Workflows & Rules:
1. **Apply Leave**:
   - Types: **Casual Leave (CL)**, **Sick Leave (SL)**, **Emergency Leave**, **Leave Without Pay (LOP)**.
   - Durations: Full Day, Half Day (First Half / Second Half), Multi-day range.
   - Dynamic validation: Checks user balance and warns if balance is zero or in probation.
   - Direct notification sent to HR and Super Admin upon submission.
2. **Apply WFH (Work From Home)**:
   - Full Day or Half Day requests.
   - Requires explicit work description / planned deliverables for the remote day.
3. **Approvals Workflow (`/leaves/approvals`)**:
   - HR / Super Admin review queue with status filters (*Pending, Approved, Rejected*).
   - Approval automatically adjusts live leave balance and marks attendance calendar status.
   - Rejection requires review remarks sent back to employee notification feed.
4. **Manage Approved Leaves/WFH (`/manage-leaves`)**:
   - Super Admin exclusive emergency dashboard to modify or cancel previously approved records.

---

### 3.4. Leave Policy Management System (New Add-on Module)

Located under **Add-ons → Leave Policy Management** (`/project-management/addons/leave-policy`):

#### Key Invariants & Policies:
1. **Configurable Payroll Month Cycle**:
   - Super Admin can set any start day of the month (e.g. `26th`, `1st`, `15th`).
   - No hardcoded 26th dates; monthly cycle boundaries calculate dynamically (`YYYY-MM-DD`).
2. **Automatic Monthly CL & SL Allocation**:
   - Configurable global monthly quota (default: `+1.00 CL` and `+1.00 SL` per month).
   - Enforced by daily cron scheduler (`00:01 AM`) and idempotent ledger keying (`cycle_key + user_id + transaction_type`).
3. **Probation Rules & Next-Day Eligibility**:
   - Default probation duration: 6 months from `joining_date`.
   - Employees in probation do not receive automatic monthly leave accrual.
   - Upon natural probation completion, employees become eligible starting the **next day**.
4. **Admin Manual Addition Probation Clearance Exception**:
   - If an administrator manually adds or adjusts leave balances for an employee during probation, the employee is treated as having completed/cleared probation and begins automatic monthly allocation from the very next cycle.
5. **Casual Leave (2-Year Carry Forward) vs. Sick Leave (Annual Expiry)**:
   - **Casual Leave**: Carried forward for up to 2 years before dynamic expiration at cycle cutoff.
   - **Sick Leave**: All unused SL expires at the annual cycle boundary with zero multi-year carry forward.
6. **Preservation of Manual Balance Corrections**:
   - Existing employee balances and manual balance updates are preserved; future allocations simply add to the actual current balance without overwriting.
7. **Employee-Specific Allocation Overrides**:
   - Individual custom monthly CL/SL quotas and custom probation durations.
8. **Audit Trail & Policy Runner**:
   - Comprehensive audit ledger capturing every balance movement (opening, delta, closing, cycle key, modifier, remarks).
   - Interactive Policy Runner & Simulator for testing.

---

### 3.5. Attendance & Biometric Management

- **Biometric Integration (eSSL Engine)**:
  - External external eSSL biometric database integration (Read-only / SELECT-only invariant).
  - Idempotency keyed by `source_system + source_table + source_event_id`.
  - Full timeline rebuild from the complete employee-code day timeline.
  - **Late IN Reopening**: A late IN punch after an OUT punch reopens the working session and clears stale checkout time.
  - **Precision Rule**: Sums raw session seconds first; converts/floors to minutes only after the total sum is computed.
- **Attendance Management Matrix (`/attendance/management`)**:
  - Monthly calendar matrix for all employees and departments.
  - Interactive status badges: Present (Green), WFH (Blue), Leave (Amber), Half-Day (Orange), Absent (Red), Missing Punch-out (Yellow outline).
  - Daily detail modal with exact punch timestamps, total working hours, break hours, and device IDs.

---

### 3.6. Project & Task Management

- **Projects Dashboard (`/project-management/projects`)**:
  - Project repository with Client Name, Project Manager/Lead, Department, Budget, Start/End dates, Status (*Active, On Hold, Completed*), and completion percentage.
- **Task Management Board (`/project-management/tasks`)**:
  - Kanban & List view with status lanes: *Backlog, To Do, In Progress, In Review, Completed*.
  - Task Attributes: Priority (*Low, Medium, High, Urgent*), Due Date, Assigned Employees, Estimated Hours, Actual Hours.
  - Filter by Project, Team Lead, Assignee, Department, Priority.
- **My Tasks (`/project-management/tasks/my`)**:
  - Personal task queue with status updating, time logging, and delivery notes.
- **Overdue Tasks (`/project-management/tasks/overdue`)**:
  - Urgent escalation view for overdue deliverables with auto-flagging.
- **Forecast Tasks (`/project-management/tasks/forecast`)**:
  - Resource workload planning and delivery forecast scheduling.
- **Task Catalog (`/project-management/task-catalog`)**:
  - Standardized task templates and recurring deliverables library for Super Admins and HR.
- **Hubstaff Tracking Integration (`/project-management/hubstaff`)**:
  - Real-time productivity rates, tracked activity percentages, keyboard/mouse activity sync, and tracked vs. allocated time comparison.

---

### 3.7. Add-ons Architecture

Located under **Main Menu → Add-ons** (`/project-management/addons`):

1. **Bug Tracker & QA Metrics**:
   - Enables QA Bug tracking (*HTML Bugs, Functional Bugs, Total Bugs, Bug Tracker Link*) on task management.
   - Assigned specifically to relevant technical delivery teams (*QA, Design, HTML, PHP, WordPress, Project Coordinator*).
2. **Leave Policy Management**:
   - Company-wide global policy engine governing cycle boundaries, probation rules, carry-forward, and allocations for all staff.

---

### 3.8. Travel Allowance (TA) Management

- **Apply for Travel Allowance (`/ta/apply`)**:
  - Employees log official travel with travel dates, origin, destination, client/project purpose, vehicle mode (Two-Wheeler, Four-Wheeler, Public Transport), odometer start/end readings, total km, fare calculation, and receipt attachment uploads.
- **TA Claim Status (`/ta/status`)**:
  - Track claim status: *Submitted, Under Review, Approved, Paid, Rejected*.
- **Manage TA Requests (`/ta/management`)**:
  - Super Admin verification dashboard to audit travel claims, review uploaded bills, approve claim amounts, and record settlement/payment status.

---

### 3.9. HR Services, Documents & Policies

- **Updates & Announcements (`/announcements`)**:
  - Community-style feed of corporate announcements, holiday notices, celebrations, and notices.
  - Rich header with Author avatar, name, publication date, globe icon, category pill, and Pinned badge.
  - Banner media attachments centered with clean responsive frames.
  - Pin-to-top option automatically pushes the notice to the global **Flash Ticker**.
  - Category filtering and search.
- **Request Documents (`/documents`)**:
  - Employee requests official corporate paperwork:
    - *Salary Certificate / Payslip Statement*
    - *Experience Letter / Relieving Letter*
    - *NOC (No Objection Certificate) for Visa / Banking*
    - *Bonafide Employment Letter*
    - *Custom Document Request*
  - HR review dashboard to approve, generate, and upload signed PDF documents for employee download.
- **HR Policies Handbook (`/policies`)**:
  - Centralized policy repository (*Code of Conduct, Leave Policy, IT Security, Work Hours, POSH, Remote Work*).
  - Version control and downloadable attachments.

---

### 3.10. People, Organization & Recognition

- **Employee Master Directory (`/employees`)**:
  - Complete employee repository with name, designation, department, work email, phone, biometric code, joining date, and status.
  - Onboard new employee: automatic retro-matching of biometric logs matching employee code.
- **Departments & Teams (`/teams`)**:
  - Department hierarchy (*Design, HTML, PHP, QA, WordPress, Marketing, HR, Accounts*), Team Leads, and assigned add-ons.
- **The Hall of Fame (`/hall`)**:
  - Monthly Star Awards, Quarterly Excellence Awards, and Top Achievers spotlight.
- **Birthday Wishes (`/birthday-wishes`)**:
  - Dedicated Birthday Inbox with celebratory cards, confetti animations, and peer-to-peer birthday message delivery.
- **Awards & Recognition Leaderboard (`/recognitions` & `/recognitions/leaderboard`)**:
  - Employee spot awards (*Superstar, Innovator, Team Player, High Performer, Customer Delight*).
  - Badges, points, and corporate leaderboard rankings.

---

### 3.11. Community Social Feed (`/community`)

- **2-Column Social Feed**:
  - **Left Sidebar**: Upcoming holidays widget, on-leave today roster, WFH roster, today's balance overview, and celebratory birthday cards.
  - **Main Feed**:
    - Standard Posts with multi-photo image attachments and `@` user mentions.
    - Community Polls with real-time percentage progress and expiration dates.
    - Peer Praise with multi-recipient tagging and achievement badges.
    - Year, month, date, and post type filtering.

---

### 3.12. Helpdesk & Issue Ticketing (`/issues`)

- **Raise an Issue (`/issues/new`)**:
  - Categories: *Hardware / IT Equipment, Software License / Access, Payroll & Salary, Workplace Infrastructure, HR General*.
  - Priority levels: *Low, Medium, High, Urgent*.
- **Issue Tracking & Resolution (`/issues/[id]`)**:
  - Internal discussion thread between employee and administrative team.
  - Status progression: *Open → In Progress → Resolved → Closed*.

---

## 4. Database Schema Reference

| Table Name | Purpose | Key Columns |
| :--- | :--- | :--- |
| `users` | Employee records | `id`, `name`, `email`, `employee_code`, `role`, `department_id`, `joining_date`, `designation` |
| `leave_policy_settings` | Global leave policy | `monthly_cycle_start_day`, `probation_period_months`, `default_monthly_cl`, `default_monthly_sl`, `cl_carry_forward_years` |
| `employee_leave_policies` | Employee policy overrides | `user_id`, `custom_monthly_cl`, `custom_monthly_sl`, `custom_probation_months`, `probation_cleared_manually` |
| `leave_allocation_ledgers` | Audit trail & idempotency | `user_id`, `leave_type`, `amount`, `transaction_type`, `cycle_key`, `opening_balance`, `closing_balance` |
| `leave_balances` | Live leave balances | `user_id`, `casual_leave_balance`, `cl_carry_forward`, `sick_leave_balance`, `probation_cleared_manually` |
| `leave_requests` | Leave applications | `user_id`, `leave_type`, `start_date`, `end_date`, `days_count`, `is_half_day`, `status`, `reason` |
| `wfh_requests` | WFH applications | `user_id`, `date`, `is_half_day`, `task_description`, `status`, `reason` |
| `attendance` | Daily attendance | `user_id`, `date`, `first_in`, `last_out`, `total_seconds`, `break_seconds`, `status` |
| `projects` | Project registry | `title`, `client_name`, `team_lead_id`, `department_id`, `budget`, `status` |
| `tasks` | Task deliverables | `project_id`, `title`, `assigned_to`, `due_date`, `priority`, `status`, `estimated_hours` |
| `pm_addons` | Add-on modules | `key`, `name`, `description`, `icon`, `is_active` |
| `pm_addon_team` | Team-to-addon mapping | `addon_id`, `team_id` |
| `travel_allowances` | Travel claims | `user_id`, `travel_date`, `origin`, `destination`, `mode`, `kilometers`, `amount`, `status` |
| `announcements` | Corporate notices | `title`, `content`, `category`, `image_path`, `is_pinned`, `scheduled_at`, `expires_at`, `author_id` |
| `document_requests` | Official requests | `user_id`, `document_type`, `purpose`, `status`, `file_path`, `fulfilled_by` |
| `community_posts` | Social feed | `user_id`, `content`, `type`, `poll_data`, `images`, `created_at` |
| `issues` | Ticketing system | `user_id`, `category`, `priority`, `title`, `description`, `status`, `assigned_to` |

---

## 5. Verification & Operational Guidelines

1. **Strict Typography Rule**: Always preserve universal **Proxima Nova** font styling. Never use alternate fonts anywhere in the portal.
2. **Production Database Safety**: Live eSSL database connections must remain **SELECT-only**.
3. **Multi-Session Time Precision**: Sum raw attendance seconds first, convert to whole minutes after totaling.
4. **Idempotency Rule**: Automatic monthly leave cycle processing must be executed via `LeavePolicyEngine` using unique `cycle_key` audit ledger tracking.
