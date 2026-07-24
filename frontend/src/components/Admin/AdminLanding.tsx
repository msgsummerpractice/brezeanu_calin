import { useAuth } from '../Auth/AuthContext';

interface AdminLandingProps {
  onNavigate: (page: string) => void;
}

const navItems = [
  {
    key: 'new_user',
    label: 'New User',
    description: 'Create a new colleague account',
    icon: '👤',
    color: '#6366f1',
  },
  {
    key: 'users',
    label: 'User View',
    description: 'Manage all user accounts',
    icon: '👥',
    color: '#f59e0b',
  },
  {
    key: 'cases',
    label: 'Case View',
    description: 'View and manage compensation cases',
    icon: '📁',
    color: '#10b981',
  },
  {
    key: 'system',
    label: 'System View',
    description: 'System settings and configuration',
    icon: '⚙️',
    color: '#8b5cf6',
  },
];

export function AdminLanding({ onNavigate }: AdminLandingProps) {
  const { user, logout } = useAuth();

  return (
    <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ color: '#e2e8f0', fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
            Welcome, {user?.first_name || 'Admin'}. Choose an action below.
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px',
            color: '#f87171',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Logout
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1.25rem',
      }}>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              border: `1px solid rgba(${hexToRgb(item.color)}, 0.3)`,
              borderRadius: '16px',
              padding: '1.5rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 25px rgba(${hexToRgb(item.color)}, 0.15)`;
              (e.currentTarget as HTMLElement).style.borderColor = item.color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLElement).style.borderColor = `rgba(${hexToRgb(item.color)}, 0.3)`;
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `rgba(${hexToRgb(item.color)}, 0.15)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
            }}>
              {item.icon}
            </div>
            <div>
              <h3 style={{ color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                {item.label}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
