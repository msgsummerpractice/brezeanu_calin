# User List (Admin) — Design Spec

**Date:** 2026-07-24  
**Role:** System Admin  
**Title:** UserList  

## Overview

The system provides admin users with access to a list of all users, showing their name, email, role, number of assigned cases, and actions (edit, delete).

## Requirements

### Backend

1. **Case assignment field:** Add `assigned_to` FK (nullable) on the `Case` model pointing to `django.contrib.auth.User`.
2. **Admin user list API:** `GET /api/admin/users/` returns all users with:
   - `id`, `first_name`, `last_name`, `email`, `role` (derived), `assigned_case_count`
3. **Delete user API:** `DELETE /api/admin/users/{id}/` — hard deletes the user.
4. **Edit user API:** `PUT /api/admin/users/{id}/` — updates `first_name`, `last_name`, `email`, `role` (sets is_staff/is_superuser flags), and optionally triggers a password reset (generates new password, sets `must_change_password=True`).
5. **Authorization:** All admin endpoints require `IsAdminUser` (user.is_staff == True).

### Frontend

1. **User list view:** Table displaying Name (first + last), Email, Role, Assigned Cases count, and Actions column.
2. **Admin-only access:** The "Users" navigation link is visible only when the logged-in user is admin (is_staff).
3. **Edit action:** Opens a modal/form to edit name, email, role, and reset password.
4. **Delete action:** Shows confirmation dialog, then calls DELETE endpoint.
5. **Role display:** Admin (is_superuser), Agent (is_staff only), User (neither).

### Database

- Migration: Add `assigned_to` FK on `Case` (nullable, SET_NULL on delete).
- Query users with annotated count of assigned cases via `Count('assigned_cases')`.

## Role Mapping

| is_superuser | is_staff | Display Role |
|---|---|---|
| True | True | Admin |
| False | True | Agent |
| False | False | User |

## API Contracts

### GET /api/admin/users/

**Response 200:**
```json
[
  {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "Admin",
    "assigned_case_count": 5
  }
]
```

### PUT /api/admin/users/{id}/

**Request body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "Admin",
  "reset_password": true
}
```

**Response 200:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "role": "Admin",
  "assigned_case_count": 5
}
```

### DELETE /api/admin/users/{id}/

**Response 204:** No content.

## Constraints

- Admin cannot delete themselves.
- Email must remain unique across users.
- Password reset generates a random password and sends email (or logs to console in dev).

## Out of Scope

- Pagination (can be added later if user count grows).
- User creation from admin panel (users are created via case submission flow).
- Filtering/sorting (can be added later).
