# Intersmart Employee Portal — QA Report

**Environment tested:** https://www.workplace.intersmart.in/ (production)
**Test date:** 7 September 2026
**Tester:** Team QA / Claude Code QA audit
**Accounts used:** Super Admin (admin@intersmart.in), Team Lead (abhiram@intersmart.in), Employee (aswathi@intersmart.in)
**Method:** SRS review (docs/SRS.html) → backend/frontend source review → live functional, authorization, and API testing against production, using direct API calls (Sanctum bearer tokens obtained via real login) plus Chrome browser automation for UI/UX/navigation verification. All test data created during this audit was cleaned up or reverted (see §10).

---

## 1. Executive Summary

- **~90 discrete checks performed** across authentication, role-based access control, Leave/WFH/Attendance/Travel-Allowance workflows, Employee/Team management, Community, Issues, and API-level authorization/error-handling, backed by direct source review of the relevant Laravel controllers.
- **14 confirmed bugs**, full detail in §5 and `QA-BUGS.json`:
  - **Critical: 2** (BUG-001, BUG-002)
  - **High: 3** (BUG-003, BUG-004, BUG-005)
  - **Medium: 6** (BUG-006 – BUG-011)
  - **Low: 3** (BUG-012 – BUG-014, numbering per JSON file)
- **Headline finding:** the Employee-Management and Team-Management modules share one coarse `role:Super Admin|Team Lead|HR` route gate with **no ownership/team-scoping logic inside the controllers at all**. This lets any Team Lead account view/edit every employee's PII company-wide, fully manage (create/rename/delete) every department including ones they don't belong to, and — most seriously — reset the password of any user, including the Super Admin, via the same unrestricted endpoint group. This was proven live (create/edit/delete a real team; edit/disable a real employee record) and confirmed by source review for the password-reset path (not executed live against the real admin account, for safety).
- Several leave/WFH/TA business rules described in the SRS as hard blocks are, in the live system, softer or bypassable in ways that matter: single-day leave requests skip Super Admin's mandatory final approval; late-notice Casual Leave is marked unpaid **and** still deducted from the paid balance; deleting an approved leave claims to restore the balance but does not; and Super Admin — who the SRS says cannot apply for leave/WFH/TA on their own account — successfully did so for WFH and TA.
- Two UI/UX consistency gaps were found (Employees page shows a misleading empty state to an unauthorized role instead of redirecting; Departments page shows full mutate controls to every role) — both **combine with** the backend issues above to turn what would otherwise be harmless cosmetic gaps into real exposure for the Team Lead role.
- On the positive side: authentication, session handling, unauthenticated/invalid-token rejection, the leave overlap/duplicate-date check, the Leave approval module's *team-scoping logic for Team Lead* (correctly implemented, unlike Employee/Team), Community post/comment delete authorization, Community XSS handling (payloads render as literal escaped text, do not execute), the employee-search endpoint's minimal field exposure, and most of the documented Super-Admin-only endpoints (audit-logs, settings, reports, Hubstaff, addon permissions, admin maintenance routes) **all passed** their authorization tests cleanly.
- **Coverage was not uniform.** Auth, RBAC, Leave, WFH, Attendance, and Travel Allowance received deep, workflow-level testing. Community, Issues, Notifications, and Employee/Team management received solid but narrower testing. Project Management (beyond a few endpoint checks), Hubstaff data sync, Documents/Policies, Holidays/Calendar, Recognitions/Hall, Birthday Wishes, CSV import, Email/SMTP, Storage retention, and mobile-viewport responsive rendering were **not deep-tested** — see §4 and §7 for exactly what was and wasn't exercised, and why.

**Overall verdict: Not ready for production in its current state** — see §12.

---

## 2. Test Environment

| Item | Value |
|---|---|
| Frontend URL | https://www.workplace.intersmart.in/ |
| API base (discovered) | https://workplace.intersmart.in/api/api *(see note below)* |
| Frontend hosting | Vercel (per SRS) |
| Backend hosting | cPanel, git auto-pull (per SRS; confirmed by stack traces revealing `/home/workplaceintersm/public_html/api/Inter-Smart-Portal/backend/...`) |
| Browser | Chrome (via Claude-in-Chrome automation), desktop viewport 1568×675/606 |
| Date/time of testing | Monday, 7 September 2026, ~11:00–11:40 UTC (~16:30–17:07 IST) |
| Accounts | Super Admin (id 1), Team Lead "Abhiram P Mohan" (id 29, team QA), Employee "Aswathi M Ashok" (id 42, team QA) |

