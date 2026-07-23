# CASE_01 – Case Registration Design Spec

**Date:** 2026-07-23  
**Status:** Draft  
**Scope:** Public case registration workflow for flight compensation claims  
**Excludes:** Disruption Details (CASE_03), Disruption Motives (CASE_03)

---

## 1. Overview

Implement a public multi-step wizard form that allows passengers to submit a new flight compensation case. The form collects flight itinerary, email/GDPR consent, flight details, passenger information, and supporting documents. On submission, a single API call creates the case with status `NEW`.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.x, Django REST Framework |
| Frontend | React (TypeScript), Vite |
| Database | PostgreSQL |
| Auth | Django auth (scaffolded, not enforced for this story) |

---

## 3. Project Structure

```
flight-compensation/
├── backend/
│   ├── manage.py
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── cases/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── validators.py
│   │   └── management/
│   │       └── commands/
│   │           └── sync_airports.py
│   ├── airports/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   └── CaseWizard/
│   │   │       ├── CaseWizard.tsx
│   │   │       ├── StepIndicator.tsx
│   │   │       ├── steps/
│   │   │       │   ├── FlightItinerary.tsx
│   │   │       │   ├── EmailGdpr.tsx
│   │   │       │   ├── FlightDetails.tsx
│   │   │       │   ├── PassengerDetails.tsx
│   │   │       │   └── CaseGeneration.tsx
│   │   │       └── types.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   └── utils/
│   │       └── validation.ts
│   └── public/
└── documentation/
```

---

## 4. Database Models

### 4.1 Airport (airports app)

| Field | Type | Constraints |
|-------|------|-------------|
| iata_code | CharField(3) | Primary key |
| name | CharField(255) | |
| city | CharField(255) | |
| country | CharField(255) | |

### 4.2 Case

| Field | Type | Constraints |
|-------|------|-------------|
| id | UUIDField | Primary key, auto-generated |
| status | CharField(10) | Choices: NEW, VALID, ASSIGNED, INVALID. Default: NEW |
| reservation_number | CharField(50) | |
| planned_departure_time | DateTimeField | |
| planned_arrival_time | DateTimeField | |
| created_at | DateTimeField | auto_now_add |

### 4.3 Passenger

| Field | Type | Constraints |
|-------|------|-------------|
| id | AutoField | Primary key |
| case | OneToOneField(Case) | on_delete=CASCADE |
| first_name | CharField(100) | |
| last_name | CharField(100) | |
| date_of_birth | DateField | Must be ≤ today |
| email | EmailField | |
| phone_number | CharField(20) | Regex validated |
| address | TextField | |
| postal_code | CharField(20) | |

### 4.4 Flight

| Field | Type | Constraints |
|-------|------|-------------|
| id | AutoField | Primary key |
| case | ForeignKey(Case) | on_delete=CASCADE |
| flight_number | CharField(10) | Regex: `^[A-Z]{2,3}\d{1,4}$` |
| flight_date | DateField | |
| airline | CharField(100) | |
| departure_airport | ForeignKey(Airport) | |
| arrival_airport | ForeignKey(Airport) | |
| is_connecting | BooleanField | Default: False |
| is_problem_flight | BooleanField | Default: False |
| sequence_order | IntegerField | Ordering of segments |

**Constraints:**
- Maximum 4 connecting flights per case (validated in serializer)
- When connecting flights exist: exactly one flight must have `is_problem_flight=True` (selected by user)
- When no connecting flights exist: the single direct flight is implicitly the problem flight (`is_problem_flight=True` set automatically)

### 4.5 Document

| Field | Type | Constraints |
|-------|------|-------------|
| id | AutoField | Primary key |
| case | ForeignKey(Case) | on_delete=CASCADE |
| document_type | CharField(20) | Choices: BOARDING_PASS, ID_CARD, PASSPORT |
| file_name | CharField(255) | |
| file_data | BinaryField | Max 5MB |
| file_size | IntegerField | Max 5,242,880 bytes |
| content_type | CharField(50) | Must be: application/pdf, image/jpeg, image/png |
| uploaded_at | DateTimeField | auto_now_add |

### 4.6 GdprConsent

| Field | Type | Constraints |
|-------|------|-------------|
| id | AutoField | Primary key |
| case | OneToOneField(Case) | on_delete=CASCADE |
| consented | BooleanField | Must be True for valid submission |
| consented_at | DateTimeField | auto_now_add |

