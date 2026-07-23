# Calculate Compensation Level — Implementation Plan

> **Execution:** Use subagent-driven development to implement this plan task-by-task.

**Goal:** Calculate orthodromic distance between origin and final destination airports and determine EU261 compensation level, displaying results in the case wizard.

**Architecture:** Frontend calls airportgap.com API directly for distance; falls back to a backend Haversine endpoint using stored lat/lon. Distance and compensation are displayed in the FlightItinerary step and CaseGeneration summary, then persisted with the case on submission.

**Tech Stack:** Django REST Framework, React (TypeScript), Vite, airportgap.com API

**Design Spec:** `documentation/spec-driven/specs/2026-07-23-compensation-calculation-design.md`

---

### Task 1: Add Latitude/Longitude to Airport Model

**Files:**
- Modify: `backend/airports/models.py`
- Create: `backend/airports/migrations/0002_airport_latitude_longitude.py`

**Requirements:**
- Add `latitude` (DecimalField, max_digits=9, decimal_places=6, null=True, blank=True)
- Add `longitude` (DecimalField, max_digits=9, decimal_places=6, null=True, blank=True)
- Create migration

**Implementation:**

```python
# backend/airports/models.py
from django.db import models


class Airport(models.Model):
    iata_code = models.CharField(max_length=3, primary_key=True)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ['iata_code']

    def __str__(self):
        return f"{self.iata_code} - {self.name}"
```

**Verification:**
- Run `python manage.py makemigrations airports` — should generate migration adding latitude and longitude
- Run `python manage.py migrate` — should apply cleanly

---

### Task 2: Update Airport Sync Command to Store Coordinates

**Files:**
- Modify: `backend/cases/management/commands/sync_airports.py`

**Requirements:**
- Extract `latitude` and `longitude` from the airportgap.com response (fields exist in `data[].attributes`)
- Store as Decimal values in the `update_or_create` defaults
- Handle missing coordinate values gracefully (store None)

**Implementation:**

```python
import requests
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from airports.models import Airport


class Command(BaseCommand):
    help = 'Sync airports from AirportGap API into the database'

    def _parse_coordinate(self, value):
        """Parse a coordinate string to Decimal, returning None if invalid."""
        if value is None or value == '':
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None

    def handle(self, *args, **options):
        url = 'https://airportgap.com/api/airports'
        created_count = 0
        updated_count = 0
        total_fetched = 0

        while url:
            self.stdout.write(f'Fetching: {url}')
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            payload = response.json()

            airports_data = payload.get('data', [])
            for item in airports_data:
                attrs = item.get('attributes', {})
                iata = attrs.get('iata', '').strip()
                if not iata or len(iata) > 3:
                    continue

                _, created = Airport.objects.update_or_create(
                    iata_code=iata,
                    defaults={
                        'name': (attrs.get('name') or '')[:255],
                        'city': (attrs.get('city') or '')[:255],
                        'country': (attrs.get('country') or '')[:255],
                        'latitude': self._parse_coordinate(attrs.get('latitude')),
                        'longitude': self._parse_coordinate(attrs.get('longitude')),
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1
                total_fetched += 1

            # Follow pagination
            links = payload.get('links', {})
            url = links.get('next') if links.get('next') != url else None

        self.stdout.write(self.style.SUCCESS(
            f'Sync complete. Fetched: {total_fetched}, '
            f'Created: {created_count}, Updated: {updated_count}'
        ))
```

**Verification:**
- Run `python manage.py sync_airports` — should complete without errors
- Check `Airport.objects.filter(latitude__isnull=False).count()` returns > 0

---

### Task 3: Add Compensation Fields to Case Model

**Files:**
- Modify: `backend/cases/models.py`
- Create: `backend/cases/migrations/0002_case_compensation_fields.py`

**Requirements:**
- Add `distance_km` (DecimalField, max_digits=10, decimal_places=2, null=True, blank=True) to Case
- Add `compensation_amount` (DecimalField, max_digits=8, decimal_places=2, null=True, blank=True) to Case
- Create migration

**Implementation:**

Add after the `created_at` field in the `Case` model:

```python
class Case(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(
        max_length=10,
        choices=CaseStatus.choices,
        default=CaseStatus.NEW,
    )
    reservation_number = models.CharField(max_length=50)
    planned_departure_time = models.DateTimeField()
    planned_arrival_time = models.DateTimeField()
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    compensation_amount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Case {self.id} ({self.status})"
```

**Verification:**
- Run `python manage.py makemigrations cases` — should generate migration
- Run `python manage.py migrate` — should apply cleanly

---

### Task 4: Create Backend Distance Endpoint (Haversine Fallback)

