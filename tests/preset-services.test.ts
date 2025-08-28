import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch globally
// Explicitly type the mock fetch to match the fetch signature
global.fetch = jest.fn() as jest.MockedFunction<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>;
const mockFetch = fetch as jest.MockedFunction<
  (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
>;

describe('Chemical Presets Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('listReactifPresets', () => {
    it('should fetch presets without parameters', async () => {
      const mockResponse = {
        presets: [
          { id: 1, name: 'NaCl', casNumber: '7647-14-5', molarMass: 58.44, density: 2.165 },
          { id: 2, name: 'H2O', casNumber: '7732-18-5', molarMass: 18.015, density: 1 },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { listReactifPresets } = await import('@/lib/services/chemical-presets-service');

      const result = await listReactifPresets();

      expect(mockFetch).toHaveBeenCalledWith('/api/chemical-presets');
      expect(result).toEqual(mockResponse);
    });

    it('should include search parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presets: [] }),
      } as Response);

      const { listReactifPresets } = await import('@/lib/services/chemical-presets-service');

      await listReactifPresets('sodium');

      expect(mockFetch).toHaveBeenCalledWith('/api/chemical-presets?q=sodium');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { listReactifPresets } = await import('@/lib/services/chemical-presets-service');

      await expect(listReactifPresets()).rejects.toThrow('Erreur 500');
    });
  });

  describe('createReactifPreset', () => {
    it('should create a new preset', async () => {
      const newPreset = { name: 'NaCl', casNumber: '7647-14-5', molarMass: 58.44, density: 2.165 };
      const responseData = { preset: { ...newPreset, id: 1 } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseData,
      } as Response);

      const { createReactifPreset } = await import('@/lib/services/chemical-presets-service');

      const result = await createReactifPreset(newPreset);

      expect(mockFetch).toHaveBeenCalledWith('/api/chemical-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreset),
      });
      expect(result).toEqual(responseData);
    });

    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Nom requis' }),
      } as Response);

      const { createReactifPreset } = await import('@/lib/services/chemical-presets-service');

      await expect(createReactifPreset({ name: '', casNumber: '', molarMass: 0 })).rejects.toThrow(
        'Nom requis',
      );
    });

    it('should handle uniqueness conflicts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Preset déjà existant' }),
      } as Response);

      const { createReactifPreset } = await import('@/lib/services/chemical-presets-service');

      await expect(
        createReactifPreset({
          name: 'NaCl',
          casNumber: '7647-14-5',
          molarMass: 58.44,
          density: 2.165,
        }),
      ).rejects.toThrow('Preset déjà existant');
    });
  });
});

describe('Equipment Presets Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('listEquipmentPresets', () => {
    it('should fetch equipment presets with default parameters', async () => {
      const mockResponse = {
        presets: [{ id: 1, name: 'Bécher 250mL', category: 'Verrerie', discipline: 'Chimie' }],
        total: 1,
        page: 1,
        pageSize: 12,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const { listEquipmentPresets } = await import('@/lib/services/equipment-presets-service');

      const result = await listEquipmentPresets();

      expect(mockFetch).toHaveBeenCalledWith('/api/equipment-presets?');
      expect(result).toEqual(mockResponse);
    });

    it('should include sorting parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presets: [], total: 0, page: 1, pageSize: 12 }),
      } as Response);

      const { listEquipmentPresets } = await import('@/lib/services/equipment-presets-service');

      await listEquipmentPresets({ sortBy: 'category', sortDir: 'desc' });

      expect(mockFetch).toHaveBeenCalledWith('/api/equipment-presets?sortBy=category&sortDir=desc');
    });
  });
});