---

## 5. API Endpoints

### 5.1 GET `/api/airports/`

**Purpose:** Search airports for autocomplete.

**Query params:**
- `search` (string) — filters by IATA code, name, or city (case-insensitive contains)

**Response (200):**
```json
[
  { "iata_code": "AMS", "name": "Amsterdam Schiphol", "city": "Amsterdam", "country": "Netherlands" }
]
```

**Pagination:** Returns max 20 results per request.

### 5.2 POST `/api/cases/`

**Purpose:** Create a new compensation case.

**Content-Type:** `multipart/form-data`

**Fields:**

The JSON data is sent as a `data` field (stringified JSON), and files are sent as separate file fields:

```
data: (JSON string - see structure below)
boarding_pass: (file)
identity_document: (file)
```

**JSON structure (in `data` field):**
```json
{
  "flight_itinerary": {
    "departure_airport": "AMS",
    "destination_airport": "BCN",
    "connecting_flights": [
      { "departure_airport": "AMS", "arrival_airport": "CDG" },
      { "departure_airport": "CDG", "arrival_airport": "BCN" }
    ],
    "problem_flight_index": 0
  },
  "flight_details": {
    "reservation_number": "ABC123",
    "planned_departure_time": "2026-07-20T10:00:00Z",
    "planned_arrival_time": "2026-07-20T14:00:00Z",
    "flights": [
      { "flight_date": "2026-07-20", "flight_number": "KL1234", "airline": "KLM" },
      { "flight_date": "2026-07-20", "flight_number": "AF5678", "airline": "Air France" }
    ]
  },
  "passenger": {
    "first_name": "John",
    "last_name": "Doe",
    "date_of_birth": "1990-05-15",
    "email": "john@example.com",
    "phone_number": "+31612345678",
    "address": "123 Main St, Amsterdam",
    "postal_code": "1012AB"
  },
  "gdpr_consent": true
}
```

**Response (201):**
```json
{
  "case_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "NEW",
  "created_at": "2026-07-23T12:00:00Z"
}
```

**Error Response (400):**
```json
{
  "passenger": { "email": ["Enter a valid email address."] },
  "documents": ["File exceeds 5MB limit."]
}
```

---

## 6. Wizard Flow (Frontend)

### 6.1 Step Configuration

| Step | Component | Status |
|------|-----------|--------|
| 1 | FlightItinerary | Implemented (this story) |
| 2 | DisruptionDetails | Placeholder — skipped in navigation (CASE_03) |
| 3 | DisruptionMotives | Placeholder — skipped in navigation (CASE_03) |
| 4 | EmailGdpr | Implemented (this story) |
| 5 | FlightDetails | Implemented (this story) |
| 6 | PassengerDetails | Implemented (this story) — includes document uploads |
| 7 | CaseGeneration | Implemented (this story) — summary + submit |

### 6.2 Navigation

- Steps 2 and 3 are shown in the stepper indicator as disabled/greyed out
- Navigation skips directly from Step 1 → Step 4
- Each step has Next/Back buttons
- "Next" triggers step-level validation before advancing
- "Back" preserves entered data
- Step 7 has a "Submit" button instead of "Next"

### 6.3 State Management

Form state lives in `CaseWizard.tsx` using React `useState` with a typed `CaseFormData` interface. Each step component receives its data slice and an `onChange` callback. No external state library.

### 6.4 Step Details

**Step 1 — Flight Itinerary:**
- Departure airport: autocomplete input (debounced 300ms, calls `/api/airports/?search=`)
- Destination airport: same autocomplete
- "Add connecting flight" button (max 4)
- Each connecting flight has departure/arrival airport autocomplete
- "Problem flight" dropdown (mandatory when connections exist, lists all connecting flights by index)

**Step 4 — Email & GDPR:**
- Email input field with inline validation
- GDPR policy text displayed (scrollable)
- Consent checkbox: "I agree to the processing of my personal data"
- Cannot proceed unless checked

**Step 5 — Flight Details:**
- Dynamically renders one section per flight segment (based on itinerary from Step 1)
- Per segment: flight date (date picker), flight number (text), airline (text)
- Global fields: reservation number, planned departure time, planned arrival time

**Step 6 — Passenger Details:**
- Personal info: first name, last name, date of birth, phone, address, postal code
- Document uploads section:
  - Boarding pass upload (required, 1 file)
  - ID/Passport upload (required, 1 file)
  - Accepted: PDF, JPG, JPEG, PNG
  - Max 5MB per file
  - Show file name + size after selection, with remove button

