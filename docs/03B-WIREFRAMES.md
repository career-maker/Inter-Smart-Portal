# UI Wireframes

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the visual structure and layout of every screen in the application.

These are functional wireframes intended to guide implementation. Final styling shall follow `03-UI_UX.md` and `03A-DESIGN_SYSTEM.md`.

---

# Global Layout

Every authenticated page follows the same layout.

+-------------------------------------------------------------------------------------------+
| Header                                                                            🔔 👤 |
+----------------------+---------------------------------------------------------------+
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
| Sidebar              |               Main Content Area                               |
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
+----------------------+---------------------------------------------------------------+

Sidebar Width

280px Expanded

80px Collapsed

Header Height

72px

---

# Header Layout

+--------------------------------------------------------------------------------------+
| ☰ Logo                Search Employees...                     🔔   🌙   👤 Profile |
+--------------------------------------------------------------------------------------+

Header Components

• Hamburger Menu
• Company Logo
• Search Bar
• Notification Bell
• Theme Switch
• User Avatar
• Profile Dropdown

---

# Sidebar Navigation

+------------------------------------------------+
| INTERSMART                                     |
|------------------------------------------------|
| Dashboard                                      |
|                                                |
| Leaves & WFH                                  |
| Leave Calendar                                 |
| Company Updates                                |
| HR Policies                                    |
| Request Documents                              |
| Downloads                                      |
| My Profile                                     |
|                                                |
| (Team Lead Only)                               |
| View The Hall                                  |
|                                                |
| Logout                                         |
+------------------------------------------------+

Super Admin Sidebar

Dashboard

Employees

Teams

Leave Requests

Leave Balances

Company Updates

HR Policies

Documents

Downloads

Holiday Calendar

Reports

Notifications

Audit Logs

Settings

Logout

---

# Login Screen

+--------------------------------------------------------------+

INTERSMART LOGO

Welcome Back

Official Email

[_____________________________________]

Password

[_____________________________________]

Forgot Password?

[ Login ]

---------------------------------------------------------------

Copyright © Intersmart

+--------------------------------------------------------------+

Rules

Only official email can be used.

Show password toggle.

Remember Me checkbox.

Loading animation while authenticating.

---

# Employee Dashboard

+----------------------------------------------------------------------------------------+
| Good Morning, Abhiram 👋                                      Notifications (3)        |
| You have been with Intersmart for 2 Years 4 Months 17 Days                            |
+----------------------------------------------------------------------------------------+

+-------------------+-------------------+-------------------+---------------------------+

Casual Leave

8

+-------------------+

Sick Leave

5

+-------------------+

Leaves Taken

14

+-------------------+

Pending Requests

1

+-------------------+

+----------------------------------------------------------------------------------------+

Apply Leave

Request Document

Downloads

Leave Calendar

+----------------------------------------------------------------------------------------+

+-------------------------------------+-----------------------------------------------+

Upcoming Holidays

Company Updates

Birthday

Work Anniversary

+-------------------------------------+-----------------------------------------------+

+----------------------------------------------------------------------------------------+

Recent Notifications

Timeline

• Leave Approved

• Birthday Today

• Document Uploaded

• New Policy Added

+----------------------------------------------------------------------------------------+

---

# Team Lead Dashboard

Everything from Employee Dashboard

PLUS

+----------------------------------------------------------------------------------------+

Pending Approvals

12

+----------------------------+

Team Working

21

+----------------------------+

Team WFH

4

+----------------------------+

On Leave

2

+----------------------------+

+----------------------------------------------------------------------------------------+

Pending Leave Approval Queue

Employee

Leave Type

Date

Approve

Reject

---

# Leave Popup

+--------------------------------------------------------------+

Apply Leave / Work From Home

---------------------------------------------------------------

Leave Date

[ Calendar Picker ]

Leave Type

▼

• Sick Leave

• Casual Leave

• Half Day Sick Leave (Morning)

• Half Day Sick Leave (Afternoon)

• Half Day Casual Leave (Morning)

• Half Day Casual Leave (Afternoon)

• Work From Home (Morning)

• Work From Home (Afternoon)

• Half Day WFH (Morning)

• Half Day WFH (Afternoon)

