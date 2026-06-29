# Technology Stack

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the approved technology stack for the Employee Portal.

Claude Code shall use only the technologies specified in this document unless explicitly approved.

---

# Architecture

The application shall follow a modern client-server architecture.

Frontend

↓

REST API

↓

Backend

↓

Database

↓

Storage

---

# Frontend

Framework

Next.js 15 (App Router)

Language

TypeScript

React Version

React 19

Package Manager

pnpm

---

# Backend

Framework

Laravel 12

Language

PHP 8.3+

Authentication

Laravel Sanctum

Authorization

Spatie Laravel Permission

Queue

Laravel Queue

Scheduler

Laravel Scheduler

Mail

Laravel Mail

Notifications

Laravel Notifications

Storage

Laravel Filesystem

API

REST

---

# Database

Engine

Supabase (PostgreSQL 15+)

Charset

utf8mb4

Storage Engine

Supabase Managed (PostgreSQL InnoDB equivalent)

---

# ORM

Laravel Eloquent

---

# Styling

Tailwind CSS

---

# UI Components

shadcn/ui

---

# Icons

Lucide Icons

---

# Charts

Recharts

---

# Animation

Framer Motion

---

# Forms

React Hook Form

Validation

Zod

---

# Data Fetching

TanStack Query

---

# Tables

TanStack Table

---

# Calendar

FullCalendar

---

# Date Library

date-fns

---

# HTTP Client

Axios

---

# State Management

Zustand

Local UI state

React State

---

# Notifications

Sonner

---

# File Upload

Laravel Media Library

Future

S3

Azure Blob

---

# Image Handling

Next Image

---

# PDF

Laravel DomPDF

Frontend

PDF Viewer

---

# Excel

Laravel Excel

---

# CSV

Laravel Excel

---

# Logging

Laravel Log

Monolog

---

# Testing

Backend

PHPUnit

Frontend

Vitest

E2E

Playwright

---

# Code Quality

PHP CS Fixer

Laravel Pint

ESLint

Prettier

TypeScript Strict Mode

---

# Version Control

Git

GitHub

---

# CI/CD

GitHub Actions

---

# Deployment

Frontend

Vercel

Backend

Laravel Forge / VPS

Database

Supabase (Hosted PostgreSQL)

Storage

Local → S3 Ready

---

# Security

HTTPS

CSRF Protection

XSS Protection

SQL Injection Protection

Rate Limiting

Secure Headers

Input Validation

Password Hashing (Argon2id)

Signed URLs

Audit Logs

---

# Browser Support

Chrome

Edge

Firefox

Safari

Latest two versions.

---

# Responsive Support

Desktop

Laptop

Tablet

Mobile

---

# Accessibility

WCAG 2.1 AA

---

# Performance Goals

Dashboard

<2 seconds

API Response

<500ms (typical)

Search

<300ms

---

# Future Integrations

Microsoft 365

Google Workspace

Slack

Microsoft Teams

WhatsApp Business API

Biometric Attendance

Payroll Software

LDAP / Active Directory

Single Sign-On (SSO)

---

# Technology Rules

- Use TypeScript everywhere on the frontend.
- Use strict typing.
- Avoid jQuery.
- Avoid inline JavaScript.
- Avoid inline CSS.
- Prefer reusable components over page-specific implementations.
- Follow Laravel and Next.js best practices.
- Write clean, documented, maintainable code.