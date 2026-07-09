#!/usr/bin/env php
<?php
/**
 * Production Database Audit Script
 * Usage: php audit_database.php
 */

// Load Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "\n";
echo "═════════════════════════════════════════════════════════════════════════════════\n";
echo "PRODUCTION ATTENDANCE AUDIT - DATABASE QUERIES\n";
echo "═════════════════════════════════════════════════════════════════════════════════\n";
echo "\n";

try {
    // Test connection
    DB::connection()->getPdo();
    echo "✓ Database connection successful\n\n";
} catch (\Exception $e) {
    echo "✗ Database connection failed: {$e->getMessage()}\n";
    exit(1);
}

// Query 1: Overall attendance counts
echo "1. OVERALL ATTENDANCE COUNTS\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$result = DB::select("
    SELECT
        COUNT(*) as total_attendance,
        COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric_count,
        COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_count,
        COUNT(CASE WHEN source IS NULL OR source = '' THEN 1 END) as null_source_count
    FROM attendances
");
$row = $result[0] ?? null;
if ($row) {
    echo "  Total attendance rows: {$row->total_attendance}\n";
    echo "  Biometric source: {$row->biometric_count}\n";
    echo "  Manual source: {$row->manual_count}\n";
    echo "  Null/unknown source: {$row->null_source_count}\n";
}
echo "\n";

// Query 2: Manual attendance with details
echo "2. MANUAL ATTENDANCE RECORDS\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$results = DB::select("
    SELECT
        a.id,
        a.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as employee_name,
        u.employee_code,
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.total_working_minutes,
        a.created_at,
        (SELECT COUNT(*) FROM attendance_breaks WHERE attendance_id = a.id) as break_count,
        (SELECT COUNT(*) FROM biometric_events WHERE user_id = a.user_id AND DATE(local_punch_time) = a.date) as bio_event_count
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    WHERE a.source = 'manual'
    ORDER BY a.date DESC
");

if (count($results) === 0) {
    echo "  No manual attendance records found.\n";
} else {
    echo "  Found " . count($results) . " manual attendance records:\n\n";
    foreach ($results as $rec) {
        echo "  [ID: {$rec->id}] {$rec->employee_name} ({$rec->employee_code}) - {$rec->date}\n";
        echo "    Check-in: {$rec->check_in_time} | Check-out: {$rec->check_out_time}\n";
        echo "    Working minutes: {$rec->total_working_minutes} | Breaks: {$rec->break_count}\n";
        echo "    Biometric events on same date: {$rec->bio_event_count}\n";
        echo "    Created: {$rec->created_at}\n";

        // Classify
        $isDummy = false;
        $reasons = [];

        if ($rec->total_working_minutes === null || $rec->total_working_minutes == 0) {
            $isDummy = true;
            $reasons[] = "No working minutes";
        }

        if (!$rec->check_in_time && !$rec->check_out_time) {
            $isDummy = true;
            $reasons[] = "No punch times";
        }

        if ($rec->bio_event_count > 0) {
            $reasons[] = "CONFLICT: Biometric events exist";
        }

        if (strtotime($rec->created_at) < strtotime('2026-07-01')) {
            $isDummy = true;
            $reasons[] = "Created before biometric integration";
        }

        if ($isDummy) {
            echo "    ⚠️  LIKELY DUMMY/LEGACY: " . implode(", ", $reasons) . "\n";
        } else if (count($reasons) > 0) {
            echo "    ⚠️  ATTENTION: " . implode(", ", $reasons) . "\n";
        }

        echo "\n";
    }
}

// Query 3: Conflicts
echo "3. CONFLICT ANALYSIS (Manual + Biometric on same date)\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$conflicts = DB::select("
    SELECT
        a.id as attendance_id,
        a.user_id,
        u.employee_code,
        CONCAT(u.first_name, ' ', u.last_name) as employee_name,
        a.date,
        COUNT(DISTINCT be.id) as biometric_event_count
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    LEFT JOIN biometric_events be ON be.user_id = a.user_id AND DATE(be.local_punch_time) = a.date
    WHERE a.source = 'manual'
    GROUP BY a.id, a.user_id, u.employee_code, u.first_name, u.last_name, a.date
    HAVING COUNT(DISTINCT be.id) > 0
    ORDER BY a.date DESC
");

if (count($conflicts) === 0) {
    echo "  No conflicts detected.\n";
} else {
    echo "  Found " . count($conflicts) . " conflict(s):\n\n";
    foreach ($conflicts as $conflict) {
        echo "  [Attendance {$conflict->attendance_id}] {$conflict->employee_name} ({$conflict->employee_code})\n";
        echo "    Date: {$conflict->date} | Biometric events: {$conflict->biometric_event_count}\n";
        echo "    ACTION: This manual attendance blocks processing of biometric events.\n\n";
    }
}

