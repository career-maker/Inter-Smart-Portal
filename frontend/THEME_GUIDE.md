# Inter Smart Portal - Global Theme System

## Overview

The Inter Smart Portal now implements a comprehensive **Global Visual Polish & Theme Standardization** system with perfect **Light/Dark Mode Parity** and **Role-Based Accent Palettes**.

## Color System

### Semantic Color Tokens

All color tokens are defined as CSS custom properties in `src/styles/theme-colors.css` and `src/app/globals.css`:

#### Text Colors
- `--text-primary`: Headings and primary text (Light: `#0F172A`, Dark: `#F8FAFC`)
- `--text-secondary`: Body text (Light: `#1E293B`, Dark: `#E2E8F0`)
- `--text-tertiary`: Secondary text and labels (Light: `#64748B`, Dark: `#94A3B8`)
- `--text-muted`: Disabled text and hints (Light: `#94A3B8`, Dark: `#64748B`)

#### Background Colors
- `--bg-primary`: Main card/section backgrounds (Light: `#FFFFFF`, Dark: `#1E293B`)
- `--bg-secondary`: Alternative background (Light: `#F8FAFC`, Dark: `#0F172A`)
- `--bg-tertiary`: Input and hover states (Light: `#F1F5F9`, Dark: `#334155`)

#### Border Colors
- `--border-light`: Primary borders (Light: `#E5E7EB`, Dark: `rgba(255, 255, 255, 0.1)`)
- `--border-medium`: Hover/active borders (Light: `#D1D5DB`, Dark: `rgba(255, 255, 255, 0.15)`)
- `--border-dark`: Disabled borders (Light: `#CBD5E1`, Dark: `rgba(255, 255, 255, 0.2)`)

#### Shadow System
- `--shadow-xs`: `0 1px 2px rgba(15, 23, 42, 0.05)`
- `--shadow-sm`: `0 4px 12px rgba(15, 23, 42, 0.04)`
- `--shadow-md`: `0 8px 24px rgba(15, 23, 42, 0.08)`
- `--shadow-lg`: `0 12px 40px rgba(15, 23, 42, 0.12)`
- `--shadow-xl`: `0 16px 48px rgba(15, 23, 42, 0.15)`

### Role-Based Accent Palettes

#### Super Admin: Crimson/Coral
```css
--role-admin-bg: rgba(244, 63, 94, 0.08)
--role-admin-border: rgba(244, 63, 94, 0.2)
--role-admin-text: #BE184D
--role-admin-accent: #F63E7F
```

#### Team Lead: Indigo/Cyan
```css
--role-lead-bg: rgba(99, 102, 241, 0.08)
--role-lead-border: rgba(99, 102, 241, 0.2)
--role-lead-text: #4F46E5
--role-lead-accent: #6366F1
```

#### Employee/HR: Emerald/Amber
```css
--role-employee-bg: rgba(16, 185, 129, 0.08)
--role-employee-border: rgba(16, 185, 129, 0.2)
--role-employee-text: #059669
--role-employee-accent: #10B981
```

### Status Colors

- **Success**: `var(--status-success)` (Green - `#10B981`)
- **Warning**: `var(--status-warning)` (Amber - `#B45309`)
- **Error**: `var(--status-error)` (Red - `#991B1B`)
- **Info**: `var(--status-info)` (Blue - `#0C2D6B`)

## Usage Guide

### Using Semantic Utility Classes

Instead of hardcoded colors, use semantic utility classes that automatically adapt to light/dark mode:

#### ✅ Correct - Theme Aware
```jsx
<div className="bg-primary-semantic text-secondary-semantic border border-primary-semantic">
  <h2 className="text-primary">Heading</h2>
  <p className="text-tertiary-semantic">Description</p>
</div>
```

#### ❌ Avoid - Hardcoded Colors
```jsx
<div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
  <h2 className="text-slate-900 dark:text-white">Heading</h2>
  <p className="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

### Semantic Card Component

```jsx
// Using semantic-card-enhanced class
<div className="semantic-card-enhanced p-6">
  <h3 className="text-primary-semantic font-bold">Card Title</h3>
  <p className="text-secondary-semantic">Card content</p>
</div>
```

### Form Elements - Theme Aware

```jsx
<input
  className="form-input-semantic"
  placeholder="Enter text..."
/>

<select className="form-select-semantic">
  <option>Option 1</option>
