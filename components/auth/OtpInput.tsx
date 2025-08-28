'use client';
import React, { useRef } from 'react';
import { Box, alpha } from '@mui/material';
import { styled } from '@mui/material/styles';

export default function OtpInput({
  code,
  setCode,
  length = 6,
}: {
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  length?: number;
}) {
  const inputRefs = useRef<HTMLInputElement[]>(
    new Array(length).fill(null) as unknown as HTMLInputElement[],
  );

  const focusInput = (targetIndex: number) => {
    const targetInput = inputRefs.current[targetIndex];
    targetInput?.focus();
  };

  const selectInput = (targetIndex: number) => {
    const targetInput = inputRefs.current[targetIndex];
    targetInput?.select();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
      case ' ':
        event.preventDefault();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (currentIndex > 0) {
          focusInput(currentIndex - 1);
          selectInput(currentIndex - 1);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (currentIndex < length - 1) {
          focusInput(currentIndex + 1);
          selectInput(currentIndex + 1);
        }
        break;
      case 'Delete':
        event.preventDefault();
        setCode((prev: string) => prev.slice(0, currentIndex) + prev.slice(currentIndex + 1));
        break;
      case 'Backspace':
        event.preventDefault();
        if (currentIndex > 0) {
          focusInput(currentIndex - 1);
          selectInput(currentIndex - 1);
        }
        setCode((prev: string) => prev.slice(0, currentIndex) + prev.slice(currentIndex + 1));
        break;
      default:
        break;
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>, currentIndex: number) => {
    const currentValue = event.target.value.replace(/\s+/g, '');
    let indexToEnter = 0;
    while (indexToEnter <= currentIndex) {
      if (inputRefs.current[indexToEnter]?.value && indexToEnter < currentIndex) {
        indexToEnter += 1;
      } else {
        break;
      }
    }
    setCode((prev: string) => {
      const otpArray = prev.split('');
      const lastValue = currentValue[currentValue.length - 1]?.replace(/\D/g, '') ?? '';
      otpArray[indexToEnter] = lastValue;
      return otpArray.join('');
    });
    if (currentValue !== '' && currentIndex < length - 1) {
      focusInput(currentIndex + 1);
    }
  };

  const handleClick = (_event: React.MouseEvent<HTMLInputElement>, currentIndex: number) => {
    selectInput(currentIndex);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>, currentIndex: number) => {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (clipboardData.types.includes('text/plain')) {
      let pastedText = clipboardData.getData('text/plain');
      pastedText = pastedText.substring(0, length).trim();
      let indexToEnter = 0;
      while (indexToEnter <= currentIndex) {
        if (inputRefs.current[indexToEnter]?.value && indexToEnter < currentIndex) {
          indexToEnter += 1;
        } else {
          break;
        }
      }
      const otpArray = code.split('');
      for (let i = indexToEnter; i < length; i += 1) {
        const lastValue = pastedText[i - indexToEnter]?.replace(/\D/g, '') ?? '';
        otpArray[i] = lastValue;
      }
      setCode(otpArray.join(''));
    }
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 48px)', sm: 'repeat(6, 48px)' },
        justifyContent: 'center',
        justifyItems: 'center',
        gap: 1.2,
      }}
    >
      {new Array(length).fill(null).map((_, index) => (
        <InputElement
          key={index}
          aria-label={`Digit ${index + 1} of OTP`}
          value={code[index] ?? ''}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onChange={(event) => handleChange(event, index)}
          onClick={(event) => handleClick(event, index)}
          onPaste={(event) => handlePaste(event, index)}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      ))}
    </Box>
  );
}

const InputElement = styled('input')(({ theme }) => ({
  width: 48,
  height: 56,
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: '1rem',
  fontWeight: 500,
  lineHeight: 1.5,
  padding: '8px 0',
  borderRadius: 8,
  textAlign: 'center' as const,
  color: theme.palette.mode === 'dark' ? '#DAE2ED' : '#1C2025',
  background: theme.palette.mode === 'dark' ? '#0B0F14' : '#fff',
  border: `1px solid ${theme.palette.mode === 'dark' ? '#434D5B' : '#DAE2ED'}`,
  boxShadow: `0 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'}`,
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '&:focus': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.25)}`,
    outline: 0,
  },
  '&:focus-visible': {
    outline: 0,
  },
}));