**Step 7 — Case Generation (Summary):**
- Read-only display of all entered data organized by section
- Flight itinerary summary with airport names
- Flight details per segment
- Passenger info (email masked partially)
- Document file names listed
- GDPR consent status
- "Submit" button → POST to `/api/cases/`
- On success: show confirmation with case ID
- On error: show error messages, allow navigation back to fix

---

## 7. Validation Rules

### 7.1 Backend Validation

| Field | Rule |
|-------|------|
| email | Django EmailValidator |
| phone_number | Regex: `^\+?[0-9\s\-]{7,20}$` |
| date_of_birth | ≤ today's date |
| departure_airport / destination_airport | Must exist in Airport table |
| connecting_flights | Max 4 entries |
| problem_flight_index | Required if connecting_flights is non-empty; must be valid index |
| flight_number | Regex: `^[A-Z]{2,3}\d{1,4}$` |
| documents | Max 5MB each; content-type validated against magic bytes |
| gdpr_consent | Must be `true` |
| All fields | Required (no blanks) |

### 7.2 Frontend Validation

Mirrors backend rules for immediate feedback. Validation runs on "Next" button click for each step. Errors displayed inline below the relevant field.

### 7.3 File Validation

Backend performs:
1. Size check (≤ 5,242,880 bytes)
2. Content-type header check (application/pdf, image/jpeg, image/png)
3. Magic bytes verification (first bytes of file match expected format)

---

## 8. Airport Sync

### 8.1 Management Command

`python manage.py sync_airports`

**Behavior:**
- Fetches all pages from AirportGap API (`GET https://airportgap.com/api/airports`)
- Paginates through all results
- Upserts each airport by IATA code (update_or_create)
- Logs: total fetched, created, updated
- Idempotent — safe to re-run

### 8.2 Execution

Run manually or via cron. Must be run at least once before the application is usable.

---

## 9. Case Status Workflow

```
NEW → VALID → ASSIGNED
NEW → INVALID
```

- `NEW`: Automatically set on case creation (this story)
- `VALID`: Set after eligibility verification (future story)
- `ASSIGNED`: Set when assigned to a colleague (future story)
- `INVALID`: Set after manual rejection (future story)

This story only creates cases with status `NEW`. Status transitions are out of scope.

---

## 10. Security

| Concern | Mitigation |
|---------|-----------|
| CSRF | Django CSRF middleware (exempt for API with proper CORS) |
| Rate limiting | DRF throttling on POST `/api/cases/` (e.g., 10/hour per IP) |
| File upload attacks | Magic byte validation, size limits, no execution of uploaded files |
| SQL injection | ORM parameterized queries (Django default) |
| XSS | React auto-escapes, DRF serializer output |
| CORS | Configured to allow only the frontend origin |
| Data exposure | No sensitive data in error responses; UUID case IDs (non-sequential) |

---

## 11. Authentication Scaffolding

Django auth is configured but not enforced for the case registration endpoint:
- `django.contrib.auth` in INSTALLED_APPS
- Token authentication configured in DRF settings
- Case creation endpoint uses `AllowAny` permission
- Auth can be enforced on future admin/internal endpoints

---

## 12. Acceptance Criteria

1. Public users can access the Case Entry Form without authentication.
2. All required fields are validated before submission (frontend + backend).
3. Airport codes are loaded from the pre-synced database (originally from AirportGap API).
4. Users can add up to four connecting flights.
5. Users must identify the disrupted connecting flight when connections exist.
6. Every flight segment has its own flight details (date, number, airline).
7. Boarding pass and ID/passport uploads are mandatory.
8. Uploaded files are validated for type (via magic bytes) and size (≤ 5MB).
9. GDPR consent is mandatory — form cannot be submitted without it.
10. A new compensation case is successfully created with all related records.
11. Every new case receives status `NEW`.
12. The wizard shows 7 steps with steps 2-3 disabled (CASE_03 scope).
13. Step 7 displays a complete summary before submission.
14. Airport autocomplete provides search results with debounced input.

---

## 13. Out of Scope

- Disruption Details (CASE_03)
- Disruption Motives (CASE_03)
- Case status transitions beyond initial `NEW`
- Admin interface for case management
- Email notifications
- Case editing after submission
- User registration/login
