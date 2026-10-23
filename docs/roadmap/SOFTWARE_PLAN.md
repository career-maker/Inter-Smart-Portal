# Software Plan: Have vs Build (per role)

Source: manager's sheet `SOURCE_Internal_software_plan.xlsx`. Status judged from code (models, routes, pages) on 2026-10-23.

Legend: **HAVE** works today · **PARTIAL** base exists, extend · **BUILD** new.

Counts: HAVE 7 · PARTIAL 29 · BUILD 30 (66 grouped lines). Confirm PARTIAL items with a demo before final estimates.


## 1. Sales

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Create project (same as sales doc) | **BUILD** | No sales module. Needs a project-intake form with the sales doc fields. |
| Lead list / follow-up sheet | **BUILD** | No leads or CRM tables exist. |
| Inbox (follow-up, proposal, meeting, other) | **BUILD** | Notifications exist; a categorised, status-based inbox does not. |
| Payment-approved notification (from Accounts) | **PARTIAL** | Notification system exists. Payment event must be built first. |
| Projects list: ongoing/completed + % progress | **PARTIAL** | Project list + progress exist; needs sales-only view (own projects). |
| Hold / terminate project | **PARTIAL** | Project status has On Hold / Cancelled. Needs reason + approval trail. |
| Out-of-scope request, 'action required', payment follow-up | **BUILD** | New request types + status reply flow. |
| Completed status: free support, AMC, next follow-up, feedback | **BUILD** | New fields and reminders. |
| Customer feedback / comments any time | **PARTIAL** | Task comments exist; customer feedback does not. |
| Leave request, upcoming leaves, HR complaints | **HAVE** | Leaves, calendar, Issues module already work for all users. |
| Meeting update / upcoming meetings | **BUILD** | Calendar has holidays only; no meeting booking. |
| Sales dashboard (leads, conversion %, target, proposals...) | **BUILD** | Needs lead + target data first. |

## 2. Accounts

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Total project list by payment state (advance awaiting, pending, ...) | **BUILD** | No payment tables. Core of the payment gate. |
| Approve payment (notify Sales, assign PMO / notify PMO) | **BUILD** | Needs payment ledger + notification rules. |
| Terminate / hold project | **PARTIAL** | Status exists; permission for Accounts to be added. |
| Budget increase | **BUILD** | No budget model (only a single 'allotted_effort' on project). |
| Set target (sales target) | **BUILD** | New table: target per person per month. |
| AMC list | **BUILD** | New AMC records + renewal reminders. |

## 3. Project Manager (PMO)

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Project list + progress + hold reasons (approval, content, SMTP...) | **PARTIAL** | Project list exists; reason codes and date/budget-exceeded flags are new. |
| PC-wise project list + PC rating | **BUILD** | Rating system does not exist. |
| Assign PC | **HAVE** | Projects already have a project_coordinator. |
| Allocate budget per department | **BUILD** | Core new feature: budget per dept, per project. |
| Hold project | **PARTIAL** | Status exists; needs reason. |
| Approve out-of-scope (to Sales, with effort) | **BUILD** | Approval engine needed. |
| Payment request to Accounts / budget allocated view | **BUILD** | Depends on Accounts module. |
| Approve corrections with budget | **PARTIAL** | ProjectCorrection exists; budget check + approval step is new. |
| Approve/reject meeting request with date + reason | **BUILD** | Meetings module. |
| Tracker view: dept-wise, drag-drop, budget left, bugs vs changes | **PARTIAL** | Task tracker + bug/correction data exist; budget-left and drag-drop layout are new. |
| Out-of-budget list and action (notify management + HR) | **BUILD** | Needs budget + alert rules. |
| Sprint approval from PC | **PARTIAL** | Task has a 'sprint' text field only; real sprint entity is new. |
| Monthly customer feedback (mandatory) with rating | **BUILD** | Question set must be defined by business. |
| TL / resource feedback, appreciation (group, mail, LinkedIn) | **PARTIAL** | Recognitions module exists; feedback forms and mail/LinkedIn share are new. |
| PM dashboard (charts, PC rating, budget chart, Google reviews) | **BUILD** | Charts on new data. Google review count needs manual entry or API. |

## 4. Project Coordinator (PC)

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Accept new project (shows fixed info: platform, pages, budget, quality, salesperson) | **BUILD** | Needs intake fields + accept step. |
| Project list with status reasons | **PARTIAL** | Same as PMO list, filtered to own projects. |
| Project view with tabs (Scope, Resources, BA, UI, UX, Dev, QA, Bugs, Budget, SysAdmin) | **PARTIAL** | Project detail page exists; tabs, per-tab payment lock and override rules are new. |
| Project categories (CMS, Ecom, Custom web, Mobile + tech) | **PARTIAL** | 'category' field exists; the full tree needs seeding. |
| Business analysis form | **BUILD** | Purpose, company, competitors, audience, USP, conclusion. |
| Resources (brand book, logo, domain, brochure...) | **BUILD** | File/link store per project (storage exists). |
| UI page definition, sections, budget auto-calc | **BUILD** | Pages and sections tables + budget formula. |
| UI daily actions (status chain, Figma link, revisions 1-3) | **PARTIAL** | Task status exists; page-level status chain is new. |
| UX / Dev effort request, sprint create, PM approval, date request | **BUILD** | Effort + sprint approval workflow. |
| QA auto-allocation on completion, bug list, TL verify | **PARTIAL** | Bug tracker (BugSmart) exists; auto-handoff is new. |
| System admin: allocate server, go live | **PARTIAL** | is_live + live_date already exist; server allocation is new. |
| PC dashboard | **BUILD** | Charts on new data. |

