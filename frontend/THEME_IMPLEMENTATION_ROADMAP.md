# Theme Standardization Implementation Roadmap

## Overview

This roadmap outlines the systematic approach to update all pages to use the new Global Visual Polish & Theme Standardization system. The foundation (theme tokens, utilities, and documentation) is now in place.

## Phase 1: Foundation ✅ COMPLETED

- [x] Create CSS custom property system (`src/styles/theme-colors.css`)
- [x] Add semantic utility classes to globals.css
- [x] Create role-based color utilities (`src/utils/roleColors.ts`)
- [x] Document theming system (`THEME_GUIDE.md`)

## Phase 2: Core Dashboard Pages (NEXT PRIORITY)

### Priority 1: Dashboard Pages
- [ ] `src/app/(dashboard)/dashboard/page.tsx`
  - Replace hardcoded `bg-white dark:bg-slate-*` with `bg-primary-semantic`
  - Update headers to use `.page-header-enhanced`
  - Apply role-based cards for user info sections
  - Estimated effort: 2-3 hours

- [ ] `src/app/(dashboard)/layout.tsx`
  - Update header with role-based colors
  - Apply semantic border colors to navigation
  - Update dropdown menu styling
  - Estimated effort: 1-2 hours

### Priority 2: Employee Management
- [ ] `src/app/(dashboard)/employees/page.tsx`
  - Update table styling to use `.table-semantic`
  - Apply form utilities to filters
  - Update empty state styling
  - Estimated effort: 1-2 hours

- [ ] `src/app/(dashboard)/teams/page.tsx`
  - Apply semantic card styling
  - Update status badges
  - Apply role-based styling
  - Estimated effort: 1-2 hours

## Phase 3: Leave Management Pages

- [ ] `src/app/(dashboard)/leaves/page.tsx`
- [ ] `src/app/(dashboard)/leaves/apply/page.tsx`
- [ ] `src/app/(dashboard)/leave-balances/page.tsx`
- [ ] `src/app/(dashboard)/leaves/approvals/page.tsx`

**Changes needed:**
- Form elements → `.form-input-semantic`
- Status badges → `.badge-*-enhanced`
- Info boxes → `.alert-*-enhanced`
- Cards → `.semantic-card-enhanced`

## Phase 4: Attendance & HR Pages

- [ ] `src/app/(dashboard)/attendance/page.tsx`
- [ ] `src/app/(dashboard)/announcements/page.tsx`
- [ ] `src/app/(dashboard)/wfh/page.tsx`
- [ ] `src/app/(dashboard)/notifications/page.tsx`

## Phase 5: Utility Pages

- [ ] `src/app/(dashboard)/profile/page.tsx`
- [ ] `src/app/(dashboard)/settings/page.tsx`
- [ ] `src/app/(dashboard)/issues/page.tsx`
- [ ] `src/app/(dashboard)/documents/page.tsx`
- [ ] `src/app/(dashboard)/hall/page.tsx`

## Phase 6: Components Library

- [ ] Create reusable semantic card component
- [ ] Create theme-aware form component wrapper
- [ ] Create status badge component
- [ ] Create alert/callout component
- [ ] Create table component with semantic styling
- [ ] Create empty state component

## Quick Reference: Color Replacements

### Common Patterns to Replace

**Pattern 1: Text Colors**
```
FROM: text-slate-900 dark:text-white
TO:   text-primary-semantic

FROM: text-slate-600 dark:text-slate-400
TO:   text-secondary-semantic

FROM: text-slate-500 dark:text-slate-400
TO:   text-tertiary-semantic

FROM: text-slate-500 dark:text-slate-500
TO:   text-muted-semantic
```

**Pattern 2: Background Colors**
```
FROM: bg-white dark:bg-slate-800
TO:   bg-primary-semantic

FROM: bg-slate-50 dark:bg-slate-900
TO:   bg-secondary-semantic

FROM: bg-slate-100 dark:bg-slate-700
TO:   bg-tertiary-semantic
```

**Pattern 3: Border Colors**
```
FROM: border-slate-200 dark:border-white/10
TO:   border-primary-semantic

FROM: border-slate-300 dark:border-slate-600
TO:   border-secondary-semantic

FROM: border-slate-400 dark:border-slate-500
TO:   border-tertiary-semantic
```

**Pattern 4: Cards**
```
FROM: bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg
TO:   semantic-card-enhanced
```

**Pattern 5: Alerts/Callouts**
```
FROM: bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-300
TO:   alert-success-enhanced

Similar for warning, error, info variants
```

**Pattern 6: Form Elements**
```
FROM: border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg
TO:   form-input-semantic
```

## Testing Checklist

For each page/component update:
- [ ] Light mode appearance verified
- [ ] Dark mode appearance verified
- [ ] Hover states work in both modes
- [ ] Focus states visible in both modes
- [ ] Disabled states obvious in both modes
- [ ] Role-based styling applied (if applicable)
- [ ] Status colors appropriate
- [ ] Text contrast meets WCAG AA
- [ ] No hardcoded `dark:` classes remain
- [ ] Animations/transitions smooth in both modes

## Code Review Guidelines

When reviewing theme updates:
1. ✅ Uses semantic utility classes
2. ✅ No hardcoded `dark:` prefix utilities
3. ✅ Role-based styling applied where needed
4. ✅ Proper contrast ratios
5. ✅ Both light and dark modes tested
6. ✅ Uses CSS custom properties for colors
7. ✅ Updated components reference THEME_GUIDE.md

## Estimated Total Effort

- **Foundation Phase**: ✅ Complete (8 hours)
- **Phase 2 (Core Dashboard)**: 6-8 hours
- **Phase 3 (Leave Management)**: 8-10 hours
- **Phase 4 (Attendance & HR)**: 6-8 hours
- **Phase 5 (Utility Pages)**: 6-8 hours
- **Phase 6 (Components Library)**: 8-10 hours

**Total Estimated Effort**: 42-52 hours of development

## Next Steps

1. **Immediate** (This session):
   - [ ] Update dashboard page with semantic colors
   - [ ] Update layout header with role-based styling
   - [ ] Test both light and dark modes

2. **Short-term** (Next session):
   - [ ] Update all employee management pages
   - [ ] Update all leave management pages
   - [ ] Create reusable component wrappers

3. **Medium-term**:
   - [ ] Update remaining utility pages
   - [ ] Systematic component library creation
   - [ ] Comprehensive testing across all pages

4. **Ongoing**:
   - [ ] Maintain theme consistency in new features
   - [ ] Update THEME_GUIDE as needed
   - [ ] Monitor accessibility compliance

## Resources

- **Theme Colors Definition**: `src/styles/theme-colors.css`
- **Global Utilities**: `src/app/globals.css` (search for "ENHANCED SEMANTIC UTILITY CLASSES")
- **Role Utilities**: `src/utils/roleColors.ts`
- **Complete Guide**: `THEME_GUIDE.md`
- **Color Tokens Reference**: `src/styles/theme-colors.css` (lines 1-120)

## Support

For questions or issues with theme implementation:
1. Refer to `THEME_GUIDE.md` for detailed usage
2. Check `src/styles/theme-colors.css` for available tokens
3. Review `THEME_IMPLEMENTATION_ROADMAP.md` for patterns and examples
4. Test color combinations at: https://www.tinycolor.io/

---

**Last Updated**: 2026-07-24
**Status**: Foundation Complete, Phase 2 Ready to Start