**Files:**
- Modify: `backend/airports/views.py`
- Modify: `backend/airports/urls.py`

**Requirements:**
- New `AirportDistanceView` (APIView, AllowAny)
- Accepts GET with `from` and `to` query params (IATA codes)
- Looks up both airports, validates they have lat/lon
- Calculates great-circle distance using Haversine formula
- Applies compensation thresholds: <1500→250, 1500–3500→400, >3500→600
- Returns JSON with `from_airport`, `to_airport`, `distance_km`, `compensation_amount`, `source`
- Returns 400 if params missing, 404 if airport not found or missing coordinates

**Implementation:**

```python
# backend/airports/views.py
import math
from decimal import Decimal
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from django.db.models import Q
from .models import Airport
from .serializers import AirportSerializer


class AirportListView(generics.ListAPIView):
    serializer_class = AirportSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Airport.objects.all()
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(iata_code__icontains=search) |
                Q(name__icontains=search) |
                Q(city__icontains=search)
            )
        return queryset[:20]


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate great-circle distance between two points in km."""
    R = 6371.0
    lat1_rad = math.radians(float(lat1))
    lat2_rad = math.radians(float(lat2))
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_compensation(distance_km):
    """Determine EU261 compensation based on distance."""
    if distance_km < 1500:
        return 250
    elif distance_km <= 3500:
        return 400
    else:
        return 600


class AirportDistanceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from_code = request.query_params.get('from', '').strip().upper()
        to_code = request.query_params.get('to', '').strip().upper()

        if not from_code or not to_code:
            return Response(
                {'error': 'Both "from" and "to" query parameters are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from_airport = Airport.objects.get(iata_code=from_code)
        except Airport.DoesNotExist:
            return Response(
                {'error': f'Airport "{from_code}" not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            to_airport = Airport.objects.get(iata_code=to_code)
        except Airport.DoesNotExist:
            return Response(
                {'error': f'Airport "{to_code}" not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if from_airport.latitude is None or from_airport.longitude is None:
            return Response(
                {'error': f'Airport "{from_code}" is missing coordinate data.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if to_airport.latitude is None or to_airport.longitude is None:
            return Response(
                {'error': f'Airport "{to_code}" is missing coordinate data.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        distance_km = haversine_distance(
            from_airport.latitude, from_airport.longitude,
            to_airport.latitude, to_airport.longitude,
        )
        compensation = calculate_compensation(distance_km)

        return Response({
            'from_airport': from_code,
            'to_airport': to_code,
            'distance_km': round(distance_km, 2),
            'compensation_amount': compensation,
            'source': 'haversine',
        })
```

```python
# backend/airports/urls.py
from django.urls import path
from .views import AirportListView, AirportDistanceView

urlpatterns = [
    path('airports/', AirportListView.as_view(), name='airport-list'),
    path('airports/distance/', AirportDistanceView.as_view(), name='airport-distance'),
]
```

**Verification:**
- Start server: `python manage.py runserver`
- `curl "http://localhost:8000/api/airports/distance/?from=JFK&to=LAX"` — should return distance ~3983 km and compensation 600
- `curl "http://localhost:8000/api/airports/distance/"` — should return 400 error
- `curl "http://localhost:8000/api/airports/distance/?from=ZZZ&to=LAX"` — should return 404

---

### Task 5: Update Case Serializer to Accept Compensation Data

**Files:**
- Modify: `backend/cases/serializers.py`

**Requirements:**
- Add optional `distance_km` and `compensation_amount` fields to `CaseCreateSerializer`
- Persist these values when creating the Case in the `create()` method
- Validate that compensation_amount matches the expected value for the given distance (if both are provided)

**Implementation:**

Add these fields to `CaseCreateSerializer`:

```python
class CaseCreateSerializer(serializers.Serializer):
    flight_itinerary = FlightItinerarySerializer()
    flight_details = FlightDetailsSerializer()
    passenger = PassengerSerializer()
    gdpr_consent = serializers.BooleanField()
    distance_km = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, default=None)
    compensation_amount = serializers.DecimalField(max_digits=8, decimal_places=2, required=False, allow_null=True, default=None)
```

Update the `create()` method — in the `Case.objects.create(...)` call, add:

```python
            case = Case.objects.create(
                reservation_number=flight_details['reservation_number'],
                planned_departure_time=flight_details['planned_departure_time'],
                planned_arrival_time=flight_details['planned_arrival_time'],
                distance_km=validated_data.get('distance_km'),
                compensation_amount=validated_data.get('compensation_amount'),
            )
```

**Verification:**
- Submit a case with `"distance_km": 2000, "compensation_amount": 400` in the JSON payload — should persist
- Submit a case without those fields — should still work (null values)

---

