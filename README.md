# Intersmart Employee Portal

> Enterprise Employee Management, Leave Management & HR Portal

---

# Project Overview

The **Intersmart Employee Portal** is an enterprise-grade internal web application that centralizes employee management, leave approvals, HR services, company updates, and reporting into a single platform.

The system is designed to provide a modern, infographic-driven dashboard experience while automating HR workflows such as leave approvals, document requests, notifications, and employee management.

The application is intended for internal use by Intersmart employees, Team Leads, HR, and Super Administrators.

---

# Project Goals

* Reduce manual HR processes
* Automate leave approval workflows
* Provide real-time employee availability
* Offer a premium SaaS-style user experience
* Improve communication between HR and employees
* Create a scalable platform for future HR modules

---

# Primary Modules

## Authentication

* Secure Login
* Password Reset
* Session Management
* Role-Based Access Control

---

## Employee Management

* Employee Profiles
* Team Assignment
* Employee Status
* Joining Information
* Leave Balance
* Contact Information

---

## Team Management

* Create Teams
* Assign Team Leads
* Move Employees
* Team Dashboard

---

## Leave Management

* Casual Leave
* Sick Leave
* Half-Day Leave
* Work From Home
* Half-Day WFH
* Leave Approval Workflow
* Leave History

---

## Leave Balance Management

Automatic Monthly Leave Allocation

Casual Leave Carry Forward

Sick Leave Expiry

Manual Adjustments by Super Admin

---

## Company Updates

* Birthday Announcements
* Work Anniversary Announcements
* Company News
* Popup Announcements

---

## HR Policies

* View Policies
* Download Policies
* Version History (Future)

---

## HR Documents

Employees can request:

* Salary Certificate
* Experience Letter
* Employment Certificate
* Visa Letter
* Offer Letter
* Any Custom Request

---

## Downloads

Employees can download:

* HR Documents
* Certificates
* Uploaded Files

---

## Dashboard

Infographic Dashboard

Charts

KPIs

Recent Activities

Quick Actions

Notifications

Upcoming Holidays

Birthday Cards

Leave Summary

---

## Reports

Employee Reports

Leave Reports

Department Reports

Document Reports

Export:

* Excel
* PDF
* CSV

---

# User Roles

## Employee

Can:

* Apply Leave
* View Leave Balance
* Request Documents
* Download Documents
* View Updates
* View HR Policies
* View Personal Dashboard
* View Personal Leave Calendar

Cannot:

* Approve Leave
* View Other Employees' Leave Status
* Manage Employees

---

## Team Lead

Includes all Employee permissions.

Additionally can:

* Approve Team Leave Requests
* Reject Leave Requests
* View Team Leave Status
* View "The Hall"
* Receive Approval Emails

---

## Super Admin

Complete system access.

Can manage:

* Employees
* Teams
* Roles
* Passwords
* Leave Rules
* Holidays
* Documents
* HR Policies
* Company Updates
* Reports
* Notifications
* Dashboard Configuration

---

# Technology Stack

## Backend

Laravel 12

PHP 8.4+

Laravel Sanctum

Spatie Permission

Queue

Scheduler

Mail

REST API

---

## Frontend

Next.js

React

TypeScript

Tailwind CSS

Shadcn/UI

React Hook Form

TanStack Query

Recharts

Framer Motion

Lucide Icons

---

## Database

MySQL 8

---

## File Storage

Local Storage

Amazon S3 (Future)

---

## Mail

SMTP

Microsoft 365

Google Workspace

---

# Project Structure

```
Intersmart-Employee-Portal

├── backend
├── frontend
├── database
├── docs
├── assets
├── prompts
├── CLAUDE.md
├── README.md
└── .env.example
```

---

# Documentation

The `/docs` folder contains the complete software documentation.

```
docs/

01-FRS.md

02-DATABASE.md

03-UI_UX.md

04-API.md

05-EMAIL_WORKFLOW.md

06-CODING_STANDARDS.md

07-DEVELOPMENT_PLAN.md

08-TASKS.md

09-ROLE_PERMISSION_MATRIX.md

10-NOTIFICATION_WORKFLOW.md

11-SECURITY.md

12-TESTING_PLAN.md

13-DEPLOYMENT.md
```

Claude must always read these documents before implementing new functionality.

---

# Development Workflow

Development shall proceed in the following order:

1. Authentication
2. Roles & Permissions
3. Employee Management
4. Team Management
5. Leave Management
6. Leave Balances
7. Holiday Calendar
8. Company Updates
9. HR Policies
10. Document Requests
11. Downloads
12. Notifications
13. Reports
14. Dashboard
15. Optimization
16. Testing
17. Deployment

Each phase must be completed, reviewed, and committed before moving to the next.

---

# Coding Principles

* SOLID
* DRY
* KISS
* Clean Architecture
* PSR Standards
* Reusable Components
* Secure by Default

---

# UI Principles

The UI must resemble a premium SaaS application.

The application shall not resemble a traditional HRMS.

Dashboard design inspiration:

* Linear
* Stripe
* Notion
* Vercel
* Asana
* Slack

Every screen must be:

* Modern
* Responsive
* Minimal
* Elegant
* Interactive

---

# Dashboard Philosophy

The dashboard is the centerpiece of the application.

Every important piece of information should be presented visually.

Avoid text-heavy pages.

Use:

* KPI Cards
* Charts
* Timelines
* Progress Indicators
* Status Cards
* Animated Counters
* Quick Actions
* Notifications

---

# Security Requirements

* HTTPS
* Authentication
* Authorization
* CSRF Protection
* XSS Prevention
* SQL Injection Protection
* Secure Password Hashing
* Audit Logs
* Role-Based Permissions

---

# Git Workflow

Commit after every completed module.

Example:

```
Authentication Completed

Employee Module Completed

Leave Module Completed

Dashboard Completed
```

Never commit incomplete work.

---

# Testing Strategy

Every feature must be tested for:

* Validation
* Authorization
* Responsiveness
* Database Integrity
* Email Notifications
* UI Consistency
* Error Handling

---

# Future Modules

The architecture should allow easy addition of:

* Attendance
* Payroll
* Asset Management
* Performance Reviews
* Recruitment
* Exit Management
* Mobile App
* Microsoft Teams Integration
* Google Calendar Sync

---

# Project Vision

Build a secure, scalable, enterprise-grade employee management platform that provides an exceptional user experience through automation, insightful dashboards, and modern interface design while reducing manual HR effort and supporting future organizational growth.
