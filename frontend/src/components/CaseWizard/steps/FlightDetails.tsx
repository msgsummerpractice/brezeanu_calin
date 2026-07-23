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

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Reservation Number</label>
        <input
          type="text"
          value={data.reservation_number}
          onChange={(e) => onChange({ ...data, reservation_number: e.target.value })}
          placeholder="e.g., ABC123"
          style={{
            width: '100%', padding: '0.5rem',
            border: errors.reservation_number ? '1px solid red' : '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        {errors.reservation_number && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.reservation_number}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label>Planned Departure Time</label>
          <input
            type="datetime-local"
            value={data.planned_departure_time}
            onChange={(e) => onChange({ ...data, planned_departure_time: e.target.value })}
            style={{
              width: '100%', padding: '0.5rem',
              border: errors.planned_departure_time ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {errors.planned_departure_time && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.planned_departure_time}</div>}
        </div>
        <div>
          <label>Planned Arrival Time</label>
          <input
            type="datetime-local"
            value={data.planned_arrival_time}
            onChange={(e) => onChange({ ...data, planned_arrival_time: e.target.value })}
            style={{
              width: '100%', padding: '0.5rem',
              border: errors.planned_arrival_time ? '1px solid red' : '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          {errors.planned_arrival_time && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.planned_arrival_time}</div>}
        </div>
      </div>

      <h3>Flight Segments</h3>
      {data.flights.map((flight, idx) => (
        <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
          <h4>Segment {idx + 1}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label>Flight Date</label>
              <input
                type="date"
                value={flight.flight_date}
                onChange={(e) => updateFlight(idx, 'flight_date', e.target.value)}
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_date`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_date`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_date`]}</div>}
            </div>
            <div>
              <label>Flight Number</label>
              <input
                type="text"
                value={flight.flight_number}
                onChange={(e) => updateFlight(idx, 'flight_number', e.target.value.toUpperCase())}
                placeholder="e.g., KL1234"
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_number`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_number`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_number`]}</div>}
            </div>
            <div>
              <label>Airline</label>
              <input
                type="text"
                value={flight.airline}
                onChange={(e) => updateFlight(idx, 'airline', e.target.value)}
                placeholder="e.g., KLM"
                style={{
                  width: '100%', padding: '0.5rem',
                  border: errors[`flight_${idx}_airline`] ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              {errors[`flight_${idx}_airline`] && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors[`flight_${idx}_airline`]}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