### Task 6: Add Frontend Distance Calculation Service

**Files:**
- Modify: `frontend/src/services/api.ts`

**Requirements:**
- Add `DistanceResult` interface
- Add `calculateDistance(from, to)` function that:
  1. Calls `POST https://airportgap.com/api/airports/distance` with form-encoded `from` and `to`
  2. Parses JSON:API response to extract `data.attributes.kilometers`
  3. Applies compensation thresholds locally
  4. On failure, falls back to `GET /api/airports/distance/?from={from}&to={to}`
- Add `getCompensationAmount(distanceKm)` helper
- Export both functions

**Implementation:**

Add to `frontend/src/services/api.ts`:

```typescript
export interface DistanceResult {
  distance_km: number;
  compensation_amount: number;
  source: 'airportgap' | 'haversine';
}

function getCompensationAmount(distanceKm: number): number {
  if (distanceKm < 1500) return 250;
  if (distanceKm <= 3500) return 400;
  return 600;
}

export async function calculateDistance(from: string, to: string): Promise<DistanceResult> {
  // Try airportgap.com directly
  try {
    const formData = new URLSearchParams();
    formData.append('from', from);
    formData.append('to', to);

    const response = await fetch('https://airportgap.com/api/airports/distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    if (response.ok) {
      const json = await response.json();
      const kilometers: number = json.data.attributes.kilometers;
      return {
        distance_km: Math.round(kilometers * 100) / 100,
        compensation_amount: getCompensationAmount(kilometers),
        source: 'airportgap',
      };
    }
  } catch {
    // Fall through to backend fallback
  }

  // Fallback to backend Haversine endpoint
  const fallbackResponse = await fetch(
    `/api/airports/distance/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );

  if (!fallbackResponse.ok) {
    throw new Error('Unable to calculate distance');
  }

  const fallbackData = await fallbackResponse.json();
  return {
    distance_km: fallbackData.distance_km,
    compensation_amount: fallbackData.compensation_amount,
    source: 'haversine',
  };
}
```

**Verification:**
- Import and call `calculateDistance('JFK', 'LAX')` from browser console or test — should return a result with distance ~3983 km

---

### Task 7: Update Frontend Types for Compensation Data

**Files:**
- Modify: `frontend/src/components/CaseWizard/types.ts`

**Requirements:**
- Add `CompensationData` interface
- Add `compensation` field to `CaseFormData`
- Update `INITIAL_FORM_DATA` with default compensation values

**Implementation:**

Add interface after `DocumentsData`:

```typescript
export interface CompensationData {
  distance_km: number | null;
  compensation_amount: number | null;
}
```

Update `CaseFormData`:

```typescript
export interface CaseFormData {
  flightItinerary: FlightItineraryData;
  emailGdpr: EmailGdprData;
  flightDetails: FlightDetailsData;
  passenger: PassengerData;
  documents: DocumentsData;
  compensation: CompensationData;
}
```

Update `INITIAL_FORM_DATA`:

```typescript
export const INITIAL_FORM_DATA: CaseFormData = {
  flightItinerary: {
    departure_airport: '',
    destination_airport: '',
    connecting_flights: [],
    problem_flight_index: null,
  },
  emailGdpr: {
    email: '',
    gdpr_consent: false,
  },
  flightDetails: {
    reservation_number: '',
    planned_departure_time: '',
    planned_arrival_time: '',
    flights: [],
  },
  passenger: {
    first_name: '',
    last_name: '',
    date_of_birth: '',
    email: '',
    phone_number: '',
    address: '',
    postal_code: '',
  },
  documents: {
    boarding_pass: null,
    identity_document: null,
  },
  compensation: {
    distance_km: null,
    compensation_amount: null,
  },
};
```

**Verification:**
- TypeScript compiles without errors (`npx tsc --noEmit`)

---

### Task 8: Update FlightItinerary Step to Display Compensation

**Files:**
- Modify: `frontend/src/components/CaseWizard/steps/FlightItinerary.tsx`

**Requirements:**
- Accept `compensation` data and `onCompensationChange` callback in props
- When both `departure_airport` and `destination_airport` are set, call `calculateDistance()`
- Show loading state while calculating
- Display "Distance: X km | Compensation: €Y" below airport selectors
- Show error message if both primary and fallback fail (non-blocking)
- Recalculate when either airport changes

**Implementation:**

Update the Props interface and component:

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import type { FlightItineraryData, AirportOption, CompensationData } from '../types';
import { searchAirports, calculateDistance } from '../../../services/api';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: FlightItineraryData;
  onChange: (data: FlightItineraryData) => void;
  errors: FieldErrors;
  compensation: CompensationData;
  onCompensationChange: (data: CompensationData) => void;
}
```

