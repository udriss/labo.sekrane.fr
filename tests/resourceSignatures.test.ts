import {
  buildResourceSignature,
  buildCustomResourceSignature,
  buildFullResourceSignature,
  hasResourceChanges,
  hasFullResourceChanges,
} from '@/components/calendar/resourceSignatures';

describe('resourceSignatures', () => {
  test('order independent for preset materials/reactifs', () => {
    const a = buildResourceSignature({
      materiels: [
        { materielId: 2, quantity: 1 },
        { materielId: 1, quantity: 3 },
      ],
    });
    const b = buildResourceSignature({
      materiels: [
        { materielId: 1, quantity: 3 },
        { materielId: 2, quantity: 1 },
      ],
    });
    expect(a).toBe(b);
  });

  test('detects quantity change', () => {
    const prev = { materiels: [{ materielId: 1, quantity: 1 }] };
    const next = { materiels: [{ materielId: 1, quantity: 2 }] };
    expect(hasResourceChanges(prev, next)).toBe(true);
  });

  test('custom signature detects custom change only', () => {
    const prev = buildFullResourceSignature({ customMateriels: [{ name: 'A', quantity: 1 }] });
    const next = buildFullResourceSignature({ customMateriels: [{ name: 'A', quantity: 2 }] });
    expect(prev).not.toBe(next);
  });

  test('full changes combine base + custom', () => {
    const prev = {
      materiels: [{ materielId: 1, quantity: 1 }],
      customMateriels: [{ name: 'X', quantity: 1 }],
    };
    const next = {
      materiels: [{ materielId: 1, quantity: 1 }],
      customMateriels: [{ name: 'X', quantity: 2 }],
    };
    expect(hasFullResourceChanges(prev, next)).toBe(true);
  });

  test('unit difference in reactifs changes signature', () => {
    const a = buildResourceSignature({
      reactifs: [{ reactifId: 1, requestedQuantity: 1, unit: 'g' }],
    });
    const b = buildResourceSignature({
      reactifs: [{ reactifId: 1, requestedQuantity: 1, unit: 'mg' }],
    });
    expect(a).not.toBe(b);
  });
});
