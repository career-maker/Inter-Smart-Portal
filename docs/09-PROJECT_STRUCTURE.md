# Project Structure

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the official folder structure, naming conventions, architecture, and coding organization for the Intersmart Employee Portal.

Claude Code shall strictly follow this structure.

No files shall be placed outside the defined architecture unless explicitly approved.

---

# Architecture

The project consists of two independent applications.

```
intersmart-employee-portal/

│
├── backend/          Laravel 12 API
│
├── frontend/         Next.js 15 Application
│
├── docs/
│
├── docker/
│
├── scripts/
│
└── README.md
```

---

# Backend Structure

```
backend/

app/

├── Actions/

├── Console/

├── Enums/

├── Events/

├── Exceptions/

├── Helpers/

├── Http/

│   ├── Controllers/

│   ├── Middleware/

│   ├── Requests/

│   ├── Resources/

│   └── Responses/

│

├── Jobs/

├── Listeners/

├── Mail/

├── Models/

├── Notifications/

├── Observers/

├── Policies/

├── Providers/

├── Repositories/

├── Rules/

├── Services/

├── Traits/

└── ViewModels/

bootstrap/

config/

database/

├── factories/

├── migrations/

├── seeders/

routes/

storage/

tests/

```

---

# Controllers

Controllers must be thin.

Controllers may only:

- Validate request
- Call Service
- Return Resource

Business logic inside controllers is prohibited.

---

# Services

All business logic belongs inside Services.

Example

```
EmployeeService

LeaveService

HolidayService

DocumentService

DashboardService

NotificationService
```

---

# Repositories

Database access shall be isolated.

Repositories communicate with Eloquent.

Services communicate with Repositories.

Controllers never communicate directly with repositories.

---

# Form Requests

Every endpoint shall have its own Request class.

Examples

```
CreateEmployeeRequest

UpdateEmployeeRequest

ApplyLeaveRequest

CreateHolidayRequest

UploadDocumentRequest
```

---

# API Resources

Every API response shall use Resources.

Never return Eloquent models directly.

---

# Events

Use Laravel Events.

Examples

```
LeaveRequested

LeaveApproved

LeaveRejected

EmployeeCreated

DocumentUploaded
```

---

# Listeners

Examples

```
SendApprovalEmail

CreateNotification

WriteAuditLog

UpdateLeaveBalance
```

---

# Jobs

Long-running operations shall be queued.

Examples

```
SendBulkEmails

GenerateReports

UploadDocuments

SyncHolidayCalendar
```

---

# Notifications

Laravel Notification classes.

Examples

```
LeaveApprovedNotification

LeaveRejectedNotification

DocumentUploadedNotification

AnnouncementNotification
```

---

# Policies

Each model shall have a Policy.

Examples

```
EmployeePolicy

LeavePolicy

HolidayPolicy

DocumentPolicy
```

---

# Frontend Structure

```
frontend/

app/

components/

hooks/

lib/

providers/

services/

store/

types/

utils/

constants/

styles/

public/

tests/

```

---

# Components

```
components/

ui/

layout/

dashboard/

employee/

leave/

calendar/

documents/

notifications/

charts/

tables/

forms/

```

---

# UI Components

Reusable only.

Examples

```
Button

Input

Modal

Card

Badge

Table

Tabs

Avatar

Calendar

```

---

# Feature Components

Examples

```
EmployeeCard

LeaveCard

HolidayCard

ApprovalQueue

DocumentList

AnnouncementBanner

DashboardChart
```

---

# Hooks

Examples

```
useAuth

useEmployee

useLeave

useDashboard

useNotification

useHoliday

```

---

# Services

API communication only.

Examples

```
employee.service.ts

leave.service.ts

holiday.service.ts

dashboard.service.ts

document.service.ts

```

---

# State Management

Zustand

Stores

```
authStore

themeStore

notificationStore

dashboardStore

```

---

# Types

Every API object shall have a TypeScript interface.

Examples

```
Employee.ts

Leave.ts

Holiday.ts

Announcement.ts

Notification.ts

```

---

# Constants

Examples

```
LeaveTypes

Roles

Permissions

Routes

Colors

```

---

# Utilities

Examples

```
date.ts

currency.ts

helpers.ts

validators.ts

```

---

# Pages

App Router

Examples

```
/dashboard

/employees

/leave

/calendar

/documents

/settings

```

---

# Naming Conventions

Folders

kebab-case

Files

kebab-case

Classes

PascalCase

Interfaces

PascalCase

Variables

camelCase

Constants

UPPER_CASE

Database Tables

snake_case

Columns

snake_case

Routes

kebab-case

---

# Import Rules

Absolute imports preferred.

Avoid deep relative imports.

---

# Configuration

Environment variables only.

Never hardcode

API URLs

Email

Secrets

Keys

Passwords

---

# Logging

Every exception shall be logged.

Every critical action shall be audited.

---

# Documentation

Every Service shall contain PHPDoc.

Complex methods require comments.

---

# Code Rules

Single Responsibility Principle

DRY

KISS

SOLID

Dependency Injection

Strict Typing

Reusable Components

---

# Git Branch Strategy

main

production

develop

feature/*

bugfix/*

hotfix/*

release/*

---

# Commit Format

feat:

fix:

refactor:

docs:

style:

test:

perf:

chore:

Examples

```
feat: implement leave approval workflow

fix: resolve leave balance calculation

docs: update API specification

refactor: simplify dashboard service
```

---

# Pull Requests

Every PR shall include

Summary

Screenshots (if UI)

Testing Notes

Related Task

Checklist

---

# Future Modules

The structure shall support

Attendance

Payroll

Recruitment

Assets

Performance

Training

Exit Management

without requiring structural changes.

---

# Final Rule

The architecture defined in this document is mandatory.

Claude Code shall not introduce new architectural patterns without updating this document first.