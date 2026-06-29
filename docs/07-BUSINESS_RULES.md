# Business Rules

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the business logic governing the Employee Portal. All application behavior shall comply with these rules.

Where conflicts exist between this document and implementation, this document takes precedence.

---

# Employee Rules

- Every employee belongs to exactly one team.
- Every team has exactly one Team Lead.
- A Team Lead is also an Employee.
- An employee may only belong to one team at a time.
- Every employee has one official email used for login.
- Official email addresses must be unique.
- Employee Codes must be unique.
- Deleted employees shall not be permanently removed; use soft deletes.
- Disabled employees cannot log in.

---

# Joining Date

Joining Date is entered by HR or Super Admin.

The system shall automatically calculate:

- Years of service
- Months of service
- Days of service

Example:

You have been with Intersmart for

3 Years

2 Months

14 Days

Calculation updates daily.

---

# Age Calculation

Age is automatically calculated from Date of Birth.

Age is read-only.

---

# Leave Types

Supported Leave Types

- Casual Leave
- Sick Leave
- Half Day Casual Leave (Morning)
- Half Day Casual Leave (Afternoon)
- Work From Home (Full Day)
- Half Day WFH (Morning)
- Half Day WFH (Afternoon)

Late arrival and early leaving are not part of Version 1.

---

# Leave Balance Rules

Every employee receives:

Casual Leave

1 paid leave per month

Sick Leave

1 paid leave per month

---

# Casual Leave Carry Forward

Unused paid casual leave shall carry forward to the next calendar year.

Carry-forward shall occur automatically on January 1.

The maximum carry-forward limit shall be configurable in System Settings.

---

# Sick Leave Expiry

Unused sick leave expires on December 31.

No sick leave shall carry forward.

A fresh sick leave balance is granted on January 1.

---

# Leave Balance Adjustments

HR and Super Admin may manually:

- Increase balance
- Reduce balance
- Correct balance

Every adjustment shall create an audit log entry.

---

# Leave Application Rules

Employees may apply only for future dates.

Past dates are not allowed.

Current date is allowed if configured.

Reason is mandatory.

Leave type is mandatory.

Date is mandatory.

Duplicate leave requests for the same date are prohibited.

---

# Leave Approval Workflow

Employee

↓

Submit Request

↓

Status = Pending

↓

Email to Team Lead

↓

Team Lead Approves or Rejects

↓

Employee Notified

---

If Team Lead applies for leave

↓

Email goes directly to HR and Super Admin

↓

HR or Super Admin approves

---

# Leave Status

Pending

Approved

Rejected

Cancelled

Only Pending requests may be cancelled.

Approved leave cannot be edited.

Rejected leave cannot be edited.

---

# Leave Balance Deduction

Leave balance is deducted only after approval.

Pending requests shall not reduce available leave.

Rejected requests shall not affect balances.

Cancelled requests shall not affect balances.

---

# Unpaid Leave

If no paid leave balance remains:

The leave shall automatically be marked as Unpaid Leave.

Employees shall receive a warning before submission.

---

# WFH Rules

WFH follows the same approval workflow as leave.

WFH does not reduce leave balance.

WFH appears in:

- Dashboard
- Leave Calendar
- View The Hall

---

# Half Day Rules

Half-day leave deducts 0.5 leave.

Half-day WFH deducts 0 leave.

Morning and Afternoon selections are mandatory.

---

# Leave Calendar

Personal Calendar displays:

Approved Leave

Pending Leave

Rejected Leave

WFH

Half Day

Company Holidays

---

# Company Holidays

Only HR and Super Admin may manage holidays.

Employees cannot modify holidays.

If leave is requested on a holiday, the system shall warn the employee and prevent submission unless an override policy is enabled.

---

# Team Lead Rules

Each team has one active Team Lead.

If a Team Lead is disabled or deleted, a replacement must be assigned before the action is completed.

Team Leads may only approve leave requests from employees within their own team.

---

# View The Hall

Accessible only to:

- Team Leads
- HR
- Super Admin

Displays today's status only.

Statuses include:

- Working
- WFH
- Leave
- Half Day
- Holiday

---

# HR Document Requests

Employees may request:

- Predefined document types
- Custom document requests

HR uploads the completed document.

The employee receives:

- Email notification
- In-app notification

The document then appears in the employee's Downloads section.

---

# Company Updates

HR and Super Admin manage announcements.

Supported announcement types:

- Birthday
- Work Anniversary
- Company Announcement
- Emergency Notice

Employees may submit wishes for birthdays and work anniversaries.

---

# Notifications

Notifications are generated for:

- Leave submitted
- Leave approved
- Leave rejected
- Document uploaded
- Company announcement
- New HR policy
- Birthday reminder
- Work anniversary reminder

Unread notifications shall remain highlighted until viewed.

---

# Security Rules

Passwords shall be stored using secure hashing.

Passwords shall never be emailed in plain text after the initial account setup.

All sensitive actions shall require authentication.

---

# Audit Rules

The system shall log:

- Login
- Logout
- Employee creation
- Employee update
- Employee deletion
- Team changes
- Leave approvals
- Leave rejections
- Leave balance changes
- Holiday changes
- HR policy updates
- Document uploads
- Password resets

Audit logs are immutable.

---

# Dashboard Rules

Employee Dashboard:

- Show leave balances
- Show service duration
- Show pending requests
- Show quick actions
- Show company updates

Team Lead Dashboard:

All Employee widgets plus:

- Pending approvals
- Team status
- Team leave summary

Super Admin Dashboard:

Executive overview with organization-wide analytics.

---

# Performance Rules

Dashboard load time should be under 2 seconds under normal conditions.

Pagination is required for large datasets.

Heavy reports shall be generated asynchronously.

---

# Future Business Rules

The architecture shall support future modules:

- Attendance
- Payroll
- Recruitment
- Performance Reviews
- Asset Management
- Training
- Exit Management

Future rules shall extend this document without modifying existing behavior.