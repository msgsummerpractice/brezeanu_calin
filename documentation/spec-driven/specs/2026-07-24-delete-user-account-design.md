# Delete User Account — Design Spec

**Date:** 2026-07-24  
**Status:** Approved  
**Scope:** Enhance existing delete user functionality with success confirmation and case unassignment

## Overview

As a System Admin, I want to delete user accounts (passengers, colleagues) to maintain the security and integrity of the system. The system already supports deletion via the User List view. This spec adds:

1. A visible success confirmation message after deletion
2. Unassignment of cases from the deleted user before removal

## Current State

- Backend `DELETE /api/admin/users/<id>/` exists (admin-only, prevents deletion of admins, returns 204)
- Frontend `UserList.tsx` has a Delete button per non-admin user, a confirmation modal, and refreshes the list after deletion
- No success feedback is shown to the admin after deletion
- Cases assigned to a deleted user become orphaned references

## Changes

### Backend: Unassign Cases Before Deletion

**File:** `backend/accounts/views.py` — `AdminUserDetailView.delete()`

Before calling `user.delete()`, unassign all cases:

```python
from cases.models import Case

Case.objects.filter(assigned_to=user).update(assigned_to=None)
user.delete()
```

This ensures no foreign key errors and leaves cases in an unassigned state for redistribution.

### Frontend: Success Confirmation Banner

**File:** `frontend/src/components/Admin/UserList.tsx`

After successful deletion:
- Store the deleted user's name in state (e.g., `deleteSuccess: string | null`)
- Display a green success banner at the top of the user list: "User [First Last] has been deleted successfully."
- The banner auto-dismisses after 5 seconds or can be dismissed manually
- Uses the same styling pattern as the existing error banner but with green colors

## Constraints

- Admin users (superusers) cannot be deleted — this is already enforced
- Hard delete only — no soft delete / deactivation
- No additional API response body needed (204 stays as-is)

## Out of Scope

- Audit logging of deletions
- Email notifications on account deletion
- Bulk deletion
