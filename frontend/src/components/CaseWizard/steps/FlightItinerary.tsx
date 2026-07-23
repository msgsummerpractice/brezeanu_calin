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

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface AirportAutocompleteProps {
  value: string;
  onChange: (iataCode: string) => void;
  placeholder: string;
  error?: string;
}

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({ value, onChange, placeholder, error }) => {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchAirports(debouncedQuery).then(setOptions).catch(() => setOptions([]));
    } else {
      setOptions([]);
    }
  }, [debouncedQuery]);

  const handleSelect = useCallback((airport: AirportOption) => {
    setQuery(`${airport.iata_code} - ${airport.name}`);
    onChange(airport.iata_code);
    setShowDropdown(false);
  }, [onChange]);

  return (
    <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.75rem 1rem 0.75rem 2.5rem',
          border: error ? '2px solid #fb7185' : '2px solid #e2e8f0',
          borderRadius: '12px',
          fontSize: '0.95rem',
          background: error ? '#fff1f2' : 'white',
          transition: 'all 150ms ease',
          outline: 'none',
        }}
      />
      <span style={{
        position: 'absolute',
        left: '0.85rem',
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: '1.1rem',
        opacity: 0.5,
      }}>✈</span>
      {error && <div className="field-error">⚠ {error}</div>}
      {showDropdown && options.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          listStyle: 'none',
          padding: '0.5rem',
          margin: 0,
          maxHeight: '220px',
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        }}>
          {options.map((airport) => (
            <li
              key={airport.iata_code}
              onMouseDown={() => handleSelect(airport)}
              style={{
                padding: '0.65rem 0.75rem',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'background 100ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.03em',
              }}>{airport.iata_code}</span>
              <span style={{ color: '#334155', fontSize: '0.9rem' }}>{airport.name}, <span style={{ color: '#64748b' }}>{airport.city}</span></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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

  const addConnecting = () => {
    if (data.connecting_flights.length >= 4) return;
    onChange({
      ...data,
      connecting_flights: [...data.connecting_flights, { departure_airport: '', arrival_airport: '' }],
    });
  };

  const removeConnecting = (index: number) => {
    const updated = data.connecting_flights.filter((_, i) => i !== index);
    onChange({
      ...data,
      connecting_flights: updated,
      problem_flight_index: data.problem_flight_index === index ? null : data.problem_flight_index,
    });
  };

  const updateConnecting = (index: number, field: 'departure_airport' | 'arrival_airport', value: string) => {
    const updated = [...data.connecting_flights];
    updated[index] = { ...updated[index], [field]: value };
    onChange({ ...data, connecting_flights: updated });
  };

  return (
    <div>
      <h2>Flight Itinerary</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Enter your departure and destination airports to calculate your compensation.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem',
        marginBottom: '0.5rem',
      }}>
        <div>
          <label>🛫 Departure Airport</label>
          <AirportAutocomplete
            value={data.departure_airport}
            onChange={(val) => onChange({ ...data, departure_airport: val })}
            placeholder="Search departure airport..."
            error={errors.departure_airport}
          />
        </div>
        <div>
          <label>🛬 Destination Airport</label>
          <AirportAutocomplete
            value={data.destination_airport}
            onChange={(val) => onChange({ ...data, destination_airport: val })}
            placeholder="Search destination airport..."
            error={errors.destination_airport}
          />
        </div>
      </div>

      {/* Compensation Result */}
      {distanceLoading && (
        <div style={{
          margin: '1.5rem 0',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
          borderRadius: '16px',
          border: '1px solid #c7d2fe',
          color: '#4338ca',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.95rem',
        }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block', fontSize: '1.2rem' }}>⟳</span>
          Calculating distance & compensation...
        </div>
      )}
      {!distanceLoading && compensation.distance_km !== null && (
        <div style={{
          margin: '1.5rem 0',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)',
          border: '1px solid #6ee7b7',
          borderRadius: '16px',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap' as const,
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46', marginBottom: '0.35rem', fontWeight: 600 }}>Flight Distance</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#047857', letterSpacing: '-0.02em' }}>{compensation.distance_km.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500 }}>km</span></div>
            </div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46', marginBottom: '0.2rem', fontWeight: 600 }}>Your Compensation</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669' }}>€{compensation.compensation_amount}</div>
            </div>
          </div>
        </div>
      )}
      {!distanceLoading && distanceError && (
        <div style={{
          margin: '1.5rem 0',
          padding: '1rem 1.5rem',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fcd34d',
          borderRadius: '16px',
          color: '#92400e',
          fontWeight: 500,
          fontSize: '0.9rem',
        }}>
          ⚠️ {distanceError}
        </div>
      )}

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>🔗</span> Connecting Flights
        </h3>
        {errors.connecting_flights && <div className="field-error">⚠ {errors.connecting_flights}</div>}

        {data.connecting_flights.map((conn, idx) => (
          <div key={idx} style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            marginBottom: '0.75rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ color: '#475569', fontSize: '0.9rem' }}>Connection {idx + 1}</strong>
              <button type="button" onClick={() => removeConnecting(idx)} style={{
                color: '#ef4444',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>✕ Remove</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>From</label>
                <AirportAutocomplete
                  value={conn.departure_airport}
                  onChange={(val) => updateConnecting(idx, 'departure_airport', val)}
                  placeholder="Departure..."
                  error={errors[`connecting_${idx}_departure`]}
                />
              </div>
              <div>
                <label>To</label>
                <AirportAutocomplete
                  value={conn.arrival_airport}
                  onChange={(val) => updateConnecting(idx, 'arrival_airport', val)}
                  placeholder="Arrival..."
                  error={errors[`connecting_${idx}_arrival`]}
                />
              </div>
            </div>
          </div>
        ))}

        {data.connecting_flights.length < 4 && (
          <button type="button" onClick={addConnecting} style={{
            marginTop: '0.5rem',
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: '2px dashed #cbd5e1',
            background: 'transparent',
            color: '#6366f1',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 150ms ease',
          }}>
            + Add Connecting Flight
          </button>
        )}
      </div>

      {data.connecting_flights.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <label>Which connecting flight was disrupted?</label>
          <select
            value={data.problem_flight_index ?? ''}
            onChange={(e) => onChange({ ...data, problem_flight_index: e.target.value ? Number(e.target.value) : null })}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: errors.problem_flight_index ? '2px solid #fb7185' : '2px solid #e2e8f0',
              borderRadius: '12px',
              fontSize: '0.95rem',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">Select the disrupted flight...</option>
            {data.connecting_flights.map((conn, idx) => (
              <option key={idx} value={idx}>
                Connection {idx + 1}: {conn.departure_airport || '?'} → {conn.arrival_airport || '?'}
              </option>
            ))}
          </select>
          {errors.problem_flight_index && <div className="field-error">⚠ {errors.problem_flight_index}</div>}
        </div>
      )}
    </div>
  );
};
