# Role & Permission Matrix

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the authorization model for the Employee Portal.

Authorization shall be implemented using:

- Laravel Policies
- Laravel Gates
- Spatie Laravel Permission Package

Users shall never access resources beyond their assigned permissions.

---

# System Roles

The application supports four system roles:

1. Employee
2. Team Lead
3. HR
4. Super Admin

Each employee has exactly one primary role.

---

# General Permissions

| Module | Employee | Team Lead | HR | Super Admin |
|----------|:-------:|:---------:|:--:|:-----------:|
| Login | ✅ | ✅ | ✅ | ✅ |
| Logout | ✅ | ✅ | ✅ | ✅ |
| View Own Dashboard | ✅ | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ |
| View Own Notifications | ✅ | ✅ | ✅ | ✅ |

---

# Employee Management

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Own Profile | ✅ | ✅ | ✅ | ✅ |
| Edit Own Profile | ❌ | ❌ | ❌ | ❌ |
| View Employee List | ❌ | Team Only | ✅ | ✅ |
| View Employee Details | ❌ | Team Only | ✅ | ✅ |
| Create Employee | ❌ | ❌ | ✅ | ✅ |
| Edit Employee | ❌ | ❌ | ✅ | ✅ |
| Delete Employee | ❌ | ❌ | ❌ | ✅ |
| Disable Employee | ❌ | ❌ | ❌ | ✅ |
| Enable Employee | ❌ | ❌ | ❌ | ✅ |
| Reset Employee Password | ❌ | ❌ | ✅ | ✅ |

---

# Team Management

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Own Team | ✅ | ✅ | ✅ | ✅ |
| View All Teams | ❌ | ✅ | ✅ | ✅ |
| Create Team | ❌ | ❌ | ❌ | ✅ |
| Edit Team | ❌ | ❌ | ❌ | ✅ |
| Delete Team | ❌ | ❌ | ❌ | ✅ |
| Assign Team Lead | ❌ | ❌ | ❌ | ✅ |
| Transfer Employee Between Teams | ❌ | ❌ | ✅ | ✅ |

---

# Leave Management

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| Apply Leave | ✅ | ✅ | ✅ | ✅ |
| Cancel Own Pending Leave | ✅ | ✅ | ✅ | ✅ |
| View Own Leave History | ✅ | ✅ | ✅ | ✅ |
| View Team Leave History | ❌ | ✅ | ✅ | ✅ |
| View Company Leave Report | ❌ | ❌ | ✅ | ✅ |
| Approve Team Leave | ❌ | ✅ | ❌ | ✅ |
| Reject Team Leave | ❌ | ✅ | ❌ | ✅ |
| Approve Team Lead Leave | ❌ | ❌ | ❌ | ✅ |
| Modify Leave Balance | ❌ | ❌ | ✅ | ✅ |
| View Leave Balances | Own | Team | All | All |

---

# View The Hall

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| Access View The Hall | ❌ | ✅ | ✅ | ✅ |
| Search Employees | ❌ | ✅ | ✅ | ✅ |
| Filter by Team | ❌ | ✅ | ✅ | ✅ |
| View Status | ❌ | ✅ | ✅ | ✅ |

---

# Holiday Calendar

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Holidays | ✅ | ✅ | ✅ | ✅ |
| Create Holiday | ❌ | ❌ | ✅ | ✅ |
| Edit Holiday | ❌ | ❌ | ✅ | ✅ |
| Delete Holiday | ❌ | ❌ | ❌ | ✅ |

---

# Company Updates

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Updates | ✅ | ✅ | ✅ | ✅ |
| Wish Employee | ✅ | ✅ | ✅ | ✅ |
| Create Announcement | ❌ | ❌ | ✅ | ✅ |
| Edit Announcement | ❌ | ❌ | ✅ | ✅ |
| Delete Announcement | ❌ | ❌ | ❌ | ✅ |

---

# HR Policies

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Policies | ✅ | ✅ | ✅ | ✅ |
| Upload Policy | ❌ | ❌ | ✅ | ✅ |
| Edit Policy | ❌ | ❌ | ✅ | ✅ |
| Delete Policy | ❌ | ❌ | ❌ | ✅ |

---

# HR Documents

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| Request Document | ✅ | ✅ | ✅ | ✅ |
| View Own Downloads | ✅ | ✅ | ✅ | ✅ |
| View Document Requests | Own | Team | All | All |
| Upload Requested Document | ❌ | ❌ | ✅ | ✅ |
| Delete Uploaded Document | ❌ | ❌ | ✅ | ✅ |

---

# Notifications

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Own Notifications | ✅ | ✅ | ✅ | ✅ |
| Mark Read | ✅ | ✅ | ✅ | ✅ |
| Delete Notification | ✅ | ✅ | ✅ | ✅ |
| Broadcast Notification | ❌ | ❌ | ✅ | ✅ |

---

# Reports

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Reports | ❌ | Team | ✅ | ✅ |
| Export Excel | ❌ | Team | ✅ | ✅ |
| Export PDF | ❌ | Team | ✅ | ✅ |
| Export CSV | ❌ | Team | ✅ | ✅ |

---

# Audit Logs

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Audit Logs | ❌ | ❌ | Limited | ✅ |
| Export Audit Logs | ❌ | ❌ | ❌ | ✅ |

---

# System Settings

| Permission | Employee | Team Lead | HR | Super Admin |
|------------|:--------:|:---------:|:--:|:-----------:|
| View Settings | ❌ | ❌ | Limited | ✅ |
| Update Settings | ❌ | ❌ | Limited | ✅ |
| Configure Email | ❌ | ❌ | ❌ | ✅ |
| Configure Roles | ❌ | ❌ | ❌ | ✅ |
| Configure Permissions | ❌ | ❌ | ❌ | ✅ |

---

# Data Visibility Rules

Employees

- Can only view their own information.
- Cannot access another employee's profile.

Team Leads

- Can only view employees within their assigned team.
- Cannot edit employee personal information.
- Can approve or reject leave requests for their own team.

HR

- Can view all employee records.
- Can manage HR documents, policies, announcements, and holidays.
- Can adjust leave balances when authorized.
- Cannot change system roles or global security settings.

Super Admin

- Full access to every module.
- Manages users, teams, roles, permissions, and system configuration.
- Has access to all reports and audit logs.

---

# Permission Principles

- Least privilege by default.
- Every request must pass authentication and authorization checks.
- Ownership rules must be enforced (employees can only access their own records unless granted broader permissions by role).
- Sensitive actions (delete, disable, role changes, leave balance adjustments) must be logged in the audit log.
- Future roles can be added through the Spatie Permission package without changing the core authorization architecture.