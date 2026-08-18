<?php
/**
 * Phase 9 — Assemble Migration Package + ZIP
 */

$base    = __DIR__ . '/../';
$pkgDir  = $base . 'package/';
$mysqlSql = $base . 'mysql/inter-smart-employee-portal-mysql.sql';

if (!is_dir($pkgDir)) mkdir($pkgDir, 0755, true);

// Files to copy into package
$files = [
    $base . 'mysql/inter-smart-employee-portal-mysql.sql',
    $base . 'SUPABASE_SCHEMA_REPORT.md',
    $base . 'POSTGRES_TO_MYSQL_COMPATIBILITY.md',
    $base . 'POSTGRES_ONLY_FEATURES.md',
    $base . 'MIGRATION_VALIDATION_REPORT.md',
];

$now = date('Y-m-d H:i:s T');

// Generate IMPORT_INSTRUCTIONS.md
$sizeKB = file_exists($mysqlSql) ? round(filesize($mysqlSql) / 1024, 1) : '?';
$sizeMB = $sizeKB !== '?' ? round($sizeKB / 1024, 2) : '?';

$importInstructions = <<<MD
# Import Instructions — Inter Smart Employee Portal MySQL Migration

> **Generated**: {$now}

## ⚠️ CRITICAL: Backup First

Before importing anything, **take a complete backup** of your existing cPanel database:

1. Log in to your cPanel.
2. Open **phpMyAdmin**.
3. Select **`workplaceintersm_intersmart_portal`** from the left sidebar.
4. Click **Export** (top menu).
5. Choose **Quick** export, Format: **SQL**.
6. Click **Go** and save the file locally. Keep it safe.

---

## SQL File Details

| Item | Value |
|---|---|
| File | `inter-smart-employee-portal-mysql.sql` |
| Approx. size | {$sizeKB} KB ({$sizeMB} MB) |
| Target DB | `workplaceintersm_intersmart_portal` |
| Character set | UTF8MB4 |
| MySQL version | 8.0 / MariaDB 10.6+ compatible |

---

## Step-by-Step Import via phpMyAdmin

### 1. Log into cPanel
- Go to your cPanel URL (e.g., `https://yourdomain.com:2083`).
- Log in with your cPanel credentials.

### 2. Open phpMyAdmin
- Under the **Databases** section, click **phpMyAdmin**.

### 3. Select Your Database
- In the **left sidebar**, click on **`workplaceintersm_intersmart_portal`**.
- The database opens in the right pane.

### 4. Navigate to Import
- Click the **Import** tab at the top.

### 5. Choose the SQL File
- Click **Browse...** (or **Choose File**).
- Select `inter-smart-employee-portal-mysql.sql` from your computer.

### 6. Import Settings
Use these settings:

| Setting | Value |
|---|---|
| Character set | **utf8mb4** |
| Format | **SQL** |
| Partial import | Off |
| SQL compatibility mode | **NONE** |

### 7. Click Go
- Click the **Go** button.
- Wait for the import to complete. This may take a few minutes for large files.

### 8. Check for Success
- A **green success banner** will appear: "Import has been successfully finished."
- If you see red error messages, see the troubleshooting section below.

---

## Verify the Import

### Check Table Count
1. Click on `workplaceintersm_intersmart_portal` in the sidebar.
2. Count the tables listed. They should match the count in `SUPABASE_SCHEMA_REPORT.md`.

### Check Row Counts
Run this query in phpMyAdmin's SQL tab to count rows per table:

```sql
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'workplaceintersm_intersmart_portal'
ORDER BY table_name;
```

Compare the results with `MIGRATION_VALIDATION_REPORT.md`.

### Spot-Check Data
Run a few sample queries:

```sql
-- Check users
SELECT id, name, email, employee_code FROM users LIMIT 5;

-- Check attendances
SELECT * FROM attendances ORDER BY created_at DESC LIMIT 5;

-- Check biometric events
SELECT * FROM biometric_events ORDER BY event_time DESC LIMIT 5;
```

