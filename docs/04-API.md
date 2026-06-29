# API Specification

# Intersmart Employee Portal

Version 1.0

---

# API Overview

Backend

Laravel 12

API Style

REST

Authentication

Laravel Sanctum

Response Format

JSON

Base URL

/api/v1

All endpoints shall return JSON.

---

# Standard Response Format

Success

{
    "success": true,
    "message": "Operation completed successfully.",
    "data": {}
}

Validation Error

{
    "success": false,
    "message": "Validation failed.",
    "errors": {
        "official_email": [
            "Official email is required."
        ]
    }
}

Unauthorized

{
    "success": false,
    "message": "Unauthorized."
}

Server Error

{
    "success": false,
    "message": "Internal Server Error."
}

---

# Authentication

POST

/auth/login

Request

{
    "official_email": "",
    "password": ""
}

Response

{
    "token":"",
    "user":{},
    "permissions":[]
}

---

POST

/auth/logout

---

GET

/auth/me

Returns

Employee Profile

Role

Permissions

Team

Leave Balance

---

POST

/auth/forgot-password

---

POST

/auth/reset-password

---

# Employee APIs

GET

/employees

List Employees

Supports

Search

Pagination

Sorting

Filtering

---

GET

/employees/{id}

Employee Details

---

POST

/employees

Create Employee

---

PUT

/employees/{id}

Update Employee

---

DELETE

/employees/{id}

Soft Delete

Requires

Reason

---

PATCH

/employees/{id}/enable

---

PATCH

/employees/{id}/disable

---

PATCH

/employees/{id}/reset-password

---

PATCH

/employees/{id}/team

Transfer Employee

---

PATCH

/employees/{id}/leave-balance

Adjust Leave Balance

Admin Only

---

# Team APIs

GET

/teams

---

POST

/teams

---

PUT

/teams/{id}

---

DELETE

/teams/{id}

---

PATCH

/teams/{id}/lead

Assign Team Lead

---

GET

/teams/{id}/members

---

# Dashboard APIs

GET

/dashboard/employee

Employee Dashboard

---

GET

/dashboard/teamlead

Team Lead Dashboard

---

GET

/dashboard/admin

Super Admin Dashboard

---

# Leave APIs

GET

/leaves

Employee Leave History

---

POST

/leaves

Apply Leave

Request

Leave Date

Leave Type

Reason

---

GET

/leaves/{id}

---

PUT

/leaves/{id}/cancel

Employee Cancel Leave

Pending Only

---

GET

/leaves/pending

Approval Queue

---

PATCH

/leaves/{id}/approve

Team Lead

Super Admin

---

PATCH

/leaves/{id}/reject

Request

{
   "reason":""
}

---

GET

/leaves/balance

Returns

Casual Leave

Sick Leave

Leaves Taken

Pending

---

GET

/leaves/calendar

Personal Calendar

---

# Holiday APIs

GET

/holidays

---

POST

/holidays

---

PUT

/holidays/{id}

---

DELETE

/holidays/{id}

---

# Company Updates

GET

/announcements

---

POST

/announcements

---

PUT

/announcements/{id}

---

DELETE

/announcements/{id}

---

POST

/announcements/{id}/wish

Employee wishes

---

# HR Policies

GET

/policies

---

POST

/policies

---

PUT

/policies/{id}

---

DELETE

/policies/{id}

---

# Document APIs

GET

/document-types

---

POST

/document-requests

Employee Request

---

GET

/document-requests

---

GET

/document-requests/{id}

---

PATCH

/document-requests/{id}/upload

HR Upload

---

PATCH

/document-requests/{id}/complete

---

GET

/downloads

Employee Downloads

---

# View The Hall

GET

/view-hall

Returns

Employees

Team

Status

Working

Leave

WFH

Half Day

Supports

Search

Filters

Pagination

---

# Notification APIs

GET

/notifications

---

PATCH

/notifications/read

---

PATCH

/notifications/read-all

---

DELETE

/notifications/{id}

---

# Reports

GET

/reports/employees

---

GET

/reports/leaves

---

GET

/reports/documents

---

GET

/reports/holidays

---

GET

/reports/audit

---

Supports

Excel

PDF

CSV

---

# Audit Logs

GET

/audit-logs

Admin Only

Supports

Search

Date Filter

Employee Filter

Module Filter

---

# Settings

GET

/settings

---

PUT

/settings

---

# Validation Rules

Every endpoint shall validate:

Authentication

Authorization

Request Payload

Business Rules

Duplicate Records

File Types

File Sizes

Dates

Relationships

---

# Status Codes

200 OK

201 Created

204 Deleted

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# Pagination

All list endpoints shall support

?page=

?per_page=

?search=

?sort=

?direction=

?filters=

---

# Security

Rate Limiting

Sanctum Authentication

Role Permissions

Audit Logging

CSRF

Secure File Upload

Input Sanitization

Authorization Policies

---

# Versioning

Every endpoint shall be versioned.

/api/v1/

Future

/api/v2/

---

# Future APIs

Attendance

Payroll

Recruitment

Performance

Assets

Training

Exit Management

Biometric Integration

Microsoft Teams

Google Calendar