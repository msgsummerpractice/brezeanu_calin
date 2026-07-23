import type {
  FlightItineraryData,
  EmailGdprData,
  FlightDetailsData,
  PassengerData,
  DocumentsData,
  DisruptionData,
} from '../components/CaseWizard/types';

export type FieldErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s\-]{7,20}$/;
const FLIGHT_NUMBER_REGEX = /^[A-Z]{2,3}\d{1,4}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export function validateFlightItinerary(data: FlightItineraryData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.departure_airport) {
    errors.departure_airport = 'Departure airport is required.';
  }
  if (!data.destination_airport) {
    errors.destination_airport = 'Destination airport is required.';
  }
  if (data.departure_airport && data.destination_airport && data.departure_airport === data.destination_airport) {
    errors.destination_airport = 'Destination must differ from departure.';
  }
  if (data.connecting_flights.length > 4) {
    errors.connecting_flights = 'Maximum 4 connecting flights allowed.';
  }
  for (let i = 0; i < data.connecting_flights.length; i++) {
    if (!data.connecting_flights[i].departure_airport) {
      errors[`connecting_${i}_departure`] = `Connecting flight ${i + 1}: departure airport required.`;
    }
    if (!data.connecting_flights[i].arrival_airport) {
      errors[`connecting_${i}_arrival`] = `Connecting flight ${i + 1}: arrival airport required.`;
    }
  }
  if (data.connecting_flights.length > 0 && data.problem_flight_index === null) {
    errors.problem_flight_index = 'Select the disrupted connecting flight.';
  }

  return errors;
}

export function validateEmailGdpr(data: EmailGdprData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(data.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!data.gdpr_consent) {
    errors.gdpr_consent = 'GDPR consent is required to proceed.';
  }

  return errors;
}

export function validateFlightDetails(data: FlightDetailsData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.reservation_number) {
    errors.reservation_number = 'Reservation number is required.';
  }
  if (!data.planned_departure_time) {
    errors.planned_departure_time = 'Planned departure time is required.';
  }
  if (!data.planned_arrival_time) {
    errors.planned_arrival_time = 'Planned arrival time is required.';
  }

  for (let i = 0; i < data.flights.length; i++) {
    const flight = data.flights[i];
    if (!flight.flight_date) {
      errors[`flight_${i}_date`] = `Flight ${i + 1}: date is required.`;
    }
    if (!flight.flight_number) {
      errors[`flight_${i}_number`] = `Flight ${i + 1}: flight number is required.`;
    } else if (!FLIGHT_NUMBER_REGEX.test(flight.flight_number)) {
      errors[`flight_${i}_number`] = `Flight ${i + 1}: invalid format (e.g., KL1234).`;
    }
    if (!flight.airline) {
      errors[`flight_${i}_airline`] = `Flight ${i + 1}: airline is required.`;
    }
  }

  return errors;
}

export function validatePassengerDetails(data: PassengerData, documents: DocumentsData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.first_name) errors.first_name = 'First name is required.';
  if (!data.last_name) errors.last_name = 'Last name is required.';
  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required.';
  } else if (new Date(data.date_of_birth) > new Date()) {
    errors.date_of_birth = 'Date of birth cannot be in the future.';
  }
  if (!data.phone_number) {
    errors.phone_number = 'Phone number is required.';
  } else if (!PHONE_REGEX.test(data.phone_number)) {
    errors.phone_number = 'Enter a valid phone number.';
  }
  if (!data.address) errors.address = 'Address is required.';
  if (!data.postal_code) errors.postal_code = 'Postal code is required.';

  // Document validation
  if (!documents.boarding_pass) {
    errors.boarding_pass = 'Boarding pass is required.';
  } else {
    if (documents.boarding_pass.size > MAX_FILE_SIZE) {
      errors.boarding_pass = 'Boarding pass exceeds 5MB limit.';
    }
    if (!ALLOWED_FILE_TYPES.includes(documents.boarding_pass.type)) {
      errors.boarding_pass = 'Boarding pass must be PDF, JPG, or PNG.';
    }
  }

  if (!documents.identity_document) {
    errors.identity_document = 'ID card or passport is required.';
  } else {
    if (documents.identity_document.size > MAX_FILE_SIZE) {
      errors.identity_document = 'Identity document exceeds 5MB limit.';
    }
    if (!ALLOWED_FILE_TYPES.includes(documents.identity_document.type)) {
      errors.identity_document = 'Identity document must be PDF, JPG, or PNG.';
    }
  }

  return errors;
}

export function validateDisruption(data: DisruptionData): FieldErrors {
  const errors: FieldErrors = {};

  if (!data.disruption_type) {
    errors.disruption_type = 'Please select a disruption type.';
  }

  return errors;
}
