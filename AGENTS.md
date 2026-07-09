# InterSmart Employee Portal Agent Instructions

This repository is under active production debugging. Current code, tests, and verified runtime behavior override older handoff notes, but the handoff context must be preserved unless proven stale.

## Project

- Root: `D:\iss\Inter Smart-Employee-Portal`
- Frontend: `frontend` (Next.js App Router, TypeScript)
- Backend: `backend` (Laravel API, PHP 8.2+, Sanctum, PostgreSQL/Supabase)
- Production deploys from `main`; do not push or deploy without explicit approval.
- Live eSSL source data is external and must remain SELECT-only.

## Controller Rules

- Inspect before changing code.
- Preserve unrelated worktree changes. Do not revert files you did not intentionally change.
- Never interrupt, close, or type into active Claude/agent terminals unless the task explicitly owns that session.
- Open a new terminal/session for isolated delegated work.
- Safe local work may proceed: local edits, tests, builds, local servers, browser checks, and correction loops.
- Explicit approval is required for production deploys, production DB writes, destructive DB operations, source-data changes, checkpoint resets, force pushes, credential changes, secret exposure, remote machine control, and interruption of active agent sessions.

## Current Priority

1. Fix biometric current-day full timeline rebuild so a later IN after OUT reopens the day and clears stale checkout.
2. Reprocess eligible old biometric events when an employee is created with a matching employee code.
3. Fix working-time precision by summing seconds first and converting to minutes only after summing.
4. Audit frontend break-time display and unresolved eSSL break parity.

## Biometric Invariants

- Idempotency is `source_system + source_table + source_event_id`.
- Rebuild attendance from the complete employee-code/day timeline, not just the newest event.
- Do not assume DB break rows match the eSSL report until parity is proven.
- Current-day final state `IN` means the employee is working and stored `check_out_time` must be `NULL`.
- Historical final state `IN` preserves the last completed checkout for review while flagging missing punch-out.
- Sum raw session seconds first; convert/floor to minutes after the total.
- Never recover a whole monthly eSSL table from checkpoint `0` without explicit approval.

## Verification

- Run the smallest affected tests first, then broader regression checks as needed.
- For frontend/runtime work, verify in a browser and check console errors.
- Never claim pass if tests or browser checks were skipped; report the gap.
