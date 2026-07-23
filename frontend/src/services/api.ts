import type { AirportOption, CaseFormData, CaseResponse } from '../components/CaseWizard/types';

export async function searchAirports(query: string): Promise<AirportOption[]> {
  if (!query || query.length < 2) return [];

  const response = await fetch(`/api/airports/?search=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }
  return response.json();
}

function toISODateTime(value: string): string {
  if (!value) return value;
  // datetime-local gives "2026-07-20T10:00", backend expects ISO with timezone
  if (!value.endsWith('Z') && !value.includes('+')) {
    return value + ':00Z';
  }
  return value;
}

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
  };

  const body = new FormData();
  body.append('data', JSON.stringify(payload));

  if (formData.documents.boarding_pass) {
    body.append('boarding_pass', formData.documents.boarding_pass);
  }
  if (formData.documents.identity_document) {
    body.append('identity_document', formData.documents.identity_document);
  }

  const response = await fetch('/api/cases/', {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const errors = await response.json();
    throw errors;
  }

  return response.json();
}
