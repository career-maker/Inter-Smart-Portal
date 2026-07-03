# Functional Requirements Specification (FRS)

# Intersmart Employee Portal

**Document Version:** 1.0

**Project Name:** Intersmart Employee Portal

**Company:** Intersmart

**Document Type:** Functional Requirements Specification

**Status:** Draft

---

# 1. Introduction

## 1.1 Purpose

The purpose of this application is to provide a centralized employee self-service and HR management platform for Intersmart.

The system shall digitize HR operations, reduce manual work, automate approval workflows, improve communication, and provide management with real-time visibility into employee availability and organizational activities.

The application shall support role-based access control and provide separate dashboards for Employees, Team Leads, and Super Administrators.

---

## 1.2 Objectives

The system shall enable:

* Secure employee authentication using official company email addresses.
* Employee profile management.
* Team and Team Lead management.
* Leave and Work From Home (WFH) request workflows.
* Automated leave balance calculation.
* Company-wide announcements and updates.
* HR document requests and downloads.
* Holiday calendar management.
* In-app and email notifications.
* Executive dashboards with infographic-style analytics.
* Audit logging of important actions.
* Future expansion into attendance, payroll, and performance modules.

---

# 2. User Roles

## 2.1 Employee

Employees can:

* Log in.
* View personal dashboard.
* View employee profile.
* Apply for leave.
* Apply for Work From Home.
* View leave balances.
* View personal leave calendar.
* View company updates.
* Request HR documents.
* Download HR documents.
* View HR policies.
* Receive notifications.

Employees cannot:

* Approve leave requests.
* View leave status of other employees.
* Access administrative modules.

---

## 2.2 Team Lead

A Team Lead shall inherit all Employee permissions.

Additionally, a Team Lead can:

* Receive leave approval requests from team members.
* Approve or reject leave requests.
* Enter rejection reasons.
* View the leave status of team members.
* Access the "View The Hall" dashboard for organization-wide availability.

If a Team Lead submits a leave request, the approval shall be routed directly to the Super Admin.

---

## 2.3 Super Admin

The Super Admin has unrestricted access to the system.

Responsibilities include:

* Employee management.
* Team management.
* Role assignment.
* Password management.
* Leave balance management.
* Holiday calendar management.
* Company updates.
* HR policy management.
* Document request management.
* Reports.
* Dashboard configuration.
* Notification management.
* System settings.

---

# 3. Authentication

## Login

Users shall authenticate using:

* Official Email Address (Username)
* Password

No alternative usernames shall be accepted.

Passwords shall be securely hashed.

Session timeout and secure logout shall be enforced.

---

# 4. Employee Management

The Super Admin shall manage all employee records.

## Create Employee

The following information shall be captured.

### Personal Information

* First Name
* Last Name
* Date of Birth
* Age (Automatically calculated)
* Gender
* Blood Group
* Marital Status

### Address Information

* Permanent Address
* Current Address

### Employment Information

* Employee Code
* Designation
* Team
* Team Lead Assignment
* Joining Date

### Contact Information

* Official Email Address
* Personal Email Address
* Contact Number
* Alternate Contact Number

The application shall automatically calculate:

"You have been with Intersmart for X Years, X Months and X Days."

This value shall be displayed on the employee dashboard and profile.

---

## Employee Status

Each employee may have one of the following statuses:

* Active
* Disabled
* Resigned
* Terminated
* On Notice (Future Enhancement)

Disabled employees shall not be able to log in.

Deletion of employee records shall require a mandatory reason and shall be recorded in the audit log.

---

# 5. Team Management

Each employee shall belong to exactly one team.

Each team shall have:

* Team Name
* Team Code
* Description (Optional)
* Team Lead
* Members

The Super Admin can:

* Create teams.
* Rename teams.
* Delete teams.
* Change Team Leads.
* Transfer employees between teams.

Team deletion shall not be permitted while active employees are assigned to the team.

---

# 6. Employee Dashboard

The dashboard shall present information visually using infographic-style components.

## Header

Display:

* Employee Name
* Designation
* Team Name
* Service Duration

Example:

"You have been with Intersmart for 3 Years 4 Months 12 Days."

---

## Summary Cards

The following KPI cards shall be displayed:

* Casual Leave Balance
* Sick Leave Balance
* Total Leaves Taken
* Pending Leave Requests

An "Apply for Leave" action button shall be displayed alongside these cards.

---

## Quick Actions

Employees shall have access to:

* Leaves & WFH
* Leave Calendar
* Request HR Documents
* Downloads
* Company Updates
* HR Policies
* My Profile

Only Team Leads and Super Admin shall additionally see:

* View The Hall

---

## Dashboard Widgets

The dashboard may include:

* Upcoming Holidays
* Recent Notifications
* Birthday Announcements
* Work Anniversary Announcements
* Recent Downloads
* Latest Company Updates

Widgets shall be responsive and configurable in future versions.

---

# 7. Leave & WFH Management

Employees shall submit leave requests through a popup form.

## Fields

### Leave Date

* Defaults to the current date.
* Editable.

### Leave Type

Supported options:

