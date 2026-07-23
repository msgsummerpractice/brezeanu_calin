import React from 'react';

interface Step {
  label: string;
  disabled?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  // Only show active steps
  const activeSteps = steps.filter(s => !s.disabled);
  const activeIndices = steps.map((s, i) => s.disabled ? -1 : i).filter(i => i !== -1);
  const currentActiveIndex = activeIndices.indexOf(currentStep);

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Progress bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        padding: '0 0.5rem',
      }}>
        {/* Background track */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '24px',
          right: '24px',
          height: '3px',
          background: '#e2e8f0',
          borderRadius: '2px',
          transform: 'translateY(-50%)',
        }} />
        {/* Active track */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '24px',
          width: `${activeSteps.length > 1 ? (currentActiveIndex / (activeSteps.length - 1)) * (100 - (48 / (780 - 48)) * 100) : 0}%`,
          height: '3px',
          background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: '2px',
          transform: 'translateY(-50%)',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        {activeSteps.map((step, idx) => {
          const isCompleted = idx < currentActiveIndex;
          const isCurrent = idx === currentActiveIndex;
          const isUpcoming = idx > currentActiveIndex;

          return (
            <div key={idx} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 2,
            }}>
              <div style={{
                width: isCurrent ? '44px' : '36px',
                height: isCurrent ? '44px' : '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isCurrent ? '0.9rem' : '0.8rem',
                fontWeight: 700,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isCompleted
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : isCurrent
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'white',
                color: isUpcoming ? '#94a3b8' : 'white',
                border: isUpcoming ? '2px solid #e2e8f0' : 'none',
                boxShadow: isCurrent
                  ? '0 4px 14px rgba(99, 102, 241, 0.4)'
                  : isCompleted
                  ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                  : 'none',
              }}>
                {isCompleted ? '✓' : idx + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step label */}
      <div style={{
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#4f46e5',
        letterSpacing: '0.01em',
      }}>
        {activeSteps[currentActiveIndex]?.label}
      </div>
    </div>
  );
};
