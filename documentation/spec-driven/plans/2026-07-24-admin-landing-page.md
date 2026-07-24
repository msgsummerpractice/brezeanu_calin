# Admin Landing Page Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Build an admin landing page that guides system admins to available actions.

**Architecture:** Backend endpoint provides navigation metadata, frontend renders a card-based landing page with links to all admin sections.

**Tech Stack:** Django REST Framework, React, TypeScript

**Design Spec:** `documentation/spec-driven/specs/2026-07-24-admin-landing-page-design.md`

---

### Task 1: Fix __pycache__ git tracking issue

**Files:**
- Modify: `.gitignore` (ensure comprehensive Python cache exclusion)
- Remove from git: all `__pycache__` directories

**Requirements:**
- Remove all __pycache__ files from git tracking
- Ensure .gitignore prevents future tracking

---

### Task 2: Backend — Admin Navigation Endpoint

**Files:**
- Modify: `backend/accounts/views.py`
- Modify: `backend/accounts/urls.py`

**Requirements:**
- Add `AdminNavigationView` returning admin page metadata
- Protected by `IsAdminUser`
- Returns JSON array of navigation items with label, description, path

---

### Task 3: Frontend — Admin Landing Page Component

**Files:**
- Create: `frontend/src/components/Admin/AdminLanding.tsx`

**Requirements:**
- Card-based layout with links to New User, Users, Cases, System
- Consistent styling with existing app
- Each card has icon, title, description
- Cards trigger page navigation via callback

---

### Task 4: Frontend — Integrate Admin Landing into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/services/api.ts`

**Requirements:**
- Add 'admin' page state
- Admin button navigates to admin landing first
- Sub-pages have "Back to Admin" navigation
- Add API function for admin navigation (optional, can use static config)

---

### Task 5: Run, Test, and Review

**Requirements:**
- Run database migrations if needed
- Start backend and frontend
- Verify admin landing page works
- Verify navigation to sub-pages works
- Code review for quality
