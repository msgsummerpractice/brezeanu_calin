# Design Spec: User Account Creation After Case Capture

**Date:** 2026-07-24  
**Status:** Draft  

## Overview

After the system successfully captures and records all relevant information for a new passenger case (passenger details, flight details, disruption details), a new user account is automatically created for the passenger. A generated password is sent to the passenger's email via Gmail SMTP. The user logs in with email + generated password and is forced to change their password on first login.

## Architecture

### Backend Components

1. **UserProfile model** — extends Django's `auth.User` with:
   - `must_change_password` (boolean, default True)
   - `passenger` (OneToOneField → Passenger)

2. **Account creation service** (`accounts/services.py`):
   - Called from `CaseCreateView` after successful case save
   - Generates a secure random password (12 chars, mixed case + digits + special)
   - Creates `User` (username=email, email=email) + `UserProfile`
   - Sends welcome email with password via Gmail SMTP
   - If a user with that email already exists, links the new case but does NOT create a new account or resend password

3. **Auth API endpoints** (`accounts/views.py`):
   - `POST /api/auth/login/` — accepts email + password, returns auth token + `must_change_password` flag
   - `POST /api/auth/change-password/` — accepts old_password + new_password, clears `must_change_password` flag
   - `GET /api/auth/me/` — returns current user info including linked cases

4. **Middleware/Permission check**:
   - A DRF permission class `PasswordChangedPermission` that blocks access to protected endpoints if `must_change_password` is True (except login and change-password endpoints)

### Frontend Components

1. **Login page** (`/login`):
   - Email + password form
   - On success, stores token, checks `must_change_password`
   - If `must_change_password`, redirects to password change

2. **Password change page/modal**:
   - Old password + new password + confirm new password
   - Validates: min 8 chars, not same as old
   - On success, clears flag and redirects to dashboard

3. **Auth context/store**:
   - Stores token in localStorage
   - Provides `isAuthenticated`, `mustChangePassword`, `user` state
   - Attaches token to API requests

### Database Changes

- New `accounts_userprofile` table:
  - `id` (PK)
  - `user_id` (FK → auth_user, OneToOne)
  - `passenger_id` (FK → cases_passenger, OneToOne, nullable)
  - `must_change_password` (boolean, default True)
  - `created_at` (datetime)

### Email Configuration

- Gmail SMTP via Django's `send_mail`
- Settings from environment variables:
  - `EMAIL_HOST_USER` — Gmail address
  - `EMAIL_HOST_PASSWORD` — Gmail App Password
- Email template: plain text with passenger name, login URL, email, and generated password

### Data Flow

1. User submits case via wizard → `POST /api/cases/`
2. `CaseCreateView` validates and saves case + passenger + flights + documents
3. After save, calls `create_user_account(passenger)`:
   - Checks if User with that email exists → if yes, link and return
   - Generates password → creates User → creates UserProfile (must_change_password=True)
   - Sends email with credentials
4. Response includes `user_created: true/false` field
5. User receives email → goes to login page
6. `POST /api/auth/login/` → token + must_change_password=true
7. Frontend forces password change → `POST /api/auth/change-password/`
8. After change, user has full access

### Error Handling

- If email sending fails, the account is still created (password is logged in dev, user can request reset later)
- If user already exists with same email, no error — case is linked to existing user
- Password generation uses `secrets` module for cryptographic randomness

### Security

- Passwords generated with `secrets.token_urlsafe` + additional complexity
- Token authentication (already configured in DRF settings)
- Password validators enforced on change (Django's built-in validators)
- SMTP credentials stored in environment variables only
- Rate limiting on login endpoint (5/minute per IP)

## Out of Scope

- Password reset/forgot password flow
- Email verification
- OAuth/social login
- Role-based permissions beyond the password change gate
