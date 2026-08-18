# Supabase Schema Report — Inter Smart Employee Portal

> **Generated**: 2026-08-12 08:43:58 UTC  
> **Source**: Supabase PostgreSQL (READ-ONLY)  
> **Tables found**: 46  
> **Total rows**: 19,613  

---

## Table Summary

| Table | Row Count |
|---|---|
| `announcement_categories` | 11 |
| `announcements` | 1 |
| `attendance_breaks` | 2,321 |
| `attendances` | 769 |
| `audit_logs` | 0 |
| `biometric_events` | 15,397 |
| `biometric_sync_states` | 2 |
| `birthday_wishes` | 8 |
| `cache` | 35 |
| `cache_locks` | 1 |
| `document_requests` | 0 |
| `document_uploads` | 0 |
| `failed_jobs` | 0 |
| `holidays` | 3 |
| `hr_policies` | 0 |
| `issue_attachments` | 0 |
| `issue_comments` | 0 |
| `issues` | 0 |
| `job_batches` | 0 |
| `jobs` | 0 |
| `leave_audit_logs` | 0 |
| `leave_balance_audit_logs` | 142 |
| `leave_balances` | 72 |
| `leave_ledgers` | 0 |
| `leave_requests` | 9 |
| `leave_types` | 11 |
| `migrations` | 59 |
| `model_has_permissions` | 0 |
| `model_has_roles` | 74 |
| `notifications` | 121 |
| `password_reset_tokens` | 0 |
| `permissions` | 4 |
| `personal_access_tokens` | 360 |
| `profile_update_requests` | 0 |
| `recognitions` | 4 |
| `role_has_permissions` | 5 |
| `roles` | 3 |
| `sessions` | 116 |
| `system_settings` | 0 |
| `ta_request_items` | 0 |
| `ta_requests` | 0 |
| `teams` | 9 |
| `user_favorites` | 3 |
| `users` | 73 |
| `wfh_requests` | 0 |
| `working_days_overrides` | 0 |

---

## Table Details

### `announcement_categories`

