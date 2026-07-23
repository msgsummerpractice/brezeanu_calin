# CASE_04 — Case Creation: Colleague Field & Verification

**Date:** 2026-07-23  
**Status:** Draft  
**Depends on:** CASE_01 (Case Registration), CASE_02 (Compensation), CASE_03 (Disruption)

## Overview

Add a "Colleague" assignment field to the Case model. The field is initially empty when a case is created and can be assigned later. This story also verifies that all existing case creation behavior (transactional saves, validation, error handling, database integrity) matches the requirements.

## What's New

### Colleague Field

- **Model:** Add `colleague` field to `Case` model — `CharField(max_length=255, blank=True, default="")`
- **Behavior:** Automatically set to empty string on case creation. No user input in the wizard.
- **API Response:** Include `colleague` in `CaseResponseSerializer` as a read-only field so the caller can see the assignment status.
- **Assignment:** Out of scope for this story. A future endpoint or admin action will assign a colleague.

## What Already Exists (Verification)

The following requirements from the user story are already implemented and will be verified, not rebuilt:

### Case Creation
- Case created with UUID primary key (`case_id`) and auto-timestamped `created_at`
- Status defaults to `NEW`
- Triggered by POST to `/api/cases/`

### Database Schema
- **Cases table:** UUID PK, status, reservation_number, departure/arrival times, disruption fields, distance_km, compensation_amount, created_at
- **Passengers table:** OneToOne FK to Case, personal info fields
- **Flights table:** FK to Case, flight details, connection info
- **Documents table:** FK to Case, file storage
- **GdprConsent table:** OneToOne FK to Case

### Transactional Save
- `CaseCreateSerializer.create()` uses `@transaction.atomic`
- All related records (passenger, flights, documents, GDPR consent) created in single transaction
- If any part fails, entire transaction rolls back — no partial data

### Data Integrity
- Frontend validation before each wizard step advance
- Backend validation via DRF serializers (required fields, format checks)
- Foreign key constraints with CASCADE delete
- File validation (size ≤ 5MB, content type + magic bytes)
- Phone number, flight number, date-of-birth validators

### Error Handling
- Backend returns 400 with field-level errors on validation failure
- Frontend displays error messages on submit failure
- Rate limiting: 10 requests/hour per IP

## Acceptance Criteria

1. Case model has a `colleague` field (CharField, max 255, blank, default empty string)
2. Migration created and applied successfully
3. `CaseResponseSerializer` includes `colleague` in the response
4. Creating a case via POST `/api/cases/` returns `colleague: ""` in the response
5. All existing case creation tests still pass (if any)
6. Existing transactional behavior is unaffected

## Out of Scope

- Colleague assignment endpoint/UI
- Authentication/authorization
- Case status transitions beyond NEW
