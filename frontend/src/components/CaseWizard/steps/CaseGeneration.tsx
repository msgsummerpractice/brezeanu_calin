import React from 'react';
import type { CaseFormData } from '../types';

interface Props {
  formData: CaseFormData;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export const CaseGeneration: React.FC<Props> = ({ formData, onSubmit, isSubmitting, submitError }) => {
  const { flightItinerary, emailGdpr, flightDetails, passenger, documents, compensation, disruption } = formData;

  const disruptionTypeLabels: Record<string, string> = {
    CANCELLATION: 'Cancellation',
    DELAY: 'Delay',
    DENIED_BOARDING: 'Denied Boarding',
  };

  const disruptionDetailLabels: Record<string, string> = {
    MORE_THAN_14_DAYS: 'More than 14 days',
    LESS_THAN_14_DAYS: 'Less than 14 days',
    ON_FLIGHT_DAY: 'On the flight day',
    LESS_THAN_3H: 'Less than 3 hours',
    MORE_THAN_3H: 'More than 3 hours',
    CONNECTION_LOST: 'Connection flight lost',
    OVERBOOKED: 'Flight overbooked',
    AGGRESSIVE: 'Aggressive behavior with staff',
    INTOXICATION: 'Intoxication',
    UNSPECIFIED: 'Unspecified reason',
    YES: 'Yes',
    NO: 'No',
    DONT_KNOW: "I don't know",
    TECHNICAL: 'Technical problem',
    METEOROLOGICAL: 'Meteorological conditions',
    STRIKE: 'Strike',
    AIRPORT_PROBLEMS: 'Problems with airport',
    CREW_PROBLEMS: 'Crew problems',
    OTHER: 'Other motives',
  };

  const sectionStyle = {
    marginBottom: '1rem',
    padding: '1.25rem 1.5rem',
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  const sectionTitleStyle = {
    fontSize: '0.75rem',
    fontWeight: 700 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#6366f1',
    marginBottom: '0.75rem',
  };

  return (
    <div>
      <h2>Review & Submit</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Please review your information below before submitting your claim.
      </p>

      {/* Compensation highlight */}
      {compensation.distance_km !== null && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
          border: '1px solid #6ee7b7',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.12)',
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46', marginBottom: '0.75rem', fontWeight: 700 }}>
            💰 Your Compensation
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#065f46', marginBottom: '0.2rem' }}>Distance</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>{compensation.distance_km.toLocaleString()} km</div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 600 }}>Amount</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669' }}>€{compensation.compensation_amount}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>✈️ Flight Itinerary</div>
          <p style={{ color: '#334155' }}>
            <strong>{flightItinerary.departure_airport}</strong>
            <span style={{ margin: '0 0.5rem', color: '#94a3b8' }}>→</span>
            <strong>{flightItinerary.destination_airport}</strong>
          </p>
          {flightItinerary.connecting_flights.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              {flightItinerary.connecting_flights.map((conn, idx) => (
                <span key={idx} style={{
                  display: 'inline-block',
                  background: idx === flightItinerary.problem_flight_index ? '#fef2f2' : '#f1f5f9',
                  border: idx === flightItinerary.problem_flight_index ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.8rem',
                  marginRight: '0.4rem',
                  marginTop: '0.3rem',
                  color: idx === flightItinerary.problem_flight_index ? '#dc2626' : '#475569',
                  fontWeight: 500,
                }}>
                  {conn.departure_airport} → {conn.arrival_airport}
                  {idx === flightItinerary.problem_flight_index && ' ⚠️'}
                </span>
              ))}
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>🎫 Flight Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#475569', fontSize: '0.9rem' }}>
            <p><strong>Reservation:</strong> {flightDetails.reservation_number}</p>
            <p><strong>Departure:</strong> {flightDetails.planned_departure_time?.replace('T', ' ')}</p>
            <p><strong>Arrival:</strong> {flightDetails.planned_arrival_time?.replace('T', ' ')}</p>
          </div>
          {flightDetails.flights.map((flight, idx) => (
            <div key={idx} style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)',
              borderRadius: '8px',
              padding: '0.3rem 0.75rem',
              fontSize: '0.8rem',
              marginTop: '0.5rem',
              marginRight: '0.4rem',
              color: '#4338ca',
              fontWeight: 500,
            }}>
              {flight.flight_number} • {flight.airline} • {flight.flight_date}
            </div>
          ))}
        </div>

        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>👤 Passenger</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', color: '#475569', fontSize: '0.9rem' }}>
            <p><strong>Name:</strong> {passenger.first_name} {passenger.last_name}</p>
            <p><strong>DOB:</strong> {passenger.date_of_birth}</p>
            <p><strong>Email:</strong> {emailGdpr.email}</p>
            <p><strong>Phone:</strong> {passenger.phone_number}</p>
            <p style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {passenger.address}, {passenger.postal_code}</p>
          </div>
        </div>

        {disruption.disruption_type && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>⚠️ Disruption Information</div>
            <div style={{ color: '#475569', fontSize: '0.9rem' }}>
              <p><strong>Type:</strong> {disruptionTypeLabels[disruption.disruption_type] || disruption.disruption_type}</p>
              {disruption.cancellation_notice_period && (
                <p><strong>Notice period:</strong> {disruptionDetailLabels[disruption.cancellation_notice_period]}</p>
              )}
              {disruption.delay_arrival && (
                <p><strong>Arrival delay:</strong> {disruptionDetailLabels[disruption.delay_arrival]}</p>
              )}
              {disruption.denied_boarding_voluntary !== null && (
                <p><strong>Voluntary:</strong> {disruption.denied_boarding_voluntary ? 'Yes' : 'No'}</p>
              )}
              {disruption.denied_boarding_reason && (
                <p><strong>Reason:</strong> {disruptionDetailLabels[disruption.denied_boarding_reason]}</p>
              )}
              {disruption.airline_mentioned_motive && (
                <p><strong>Airline mentioned motive:</strong> {disruptionDetailLabels[disruption.airline_mentioned_motive]}</p>
              )}
              {disruption.airline_motive && (
                <p><strong>Airline motive:</strong> {disruptionDetailLabels[disruption.airline_motive]}</p>
              )}
              {disruption.incident_description && (
                <p style={{ marginTop: '0.5rem' }}><strong>Description:</strong> {disruption.incident_description}</p>
              )}
            </div>
          </div>
        )}

        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <div style={sectionTitleStyle}>📎 Documents & Consent</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#475569' }}>
            <span style={{
              background: documents.boarding_pass ? '#ecfdf5' : '#fef2f2',
              border: documents.boarding_pass ? '1px solid #a7f3d0' : '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.3rem 0.7rem',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}>
              {documents.boarding_pass ? '✓' : '✗'} Boarding Pass
            </span>
            <span style={{
              background: documents.identity_document ? '#ecfdf5' : '#fef2f2',
              border: documents.identity_document ? '1px solid #a7f3d0' : '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.3rem 0.7rem',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}>
              {documents.identity_document ? '✓' : '✗'} ID Document
            </span>
            <span style={{
              background: emailGdpr.gdpr_consent ? '#ecfdf5' : '#fef2f2',
              border: emailGdpr.gdpr_consent ? '1px solid #a7f3d0' : '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.3rem 0.7rem',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}>
              {emailGdpr.gdpr_consent ? '✓' : '✗'} GDPR Consent
            </span>
          </div>
        </div>
      </div>

      {submitError && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          border: '1px solid #fecaca',
          padding: '1.25rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
        }}>
          <strong style={{ color: '#dc2626', fontSize: '0.9rem' }}>⚠️ Submission Error</strong>
          <pre style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap', color: '#7f1d1d', marginTop: '0.5rem' }}>{submitError}</pre>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '1rem',
          background: isSubmitting
            ? '#94a3b8'
            : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '14px',
          fontSize: '1.05rem',
          fontWeight: 700,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          boxShadow: isSubmitting ? 'none' : '0 6px 20px rgba(99, 102, 241, 0.35)',
          transition: 'all 200ms ease',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.01em',
        }}
      >
        {isSubmitting ? '⟳ Submitting...' : '🚀 Submit Compensation Claim'}
      </button>
    </div>
  );
};
