/**
 * Utility for managing custom resource persistence (event-level materials/chemicals).
 * Provides testable functions for CRUD operations on custom resources.
 */

export interface CustomMaterialRequest {
  id?: number;
  name: string;
  quantity?: number;
}

export interface CustomChemicalRequest {
  id?: number;
  name: string;
  requestedQuantity?: number;
  unit?: string;
}

export interface CustomResourcesState {
  materials: CustomMaterialRequest[];
  chemicals: CustomChemicalRequest[];
}

export interface CustomResourcesOperationResult {
  success: boolean;
  changed: boolean;
  errors: string[];
}

/**
 * Fetch current custom resources for an event.
 */
export async function fetchCustomResources(eventId: number): Promise<CustomResourcesState> {
  try {
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch event ${eventId}`);
    }
    const data = await response.json();
    return {
      // Ensure quantities are numeric (Prisma Decimal for reactifs may arrive as string)
      materials: (data?.event?.customMaterielRequests || []).map((m: any) => ({
        ...m,
        quantity: typeof m.quantity === 'number' ? m.quantity : Number(m.quantity) || 1,
      })),
      chemicals: (data?.event?.customReactifRequests || []).map((c: any) => ({
        ...c,
        requestedQuantity:
          typeof c.requestedQuantity === 'number'
            ? c.requestedQuantity
            : Number(c.requestedQuantity) || 0,
        unit: (c.unit && String(c.unit).trim()) || 'g',
      })),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[fetchCustomResources]', error);
    }
    return { materials: [], chemicals: [] };
  }
}

/**
 * Synchronize desired custom resources with existing ones.
 * Handles creates, updates (via delete+create), and deletes.
 */
export async function syncCustomResources(
  eventId: number,
  desired: CustomResourcesState,
): Promise<CustomResourcesOperationResult> {
  const result: CustomResourcesOperationResult = {
    success: true,
    changed: false,
    errors: [],
  };

  try {
    // Fetch current state
    const existing = await fetchCustomResources(eventId);

    // Filter valid entries
    const desiredMats = desired.materials.filter((m) => m.name.trim());
    const desiredChems = desired.chemicals.filter((c) => c.name.trim());

    // Create lookup sets
    const desiredMatNames = new Set(desiredMats.map((m) => m.name.trim().toLowerCase()));
    const desiredChemNames = new Set(desiredChems.map((c) => c.name.trim().toLowerCase()));

    // Delete removed materials
    for (const em of existing.materials) {
      if (!desiredMatNames.has(em.name.trim().toLowerCase())) {
        try {
          await fetch(`/api/events/${eventId}/requests/materiels?requestId=${em.id}`, {
            method: 'DELETE',
          });
          result.changed = true;
        } catch (error) {
          result.errors.push(`Failed to delete material ${em.name}: ${error}`);
        }
      }
    }

    // Delete removed chemicals
    for (const ec of existing.chemicals) {
      if (!desiredChemNames.has(ec.name.trim().toLowerCase())) {
        try {
          await fetch(`/api/events/${eventId}/requests/reactifs?requestId=${ec.id}`, {
            method: 'DELETE',
          });
          result.changed = true;
        } catch (error) {
          result.errors.push(`Failed to delete chemical ${ec.name}: ${error}`);
        }
      }
    }

    // Helper: try incremental update (PUT then PATCH) else fallback delete+create
    // Capability caching (per session) to avoid repeated 404 noise
    // We store on globalThis to survive hot reload in dev
    // Capability cache with versioning: ensures that after upgrading the client logic (e.g. switching
    // from path-based to query-param-based PUT) we retry PUT even if a previous session disabled it.
    const CAP_VERSION = 'qparam-put-v1';
    const globalCaps: any =
      (globalThis as any).__customResCaps ||
      ((globalThis as any).__customResCaps = { version: CAP_VERSION, matPut: true, chemPut: true });
    if (globalCaps.version !== CAP_VERSION) {
      globalCaps.version = CAP_VERSION;
      globalCaps.matPut = true;
      globalCaps.chemPut = true;
    }
    const cap = globalCaps;

    async function updateMaterialQuantity(
      id: number,
      name: string,
      quantity: number,
    ): Promise<boolean> {
      // Backend expects PUT /requests/materiels?requestId=ID (no dynamic segment). Try direct PUT first.
      if (cap.matPut) {
        try {
          const res: any = await fetch(
            `/api/events/${eventId}/requests/materiels?requestId=${id}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ quantity }),
            },
          );
          if (res.ok) return true;
          if (res.status === 404) cap.matPut = false; // disable future attempts (route absent?)
        } catch {
          // fallthrough to fallback
        }
      }
      // Fallback delete+create (kept for backward compatibility or if PUT disabled)
      try {
        await fetch(`/api/events/${eventId}/requests/materiels?requestId=${id}`, {
          method: 'DELETE',
        });
        await fetch(`/api/events/${eventId}/requests/materiels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, quantity }),
        });
        return true;
      } catch (e) {
        result.errors.push(`Failed to update material ${name}: ${e}`);
      }
      return false;
    }

    async function updateChemicalQuantity(
      id: number,
      name: string,
      requestedQuantity: number,
      unit: string,
    ): Promise<boolean> {
      if (cap.chemPut) {
        try {
          const res: any = await fetch(`/api/events/${eventId}/requests/reactifs?requestId=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestedQuantity, unit }),
          });
          if (res.ok) return true;
          if (res.status === 404) cap.chemPut = false;
        } catch {
          // ignore and fallback
        }
      }
      try {
        await fetch(`/api/events/${eventId}/requests/reactifs?requestId=${id}`, {
          method: 'DELETE',
        });
        await fetch(`/api/events/${eventId}/requests/reactifs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, requestedQuantity, unit }),
        });
        return true;
      } catch (e) {
        result.errors.push(`Failed to update chemical ${name}: ${e}`);
      }
      return false;
    }

    // Add/update materials
    for (const dm of desiredMats) {
      const existingMaterial = existing.materials.find(
        (m) => m.name.trim().toLowerCase() === dm.name.trim().toLowerCase(),
      );

      if (!existingMaterial) {
        // Create new
        try {
          await fetch(`/api/events/${eventId}/requests/materiels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: dm.name.trim(),
              quantity: dm.quantity || 1,
            }),
          });
          result.changed = true;
        } catch (error) {
          result.errors.push(`Failed to create material ${dm.name}: ${error}`);
        }
      } else if (
        typeof existingMaterial.quantity === 'number' &&
        typeof dm.quantity === 'number' &&
        existingMaterial.quantity !== dm.quantity
      ) {
        const ok = await updateMaterialQuantity(
          existingMaterial.id as number,
          dm.name.trim(),
          dm.quantity || 1,
        );
        if (ok) result.changed = true;
      }
    }

    // Add/update chemicals
    for (const dc of desiredChems) {
      const existingChemical = existing.chemicals.find(
        (c) => c.name.trim().toLowerCase() === dc.name.trim().toLowerCase(),
      );

      const desiredQty = typeof dc.requestedQuantity === 'number' ? dc.requestedQuantity : 0;
      const desiredUnit = (dc.unit && dc.unit.trim()) || 'g';

      if (!existingChemical) {
        // Create new
        try {
          await fetch(`/api/events/${eventId}/requests/reactifs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: dc.name.trim(),
              requestedQuantity: desiredQty,
              unit: desiredUnit,
            }),
          });
          result.changed = true;
        } catch (error) {
          result.errors.push(`Failed to create chemical ${dc.name}: ${error}`);
        }
      } else {
        const existingQty = Number((existingChemical as any).requestedQuantity);
        const existingUnit = (existingChemical as any).unit || 'g';
        if (
          Number.isFinite(existingQty) &&
          (existingQty !== desiredQty || existingUnit !== desiredUnit)
        ) {
          const ok = await updateChemicalQuantity(
            existingChemical.id as number,
            dc.name.trim(),
            desiredQty,
            desiredUnit,
          );
          if (ok) result.changed = true;
        }
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${error}`);
  }

  if (result.errors.length > 0) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[syncCustomResources] Errors:', result.errors);
    }
    result.success = false;
  }

  return result;
}
