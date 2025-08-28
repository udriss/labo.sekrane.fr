import {
  syncCustomResources,
  fetchCustomResources,
  CustomMaterialRequest,
  CustomChemicalRequest,
  CustomResourcesState,
  CustomResourcesOperationResult,
} from '@/lib/services/customResourcesService';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('customResourcesService', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('fetchCustomResources', () => {
    test('returns custom resources on success', async () => {
      const mockResponse = {
        event: {
          customMaterielRequests: [{ id: 1, name: 'Test Material', quantity: 2 }],
          customReactifRequests: [
            { id: 2, name: 'Test Chemical', requestedQuantity: 5, unit: 'ml' },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await fetchCustomResources(123);

      expect(result).toEqual({
        materials: [{ id: 1, name: 'Test Material', quantity: 2 }],
        chemicals: [{ id: 2, name: 'Test Chemical', requestedQuantity: 5, unit: 'ml' }],
      });
    });

    test('returns empty arrays on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchCustomResources(123);

      expect(result).toEqual({
        materials: [],
        chemicals: [],
      });
    });
  });

  describe('syncCustomResources', () => {
    test('detects no changes when resources match', async () => {
      const existing = {
        materials: [{ id: 1, name: 'Material A', quantity: 1 }],
        chemicals: [{ id: 2, name: 'Chemical B', requestedQuantity: 2, unit: 'g' }],
      };

      const desired = {
        materials: [{ name: 'Material A', quantity: 1 }],
        chemicals: [{ name: 'Chemical B', requestedQuantity: 2, unit: 'g' }],
      };

      // Mock fetchCustomResources
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          event: {
            customMaterielRequests: existing.materials,
            customReactifRequests: existing.chemicals,
          },
        }),
      } as Response);

      const result = await syncCustomResources(123, desired);

      expect(result.changed).toBe(false);
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('detects quantity change and performs update via PUT (fallback later if needed)', async () => {
      const existing = {
        materials: [{ id: 1, name: 'Material A', quantity: 1 }],
        chemicals: [],
      };

      const desired = {
        materials: [{ name: 'Material A', quantity: 3 }], // quantity changed
        chemicals: [],
      };

      // Mock fetchCustomResources
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          event: {
            customMaterielRequests: existing.materials,
            customReactifRequests: existing.chemicals,
          },
        }),
      } as Response);

      // Mock PUT update request
      mockFetch.mockResolvedValueOnce({ ok: true } as Response); // PUT

      const result = await syncCustomResources(123, desired);

      expect(result.changed).toBe(true);
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/events/123/requests/materiels?requestId=1',
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    test('handles new resource creation', async () => {
      const existing = { materials: [], chemicals: [] };
      const desired = {
        materials: [{ name: 'New Material', quantity: 1 }],
        chemicals: [{ name: 'New Chemical', requestedQuantity: 5, unit: 'ml' }],
      };

      // Mock fetchCustomResources
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          event: {
            customMaterielRequests: existing.materials,
            customReactifRequests: existing.chemicals,
          },
        }),
      } as Response);

      // Mock POST requests
      mockFetch.mockResolvedValueOnce({ ok: true } as Response); // Material POST
      mockFetch.mockResolvedValueOnce({ ok: true } as Response); // Chemical POST

      const result = await syncCustomResources(123, desired);

      expect(result.changed).toBe(true);
      expect(result.success).toBe(true);
    });
  });
});
