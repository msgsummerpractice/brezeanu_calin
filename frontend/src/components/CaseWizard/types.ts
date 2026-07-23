export interface ConnectingFlight {
  departure_airport: string;
  arrival_airport: string;
}

export interface FlightItineraryData {
  departure_airport: string;
  destination_airport: string;
  connecting_flights: ConnectingFlight[];
  problem_flight_index: number | null;
}

export interface FlightSegment {
  flight_date: string;
  flight_number: string;
  airline: string;
}

export interface FlightDetailsData {
  reservation_number: string;
  planned_departure_time: string;
  planned_arrival_time: string;
  flights: FlightSegment[];
}

export interface PassengerData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  email: string;
  phone_number: string;
  address: string;
  postal_code: string;
}

export interface DocumentsData {
  boarding_pass: File | null;
  identity_document: File | null;
}

export interface EmailGdprData {
  email: string;
  gdpr_consent: boolean;
}

export interface CaseFormData {
  flightItinerary: FlightItineraryData;
  emailGdpr: EmailGdprData;
  flightDetails: FlightDetailsData;
  passenger: PassengerData;
  documents: DocumentsData;
}

export interface AirportOption {
  iata_code: string;
  name: string;
  city: string;
  country: string;
}

export interface CaseResponse {
  case_id: string;
  status: string;
  created_at: string;
}

export interface ValidationErrors {
  [key: string]: string[];
}

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
};
