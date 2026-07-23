import React from 'react';
import type { FlightDetailsData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: FlightDetailsData;
  onChange: (data: FlightDetailsData) => void;
  errors: FieldErrors;
}

export const FlightDetails: React.FC<Props> = ({ data, onChange, errors }) => {
  const updateFlight = (index: number, field: string, value: string) => {
    const updated = [...data.flights];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, flights: updated });
  };

  return (
    <div>
      <h2>Flight Details</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Provide your booking reference and flight timing information.</p>

      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🎫</span> Reservation Number
        </label>
        <input
          type="text"
          value={data.reservation_number}
          onChange={(e) => onChange({ ...data, reservation_number: e.target.value })}
          placeholder="e.g., ABC123"
          style={{
            border: errors.reservation_number ? '2px solid #fb7185' : undefined,
            background: errors.reservation_number ? '#fff1f2' : undefined,
          }}
        />
        {errors.reservation_number && <div className="field-error">⚠ {errors.reservation_number}</div>}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🕐</span> Planned Departure
          </label>
          <input
            type="datetime-local"
            value={data.planned_departure_time}
            onChange={(e) => onChange({ ...data, planned_departure_time: e.target.value })}
            style={{
              border: errors.planned_departure_time ? '2px solid #fb7185' : undefined,
              background: errors.planned_departure_time ? '#fff1f2' : undefined,
            }}
          />
          {errors.planned_departure_time && <div className="field-error">⚠ {errors.planned_departure_time}</div>}
        </div>
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🕐</span> Planned Arrival
          </label>
          <input
            type="datetime-local"
            value={data.planned_arrival_time}
            onChange={(e) => onChange({ ...data, planned_arrival_time: e.target.value })}
            style={{
              border: errors.planned_arrival_time ? '2px solid #fb7185' : undefined,
              background: errors.planned_arrival_time ? '#fff1f2' : undefined,
            }}
          />
          {errors.planned_arrival_time && <div className="field-error">⚠ {errors.planned_arrival_time}</div>}
        </div>
      </div>

      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>✈️</span> Flight Segments
      </h3>
      {data.flights.map((flight, idx) => (
        <div key={idx} style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1rem',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            padding: '0.2rem 0.75rem',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}>Segment {idx + 1}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Flight Date</label>
              <input
                type="date"
                value={flight.flight_date}
                onChange={(e) => updateFlight(idx, 'flight_date', e.target.value)}
                style={{
                  border: errors[`flight_${idx}_date`] ? '2px solid #fb7185' : undefined,
                  background: errors[`flight_${idx}_date`] ? '#fff1f2' : undefined,
                }}
              />
              {errors[`flight_${idx}_date`] && <div className="field-error">⚠ {errors[`flight_${idx}_date`]}</div>}
            </div>
            <div>
              <label>Flight Number</label>
              <input
                type="text"
                value={flight.flight_number}
                onChange={(e) => updateFlight(idx, 'flight_number', e.target.value.toUpperCase())}
                placeholder="e.g., KL1234"
                style={{
                  border: errors[`flight_${idx}_number`] ? '2px solid #fb7185' : undefined,
                  background: errors[`flight_${idx}_number`] ? '#fff1f2' : undefined,
                }}
              />
              {errors[`flight_${idx}_number`] && <div className="field-error">⚠ {errors[`flight_${idx}_number`]}</div>}
            </div>
            <div>
              <label>Airline</label>
              <input
                type="text"
                value={flight.airline}
                onChange={(e) => updateFlight(idx, 'airline', e.target.value)}
                placeholder="e.g., KLM"
                style={{
                  border: errors[`flight_${idx}_airline`] ? '2px solid #fb7185' : undefined,
                  background: errors[`flight_${idx}_airline`] ? '#fff1f2' : undefined,
                }}
              />
              {errors[`flight_${idx}_airline`] && <div className="field-error">⚠ {errors[`flight_${idx}_airline`]}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
