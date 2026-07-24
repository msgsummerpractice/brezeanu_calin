import { useState, useEffect } from 'react';
import { useAuth } from '../Auth/AuthContext';
import { getUsers, updateUser, deleteUser, createUser, AdminUser } from '../../services/api';

export function UserList() {
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', role: 'User', reset_password: false });
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ first_name: '', last_name: '', email: '', role: 'Agent' });
  const [createSuccess, setCreateSuccess] = useState<{ email: string; password: string } | null>(null);
  const [createError, setCreateError] = useState('');

  const fetchUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getUsers(token);
      setUsers(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, reset_password: false });
  };

  const handleSave = async () => {
    if (!token || !editingUser) return;
    try {
      await updateUser(token, editingUser.id, editForm);
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteConfirm) return;
    try {
      await deleteUser(token, deleteConfirm.id);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCreate = async () => {
    if (!token) return;
    setCreateError('');
    try {
      const result = await createUser(token, createForm);
      setCreateSuccess({ email: result.email, password: result.generated_password });
      setCreateForm({ first_name: '', last_name: '', email: '', role: 'Agent' });
      fetchUsers();
    } catch (e: any) {
      setCreateError(e.message);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateSuccess(null);
    setCreateError('');
    setCreateForm({ first_name: '', last_name: '', email: '', role: 'Agent' });
  };

  if (loading) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading users...</div>;

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>User Management</h2>
        <button onClick={() => setShowCreateModal(true)} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', borderRadius: '8px', color: '#fff', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
          + New User
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Assigned Cases</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                <td style={tdStyle}>{user.first_name} {user.last_name}</td>
                <td style={tdStyle}>{user.email}</td>
                <td style={tdStyle}>
                  <span style={{ ...roleBadge, background: roleColor(user.role) }}>{user.role}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{user.assigned_case_count}</td>
                <td style={tdStyle}>
                  <button onClick={() => handleEdit(user)} style={actionBtn}>Edit</button>
                  {user.role !== 'Admin' && (
                    <button onClick={() => setDeleteConfirm(user)} style={{ ...actionBtn, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Edit User</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input style={inputStyle} value={editForm.first_name} onChange={e => setEditForm({ ...editForm, first_name: e.target.value })} placeholder="First Name" />
              <input style={inputStyle} value={editForm.last_name} onChange={e => setEditForm({ ...editForm, last_name: e.target.value })} placeholder="Last Name" />
              <input style={inputStyle} value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
              <select style={inputStyle} value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Agent">Agent</option>
                <option value="User">User</option>
              </select>
              <label style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" checked={editForm.reset_password} onChange={e => setEditForm({ ...editForm, reset_password: e.target.checked })} />
                Reset password (user must change on next login)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingUser(null)} style={{ ...actionBtn, padding: '0.5rem 1.25rem' }}>Cancel</button>
              <button onClick={handleSave} style={{ ...actionBtn, background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '0.5rem 1.25rem' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={overlay}>
          <div style={modal}>
            <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Confirm Delete</h3>
            <p style={{ color: '#94a3b8' }}>Are you sure you want to delete <strong>{deleteConfirm.first_name} {deleteConfirm.last_name}</strong> ({deleteConfirm.email})?</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ ...actionBtn, padding: '0.5rem 1.25rem' }}>Cancel</button>
              <button onClick={handleDelete} style={{ ...actionBtn, background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '0.5rem 1.25rem' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={overlay}>
          <div style={modal}>
            {createSuccess ? (
              <>
                <h3 style={{ color: '#4ade80', marginBottom: '1rem' }}>✓ Account Created Successfully</h3>
                <p style={{ color: '#94a3b8', marginBottom: '0.75rem' }}>
                  The colleague account has been created. Share the credentials below:
                </p>
                <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                  <p style={{ color: '#e2e8f0', margin: '0 0 0.5rem' }}><strong>Email:</strong> {createSuccess.email}</p>
                  <p style={{ color: '#e2e8f0', margin: 0 }}><strong>Password:</strong> <code style={{ background: 'rgba(99,102,241,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{createSuccess.password}</code></p>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                  The user will be required to change this password on first login.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={closeCreateModal} style={{ ...actionBtn, background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '0.5rem 1.25rem' }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ color: '#e2e8f0', marginBottom: '1rem' }}>Create New User</h3>
                {createError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#f87171', marginBottom: '1rem' }}>{createError}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input style={inputStyle} value={createForm.first_name} onChange={e => setCreateForm({ ...createForm, first_name: e.target.value })} placeholder="First Name" />
                  <input style={inputStyle} value={createForm.last_name} onChange={e => setCreateForm({ ...createForm, last_name: e.target.value })} placeholder="Last Name" />
                  <input style={inputStyle} type="email" value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email" />
                  <select style={inputStyle} value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value })}>
                    <option value="Agent">Agent</option>
                    <option value="User">User</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button onClick={closeCreateModal} style={{ ...actionBtn, padding: '0.5rem 1.25rem' }}>Cancel</button>
                  <button onClick={handleCreate} style={{ ...actionBtn, background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '0.5rem 1.25rem' }}>Create</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '0.75rem 1rem', color: '#e2e8f0', fontSize: '0.9rem' };
const actionBtn: React.CSSProperties = { background: 'none', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '6px', color: '#818cf8', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: '#1e293b', borderRadius: '12px', padding: '2rem', minWidth: '400px', border: '1px solid rgba(99,102,241,0.2)' };
const inputStyle: React.CSSProperties = { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', padding: '0.6rem 0.8rem', color: '#e2e8f0', fontSize: '0.9rem' };
const roleBadge: React.CSSProperties = { padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 };

function roleColor(role: string): string {
  if (role === 'Admin') return 'rgba(239,68,68,0.2)';
  if (role === 'Agent') return 'rgba(245,158,11,0.2)';
  return 'rgba(99,102,241,0.2)';
}
