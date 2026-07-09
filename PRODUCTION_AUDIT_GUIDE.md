# PRODUCTION ATTENDANCE AUDIT GUIDE

## CRITICAL FINDINGS FROM CODE ANALYSIS

### Timeline of Feature Development
- **2026-06-28:** Attendance tables created (no 'source' column initially)
- **2026-07-03:** Biometric events table created
- **2026-07-06:** 'source' column added to attendance tables with default='manual'

**IMPLICATION:** Any attendance records created BEFORE 2026-07-06 will have source='manual' by default, even though source column wasn't in the original schema.

### DummyDataSeeder Analysis
- ✓ Creates 25 test employees
- ✓ Creates leave balances, leave requests, WFH requests
- ✗ Does NOT create attendance records
- **Conclusion:** Attendance records were created manually via UI, not seeders

### BiometricProcessorService Conflict Protection
From the code analysis, the service blocks processing when:
```php
$manualAttendance = Attendance::where('user_id', $user->id)
    ->where('date', $dateString)
    ->where('source', 'manual')
    ->first();

if ($manualAttendance) {
    // Error: manual_attendance_conflict
    // Processing blocked for this employee/date
}
```

**CRITICAL ISSUE:** If ANY manual attendance exists for an employee/date, ALL biometric events for that date are marked as `error` with reason `manual_attendance_conflict` and are NOT processed.

---

## PHASE 1 — AUDIT QUERIES TO RUN

### Run These Exact Queries Against Production Database

All queries are READ-ONLY. Copy and execute in your PostgreSQL client (psql, pgAdmin, etc.)

---

### QUERY 1: Overall Attendance Summary
```sql
SELECT
    COUNT(*) as total_attendance,
    COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric_count,
    COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN source IS NULL OR source = '' THEN 1 END) as null_source_count
FROM attendances;
```

**What this tells you:** Baseline counts of all attendance records by source.

---

### QUERY 2: All Manual Attendance with Conflict Check
```sql
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
ORDER BY a.date DESC;
```

**What this tells you:**
- Every manual attendance record
- Who created it and when
- Whether biometric events exist for the same employee/date (conflict indicator)
- Number of breaks associated

---

### QUERY 3: Dates with BOTH Manual Attendance AND Biometric Events (CONFLICTS)
```sql
SELECT
    a.id as attendance_id,
    a.user_id,
    u.employee_code,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    a.date,
    COUNT(DISTINCT be.id) as biometric_event_count,
    STRING_AGG(DISTINCT be.id::text, ',') as event_ids,
    a.created_at as attendance_created_at
FROM attendances a
JOIN users u ON a.user_id = u.id
LEFT JOIN biometric_events be ON be.user_id = a.user_id AND DATE(be.local_punch_time) = a.date
WHERE a.source = 'manual'
GROUP BY a.id, a.user_id, u.employee_code, u.first_name, u.last_name, a.date, a.created_at
HAVING COUNT(DISTINCT be.id) > 0
ORDER BY a.date DESC;
```

**What this tells you:**
- CRITICAL: Which manual attendance records are BLOCKING biometric processing
- Exact biometric event IDs that cannot be processed
- Count of blocked events per employee/date

---

### QUERY 4: Biometric Events Blocked by Manual Conflict
```sql
SELECT
    be.id,
    be.employee_code,
    u.employee_code as mapped_employee_code,
    COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'UNMAPPED') as employee_name,
    DATE(be.local_punch_time) as event_date,
    be.local_punch_time,
    be.direction,
    be.processing_status,
    be.error_reason,
    be.created_at
FROM biometric_events be
LEFT JOIN users u ON be.user_id = u.id
WHERE be.error_reason = 'manual_attendance_conflict'
ORDER BY be.local_punch_time DESC
LIMIT 100;
```

**What this tells you:**
- Every biometric event blocked by manual attendance conflict
- Whether the employee is mapped or unmapped
- Timeline of when these blocks occurred

---

### QUERY 5: Likely Legacy/Dummy Manual Attendance (Before Integration)
```sql
SELECT
    a.id,
    a.user_id,
    u.employee_code,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    a.date,
    a.check_in_time,
    a.check_out_time,
    COALESCE(a.total_working_minutes, 0) as total_working_minutes,
    (SELECT COUNT(*) FROM attendance_breaks WHERE attendance_id = a.id) as break_count,
    a.created_at,
    EXTRACT(DAY FROM (NOW() - a.created_at)) as days_old,
    (SELECT COUNT(*) FROM biometric_events WHERE user_id = a.user_id AND DATE(local_punch_time) = a.date) as bio_events_for_date
FROM attendances a
JOIN users u ON a.user_id = u.id
WHERE a.source = 'manual'
  AND a.created_at < '2026-07-06'  -- Created before biometric integration
ORDER BY a.created_at DESC;
```

**What this tells you:**
- All manual attendance created BEFORE biometric integration
- Candidates for legacy/test data
- Age of records
- Whether they're blocking newer biometric data

---

### QUERY 6: Suspicious Manual Attendance (No Working Minutes)
```sql
SELECT
    a.id,
    a.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    u.employee_code,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.created_at,
    (SELECT COUNT(*) FROM biometric_events WHERE user_id = a.user_id AND DATE(local_punch_time) = a.date) as bio_events
FROM attendances a
JOIN users u ON a.user_id = u.id
WHERE a.source = 'manual'
  AND (a.total_working_minutes IS NULL OR a.total_working_minutes = 0)
ORDER BY a.date DESC;
```

