# Leave Management

## Module 4

# Leave Balance Engine

Project

Intersmart Employee Portal

Version 1.0

---

# Purpose

This module manages employee leave balances through a transaction-based ledger.

The system shall never update leave balances directly.

Every change to leave balances shall generate a Leave Transaction for complete auditability.

---

# Leave Rules

Casual Leave

- Earn 1 paid leave every month
- Carry forward to next year
- Carry-forward limit configurable by Super Admin

Sick Leave

- Earn 1 paid leave every month
- Does NOT carry forward
- Expires automatically on 31 December
- New balance starts on 1 January

WFH

- Does not deduct leave balance

Half Day

- Deduct 0.5 leave

Rejected Leave

- No deduction

Cancelled Pending Leave

- No deduction

Cancelled Approved Leave

- Restore balance (configurable)

---

# Completion Criteria

✔ Leave ledger working

✔ Monthly allocation working

✔ Carry forward working

✔ Sick leave expiry working

✔ Manual adjustments working

✔ Transaction history working

✔ Reports working

✔ Tests passing

---

# Section 1 – Database

LEAVE-BAL-001

Create Leave Balance Model

Status

Not Started

---

LEAVE-BAL-002

Create Leave Transaction Model

Status

Not Started

---

LEAVE-BAL-003

Create Leave Ledger Service

Status

Not Started

---

LEAVE-BAL-004

Create Balance Calculator Service

Status

Not Started

---

LEAVE-BAL-005

Create Leave Balance Repository

Status

Not Started

---

# Section 2 – Monthly Allocation

LEAVE-BAL-006

Allocate 1 Casual Leave Monthly

Status

Not Started

---

LEAVE-BAL-007

Allocate 1 Sick Leave Monthly

Status

Not Started

---

LEAVE-BAL-008

Run Monthly Scheduler

Status

Not Started

---

LEAVE-BAL-009

Skip Disabled Employees

Status

Not Started

---

LEAVE-BAL-010

Create Allocation Transaction

Status

Not Started

---

# Section 3 – Casual Leave

LEAVE-BAL-011

Increase Balance

Status

Not Started

---

LEAVE-BAL-012

Deduct Approved Leave

Status

Not Started

---

LEAVE-BAL-013

Deduct Half Day

Status

Not Started

---

LEAVE-BAL-014

Restore Cancelled Leave

Status

Not Started

---

LEAVE-BAL-015

Carry Forward Balance

Status

Not Started

---

LEAVE-BAL-016

Apply Carry Forward Limit

Status

Not Started

---

LEAVE-BAL-017

Generate Carry Forward Transaction

Status

Not Started

---

# Section 4 – Sick Leave

LEAVE-BAL-018

Increase Balance

Status

Not Started

---

LEAVE-BAL-019

Deduct Approved Leave

Status

Not Started

---

LEAVE-BAL-020

Deduct Half Day

Status

Not Started

---

LEAVE-BAL-021

Expire Remaining Balance

Status

Not Started

---

LEAVE-BAL-022

Generate Expiry Transaction

Status

Not Started

---

LEAVE-BAL-023

Reset Balance January 1

Status

Not Started

---

# Section 5 – WFH

LEAVE-BAL-024

Do Not Deduct Leave

Status

Not Started

---

LEAVE-BAL-025

Record WFH Transaction

Status

Not Started

---

# Section 6 – Manual Adjustments

LEAVE-BAL-026

Increase Casual Leave

Status

Not Started

---

LEAVE-BAL-027

Decrease Casual Leave

Status

Not Started

---

LEAVE-BAL-028

Increase Sick Leave

Status

Not Started

---

LEAVE-BAL-029

Decrease Sick Leave

Status

Not Started

---

LEAVE-BAL-030

Adjustment Reason Mandatory

Status

Not Started

---

LEAVE-BAL-031

Record Administrator

Status

Not Started

---

LEAVE-BAL-032

Audit Adjustment

Status

Not Started

---

# Section 7 – Employee Dashboard

LEAVE-BAL-033

Display Casual Leave Balance

Status

Not Started

---

LEAVE-BAL-034

Display Sick Leave Balance

Status

Not Started

---

LEAVE-BAL-035

Display Pending Leave Count

Status

Not Started

---

LEAVE-BAL-036

Display Total Leaves Taken

Status

Not Started

---

LEAVE-BAL-037

Display Upcoming Approved Leaves

Status

Not Started

---

LEAVE-BAL-038

Display Last Allocation Date

Status

Not Started

---

# Section 8 – Leave Ledger

LEAVE-BAL-039

View Transaction History

Status

Not Started

---

LEAVE-BAL-040

Search Transactions

Status

Not Started

---

LEAVE-BAL-041

Filter By Leave Type

Status

Not Started

---

LEAVE-BAL-042

Filter By Year

Status

Not Started

---

LEAVE-BAL-043

Export Ledger

Status

Not Started

---

# Section 9 – Reports

LEAVE-BAL-044

Leave Balance Report

Status

Not Started

---

LEAVE-BAL-045

Carry Forward Report

Status

Not Started

---

LEAVE-BAL-046

Expired Sick Leave Report

Status

Not Started

---

LEAVE-BAL-047

Manual Adjustment Report

Status

Not Started

---

LEAVE-BAL-048

Department Leave Report

Status

Not Started

---

# Section 10 – Scheduled Jobs

LEAVE-BAL-049

Monthly Allocation Job

Status

Not Started

---

LEAVE-BAL-050

Year-End Carry Forward Job

Status

Not Started

---

LEAVE-BAL-051

Year-End Sick Leave Expiry Job

Status

Not Started

---

LEAVE-BAL-052

January Reset Job

Status

Not Started

---

# Section 11 – Audit Logs

LEAVE-BAL-053

Allocation Audit

Status

Not Started

---

LEAVE-BAL-054

Deduction Audit

Status

Not Started

---

LEAVE-BAL-055

Carry Forward Audit

Status

Not Started

---

LEAVE-BAL-056

Expiry Audit

Status

Not Started

---

LEAVE-BAL-057

Manual Adjustment Audit

Status

Not Started

---

# Section 12 – Testing

LEAVE-BAL-058

Unit Tests

Status

Not Started

---

LEAVE-BAL-059

Feature Tests

Status

Not Started

---

LEAVE-BAL-060

Scheduler Tests

Status

Not Started

---

LEAVE-BAL-061

Ledger Tests

Status

Not Started

---

LEAVE-BAL-062

Report Tests

Status

Not Started

---

LEAVE-BAL-063

Audit Tests

Status

Not Started

---

# Completion

LEAVE-BAL-064

Module Sign-off

Acceptance Criteria

✔ Ledger operational

✔ Monthly allocation working

✔ Carry forward working

✔ Sick leave expiry working

✔ Dashboard updated

✔ Reports generated

✔ Audit logs complete

✔ Tests passing

Status

Not Started