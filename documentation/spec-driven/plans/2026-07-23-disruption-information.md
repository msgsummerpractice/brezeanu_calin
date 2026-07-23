# Disruption Information Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Add a disruption information wizard step that collects disruption type, conditional follow-up answers, and incident description.

**Architecture:** New fields on the Case model, a new DisruptionSerializer on the backend, a new DisruptionInfo step component on the frontend inserted between Flight Details and Passenger Details, with minimal validation (only disruption_type required).

**Tech Stack:** Django (Python), Django REST Framework, React (TypeScript), Vite

**Design Spec:** `documentation/spec-driven/specs/2026-07-23-disruption-information-design.md`

---

### Task 1: Add Disruption Fields to Case Model

**Files:**
- Modify: `backend/cases/models.py`

**Requirements:**
- Add disruption choice classes and fields to the Case model
- All new fields are nullable/blank except disruption_type which is nullable (since existing cases don't have it)

**Implementation:**

Add these choice classes before the `Case` class:

```python
class DisruptionType(models.TextChoices):
    CANCELLATION = 'CANCELLATION', 'Cancellation'
    DELAY = 'DELAY', 'Delay'
    DENIED_BOARDING = 'DENIED_BOARDING', 'Denied Boarding'


class CancellationNoticePeriod(models.TextChoices):
    MORE_THAN_14_DAYS = 'MORE_THAN_14_DAYS', 'More than 14 days'
    LESS_THAN_14_DAYS = 'LESS_THAN_14_DAYS', 'Less than 14 days'
    ON_FLIGHT_DAY = 'ON_FLIGHT_DAY', 'On flight day'


class DelayArrival(models.TextChoices):
    LESS_THAN_3H = 'LESS_THAN_3H', 'Less than 3 hours'
    MORE_THAN_3H = 'MORE_THAN_3H', 'More than 3 hours'
    CONNECTION_LOST = 'CONNECTION_LOST', 'Connection flight lost'


class DeniedBoardingReason(models.TextChoices):
    OVERBOOKED = 'OVERBOOKED', 'Flight overbooked'
    AGGRESSIVE = 'AGGRESSIVE', 'Aggressive behavior with staff'
    INTOXICATION = 'INTOXICATION', 'Intoxication'
    UNSPECIFIED = 'UNSPECIFIED', 'Unspecified reason'


class AirlineMentionedMotive(models.TextChoices):
    YES = 'YES', 'Yes'
    NO = 'NO', 'No'
    DONT_KNOW = 'DONT_KNOW', "I don't know"


class AirlineMotive(models.TextChoices):
    TECHNICAL = 'TECHNICAL', 'Technical problem'
    METEOROLOGICAL = 'METEOROLOGICAL', 'Meteorological conditions'
    STRIKE = 'STRIKE', 'Strike'
    AIRPORT_PROBLEMS = 'AIRPORT_PROBLEMS', 'Problems with airport'
    CREW_PROBLEMS = 'CREW_PROBLEMS', 'Crew problems'
    OTHER = 'OTHER', 'Other motives'
```

Add these fields to the `Case` model after `compensation_amount`:

```python
    disruption_type = models.CharField(
        max_length=20, choices=DisruptionType.choices, null=True, blank=True
    )
    cancellation_notice_period = models.CharField(
        max_length=20, choices=CancellationNoticePeriod.choices, null=True, blank=True
    )
    delay_arrival = models.CharField(
        max_length=20, choices=DelayArrival.choices, null=True, blank=True
    )
    denied_boarding_voluntary = models.NullBooleanField(null=True, blank=True)
    denied_boarding_reason = models.CharField(
        max_length=20, choices=DeniedBoardingReason.choices, null=True, blank=True
    )
    airline_mentioned_motive = models.CharField(
        max_length=10, choices=AirlineMentionedMotive.choices, null=True, blank=True
    )
    airline_motive = models.CharField(
        max_length=20, choices=AirlineMotive.choices, null=True, blank=True
    )
    incident_description = models.TextField(max_length=500, null=True, blank=True)
```

Note: Use `models.BooleanField(null=True, blank=True)` instead of `NullBooleanField` since Django 4+ deprecated it.

**Verification:**
- Run `python manage.py makemigrations cases` — should produce a migration with the new fields
- Run `python manage.py migrate` — should apply without errors

---

### Task 2: Create Migration for Disruption Fields

**Files:**
- Create: `backend/cases/migrations/0003_case_disruption_fields.py` (auto-generated)

**Requirements:**
- Run makemigrations after adding fields in Task 1
- This task is automatically handled by `python manage.py makemigrations`

**Verification:**
- Migration file exists in `backend/cases/migrations/`
- `python manage.py migrate` runs without error

---

### Task 3: Add DisruptionSerializer and Integrate into CaseCreateSerializer

**Files:**
- Modify: `backend/cases/serializers.py`

**Requirements:**
- Create a `DisruptionSerializer` that accepts all disruption fields
- Only `disruption_type` is required; all other fields are optional
- No cross-field validation (e.g., don't enforce that cancellation_notice_period is set when type is CANCELLATION)
- Add `disruption` field to `CaseCreateSerializer`
- Update the `create` method to save disruption fields to the Case

**Implementation:**

Add this serializer class after `PassengerSerializer`:

```python
class DisruptionSerializer(serializers.Serializer):
    disruption_type = serializers.ChoiceField(choices=[
        ('CANCELLATION', 'Cancellation'),
        ('DELAY', 'Delay'),
        ('DENIED_BOARDING', 'Denied Boarding'),
    ])
    cancellation_notice_period = serializers.ChoiceField(
        choices=[
            ('MORE_THAN_14_DAYS', 'More than 14 days'),
            ('LESS_THAN_14_DAYS', 'Less than 14 days'),
            ('ON_FLIGHT_DAY', 'On flight day'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    delay_arrival = serializers.ChoiceField(
        choices=[
            ('LESS_THAN_3H', 'Less than 3 hours'),
            ('MORE_THAN_3H', 'More than 3 hours'),
            ('CONNECTION_LOST', 'Connection flight lost'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    denied_boarding_voluntary = serializers.NullBooleanField(required=False)
    denied_boarding_reason = serializers.ChoiceField(
        choices=[
            ('OVERBOOKED', 'Flight overbooked'),
            ('AGGRESSIVE', 'Aggressive behavior with staff'),
            ('INTOXICATION', 'Intoxication'),
            ('UNSPECIFIED', 'Unspecified reason'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    airline_mentioned_motive = serializers.ChoiceField(
        choices=[
            ('YES', 'Yes'),
            ('NO', 'No'),
            ('DONT_KNOW', "I don't know"),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    airline_motive = serializers.ChoiceField(
        choices=[
            ('TECHNICAL', 'Technical problem'),
            ('METEOROLOGICAL', 'Meteorological conditions'),
            ('STRIKE', 'Strike'),
            ('AIRPORT_PROBLEMS', 'Problems with airport'),
            ('CREW_PROBLEMS', 'Crew problems'),
            ('OTHER', 'Other motives'),
        ],
        required=False, allow_null=True, allow_blank=True,
    )
    incident_description = serializers.CharField(
        max_length=500, required=False, allow_blank=True, allow_null=True,
    )
```

Add to `CaseCreateSerializer` fields:

```python
    disruption = DisruptionSerializer()
```

Update the `create` method in `CaseCreateSerializer` to include disruption data when creating the Case:

```python
        disruption_data = validated_data.get('disruption', {})

        with transaction.atomic():
            # Create Case
            case = Case.objects.create(
                reservation_number=flight_details['reservation_number'],
                planned_departure_time=flight_details['planned_departure_time'],
                planned_arrival_time=flight_details['planned_arrival_time'],
                distance_km=validated_data.get('distance_km'),
                compensation_amount=validated_data.get('compensation_amount'),
                disruption_type=disruption_data.get('disruption_type'),
                cancellation_notice_period=disruption_data.get('cancellation_notice_period') or None,
                delay_arrival=disruption_data.get('delay_arrival') or None,
                denied_boarding_voluntary=disruption_data.get('denied_boarding_voluntary'),
                denied_boarding_reason=disruption_data.get('denied_boarding_reason') or None,
                airline_mentioned_motive=disruption_data.get('airline_mentioned_motive') or None,
                airline_motive=disruption_data.get('airline_motive') or None,
                incident_description=disruption_data.get('incident_description') or None,
            )
```

**Verification:**
- Django shell: create a serializer instance with test data and call `is_valid()` — should return True
- Missing `disruption_type` should fail validation
- Missing optional fields should pass

---

### Task 4: Add DisruptionData Type and Update CaseFormData

**Files:**
- Modify: `frontend/src/components/CaseWizard/types.ts`

**Requirements:**
- Add `DisruptionData` interface
- Add `disruption` field to `CaseFormData`
- Add initial disruption data to `INITIAL_FORM_DATA`

**Implementation:**

Add this interface after `CompensationData`:

```typescript
export interface DisruptionData {
  disruption_type: string;
  cancellation_notice_period: string;
  delay_arrival: string;
  denied_boarding_voluntary: boolean | null;
  denied_boarding_reason: string;
  airline_mentioned_motive: string;
  airline_motive: string;
  incident_description: string;
}
```

Add to `CaseFormData` interface:

```typescript
  disruption: DisruptionData;
```

Add to `INITIAL_FORM_DATA`:

```typescript
  disruption: {
    disruption_type: '',
    cancellation_notice_period: '',
    delay_arrival: '',
    denied_boarding_voluntary: null,
    denied_boarding_reason: '',
    airline_mentioned_motive: '',
    airline_motive: '',
    incident_description: '',
  },
```

**Verification:**
- TypeScript compilation passes without errors

---

### Task 5: Create DisruptionInfo Step Component

**Files:**
- Create: `frontend/src/components/CaseWizard/steps/DisruptionInfo.tsx`

**Requirements:**
- Disruption type dropdown (Cancellation / Delay / Denied Boarding)
- Conditional fields shown based on disruption_type
- If Cancellation: cancellation notice period options
- If Delay: delay arrival options
- If Denied Boarding: voluntary question, if No → reason dropdown
- If Delay or Cancellation: airline motive question, if Yes → motive dropdown
- Incident description textarea with 500 char limit and counter
- Follow existing step component pattern (same props interface style as FlightDetails)
- Match existing UI styling (same input, label, container styles)

**Implementation:**

```typescript
import React from 'react';
import type { DisruptionData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: DisruptionData;
  onChange: (data: DisruptionData) => void;
  errors: FieldErrors;
}

export const DisruptionInfo: React.FC<Props> = ({ data, onChange, errors }) => {
  const handleChange = (field: keyof DisruptionData, value: string | boolean | null) => {
    const updated = { ...data, [field]: value };

    // Reset conditional fields when disruption type changes
    if (field === 'disruption_type') {
      updated.cancellation_notice_period = '';
      updated.delay_arrival = '';
      updated.denied_boarding_voluntary = null;
      updated.denied_boarding_reason = '';
      updated.airline_mentioned_motive = '';
      updated.airline_motive = '';
      updated.incident_description = '';
    }

    // Reset motive if airline_mentioned_motive changes away from YES
    if (field === 'airline_mentioned_motive' && value !== 'YES') {
      updated.airline_motive = '';
    }

    // Reset reason if voluntary changes to Yes
    if (field === 'denied_boarding_voluntary' && value === true) {
      updated.denied_boarding_reason = '';
    }

    onChange(updated);
  };

  const isCancellation = data.disruption_type === 'CANCELLATION';
  const isDelay = data.disruption_type === 'DELAY';
  const isDeniedBoarding = data.disruption_type === 'DENIED_BOARDING';
  const showAirlineMotive = isCancellation || isDelay;

  return (
    <div>
      <h2>Disruption Information</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Tell us about the disruption you experienced.
      </p>

      {/* Disruption Type */}
      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span> Type of Disruption
        </label>
        <select
          value={data.disruption_type}
          onChange={(e) => handleChange('disruption_type', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: errors.disruption_type ? '2px solid #fb7185' : '2px solid #e2e8f0',
            background: errors.disruption_type ? '#fff1f2' : 'white',
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            marginTop: '0.5rem',
          }}
        >
          <option value="">Select disruption type...</option>
          <option value="CANCELLATION">Cancellation</option>
          <option value="DELAY">Delay</option>
          <option value="DENIED_BOARDING">Denied Boarding</option>
        </select>
        {errors.disruption_type && <div className="field-error">⚠ {errors.disruption_type}</div>}
      </div>

      {/* Cancellation: Notice Period */}
      {isCancellation && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>How many days before departure did the airline inform you?</label>
          <select
            value={data.cancellation_notice_period}
            onChange={(e) => handleChange('cancellation_notice_period', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="MORE_THAN_14_DAYS">More than 14 days</option>
            <option value="LESS_THAN_14_DAYS">Less than 14 days</option>
            <option value="ON_FLIGHT_DAY">On the flight day</option>
          </select>
        </div>
      )}

      {/* Delay: Arrival */}
      {isDelay && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>How late did you arrive at your final destination?</label>
          <select
            value={data.delay_arrival}
            onChange={(e) => handleChange('delay_arrival', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="LESS_THAN_3H">Less than 3 hours</option>
            <option value="MORE_THAN_3H">More than 3 hours</option>
            <option value="CONNECTION_LOST">Connection flight lost</option>
          </select>
        </div>
      )}

      {/* Denied Boarding: Voluntary */}
      {isDeniedBoarding && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Did you give up your seat voluntarily?</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="denied_boarding_voluntary"
                checked={data.denied_boarding_voluntary === true}
                onChange={() => handleChange('denied_boarding_voluntary', true)}
              />
              Yes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="denied_boarding_voluntary"
                checked={data.denied_boarding_voluntary === false}
                onChange={() => handleChange('denied_boarding_voluntary', false)}
              />
              No
            </label>
          </div>
        </div>
      )}

      {/* Denied Boarding: Reason (if not voluntary) */}
      {isDeniedBoarding && data.denied_boarding_voluntary === false && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Reason behind denial of boarding</label>
          <select
            value={data.denied_boarding_reason}
            onChange={(e) => handleChange('denied_boarding_reason', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="OVERBOOKED">Flight overbooked</option>
            <option value="AGGRESSIVE">Aggressive behavior with staff</option>
            <option value="INTOXICATION">Intoxication</option>
            <option value="UNSPECIFIED">Unspecified reason</option>
          </select>
        </div>
      )}

      {/* Airline Motive (Delay or Cancellation) */}
      {showAirlineMotive && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Did the airline mention a disruption motive?</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { value: 'YES', label: 'Yes' },
              { value: 'NO', label: 'No' },
              { value: 'DONT_KNOW', label: "I don't know" },
            ].map((option) => (
              <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="airline_mentioned_motive"
                  checked={data.airline_mentioned_motive === option.value}
                  onChange={() => handleChange('airline_mentioned_motive', option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Airline Motive Details (if Yes) */}
      {showAirlineMotive && data.airline_mentioned_motive === 'YES' && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>What was the motive communicated by the airline?</label>
          <select
            value={data.airline_motive}
            onChange={(e) => handleChange('airline_motive', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="TECHNICAL">Technical problem</option>
            <option value="METEOROLOGICAL">Meteorological conditions</option>
            <option value="STRIKE">Strike</option>
            <option value="AIRPORT_PROBLEMS">Problems with airport</option>
            <option value="CREW_PROBLEMS">Crew problems</option>
            <option value="OTHER">Other motives</option>
          </select>
        </div>
      )}

      {/* Incident Description (all types) */}
      {data.disruption_type && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Describe in short what happened</label>
          <textarea
            value={data.incident_description}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                handleChange('incident_description', e.target.value);
              }
            }}
            placeholder="Describe the incident..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
              resize: 'vertical',
            }}
          />
          <div style={{
            textAlign: 'right',
            fontSize: '0.8rem',
            color: data.incident_description.length >= 450 ? '#f59e0b' : '#94a3b8',
            marginTop: '0.25rem',
          }}>
            {data.incident_description.length}/500
          </div>
        </div>
      )}
    </div>
  );
};
```

**Verification:**
- Component renders without errors
- TypeScript compilation passes

---

### Task 6: Add Disruption Validation Function

**Files:**
- Modify: `frontend/src/utils/validation.ts`

**Requirements:**
- Add `validateDisruption` function
- Only validates that `disruption_type` is not empty
- Returns FieldErrors (same pattern as other validators)

**Implementation:**

Add import of `DisruptionData` to the existing import:

```typescript
import type {
  FlightItineraryData,
  EmailGdprData,
  FlightDetailsData,
  PassengerData,
  DocumentsData,
  DisruptionData,
} from '../components/CaseWizard/types';
```

Add this function after the existing validators:

```typescript
export function validateDisruption(data: DisruptionData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.disruption_type) {
    errors.disruption_type = 'Please select a disruption type.';
  }

  return errors;
}
```

**Verification:**
- `validateDisruption({ disruption_type: '' })` returns error
- `validateDisruption({ disruption_type: 'DELAY', ... })` returns empty object

---

### Task 7: Integrate DisruptionInfo Step into CaseWizard

**Files:**
- Modify: `frontend/src/components/CaseWizard/CaseWizard.tsx`

**Requirements:**
- Import the new DisruptionInfo component
- Import validateDisruption
- Enable step index 1 (Disruption Details) in the STEPS array — rename to match or enable index 2 (Disruption Motives)
- Add the step to ACTIVE_STEPS (between Flight Details index 4 and Passenger Details index 5)
- Add the step to renderStep switch
- Add validation case for the disruption step
- Update STEPS labels: change disabled steps to enabled

**Implementation:**

Update imports to add:
```typescript
import { DisruptionInfo } from './steps/DisruptionInfo';
```

Update validation import:
```typescript
import {
  validateFlightItinerary,
  validateEmailGdpr,
  validateFlightDetails,
  validatePassengerDetails,
  validateDisruption,
} from '../../utils/validation';
```

Update STEPS — enable "Disruption Motives" (index 2):
```typescript
const STEPS = [
  { label: 'Flight Itinerary' },
  { label: 'Disruption Details', disabled: true },
  { label: 'Disruption Motives' },
  { label: 'Email & GDPR' },
  { label: 'Flight Details' },
  { label: 'Passenger Details' },
  { label: 'Case Generation' },
];
```

Update ACTIVE_STEPS to include step 2 after step 4 (Flight Details):
```typescript
const ACTIVE_STEPS = [0, 3, 4, 2, 5, 6];
```

This makes the flow: Flight Itinerary (0) → Email & GDPR (3) → Flight Details (4) → Disruption Motives (2) → Passenger Details (5) → Case Generation (6).

Add validation case in `validateCurrentStep`:
```typescript
      case 2:
        stepErrors = validateDisruption(formData.disruption);
        break;
```

Add render case in `renderStep`:
```typescript
      case 2:
        return (
          <DisruptionInfo
            data={formData.disruption}
            onChange={(data) => setFormData(prev => ({ ...prev, disruption: data }))}
            errors={errors}
          />
        );
```

**Verification:**
- Wizard renders all steps
- Navigation between steps works
- Disruption step appears after Flight Details
- Can't proceed past disruption step without selecting a type

---

### Task 8: Update API Service to Include Disruption Data in Submission

**Files:**
- Modify: `frontend/src/services/api.ts`

**Requirements:**
- Add disruption data to the payload sent to `/api/cases/`
- Only include non-empty fields to keep payload clean

**Implementation:**

In the `submitCase` function, add to the payload object:

```typescript
    disruption: {
      disruption_type: formData.disruption.disruption_type,
      ...(formData.disruption.cancellation_notice_period && {
        cancellation_notice_period: formData.disruption.cancellation_notice_period,
      }),
      ...(formData.disruption.delay_arrival && {
        delay_arrival: formData.disruption.delay_arrival,
      }),
      ...(formData.disruption.denied_boarding_voluntary !== null && {
        denied_boarding_voluntary: formData.disruption.denied_boarding_voluntary,
      }),
      ...(formData.disruption.denied_boarding_reason && {
        denied_boarding_reason: formData.disruption.denied_boarding_reason,
      }),
      ...(formData.disruption.airline_mentioned_motive && {
        airline_mentioned_motive: formData.disruption.airline_mentioned_motive,
      }),
      ...(formData.disruption.airline_motive && {
        airline_motive: formData.disruption.airline_motive,
      }),
      ...(formData.disruption.incident_description && {
        incident_description: formData.disruption.incident_description,
      }),
    },
```

**Verification:**
- Check browser Network tab when submitting — disruption data present in payload
- Backend accepts and saves the data

---

### Task 9: Update CaseGeneration Review to Show Disruption Info

**Files:**
- Modify: `frontend/src/components/CaseWizard/steps/CaseGeneration.tsx`

**Requirements:**
- Display disruption information in the review summary before submission
- Show disruption type and any selected sub-answers

**Implementation:**

Read the current CaseGeneration component and add a disruption summary section. Display the disruption type, and any non-empty conditional answers. Use the same styling pattern as other review sections in the component.

**Verification:**
- Review screen shows disruption information before submission
- Empty optional fields are not displayed
