# Backend Rules

Project: Intersmart Employee Portal

---

## Architecture

Use:

Controller

↓

Request Validation

↓

Service

↓

Repository

↓

Model

---

## Controllers

Controllers shall:

- Validate Request
- Call Service
- Return Response

Maximum Length

200 lines.

No business logic.

---

## Services

Services shall contain:

- Business Rules
- Workflows
- Calculations
- Notifications

---

## Repositories

Repositories shall contain:

Database operations only.

No business logic.

---

## Validation

Validate all inputs.

Never trust client-side validation.

---

## Security

Implement:

- Authentication
- Authorization
- Rate Limiting
- CSRF Protection
- XSS Protection
- SQL Injection Protection

---

## Authorization

Use Role Based Access Control.

Roles:

- Employee
- Team Lead
- HR
- Super Admin

---

## Email

All emails shall:

- Use Queue
- Use Templates
- Retry on Failure

---

## Notifications

Support:

- Email
- In App

Future Ready:

- SMS
- Teams
- Slack

---

## Logging

Log:

- Login
- Leave Approval
- Document Request
- Settings Changes
- Errors

---

## Error Handling

Use centralized exception handling.

Never expose stack traces.

---

## APIs

Use REST standards.

Response Format

{
  "success": true,
  "message": "",
  "data": {}
}

Use proper HTTP status codes.

---

## Jobs

Long running tasks must use Queue.

Examples:

- Emails
- Reports
- Notifications

---

## Performance

Avoid:

- N+1 Queries
- Duplicate Queries

Use:

- Eager Loading
- Caching
- Pagination
