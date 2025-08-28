import { useState, useCallback } from 'react';
import { EquipmentService, Equipement } from '@/lib/services/equipmentServiceChimie';

export function useEquipmentHandlers() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(
    async (equipmentData: Omit<Equipement, 'id' | 'createdAt' | 'updatedAt'>) => {
      setLoading(true);
      setError(null);

      try {
        const newEquipment = await EquipmentService.create(equipmentData);
        return newEquipment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create equipement';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: number, updates: Partial<Omit<Equipement, 'id' | 'createdAt' | 'updatedAt'>>) => {
      setLoading(true);
      setError(null);

      try {
        const updatedEquipment = await EquipmentService.update(id, updates);
        return updatedEquipment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update equipement';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleDelete = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      await EquipmentService.delete(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete equipement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGetAll = useCallback(async (discipline?: string) => {
    setLoading(true);
    setError(null);

    try {
      const equipement = await EquipmentService.getAll(discipline);
      return equipement;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch equipement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGetLowStock = useCallback(async (threshold?: number) => {
    setLoading(true);
    setError(null);

    try {
      const equipement = await EquipmentService.getLowStock(threshold);
      return equipement;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch low stock equipement';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleGetAll,
    handleGetLowStock,
  };
}
