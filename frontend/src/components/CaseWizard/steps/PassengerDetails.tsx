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
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Tell us about yourself and upload your documents.</p>

      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span>👤</span> Personal Information
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>First Name</label>
            <input
              type="text"
              value={data.first_name}
              onChange={(e) => onChangePassenger({ ...data, first_name: e.target.value })}
              placeholder="John"
              style={{
                border: errors.first_name ? '2px solid #fb7185' : undefined,
                background: errors.first_name ? '#fff1f2' : undefined,
              }}
            />
            {errors.first_name && <div className="field-error">⚠ {errors.first_name}</div>}
          </div>
          <div>
            <label>Last Name</label>
            <input
              type="text"
              value={data.last_name}
              onChange={(e) => onChangePassenger({ ...data, last_name: e.target.value })}
              placeholder="Doe"
              style={{
                border: errors.last_name ? '2px solid #fb7185' : undefined,
                background: errors.last_name ? '#fff1f2' : undefined,
              }}
            />
            {errors.last_name && <div className="field-error">⚠ {errors.last_name}</div>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label>Date of Birth</label>
            <input
              type="date"
              value={data.date_of_birth}
              onChange={(e) => onChangePassenger({ ...data, date_of_birth: e.target.value })}
              style={{
                border: errors.date_of_birth ? '2px solid #fb7185' : undefined,
                background: errors.date_of_birth ? '#fff1f2' : undefined,
              }}
            />
            {errors.date_of_birth && <div className="field-error">⚠ {errors.date_of_birth}</div>}
          </div>
          <div>
            <label>Phone Number</label>
            <input
              type="tel"
              value={data.phone_number}
              onChange={(e) => onChangePassenger({ ...data, phone_number: e.target.value })}
              placeholder="+31612345678"
              style={{
                border: errors.phone_number ? '2px solid #fb7185' : undefined,
                background: errors.phone_number ? '#fff1f2' : undefined,
              }}
            />
            {errors.phone_number && <div className="field-error">⚠ {errors.phone_number}</div>}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Address</label>
          <input
            type="text"
            value={data.address}
            onChange={(e) => onChangePassenger({ ...data, address: e.target.value })}
            placeholder="123 Main Street, City"
            style={{
              border: errors.address ? '2px solid #fb7185' : undefined,
              background: errors.address ? '#fff1f2' : undefined,
            }}
          />
          {errors.address && <div className="field-error">⚠ {errors.address}</div>}
        </div>

        <div>
          <label>Postal Code</label>
          <input
            type="text"
            value={data.postal_code}
            onChange={(e) => onChangePassenger({ ...data, postal_code: e.target.value })}
            placeholder="12345"
            style={{
              border: errors.postal_code ? '2px solid #fb7185' : undefined,
              background: errors.postal_code ? '#fff1f2' : undefined,
            }}
          />
          {errors.postal_code && <div className="field-error">⚠ {errors.postal_code}</div>}
        </div>
      </div>

      <div style={{
        padding: '1.5rem',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span>📎</span> Documents
        </h3>

        <div style={{
          marginBottom: '1.25rem',
          padding: '1.25rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <label style={{ marginBottom: '0.5rem' }}>Boarding Pass <span style={{ color: '#94a3b8', fontWeight: 400 }}>(PDF, JPG, PNG — max 5MB)</span></label>
          {documents.boarding_pass ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              borderRadius: '10px',
              border: '1px solid #a7f3d0',
            }}>
              <span style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: 500 }}>
                ✓ {documents.boarding_pass.name} ({formatFileSize(documents.boarding_pass.size)})
              </span>
              <button type="button" onClick={() => onChangeDocuments({ ...documents, boarding_pass: null })} style={{
                color: '#ef4444',
                background: 'white',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.3rem 0.7rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Remove
              </button>
            </div>
          ) : (
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  onChangeDocuments({ ...documents, boarding_pass: file });
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📄</div>
              <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.85rem' }}>Click to upload boarding pass</div>
            </div>
          )}
          {errors.boarding_pass && <div className="field-error" style={{ marginTop: '0.5rem' }}>⚠ {errors.boarding_pass}</div>}
        </div>

        <div style={{
          padding: '1.25rem',
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <label style={{ marginBottom: '0.5rem' }}>ID Card or Passport <span style={{ color: '#94a3b8', fontWeight: 400 }}>(PDF, JPG, PNG — max 5MB)</span></label>
          {documents.identity_document ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              borderRadius: '10px',
              border: '1px solid #a7f3d0',
            }}>
              <span style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: 500 }}>
                ✓ {documents.identity_document.name} ({formatFileSize(documents.identity_document.size)})
              </span>
              <button type="button" onClick={() => onChangeDocuments({ ...documents, identity_document: null })} style={{
                color: '#ef4444',
                background: 'white',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.3rem 0.7rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                Remove
              </button>
            </div>
          ) : (
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}>
              <input
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  onChangeDocuments({ ...documents, identity_document: file });
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🪪</div>
              <div style={{ color: '#6366f1', fontWeight: 600, fontSize: '0.85rem' }}>Click to upload ID / passport</div>
            </div>
          )}
          {errors.identity_document && <div className="field-error" style={{ marginTop: '0.5rem' }}>⚠ {errors.identity_document}</div>}
        </div>
      </div>
    </div>
  );
};