---------------------------------------------------------------

Casual Leave Balance : 8

Sick Leave Balance : 5

Leaves Taken : 14

---------------------------------------------------------------

Reason

________________________________________________

________________________________________________

________________________________________________

---------------------------------------------------------------

[ Cancel ]

[ Submit For Approval ]

+--------------------------------------------------------------+

Rules

Reason mandatory

Date mandatory

Leave Type mandatory

Validation inline

Loading button after submit

---

# Leave Success Popup

+-------------------------------------------+

✓ Leave Request Submitted

Status

Pending Approval

Approval sent to Team Lead

Email notification sent

[ Close ]

+-------------------------------------------+

---

# Notifications Panel

Slides from right.

+--------------------------------------+

Notifications

---------------------------------------

Today

✓ Leave Approved

✓ Birthday Reminder

✓ Policy Updated

---------------------------------------

Yesterday

Document Uploaded

Holiday Announcement

---------------------------------------

Earlier

Leave Balance Updated

+--------------------------------------+

Unread notifications highlighted.

---

# Mobile Dashboard

+--------------------------------+

☰        INTERSMART

🔔

----------------------------------

Good Morning

Abhiram

----------------------------------

Casual Leave

8

Sick Leave

5

----------------------------------

Apply Leave

Request Document

----------------------------------

Company Updates

----------------------------------

Notifications

----------------------------------

Bottom Navigation

Dashboard

Leave

Calendar

Profile

More

+--------------------------------+

Sidebar becomes drawer.

Cards become single-column.

Buttons become full width.

---

# Dashboard Widget Priority

Priority 1

Welcome

Leave Balance

Apply Leave

Notifications

Priority 2

Company Updates

Upcoming Holidays

Downloads

Priority 3

Announcements

Birthdays

Work Anniversaries

Quick Statistics

---

# UI Rules

Dashboard shall never require scrolling to view essential information on desktop.

Maximum of four KPI cards per row.

Charts shall appear below KPI cards.

Quick actions always remain above the fold.

Profile card always visible in the welcome section.

Notification bell always visible.

Search always accessible.

Responsive layout required for all screen sizes.
# UI Wireframes

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the visual structure and layout of every screen in the application.

These are functional wireframes intended to guide implementation. Final styling shall follow `03-UI_UX.md` and `03A-DESIGN_SYSTEM.md`.

---

# Global Layout

Every authenticated page follows the same layout.

+-------------------------------------------------------------------------------------------+
| Header                                                                            🔔 👤 |
+----------------------+---------------------------------------------------------------+
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
| Sidebar              |               Main Content Area                               |
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
|                      |                                                               |
+----------------------+---------------------------------------------------------------+

Sidebar Width

280px Expanded

80px Collapsed

Header Height

72px

---

# Header Layout

+--------------------------------------------------------------------------------------+
| ☰ Logo                Search Employees...                     🔔   🌙   👤 Profile |
+--------------------------------------------------------------------------------------+

Header Components

• Hamburger Menu
• Company Logo
• Search Bar
• Notification Bell
• Theme Switch
• User Avatar
• Profile Dropdown

---

# Sidebar Navigation

+------------------------------------------------+
| INTERSMART                                     |
|------------------------------------------------|
| Dashboard                                      |
|                                                |
| Leaves & WFH                                  |
| Leave Calendar                                 |
| Company Updates                                |
| HR Policies                                    |
| Request Documents                              |
| Downloads                                      |
| My Profile                                     |
|                                                |
| (Team Lead Only)                               |
| View The Hall                                  |
|                                                |
| Logout                                         |
+------------------------------------------------+

Super Admin Sidebar

Dashboard

Employees

Teams

Leave Requests

Leave Balances

Company Updates

HR Policies

Documents

Downloads

Holiday Calendar

Reports

Notifications

Audit Logs

Settings

Logout

---

# Login Screen

+--------------------------------------------------------------+

INTERSMART LOGO

Welcome Back

Official Email

[_____________________________________]

Password

[_____________________________________]

Forgot Password?

[ Login ]

---------------------------------------------------------------

Copyright © Intersmart

+--------------------------------------------------------------+

Rules

Only official email can be used.

Show password toggle.

