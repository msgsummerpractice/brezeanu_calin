# CASE_02 – Calculate Compensation Level Design Spec

**Date:** 2026-07-23  
**Status:** Draft  
**Scope:** Orthodromic distance calculation and compensation level determination  
**Depends on:** CASE_01 (Case Registration)

---

## 1. Overview

As a passenger, I want the system to calculate my compensation level based on the flight distance so that I know how much compensation I am eligible for.

The system calculates the orthodromic (great-circle) distance between the starting and final destination airports. Connecting flights are not considered — only the first departure airport and the last arrival airport are used. The compensation level is determined by EU261 thresholds:

| Distance | Compensation |
|----------|-------------|
| < 1500 km | €250 |
| 1500–3500 km | €400 |
| > 3500 km | €600 |

---

## 2. Architecture

### Flow

1. User selects departure and destination airports in the FlightItinerary wizard step
2. Frontend calls `POST https://airportgap.com/api/airports/distance` directly with the two IATA codes
3. If airportgap.com is unavailable (network error, timeout, non-2xx response), frontend falls back to backend endpoint `GET /api/airports/distance/?from={IATA}&to={IATA}` which uses the Haversine formula with stored lat/lon
4. Frontend applies compensation thresholds and displays distance + compensation amount
5. On case submission, distance and compensation values are included in the payload and persisted with the case record

### Key Decisions

- **Frontend-direct API call** to airportgap.com for primary calculation (Approach 3)
- **Backend fallback** using Haversine formula when external API is unavailable
- **Airport lat/lon stored locally** to support the fallback calculation
- **Compensation values persisted** with the case, not recalculated on read

---

## 3. Database Changes

### 3.1 Airport Model (airports app) — Add Fields

| Field | Type | Constraints |
|-------|------|-------------|
| latitude | DecimalField(9,6) | nullable |
| longitude | DecimalField(9,6) | nullable |

### 3.2 Case Model (cases app) — Add Fields

| Field | Type | Constraints |
|-------|------|-------------|
| distance_km | DecimalField(10,2) | nullable |
| compensation_amount | DecimalField(8,2) | nullable |

Fields are nullable so existing cases remain valid and cases can be submitted if calculation fails entirely.

---

## 4. Backend

### 4.1 Fallback Distance Endpoint

**URL:** `GET /api/airports/distance/`  
**Query Parameters:** `from` (IATA code), `to` (IATA code)  
**Auth:** AllowAny (public endpoint)

**Response (200):**
```json
{
  "from_airport": "OTP",
  "to_airport": "CDG",
  "distance_km": 1869.5,
  "compensation_amount": 400,
  "source": "haversine"
}
```

**Error responses:**
- 400: Missing `from` or `to` parameter
- 404: Airport not found or missing coordinates

**Logic:**
1. Look up both airports by IATA code
2. Validate that both have latitude/longitude values
3. Calculate great-circle distance using Haversine formula
4. Apply compensation thresholds
5. Return result

### 4.2 Haversine Formula

```python
import math

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
```

### 4.3 Compensation Threshold Logic

```python
def calculate_compensation(distance_km):
    if distance_km < 1500:
        return 250
    elif distance_km <= 3500:
        return 400
    else:
        return 600
```

### 4.4 Case Submission Update

The existing `CaseCreateSerializer` accepts optional `distance_km` and `compensation_amount` fields from the frontend and persists them with the case.

### 4.5 Airport Sync Command Update

The `sync_airports` management command is updated to fetch and store latitude/longitude when importing airports from airportgap.com. The API endpoint `GET /api/airports/{iata_code}` returns coordinates in its response.

---

## 5. Frontend

### 5.1 Distance Calculation Service

New function in `services/api.ts`:

```typescript
interface DistanceResult {
  distance_km: number;
  compensation_amount: number;
  source: 'airportgap' | 'haversine';
}

async function calculateDistance(from: string, to: string): Promise<DistanceResult>
```

**Logic:**
1. Call `POST https://airportgap.com/api/airports/distance` with form-encoded body `from={IATA}&to={IATA}`
2. Parse JSON:API response — distance is at `data.attributes.kilometers`
3. Apply compensation thresholds locally
4. If the API call fails (network, timeout, non-2xx, CORS), call backend fallback `GET /api/airports/distance/?from={from}&to={to}`
5. Return `{ distance_km, compensation_amount, source }`

**airportgap.com response format (JSON:API):**
```json
{
  "data": {
    "id": "KIX-NRT",
    "type": "airport_distance",
    "attributes": {
      "from_airport": { "iata": "KIX", ... },
      "to_airport": { "iata": "NRT", ... },
      "kilometers": 476.56,
      "miles": 296.07,
      "nautical_miles": 257.32
    }
  }
}
```

**Note:** The airportgap.com `POST /airports/distance` endpoint does not require authentication. Rate limit is 100 requests/minute per IP. If CORS headers are not present, the browser will block the request and the fallback to the backend Haversine endpoint will be used automatically.

### 5.2 Compensation Thresholds (Frontend)

```typescript
function getCompensationAmount(distanceKm: number): number {
  if (distanceKm < 1500) return 250;
  if (distanceKm <= 3500) return 400;
  return 600;
}
```

### 5.3 FlightItinerary Step Changes

- After both `departure_airport` and `destination_airport` are selected, trigger `calculateDistance()`
- Show loading spinner during calculation
- Display result: "Distance: 1,869 km | Compensation: €400"
- Recalculate when either airport changes
- On error from both primary and fallback: show "Unable to calculate distance" message (non-blocking)

### 5.4 CaseGeneration Step Changes

- Display distance and compensation amount in the case summary section
- Values come from the shared form state (already calculated in FlightItinerary step)

### 5.5 Type Changes

Add to `CaseFormData`:

```typescript
interface CompensationData {
  distance_km: number | null;
  compensation_amount: number | null;
}
```

Add `compensation: CompensationData` to the `CaseFormData` interface.

### 5.6 Submission Payload

Include `distance_km` and `compensation_amount` in the case submission payload so the backend persists them.

---

## 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| airportgap.com unreachable | Fall back to backend Haversine endpoint |
| Backend fallback also fails | Show "Unable to calculate" message; allow submission without compensation data |
| Airport missing coordinates | Backend returns 404; frontend shows "Unable to calculate" |
| Invalid IATA code | Backend returns 404; frontend shows error |

---

## 7. Out of Scope

- Recalculating compensation after case submission
- Admin override of compensation amount
- Currency conversion (always EUR)
- Disruption-based adjustments to compensation (CASE_03)
