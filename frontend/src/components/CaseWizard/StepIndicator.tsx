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
  return (
    <div style={{ display: 'flex', marginBottom: '2rem', gap: '0.25rem' }}>
      {steps.map((step, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.5rem 0.25rem',
            borderBottom: `3px solid ${
              index === currentStep
                ? '#2563eb'
                : step.disabled
                ? '#d1d5db'
                : index < currentStep
                ? '#10b981'
                : '#e5e7eb'
            }`,
            opacity: step.disabled ? 0.5 : 1,
            fontSize: '0.75rem',
          }}
        >
          <div style={{ fontWeight: index === currentStep ? 'bold' : 'normal' }}>
            {index + 1}. {step.label}
          </div>
        </div>
      ))}
    </div>
  );
};
