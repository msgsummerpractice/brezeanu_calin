import React from 'react';
import type { CaseFormData } from '../types';

interface Props {
  formData: CaseFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export const CaseGeneration: React.FC<Props> = ({ formData, onSubmit, isSubmitting, submitError }) => {
  const { flightItinerary, emailGdpr, flightDetails, passenger, documents } = formData;

  return (
    <div>
      <h2>Review & Submit</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Please review your information below before submitting.
      </p>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Flight Itinerary</h3>
        <p><strong>From:</strong> {flightItinerary.departure_airport} <strong>To:</strong> {flightItinerary.destination_airport}</p>
        {flightItinerary.connecting_flights.length > 0 && (
          <>
            <p><strong>Connecting Flights:</strong></p>
            <ul>
              {flightItinerary.connecting_flights.map((conn, idx) => (
                <li key={idx}>
                  {conn.departure_airport} → {conn.arrival_airport}
                  {idx === flightItinerary.problem_flight_index && <strong> (Disrupted)</strong>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Flight Details</h3>
        <p><strong>Reservation:</strong> {flightDetails.reservation_number}</p>
        <p><strong>Departure:</strong> {flightDetails.planned_departure_time}</p>
        <p><strong>Arrival:</strong> {flightDetails.planned_arrival_time}</p>
        {flightDetails.flights.map((flight, idx) => (
          <p key={idx}>
            Segment {idx + 1}: {flight.flight_number} ({flight.airline}) on {flight.flight_date}
          </p>
        ))}
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Passenger</h3>
        <p><strong>Name:</strong> {passenger.first_name} {passenger.last_name}</p>
        <p><strong>DOB:</strong> {passenger.date_of_birth}</p>
        <p><strong>Email:</strong> {emailGdpr.email}</p>
        <p><strong>Phone:</strong> {passenger.phone_number}</p>
        <p><strong>Address:</strong> {passenger.address}, {passenger.postal_code}</p>
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>Documents</h3>
        <p><strong>Boarding Pass:</strong> {documents.boarding_pass?.name || 'Not uploaded'}</p>
        <p><strong>ID/Passport:</strong> {documents.identity_document?.name || 'Not uploaded'}</p>
      </section>

      <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
        <h3>GDPR Consent</h3>
        <p>{emailGdpr.gdpr_consent ? '✓ Consented' : '✗ Not consented'}</p>
      </section>

      {submitError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
          <strong>Submission Error:</strong>
          <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>{submitError}</pre>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          backgroundColor: isSubmitting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Case'}
      </button>
    </div>
  );
};