</select>

<textarea className="form-textarea-semantic" />
```

### Role-Based Styling

Using the `roleColors` utility:

```tsx
import { getRoleColors, getSemanticCardClass } from "@/utils/roleColors";

const cardClass = getSemanticCardClass(user?.role);
const roleColors = getRoleColors(user?.role);

// Super Admin gets Crimson/Coral
// Team Lead gets Indigo/Cyan
// Employee gets Emerald/Amber
<div className={`role-card ${roleColors.border}`}>
  {/* Content */}
</div>
```

### Alert/Callout Components

```jsx
// Success Alert
<div className="alert-success-enhanced">
  <strong>Success!</strong> Your changes have been saved.
</div>

// Warning Alert
<div className="alert-warning-enhanced">
  <strong>Warning</strong> Please review before proceeding.
</div>

// Error Alert
<div className="alert-error-enhanced">
  <strong>Error</strong> Something went wrong.
</div>

// Info Alert
<div className="alert-info-enhanced">
  <strong>Info</strong> Additional information.
</div>
```

### Tables - Theme Aware

```jsx
<table className="table-semantic">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

### Empty State

```jsx
<div className="empty-state-enhanced">
  <Icon className="empty-state-enhanced-icon" />
  <h3 className="empty-state-enhanced-title">No Data</h3>
  <p className="empty-state-enhanced-message">Nothing to display here</p>
</div>
```

### Badges and Pills

```jsx
// Status Badge
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-error">Rejected</span>
<span className="badge-info">New</span>

// Generic Badge
<span className="badge-semantic">Tag</span>
```

## Accessibility

All semantic colors meet WCAG AA contrast requirements:

- Text on background: ≥4.5:1 contrast ratio
- Large text on background: ≥3:1 contrast ratio
- UI components: ≥3:1 contrast ratio

## Implementation Checklist

When updating pages to use the new theme system:

- [ ] Replace hardcoded `dark:` utility classes with semantic tokens
- [ ] Use `-semantic` suffixed utilities for core elements
- [ ] Apply role-based styling to header/badge sections
- [ ] Test both light and dark modes
- [ ] Verify accessibility with contrast checker
- [ ] Check hover/focus states work in both modes

## Migration Examples

### Example 1: Simple Card

**Before:**
```jsx
<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-4">
  <h3 className="text-slate-900 dark:text-white">Title</h3>
  <p className="text-slate-600 dark:text-slate-400">Description</p>
</div>
```

**After:**
```jsx
<div className="semantic-card-enhanced p-4">
  <h3 className="text-primary-semantic">Title</h3>
  <p className="text-secondary-semantic">Description</p>
</div>
```

### Example 2: Page Header

**Before:**
```jsx
<div className="mb-8 pb-6 border-b border-slate-200 dark:border-white/10">
  <h1 className="text-4xl font-black text-slate-900 dark:text-white">Dashboard</h1>
  <p className="text-sm text-slate-600 dark:text-slate-400">Welcome back</p>
</div>
```

**After:**
```jsx
<div className="page-header-enhanced">
  <h1>Dashboard</h1>
  <p>Welcome back</p>
</div>
```

### Example 3: Form Input

**Before:**
```jsx
<input
  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2"
  placeholder="Enter..."
/>
```

**After:**
```jsx
<input
  className="form-input-semantic"
  placeholder="Enter..."
/>
```

## Files Reference

- **Theme Colors Definition**: `src/styles/theme-colors.css`
- **Global Styles**: `src/app/globals.css`
- **Role Utilities**: `src/utils/roleColors.ts`
- **This Guide**: `THEME_GUIDE.md`

## Best Practices

1. **Use Semantic Variables**: Always prefer `var(--text-primary)` over hardcoded hex values
2. **Consistent Spacing**: Use the shadow system (`var(--shadow-*)`) for depth
3. **Role-Based Design**: Apply role-specific accent colors to user-facing elements
4. **Test Both Modes**: Always verify appearance in light and dark modes
5. **Accessibility First**: Ensure sufficient contrast ratios in all color combinations
6. **Document Changes**: Update this guide when adding new semantic tokens

## Questions?

For more information about the theme system, refer to:
- CSS Custom Properties: `src/styles/theme-colors.css`
- Role utilities: `src/utils/roleColors.ts`
- Global component styles: `src/app/globals.css`
