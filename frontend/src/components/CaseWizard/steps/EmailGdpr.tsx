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
      <h2>Email & GDPR Compliance</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Email Address</label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          placeholder="your.email@example.com"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: errors.email ? '1px solid red' : '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
        {errors.email && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</div>}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>GDPR Data Protection Policy</label>
        <div
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e5e7eb',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: '#f9fafb',
            whiteSpace: 'pre-wrap',
            fontSize: '0.85rem',
            marginTop: '0.5rem',
          }}
        >
          {GDPR_TEXT}
        </div>
      </div>

      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={data.gdpr_consent}
            onChange={(e) => onChange({ ...data, gdpr_consent: e.target.checked })}
          />
          I agree to the processing of my personal data as described above
        </label>
        {errors.gdpr_consent && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gdpr_consent}</div>}
      </div>
    </div>
  );
};
