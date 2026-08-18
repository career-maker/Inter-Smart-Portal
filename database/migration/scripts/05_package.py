#!/usr/bin/env python3
"""Phase 9 — Assemble migration package and ZIP"""

import os, sys, shutil, zipfile
from datetime import datetime, timezone

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR   = os.path.join(SCRIPT_DIR, "..")
PKG_DIR    = os.path.join(BASE_DIR, "package")
MYSQL_FILE = os.path.join(BASE_DIR, "mysql", "inter-smart-employee-portal-mysql.sql")
ZIP_FILE   = os.path.join(BASE_DIR, "..", "inter-smart-employee-portal-mysql-migration.zip")

os.makedirs(PKG_DIR, exist_ok=True)

now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
size_kb = os.path.getsize(MYSQL_FILE) / 1024 if os.path.exists(MYSQL_FILE) else 0
size_mb = size_kb / 1024

# ── IMPORT_INSTRUCTIONS.md ────────────────────────────────────────────────────
instructions = f"""# Import Instructions — Inter Smart Employee Portal MySQL Migration

> **Generated**: {now_str}

## CRITICAL: Backup Your Existing cPanel Database First

> [!CAUTION]
> Before importing anything, take a full backup of **workplaceintersm_intersmart_portal**:
>
> 1. Log into cPanel → phpMyAdmin
> 2. Select **workplaceintersm_intersmart_portal** in the left sidebar
> 3. Click **Export** → Quick → SQL → **Go**
> 4. Save the downloaded file safely before proceeding

---

## SQL File Details

| Item | Value |
|---|---|
| File | `inter-smart-employee-portal-mysql.sql` |
| Size | {size_kb:.1f} KB ({size_mb:.2f} MB) |
| Target DB | `workplaceintersm_intersmart_portal` |
| Character set | UTF8MB4 |
| Compatibility | MySQL 8.0 / MariaDB 10.6+ |
| Source tables | 46 |
| Total rows | 19,613+ |

---

## Step-by-Step Import via phpMyAdmin

### 1. Log into cPanel
Go to your hosting control panel (e.g., `https://yourdomain.com:2083`) and log in.

### 2. Open phpMyAdmin
Under the **Databases** section, click **phpMyAdmin**.

### 3. Select Your Database
In the **left sidebar**, click **workplaceintersm_intersmart_portal**.

### 4. Navigate to Import
Click the **Import** tab at the top menu.

### 5. Choose the SQL File
- Click **Browse...** / **Choose File**
- Select `inter-smart-employee-portal-mysql.sql`

### 6. Import Settings

| Setting | Value |
|---|---|
| Character set | **utf8mb4** |
| Format | **SQL** |
| Partial import | Off |
| SQL compatibility mode | **NONE** |

### 7. Click Go
Wait for the import. For a 4 MB file this should take under 1 minute.

### 8. Check for Success
A **green success banner** appears: _"Import has been successfully finished."_

---

## Verify the Import

### Check Table Count
Click on `workplaceintersm_intersmart_portal` in the left sidebar.
You should see **46 tables**.

### Check Row Counts via SQL
Run in phpMyAdmin SQL tab:
```sql
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'workplaceintersm_intersmart_portal'
ORDER BY table_name;
```

### Sample Data Queries
```sql
-- Verify users
SELECT id, name, email, employee_code FROM users LIMIT 5;

-- Verify recent attendance
SELECT * FROM attendances ORDER BY created_at DESC LIMIT 5;

-- Verify biometric events
SELECT employee_code, direction, local_punch_time
FROM biometric_events ORDER BY local_punch_time DESC LIMIT 5;

-- Verify teams
SELECT * FROM teams;
```

---

## Handling Upload Size Limits

If phpMyAdmin shows a file-too-large error:

### Option A — Increase Limits via .htaccess (cPanel)
Add to your `.htaccess` in the phpMyAdmin root:
```
php_value upload_max_filesize 256M
php_value post_max_size 256M
php_value max_execution_time 600
php_value memory_limit 512M
```

### Option B — Use MySQL CLI via SSH
```bash
mysql -u DB_USERNAME -p workplaceintersm_intersmart_portal < inter-smart-employee-portal-mysql.sql
```

### Option C — BigDump (for very large files)
Download BigDump from https://www.ozerov.de/bigdump/, upload alongside the SQL file, and follow the wizard.

### Option D — Split the File
Split the SQL at INSERT boundaries — never in the middle of an INSERT statement.
Each part needs the header (`SET NAMES utf8mb4; SET FOREIGN_KEY_CHECKS=0;`) at the top
and the last part needs `SET FOREIGN_KEY_CHECKS=1;` at the end.

---

## After Successful Import

Update your Laravel backend `.env` on cPanel:
```env
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=workplaceintersm_intersmart_portal
DB_USERNAME=<your_cpanel_mysql_username>
DB_PASSWORD=<your_cpanel_mysql_password>
```

Then run:
```bash
php artisan config:cache
php artisan migrate:status
```

---

## Important Notes

- The dump uses `CREATE TABLE IF NOT EXISTS` — existing tables will NOT be dropped
- If you want fresh data, `TRUNCATE` each table manually before importing
- The dump does NOT contain Supabase credentials
- All data is in UTF-8 / UTF8MB4 (Malayalam text preserved)
- UUIDs are stored as CHAR(36) with exact values preserved
- Timestamps are stored in UTC as DATETIME(6)
"""

with open(os.path.join(PKG_DIR, "IMPORT_INSTRUCTIONS.md"), "w", encoding="utf-8") as f:
    f.write(instructions)
print("IMPORT_INSTRUCTIONS.md written.")

# ── Copy files to package ─────────────────────────────────────────────────────
files_to_copy = [
    (MYSQL_FILE, "inter-smart-employee-portal-mysql.sql"),
    (os.path.join(BASE_DIR, "SUPABASE_SCHEMA_REPORT.md"), "SUPABASE_SCHEMA_REPORT.md"),
    (os.path.join(BASE_DIR, "POSTGRES_TO_MYSQL_COMPATIBILITY.md"), "POSTGRES_TO_MYSQL_COMPATIBILITY.md"),
    (os.path.join(BASE_DIR, "POSTGRES_ONLY_FEATURES.md"), "POSTGRES_ONLY_FEATURES.md"),
    (os.path.join(BASE_DIR, "MIGRATION_VALIDATION_REPORT.md"), "MIGRATION_VALIDATION_REPORT.md"),
]

for src, dest_name in files_to_copy:
    dest = os.path.join(PKG_DIR, dest_name)
    if os.path.exists(src):
        shutil.copy2(src, dest)
        print(f"  Copied: {dest_name}")
    else:
        print(f"  WARNING: Missing: {src}")

# ── Create ZIP ────────────────────────────────────────────────────────────────
print(f"\nCreating ZIP: {ZIP_FILE} ...")
with zipfile.ZipFile(ZIP_FILE, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(PKG_DIR):
        for fname in files:
            fpath = os.path.join(root, fname)
            arcname = os.path.join("inter-smart-migration", os.path.relpath(fpath, PKG_DIR))
            zf.write(fpath, arcname)

zip_kb = os.path.getsize(ZIP_FILE) / 1024
print(f"ZIP created: {ZIP_FILE} ({zip_kb:.1f} KB)")
print(f"\nPackage directory : {os.path.realpath(PKG_DIR)}")
print(f"ZIP file          : {os.path.realpath(ZIP_FILE)}")
print("\nPackage assembly complete.")