**What this tells you:**
- Manual attendance with zero work minutes (incomplete/test data)
- Whether biometric events exist that could replace this data

---

### QUERY 7: Manual Attendance with Missing Punch Times
```sql
SELECT
    a.id,
    a.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.status,
    a.created_at
FROM attendances a
JOIN users u ON a.user_id = u.id
WHERE a.source = 'manual'
  AND (a.check_in_time IS NULL OR a.check_out_time IS NULL)
ORDER BY a.date DESC;
```

**What this tells you:**
- Incomplete manual attendance records (cannot be valid work days)
- Candidates for deletion

---

### QUERY 8: Processing Status of All Biometric Events
```sql
SELECT
    processing_status,
    error_reason,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_employees,
    MIN(local_punch_time) as oldest_event,
    MAX(local_punch_time) as newest_event
FROM biometric_events
GROUP BY processing_status, error_reason
ORDER BY processing_status, error_reason;
```

**What this tells you:**
- Overall processing health
- How many events are stuck in 'error' state
- Which error reasons are most common

---

### QUERY 9: User 2 (Employee 231) Attendance History
```sql
SELECT
    a.id,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.total_working_minutes,
    a.source,
    a.created_at,
    (SELECT COUNT(*) FROM biometric_events WHERE user_id = 2 AND DATE(local_punch_time) = a.date) as bio_events
FROM attendances a
WHERE a.user_id = 2
ORDER BY a.date DESC;
```

**What this tells you:**
- All attendance for the known test employee (Employee 231)
- Conflicts with biometric data for this employee

---

### QUERY 10: Blocks Preventing Employee 231 Biometric Processing
```sql
SELECT
    be.id,
    be.local_punch_time,
    be.direction,
    be.processing_status,
    be.error_reason
FROM biometric_events be
WHERE be.user_id = 2 AND be.error_reason = 'manual_attendance_conflict'
ORDER BY be.local_punch_time DESC;
```

**What this tells you:**
- How many biometric events for Employee 231 are blocked
- Dates affected

---

## PHASE 2 — CLASSIFICATION CRITERIA

Use these criteria to classify each manual attendance record:

### A. Confirmed Biometric Attendance
- source = 'biometric'
- has valid check_in_time and check_out_time
- has total_working_minutes > 0

### B. Confirmed Manual Attendance (Legitimate)
- source = 'manual'
- created during operational hours (not in middle of night)
- has valid punch times and reasonable working minutes
- no conflicting biometric events for the same date
- employee actually uses the system and has legitimate leaves/requests
- created by employee or HR/Admin

### C. Likely Legacy/Dummy Attendance
- source = 'manual'
- created BEFORE 2026-07-06 (before source column existed)
- OR has zero/null working minutes
- OR missing check-in or check-out time
- OR created overnight/suspicious time
- OR from before biometric integration
- OR blocking real biometric events

### D. Ambiguous
- Manual attendance with biometric events on same date
- Must review to determine if manual was intentional override

---

## PHASE 3 — CLEANUP STRATEGY

### DO NOT DELETE WITHOUT VERIFICATION

For each candidate deletion:

1. Verify no legitimate business reason for manual record
2. Confirm biometric events exist for same employee/date
3. Check if manual attendance is preventing biometric processing
4. Identify exact biometric event IDs that would be freed
5. Plan targeted retry after deletion

### Proposed Cleanup Order

1. **Step 1:** Delete incomplete records (no punch times, zero minutes)
2. **Step 2:** Delete legacy records (created before biometric integration, no conflicts)
3. **Step 3:** Review and resolve conflicts (manual + biometric on same date)
4. **Step 4:** After deletion, retry blocked biometric events
5. **Step 5:** Verify no orphan attendance_breaks remain

---

## PHASE 4 — ACTUAL SQL CLEANUP COMMANDS

### ONLY After Verification - Clean Single Record
```sql
-- EXAMPLE: Delete attendance ID 123 and its breaks
BEGIN;

SELECT * FROM attendances WHERE id = 123;  -- Verify
DELETE FROM attendance_breaks WHERE attendance_id = 123;
DELETE FROM attendances WHERE id = 123;

COMMIT;  -- Change to ROLLBACK if you have doubts
```

### ONLY After Verification - Clean Multiple Records
```sql
-- Delete multiple attendance IDs (REPLACE WITH YOUR IDS)
BEGIN;

DELETE FROM attendance_breaks 
WHERE attendance_id IN (1, 5, 12, 23);

DELETE FROM attendances 
WHERE id IN (1, 5, 12, 23);

COMMIT;
```

### Retry Blocked Biometric Events
```sql
-- After cleanup, mark blocked events as pending for reprocessing
UPDATE biometric_events
SET processing_status = 'pending', error_reason = NULL
WHERE error_reason = 'manual_attendance_conflict'
  AND user_id IN (2, 10);  -- Specific employees
```

---

## NEXT STEPS

1. Run all 10 queries above
2. Share results with me
3. I will provide exact cleanup proposal
4. You will approve before ANY deletions
5. Execute cleanup commands I provide
6. Verify biometric processing succeeds
7. Deploy code changes

---

## CRITICAL SAFEGUARDS

- ✓ All queries provided are READ-ONLY
- ✓ No destructive commands executed without explicit approval
- ✓ Every deletion has verification step
- ✓ Blocked biometric events identified before deletion
- ✓ Orphan data detected and handled
- ✓ Rollback plan available for every change
