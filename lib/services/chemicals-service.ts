import {
  chemicalInventoryCreateSchema,
  chemicalInventoryUpdateSchema,
  ChemicalCreateInput,
} from '@/lib/schemas/chemical';

export interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    throw {
      message: body?.error || 'Erreur requête',
      status: res.status,
      details: body?.details,
    } as ApiError;
  }
  return body as T;
}

export async function createChemical(input: ChemicalCreateInput) {
  const data = chemicalInventoryCreateSchema.parse(input as any);
  return jsonFetch<{ reactif: any }>('/api/chemicals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChemical(id: number, partial: any) {
  const data = chemicalInventoryUpdateSchema.parse({ id, ...partial });
  return jsonFetch<{ reactif: any }>('/api/chemicals', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChemical(id: number) {
  return jsonFetch<{ ok: boolean }>(`/api/chemicals?id=${id}`, { method: 'DELETE' });
}

export async function listChemicals(params?: { search?: string }) {
  const qs = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
  return jsonFetch<{ reactifs: any[] }>(`/api/chemicals${qs}`);
}
