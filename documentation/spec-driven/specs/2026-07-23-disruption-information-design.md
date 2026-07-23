# Design Spec: Collect Disruption Information

**Date:** 2026-07-23  
**Role:** Passenger  
**Title:** Collect Disruption Motives

## Overview

As a passenger, I want to provide information about the motive behind the disruption and describe the incident so that my case can be accurately assessed.

The disruption information step is inserted into the wizard flow after Flight Details and before Passenger Details.

## Data Model

Add the following fields to the existing `Case` model (all nullable CharField/TextField/BooleanField except where noted):

| Field | Type | Choices | Nullable | Notes |
|-------|------|---------|----------|-------|
| `disruption_type` | CharField(20) | `CANCELLATION`, `DELAY`, `DENIED_BOARDING` | No (required for submission) | Primary selection |
| `cancellation_notice_period` | CharField(20) | `MORE_THAN_14_DAYS`, `LESS_THAN_14_DAYS`, `ON_FLIGHT_DAY` | Yes | Shown if cancellation |
| `delay_arrival` | CharField(20) | `LESS_THAN_3H`, `MORE_THAN_3H`, `CONNECTION_LOST` | Yes | Shown if delay |
| `denied_boarding_voluntary` | BooleanField | — | Yes | Shown if denied boarding |
| `denied_boarding_reason` | CharField(20) | `OVERBOOKED`, `AGGRESSIVE`, `INTOXICATION`, `UNSPECIFIED` | Yes | Shown if denied boarding + not voluntary |
| `airline_mentioned_motive` | CharField(10) | `YES`, `NO`, `DONT_KNOW` | Yes | Shown if delay or cancellation |
| `airline_motive` | CharField(20) | `TECHNICAL`, `METEOROLOGICAL`, `STRIKE`, `AIRPORT_PROBLEMS`, `CREW_PROBLEMS`, `OTHER` | Yes | Shown if airline_mentioned_motive = YES |
| `incident_description` | TextField | — | Yes | Max 500 chars. Shown for all disruption types |

## Frontend Step: DisruptionInfo

### Position in Wizard

After Flight Details (step 5), before Passenger Details (step 6).

### Conditional Field Display

1. **Always visible:** Disruption type dropdown (Cancellation / Delay / Denied Boarding)

2. **If "Cancellation" selected:**
   - "How many days before departure did the airline inform you?" — radio/select with options: More than 14 days, Less than 14 days, On the flight day

3. **If "Delay" selected:**
   - "How late did you arrive at your final destination?" — radio/select with options: Less than 3 hours, More than 3 hours, Connection flight lost

4. **If "Denied Boarding" selected:**
   - "Did you give up your seat voluntarily?" — radio/select with options: Yes, No
   - If "No": "Reason behind denial of boarding" — dropdown with options: Flight overbooked, Aggressive behavior with staff, Intoxication, Unspecified reason

5. **If "Delay" or "Cancellation" selected:**
   - "Did the airline mention a disruption motive?" — radio/select with options: Yes, No, I don't know
   - If "Yes": "What was the motive communicated by the airline?" — dropdown with options: Technical problem, Meteorological conditions, Strike, Problems with airport, Crew problems, Other motives

6. **Always visible (once disruption type selected):**
   - "Describe in short what happened" — textarea, 500 character limit with visible character counter

### Validation Rules

- **Disruption type is required** to proceed to the next step
- **All other fields are optional** — no strict validation on answers
- A case without disruption information cannot be submitted (backend enforces)

## Backend

### Serializer: DisruptionSerializer

- Accepts all disruption fields
- Only validates that `disruption_type` is present and is a valid choice
- All other fields are optional (no cross-field validation)
- Integrated into the existing `CaseCreateSerializer`

### View Changes

- No new endpoints — disruption data is part of the existing case creation payload
- The `CaseCreateView` already accepts a `data` JSON field; disruption info is added to it

### Validation on Submission

- `disruption_type` must be present and valid for a case to be created
- If missing, return 400 with error message

## API Payload

Disruption data is nested under a `disruption` key in the existing `data` JSON payload:

```json
{
  "disruption": {
    "disruption_type": "CANCELLATION",
    "cancellation_notice_period": "LESS_THAN_14_DAYS",
    "airline_mentioned_motive": "YES",
    "airline_motive": "TECHNICAL",
    "incident_description": "Flight was cancelled 3 days before departure..."
  }
}
```

## UI/UX

- Follow existing wizard step styling and patterns
- Do not modify existing UI components or their styling
- Dropdown for disruption type, radio buttons or select for sub-questions
- Textarea with character counter for incident description
- Smooth conditional display (fields appear/disappear based on selections)

## Out of Scope

- File uploads for disruption evidence
- Multi-language support
- Complex cross-field validation rules
- Changes to existing wizard steps or UI patterns
