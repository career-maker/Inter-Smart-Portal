# PostgreSQL → MySQL Compatibility Notes

> Generated: 2026-08-12 08:45:33 UTC

## Type Mappings Applied

| PostgreSQL Type | MySQL Type | Notes |
|---|---|---|
| uuid | CHAR(36) | UUID values preserved exactly |
| bigint / bigserial | BIGINT | AUTO_INCREMENT where serial |
| integer / serial | INT | AUTO_INCREMENT where serial |
| smallint | SMALLINT | |
| numeric(p,s) | DECIMAL(p,s) | Precision preserved |
| boolean | TINYINT(1) | 0=false, 1=true |
| timestamp / timestamptz | DATETIME(6) | Timezone offset stripped, UTC stored |
| json / jsonb | JSON | Native MySQL JSON type |
| text / citext | LONGTEXT | Case-insensitive behavior not replicated |
| varchar(n) | VARCHAR(n) | |
| uuid default gen_random_uuid() | No DEFAULT | Application must generate UUIDs |
| now() default | CURRENT_TIMESTAMP(6) | MySQL equivalent |
| Array types (_text, _int4, etc.) | LONGTEXT | Stored as JSON string |
| bytea | LONGBLOB | |
| inet / cidr | VARCHAR(50) | |
| interval | VARCHAR(100) | Stored as text |
| tsvector / tsquery | LONGTEXT | Full-text search not replicated |

## Features Not Transferred

| Feature | Impact | Resolution |
|---|---|---|
| Row Level Security (RLS) | Laravel Sanctum handles auth | Application-level |
| PostgreSQL ENUM types | Converted to MySQL ENUM | Compatible |
| CHECK constraints | Limited in MySQL < 8.0.16 | Preserved where possible |
| Partial indexes | Not supported in MySQL | Dropped; full indexes used |
| Expression indexes | Not supported in MySQL | Dropped |
| Sequences (nextval) | Replaced by AUTO_INCREMENT | |
| UUID default functions | Dropped; app generates UUIDs | Application must handle |
| citext (case-insensitive text) | Converted to LONGTEXT | Use `COLLATE utf8mb4_ci` if needed |
| GENERATED columns | Not migrated | Manual review needed |
| Foreign key DEFERRABLE | Not supported in MySQL | Immediate enforcement used |
| pg_trgm (fuzzy search) | Not supported in MySQL | Use FULLTEXT if needed |
