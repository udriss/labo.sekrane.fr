import { GET as GET_SETTINGS, PUT as PUT_SETTINGS } from '@/app/api/admin/settings/route';

jest.mock('@/auth', () => ({ auth: async () => ({ user: { id: 1, role: 'ADMIN' } }) }));

// Mock prisma service methods indirectly by mocking the app-settings service
jest.mock('@/lib/services/app-settings', () => {
  let current = {
    maintenanceMode: false,
    allowRegistrations: true,
    defaultUserRole: 'ENSEIGNANT',
    sessionTimeoutMinutes: 480,
    timezone: 'Europe/Paris',
    brandingName: 'SGIL',
  };
  return {
    loadAppSettings: async () => current,
    saveAppSettings: async (partial: any) => {
      current = { ...current, ...partial };
      return current;
    },
  };
});

describe('Admin settings endpoint', () => {
  it('GET returns settings', async () => {
    const res: any = await GET_SETTINGS();
    const json = await res.json();
    expect(json.settings).toBeDefined();
    expect(json.settings.defaultUserRole).toBe('ENSEIGNANT');
  });
  it('PUT updates settings', async () => {
    const req: any = new Request('http://localhost/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings: { brandingName: 'NEW' } }),
    });
    const res: any = await PUT_SETTINGS(req);
    const json = await res.json();
    expect(json.settings.brandingName).toBe('NEW');
  });
});
