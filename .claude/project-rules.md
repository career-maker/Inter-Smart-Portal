# Project Rules

Project: Intersmart Employee Portal

These rules are mandatory.

Claude shall follow these rules throughout the entire project.

---

## Rule 1

Always read the following files before implementing any feature.

- CLAUDE.md
- IMPLEMENTATION_ORDER.md
- docs/01-FRS.md
- docs/12-CODING-STANDARDS.md
- Relevant module task document

---

## Rule 2

Never start a new module until the current module is completed.

---

## Rule 3

Never create placeholder implementations.

Forbidden:

- TODO comments
- Fake data
- Hardcoded responses
- Incomplete screens

---

## Rule 4

Every feature must include:

- Backend
- Frontend
- Validation
- Permissions
- Notifications
- Audit Logs
- Responsive UI
- Tests

---

## Rule 5

Use enterprise architecture.

Presentation Layer

↓

Controller

↓

Request Validation

↓

Service Layer

↓

Repository Layer

↓

Model

↓

Database

---

## Rule 6

Business logic shall only exist inside Services.

Never place business logic inside:

- Controllers
- Components
- Models
- Views

---

## Rule 7

Every page shall support:

- Loading State
- Empty State
- Error State

---

## Rule 8

Every form shall support:

- Client Validation
- Server Validation
- Error Messages
- Success Messages

---

## Rule 9

Every action shall create Audit Logs.

Examples:

- Login
- Logout
- Leave Approval
- Employee Creation
- Document Upload
- Settings Changes

---

## Rule 10

Every module must be mobile responsive.

Supported Breakpoints

- 1920
- 1440
- 1366
- 1024
- 768
- 430
- 390
- 375
- 360

---

## Rule 11

Accessibility is mandatory.

Support:

- Keyboard Navigation
- Focus States
- Screen Readers
- Color Contrast

---

## Rule 12

No breaking changes.

Always verify:

- Existing tests pass
- Existing modules still work

---

## Rule 13

Definition of Done

Feature is complete only if:

✔ Backend completed

✔ Frontend completed

✔ Validation completed

✔ Permissions completed

✔ Notifications completed

✔ Audit Logs completed

✔ Responsive UI completed

✔ Tests passing

✔ Documentation updated

✔ No build errors

✔ No lint errors
