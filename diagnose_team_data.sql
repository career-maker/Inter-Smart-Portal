-- Diagnostic queries for Team Lead dashboard issues
-- Run these in Supabase SQL Editor to see the current data state

-- 1. Find all Team Leads and their team assignments
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.team_id,
    t.id as team_id_from_lead,
    t.name as team_name
FROM users u
LEFT JOIN model_has_roles mhr ON u.id = mhr.model_id AND mhr.model_type = 'App\Models\User'
LEFT JOIN roles r ON mhr.role_id = r.id AND r.name = 'Team Lead'
LEFT JOIN teams t ON t.team_lead_id = u.id
WHERE r.id IS NOT NULL
ORDER BY u.first_name;

-- 2. For each team, show members
SELECT
    t.id as team_id,
    t.name as team_name,
    t.team_lead_id,
    COUNT(DISTINCT CASE WHEN u.team_id = t.id THEN u.id END) as member_count
FROM teams t
LEFT JOIN users u ON u.team_id = t.id AND u.status = 'Active'
GROUP BY t.id, t.name, t.team_lead_id
ORDER BY t.name;

-- 3. Check for pending leave requests from team members
SELECT
    lr.id,
    u.first_name || ' ' || u.last_name as employee,
    u.team_id,
    t.name as team_name,
    lr.start_date,
    lr.end_date,
    lr.tl_status,
    lr.admin_status,
    lr.status,
    lt.name as leave_type
FROM leave_requests lr
JOIN users u ON lr.user_id = u.id
LEFT JOIN teams t ON u.team_id = t.id
LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.status = 'Pending' AND lr.tl_status = 'Pending'
ORDER BY lr.created_at DESC;

-- 4. Show team members without team_id (these won't show in dashboard)
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.team_id,
    u.status
FROM users u
WHERE u.status = 'Active'
AND u.team_id IS NULL
ORDER BY u.first_name;
