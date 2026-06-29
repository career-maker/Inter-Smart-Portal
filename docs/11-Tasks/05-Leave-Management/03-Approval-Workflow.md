# Leave Management

## Module 3

# Leave Approval Workflow

Project

Intersmart Employee Portal

Version 1.0

---

# Purpose

This module implements the complete approval workflow for Leave and Work From Home (WFH) requests.

The workflow ensures that:

- Every employee request is reviewed by the correct approver.
- Team Leads approve requests from employees in their own team.
- HR/Super Admin approves requests submitted by Team Leads.
- Employees are notified of every status change.
- Leave balances are updated only after approval.
- Every action is recorded in the audit log.

---

# Workflow Rules

Employee

↓

Team Lead Approval

↓

Approved

↓

Leave Balance Updated

↓

Calendar Updated

↓

View The Hall Updated

↓

Employee Notified

---

If requester is Team Lead

↓

HR / Super Admin Approval

↓

Approved

↓

Notifications

---

# Completion Criteria

✔ Approval Workflow Working

✔ Reject Workflow Working

✔ Email Notifications Working

✔ Website Notifications Working

✔ Leave Balance Updated

✔ View The Hall Updated

✔ Calendar Updated

✔ Reports Updated

✔ Audit Logs Created

✔ Tests Passing

---

# Section 1

## Approval Routing

LEAVE-APR-001

Detect Requester's Team

Status

Not Started

---

LEAVE-APR-002

Find Team Lead

Status

Not Started

---

LEAVE-APR-003

Verify Team Lead Active

Status

Not Started

---

LEAVE-APR-004

If Team Lead Disabled

Route to HR

Status

Not Started

---

LEAVE-APR-005

If Requester Is Team Lead

Route directly to HR/Super Admin

Status

Not Started

---

LEAVE-APR-006

Verify Approver Permission

Status

Not Started

---

# Section 2

## Email Generation

LEAVE-APR-007

Generate Approval Email

Status

Not Started

---

LEAVE-APR-008

Email Subject

Leave Approval Required

Status

Not Started

---

LEAVE-APR-009

Email Shall Include

Employee Name

Employee Code

Designation

Team

Leave Type

Leave Date

Reason

Leave Balance

Status

Not Started

---

LEAVE-APR-010

Generate Secure Approval Link

Status

Not Started

---

LEAVE-APR-011

Generate Secure Reject Link

Status

Not Started

---

LEAVE-APR-012

CC HR

Status

Not Started

---

LEAVE-APR-013

CC Super Admin

Status

Not Started

---

LEAVE-APR-014

Reply-To Employee Official Email

Status

Not Started

---

# Section 3

## Approval Screen

LEAVE-APR-015

Open Leave Details

Status

Not Started

---

LEAVE-APR-016

Display Employee Profile

Status

Not Started

---

LEAVE-APR-017

Display Leave Balance

Status

Not Started

---

LEAVE-APR-018

Display Previous Leave History

Status

Not Started

---

LEAVE-APR-019

Display Team Calendar

Status

Not Started

---

LEAVE-APR-020

Highlight Team Members Already On Leave

Status

Not Started

---

# Section 4

## Approval Actions

LEAVE-APR-021

Approve Request

Status

Not Started

---

LEAVE-APR-022

Reject Request

Status

Not Started

---

LEAVE-APR-023

Reject Reason Mandatory

Status

Not Started

---

LEAVE-APR-024

Prevent Double Approval

Status

Not Started

---

LEAVE-APR-025

Prevent Double Rejection

Status

Not Started

---

LEAVE-APR-026

Prevent Approval After Expiry

Status

Not Started

---

LEAVE-APR-027

Prevent Unauthorized Approval

Status

Not Started

---

# Section 5

## Database Updates

LEAVE-APR-028

Status = Approved

Status

Not Started

---

LEAVE-APR-029

Status = Rejected

Status

Not Started

---

LEAVE-APR-030

Save Approval Timestamp

Status

Not Started

---

LEAVE-APR-031

Save Approver

Status

Not Started

---

LEAVE-APR-032

Save Reject Reason

Status

Not Started

---

LEAVE-APR-033

Create Approval Transaction

Status

Not Started

---

# Section 6

## Leave Balance

LEAVE-APR-034

Deduct Casual Leave

Status

Not Started

---

LEAVE-APR-035

Deduct Sick Leave

Status

Not Started

---

LEAVE-APR-036

Half-Day Deduction

Status

Not Started

---

LEAVE-APR-037

WFH Does Not Reduce Balance

Status

Not Started

---

LEAVE-APR-038

Generate Leave Transaction

Status

Not Started

---

LEAVE-APR-039

Refresh Leave Balance

Status

Not Started

---

# Section 7

## Employee Notification

LEAVE-APR-040

Send Approval Email

Status

Not Started

---

LEAVE-APR-041

Send Rejection Email

Status

Not Started

---

LEAVE-APR-042

Create Website Notification

Status

Not Started

---

LEAVE-APR-043

Display Notification Badge

Status

Not Started

---

LEAVE-APR-044

Mark Notification Read

Status

Not Started

---

# Section 8

## Calendar Integration

LEAVE-APR-045

Update Personal Calendar

Status

Not Started

---

LEAVE-APR-046

Update Team Calendar

Status

Not Started

---

LEAVE-APR-047

Update Company Calendar

Status

Not Started

---

LEAVE-APR-048

Update View The Hall

Status

Not Started

---

LEAVE-APR-049

Refresh Dashboard Widgets

Status

Not Started

---

# Section 9

## Edge Cases

LEAVE-APR-050

Approver On Leave

Automatically Route To HR

Status

Not Started

---

LEAVE-APR-051

Employee Disabled Before Approval

Cancel Request

Status

Not Started

---

LEAVE-APR-052

Duplicate Approval Link Click

Display Already Processed

Status

Not Started

---

LEAVE-APR-053

Expired Approval Link

Display Expired Message

Status

Not Started

---

LEAVE-APR-054

Email Delivery Failure

Retry Queue

Status

Not Started

---

LEAVE-APR-055

Queue Failure Logging

Status

Not Started

---

# Section 10

## Audit Logs

LEAVE-APR-056

Approval Logged

Status

Not Started

---

LEAVE-APR-057

Rejection Logged

Status

Not Started

---

LEAVE-APR-058

Notification Logged

Status

Not Started

---

LEAVE-APR-059

Email Logged

Status

Not Started

---

LEAVE-APR-060

Leave Balance Logged

Status

Not Started

---

# Section 11

## Testing

LEAVE-APR-061

Unit Tests

Status

Not Started

---

LEAVE-APR-062

Feature Tests

Status

Not Started

---

LEAVE-APR-063

API Tests

Status

Not Started

---

LEAVE-APR-064

Notification Tests

Status

Not Started

---

LEAVE-APR-065

Email Tests

Status

Not Started

---

LEAVE-APR-066

Permission Tests

Status

Not Started

---

LEAVE-APR-067

Edge Case Tests

Status

Not Started

---

# Completion

LEAVE-APR-068

Module Sign-off

Acceptance Criteria

✔ Approval workflow complete

✔ Rejection workflow complete

✔ Notifications working

✔ Emails working

✔ Leave balance updates correctly

✔ Calendar updated

✔ View The Hall updated

✔ Audit logs generated

✔ Tests passing

Status

Not Started