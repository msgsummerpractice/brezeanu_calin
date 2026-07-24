import { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { getCases, deleteCase, AdminCase } from '../../services/api';

export function CaseList() {
  const { token } = useAuth();
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<AdminCase | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const fetchCases = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getCases(token);
      setCases(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, [token]);

  const handleDelete = async () => {
    if (!token || !deleteConfirm) return;
    try {
      await deleteCase(token, deleteConfirm.id);
      setDeleteConfirm(null);
      setDeleteSuccess(`Case ${deleteConfirm.id.slice(0, 8)}... has been deleted successfully.`);
      fetchCases();
      setTimeout(() => setDeleteSuccess(null), 5000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading cases...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <h2 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Case Management</h2>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      {deleteSuccess && (
        <div role="status" aria-live="polite" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#4ade80', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{deleteSuccess}</span>
          <button aria-label="Close" onClick={() => setDeleteSuccess(null)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}>×</button>
        </div>
      )}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Case Date</th>
              <th style={thStyle}>Flight Number</th>
              <th style={thStyle}>Flight Date</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                <td style={tdStyle}>
                  <span style={{ color: '#818cf8', cursor: 'pointer', textDecoration: 'underline' }} title={c.id}>
                    {c.id.slice(0, 8)}...
                  </span>
                </td>
                <td style={tdStyle}>{c.case_date}</td>
                <td style={tdStyle}>{c.flight_number}</td>
                <td style={tdStyle}>{c.flight_date}</td>
                <td style={tdStyle}>
                  <span style={{ ...statusBadge, background: statusColor(c.status) }}>{c.status}</span>
                </td>
                <td style={tdStyle}>
                  <button onClick={() => setDeleteConfirm(c)} style={{ ...actionBtn, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>Delete</button>
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8' }}>No cases found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Confirm Delete</h3>
            <p style={{ color: '#94a3b8' }}>Are you sure you want to delete case <strong>{deleteConfirm.id.slice(0, 8)}...</strong>?</p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>This will permanently remove the case and all associated data (flights, passenger info, documents).</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...actionBtn, padding: '0.5rem 1.25rem' }}>Cancel</button>
              <button onClick={handleDelete} style={{ ...actionBtn, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '0.5rem 1.25rem' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', color: '#e2e8f0', fontSize: '0.9rem' };
const actionBtn: React.CSSProperties = { background: 'none', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: '#1e293b', borderRadius: '12px', padding: '2rem', minWidth: '400px', border: '1px solid rgba(99,102,241,0.2)' };
const statusBadge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 };

function statusColor(status: string): string {
  if (status === 'NEW') return 'rgba(99,102,241,0.2)';
  if (status === 'VALID') return 'rgba(74,222,128,0.2)';
  if (status === 'ASSIGNED') return 'rgba(245,158,11,0.2)';
  if (status === 'INVALID') return 'rgba(239,68,68,0.2)';
  return 'rgba(99,102,241,0.2)';
}