Remember Me checkbox.

Loading animation while authenticating.

---

# Employee Dashboard

+----------------------------------------------------------------------------------------+
| Good Morning, Abhiram 👋                                      Notifications (3)        |
| You have been with Intersmart for 2 Years 4 Months 17 Days                            |
+----------------------------------------------------------------------------------------+

+-------------------+-------------------+-------------------+---------------------------+

Casual Leave

8

+-------------------+

Sick Leave

5

+-------------------+

Leaves Taken

14

+-------------------+

Pending Requests

1

+-------------------+

+----------------------------------------------------------------------------------------+

Apply Leave

Request Document

Downloads

Leave Calendar

+----------------------------------------------------------------------------------------+

+-------------------------------------+-----------------------------------------------+

Upcoming Holidays

Company Updates

Birthday

Work Anniversary

+-------------------------------------+-----------------------------------------------+

+----------------------------------------------------------------------------------------+

Recent Notifications

Timeline

• Leave Approved

• Birthday Today

• Document Uploaded

• New Policy Added

+----------------------------------------------------------------------------------------+

---

# Team Lead Dashboard

Everything from Employee Dashboard

PLUS

+----------------------------------------------------------------------------------------+

Pending Approvals

12

+----------------------------+

Team Working

21

+----------------------------+

Team WFH

4

+----------------------------+

On Leave

2

+----------------------------+

+----------------------------------------------------------------------------------------+

Pending Leave Approval Queue

Employee

Leave Type

Date

Approve

Reject

---

# Leave Popup

+--------------------------------------------------------------+

Apply Leave / Work From Home

---------------------------------------------------------------

Leave Date

[ Calendar Picker ]

Leave Type

▼

• Sick Leave

• Casual Leave

• Half Day Sick Leave (Morning)

• Half Day Sick Leave (Afternoon)

• Half Day Casual Leave (Morning)

• Half Day Casual Leave (Afternoon)

• Work From Home (Morning)

• Work From Home (Afternoon)

• Half Day WFH (Morning)

• Half Day WFH (Afternoon)

---------------------------------------------------------------

Casual Leave Balance : 8

Sick Leave Balance : 5

Leaves Taken : 14

---------------------------------------------------------------

Reason

________________________________________________

________________________________________________

________________________________________________

---------------------------------------------------------------

[ Cancel ]

[ Submit For Approval ]

+--------------------------------------------------------------+

Rules

Reason mandatory

Date mandatory

Leave Type mandatory

Validation inline

Loading button after submit

---

# Leave Success Popup

+-------------------------------------------+

✓ Leave Request Submitted

Status

Pending Approval

Approval sent to Team Lead

Email notification sent

[ Close ]

+-------------------------------------------+

---

# Notifications Panel

Slides from right.

+--------------------------------------+

Notifications

---------------------------------------

Today

✓ Leave Approved

✓ Birthday Reminder

✓ Policy Updated

---------------------------------------

Yesterday

Document Uploaded

Holiday Announcement

---------------------------------------

Earlier

Leave Balance Updated

+--------------------------------------+

Unread notifications highlighted.

---

# Mobile Dashboard

+--------------------------------+

☰        INTERSMART

🔔

----------------------------------

Good Morning

Abhiram

----------------------------------

Casual Leave

8

Sick Leave

5

----------------------------------

Apply Leave

Request Document

----------------------------------

Company Updates

----------------------------------

Notifications

----------------------------------

Bottom Navigation

Dashboard

Leave

Calendar

Profile

More

+--------------------------------+

Sidebar becomes drawer.

Cards become single-column.

Buttons become full width.

---

# Dashboard Widget Priority

Priority 1

Welcome

Leave Balance

Apply Leave

Notifications

Priority 2

Company Updates

Upcoming Holidays

Downloads

Priority 3

Announcements

Birthdays

Work Anniversaries

Quick Statistics

---

# UI Rules

Dashboard shall never require scrolling to view essential information on desktop.

Maximum of four KPI cards per row.

Charts shall appear below KPI cards.

Quick actions always remain above the fold.

Profile card always visible in the welcome section.

Notification bell always visible.

Search always accessible.

Responsive layout required for all screen sizes.