Add a `useEffect` inside the `FlightItinerary` component to trigger distance calculation:

```typescript
export const FlightItinerary: React.FC<Props> = ({ data, onChange, errors, compensation, onCompensationChange }) => {
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState<string | null>(null);

  useEffect(() => {
    if (data.departure_airport && data.destination_airport) {
      setDistanceLoading(true);
      setDistanceError(null);
      calculateDistance(data.departure_airport, data.destination_airport)
        .then((result) => {
          onCompensationChange({
            distance_km: result.distance_km,
            compensation_amount: result.compensation_amount,
          });
        })
        .catch(() => {
          setDistanceError('Unable to calculate distance. You can still proceed.');
          onCompensationChange({ distance_km: null, compensation_amount: null });
        })
        .finally(() => setDistanceLoading(false));
    } else {
      onCompensationChange({ distance_km: null, compensation_amount: null });
    }
  }, [data.departure_airport, data.destination_airport]);
```

Add display section after the destination airport autocomplete and before the connecting flights section:

```tsx
      {/* Compensation display */}
      {distanceLoading && (
        <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#f0f9ff', borderRadius: '4px', color: '#1e40af' }}>
          Calculating distance...
        </div>
      )}
      {!distanceLoading && compensation.distance_km !== null && (
        <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '4px' }}>
          <strong>Distance:</strong> {compensation.distance_km.toLocaleString()} km | <strong>Compensation:</strong> €{compensation.compensation_amount}
        </div>
      )}
      {!distanceLoading && distanceError && (
        <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', color: '#92400e' }}>
          {distanceError}
        </div>
      )}
```

**Verification:**
- Select two airports in the FlightItinerary step — compensation display should appear
- Change one airport — should recalculate
- With backend down and airportgap.com blocked — should show error message

---

### Task 9: Update CaseGeneration Step to Display Compensation

**Files:**
- Modify: `frontend/src/components/CaseWizard/steps/CaseGeneration.tsx`

**Requirements:**
- Display distance and compensation amount in the case summary
- Handle null values gracefully (show "Not calculated" if missing)

**Implementation:**

Add a section after the Flight Itinerary section in the `CaseGeneration` component:

```tsx
      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Compensation</h3>
        {formData.compensation.distance_km !== null ? (
          <>
            <p><strong>Distance:</strong> {formData.compensation.distance_km.toLocaleString()} km</p>
            <p><strong>Compensation Amount:</strong> €{formData.compensation.compensation_amount}</p>
          </>
        ) : (
          <p style={{ color: '#6b7280' }}>Distance not calculated</p>
        )}
      </section>
```

**Verification:**
- Navigate to the final step with compensation calculated — should show distance and amount
- Navigate to final step without compensation — should show "Distance not calculated"

---

### Task 10: Wire Up CaseWizard and Submission Payload

**Files:**
- Modify: `frontend/src/components/CaseWizard/CaseWizard.tsx`
- Modify: `frontend/src/services/api.ts` (the `submitCase` function)

**Requirements:**
- Pass `compensation` and `onCompensationChange` props to FlightItinerary step
- Include `distance_km` and `compensation_amount` in the submission payload

**Implementation:**

In `CaseWizard.tsx`, update the FlightItinerary step rendering to pass compensation props:

```tsx
      {currentStep === 0 && (
        <FlightItinerary
          data={formData.flightItinerary}
          onChange={(itinerary) => setFormData(prev => ({ ...prev, flightItinerary: itinerary }))}
          errors={errors}
          compensation={formData.compensation}
          onCompensationChange={(comp) => setFormData(prev => ({ ...prev, compensation: comp }))}
        />
      )}
```

In `api.ts`, update the `submitCase` function to include compensation in the payload:

```typescript
export async function submitCase(formData: CaseFormData): Promise<CaseResponse> {
  const payload = {
    flight_itinerary: formData.flightItinerary,
    flight_details: {
      reservation_number: formData.flightDetails.reservation_number,
      planned_departure_time: toISODateTime(formData.flightDetails.planned_departure_time),
      planned_arrival_time: toISODateTime(formData.flightDetails.planned_arrival_time),
      flights: formData.flightDetails.flights,
    },
    passenger: {
      ...formData.passenger,
      email: formData.emailGdpr.email,
    },
    gdpr_consent: formData.emailGdpr.gdpr_consent,
    distance_km: formData.compensation.distance_km,
    compensation_amount: formData.compensation.compensation_amount,
  };

  // ... rest unchanged
```

**Verification:**
- Complete the wizard with airports selected — network tab should show `distance_km` and `compensation_amount` in the POST payload
- Backend should persist the values (check via Django admin or database)
