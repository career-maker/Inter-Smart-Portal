# Clean design rules (from the owner's list, 29 Oct 2026)

Applied with the shared kit `frontend/src/components/clean/index.tsx` (Page, Section, Panel, Row, Dot, Primary, Quiet, Alert, Label, field, area). Use it for every new screen.

| # | Rule | How |
|---|------|-----|
| 1 | Emoji icons become plain text labels | No emoji and no decorative icons in titles or buttons |
| 2 | Neutrals plus ONE accent | Slate neutrals, accent `#1F5C4E` (deep green) for the primary button, focus and "ok" dot. No purple gradients |
| 3 | One spacing grid: 4, 8, 16, 24, 32 | Tailwind `1, 2, 4, 6, 8` only (gap-1, gap-2, gap-4, gap-6, gap-8, p-4 ...) |
| 4 | Four font sizes: 12, 14, 20, 32 | `text-xs`, `text-sm`, `text-xl`, `text-[32px]` (page title) only |
| 5 | No glow or shadows | 1px border, radius 12 (`rounded-xl`), no `shadow-*` |
| 6 | No badges or "!!" | Say it in words, with the change: for example "+12% against last week" |
| 7 | One line, today marked | For charts: a single line, with today marked; no rainbow bars |
| 8 | Status = 6px dot plus a word, 44px rows | `Dot` (h-1.5 w-1.5) and `Row` (min-h-11) |
| 9 | One clear action | One `Primary` button per area; other actions are `Quiet` text buttons |

## Where it is applied
New screens: appreciation, meetings, customer feedback, HR performance, out-of-budget list, project tracker, Sales completed projects and AMC, Sales out-of-scope reply, and the Super Admin cards (module switches, module privileges).

## Deliberately NOT changed
The old screens and global theme. The Super Admin already controls colours, elevation and radius in Portal Customization, and a global override would fight it. Old screens use the amber dark theme.

## Rollout backlog (not done)
- About 51 older files contain emoji (search with `grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" frontend/src`).
- About 49 older files use purple, violet or indigo colours.
- Older screens still use several font sizes and random spacing, shadows and filled badges.
- My Work screens (inbox, team, QA, sprints, UI pages, go-live) from earlier in the project still use the older look and should move to the kit next.
- Decide whether the whole portal accent changes from amber to `#1F5C4E`, or only the new screens (the Super Admin can already set `--portal-primary-color`).