* Sick Leave
* Casual Leave
* Half Day Sick Leave (Morning)
* Half Day Sick Leave (Afternoon)
* Half Day Casual Leave (Morning)
* Half Day Casual Leave (Afternoon)
* Work From Home (Morning)
* Work From Home (Afternoon)
* Half Day WFH (Morning)
* Half Day WFH (Afternoon)

### Reason

A mandatory multiline text field.

---

## Leave Balance Information

Before submission, the employee shall see:

* Remaining Casual Leave Balance
* Remaining Sick Leave Balance
* Total Leaves Taken

If the selected leave type exceeds the available paid balance, the system shall clearly indicate that the leave will be treated as unpaid.

---

## Submission

Upon clicking "Submit for Approval", the system shall:

* Validate the request.
* Store the request.
* Mark the status as Pending.
* Trigger the approval workflow.

---

# 8. Leave Approval Workflow

When an employee submits a leave request:

1. The assigned Team Lead shall receive an email notification.
2. HR shall be CC'd.
3. Super Admin shall be CC'd.

The email shall contain:

* Employee Name
* Employee ID
* Designation
* Team
* Leave Type
* Leave Date
* Reason
* Approval Link
* Rejection Link

If approved:

* Status changes to Approved.
* Employee receives an email.
* Employee receives an in-app notification.

If rejected:

* Team Lead must enter a rejection reason.
* Status changes to Rejected.
* Employee receives an email.
* Employee receives an in-app notification showing the rejection reason.

If the requester is a Team Lead, the approval request shall bypass the Team Lead stage and be routed directly to the Super Admin.

---

# 9. Leave Balance Rules

The application shall automatically maintain leave balances.

Rules:

* One paid Casual Leave shall be credited each month.
* One paid Sick Leave shall be credited each month.
* Unused Sick Leave expires on 31 December of the current year.
* Unused Casual Leave carries forward to the next calendar year.
* Super Admin may manually adjust balances at any time.

Every leave transaction shall be recorded in the leave ledger for audit purposes.

---

# 10. Acceptance Criteria (Initial Sections)

The system shall:

* Authenticate users securely.
* Enforce role-based permissions.
* Display infographic dashboards.
* Support employee, Team Lead, and Super Admin roles.
* Automatically calculate service duration.
* Automatically maintain leave balances.
* Route leave requests through the correct approval hierarchy.
* Generate email and in-app notifications for all leave actions.

---

# 11. Company Updates Module

## Purpose

The Company Updates module shall serve as the centralized communication platform for announcements, employee recognition, celebrations, and important notices.

The module shall display updates as visually appealing popup banners and dashboard cards.

---

## Employee Features

Employees shall be able to:

* View all active updates.
* View birthday announcements.
* View work anniversary announcements.
* View company announcements.
* View emergency notifications.
* Wish employees on birthdays.
* Congratulate employees on work anniversaries.

Employees shall not be permitted to edit or delete updates.

---

## Super Admin Features

The Super Admin shall be able to:

* Create announcements.
* Edit announcements.
* Delete announcements.
* Schedule announcements.
* Expire announcements.
* Pin important announcements.
* Upload banner images.
* Upload promotional posters.
* Configure popup duration.
* Choose display priority.

---

## Update Categories

Supported categories include:

* Birthday
* Work Anniversary
* Company Announcement
* Holiday Notice
* Emergency Notice
* Event Invitation
* Training Program
* Policy Update

Additional categories shall be configurable in future releases.

---

## Wishes

Birthday and Work Anniversary announcements shall include a "Wish" button.

Employees may submit congratulatory messages.

The recipient shall receive:

* In-app notification.
* Email notification (optional, configurable by Super Admin).

---

# 12. Leave Calendar

## Company Holiday Calendar

The Super Admin shall configure the annual holiday calendar.

Each holiday shall contain:

* Holiday Name
* Holiday Date
* Holiday Type
* Description (Optional)
* Applicable Teams (Optional)

Employees shall view holidays in:

* Monthly Calendar
* Yearly Calendar

---

## Personal Leave Calendar

Employees shall also have a personal leave calendar.

The calendar shall display:

* Approved Leave
* Pending Leave
* Rejected Leave
* WFH Days
* Half-Day Leave
* Company Holidays

Color coding shall differentiate each leave type.

---

# 13. HR Policies

## Purpose

Provide employees with easy access to company policies.

---

## Super Admin Functions

The Super Admin shall:

* Upload HR policies.
* Edit HR policies.
* Delete HR policies.
* Categorize policies.
* Archive old policies.
* Replace documents without changing links.

Supported formats:

* PDF
* DOCX
* Images

---

## Employee Functions

Employees shall:

* View policies.
* Search policies.
* Download policies.

Employees shall not modify policies.

---

# 14. Request HR Documents

Employees shall be able to request official documents from HR.

---

## Available Documents

Super Admin shall configure available document types.

Examples include:

* Salary Certificate
* Experience Certificate
* Employment Certificate
* Visa Letter
* Offer Letter Copy
* Appointment Letter Copy
* Relieving Letter
* Increment Letter

---

## Custom Request

Employees shall also have a "Custom Request" option.

