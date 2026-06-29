# Design System Specification

# Intersmart Employee Portal

Version 1.0

---

# Purpose

This document defines the official design language for the Intersmart Employee Portal.

Every screen, component, layout, animation, and interaction shall follow this document.

This document overrides individual page styling.

---

# Design Philosophy

The portal shall look like a premium enterprise SaaS product.

Keywords

Modern

Minimal

Elegant

Professional

Premium

Friendly

Data Driven

Fast

Interactive

---

# Design Inspirations

Linear

Stripe

Notion

Slack

Vercel

GitHub

Asana

Monday.com

The UI should never resemble a traditional HRMS.

---

# Grid System

Desktop

12-column grid

Maximum width

1440px

Content width

1320px

Padding

32px

Tablet

24px

Mobile

16px

---

# Spacing Scale

Use an 8px spacing system.

Allowed spacing:

4

8

12

16

20

24

32

40

48

64

80

96

Never use random spacing.

---

# Border Radius

Buttons

12px

Inputs

12px

Cards

20px

Dialogs

24px

Charts

20px

Images

16px

Profile Photos

Circular

---

# Shadows

Use soft shadows.

Cards

Small elevation

Dialogs

Medium elevation

Dropdowns

Medium elevation

Never use harsh shadows.

---

# Glass Effects

Allowed only for:

Dashboard

Quick Actions

Announcement Cards

Never overuse glassmorphism.

---

# Typography

Primary Font

Inter

Fallback

System UI

Sizes

Display

48

Heading

36

Title

28

Subtitle

20

Body

16

Caption

14

Small

12

---

# Icons

Use Lucide Icons only.

Every module shall have one consistent icon.

No emoji icons.

---

# Buttons

Variants

Primary

Secondary

Outline

Ghost

Destructive

Success

Warning

Buttons shall include:

Hover

Focus

Disabled

Loading

Pressed

states.

---

# Cards

Card Types

Information Card

KPI Card

Announcement Card

Employee Card

Report Card

Chart Card

Quick Action Card

Statistic Card

Every card shall have

Rounded corners

Padding

Header

Body

Footer (optional)

Hover animation

---

# KPI Cards

Each KPI card shall contain

Icon

Title

Large Number

Subtitle

Trend

Optional sparkline

Animation

Examples

Employees

Leave Balance

Working Today

Pending Requests

---

# Inputs

Every input shall support

Label

Placeholder

Description

Validation

Helper Text

Disabled

Loading

Readonly

---

# Tables

Features

Search

Filter

Sort

Pagination

Column Visibility

Export

Responsive

Sticky Header

---

# Modals

Support

Small

Medium

Large

Fullscreen

Animations

Fade

Scale

Slide

---

# Notifications

Toast Notifications

Success

Error

Warning

Information

Persistent

Notification Panel

Grouped

Unread Indicator

Read Indicator

Archive

---

# Badges

Success

Warning

Error

Neutral

Information

Sizes

Small

Medium

Large

---

# Charts

Library

Recharts

Supported Charts

Bar

Pie

Area

Line

Donut

Radial

Heatmap (Future)

Charts must animate on load.

---

# Calendar

Monthly View

Weekly View (Future)

Agenda View (Future)

Holiday Indicators

Leave Indicators

Color Coding

---

# Colors

System Colors

Success

Warning

Danger

Info

Neutral

Primary

The primary brand color shall be configurable.

Never hardcode colors throughout the application.

---

# Employee Status Colors

Working

Green

WFH

Blue

Leave

Red

Half Day

Orange

Pending

Yellow

Approved

Green

Rejected

Red

---

# Animations

Library

Framer Motion

Allowed Animations

Fade

Slide

Scale

Counter

Progress

Accordion

Collapse

Hover Lift

Avoid excessive animation.

---

# Loading States

Skeleton Screens

Spinner

Progress Bar

Button Loading

Table Loading

Chart Loading

Every async action shall display feedback.

---

# Empty States

Every module shall define an empty state.

Example

"No leave requests found."

Include:

Illustration

Description

Action Button

---

# Error States

Friendly messages.

Example

"Unable to load employee data."

Include Retry button.

---

# Mobile Design

Responsive First.

Sidebar becomes Drawer.

Tables become Cards.

Charts resize automatically.

Forms become single column.

Buttons become full width.

---

# Accessibility

Keyboard Navigation

Focus Rings

ARIA Labels

Screen Reader Support

Minimum contrast ratio

Touch friendly spacing

---

# Dashboard Style

The dashboard shall use:

Hero Welcome Section

Large KPI Cards

Animated Counters

Charts

Activity Timeline

Upcoming Events

Quick Actions

Announcements

Leave Balance

Service Duration

Every dashboard must feel like an executive analytics platform rather than a CRUD application.

---

# Component Naming

Examples

AppButton

AppCard

AppInput

AppSelect

AppModal

AppTable

AppChart

AppAvatar

AppNotification

AppTimeline

AppCalendar

Never create duplicate components.

Reuse existing components whenever possible.

---

# Design Rules

Consistency is mandatory.

Do not mix styles.

Do not create module-specific button styles.

Do not use random border radius values.

Do not use inconsistent spacing.

Every screen must follow the design system exactly.