**Row count**: 11

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('announcement_categories_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `badge_style` | `varchar(255)` | YES |  |  |  |
| 4 | `card_style` | `varchar(255)` | YES |  |  |  |
| 5 | `created_at` | `timestamp` | YES |  |  |  |
| 6 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `announcement_categories_name_unique`: `name`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `announcement_categories_name_unique` | ✓ |  | `name` |
| `announcement_categories_pkey` | ✓ | ✓ | `id` |

---

### `announcements`

**Row count**: 1

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('announcements_id_seq'::regclass)` |  | ✓ |
| 2 | `title` | `varchar(255)` | NO |  |  |  |
| 3 | `content` | `text` | NO |  |  |  |
| 4 | `category` | `varchar(255)` | NO |  |  |  |
| 5 | `image_path` | `varchar(255)` | YES |  |  |  |
| 6 | `scheduled_at` | `timestamp` | YES |  |  |  |
| 7 | `expires_at` | `timestamp` | YES |  |  |  |
| 8 | `is_pinned` | `bool` | NO | `false` |  |  |
| 9 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 10 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 11 | `created_at` | `timestamp` | YES |  |  |  |
| 12 | `updated_at` | `timestamp` | YES |  |  |  |
| 13 | `description` | `text` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `announcements_pkey` | ✓ | ✓ | `id` |

---

### `attendance_breaks`

**Row count**: 2,321

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('attendance_breaks_id_seq'::regclass)` |  | ✓ |
| 2 | `attendance_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `break_start` | `timestamp` | NO |  |  |  |
| 4 | `break_end` | `timestamp` | YES |  |  |  |
| 5 | `total_break_minutes` | `int4(32,0)` | YES |  |  |  |
| 6 | `break_type` | `varchar(255)` | NO | `'Standard'::character varying` |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |
| 9 | `source` | `varchar(255)` | NO | `'manual'::character varying` |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `attendance_breaks_attendance_id_foreign` | `attendance_id` | `attendances` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `attendance_breaks_pkey` | ✓ | ✓ | `id` |

---

### `attendances`

**Row count**: 769

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('attendances_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `date` | `date` | NO |  |  |  |
| 4 | `check_in_time` | `timestamp` | YES |  |  |  |
| 5 | `check_out_time` | `timestamp` | YES |  |  |  |
| 6 | `total_working_minutes` | `int4(32,0)` | YES |  |  |  |
| 7 | `status` | `varchar(255)` | NO | `'Present'::character varying` |  |  |
| 8 | `notes` | `text` | YES |  |  |  |
| 9 | `created_at` | `timestamp` | YES |  |  |  |
| 10 | `updated_at` | `timestamp` | YES |  |  |  |
| 11 | `source` | `varchar(255)` | NO | `'manual'::character varying` |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `attendances_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Unique Constraints

- `attendances_user_id_date_unique`: `user_id, date`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `attendances_pkey` | ✓ | ✓ | `id` |
| `attendances_user_id_date_unique` | ✓ |  | `user_id, date` |

---

### `audit_logs`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('audit_logs_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | YES |  |  |  |
| 3 | `action` | `varchar(255)` | NO |  |  |  |
| 4 | `model_type` | `varchar(255)` | YES |  |  |  |
| 5 | `model_id` | `int8(64,0)` | YES |  |  |  |
| 6 | `changes` | `json` | YES |  |  |  |
| 7 | `ip_address` | `varchar(45)` | YES |  |  |  |
| 8 | `created_at` | `timestamp` | YES |  |  |  |
| 9 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `audit_logs_pkey` | ✓ | ✓ | `id` |

---

### `biometric_events`

**Row count**: 15,397

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('biometric_events_id_seq'::regclass)` |  | ✓ |
| 2 | `source_system` | `varchar(255)` | NO |  |  |  |
| 3 | `source_table` | `varchar(255)` | NO |  |  |  |
| 4 | `source_event_id` | `varchar(255)` | NO |  |  |  |
| 5 | `employee_code` | `varchar(255)` | NO |  |  |  |
| 6 | `user_id` | `int8(64,0)` | YES |  |  |  |
| 7 | `device_id` | `varchar(255)` | NO |  |  |  |
| 8 | `direction` | `varchar(255)` | NO |  |  |  |
| 9 | `local_punch_time` | `timestamp` | NO |  |  |  |
| 10 | `source_timezone` | `varchar(255)` | NO |  |  |  |
| 11 | `utc_punch_time` | `timestamp` | NO |  |  |  |
| 12 | `mapping_status` | `varchar(255)` | NO | `'unmapped'::character varying` |  |  |
| 13 | `processing_status` | `varchar(255)` | NO | `'pending'::character varying` |  |  |
| 14 | `duplicate_reference` | `int8(64,0)` | YES |  |  |  |
| 15 | `error_reason` | `text` | YES |  |  |  |
| 16 | `received_at` | `timestamp` | NO | `CURRENT_TIMESTAMP` |  |  |
| 17 | `created_at` | `timestamp` | YES |  |  |  |
| 18 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `biometric_events_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | SET NULL |
| `biometric_events_duplicate_reference_foreign` | `duplicate_reference` | `biometric_events` | `id` | NO ACTION | SET NULL |

#### Unique Constraints

- `biometric_events_source_unique`: `source_system, source_table, source_event_id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `biometric_events_pkey` | ✓ | ✓ | `id` |
| `biometric_events_source_unique` | ✓ |  | `source_system, source_table, source_event_id` |

---

### `biometric_sync_states`

**Row count**: 2

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('biometric_sync_states_id_seq'::regclass)` |  | ✓ |
| 2 | `source_system` | `varchar(255)` | NO |  |  |  |
| 3 | `source_table` | `varchar(255)` | NO |  |  |  |
| 4 | `last_successful_sync` | `timestamp` | YES |  |  |  |
| 5 | `last_attempted_sync` | `timestamp` | YES |  |  |  |
| 6 | `sync_status` | `varchar(255)` | NO | `'idle'::character varying` |  |  |
| 7 | `last_error` | `text` | YES |  |  |  |
| 8 | `created_at` | `timestamp` | YES |  |  |  |
| 9 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `biometric_sync_states_unique`: `source_system, source_table`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `biometric_sync_states_pkey` | ✓ | ✓ | `id` |
| `biometric_sync_states_unique` | ✓ |  | `source_system, source_table` |

---

### `birthday_wishes`

**Row count**: 8

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('birthday_wishes_id_seq'::regclass)` |  | ✓ |
| 2 | `birthday_user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `sender_id` | `int8(64,0)` | NO |  |  |  |
| 4 | `message` | `text` | NO |  |  |  |
| 5 | `wished_at` | `timestamp` | NO | `CURRENT_TIMESTAMP` |  |  |
| 6 | `created_at` | `timestamp` | YES |  |  |  |
| 7 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `birthday_wishes_sender_id_foreign` | `sender_id` | `users` | `id` | NO ACTION | CASCADE |
| `birthday_wishes_birthday_user_id_foreign` | `birthday_user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Unique Constraints

- `unique_wish_per_sender`: `birthday_user_id, sender_id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `birthday_wishes_birthday_user_id_index` |  |  | `birthday_user_id` |
| `birthday_wishes_pkey` | ✓ | ✓ | `id` |
| `birthday_wishes_sender_id_index` |  |  | `sender_id` |
| `idx_birthday_user_id` |  |  | `birthday_user_id` |
| `idx_birthday_wishes_birthday_user_id` |  |  | `birthday_user_id` |
| `idx_birthday_wishes_sender_id` |  |  | `sender_id` |
| `idx_sender_id` |  |  | `sender_id` |
| `unique_wish_per_sender` | ✓ |  | `birthday_user_id, sender_id` |

---

### `cache`

**Row count**: 35

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `key` | `varchar(255)` | NO |  |  | ✓ |
| 2 | `value` | `text` | NO |  |  |  |
| 3 | `expiration` | `int4(32,0)` | NO |  |  |  |

**Primary Key**: `key`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `cache_expiration_index` |  |  | `expiration` |
| `cache_pkey` | ✓ | ✓ | `key` |

---

### `cache_locks`

**Row count**: 1

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `key` | `varchar(255)` | NO |  |  | ✓ |
| 2 | `owner` | `varchar(255)` | NO |  |  |  |
| 3 | `expiration` | `int4(32,0)` | NO |  |  |  |

**Primary Key**: `key`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `cache_locks_expiration_index` |  |  | `expiration` |
| `cache_locks_pkey` | ✓ | ✓ | `key` |

---

### `document_requests`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('document_requests_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `request_number` | `varchar(255)` | NO |  |  |  |
| 4 | `subject` | `varchar(255)` | NO |  |  |  |
| 5 | `description` | `text` | YES |  |  |  |
| 6 | `status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `document_requests_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Unique Constraints

- `document_requests_request_number_unique`: `request_number`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `document_requests_pkey` | ✓ | ✓ | `id` |
| `document_requests_request_number_unique` | ✓ |  | `request_number` |

---

### `document_uploads`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('document_uploads_id_seq'::regclass)` |  | ✓ |
| 2 | `document_request_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `file_path` | `varchar(255)` | YES |  |  |  |
| 4 | `comments` | `text` | YES |  |  |  |
| 5 | `uploaded_by` | `int8(64,0)` | YES |  |  |  |
| 6 | `created_at` | `timestamp` | YES |  |  |  |
| 7 | `updated_at` | `timestamp` | YES |  |  |  |
| 8 | `document_url` | `varchar(2048)` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `document_uploads_document_request_id_foreign` | `document_request_id` | `document_requests` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `document_uploads_pkey` | ✓ | ✓ | `id` |

---

### `failed_jobs`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('failed_jobs_id_seq'::regclass)` |  | ✓ |
| 2 | `uuid` | `varchar(255)` | NO |  |  |  |
| 3 | `connection` | `text` | NO |  |  |  |
| 4 | `queue` | `text` | NO |  |  |  |
| 5 | `payload` | `text` | NO |  |  |  |
| 6 | `exception` | `text` | NO |  |  |  |
| 7 | `failed_at` | `timestamp` | NO | `CURRENT_TIMESTAMP` |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `failed_jobs_uuid_unique`: `uuid`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `failed_jobs_pkey` | ✓ | ✓ | `id` |
| `failed_jobs_uuid_unique` | ✓ |  | `uuid` |

---

### `holidays`

**Row count**: 3

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('holidays_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `date` | `date` | NO |  |  |  |
| 4 | `type` | `varchar(255)` | NO | `'Public Holiday'::character varying` |  |  |
| 5 | `description` | `text` | YES |  |  |  |
| 6 | `applicable_team_id` | `int8(64,0)` | YES |  |  |  |
| 7 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 8 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 9 | `created_at` | `timestamp` | YES |  |  |  |
| 10 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `holidays_pkey` | ✓ | ✓ | `id` |

---

### `hr_policies`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('hr_policies_id_seq'::regclass)` |  | ✓ |
| 2 | `title` | `varchar(255)` | NO |  |  |  |
| 3 | `category` | `varchar(255)` | NO |  |  |  |
| 4 | `file_path` | `varchar(255)` | NO |  |  |  |
| 5 | `version` | `varchar(255)` | YES |  |  |  |
| 6 | `is_archived` | `bool` | NO | `false` |  |  |
| 7 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 8 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 9 | `created_at` | `timestamp` | YES |  |  |  |
| 10 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `hr_policies_pkey` | ✓ | ✓ | `id` |

---

### `issue_attachments`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('issue_attachments_id_seq'::regclass)` |  | ✓ |
| 2 | `issue_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `issue_comment_id` | `int8(64,0)` | YES |  |  |  |
| 4 | `file_path` | `varchar(255)` | NO |  |  |  |
| 5 | `file_name` | `varchar(255)` | NO |  |  |  |
| 6 | `file_type` | `varchar(255)` | YES |  |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `issue_attachments_issue_comment_id_foreign` | `issue_comment_id` | `issue_comments` | `id` | NO ACTION | CASCADE |
| `issue_attachments_issue_id_foreign` | `issue_id` | `issues` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `issue_attachments_pkey` | ✓ | ✓ | `id` |

---

### `issue_comments`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('issue_comments_id_seq'::regclass)` |  | ✓ |
| 2 | `issue_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 4 | `comment` | `text` | NO |  |  |  |
| 5 | `created_at` | `timestamp` | YES |  |  |  |
| 6 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `issue_comments_issue_id_foreign` | `issue_id` | `issues` | `id` | NO ACTION | CASCADE |
| `issue_comments_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `issue_comments_pkey` | ✓ | ✓ | `id` |

---

### `issues`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('issues_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `title` | `varchar(255)` | NO |  |  |  |
| 4 | `category` | `varchar(255)` | NO |  |  |  |
| 5 | `priority` | `varchar(255)` | NO |  |  |  |
| 6 | `description` | `text` | NO |  |  |  |
| 7 | `related_module` | `varchar(255)` | YES |  |  |  |
| 8 | `status` | `varchar(255)` | NO | `'Open'::character varying` |  |  |
| 9 | `assigned_to` | `int8(64,0)` | YES |  |  |  |
| 10 | `resolved_at` | `timestamp` | YES |  |  |  |
| 11 | `created_at` | `timestamp` | YES |  |  |  |
| 12 | `updated_at` | `timestamp` | YES |  |  |  |
| 13 | `attachment_link` | `varchar(2048)` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `issues_assigned_to_foreign` | `assigned_to` | `users` | `id` | NO ACTION | SET NULL |
| `issues_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `issues_pkey` | ✓ | ✓ | `id` |

---

### `job_batches`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `varchar(255)` | NO |  |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `total_jobs` | `int4(32,0)` | NO |  |  |  |
| 4 | `pending_jobs` | `int4(32,0)` | NO |  |  |  |
| 5 | `failed_jobs` | `int4(32,0)` | NO |  |  |  |
| 6 | `failed_job_ids` | `text` | NO |  |  |  |
| 7 | `options` | `text` | YES |  |  |  |
| 8 | `cancelled_at` | `int4(32,0)` | YES |  |  |  |
| 9 | `created_at` | `int4(32,0)` | NO |  |  |  |
| 10 | `finished_at` | `int4(32,0)` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `job_batches_pkey` | ✓ | ✓ | `id` |

---

### `jobs`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('jobs_id_seq'::regclass)` |  | ✓ |
| 2 | `queue` | `varchar(255)` | NO |  |  |  |
| 3 | `payload` | `text` | NO |  |  |  |
| 4 | `attempts` | `int2(16,0)` | NO |  |  |  |
| 5 | `reserved_at` | `int4(32,0)` | YES |  |  |  |
| 6 | `available_at` | `int4(32,0)` | NO |  |  |  |
| 7 | `created_at` | `int4(32,0)` | NO |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `jobs_pkey` | ✓ | ✓ | `id` |
| `jobs_queue_index` |  |  | `queue` |

---

### `leave_audit_logs`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_audit_logs_id_seq'::regclass)` |  | ✓ |
| 2 | `leave_request_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `modified_by` | `int8(64,0)` | NO |  |  |  |
| 4 | `previous_value` | `json` | YES |  |  |  |
| 5 | `new_value` | `json` | YES |  |  |  |
| 6 | `remarks` | `varchar(255)` | YES |  |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `leave_audit_logs_modified_by_foreign` | `modified_by` | `users` | `id` | NO ACTION | CASCADE |
| `leave_audit_logs_leave_request_id_foreign` | `leave_request_id` | `leave_requests` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_audit_logs_pkey` | ✓ | ✓ | `id` |

---

### `leave_balance_audit_logs`

**Row count**: 142

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_balance_audit_logs_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `leave_type` | `varchar(255)` | NO |  |  |  |
| 4 | `previous_balance` | `numeric(5,1)` | NO |  |  |  |
| 5 | `new_balance` | `numeric(5,1)` | NO |  |  |  |
| 6 | `modified_by` | `int8(64,0)` | NO |  |  |  |
| 7 | `remarks` | `text` | YES |  |  |  |
| 8 | `created_at` | `timestamp` | YES |  |  |  |
| 9 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `leave_balance_audit_logs_modified_by_foreign` | `modified_by` | `users` | `id` | NO ACTION | CASCADE |
| `leave_balance_audit_logs_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_balance_audit_logs_pkey` | ✓ | ✓ | `id` |

---

### `leave_balances`

**Row count**: 72

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_balances_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `casual_leave_balance` | `numeric(5,1)` | NO | `'0'::numeric` |  |  |
| 4 | `sick_leave_balance` | `numeric(5,1)` | NO | `'0'::numeric` |  |  |
| 5 | `total_leaves_taken` | `numeric(5,1)` | NO | `'0'::numeric` |  |  |
| 6 | `created_at` | `timestamp` | YES |  |  |  |
| 7 | `updated_at` | `timestamp` | YES |  |  |  |
| 8 | `cl_carry_forward` | `numeric(5,1)` | NO | `'0'::numeric` |  |  |
| 9 | `cl_carry_forward_year` | `int4(32,0)` | YES |  |  |  |
| 10 | `probation_leaves_allocated` | `bool` | NO | `false` |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `leave_balances_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_balances_pkey` | ✓ | ✓ | `id` |
| `leave_balances_user_id_index` |  |  | `user_id` |

---

### `leave_ledgers`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_ledgers_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `leave_type_id` | `int8(64,0)` | NO |  |  |  |
| 4 | `transaction_type` | `varchar(255)` | NO |  |  |  |
| 5 | `amount` | `numeric(5,1)` | NO |  |  |  |
| 6 | `description` | `text` | YES |  |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `leave_ledgers_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |
| `leave_ledgers_leave_type_id_foreign` | `leave_type_id` | `leave_types` | `id` | NO ACTION | NO ACTION |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_ledgers_pkey` | ✓ | ✓ | `id` |

---

### `leave_requests`

**Row count**: 9

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_requests_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `leave_type_id` | `int8(64,0)` | NO |  |  |  |
| 4 | `start_date` | `date` | NO |  |  |  |
| 6 | `reason` | `text` | NO |  |  |  |
| 7 | `status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 8 | `rejection_reason` | `text` | YES |  |  |  |
| 9 | `approved_by` | `int8(64,0)` | YES |  |  |  |
| 10 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 11 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 12 | `deleted_at` | `timestamp` | YES |  |  |  |
| 13 | `created_at` | `timestamp` | YES |  |  |  |
| 14 | `updated_at` | `timestamp` | YES |  |  |  |
| 15 | `end_date` | `date` | YES |  |  |  |
| 16 | `days` | `numeric(4,1)` | NO | `'1'::numeric` |  |  |
| 17 | `tl_status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 18 | `admin_status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 19 | `is_unpaid` | `bool` | NO | `false` |  |  |
| 20 | `unpaid_reason` | `varchar(255)` | YES |  |  |  |
| 21 | `sandwich_leave_days` | `float8` | NO | `'0'::double precision` |  |  |
| 22 | `actual_leave_days` | `float8` | YES |  |  |  |
| 23 | `attachment_link` | `varchar(2048)` | YES |  |  |  |
| 24 | `paid_casual_leave` | `float8` | NO | `'0'::double precision` |  |  |
| 25 | `paid_sick_leave` | `float8` | NO | `'0'::double precision` |  |  |
| 26 | `lop_days` | `float8` | NO | `'0'::double precision` |  |  |
| 27 | `pending_lop_conversion` | `bool` | NO | `false` |  |  |
| 28 | `lop_conversion_source_id` | `int8(64,0)` | YES |  |  |  |
| 29 | `approver_id` | `int8(64,0)` | YES |  |  |  |
| 30 | `paid_cl_carry_forward` | `float8` | NO | `'0'::double precision` |  |  |
| 31 | `paid_cl_current_year` | `float8` | NO | `'0'::double precision` |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `leave_requests_leave_type_id_foreign` | `leave_type_id` | `leave_types` | `id` | NO ACTION | NO ACTION |
| `leave_requests_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_requests_leave_date_index` |  |  | `start_date` |
| `leave_requests_pkey` | ✓ | ✓ | `id` |
| `leave_requests_status_index` |  |  | `status` |
| `leave_requests_user_id_index` |  |  | `user_id` |

---

### `leave_types`

**Row count**: 11

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('leave_types_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `is_paid` | `bool` | NO | `true` |  |  |
| 4 | `created_at` | `timestamp` | YES |  |  |  |
| 5 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `leave_types_pkey` | ✓ | ✓ | `id` |

---

### `migrations`

**Row count**: 59

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int4(32,0)` | NO | `nextval('migrations_id_seq'::regclass)` |  | ✓ |
| 2 | `migration` | `varchar(255)` | NO |  |  |  |
| 3 | `batch` | `int4(32,0)` | NO |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `migrations_pkey` | ✓ | ✓ | `id` |

---

### `model_has_permissions`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `permission_id` | `int8(64,0)` | NO |  |  | ✓ |
| 2 | `model_type` | `varchar(255)` | NO |  |  | ✓ |
| 3 | `model_id` | `int8(64,0)` | NO |  |  | ✓ |

**Primary Key**: `permission_id, model_id, model_type`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `model_has_permissions_permission_id_foreign` | `permission_id` | `permissions` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `model_has_permissions_model_id_model_type_index` |  |  | `model_id, model_type` |
| `model_has_permissions_pkey` | ✓ | ✓ | `permission_id, model_id, model_type` |

---

### `model_has_roles`

**Row count**: 74

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `role_id` | `int8(64,0)` | NO |  |  | ✓ |
| 2 | `model_type` | `varchar(255)` | NO |  |  | ✓ |
| 3 | `model_id` | `int8(64,0)` | NO |  |  | ✓ |

**Primary Key**: `role_id, model_id, model_type`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `model_has_roles_role_id_foreign` | `role_id` | `roles` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `model_has_roles_model_id_model_type_index` |  |  | `model_id, model_type` |
| `model_has_roles_pkey` | ✓ | ✓ | `role_id, model_id, model_type` |

---

### `notifications`

**Row count**: 121

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO |  |  | ✓ |
| 2 | `type` | `varchar(255)` | NO |  |  |  |
| 3 | `notifiable_type` | `varchar(255)` | NO |  |  |  |
| 4 | `notifiable_id` | `int8(64,0)` | NO |  |  |  |
| 5 | `data` | `text` | NO |  |  |  |
| 6 | `read_at` | `timestamp` | YES |  |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `notifications_notifiable_type_notifiable_id_index` |  |  | `notifiable_type, notifiable_id` |
| `notifications_pkey` | ✓ | ✓ | `id` |

---

### `password_reset_tokens`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `email` | `varchar(255)` | NO |  |  | ✓ |
| 2 | `token` | `varchar(255)` | NO |  |  |  |
| 3 | `created_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `email`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `password_reset_tokens_pkey` | ✓ | ✓ | `email` |

---

### `permissions`

**Row count**: 4

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('permissions_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `guard_name` | `varchar(255)` | NO |  |  |  |
| 4 | `created_at` | `timestamp` | YES |  |  |  |
| 5 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `permissions_name_guard_name_unique`: `name, guard_name`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `permissions_name_guard_name_unique` | ✓ |  | `name, guard_name` |
| `permissions_pkey` | ✓ | ✓ | `id` |

---

### `personal_access_tokens`

**Row count**: 360

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('personal_access_tokens_id_seq'::regclass)` |  | ✓ |
| 2 | `tokenable_type` | `varchar(255)` | NO |  |  |  |
| 3 | `tokenable_id` | `int8(64,0)` | NO |  |  |  |
| 4 | `name` | `text` | NO |  |  |  |
| 5 | `token` | `varchar(64)` | NO |  |  |  |
| 6 | `abilities` | `text` | YES |  |  |  |
| 7 | `last_used_at` | `timestamp` | YES |  |  |  |
| 8 | `expires_at` | `timestamp` | YES |  |  |  |
| 9 | `created_at` | `timestamp` | YES |  |  |  |
| 10 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `personal_access_tokens_token_unique`: `token`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `personal_access_tokens_expires_at_index` |  |  | `expires_at` |
| `personal_access_tokens_pkey` | ✓ | ✓ | `id` |
| `personal_access_tokens_token_unique` | ✓ |  | `token` |
| `personal_access_tokens_tokenable_type_tokenable_id_index` |  |  | `tokenable_type, tokenable_id` |

---

### `profile_update_requests`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('profile_update_requests_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `requested_data` | `json` | NO |  |  |  |
| 4 | `status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 5 | `reviewed_by` | `int8(64,0)` | YES |  |  |  |
| 6 | `reviewed_at` | `timestamp` | YES |  |  |  |
| 7 | `created_at` | `timestamp` | YES |  |  |  |
| 8 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `profile_update_requests_reviewed_by_foreign` | `reviewed_by` | `users` | `id` | NO ACTION | SET NULL |
| `profile_update_requests_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `profile_update_requests_pkey` | ✓ | ✓ | `id` |

---

### `recognitions`

**Row count**: 4

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('recognitions_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `title` | `varchar(255)` | NO |  |  |  |
| 4 | `is_custom` | `bool` | NO | `false` |  |  |
| 5 | `start_date` | `date` | NO |  |  |  |
| 6 | `end_date` | `date` | NO |  |  |  |
| 7 | `description` | `text` | YES |  |  |  |
| 8 | `icon` | `varchar(255)` | YES |  |  |  |
| 9 | `is_active` | `bool` | NO | `true` |  |  |
| 10 | `created_by` | `int8(64,0)` | NO |  |  |  |
| 11 | `created_at` | `timestamp` | YES |  |  |  |
| 12 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `recognitions_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |
| `recognitions_created_by_foreign` | `created_by` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `recognitions_pkey` | ✓ | ✓ | `id` |

---

### `role_has_permissions`

**Row count**: 5

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `permission_id` | `int8(64,0)` | NO |  |  | ✓ |
| 2 | `role_id` | `int8(64,0)` | NO |  |  | ✓ |

**Primary Key**: `permission_id, role_id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `role_has_permissions_permission_id_foreign` | `permission_id` | `permissions` | `id` | NO ACTION | CASCADE |
| `role_has_permissions_role_id_foreign` | `role_id` | `roles` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `role_has_permissions_pkey` | ✓ | ✓ | `permission_id, role_id` |

---

### `roles`

**Row count**: 3

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('roles_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `guard_name` | `varchar(255)` | NO |  |  |  |
| 4 | `created_at` | `timestamp` | YES |  |  |  |
| 5 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `roles_name_guard_name_unique`: `name, guard_name`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `roles_name_guard_name_unique` | ✓ |  | `name, guard_name` |
| `roles_pkey` | ✓ | ✓ | `id` |

---

### `sessions`

**Row count**: 116

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `varchar(255)` | NO |  |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | YES |  |  |  |
| 3 | `ip_address` | `varchar(45)` | YES |  |  |  |
| 4 | `user_agent` | `text` | YES |  |  |  |
| 5 | `payload` | `text` | NO |  |  |  |
| 6 | `last_activity` | `int4(32,0)` | NO |  |  |  |

**Primary Key**: `id`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `sessions_last_activity_index` |  |  | `last_activity` |
| `sessions_pkey` | ✓ | ✓ | `id` |
| `sessions_user_id_index` |  |  | `user_id` |

---

### `system_settings`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('system_settings_id_seq'::regclass)` |  | ✓ |
| 2 | `key` | `varchar(255)` | NO |  |  |  |
| 3 | `value` | `text` | YES |  |  |  |
| 4 | `created_at` | `timestamp` | YES |  |  |  |
| 5 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `system_settings_key_unique`: `key`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `system_settings_key_unique` | ✓ |  | `key` |
| `system_settings_pkey` | ✓ | ✓ | `id` |

---

### `ta_request_items`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('ta_request_items_id_seq'::regclass)` |  | ✓ |
| 2 | `ta_request_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `category` | `varchar(255)` | NO |  |  |  |
| 4 | `amount` | `numeric(10,2)` | NO |  |  |  |
| 5 | `description` | `text` | YES |  |  |  |
| 6 | `created_at` | `timestamp` | YES |  |  |  |
| 7 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `ta_request_items_ta_request_id_foreign` | `ta_request_id` | `ta_requests` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `ta_request_items_pkey` | ✓ | ✓ | `id` |
| `ta_request_items_ta_request_id_index` |  |  | `ta_request_id` |

---

### `ta_requests`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('ta_requests_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `reason` | `text` | NO |  |  |  |
| 4 | `date_travelled` | `date` | NO |  |  |  |
| 5 | `total_amount` | `numeric(10,2)` | NO |  |  |  |
| 6 | `bill_path` | `varchar(255)` | YES |  |  |  |
| 7 | `status` | `varchar(255)` | NO | `'Applied'::character varying` |  |  |
| 8 | `approver_id` | `int8(64,0)` | YES |  |  |  |
| 9 | `approval_notes` | `text` | YES |  |  |  |
| 10 | `is_paid` | `bool` | NO | `false` |  |  |
| 11 | `paid_at` | `timestamp` | YES |  |  |  |
| 12 | `created_by` | `int8(64,0)` | NO |  |  |  |
| 13 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 14 | `deleted_at` | `timestamp` | YES |  |  |  |
| 15 | `created_at` | `timestamp` | YES |  |  |  |
| 16 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `ta_requests_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |
| `ta_requests_updated_by_foreign` | `updated_by` | `users` | `id` | NO ACTION | SET NULL |
| `ta_requests_approver_id_foreign` | `approver_id` | `users` | `id` | NO ACTION | SET NULL |
| `ta_requests_created_by_foreign` | `created_by` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `ta_requests_created_at_index` |  |  | `created_at` |
| `ta_requests_pkey` | ✓ | ✓ | `id` |
| `ta_requests_status_index` |  |  | `status` |
| `ta_requests_user_id_index` |  |  | `user_id` |

---

### `teams`

**Row count**: 9

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('teams_id_seq'::regclass)` |  | ✓ |
| 2 | `name` | `varchar(255)` | NO |  |  |  |
| 3 | `code` | `varchar(255)` | NO |  |  |  |
| 4 | `description` | `text` | YES |  |  |  |
| 5 | `team_lead_id` | `int8(64,0)` | YES |  |  |  |
| 6 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 7 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 8 | `deleted_at` | `timestamp` | YES |  |  |  |
| 9 | `created_at` | `timestamp` | YES |  |  |  |
| 10 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `teams_code_unique`: `code`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `teams_code_unique` | ✓ |  | `code` |
| `teams_pkey` | ✓ | ✓ | `id` |

---

### `user_favorites`

**Row count**: 3

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('user_favorites_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `page_href` | `varchar(255)` | NO |  |  |  |
| 4 | `page_label` | `varchar(255)` | NO |  |  |  |
| 5 | `created_at` | `timestamp` | YES |  |  |  |
| 6 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `user_favorites_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Unique Constraints

- `user_favorites_user_id_page_href_unique`: `user_id, page_href`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `user_favorites_pkey` | ✓ | ✓ | `id` |
| `user_favorites_user_id_page_href_unique` | ✓ |  | `user_id, page_href` |

---

### `users`

**Row count**: 73

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('users_id_seq'::regclass)` |  | ✓ |
| 2 | `first_name` | `varchar(255)` | NO |  |  |  |
| 3 | `last_name` | `varchar(255)` | YES |  |  |  |
| 4 | `email` | `varchar(255)` | NO |  |  |  |
| 5 | `personal_email` | `varchar(255)` | YES |  |  |  |
| 6 | `employee_code` | `varchar(255)` | YES |  |  |  |
| 7 | `designation` | `varchar(255)` | YES |  |  |  |
| 8 | `team_id` | `int8(64,0)` | YES |  |  |  |
| 9 | `joining_date` | `date` | YES |  |  |  |
| 10 | `dob` | `date` | YES |  |  |  |
| 11 | `gender` | `varchar(255)` | YES |  |  |  |
| 12 | `blood_group` | `varchar(255)` | YES |  |  |  |
| 13 | `marital_status` | `varchar(255)` | YES |  |  |  |
| 14 | `permanent_address` | `text` | YES |  |  |  |
| 15 | `current_address` | `text` | YES |  |  |  |
| 16 | `contact_number` | `varchar(255)` | YES |  |  |  |
| 17 | `alternate_contact_number` | `varchar(255)` | YES |  |  |  |
| 18 | `status` | `varchar(255)` | NO | `'Active'::character varying` |  |  |
| 19 | `email_verified_at` | `timestamp` | YES |  |  |  |
| 20 | `password` | `varchar(255)` | NO |  |  |  |
| 21 | `remember_token` | `varchar(100)` | YES |  |  |  |
| 22 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 23 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 24 | `deleted_at` | `timestamp` | YES |  |  |  |
| 25 | `created_at` | `timestamp` | YES |  |  |  |
| 26 | `updated_at` | `timestamp` | YES |  |  |  |
| 27 | `profile_photo_path` | `varchar(255)` | YES |  |  |  |
| 28 | `probation_end_date` | `date` | YES |  |  |  |
| 29 | `phone` | `varchar(255)` | YES |  |  |  |
| 30 | `emergency_contact` | `varchar(255)` | YES |  |  |  |
| 31 | `address` | `text` | YES |  |  |  |
| 32 | `city` | `varchar(255)` | YES |  |  |  |
| 33 | `state` | `varchar(255)` | YES |  |  |  |
| 34 | `zip` | `varchar(255)` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `users_email_unique`: `email`
- `users_employee_code_unique`: `employee_code`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `users_email_unique` | ✓ |  | `email` |
| `users_employee_code_unique` | ✓ |  | `employee_code` |
| `users_pkey` | ✓ | ✓ | `id` |
| `users_status_index` |  |  | `status` |
| `users_team_id_index` |  |  | `team_id` |

---

### `wfh_requests`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('wfh_requests_id_seq'::regclass)` |  | ✓ |
| 2 | `user_id` | `int8(64,0)` | NO |  |  |  |
| 3 | `wfh_date` | `date` | YES |  |  |  |
| 4 | `duration_type` | `varchar(255)` | NO | `'Full'::character varying` |  |  |
| 5 | `reason` | `text` | NO |  |  |  |
| 6 | `status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 7 | `rejection_reason` | `text` | YES |  |  |  |
| 8 | `approved_by` | `int8(64,0)` | YES |  |  |  |
| 9 | `created_by` | `int8(64,0)` | YES |  |  |  |
| 10 | `updated_by` | `int8(64,0)` | YES |  |  |  |
| 11 | `deleted_at` | `timestamp` | YES |  |  |  |
| 12 | `created_at` | `timestamp` | YES |  |  |  |
| 13 | `updated_at` | `timestamp` | YES |  |  |  |
| 14 | `tl_status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 15 | `admin_status` | `varchar(255)` | NO | `'Pending'::character varying` |  |  |
| 16 | `start_date` | `date` | YES |  |  |  |
| 17 | `end_date` | `date` | YES |  |  |  |
| 18 | `remarks` | `text` | YES |  |  |  |
| 19 | `wfh_type_id` | `int8(64,0)` | YES |  |  |  |
| 20 | `attachment_link` | `varchar(255)` | YES |  |  |  |

**Primary Key**: `id`

#### Foreign Keys

| Constraint | Column | → Table | → Column | On Update | On Delete |
|---|---|---|---|---|---|
| `wfh_requests_wfh_type_id_foreign` | `wfh_type_id` | `leave_types` | `id` | NO ACTION | SET NULL |
| `wfh_requests_user_id_foreign` | `user_id` | `users` | `id` | NO ACTION | CASCADE |

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `wfh_requests_pkey` | ✓ | ✓ | `id` |

---

### `working_days_overrides`

**Row count**: 0

#### Columns

| # | Column | PG Type | Nullable | Default | Identity | PK |
|---|---|---|---|---|---|---|
| 1 | `id` | `int8(64,0)` | NO | `nextval('working_days_overrides_id_seq'::regclass)` |  | ✓ |
| 2 | `date` | `date` | NO |  |  |  |
| 3 | `reason` | `varchar(255)` | YES |  |  |  |
| 4 | `created_at` | `timestamp` | YES |  |  |  |
| 5 | `updated_at` | `timestamp` | YES |  |  |  |

**Primary Key**: `id`

#### Unique Constraints

- `working_days_overrides_date_unique`: `date`

#### Indexes

| Index | Unique | Primary | Columns |
|---|---|---|---|
| `working_days_overrides_date_unique` | ✓ |  | `date` |
| `working_days_overrides_pkey` | ✓ | ✓ | `id` |

---

## Sequences

| Sequence | Type | Start | Min | Max | Increment |
|---|---|---|---|---|---|
| `announcement_categories_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `announcements_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `attendance_breaks_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `attendances_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `audit_logs_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `biometric_events_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `biometric_sync_states_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `birthday_wishes_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `document_requests_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `document_uploads_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `failed_jobs_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `holidays_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `hr_policies_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `issue_attachments_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `issue_comments_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `issues_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `jobs_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_audit_logs_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_balance_audit_logs_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_balances_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_ledgers_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_requests_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `leave_types_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `migrations_id_seq` | integer | 1 | 1 | 2147483647 | 1 |
| `permissions_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `personal_access_tokens_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `profile_update_requests_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `recognitions_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `roles_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `system_settings_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `ta_request_items_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `ta_requests_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `teams_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `user_favorites_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `users_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `wfh_requests_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |
| `working_days_overrides_id_seq` | bigint | 1 | 1 | 9223372036854775807 | 1 |

---
