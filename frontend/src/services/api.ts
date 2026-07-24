import type { AirportOption, CaseFormData, CaseResponse } from '../components/CaseWizard/types';

export async function searchAirports(query: string): Promise<AirportOption[]> {
  if (!query || query.length < 2) return [];

  const response = await fetch(`/api/airports/?search=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch airports');
  }
  return response.json();
}

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
    distance_km: formData.compensation.distance_km,
    compensation_amount: formData.compensation.compensation_amount,
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

// Auth API

export interface LoginResponse {
  token: string;
  must_change_password: boolean;
  user: { email: string; first_name: string; last_name: string; is_staff: boolean; is_superuser: boolean };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.detail || 'Login failed');
  }
  return response.json();
}

export interface ChangePasswordResponse {
  detail: string;
  token: string;
}

export async function changePassword(
  token: string,
  oldPassword: string,
  newPassword: string
): Promise<ChangePasswordResponse> {
  const response = await fetch('/api/auth/change-password/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.old_password?.[0] || data.new_password?.[0] || 'Password change failed');
  }
  return response.json();
}

// Admin API

export interface AdminUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  assigned_case_count: number;
}

export async function getUsers(token: string): Promise<AdminUser[]> {
  const response = await fetch('/api/admin/users/', {
    headers: { Authorization: `Token ${token}` },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

export async function updateUser(
  token: string,
  id: number,
  data: { first_name: string; last_name: string; email: string; role: string; reset_password?: boolean }
): Promise<AdminUser> {
  const response = await fetch(`/api/admin/users/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.email?.[0] || err.detail || 'Update failed');
  }
  return response.json();
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const response = await fetch(`/api/admin/users/${id}/`, {
    method: 'DELETE',
    headers: { Authorization: `Token ${token}` },
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Delete failed');
  }
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface CreateUserResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  generated_password: string;
}

export async function createUser(token: string, data: CreateUserData): Promise<CreateUserResponse> {
  const response = await fetch('/api/admin/users/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.email?.[0] || err.detail || 'User creation failed');
  }
  return response.json();
}