**Note on the API base URL:** the production API is reachable at `https://workplace.intersmart.in/api/api/...` — a doubled `/api/api` segment (the backend Laravel app is deployed under a `/api` subdirectory on cPanel, and Laravel's own API routes are additionally prefixed `/api` internally). A plain `POST https://workplace.intersmart.in/api/login` does **not** reach the login endpoint — it silently matches an unrelated `web.php` named route and returns a misleading `405 Method Not Allowed (GET, HEAD only)`. This isn't a functional bug (the frontend's configured `NEXT_PUBLIC_API_URL` already accounts for it, and everything works end-to-end through the real UI), but it is a sharp edge for anyone integrating with or documenting the API directly, and is worth calling out for the dev team.

**Responsive/mobile testing limitation:** the browser-automation `resize_window` tool did not change the rendered viewport in this session after two attempts (screenshots continued to render at the full desktop width). Mobile/tablet breakpoint testing (§7, §9) is therefore **not verified** in this pass and should be re-run manually or with a different tool.

---

## 3. Role Coverage

| Role | Login | Functional | Authorization | UI | API |
|---|---|---|---|---|---|
| Super Admin | ✅ Pass | ✅ Pass (dashboard, employee list, community, settings-adjacent reads) | ✅ Pass (all admin-only endpoints reachable; correctly the only role that can reach /settings, /audit-logs, etc.) | ✅ Pass | ✅ Pass, with 2 findings (BUG-007, BUG-008: self-service WFH/TA) |
| Team Lead | ✅ Pass | ✅ Pass (dashboard correctly team-scoped; Leave/WFH approval correctly team-scoped) | ❌ **Fail** — BUG-001, BUG-002, BUG-003 (unrestricted Employee & Team management, incl. password reset) | ⚠️ Partial (nav mostly correct; Departments page over-exposes controls, BUG-012) | ❌ **Fail** — same three findings |
| Employee | ✅ Pass | ✅ Pass (leave apply, TA apply, WFH apply/cutoff, community post, issue raise) | ✅ Pass — correctly blocked from every admin/TL-only endpoint tested | ⚠️ Partial (Employees page shows misleading empty state instead of redirecting, BUG-011; Departments page over-exposes controls, BUG-012 — cosmetic only for this role since backend correctly rejects) | ✅ Pass |

---

## 4. Module Test Matrix

Status legend: **PASS** (tested, correct) · **PARTIAL** (some paths tested, others not) · **FAIL** (bug confirmed) · **BLOCKED** (could not test — see reason) · **NOT TESTED** (out of scope for this pass, given time/risk).

| Module | Status | Tests | Passed | Failed | Bugs |
|---|---|---:|---:|---:|---:|
| Authentication & Session | PASS | 8 | 8 | 0 | 0 |
| RBAC — cross-cutting (nav, direct URL, API) | FAIL | 20 | 15 | 5 | 3 (BUG-001/002/003, plus UI aspects in 011/012) |
| Employee Management | FAIL | 9 | 6 | 3 | BUG-001, BUG-003, BUG-011 |
| Team / Department Management | FAIL | 6 | 3 | 3 | BUG-002, BUG-012 |
| Leave Management | FAIL | 12 | 9 | 3 | BUG-004, BUG-005, BUG-006 |
| Leave Policy Add-on | NOT TESTED | 0 | – | – | – |
| Work From Home | FAIL | 5 | 4 | 1 | BUG-007 |
| Attendance & Biometric | PARTIAL | 5 | 5 | 0 | 0 *(manual check-in/out cycle blocked — see §7; validation paths that were reachable all passed)* |
| Travel Allowance | FAIL | 8 | 5 | 3 | BUG-008, BUG-009, BUG-010 |
| Project Management Suite | PARTIAL | 4 | 4 | 0 | 0 *(spot-checked only; full lifecycle not exercised)* |
| Hubstaff Integration | PARTIAL | 2 | 2 | 0 | 0 *(role-gate confirmed only; no data sync exercised)* |
| Community, Chat & AI | PARTIAL | 5 | 5 | 0 | 0 *(feed post/delete/XSS tested; DM, polls, AI assistant not tested)* |
| Announcements / Recognitions / Birthdays | NOT TESTED | 0 | – | – | – |
| Holidays & Calendar | NOT TESTED (read-only glance) | 0 | – | – | – |
| Documents & HR Policies | NOT TESTED | 0 | – | – | – |
| Issues / Helpdesk | PASS | 3 | 3 | 0 | 0 *(BUG-014 is a documentation mismatch, not a functional failure)* |
| Notifications | PARTIAL | 1 | 1 | 0 | 0 *(generation confirmed via real leave-approval notification; read/delete UI not exercised)* |
| Reports & Audit Logs | PARTIAL | 3 | 3 | 0 | 0 *(access-control confirmed; report content/filters not exercised)* |
| Settings / Customization / Maintenance | PARTIAL | 6 | 6 | 0 | 0 *(access-control confirmed for all; destructive maintenance actions intentionally not executed)* |
| Dashboard | PASS | 4 | 3 | 1 | BUG-013 (cosmetic) |
| UI/UX general | PARTIAL | — | — | — | BUG-011, BUG-012 |
| Responsive (mobile/tablet) | BLOCKED | 0 | – | – | Tooling limitation, see §2 |
| Security (IDOR/XSS/auth-bypass) | FAIL | 10 | 8 | 2 | BUG-001 (critical), plus general access-control findings above |

---

## 5. Complete Bug List

Full structured detail (preconditions, exact repro steps, evidence, root cause, suggested fix) for every bug is in **`QA-BUGS.json`**. Summary:

| ID | Title | Severity | Priority | Module |
|---|---|---|---|---|
| BUG-001 | Team Lead can reset the password of ANY user, including Super Admin | **Critical** | P0 | Employee Management |
| BUG-002 | Team Lead has unrestricted create/edit/delete access to every Team/Department | **Critical** | P0 | Teams |
| BUG-003 | Team Lead has full, un-scoped Employee Management access company-wide | High | P1 | Employee Management |
| BUG-004 | Single-day leave requests skip mandatory Super Admin final approval | High | P1 | Leave Management |
| BUG-005 | Deleting an approved leave claims "balance restored" but doesn't refund it | High | P1 | Leave Balances |
| BUG-006 | Late-notice CL is marked unpaid/LOP but still deducted from paid balance | Medium | P2 | Leave Management |
| BUG-007 | Super Admin can create + auto-approve WFH for their own account | Medium | P2 | Work From Home |
| BUG-008 | Super Admin can submit a TA claim for their own account | Medium | P2 | Travel Allowance |
| BUG-009 | TA validation errors return HTTP 500 instead of 422 | Medium | P2 | Travel Allowance |
| BUG-010 | TA line items accept $0.00 with no minimum-value validation | Low | P3 | Travel Allowance |
| BUG-011 | /employees has no frontend route guard for Employee role (misleading empty state) | Medium | P2 | Navigation / Employee Mgmt |
| BUG-012 | /teams renders full mutate controls to every role incl. plain Employee | Medium | P2 | Navigation / Teams |
| BUG-013 | Super Admin's "My Leave Balances" widget shows misleading "0" | Low | P3 | Dashboard |
| BUG-014 | SRS/API docs list DELETE /issues/{id} but the route doesn't support it | Low | P3 | Issues / Docs |

See §11 for recommended fix order.

---

## 6. Security Findings

### Confirmed vulnerabilities

1. **BUG-001 (Critical) — Team Lead → Super Admin privilege escalation via password reset.** Verified by source review of `EmployeeController@updatePassword` (no ownership/hierarchy check) plus live confirmation that the same protected route group grants a Team Lead full, unrestricted access to sibling employee-mutation endpoints. **Not executed live against the real Super Admin account**, to avoid disrupting production access — this is a code-certain finding, not a live-exploited one, but the evidence is unambiguous.
2. **BUG-002 (Critical) — Team Lead unrestricted Team CRUD.** Live-exploited and reverted: created, renamed, and deleted a real department as a Team Lead account, confirmed no ownership check exists in `TeamController`.
3. **BUG-003 (High) — Team Lead cross-team data exposure.** Live-confirmed: a Team Lead can read full PII (phone, DOB, blood group, marital status, address fields) for every employee company-wide, and can edit/disable any employee's account, not just their own team's.
4. **BUG-008 (Medium) — Self-approval conflict-of-interest risk.** Super Admin, the sole approver of Travel Allowance claims, was able to create a TA claim for their own account. The audit stopped short of also live-testing self-approval/self-mark-paid to avoid creating a persistent bogus "paid" financial record in production, but the same account controls both the applicant and approver actions for this workflow.

### Suspicious findings requiring developer verification

- **Leave/WFH/TA "apply" endpoints generally** do not appear to check the caller's role against the intended applicant role documented in the SRS (Employee/Team Lead only) — only Super Admin's self-application was tested; whether other unintended combinations exist (e.g., a role applying on behalf of another arbitrary user_id) was not fully explored and should be checked by the dev team.
- **`LeaveRequestController@apply`** accepts an optional `user_id` override for Super Admin/HR (seen at line ~505-513 during code review) — this is presumably intended for the "mark leave on behalf of employee" admin feature, but was not independently verified for proper scoping in this pass.

### Passed security checks

- No SQL injection, auth-bypass, or credential exposure found in any tested flow.
- XSS payload (`<script>alert(1)</script>`, `<img onerror=...>`) posted to the Community feed was stored raw but **rendered as literal escaped text on screen — did not execute**. React's default escaping is working correctly here.
- Unauthenticated requests, and requests with a garbage bearer token, were correctly rejected with 401 across every endpoint tested.
- Biometric ingestion (`/v1/biometric/ingest`) and the scheduler webhook (`/system/scheduler/run`) both correctly reject requests without their shared secret (401), with no payload processed.
- Community post/comment deletion is correctly restricted to the author or Super Admin (verified: a Team Lead's attempt to delete another user's post was rejected with 403).
- `employees-search` (used by all roles for directory lookups) exposes only name/email/designation/role/photo — no PII leakage there.
- Every explicitly Super-Admin-only endpoint tested (audit-logs, settings, email-settings, storage-settings, direct-chat/admin/*, addons/permissions, admin/run-migrations, admin/optimize-cache, admin/fix-attendance-timezone, admin/ensure-database-columns, leave-balance-audit-logs, admin/ta-requests, hubstaff/analytics, reports/employees) correctly rejected both Team Lead and Employee tokens with 403.

---

## 7. SRS Compliance

| SRS Requirement | Result | Notes |
|---|---|---|
| FR-AUTH-1 Login/logout/session | PASS | Valid/invalid credentials, unauthenticated access, logout, garbage token all behave correctly |
| FR-DASH-1 Role-specific dashboard | PASS | Correct per-role widgets, tenure calc, team-scoped "Team Status Today" for TL |
| FR-EMP-1 Employee CRUD scoped to own team (TL) | **FAIL** | BUG-001, BUG-003 — no team scoping exists at all |
| FR-EMP-2 Self-service profile & change requests | NOT TESTED | Out of scope for this pass |
| FR-TEAM-1 Department CRUD, Super-Admin-only mutation | **FAIL** | BUG-002 — Team Lead has full unrestricted access |
| FR-LV-1 CL ≥3 days advance notice, backend-enforced | **SRS/Implementation inconsistency** | Not blocked — request is accepted but auto-flagged Unpaid/LOP with a clear message. Reasonable behavior, but doesn't match "backend-enforced" wording; see BUG-006 for the balance-double-deduction defect layered on top |
| FR-LV-2 Two-stage TL→Admin approval | **FAIL** | BUG-004 — single-day requests skip Admin entirely |
| FR-LV-3 Cancellation/override/LOP conversion | PARTIAL PASS | Cancellation and admin-delete-with-refund-claim tested (refund itself fails, BUG-005); LOP conversion confirm/reject flow not tested |
| FR-LV-4 Leave balances & carry-forward, audited adjustments | PARTIAL PASS | Manual adjustment + audit trail confirmed working (used to restore test data); carry-forward-expiry-at-year-boundary not testable without time travel; BUG-005/BUG-006 defects found within this area |
| FR-LP-1 Leave Policy accrual engine | NOT TESTED | Out of scope for this pass |
| FR-WFH-1 WFH lifecycle, same-day block for non-admin | **SRS/Implementation inconsistency** + **FAIL** | Actual rule is a cutoff-time (09:45/14:30), not an absolute date block — reasonable, but SRS wording overstates it. Separately, BUG-007 (Super Admin self-application) is a genuine violation of a different, explicit SRS rule |
| FR-ATT-1 Manual check-in/out/break | **SRS/Implementation inconsistency** | Manual clock-in/out only available on days with an approved WFH; all other attendance is biometric-only. This is undocumented in the SRS but is a sound anti-fraud control, not a defect |
| FR-ATT-2 Biometric ingestion, shared-secret auth | PASS | Correctly rejects requests without the secret |
| FR-TA-1 Apply/itemize/track TA, Employee/TL only | **FAIL** | BUG-008 — no role restriction on the apply endpoint at all |
| FR-TA-2 TA approval/override/payment marking | PARTIAL PASS | Approve/reject/mark-paid endpoints correctly Super-Admin-gated; full override/email-signed-link flow not tested |
| FR-PM-1..5 Project Management suite | NOT TESTED (spot-checked only) | daily-report/team-members endpoints reachable and correctly role-adaptive; full lifecycle not exercised |
| FR-COM-1 Community feed | PASS | Post create/delete authorization correct; XSS safely escaped |
| FR-COM-2 Direct messaging | NOT TESTED | Out of scope for this pass |
| FR-COM-3 AI assistant | NOT TESTED | Out of scope for this pass |
| FR-ANN-1 Announcements | NOT TESTED | Out of scope for this pass |
| FR-RC-1 Recognitions & Hall | NOT TESTED | Out of scope for this pass |
| FR-BW-1 Birthday wishes | NOT TESTED | Out of scope for this pass (surfaced correctly on dashboard read-only) |
| FR-CAL-1 Holidays & calendar | NOT TESTED | Out of scope for this pass (surfaced correctly on dashboard read-only) |
| FR-DOC-1 Documents & HR policies | NOT TESTED | Out of scope for this pass |
| FR-ISS-1 Issues/helpdesk | PASS | Create/status-change authorization/resolution-timestamp all correct; BUG-014 is a docs-only mismatch |
| FR-NOT-1 Notifications | PARTIAL PASS | Generation confirmed (real leave-approval notification observed); mark-read/delete UI not exercised |
| FR-MSC-1..3 Emergency contacts / sticky notes / favorites | NOT TESTED | Out of scope for this pass |
| FR-REP-1 / FR-AUD-1 Reports & audit trail | PARTIAL PASS | Access control confirmed for both; report content/filter correctness and audit-log completeness not deep-tested |
| FR-SET-1..5 Settings/customization/email/storage/maintenance | PARTIAL PASS | Access control confirmed for all; no destructive maintenance action executed (by design, per test-safety instructions) |
| §2.2 "Super Admin cannot apply for leave/WFH/TA on own account" | **FAIL** | BUG-007, BUG-008 |
| §5.2/§5.3 Navigation & screen inventory | PASS (with UI gaps) | Header/sidebar nav differences per role matched the SRS table; BUG-011/BUG-012 are route-guard gaps on two specific pages |
| §5.4 Responsive/no-horizontal-scroll | BLOCKED | Tooling limitation this session — not verified |

---

## 8. API Findings

- **Base URL structure** is `https://workplace.intersmart.in/api/api/...` (double `/api`) — works correctly end-to-end, but is a sharp edge for documentation/integration (§2).
- **Consistent, correct 401** for missing/invalid bearer tokens across every endpoint sampled.
- **Consistent, correct 403** ("User does not have the right roles." / "Forbidden" / "Super Admin access required.") for every Super-Admin-only and Team-Lead/Super-Admin-only endpoint tested, **except** Employee Management and Team Management mutation, which are supposed to be Team-Lead-restricted-to-own-team but are not scoped at all (BUG-001/002/003).
- **Validation error handling is inconsistent across modules**: Leave/WFH/Employee endpoints return proper 422s with clear messages; Travel Allowance returns 500 for the same class of error (BUG-009) due to a generic exception handler swallowing `ValidationException`.
- **Two apply-type endpoints (WFH, TA) accept the Super Admin as a valid applicant** with no role check at all (BUG-007, BUG-008), unlike the Employee-Management endpoints which are at least gated by role (just not correctly scoped).
- **Signed email-action links** (`/leave-requests/{id}/email-approve`, `/ta-requests/{id}/email-approve`, etc.) were not exercised (would require intercepting a real outbound email) — not tested, flagged as **NOT TESTED**, not a pass.
- **Biometric and scheduler webhook endpoints** correctly reject unauthenticated calls; neither was tested with a valid secret (no safe way to do so without a real device agent / without triggering `schedule:run` in production) — correctly treated as **BLOCKED** for the "authenticated success path," but the auth rejection path is confirmed working.

---

## 9. UI/Responsive Findings

- Role-based navigation differences (header quick-links and sidebar groups) matched the SRS table for all three roles: Super Admin (Employee Management, Community, Attendance Management, Hubstaff), Team Lead (Dashboard, Community, Tasks, Hubstaff), Employee (Dashboard, Community, Tasks).
- **Inconsistent route-guard behavior**: `/settings` and `/audit-logs` correctly redirect unauthorized roles to `/dashboard`; `/employees` does not (BUG-011); `/teams` renders full mutation UI to every role (BUG-012).
- No broken layouts, missing icons, console errors (beyond the expected 403 AxiosError from the BUG-011 scenario), or failed asset loads were observed on any page visited at desktop resolution.
- **Responsive/mobile breakpoints (320–1440px) were not verified** — the automation tool's window-resize did not take effect in this session after two attempts. This should be re-tested manually or with browser DevTools device emulation before sign-off, since the SRS makes an explicit, testable claim about it (§5.4).
- Login page correctly auto-fills branding/customization (logo, tagline, feature chips) from the public `/customization/settings` endpoint before authentication, as designed.

---

## 10. Data Integrity Findings

- **BUG-005** is the most serious data-integrity finding: an admin cleanup action falsely reports a balance restoration that does not occur.
- **BUG-006**: a single leave day can be simultaneously counted as balance-consumed and unpaid/LOP, silently double-penalizing the employee — this compounds over every late-notice CL request an employee ever files.
- A minor internal inconsistency was observed between two different `leave-balances` response shapes for the same user: the per-user endpoint reported `total_leaves_taken: 5` immediately after a manual balance override, while the admin list endpoint reported `total_leaves_taken: 0` for the same user in the same moment. Not chased to a root cause given time constraints — noted here for the dev team to investigate; not filed as a numbered bug since it wasn't independently reproduced a second time.
- All test data created during this audit (1 probe department, 1 probe employee, 2 probe leave requests, 1 probe WFH request, 3 probe TA claims, 1 probe community post, 1 probe helpdesk issue) was deleted, cancelled, or resolved by the end of the session. The one real side effect — a test employee's Casual Leave balance being decremented by the BUG-005/BUG-004 chain — was manually corrected back to its original value via a documented, audited Super Admin balance adjustment.

---

## 11. Recommended Fix Priority

1. **Critical — fix immediately:**
   - BUG-001 (Team Lead → Super Admin password reset / full account takeover)
   - BUG-002 (Team Lead unrestricted Team CRUD)
2. **High — fix before next release:**
   - BUG-003 (Team Lead cross-team employee data exposure)
   - BUG-004 (single-day leave bypasses Super Admin approval) — or explicitly ratify as intended and update the SRS
   - BUG-005 (leave-balance refund-on-delete doesn't work)
3. **Medium — fix soon:**
   - BUG-006 (LOP double-deduction)
   - BUG-007, BUG-008 (Super Admin self-application for WFH/TA)
   - BUG-009 (TA validation 500s)
   - BUG-011, BUG-012 (frontend route-guard/UI gating gaps)
4. **Low — backlog:**
   - BUG-010 (zero-amount TA items)
   - BUG-013 (misleading 0 balance widget for Super Admin)
   - BUG-014 (SRS/API doc mismatch for issue deletion)

Independently of the numbered bugs: re-run responsive/mobile testing with a working tool before sign-off, and have the dev team verify the "suspicious findings" in §6.

---

## 12. QA Conclusion

**Not ready for production.**

The portal's core day-to-day workflows (login, dashboard, leave/WFH/TA application, attendance, community, issues) function correctly for their primary "happy path," and the majority of Super-Admin-only endpoints are properly locked down. However, this audit found **two Critical and three High severity authorization/data-integrity defects**, the most serious of which (BUG-001) allows any Team Lead account to seize full Super Admin control of the entire system, and another (BUG-002, live-exploited and reverted) allows any Team Lead to delete or restructure any department in the company. These are not edge cases requiring unusual conditions — they are reachable with a single, ordinary Team Lead login and a normal API call or, for the Team-CRUD issue, through the ordinary web UI itself.

Until BUG-001 and BUG-002 are fixed (and BUG-003 addressed, since it's the same root cause), this application should not be trusted with real employee PII or organizational structure in a multi-Team-Lead production environment. The Leave/WFH/TA findings (BUG-004 through BUG-008) are lower risk individually but collectively indicate the approval-workflow and self-service guardrails need a dedicated review pass, not just point fixes.

**Recommendation:** fix the Critical/High findings, re-test the full RBAC matrix (this report's §3 and §6 give a ready-made checklist), and complete the modules marked NOT TESTED/PARTIAL/BLOCKED in §4 and §7 before considering another production readiness review.
