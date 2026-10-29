# UI audit: route inventory (29 Oct 2026)

Status columns: Audited = read in code and browser; Improved = styling changed; Verified = seen rendered at 1440/768/390. All start empty; nothing is marked done without a rendered check.

Total routes (page.tsx files): 99

| Route | Lines | Audited | Improved | Verified |
|---|---|---|---|---|
| `/.` | 22 | no | no | no |
| `/[...not_found]` | 5 | no | no | no |
| `/accounts` | 231 | no | no | no |
| `/accounts/amc` | 110 | no | no | no |
| `/accounts/targets` | 83 | no | no | no |
| `/activities` | 111 | no | no | no |
| `/addons` | 549 | no | no | no |
| `/addons/content-cleanup` | 126 | no | no | no |
| `/addons/customization` | 3154 | no | no | no |
| `/addons/email-management` | 1637 | no | no | no |
| `/addons/emergency-contacts` | 1364 | no | no | no |
| `/addons/leave-policy` | 1613 | no | no | no |
| `/addons/permissions` | 645 | no | no | no |
| `/addons/storage` | 489 | no | no | no |
| `/announcements` | 731 | no | no | no |
| `/appreciation` | 85 | no | no | no |
| `/attendance` | 282 | no | no | no |
| `/attendance/details/[date]` | 474 | no | no | no |
| `/attendance/management` | 1318 | no | no | no |
| `/audit-logs` | 118 | no | no | no |
| `/birthday-wishes` | 961 | no | no | no |
| `/calendar` | 341 | no | no | no |
| `/chat` | 82 | no | no | no |
| `/community` | 313 | no | no | no |
| `/customer-feedback` | 76 | no | no | no |
| `/customization` | 3 | no | no | no |
| `/dashboard` | 2645 | no | no | no |
| `/documents` | 393 | no | no | no |
| `/employees` | 298 | no | no | no |
| `/employees/[id]` | 309 | no | no | no |
| `/employees/create` | 61 | no | no | no |
| `/game` | 619 | no | no | no |
| `/hall` | 245 | no | no | no |
| `/holidays` | 1668 | no | no | no |
| `/hr-performance` | 49 | no | no | no |
| `/issues` | 260 | no | no | no |
| `/issues/[id]` | 391 | no | no | no |
| `/issues/new` | 22 | no | no | no |
| `/leave-balances` | 763 | no | no | no |
| `/leaves` | 916 | no | no | no |
| `/leaves/apply` | 832 | no | no | no |
| `/leaves/approvals` | 1494 | no | no | no |
| `/login` | 348 | no | no | no |
| `/manage-leaves` | 311 | no | no | no |
| `/meetings` | 131 | no | no | no |
| `/notifications` | 327 | no | no | no |
| `/pmo` | 94 | no | no | no |
| `/pmo/approvals` | 71 | no | no | no |
| `/pmo/budget-watch` | 44 | no | no | no |
| `/pmo/projects/[id]` | 272 | no | no | no |
| `/pmo/tracker` | 73 | no | no | no |
| `/policies` | 336 | no | no | no |
| `/profile` | 477 | no | no | no |
| `/profile-requests` | 137 | no | no | no |
| `/project-management` | 359 | no | no | no |
| `/project-management/bug-reports` | 418 | no | no | no |
| `/project-management/bugsmart` | 5 | no | no | no |
| `/project-management/bugsmart/bugs` | 774 | no | no | no |
| `/project-management/bugsmart/bugs/[id]` | 1200 | no | no | no |
| `/project-management/bugsmart/bugs/new` | 70 | no | no | no |
| `/project-management/bugsmart/overview` | 460 | no | no | no |
| `/project-management/bugsmart/permissions` | 411 | no | no | no |
| `/project-management/bugsmart/projects` | 865 | no | no | no |
| `/project-management/bugsmart/reports` | 338 | no | no | no |
| `/project-management/bugsmart/saved-searches` | 181 | no | no | no |
| `/project-management/hubstaff` | 1655 | no | no | no |
| `/project-management/projects` | 562 | no | no | no |
| `/project-management/projects/[id]` | 665 | no | no | no |
| `/project-management/status` | 497 | no | no | no |
| `/project-management/task-catalog` | 455 | no | no | no |
| `/project-management/tasks` | 807 | no | no | no |
| `/project-management/tasks/[id]` | 651 | no | no | no |
| `/project-management/tasks/completed` | 468 | no | no | no |
| `/project-management/tasks/forecast` | 485 | no | no | no |
| `/project-management/tasks/my` | 334 | no | no | no |
| `/project-management/tasks/overdue` | 479 | no | no | no |
| `/recognitions` | 551 | no | no | no |
| `/recognitions/leaderboard` | 506 | no | no | no |
| `/reports` | 541 | no | no | no |
| `/sales` | 79 | no | no | no |
| `/sales/completed` | 53 | no | no | no |
| `/sales/inbox` | 71 | no | no | no |
| `/sales/leads` | 136 | no | no | no |
| `/sales/out-of-scope` | 60 | no | no | no |
| `/sales/projects` | 181 | no | no | no |
| `/settings` | 288 | no | no | no |
| `/ta/apply` | 169 | no | no | no |
| `/ta/management` | 1203 | no | no | no |
| `/ta/status` | 431 | no | no | no |
| `/teams` | 214 | no | no | no |
| `/teams/[id]` | 385 | no | no | no |
| `/teams/create` | 24 | no | no | no |
| `/wfh` | 699 | no | no | no |
| `/work` | 60 | no | no | no |
| `/work/go-live` | 62 | no | no | no |
| `/work/inbox` | 74 | no | no | no |
| `/work/projects/[id]` | 37 | no | no | no |
| `/work/qa` | 16 | no | no | no |
| `/work/team` | 89 | no | no | no |

## Baseline findings (code scan, frontend/src/app + components)

- Styling lives mostly in Tailwind utility classes inside TSX, plus one 4,472-line `globals.css` (373 `!important`), `styles/theme-colors.css` (441 lines) and `styles/portal-accent.css`. Colours are driven by the Super Admin Customization add-on through CSS variables.
- Pattern counts: rounded-2xl/3xl 401; text-[9-11px] 804; uppercase 369; tracking-wider/widest 271; font-black/extrabold 151; backdrop-blur 164; shadow-xl/2xl 114; gradients 59; blur-3xl glow blobs 11; inline style props 541.
- Biggest pages: customization 3154 lines, dashboard 2645, holidays 1668, hubstaff 1655, email-management 1637, leave-policy 1613, leaves/approvals 1494, layout 1475.
- Constraint: UI-only, no JSX/logic changes, so changes must be CSS (tokens, globals.css) targeting existing classes.
