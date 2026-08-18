# PostgreSQL-Only Features

> Generated: 2026-08-12 08:45:33 UTC

## Summary

| Feature | Count | MySQL Equivalent |
|---|---|---|
| RLS Policies | 0 | None (Laravel Sanctum/middleware) |
| Triggers | 0 | Manual recreation or app-level |
| Functions/Procedures | 0 | MySQL stored procedures (manual) |
| Sequences | 37 | AUTO_INCREMENT |
| Views | 0 | MySQL views (recreated if needed) |
| Enum Types | 0 | MySQL ENUM |

## RLS Policies

All RLS policies control row-level access at the PostgreSQL level.
In Laravel, equivalent security is enforced through Sanctum tokens,
Policy classes, middleware, and route guards.

## Triggers

_No triggers found in public schema._

## Functions / Procedures

_No custom functions found in public schema._

## Sequences

- **`announcement_categories_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`announcements_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`attendance_breaks_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`attendances_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`audit_logs_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`biometric_events_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`biometric_sync_states_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`birthday_wishes_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`document_requests_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`document_uploads_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`failed_jobs_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`holidays_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`hr_policies_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`issue_attachments_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`issue_comments_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`issues_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`jobs_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_audit_logs_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_balance_audit_logs_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_balances_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_ledgers_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_requests_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`leave_types_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`migrations_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`permissions_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`personal_access_tokens_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`profile_update_requests_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`recognitions_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`roles_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`system_settings_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`ta_request_items_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`ta_requests_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`teams_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`user_favorites_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`users_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`wfh_requests_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT
- **`working_days_overrides_id_seq`** (start: 1, inc: 1) → replaced by AUTO_INCREMENT

## Views

_No views found._