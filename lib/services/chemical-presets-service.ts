export interface ReactifPresetDTO {
  id?: number;
  name: string;
  formula?: string;
  casNumber?: string;
  category?: string;
  hazardClass?: string;
  molarMass?: number;
  density?: number;
  boilingPointC?: number;
  meltingPointC?: number;
}

async function json<T>(r: Response): Promise<T> {
  if (!r.ok) {
    let msg = `Erreur ${r.status}`;
    try {
      const d = await r.json();
      if (d.error) msg = d.error;
    } catch {}
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export async function listReactifPresets(q?: string) {
  const url = q ? `/api/chemical-presets?q=${encodeURIComponent(q)}` : '/api/chemical-presets';
  return json<{ presets: ReactifPresetDTO[] }>(await fetch(url));
}

export async function createReactifPreset(data: ReactifPresetDTO) {
  return json<{ preset: ReactifPresetDTO }>(
    await fetch('/api/chemical-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

export async function updateReactifPreset(data: ReactifPresetDTO) {
  return json<{ preset: ReactifPresetDTO }>(
    await fetch('/api/chemical-presets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

// Partial inline update (PATCH)
export async function patchReactifPreset(id: number, data: Partial<ReactifPresetDTO>) {
  return json<{ preset: ReactifPresetDTO }>(
    await fetch('/api/chemical-presets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    }),
  );
}

export async function deleteReactifPreset(id: number) {
  return json<{ ok: boolean }>(await fetch(`/api/chemical-presets?id=${id}`, { method: 'DELETE' }));
}
