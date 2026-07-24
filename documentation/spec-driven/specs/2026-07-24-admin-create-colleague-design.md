# Design Spec: Admin Create Colleague Account

**Date:** 2026-07-24  
**Status:** Approved  
**Role:** System Admin  

## Overview

As a System Admin, I want to create user accounts for colleagues so that they can access the system and perform their tasks. The admin enters first name, last name, email, and selects a role. The system generates a secure password, creates the account, sends credentials via email, and displays the generated password to the admin.

## Requirements

### Backend

1. **Endpoint:** `POST /api/admin/users/` — creates a new colleague account.
2. **Authorization:** Requires `IsAdminUser` (is_staff=True).
3. **Input:** `first_name`, `last_name`, `email`, `role` (Agent or User).
4. **Validation:**
   - first_name and last_name are required, non-empty
   - email is required, valid format, must be unique
   - role must be one of: "Agent", "User"
5. **Processing:**
   - Generate secure random password using existing `generate_password()` from `accounts/services.py`
   - Create Django `User` (username=email, email, first_name, last_name, set is_staff based on role)
   - Create `UserProfile` (must_change_password=True, passenger=None)
   - Send credentials email to the colleague
6. **Response 201:**
   ```json
   {
     "id": 1,
     "first_name": "Jane",
     "last_name": "Smith",
     "email": "jane@example.com",
     "role": "Agent",
     "generated_password": "xK9#mPq2Lw4v"
   }
   ```
7. **Error responses:**
   - 400: Validation errors (missing fields, duplicate email, invalid role)

### Frontend

1. **New User button** on UserList page (top right, next to heading).
2. **Modal form** with fields: First Name, Last Name, Email, Role (dropdown: Agent, User).
3. **Submit** calls `POST /api/admin/users/`.
4. **Success confirmation:** Modal shows green success message with generated password clearly displayed, and a note to share it with the colleague.
5. **Dismiss** closes modal, refreshes user list.
6. **Error handling:** Display validation errors inline.

### Database

- No new migrations. Uses existing `auth_user` + `accounts_userprofile` tables.
- Role mapping: Agent → is_staff=True, is_superuser=False; User → is_staff=False, is_superuser=False.

## API Contract

### POST /api/admin/users/

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "role": "Agent"
}
```

**Response 201:**
```json
{
  "id": 1,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "role": "Agent",
  "generated_password": "xK9#mPq2Lw4v"
}
```

**Response 400:**
```json
{
  "email": ["A user with this email already exists."]
}
```

## Security

- Admin-only access (IsAdminUser permission)
- Password generated with `secrets` module (cryptographically secure)
- Generated password shown only once in the response (not stored in plain text)
- Email credentials sent via configured SMTP

## Out of Scope

- Bulk user creation
- CSV import
- Admin creating other Admin accounts (only Agent/User)
