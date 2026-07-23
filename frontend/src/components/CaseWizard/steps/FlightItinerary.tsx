import React, { useState, useEffect, useCallback } from 'react';
import type { FlightItineraryData, AirportOption } from '../types';
import { searchAirports } from '../../../services/api';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: FlightItineraryData;
  onChange: (data: FlightItineraryData) => void;
  errors: FieldErrors;
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
        style={{ width: '100%', padding: '0.5rem', border: error ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
      />
      {error && <div style={{ color: 'red', fontSize: '0.8rem' }}>{error}</div>}
      {showDropdown && options.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: 'white', border: '1px solid #ccc', listStyle: 'none',
          padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto', zIndex: 10
        }}>
          {options.map((airport) => (
            <li
              key={airport.iata_code}
              onMouseDown={() => handleSelect(airport)}
              style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              <strong>{airport.iata_code}</strong> — {airport.name}, {airport.city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const FlightItinerary: React.FC<Props> = ({ data, onChange, errors }) => {
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

      <label>Departure Airport</label>
      <AirportAutocomplete
        value={data.departure_airport}
        onChange={(val) => onChange({ ...data, departure_airport: val })}
        placeholder="Search departure airport..."
        error={errors.departure_airport}
      />

      <label>Destination Airport</label>
      <AirportAutocomplete
        value={data.destination_airport}
        onChange={(val) => onChange({ ...data, destination_airport: val })}
        placeholder="Search destination airport..."
        error={errors.destination_airport}
      />

      <div style={{ marginTop: '1rem' }}>
        <h3>Connecting Flights</h3>
        {errors.connecting_flights && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.connecting_flights}</div>}

        {data.connecting_flights.map((conn, idx) => (
          <div key={idx} style={{ border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '0.5rem', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Connection {idx + 1}</strong>
              <button type="button" onClick={() => removeConnecting(idx)} style={{ color: 'red' }}>Remove</button>
            </div>
            <label>From</label>
            <AirportAutocomplete
              value={conn.departure_airport}
              onChange={(val) => updateConnecting(idx, 'departure_airport', val)}
              placeholder="Departure..."
              error={errors[`connecting_${idx}_departure`]}
            />
            <label>To</label>
            <AirportAutocomplete
              value={conn.arrival_airport}
              onChange={(val) => updateConnecting(idx, 'arrival_airport', val)}
              placeholder="Arrival..."
              error={errors[`connecting_${idx}_arrival`]}
            />
          </div>
        ))}

        {data.connecting_flights.length < 4 && (
          <button type="button" onClick={addConnecting} style={{ marginTop: '0.5rem' }}>
            + Add Connecting Flight
          </button>
        )}
      </div>

      {data.connecting_flights.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <label>Which connecting flight was disrupted?</label>
          <select
            value={data.problem_flight_index ?? ''}
            onChange={(e) => onChange({ ...data, problem_flight_index: e.target.value ? Number(e.target.value) : null })}
            style={{ width: '100%', padding: '0.5rem', border: errors.problem_flight_index ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">Select...</option>
            {data.connecting_flights.map((conn, idx) => (
              <option key={idx} value={idx}>
                Connection {idx + 1}: {conn.departure_airport || '?'} → {conn.arrival_airport || '?'}
              </option>
            ))}
          </select>
          {errors.problem_flight_index && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.problem_flight_index}</div>}
        </div>
      )}
    </div>
  );
};