---

## Handling phpMyAdmin Upload Size Limits

If phpMyAdmin shows an error like **"File too large"** or the import fails at a certain point:

### Option A — Increase Upload Limit (if you have cPanel file editor access)
Edit `php.ini` or `.htaccess` in your cPanel File Manager:
```
upload_max_filesize = 256M
post_max_size = 256M
max_execution_time = 600
memory_limit = 512M
```

### Option B — Use BigDump (for large files)
1. Download **BigDump** from https://www.ozerov.de/bigdump/
2. Upload `bigdump.php` and your SQL file to the same directory on your server via cPanel File Manager.
3. Access `https://yourdomain.com/bigdump.php` in your browser.
4. Follow the BigDump wizard.

### Option C — Split the SQL File
Use a text editor to split the SQL file into multiple parts, each under 50 MB.
Rules for safe splitting:
- Never split in the middle of an INSERT statement.
- Each part must start with the header (SET NAMES, SET FOREIGN_KEY_CHECKS=0).
- The last part must end with SET FOREIGN_KEY_CHECKS=1.

### Option D — Use MySQL CLI via SSH
If you have SSH access to your cPanel server:
```bash
mysql -u workplaceintersm_intersmart -p workplaceintersm_intersmart_portal < inter-smart-employee-portal-mysql.sql
```

---

## Do NOT Run These Commands Automatically
- Do NOT drop the existing database.
- Do NOT truncate existing tables automatically.
- The import SQL uses `CREATE TABLE IF NOT EXISTS`, so existing tables with data will NOT be overwritten by table creation.
- If you want to replace existing data, manually `TRUNCATE` individual tables first from phpMyAdmin.

---

## After Successful Import

1. Update your Laravel `.env` on cPanel:
```
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=workplaceintersm_intersmart_portal
DB_USERNAME=<your_cpanel_mysql_user>
DB_PASSWORD=<your_cpanel_mysql_password>
```

2. Run `php artisan config:cache` on the cPanel server.

3. Test the application in your browser.

---

## Support

If you encounter issues, consult `MIGRATION_VALIDATION_REPORT.md` and `POSTGRES_TO_MYSQL_COMPATIBILITY.md` for known differences between the PostgreSQL source and the MySQL target.
MD;

file_put_contents($pkgDir . 'IMPORT_INSTRUCTIONS.md', $importInstructions);
echo "IMPORT_INSTRUCTIONS.md written.\n";

// Copy files to package
$copied = 0;
foreach ($files as $f) {
    if (file_exists($f)) {
        $dest = $pkgDir . basename($f);
        copy($f, $dest);
        echo "  Copied: " . basename($f) . "\n";
        $copied++;
    } else {
        echo "  WARNING: Missing: $f\n";
    }
}
copy($pkgDir . 'IMPORT_INSTRUCTIONS.md', $pkgDir . 'IMPORT_INSTRUCTIONS.md');

// Create ZIP
$zipPath = $base . '../inter-smart-employee-portal-mysql-migration.zip';
// Use PHP ZipArchive
if (class_exists('ZipArchive')) {
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($pkgDir));
        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $rel = str_replace($pkgDir, '', $file->getPathname());
                $zip->addFile($file->getPathname(), 'inter-smart-migration/' . $rel);
            }
        }
        $zip->close();
        echo "ZIP created: $zipPath\n";
    } else {
        echo "WARNING: Could not create ZIP (ZipArchive open failed).\n";
    }
} else {
    echo "WARNING: PHP ZipArchive not available. Please ZIP the package/ directory manually.\n";
}

echo "\nPackage assembly complete.\n";
echo "Package directory : " . realpath($pkgDir) . "\n";
if (file_exists($zipPath)) {
    echo "ZIP file          : " . realpath($zipPath) . "\n";
}
