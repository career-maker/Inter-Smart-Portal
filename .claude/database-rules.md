# Database Rules

Project: Intersmart Employee Portal

---

## Naming Convention

Tables

snake_case

Examples

employees

leave_requests

document_requests

---

## Columns

Use snake_case.

Examples

employee_code

joining_date

team_id

---

## Primary Keys

Use:

id

Big Integer

Auto Increment

---

## Foreign Keys

Always use foreign keys.

Example

team_id

references teams(id)

---

## Indexing

Create indexes for:

- Foreign Keys
- Search Fields
- Frequently Filtered Fields

---

## Required Indexes

Examples:

employee_code

official_email

team_id

status

created_at

---

## Soft Deletes

Use soft delete for:

- Employees
- Teams
- Leave Requests
- Documents

Never permanently delete business records.

---

## Auditability

Critical records must never be lost.

---

## Transactions

Use database transactions for:

- Leave Approval
- Employee Creation
- Team Transfer
- Document Upload

---

## Migrations

Never modify existing migrations.

Create new migrations for changes.

---

## Seeders

Create seeders for:

- Roles
- Permissions
- Teams
- Demo Employees

---

## Relationships

Always define relationships.

Examples:

Employee

belongsTo Team

Team

hasMany Employees

---

## Timestamps

Every table shall contain:

created_at

updated_at

---

## Audit Columns

Add:

created_by

updated_by

where applicable.
