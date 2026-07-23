import React from 'react';
import type { DisruptionData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: DisruptionData;
  onChange: (data: DisruptionData) => void;
  errors: FieldErrors;
}

export const DisruptionInfo: React.FC<Props> = ({ data, onChange, errors }) => {
  const handleChange = (field: keyof DisruptionData, value: string | boolean | null) => {
    const updated = { ...data, [field]: value };

    // Reset conditional fields when disruption type changes
    if (field === 'disruption_type') {
      updated.cancellation_notice_period = '';
      updated.delay_arrival = '';
      updated.denied_boarding_voluntary = null;
      updated.denied_boarding_reason = '';
      updated.airline_mentioned_motive = '';
      updated.airline_motive = '';
      updated.incident_description = '';
    }

    // Reset motive if airline_mentioned_motive changes away from YES
    if (field === 'airline_mentioned_motive' && value !== 'YES') {
      updated.airline_motive = '';
    }

    // Reset reason if voluntary changes to Yes
    if (field === 'denied_boarding_voluntary' && value === true) {
      updated.denied_boarding_reason = '';
    }

    onChange(updated);
  };

  const isCancellation = data.disruption_type === 'CANCELLATION';
  const isDelay = data.disruption_type === 'DELAY';
  const isDeniedBoarding = data.disruption_type === 'DENIED_BOARDING';
  const showAirlineMotive = isCancellation || isDelay;

  return (
    <div>
      <h2>Disruption Information</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Tell us about the disruption you experienced.
      </p>

      {/* Disruption Type */}
      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚠️</span> Type of Disruption
        </label>
        <select
          value={data.disruption_type}
          onChange={(e) => handleChange('disruption_type', e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: errors.disruption_type ? '2px solid #fb7185' : '2px solid #e2e8f0',
            background: errors.disruption_type ? '#fff1f2' : 'white',
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            marginTop: '0.5rem',
          }}
        >
          <option value="">Select disruption type...</option>
          <option value="CANCELLATION">Cancellation</option>
          <option value="DELAY">Delay</option>
          <option value="DENIED_BOARDING">Denied Boarding</option>
        </select>
        {errors.disruption_type && <div className="field-error">⚠ {errors.disruption_type}</div>}
      </div>

      {/* Cancellation: Notice Period */}
      {isCancellation && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>How many days before departure did the airline inform you?</label>
          <select
            value={data.cancellation_notice_period}
            onChange={(e) => handleChange('cancellation_notice_period', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="MORE_THAN_14_DAYS">More than 14 days</option>
            <option value="LESS_THAN_14_DAYS">Less than 14 days</option>
            <option value="ON_FLIGHT_DAY">On the flight day</option>
          </select>
        </div>
      )}

      {/* Delay: Arrival */}
      {isDelay && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>How late did you arrive at your final destination?</label>
          <select
            value={data.delay_arrival}
            onChange={(e) => handleChange('delay_arrival', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="LESS_THAN_3H">Less than 3 hours</option>
            <option value="MORE_THAN_3H">More than 3 hours</option>
            <option value="CONNECTION_LOST">Connection flight lost</option>
          </select>
        </div>
      )}

      {/* Denied Boarding: Voluntary */}
      {isDeniedBoarding && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Did you give up your seat voluntarily?</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="denied_boarding_voluntary"
                checked={data.denied_boarding_voluntary === true}
                onChange={() => handleChange('denied_boarding_voluntary', true)}
              />
              Yes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name="denied_boarding_voluntary"
                checked={data.denied_boarding_voluntary === false}
                onChange={() => handleChange('denied_boarding_voluntary', false)}
              />
              No
            </label>
          </div>
        </div>
      )}

      {/* Denied Boarding: Reason (if not voluntary) */}
      {isDeniedBoarding && data.denied_boarding_voluntary === false && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Reason behind denial of boarding</label>
          <select
            value={data.denied_boarding_reason}
            onChange={(e) => handleChange('denied_boarding_reason', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="OVERBOOKED">Flight overbooked</option>
            <option value="AGGRESSIVE">Aggressive behavior with staff</option>
            <option value="INTOXICATION">Intoxication</option>
            <option value="UNSPECIFIED">Unspecified reason</option>
          </select>
        </div>
      )}

      {/* Airline Motive (Delay or Cancellation) */}
      {showAirlineMotive && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Did the airline mention a disruption motive?</label>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { value: 'YES', label: 'Yes' },
              { value: 'NO', label: 'No' },
              { value: 'DONT_KNOW', label: "I don't know" },
            ].map((option) => (
              <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="airline_mentioned_motive"
                  checked={data.airline_mentioned_motive === option.value}
                  onChange={() => handleChange('airline_mentioned_motive', option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Airline Motive Details (if Yes) */}
      {showAirlineMotive && data.airline_mentioned_motive === 'YES' && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>What was the motive communicated by the airline?</label>
          <select
            value={data.airline_motive}
            onChange={(e) => handleChange('airline_motive', e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
            }}
          >
            <option value="">Select...</option>
            <option value="TECHNICAL">Technical problem</option>
            <option value="METEOROLOGICAL">Meteorological conditions</option>
            <option value="STRIKE">Strike</option>
            <option value="AIRPORT_PROBLEMS">Problems with airport</option>
            <option value="CREW_PROBLEMS">Crew problems</option>
            <option value="OTHER">Other motives</option>
          </select>
        </div>
      )}

      {/* Incident Description (all types) */}
      {data.disruption_type && (
        <div style={{
          padding: '1.5rem',
          background: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
        }}>
          <label>Describe in short what happened</label>
          <textarea
            value={data.incident_description}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                handleChange('incident_description', e.target.value);
              }
            }}
            placeholder="Describe the incident..."
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '2px solid #e2e8f0',
              background: 'white',
              fontSize: '0.95rem',
              fontFamily: 'Inter, sans-serif',
              marginTop: '0.5rem',
              resize: 'vertical',
            }}
          />
          <div style={{
            textAlign: 'right',
            fontSize: '0.8rem',
            color: data.incident_description.length >= 450 ? '#f59e0b' : '#94a3b8',
            marginTop: '0.25rem',
          }}>
            {data.incident_description.length}/500
          </div>
        </div>
      )}
    </div>
  );
};
