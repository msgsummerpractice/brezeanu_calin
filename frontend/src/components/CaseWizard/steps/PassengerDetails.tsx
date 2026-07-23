import React from 'react';
import type { PassengerData, DocumentsData } from '../types';
import type { FieldErrors } from '../../../utils/validation';

interface Props {
  data: PassengerData;
  documents: DocumentsData;
  onChangePassenger: (data: PassengerData) => void;
  onChangeDocuments: (data: DocumentsData) => void;
  errors: FieldErrors;
}

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PassengerDetails: React.FC<Props> = ({
  data,
  documents,
  onChangePassenger,
  onChangeDocuments,
  errors,
}) => {
  return (
    <div>
      <h2>Passenger Details</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>First Name</label>
          <input
            type="text"
            value={data.first_name}
            onChange={(e) => onChangePassenger({ ...data, first_name: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.first_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.first_name && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.first_name}</div>}
        </div>
        <div>
          <label>Last Name</label>
          <input
            type="text"
            value={data.last_name}
            onChange={(e) => onChangePassenger({ ...data, last_name: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.last_name ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.last_name && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.last_name}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label>Date of Birth</label>
          <input
            type="date"
            value={data.date_of_birth}
            onChange={(e) => onChangePassenger({ ...data, date_of_birth: e.target.value })}
            style={{ width: '100%', padding: '0.5rem', border: errors.date_of_birth ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.date_of_birth && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.date_of_birth}</div>}
        </div>
        <div>
          <label>Phone Number</label>
          <input
            type="tel"
            value={data.phone_number}
            onChange={(e) => onChangePassenger({ ...data, phone_number: e.target.value })}
            placeholder="+31612345678"
            style={{ width: '100%', padding: '0.5rem', border: errors.phone_number ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.phone_number && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone_number}</div>}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Address</label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChangePassenger({ ...data, address: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: errors.address ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
        />
        {errors.address && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.address}</div>}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Postal Code</label>
        <input
          type="text"
          value={data.postal_code}
          onChange={(e) => onChangePassenger({ ...data, postal_code: e.target.value })}
          style={{ width: '100%', padding: '0.5rem', border: errors.postal_code ? '1px solid red' : '1px solid #ccc', borderRadius: '4px' }}
        />
        {errors.postal_code && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.postal_code}</div>}
      </div>

      <h3>Documents</h3>

      <div style={{ marginBottom: '1rem' }}>
        <label>Boarding Pass (PDF, JPG, or PNG — max 5MB)</label>
        {documents.boarding_pass ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
            <span>{documents.boarding_pass.name} ({formatFileSize(documents.boarding_pass.size)})</span>
            <button type="button" onClick={() => onChangeDocuments({ ...documents, boarding_pass: null })} style={{ color: 'red' }}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onChangeDocuments({ ...documents, boarding_pass: file });
            }}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        )}
        {errors.boarding_pass && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.boarding_pass}</div>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>ID Card or Passport (PDF, JPG, or PNG — max 5MB)</label>
        {documents.identity_document ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '4px' }}>
            <span>{documents.identity_document.name} ({formatFileSize(documents.identity_document.size)})</span>
            <button type="button" onClick={() => onChangeDocuments({ ...documents, identity_document: null })} style={{ color: 'red' }}>
              Remove
            </button>
          </div>
        ) : (
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              onChangeDocuments({ ...documents, identity_document: file });
            }}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        )}
        {errors.identity_document && <div style={{ color: 'red', fontSize: '0.8rem' }}>{errors.identity_document}</div>}
      </div>
    </div>
  );
};
