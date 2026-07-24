# Admin Landing Page — Design Spec

## Overview

As a System Admin, I want to see a landing page that contains all the possible actions I can perform, guiding me with links to the relevant pages.

## Requirements

- Admin-only access (staff/superuser users)
- Landing page displays navigation cards/links to:
  - **New User** — navigate to user creation
  - **User View** — navigate to user management list
  - **Case View** — navigate to case management list
  - **System View** — navigate to system settings (placeholder)
- Backend provides admin navigation metadata endpoint (admin-only)
- Clean, consistent UI matching existing app style

## Architecture

### Backend
- New endpoint: `GET /api/admin/navigation/` — returns list of available admin pages with labels and descriptions
- Protected by `IsAdminUser` permission
- No database changes required

### Frontend
- New component: `AdminLanding.tsx` in `components/Admin/`
- New page state `'admin'` in App.tsx
- When admin logs in and navigates to admin panel, shows landing page first
- Cards link to existing pages (users, cases) and new placeholders (system)
- Navigation back to admin landing from sub-pages

## Data Flow

1. Admin logs in → sees "Admin" button in nav
2. Clicks "Admin" → navigates to admin landing page
3. Landing page calls `GET /api/admin/navigation/` (or uses static config)
4. Displays cards for each available section
5. Clicking a card navigates to that section

## Error Handling

- Non-admin users cannot access the admin landing (enforced by permission class)
- API errors show user-friendly messages

## Testing

- Backend: verify endpoint returns correct structure, verify non-admin gets 403
- Frontend: verify landing page renders, verify links navigate correctly
- Integration: full flow from login to landing to sub-pages
