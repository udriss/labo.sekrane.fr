import { z } from 'zod';

// NOTE: Ce service "equipment" est conservé pour compatibilité.
// Il délègue maintenant vers l'endpoint legacy /api/equipment-presets (pont vers materielPreset)
// Une future étape pourra supprimer ce fichier et migrer tout vers materiel-presets-service.

export interface EquipmentPresetDTO {
  id?: number;
  name: string;
  category?: string | null;
  discipline?: string | null;
  description?: string | null;
  defaultQty?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

const equipmentPresetSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1, 'Nom requis'),
  category: z.string().optional().nullable(),
  discipline: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  defaultQty: z.number().int().positive().optional().nullable(),
});

export async function listEquipmentPresets(
  params: {
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
    search?: string;
  } = {},
): Promise<{ presets: EquipmentPresetDTO[]; total: number; page: number; pageSize: number }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDir) searchParams.set('sortDir', params.sortDir);
  if (params.search?.trim()) searchParams.set('q', params.search.trim());

  const res = await fetch(`/api/equipment-presets?${searchParams.toString()}`); // bridge vers materielPreset
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

export async function createEquipmentPreset(
  data: Omit<EquipmentPresetDTO, 'id'>,
): Promise<EquipmentPresetDTO> {
  const validated = equipmentPresetSchema.omit({ id: true }).parse(data);
  const res = await fetch('/api/equipment-presets', {
    // bridge
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  const result = await res.json();
  return result.preset;
}

export async function updateEquipmentPreset(
  id: number,
  data: Partial<EquipmentPresetDTO>,
): Promise<EquipmentPresetDTO> {
  const validated = equipmentPresetSchema.partial().parse({ ...data, id });
  const res = await fetch('/api/equipment-presets', {
    // bridge
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validated),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  const result = await res.json();
  return result.preset;
}

export async function deleteEquipmentPreset(id: number): Promise<void> {
  const res = await fetch(`/api/equipment-presets?id=${id}`, {
    // bridge
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
}
