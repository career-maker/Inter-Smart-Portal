# CLAUDE.md

# Intersmart Employee Portal

## Project Overview

You are the Lead Software Architect, Senior Full Stack Developer, UI/UX Designer, Database Architect, QA Engineer, DevOps Engineer, Security Engineer, and Product Owner for this project.

Your responsibility is to design and develop a production-ready Employee Management Portal for **Intersmart**.

This project is intended for internal company use and must be scalable, secure, responsive, maintainable, and suitable for future expansion.

---

# Golden Rules

These rules are mandatory.

Never ignore them.

## General Rules

* Never generate demo code.
* Never generate placeholder code.
* Never generate incomplete features.
* Never remove existing functionality unless instructed.
* Never assume database fields.
* Always refer to the documentation inside `/docs` before implementing any feature.
* If any requirement is unclear, ask before implementing.
* Never hardcode IDs or configuration values.
* Never duplicate business logic.
* Use reusable services, repositories, and components.

---

# Technology Stack

## Backend

Laravel 12

PHP 8.4+

Supabase (PostgreSQL 15+)

Laravel Sanctum Authentication

Spatie Permission Package

Queue System

Scheduler

Laravel Mail

REST API

---

## Frontend

Next.js (React)

TypeScript

Tailwind CSS

Shadcn/UI

React Hook Form

TanStack Query

Recharts

Lucide Icons

Framer Motion

---

## Database

Supabase (PostgreSQL)

Use:

* UUID where appropriate
* Foreign Keys
* Proper Indexes
* Soft Deletes
* Audit Logs

Never create unnecessary duplicate tables.

---

# Architecture

Follow Modular Architecture.

Modules include:

Authentication

Employee Management

Team Management

Role Management

Leave Management

Leave Balance

Holiday Management

Dashboard

Notifications

Company Updates

HR Policies

Document Requests

Downloads

Reports

Settings

Audit Logs

Each module must be isolated and maintainable.

---

# Dashboard Requirements

The dashboard is the most important part of the application.

It must NOT resemble a traditional admin panel.

It must resemble a premium SaaS application.

Design inspiration:

* Linear
* Stripe
* Notion
* Vercel
* Slack
* Monday.com
* Asana

---

Dashboard must include:

Modern KPI Cards

Animated Statistics

Charts

Graphs

Infographics

Recent Activities

Timeline

Quick Actions

Notifications

Upcoming Holidays

Birthday Cards

Work Anniversary Cards

Leave Balance Cards

Service Duration Card

Everything must feel interactive.

---

# UI Design Standards

Modern

Premium

Minimal

Elegant

Professional

High-end

Requirements:

Rounded corners

Glassmorphism (where appropriate)

Soft shadows

Responsive layouts

Smooth animations

Micro interactions

Consistent spacing

Accessibility

Dark Mode Ready

Light Mode Ready

Every page must look production-ready.

---

# Coding Standards

Use SOLID principles.

Use clean architecture.

Follow PSR standards.

Avoid large controllers.

Business logic belongs in Services.

Validation belongs in Form Requests.

Never duplicate code.

Create reusable components.

Always use dependency injection.

Always use proper exception handling.

---

# Security Standards

Role Based Permissions

Authentication Required

Authorization Checks

CSRF Protection

XSS Prevention

SQL Injection Protection

Rate Limiting

Password Hashing

Audit Logging

HTTPS Only

Secure File Uploads

Validate every request.

---

# Employee Roles

Employee

Team Lead

Super Admin

Permissions must always be role-based.

---

# Leave Rules

Employees receive:

1 Paid Casual Leave every month

1 Paid Sick Leave every month

Rules:

Unused Sick Leave expires on December 31.

Casual Leave carries forward.

System must automatically calculate balances.

Leave approval workflow must be automatic.

---

# Notifications

Support:

Email

In-App Notifications

Real-time Notifications

Notification history.

---

# Reports

Generate:

Employee Reports

Leave Reports

Team Reports

Attendance Summary (Future)

Document Requests

Export:

Excel

PDF

CSV

---

# Performance

Lazy Loading

Caching

Queue Long Jobs

Pagination

Optimized Queries

No N+1 Queries

---

# Documentation Rules

Before implementing any module:

Read:

* docs/01-FRS.md
* docs/02-DATABASE.md
* docs/03-UI_UX.md
* docs/04-API.md

Never implement features without consulting these documents.

---

# Development Workflow

Always follow this order:

1 Authentication

2 Roles & Permissions

3 Employee Management

4 Team Management

5 Leave Management

6 Leave Balance

7 Company Updates

8 HR Policies

9 Document Requests

10 Downloads

11 Notifications

12 Reports

13 Dashboard

14 Optimization

15 Testing

16 Deployment

Never skip a phase.

---

# Quality Standards

Every feature must include:

Validation

Authorization

Logging

Notifications

Error Handling

Responsive UI

Unit Tests (where practical)

Audit Trail

No unfinished features.

---

# Git Workflow

Each module should be committed separately.

Example:

Authentication Completed

Employee Module Completed

Leave Module Completed

Dashboard Completed

Never commit broken code.

---

# Testing Checklist

Before marking a feature complete:

✓ Validation Tested

✓ Authorization Tested

✓ Email Tested

✓ Notifications Tested

✓ Mobile Responsive

✓ Tablet Responsive

✓ Desktop Responsive

✓ Performance Checked

✓ Database Integrity Verified

---

# Final Objective

Build an enterprise-grade HR and Employee Management Portal for Intersmart.

The final product should be visually impressive, highly maintainable, secure, scalable, and production-ready, matching the quality of modern SaaS platforms while fully implementing the functional requirements documented in the project.

## Local Development Rule

The application must remain runnable after every implementation phase.

Before marking any phase complete, Claude shall:

- Start the local development server.
- Fix all build errors.
- Fix all runtime errors.
- Fix all console errors.
- Verify all implemented pages render correctly.
- Keep the application visually testable.
- Never leave the application in a broken state.