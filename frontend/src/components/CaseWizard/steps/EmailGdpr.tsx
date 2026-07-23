import React from 'react';
import type { EmailGdprData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: EmailGdprData;
  onChange: (data: EmailGdprData) => void;
  errors: FieldErrors;
}

const GDPR_TEXT = `
Data Protection Policy

We collect and process your personal data solely for the purpose of handling your flight compensation claim. This includes:

- Personal identification information (name, date of birth, contact details)
- Flight and travel information
- Supporting documents (boarding pass, identification)

Your data will be:
- Processed in accordance with GDPR (EU Regulation 2016/679)
- Stored securely and accessed only by authorized personnel
- Retained only for the duration necessary to process your claim
- Not shared with third parties without your explicit consent, except as required by law

You have the right to:
- Access your personal data
- Request rectification or erasure of your data
- Object to or restrict processing
- Data portability
- Lodge a complaint with a supervisory authority

By providing your consent below, you agree to the processing of your personal data as described above for the purpose of handling your flight compensation claim.
`.trim();

export const EmailGdpr: React.FC<Props> = ({ data, onChange, errors }) => {
  return (
    <div>
      <h2>Email & GDPR</h2>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>We need your email and consent to process your claim.</p>

      <div style={{
        marginBottom: '1.5rem',
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📧</span> Email Address
        </label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="your.email@example.com"
          style={{
            border: errors.email ? '2px solid #fb7185' : undefined,
            background: errors.email ? '#fff1f2' : undefined,
          }}
        />
        {errors.email && <div className="field-error">⚠ {errors.email}</div>}
      </div>

      <div style={{
        marginBottom: '1.5rem',
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span>🛡️</span> GDPR Data Protection Policy
        </label>
        <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'white',
            whiteSpace: 'pre-wrap',
            fontSize: '0.85rem',
            lineHeight: '1.7',
            color: '#475569',
          }}
        >
          {GDPR_TEXT}
        </div>
      </div>

      <div style={{
        padding: '1.25rem 1.5rem',
        background: data.gdpr_consent
          ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          : '#f8fafc',
        borderRadius: '16px',
        border: data.gdpr_consent ? '2px solid #34d399' : '2px solid #e2e8f0',
        transition: 'all 200ms ease',
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontWeight: 500,
          color: data.gdpr_consent ? '#065f46' : '#475569',
          margin: 0,
        }}>
          <input
            type="checkbox"
            checked={data.gdpr_consent}
            onChange={(e) => onChange({ ...data, gdpr_consent: e.target.checked })}
          />
          I agree to the processing of my personal data as described above
        </label>
        {errors.gdpr_consent && <div className="field-error" style={{ marginTop: '0.5rem' }}>⚠ {errors.gdpr_consent}</div>}
      </div>
    </div>
  );
};
