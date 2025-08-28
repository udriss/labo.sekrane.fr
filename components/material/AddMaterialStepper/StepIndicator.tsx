import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { CheckCircle, Category } from '@mui/icons-material';

interface StepIndicatorProps {
  currentStep: number;
  isLoading?: boolean;
}

const steps = [
  { label: 'Catégorie et Preset', icon: Category },
  { label: 'Informations détaillées' },
  { label: 'Finalisation' },
];

export function StepIndicator({ currentStep, isLoading }: StepIndicatorProps) {
  return (
    <Box sx={{ mb: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <React.Fragment key={index}>
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                sx={{
                  opacity: isActive || isCompleted ? 1 : 0.5,
                  transition: 'opacity 0.3s',
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isCompleted
                      ? 'success.main'
                      : isActive
                        ? 'primary.main'
                        : 'grey.300',
                    color: isCompleted || isActive ? 'white' : 'grey.600',
                    mb: 1,
                    transition: 'all 0.3s',
                  }}
                >
                  {isCompleted ? <CheckCircle /> : step.icon ? <step.icon /> : index + 1}
                </Box>
                <Typography
                  variant="caption"
                  textAlign="center"
                  sx={{ maxWidth: 80, fontWeight: isActive ? 'bold' : 'normal' }}
                >
                  {step.label}
                </Typography>
              </Box>
              {index < steps.length - 1 && (
                <Box
                  sx={{
                    flex: 1,
                    height: 2,
                    backgroundColor: index < currentStep ? 'success.main' : 'grey.300',
                    mx: 2,
                    mt: -2,
                    transition: 'background-color 0.3s',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>
      {isLoading && <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  );
}
