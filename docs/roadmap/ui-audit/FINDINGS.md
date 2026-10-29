# UI audit findings (29 Oct 2026, live site, Super Admin view, 1440 wide window, view only)

Pages seen rendered: dashboard (top to bottom), employees, leaves, attendance, community, chat, addons/customization.
Not yet seen: other 90 routes, 768 and 390 widths (viewport was only about 551 px tall).

Overall: shell (sidebar, header, tab bar), cards, tables, pills and the customization add-on already look consistent and clean. No broken layout found. A full token redesign would change little visibly and carries risk; fix specific defects instead.

## Defects
1. (downgraded) Assistant widget bottom right overlaps content at default spot, but it is draggable and remembers its position (ChatbaseLottieButton.tsx); by design, leave it.
2. /community birthday strip is clipped by the gift illustration on the right (third card cut off, only partly scrollable). Check overflow and the illustration z-index.
3. /attendance: Time Clock card shows "Loading..." for a long time with a grey placeholder block and large empty space under it (F8 loading-state item).
4. /chat: "Loading chat history..." with no spinner (F8).
5. Dashboard donut chart area (attendance split) renders blank with only a legend when data is zero; add an empty-state look.
6. (retracted) /projects 404 was a wrong URL; real route is /project-management/projects.

## Not changed
No code changed from this audit yet. Token deleted from the server after viewing.
