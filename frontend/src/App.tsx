import { useState } from 'react';
import { CaseWizard } from './components/CaseWizard/CaseWizard';
import { AuthProvider, useAuth } from './components/Auth/AuthContext';
import { Login } from './components/Auth/Login';
import { ChangePassword } from './components/Auth/ChangePassword';
import { UserList } from './components/Admin/UserList';
import { CaseList } from './components/Admin/CaseList';
import { AdminLanding } from './components/Admin/AdminLanding';

function AppContent() {
  const { isAuthenticated, mustChangePassword, logout, user } = useAuth();
  const [page, setPage] = useState<'home' | 'login' | 'change-password' | 'admin' | 'users' | 'cases' | 'system'>('home');

  // If user just logged in and must change password
  if (isAuthenticated && mustChangePassword) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <ChangePassword onSuccess={() => setPage('home')} />
      </div>
    );
  }

  if (page === 'login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <Login onLoginSuccess={() => setPage('home')} />
        <button onClick={() => setPage('home')} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }}>
          ← Back to case submission
        </button>
      </div>
    );
  }

  if (page === 'users' && isAuthenticated && user?.is_staff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setPage('admin')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            ← Admin
          </button>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ width: '100%', maxWidth: '960px', marginTop: '3rem' }}>
          <UserList />
        </div>
      </div>
    );
  }

  if (page === 'cases' && isAuthenticated && user?.is_staff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setPage('admin')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            ← Admin
          </button>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ width: '100%', maxWidth: '960px', marginTop: '3rem' }}>
          <CaseList />
        </div>
      </div>
    );
  }

  if (page === 'system' && isAuthenticated && user?.is_staff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setPage('admin')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            ← Admin
          </button>
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
        <div style={{ width: '100%', maxWidth: '960px', marginTop: '3rem' }}>
          <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>System Settings</h2>
            <div style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>System configuration coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (page === 'admin' && isAuthenticated && user?.is_staff) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setPage('home')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            ← Home
          </button>
        </div>
        <div style={{ width: '100%', maxWidth: '960px', marginTop: '3rem' }}>
          <AdminLanding onNavigate={(key) => {
            if (key === 'new_user') setPage('users');
            else if (key === 'users') setPage('users');
            else if (key === 'cases') setPage('cases');
            else if (key === 'system') setPage('system');
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
    }}>
      {/* Login/Account button */}
      <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
        {isAuthenticated && user?.is_staff && (
          <button onClick={() => setPage('admin')} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', borderRadius: '8px', color: '#fff', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
            Admin
          </button>
        )}
        {isAuthenticated && (
          <button onClick={logout} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Logout
          </button>
        )}
        <button onClick={() => setPage('login')} style={{ background: 'none', border: '1px solid rgba(129,140,248,0.3)', borderRadius: '8px', color: '#818cf8', padding: '0.5rem 1rem', cursor: 'pointer' }}>
          {isAuthenticated ? 'My Account' : 'Login'}
        </button>
      </div>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem',
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}>
            ✈️
          </div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            SkyRefund
          </h1>
        </div>
        <p style={{
          color: 'rgba(203, 213, 225, 0.8)',
          fontSize: '0.95rem',
          fontWeight: 400,
        }}>
          Flight Compensation Claims Made Simple
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '780px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 60px rgba(99, 102, 241, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'fadeInUp 0.5s ease-out 0.1s both',
      }}>
        <CaseWizard />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        color: 'rgba(148, 163, 184, 0.6)',
        fontSize: '0.8rem',
        textAlign: 'center',
      }}>
        Protected by EU Regulation 261/2004
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
