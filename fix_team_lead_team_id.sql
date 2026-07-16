-- Fix Team Lead team_id assignments in Supabase
-- Run this in the Supabase SQL Editor if migrations don't fix the issue

-- Step 1: Assign team_id to all Team Leads where it's missing
UPDATE users u
SET team_id = t.id
FROM teams t
WHERE t.team_lead_id = u.id
AND u.team_id IS NULL;

-- Step 2: Verify the fix
SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.team_id,
    t.id as team_id_correct,
    t.name as team_name
FROM users u
LEFT JOIN teams t ON t.team_lead_id = u.id
WHERE t.id IS NOT NULL
ORDER BY t.name;

-- Expected output: All Team Leads should now have team_id matching their team's id
