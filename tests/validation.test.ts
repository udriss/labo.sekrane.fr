import { describe, it, expect } from '@jest/globals';

describe('CAS Number Validation', () => {
  // CAS regex from chemical schema
  const CAS_REGEX = /^\d{2,7}-\d{2}-\d$/;

  const validateCAS = (cas: string): boolean => {
    if (!CAS_REGEX.test(cas)) return false;

    // Calculate check digit
    const digits = cas.replace(/-/g, '');
    const checkDigit = parseInt(digits[digits.length - 1]);

    let sum = 0;
    for (let i = 0; i < digits.length - 1; i++) {
      sum += parseInt(digits[i]) * (digits.length - 1 - i);
    }

    return sum % 10 === checkDigit;
  };

  it('should validate correct CAS numbers', () => {
    const validCAS = [
      '7647-14-5', // NaCl
      '7732-18-5', // H2O
      '64-17-5', // Ethanol
      '67-56-1', // Methanol
      '75-09-2', // Dichloromethane
    ];

    validCAS.forEach((cas) => {
      expect(validateCAS(cas)).toBe(true);
    });
  });

  it('should reject incorrect CAS numbers', () => {
    const invalidCAS = [
      '7647-14-6', // Wrong check digit
      '7647-14', // Missing check digit
      '7647-14-55', // Too many check digits
      'abc-de-f', // Non-numeric
      '12345', // Wrong format
      '', // Empty
    ];

    invalidCAS.forEach((cas) => {
      expect(validateCAS(cas)).toBe(false);
    });
  });

  it('should handle edge cases', () => {
    expect(validateCAS('50-00-0')).toBe(true); // Formaldehyde
    expect(validateCAS('1-1-1')).toBe(false); // Too short
    expect(validateCAS('12345678-12-1')).toBe(false); // Too long
  });
});

describe('Chemical Name Validation', () => {
  const validateChemicalName = (name: string): boolean => {
    return name.length >= 1 && name.length <= 200;
  };

  it('should accept valid chemical names', () => {
    const validNames = [
      'H2O',
      'Sodium chloride',
      'N,N-Dimethylformamide',
      'Acetylsalicylic acid',
      'β-D-Glucose',
    ];

    validNames.forEach((name) => {
      expect(validateChemicalName(name)).toBe(true);
    });
  });

  it('should reject invalid names', () => {
    expect(validateChemicalName('')).toBe(false);
    expect(validateChemicalName('a'.repeat(201))).toBe(false);
  });
});

describe('Molar Mass Validation', () => {
  const validateMolarMass = (mass: number): boolean => {
    return mass > 0 && mass <= 10000 && Number.isFinite(mass);
  };

  it('should accept valid molar masses', () => {
    const validMasses = [1.008, 18.015, 58.44, 180.156, 342.3]; // H, H2O, NaCl, glucose, sucrose
    validMasses.forEach((mass) => {
      expect(validateMolarMass(mass)).toBe(true);
    });
  });

  it('should reject invalid molar masses', () => {
    const invalidMasses = [0, -1, 10001, Infinity, NaN];
    invalidMasses.forEach((mass) => {
      expect(validateMolarMass(mass)).toBe(false);
    });
  });
});
