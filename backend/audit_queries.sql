-- Production Attendance Audit Queries
-- READ-ONLY - Does not modify data

-- 1. Overall attendance counts
SELECT
    COUNT(*) as total_attendance,
    COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric_count,
    COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual_count,
    COUNT(CASE WHEN source IS NULL OR source = '' THEN 1 END) as null_source_count
FROM attendances;

-- 2. List all manual attendance with user details
SELECT
    a.id,
    a.user_id,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    u.employee_code,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.source,
    a.status,
    a.total_working_minutes,
    a.created_at,
    a.updated_at,
    (SELECT COUNT(*) FROM attendance_breaks WHERE attendance_id = a.id) as break_count,
    (SELECT COUNT(*) FROM biometric_events WHERE user_id = a.user_id AND DATE(local_punch_time) = a.date) as bio_event_count
FROM attendances a
JOIN users u ON a.user_id = u.id
WHERE a.source = 'manual'
ORDER BY a.date DESC;

-- 3. Check for conflicts (manual attendance + biometric events on same date)
SELECT
    a.id as attendance_id,
    a.user_id,
    u.employee_code,
    CONCAT(u.first_name, ' ', u.last_name) as employee_name,
    a.date,
    COUNT(DISTINCT be.id) as biometric_event_count,
    a.created_at
FROM attendances a
JOIN users u ON a.user_id = u.id
LEFT JOIN biometric_events be ON be.user_id = a.user_id AND DATE(be.local_punch_time) = a.date
WHERE a.source = 'manual'
GROUP BY a.id, a.user_id, u.employee_code, u.first_name, u.last_name, a.date, a.created_at
HAVING COUNT(DISTINCT be.id) > 0
ORDER BY a.date DESC;

-- 4. User 2 (Employee 231) attendance summary
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric,
    COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual
FROM attendances
WHERE user_id = 2;

-- 5. User 10 attendance summary
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric,
    COUNT(CASE WHEN source = 'manual' THEN 1 END) as manual
FROM attendances
WHERE user_id = 10;

-- 6. Biometric events processing status
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN processing_status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN processing_status = 'processed' THEN 1 END) as processed,
    COUNT(CASE WHEN processing_status = 'error' THEN 1 END) as errors,
    COUNT(CASE WHEN error_reason = 'manual_attendance_conflict' THEN 1 END) as blocked_by_manual_conflict
FROM biometric_events;

-- 7. Biometric events blocked by manual_attendance_conflict
SELECT
    be.id,
    be.employee_code,
    be.local_punch_time,
    be.direction,
    be.processing_status,
    be.error_reason,
    u.first_name,
    u.last_name
FROM biometric_events be
LEFT JOIN users u ON be.user_id = u.id
WHERE be.error_reason = 'manual_attendance_conflict'
ORDER BY be.local_punch_time DESC
LIMIT 20;

-- 8. Attendance breaks summary
SELECT
    COUNT(*) as total_breaks,
    COUNT(CASE WHEN source = 'biometric' THEN 1 END) as biometric_breaks,
    COUNT(CASE WHEN source = 'manual' OR source IS NULL THEN 1 END) as manual_or_null_breaks
FROM attendance_breaks;

-- 9. Old manual attendance (created before biometric integration)
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
    DATE(a.created_at) as creation_date
FROM attendances a
JOIN users u ON a.user_id = u.id
WHERE a.source = 'manual'
  AND a.created_at < '2026-07-01'
ORDER BY a.created_at DESC;

-- 10. Orphan manual attendance (no employee, test data)
SELECT
    a.id,
    a.user_id,
    a.date,
    a.check_in_time,
    a.check_out_time,
    a.total_working_minutes,
    a.created_at
FROM attendances a
WHERE a.source = 'manual'
  AND (a.check_in_time IS NULL AND a.check_out_time IS NULL)
ORDER BY a.created_at DESC;