Fields:

* Subject
* Description
* Additional Notes

---

## Workflow

Employee submits request.

System shall:

* Save request.
* Generate request number.
* Notify HR.
* Notify Super Admin.
* Create audit log.

HR shall receive an email containing a secure upload link.

---

## HR Upload

HR shall upload the requested document.

Fields:

* Document File
* Comments (Optional)

Upon submission:

* Employee receives email.
* Employee receives portal notification.
* Document appears under Downloads.

---

# 15. Downloads

Employees shall have a Downloads section.

Displays:

* Document Name
* Requested Date
* Uploaded Date
* File Type
* Download Button

Employees shall only access their own documents.

Super Admin may:

* Replace documents.
* Remove documents.
* Re-upload corrected files.

---

# 16. View The Hall

## Access

Only:

* Team Leads
* Super Admin

shall have access.

---

## Purpose

Display today's employee availability across all teams.

---

## Employee Status

Each employee shall display one status.

Examples:

* Working
* Casual Leave
* Sick Leave
* Half Day Leave
* WFH
* Half Day WFH

---

## Hall View

Display:

* Team
* Employee Name
* Employee Code
* Designation
* Today's Status

---

## Search

Search by:

* Employee Name
* Employee Code
* Team
* Designation

---

## Filters

Filter by:

* Team
* Status
* Designation

---

## Dashboard Cards

Top summary shall display:

* Employees Working
* Employees on Leave
* Employees on WFH
* Half Day Employees
* Total Employees

Charts shall update automatically.

---

# 17. Notifications

Two notification systems shall exist.

## In-App Notifications

Examples:

* Leave Approved
* Leave Rejected
* Leave Pending
* Document Uploaded
* Birthday Wishes
* Work Anniversary Wishes
* Company Announcements
* Policy Updates

---

## Email Notifications

System shall automatically send emails for:

* Leave Request
* Leave Approval
* Leave Rejection
* Document Request
* Document Upload
* Birthday
* Work Anniversary
* Important Announcement

Email templates shall be manageable.

---

# 18. Employee Profile

Employees may view their profile.

Editable fields:

None.

Only Super Admin may edit profile information.

---

## Profile Information

Display:

Personal Information

Employment Information

Contact Information

Address Information

Leave Summary

Service Duration

Blood Group

Emergency Contacts (Future)

Profile Picture

---

# 19. Reports

The Super Admin shall generate reports.

Supported reports include:

Employee Report

Leave Report

Leave Balance Report

Team Report

Document Request Report

Company Update Report

Holiday Report

System Activity Report

---

## Report Filters

Filter by:

* Employee
* Team
* Date Range
* Leave Type
* Department
* Status

---

## Export Formats

* Excel
* PDF
* CSV

---

# 20. Audit Logs

Every critical action shall be recorded.

Examples:

* Login
* Logout
* Leave Request
* Leave Approval
* Leave Rejection
* Employee Created
* Employee Updated
* Employee Disabled
* Password Reset
* Holiday Added
* Policy Updated
* Document Uploaded

Audit records shall contain:

* User
* Action
* Module
* Timestamp
* IP Address
* Browser Information

Audit logs shall not be editable.

---

# 21. Security Requirements

The system shall implement:

* HTTPS
* Password Hashing
* Role-Based Authorization
* Secure Session Management
* CSRF Protection
* XSS Protection
* SQL Injection Protection
* Secure File Upload Validation
* Login Rate Limiting
* Password Reset Tokens
* Audit Logging

Sensitive operations shall require authorization checks.

---

# 22. Business Rules

* Official Email Address shall be unique.
* Employee Code shall be unique.
* An employee shall belong to exactly one team.
* A team shall have only one active Team Lead.
* Disabled employees shall not log in.
* Deleted employees shall be soft-deleted unless permanently removed by an authorized administrator.
* Leave balances shall update automatically after approval.
* Sick Leave shall expire on 31 December.
* Casual Leave shall carry forward to the next year.
* Team Leads shall approve only their own team members' requests.
* Team Lead leave requests shall always be approved by the Super Admin.

---

# 23. Validation Rules

Examples:

Employee Creation

* First Name Required
* Last Name Required
* Employee Code Required
* Official Email Required
* Joining Date Required

Leave Request

* Date Required
* Leave Type Required
* Reason Required
* Date cannot be in the past unless explicitly allowed by policy.

Document Request

* Document Type Required
* Subject Required for Custom Requests

All validation messages shall be user-friendly.

---

# 24. Acceptance Criteria

The project shall be considered functionally complete when:

* All users authenticate securely.
* Role-based permissions are fully enforced.
* Employees can submit leave requests.
* Team Leads can approve or reject leave requests.
* Super Admin can manage employees, teams, holidays, policies, documents, and updates.
* Leave balances are automatically calculated according to company policy.
* Notifications are sent via email and in-app.
* Company updates, birthdays, and work anniversaries are displayed correctly.
* Employees can request and download HR documents.
* The Hall accurately reflects daily employee availability.
* Reports can be filtered and exported.
* Audit logs capture all critical actions.
* The UI is responsive, modern, and infographic-driven.
cc