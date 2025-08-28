import { NextRequest } from 'next/server';
import { GET as GET_STATS } from '@/app/api/chemicals/stats/route';

// Minimal prisma mock for stats
const inventories: any[] = [
  {
    id: 1,
    stock: 2,
    salle: { id: 1, name: 'S1' },
    localisation: { id: 10, name: 'Armoire A', salleId: 1 },
  },
  { id: 2, stock: 8, salle: { id: 1, name: 'S1' }, localisation: null },
  {
    id: 3,
    stock: 1,
    salle: { id: 2, name: 'S2' },
    localisation: { id: 20, name: 'Frigo', salleId: 2 },
  },
];
let presetCount = 3;

jest.mock('@/lib/services/db', () => ({
  prisma: {
    reactifInventaire: { findMany: async () => inventories },
    reactifPreset: { count: async () => presetCount },
  },
}));

describe('chemicals stats endpoint', () => {
  it('returns aggregated data', async () => {
    const req = new Request('http://test.local/api/chemicals/stats?threshold=5');
    const res: any = await GET_STATS(req as unknown as NextRequest);
    const json = await res.json();
    expect(json.totalInventories).toBe(3);
    expect(json.totalPresets).toBe(3);
    expect(json.lowStock.count).toBe(2); // stocks 2 and 1 <= 5
    expect(json.bySalle.length).toBeGreaterThan(0);
    expect(json.byLocalisation.length).toBeGreaterThan(0);
  });
});
