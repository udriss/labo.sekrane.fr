import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/chemicals/route';

jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 1, name: 'TestUser' } }) }));

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
    localisation: {
      findUnique: async ({ where }: any) => ({ id: where.id, salleId: 10 }),
    },
    reactifInventaire: {
      findUnique: async ({ where, select }: any) => {
        const rec = inventories.find((i) => i.id === where.id);
        if (!rec) return null;
        if (select?.stock || select?.reactifPresetId) {
          return { stock: rec.stock, reactifPresetId: rec.reactifPresetId };
        }
        if (select?.reactifPreset) {
          return {
            reactifPreset: { name: presets.find((p) => p.id === rec.reactifPresetId)?.name },
          } as any;
        }
        return rec;
      },
      create: async ({ data, include }: any) => {
        const rec = {
          id: inventorySeq++,
          reactifPresetId: data.reactifPresetId,
          stock: data.stock,
          salleId: data.salleId || null,
          localisationId: data.localisationId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inventories.push(rec);
        const preset = presets.find((p) => p.id === rec.reactifPresetId);
        if (include?.reactifPreset) (rec as any).reactifPreset = preset;
        return rec as any;
      },
      update: async ({ where, data, include }: any) => {
        const rec = inventories.find((i) => i.id === where.id);
        if (!rec) throw new Error('Not found');
        if (data.stock !== undefined) rec.stock = data.stock;
        if (data.salleId !== undefined) rec.salleId = data.salleId;
        if (data.localisationId !== undefined) rec.localisationId = data.localisationId;
        rec.updatedAt = new Date();
        const preset = presets.find((p) => p.id === rec.reactifPresetId);
        return include?.reactifPreset ? { ...rec, reactifPreset: preset } : rec;
      },
      delete: async ({ where }: any) => {
        const idx = inventories.findIndex((i) => i.id === where.id);
        if (idx >= 0) inventories.splice(idx, 1);
        return { id: where.id };
      },
      findMany: async ({ where, include }: any) => {
        return inventories
          .filter((i) => {
            if (where?.stock?.lte !== undefined && !(i.stock <= where.stock.lte)) return false;
            if (where?.salleId && i.salleId !== where.salleId) return false;
            return true;
          })
          .map((rec) => {
            const preset = presets.find((p) => p.id === rec.reactifPresetId);
            return include?.reactifPreset ? { ...rec, reactifPreset: preset } : rec;
          });
      },
    },
  },
}));

jest.mock('@/lib/services/notification-service', () => ({
  notificationService: { createAndDispatch: () => Promise.resolve(null) },
}));

describe('/api/chemicals CRUD', () => {
  it('creates inventory + preset, then lists', async () => {
    const reqCreate = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acetone', stock: 7 }),
    });
    const resCreate: any = await POST(reqCreate as unknown as NextRequest);
    const jsonCreate = await resCreate.json();
    expect(jsonCreate.reactif).toBeTruthy();

    const reqList = new Request('http://test.local/api/chemicals');
    const resList: any = await GET(reqList as unknown as NextRequest);
    const jsonList = await resList.json();
    expect(jsonList.reactifs.length).toBeGreaterThan(0);
  });

  it('updates inventory stock', async () => {
    // create
    const createReq = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Ethanol', stock: 3 }),
    });
    const createdRes: any = await POST(createReq as unknown as NextRequest);
    const created = await createdRes.json();
    const id = created.reactif.id;

    const updateReq = new Request('http://test.local/api/chemicals', {
      method: 'PUT',
      body: JSON.stringify({ id, stock: 9 }),
    });
    const updateRes: any = await PUT(updateReq as unknown as NextRequest);
    const updated = await updateRes.json();
    expect(updated.reactif.stock).toBe(9);
  });

  it('deletes inventory', async () => {
    const createReq = new Request('http://test.local/api/chemicals', {
      method: 'POST',
      body: JSON.stringify({ name: 'Methanol', stock: 1 }),
    });
    const createdRes: any = await POST(createReq as unknown as NextRequest);
    const created = await createdRes.json();

    const deleteReq = new Request(`http://test.local/api/chemicals?id=${created.reactif.id}`, {
      method: 'DELETE',
    });
    const delRes: any = await DELETE(deleteReq as unknown as NextRequest);
    const delJson = await delRes.json();
    expect(delJson.ok).toBe(true);
  });
});
