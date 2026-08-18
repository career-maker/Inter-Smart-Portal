# Migration Validation Report

> **Generated**: 2026-08-12 08:49:35 UTC  
> **Dump file**: `database/migration/mysql/inter-smart-employee-portal-mysql.sql`  
> **Dump size**: 4313.2 KB (4.21 MB)  

## Structural Checks

| Check | Result |
|---|---|
| Tables in source | 46 |
| Tables in dump | 46 |
| Missing tables | None |
| Foreign key constraints | 39 |
| Regular indexes | 26 |
| Unique indexes | 16 |
| UTF8MB4 charset | Yes |
| FOREIGN_KEY_CHECKS=0 | Yes |
| FOREIGN_KEY_CHECKS=1 | Yes |

## Row Count Comparison

| Table | Supabase Rows | MySQL Rows | Difference | Status |
|---|---|---|---|---|
| `announcement_categories` | 11 | 11 | +0 | OK |
| `announcements` | 1 | 1 | +0 | OK |
| `attendance_breaks` | 2,321 | 2,321 | +0 | OK |
| `attendances` | 769 | 769 | +0 | OK |
| `audit_logs` | 0 | 0 | +0 | OK |
| `biometric_events` | 15,397 | 15,405 | +8 | OK (live table grew during export) |
| `biometric_sync_states` | 2 | 2 | +0 | OK |
| `birthday_wishes` | 8 | 8 | +0 | OK |
| `cache` | 35 | 35 | +0 | OK |
| `cache_locks` | 1 | 1 | +0 | OK |
| `document_requests` | 0 | 0 | +0 | OK |
| `document_uploads` | 0 | 0 | +0 | OK |
| `failed_jobs` | 0 | 0 | +0 | OK |
| `holidays` | 3 | 3 | +0 | OK |
| `hr_policies` | 0 | 0 | +0 | OK |
| `issue_attachments` | 0 | 0 | +0 | OK |
| `issue_comments` | 0 | 0 | +0 | OK |
| `issues` | 0 | 0 | +0 | OK |
| `job_batches` | 0 | 0 | +0 | OK |
| `jobs` | 0 | 0 | +0 | OK |
| `leave_audit_logs` | 0 | 0 | +0 | OK |
| `leave_balance_audit_logs` | 142 | 142 | +0 | OK |
| `leave_balances` | 72 | 72 | +0 | OK |
| `leave_ledgers` | 0 | 0 | +0 | OK |
| `leave_requests` | 9 | 9 | +0 | OK |
| `leave_types` | 11 | 11 | +0 | OK |
| `migrations` | 59 | 59 | +0 | OK |
| `model_has_permissions` | 0 | 0 | +0 | OK |
| `model_has_roles` | 74 | 74 | +0 | OK |
| `notifications` | 121 | 121 | +0 | OK |
| `password_reset_tokens` | 0 | 0 | +0 | OK |
| `permissions` | 4 | 4 | +0 | OK |
| `personal_access_tokens` | 360 | 360 | +0 | OK |
| `profile_update_requests` | 0 | 0 | +0 | OK |
| `recognitions` | 4 | 4 | +0 | OK |
| `role_has_permissions` | 5 | 5 | +0 | OK |
| `roles` | 3 | 3 | +0 | OK |
| `sessions` | 116 | 116 | +0 | OK |
| `system_settings` | 0 | 0 | +0 | OK |
| `ta_request_items` | 0 | 0 | +0 | OK |
| `ta_requests` | 0 | 0 | +0 | OK |
| `teams` | 9 | 9 | +0 | OK |
| `user_favorites` | 3 | 3 | +0 | OK |
| `users` | 73 | 73 | +0 | OK |
| `wfh_requests` | 0 | 0 | +0 | OK |
| `working_days_overrides` | 0 | 0 | +0 | OK |

**Total source rows**: 19,613  
**Total MySQL rows**: 19,621  

> [!NOTE]  
> All row counts match or are explained. Validation passed.
