'use client';
import React from 'react';
import { Stepper, Step, StepLabel, StepContent, Box } from '@mui/material';

export interface GenericWizardStep {
  key: string;
  label: string;
  required?: boolean;
  valid: boolean; // validity of the step (for required logic)
  content: React.ReactNode;
}

export interface WizardStepperProps {
  steps: GenericWizardStep[];
  activeStep: number;
  onStepChange: (index: number) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  sx?: any;
}

/**
 * Reusable wizard stepper.
 * Design choices:
 *  - Required & NOT valid steps: number circle colored orange (subtle reminder)
 *  - Valid steps rely on MUI default completed icon (blue check inside circle) for proper alignment
 */
export function WizardStepper({
  steps,
  activeStep,
  onStepChange,
  orientation = 'vertical',
  className,
  sx,
}: WizardStepperProps) {
  return (
    <Stepper
      nonLinear
      activeStep={activeStep}
      orientation={orientation}
      className={className}
      sx={{
        '& .wizard-step-required-incomplete .MuiStepIcon-root': { color: 'orange' },
        '& .wizard-step-valid .MuiStepIcon-root.Mui-completed': { color: 'primary.main' },
        ...sx,
      }}
    >
      {steps.map((s, idx) => (
        <Step
          key={s.key}
          completed={s.valid}
          className={
            s.required && !s.valid
              ? 'wizard-step-required-incomplete'
              : s.valid
                ? 'wizard-step-valid'
                : undefined
          }
        >
          <StepLabel onClick={() => onStepChange(idx)} sx={{ cursor: 'pointer' }}>
            {s.label}
          </StepLabel>
          <StepContent>
            <Box>{s.content}</Box>
          </StepContent>
        </Step>
      ))}
    </Stepper>
  );
}

export default WizardStepper;
