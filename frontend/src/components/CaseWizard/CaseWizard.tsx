import React, { useState } from 'react';
import { StepIndicator } from './StepIndicator';
import { FlightItinerary } from './steps/FlightItinerary';
import { EmailGdpr } from './steps/EmailGdpr';
import { FlightDetails } from './steps/FlightDetails';
import { DisruptionInfo } from './steps/DisruptionInfo';
import { PassengerDetails } from './steps/PassengerDetails';
import { CaseGeneration } from './steps/CaseGeneration';
import type { CaseFormData, CaseResponse } from './types';
import { INITIAL_FORM_DATA } from './types';
import {
  validateFlightItinerary,
  validateEmailGdpr,
  validateFlightDetails,
  validatePassengerDetails,
  validateDisruption,
} from '../../utils/validation';
import { submitCase } from '../../services/api';

const STEPS = [
  { label: 'Flight Itinerary' },
  { label: 'Disruption Details', disabled: true },
  { label: 'Disruption Motives' },
  { label: 'Email & GDPR' },
  { label: 'Flight Details' },
  { label: 'Passenger Details' },
  { label: 'Case Generation' },
];

// Active step indices (skipping 1 which is disabled)
const ACTIVE_STEPS = [0, 3, 4, 2, 5, 6];

export const CaseWizard: React.FC = () => {
  const [formData, setFormData] = useState<CaseFormData>(INITIAL_FORM_DATA);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitResult, setSubmitResult] = useState<CaseResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = ACTIVE_STEPS[activeStepIndex];

  const validateCurrentStep = (): boolean => {
    let stepErrors: Record<string, string> = {};

    switch (currentStep) {
      case 0:
        stepErrors = validateFlightItinerary(formData.flightItinerary);
        break;
      case 3:
        stepErrors = validateEmailGdpr(formData.emailGdpr);
        break;
      case 4:
        stepErrors = validateFlightDetails(formData.flightDetails);
        break;
      case 2:
        stepErrors = validateDisruption(formData.disruption);
        break;
      case 5:
        stepErrors = validatePassengerDetails(formData.passenger, formData.documents);
        break;
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  };

  const syncFlightSegments = (itinerary: typeof formData.flightItinerary) => {
    const connectingCount = itinerary.connecting_flights.length;
    const segmentCount = connectingCount > 0 ? connectingCount : 1;
    const currentFlights = formData.flightDetails.flights;

    if (currentFlights.length !== segmentCount) {
      const flights = Array.from({ length: segmentCount }, (_, i) => (
        currentFlights[i] || { flight_date: '', flight_number: '', airline: '' }
      ));
      setFormData(prev => ({
        ...prev,
        flightDetails: { ...prev.flightDetails, flights },
      }));
    }
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setErrors({});

    // Sync flight segments when leaving itinerary step
    if (currentStep === 0) {
      syncFlightSegments(formData.flightItinerary);
    }

    setActiveStepIndex(prev => Math.min(prev + 1, ACTIVE_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setActiveStepIndex(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitCase(formData);
      setSubmitResult(result);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && !('message' in err)) {
        setSubmitError(JSON.stringify(err, null, 2));
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitResult) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 2rem' }} className="animate-fade-in-up">
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem',
          boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#065f46' }}>Case Submitted Successfully!</h2>
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #a7f3d0',
          display: 'inline-block',
          textAlign: 'left',
        }}>
          <p style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#065f46' }}>Case ID:</strong> <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.9rem' }}>{submitResult.case_id}</code></p>
          <p style={{ marginBottom: '0.5rem' }}><strong style={{ color: '#065f46' }}>Status:</strong> {submitResult.status}</p>
          <p><strong style={{ color: '#065f46' }}>Created:</strong> {new Date(submitResult.created_at).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <FlightItinerary
            data={formData.flightItinerary}
            onChange={(data) => setFormData(prev => ({ ...prev, flightItinerary: data }))}
            errors={errors}
            compensation={formData.compensation}
            onCompensationChange={(comp) => setFormData(prev => ({ ...prev, compensation: comp }))}
          />
        );
      case 3:
        return (
          <EmailGdpr
            data={formData.emailGdpr}
            onChange={(data) => setFormData(prev => ({ ...prev, emailGdpr: data }))}
            errors={errors}
          />
        );
      case 4:
        return (
          <FlightDetails
            data={formData.flightDetails}
            onChange={(data) => setFormData(prev => ({ ...prev, flightDetails: data }))}
            errors={errors}
          />
        );
      case 2:
        return (
          <DisruptionInfo
            data={formData.disruption}
            onChange={(data) => setFormData(prev => ({ ...prev, disruption: data }))}
            errors={errors}
          />
        );
      case 5:
        return (
          <PassengerDetails
            data={formData.passenger}
            documents={formData.documents}
            onChangePassenger={(data) => setFormData(prev => ({ ...prev, passenger: data }))}
            onChangeDocuments={(data) => setFormData(prev => ({ ...prev, documents: data }))}
            errors={errors}
          />
        );
      case 6:
        return (
          <CaseGeneration
            formData={formData}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = activeStepIndex === ACTIVE_STEPS.length - 1;

  return (
    <div>
      <StepIndicator steps={STEPS} currentStep={currentStep} />
      <div className="animate-fade-in-up" key={currentStep}>
        {renderStep()}
      </div>
      {!isLastStep && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #f1f5f9',
        }}>
          <button
            onClick={handleBack}
            disabled={activeStepIndex === 0}
            style={{
              padding: '0.75rem 1.75rem',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              background: 'white',
              color: activeStepIndex === 0 ? '#cbd5e1' : '#475569',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: activeStepIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 150ms ease',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            style={{
              padding: '0.75rem 2rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              transition: 'all 150ms ease',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
};