// Query 4: User 2 (Employee 231)
echo "4. USER 2 (EMPLOYEE 231) - ATTENDANCE SUMMARY\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$user2 = DB::select("
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric,
        COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual
    FROM attendances
    WHERE user_id = 2
");
if ($user2) {
    $row = $user2[0];
    echo "  Total: {$row->total} | Biometric: {$row->biometric} | Manual: {$row->manual}\n";
}
echo "\n";

// Query 5: Biometric processing status
echo "5. BIOMETRIC EVENTS PROCESSING STATUS\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$bioStatus = DB::select("
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
        COUNT(CASE WHEN processing_status = 'error' THEN 1 END) as errors,
        COUNT(CASE WHEN error_reason = 'manual_attendance_conflict' THEN 1 END) as blocked_by_manual_conflict
    FROM biometric_events
");
if ($bioStatus) {
    $row = $bioStatus[0];
    echo "  Total events: {$row->total}\n";
    echo "  Pending: {$row->pending}\n";
    echo "  Processed: {$row->processed}\n";
    echo "  Errors: {$row->errors}\n";
    echo "  ⚠️  Blocked by manual_attendance_conflict: {$row->blocked_by_manual_conflict}\n";
}
echo "\n";

// Query 6: Events blocked by manual conflict
echo "6. BIOMETRIC EVENTS BLOCKED BY MANUAL CONFLICT\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$blocked = DB::select("
    SELECT
        be.id,
        be.employee_code,
        be.local_punch_time,
        be.direction,
        be.processing_status,
        COALESCE(u.first_name, 'UNMAPPED') as first_name,
        COALESCE(u.last_name, '') as last_name
    FROM biometric_events be
    LEFT JOIN users u ON be.user_id = u.id
    WHERE be.error_reason = 'manual_attendance_conflict'
    ORDER BY be.local_punch_time DESC
    LIMIT 20
");

if (count($blocked) === 0) {
    echo "  No blocked events.\n";
} else {
    echo "  Found " . count($blocked) . " blocked event(s):\n\n";
    foreach ($blocked as $evt) {
        echo "  [Event ID: {$evt->id}] {$evt->employee_code} | {$evt->first_name} {$evt->last_name}\n";
        echo "    Time: {$evt->local_punch_time} | Direction: {$evt->direction}\n";
        echo "    Status: {$evt->processing_status}\n\n";
    }
}

// Query 7: Old manual attendance
echo "7. LEGACY MANUAL ATTENDANCE (Created before 2026-07-01)\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$legacy = DB::select("
    SELECT
        a.id,
        CONCAT(u.first_name, ' ', u.last_name) as employee_name,
        u.employee_code,
        a.date,
        a.check_in_time,
        a.check_out_time,
        a.total_working_minutes,
        a.created_at
    FROM attendances a
    JOIN users u ON a.user_id = u.id
    WHERE a.source = 'manual'
      AND a.created_at < '2026-07-01'
    ORDER BY a.created_at DESC
");

if (count($legacy) === 0) {
    echo "  No legacy manual attendance found.\n";
} else {
    echo "  Found " . count($legacy) . " legacy record(s):\n\n";
    foreach ($legacy as $rec) {
        echo "  [ID: {$rec->id}] {$rec->employee_name} ({$rec->employee_code})\n";
        echo "    Date: {$rec->date} | Created: {$rec->created_at}\n";
        echo "    Check-in: {$rec->check_in_time} | Check-out: {$rec->check_out_time}\n";
        echo "    Working minutes: {$rec->total_working_minutes}\n\n";
    }
}

// Query 8: Attendance breaks summary
echo "8. ATTENDANCE BREAKS SUMMARY\n";
echo "─────────────────────────────────────────────────────────────────────────────────\n";
$breaks = DB::select("
    SELECT
        COUNT(*) as total_breaks,
        COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric_breaks,
        COUNT(CASE WHEN source = 'manual' OR source IS NULL THEN 1 END) as manual_or_null_breaks
    FROM attendance_breaks
");
if ($breaks) {
    $row = $breaks[0];
    echo "  Total breaks: {$row->total_breaks}\n";
    echo "  Biometric breaks: {$row->biometric_breaks}\n";
    echo "  Manual/null breaks: {$row->manual_or_null_breaks}\n";
}
echo "\n";

echo "═════════════════════════════════════════════════════════════════════════════════\n";
echo "AUDIT COMPLETE\n";
echo "═════════════════════════════════════════════════════════════════════════════════\n\n";
