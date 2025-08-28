import { NextRequest } from 'next/server';
import { POST, PUT } from '@/app/api/chemicals/route';

jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 1, name: 'Validator' } }) }));

const presets: any[] = [];
const inventories: any[] = [];
let presetSeq = 1;
let inventorySeq = 1;

jest.mock('@/lib/services/db', () => ({
  prisma: {
    reactifPreset: {
      findFirst: async ({ where }: any) =>
        presets.find((p) => p.name === where.name && p.casNumber === where.casNumber) || null,
      create: async ({ data }: any) => {
        const rec = {
          id: presetSeq++,
          createdAt: new Date(),
          updatedAt: new Date(),
          inventories: [],
          ...data,
        };
        presets.push(rec);
        return rec;
      },
    },
    localisation: { findUnique: async () => ({ id: 1, salleId: 1 }) },
    reactifInventaire: {
      create: async ({ data }: any) => {
        const rec = { id: inventorySeq++, createdAt: new Date(), updatedAt: new Date(), ...data };
        inventories.push(rec);
        return rec;
      },
      findUnique: async ({ where }: any) => inventories.find((i) => i.id === where.id) || null,
      update: async ({ where, data }: any) => {
        const rec = inventories.find((i) => i.id === where.id);
        if (!rec) throw new Error('not found');
        Object.assign(rec, data);
        rec.updatedAt = new Date();
        return { ...rec, reactifPreset: presets.find((p) => p.id === rec.reactifPresetId) };
      },
    },
  },
}));

jest.mock('@/lib/services/notification-service', () => ({
  notificationService: { createAndDispatch: () => Promise.resolve(null) },
}));

describe('chemicals validation errors', () => {
  it('rejects missing name', async () => {
    const req = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ stock: 1 }),
    });
    const res: any = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Données invalides');
  });

  it('rejects negative stock', async () => {
    const req = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acide', stock: -1 }),
    });
    const res: any = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('partial update invalid type rejected', async () => {
    // Create valid first
    const createReq = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Eau', stock: 2 }),
    });
    const createdRes: any = await POST(createReq as unknown as NextRequest);
    const created = await createdRes.json();
    // Attempt update with wrong type for stock
    const badUpdateReq = new Request('http://test.local/api/chemicals', {
      method: 'PUT',
      body: JSON.stringify({ id: created.reactif.id, stock: 'abc' }),
    });
    const badRes: any = await PUT(badUpdateReq as unknown as NextRequest);
    expect(badRes.status).toBe(400);
  });
});
