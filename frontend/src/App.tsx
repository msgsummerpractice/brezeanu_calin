import { CaseWizard } from './components/CaseWizard/CaseWizard';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem',
    }}>
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

export default App;
