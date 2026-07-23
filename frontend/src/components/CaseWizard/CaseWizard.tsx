import React, { useState } from 'react';
import { StepIndicator } from './StepIndicator';
import { FlightItinerary } from './steps/FlightItinerary';
import { EmailGdpr } from './steps/EmailGdpr';
import { FlightDetails } from './steps/FlightDetails';
import { PassengerDetails } from './steps/PassengerDetails';
import { CaseGeneration } from './steps/CaseGeneration';
import type { CaseFormData, CaseResponse } from './types';
import { INITIAL_FORM_DATA } from './types';
import {
  validateFlightItinerary,
  validateEmailGdpr,
  validateFlightDetails,
  validatePassengerDetails,
} from '../../utils/validation';
import { submitCase } from '../../services/api';

const STEPS = [
  { label: 'Flight Itinerary' },
  { label: 'Disruption Details', disabled: true },
  { label: 'Disruption Motives', disabled: true },
  { label: 'Email & GDPR' },
  { label: 'Flight Details' },
  { label: 'Passenger Details' },
  { label: 'Case Generation' },
];

// Active step indices (skipping 1, 2 which are disabled)
const ACTIVE_STEPS = [0, 3, 4, 5, 6];

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
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>Case Submitted Successfully!</h2>
        <p>Your case ID: <strong>{submitResult.case_id}</strong></p>
        <p>Status: {submitResult.status}</p>
        <p>Created: {new Date(submitResult.created_at).toLocaleString()}</p>
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
      {renderStep()}
      {!isLastStep && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button
            onClick={handleBack}
            disabled={activeStepIndex === 0}
            style={{ padding: '0.5rem 1.5rem' }}
          >
            Back
          </button>
          <button
            onClick={handleNext}
            style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
