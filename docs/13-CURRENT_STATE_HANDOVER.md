# Current State & Handover

**Last Updated:** June 29, 2026

## What We Achieved in the Recent Session

We made significant improvements to the UI, data flows, and performance of the Inter Smart Employee Portal:

1. **Dashboard KPI Widgets (Super Admin)**
   - Replaced basic feature cards with dynamic KPI Widgets strictly for the Super Admin role.
   - Now displays total employees, presence, on-leave count, and pending requests with trend indicators.
   - Added a global activity feed for recent company-wide actions (leaves, new users, HR policies).

2. **Navigation & Menus**
   - Fixed the scrolling menu and replaced it with a Hamburger (Ham) menu for the desktop experience.
   - Fixed the instant logout functionality for immediate redirection.

3. **Leave Management Workflow & Leave Apply Page**
   - Fixed a critical issue where the "Leave Application Form" would show an empty dropdown for Leave Types if the database seeder hadn't been run. Now uses a robust fallback state mechanism.
   - **Performance Optimization**: Drastically sped up the rendering of the Sick / Casual leave balances on the application form. Previously, it called a heavy `/dashboard` API endpoint (which compiled holidays, celebrations, etc.). We optimized the frontend and backend to use a dedicated, lightweight `/leave-balances` endpoint, reducing load time to near-zero.
   - Defined rules for Leave Approvals: 
     - 1-day leave: Team Lead approval only.
     - Multi-day leave & WFH: Requires Team Lead AND Super Admin approval.

4. **Dynamic Announcement Categories**
   - Built inline creation for Custom Announcement Categories.
   - Super Admins can now select "Add New Category" directly from the dropdown while writing a company update.
   - Categories are saved instantly to Supabase and automatically receive beautiful Tailwind UI styling.

5. **Deployment & Bug Fixes**
   - Addressed a Vercel deployment failure involving strict TypeScript enforcement (`setCategory(val || "")`).
   - Saved the Supabase keys securely into `docs/09-SUPABASE_KEYS.md` for future reference without needing to dig through `.env`.

## Where We Left Off & Next Steps

- **Pending Tasks**:
  - The "My Profile" edit feature: When an employee edits their profile data, it currently needs to be routed into an approval queue for the Super Admin, instead of updating instantly.
  - Test and verify the multi-tier approval workflow for leaves and WFH on the live dashboard.
  - Continue iterating on UI responsiveness and verifying Vercel deployments stay green.

## To the Next AI Agent

Hello! When you resume this project:
1. Please read this file to understand the context of the most recent fixes.
2. The user prefers highly responsive UIs (we just resolved a major performance lag with the Leave balances, so be mindful of API endpoint sizes!).
3. Ensure you follow the project's existing Tailwind / Shadcn UI components.
4. Supabase DB credentials can be found in `docs/09-SUPABASE_KEYS.md`.
5. Run `pnpm run dev` to spin up the Next.js frontend, and the Laravel backend is accessible at `http://127.0.0.1:8765`.