## 5. UI TL

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| New project: allocate resource, schedule, reject with reason | **PARTIAL** | Task assignees exist; reject-with-reason + scheduling are new. |
| New task on existing project (correction, extra page, bug...) | **PARTIAL** | Corrections and tasks exist; scenario types to add. |
| Resource inbox with progress bars, drag-drop priority | **PARTIAL** | My Tasks exists; drag-drop priority and expanders are new. |
| Hubstaff time met / left, activity | **HAVE** | Hubstaff integration is built and fixed. |
| Project list / project view with colour for date overrun | **PARTIAL** | Lists exist; overrun colours + page counts (12/15) are new. |
| Team list (time, leaves, appreciation, rating, overdue, rejections) | **PARTIAL** | Team, leave and Hubstaff data exist; rating + rejections new. |
| Individual feedback (fixed questions) | **BUILD** | New feedback form. |
| Appreciation, leave list and approval | **HAVE** | Recognitions and TL leave approval exist. |
| TL dashboard | **PARTIAL** | Dashboard exists; needs TL widgets. |

## 6. UX / Dev TL

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Create sprint, reject with reason, sprint approval | **BUILD** | Sprint entity + approval flow. |
| Pending tasks: effort sheet, sprint plan, change request, bug review | **BUILD** | Aggregated work queue. |
| Resource inbox, project list/view, team list, feedback, appreciation, leave | **PARTIAL** | Same as UI TL. |

## 7. Resources (UI / UX / Dev / QA)

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Profile with rating + metrics | **BUILD** | Rating engine from rejections, on-time, feedback. |
| Inbox: projects, expand tasks, start/end task, comment | **PARTIAL** | My Tasks + comments exist; start/end timers and reasons are new. |
| Budget-exceeded and date-exceeded reasons | **PARTIAL** | 'deviation_reason' exists on task; make it mandatory and structured. |
| QA: list bugs with priority flag | **HAVE** | BugSmart bug tracker covers this. |
| Apply leave / view leave / HR complaints | **HAVE** | Already built. |
| Personal dashboard | **PARTIAL** | Hubstaff + leave data exist; task chart by budget is new. |

## 8. HR

| Feature (from sheet) | Status | What is needed |
|---|---|---|
| Leave approval after TL approval | **HAVE** | Two-step leave approval exists. |
| Performance dept-wise / resource-wise | **PARTIAL** | Hubstaff, attendance, recognitions exist; complaints, PC complaints and rejection counts need linking. |
| Appreciation approval / rejection | **PARTIAL** | Recognitions exist (Super Admin only); add HR approval. |

## Three reusable building blocks
- **Approval engine**: out-of-scope, effort, sprint, budget increase, new page, correction, meeting, appreciation are all "ask, approve/reject with reason". Build once.
- **Payment gate**: project tabs unlock only after payment approved; Super Admin overrides payment; PMO/tech head/HR override budget.
- **Budget tracking**: budget per department, effort used per task, alert when exceeded (notify PM / management / HR).

## Phases (about 27 weeks, 2 developers; estimates)
| # | Phase | Time | Delivers |
|---|---|---|---|
| 0 | Safety net + hardening | 2 wks | New roles, approval engine, payment-status field, rate limits, token expiry, cache off DB, load-test baseline |
| 1 | Accounts | 3 wks | Payment ledger, advance/pending approval, notify Sales/PMO, budget increase, targets, AMC |
| 2 | Sales | 4 wks | Leads, project intake, sales inbox, meeting request, sales dashboard |
| 3 | PMO + Project Coordinator core | 5 wks | Accept project, tabbed view with payment lock, categories, BA form, resources, dept budget, out-of-scope |
| 4 | UI/UX/Dev workflow | 5 wks | Pages/sections + auto budget, status chain, effort request, sprints, QA hand-off, corrections with budget |
| 5 | TL + resource screens | 3 wks | Inbox, drag-drop priority, start/end task, team list, feedback, ratings |
| 6 | Dashboards + feedback | 3 wks | All dashboards, monthly customer feedback, appreciation approval, Google review count |
| 7 | HR performance + go-live | 2 wks | HR views, regression, load test at 150 users, rollout |

Execution order used in `EXECUTION_PLAN.md`: Phase 0, then Accounts, then Sales (cheapest and safest), then the riskier phases.

## Open decisions for the manager
1. Tech Head / Management / System Admin: new roles or permissions on existing people?
2. Sales doc: exact fields for project creation and lead tracking.
3. Budget rule per department (sections x animation level); who can change it.
4. Rating formula for PC and resources (inputs, weights, visibility; HR sign-off).
5. Customer feedback questions; entered by PC or emailed link to customer.
6. Meetings: request/approve list only, or calendar invites and reminders.
7. Appreciation share to mail/LinkedIn: manual or automatic (automatic LinkedIn needs API approval).
8. Google review count: manual entry or API.
9. Existing Bugzilla-style tracker vs new bug flow: replace or keep both.
10. Go-live: pilot team first or all at once.
