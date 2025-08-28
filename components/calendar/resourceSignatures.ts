// Utility to build stable signatures for event resources.
export interface ResourceSignatureInput {
  materiels?: Array<{ materielId?: number; id?: number; quantity?: number }>;
  reactifs?: Array<{ reactifId?: number; id?: number; requestedQuantity?: number; unit?: string }>;
  documents?: Array<{ fileUrl: string }>;
  classes?: number[];
  salles?: number[];
  // custom (event-level) resources (identified by name + qty/unit)
  customMateriels?: Array<{ name: string; quantity?: number }>;
  customReactifs?: Array<{ name: string; requestedQuantity?: number; unit?: string }>;
}

function normMateriels(list: ResourceSignatureInput['materiels']) {
  return (list || [])
    .map((m) => ({ id: m.materielId ?? m.id ?? 0, q: m.quantity ?? 1 }))
    .sort((a, b) => a.id - b.id)
    .map((m) => [m.id, m.q]);
}
function normReactifs(list: ResourceSignatureInput['reactifs']) {
  return (list || [])
    .map((r) => ({ id: r.reactifId ?? r.id ?? 0, q: r.requestedQuantity ?? 0, u: r.unit || 'g' }))
    .sort((a, b) => a.id - b.id)
    .map((r) => [r.id, r.q, r.u]);
}
function normDocs(list: ResourceSignatureInput['documents']) {
  return (list || [])
    .map((d) => d.fileUrl)
    .filter(Boolean)
    .sort();
}
function normIds(list?: number[]) {
  return (list || []).slice().sort((a, b) => a - b);
}

export function buildResourceSignature(input: ResourceSignatureInput): string {
  return JSON.stringify({
    m: normMateriels(input.materiels),
    r: normReactifs(input.reactifs),
    d: normDocs(input.documents),
    c: normIds(input.classes),
    s: normIds(input.salles),
  });
}

export function hasResourceChanges(
  prev: ResourceSignatureInput,
  next: ResourceSignatureInput,
): boolean {
  return buildResourceSignature(prev) !== buildResourceSignature(next);
}

// ---- Custom resources signature helpers ----
function normCustomMateriels(list: ResourceSignatureInput['customMateriels']) {
  return (list || [])
    .map((m) => ({
      n: m.name?.trim().toLowerCase() || '',
      q: typeof m.quantity === 'number' ? m.quantity : 1,
    }))
    .filter((m) => m.n)
    .sort((a, b) => a.n.localeCompare(b.n))
    .map((m) => [m.n, m.q]);
}
function normCustomReactifs(list: ResourceSignatureInput['customReactifs']) {
  return (list || [])
    .map((r) => ({
      n: r.name?.trim().toLowerCase() || '',
      q: typeof r.requestedQuantity === 'number' ? r.requestedQuantity : 0,
      u: r.unit || 'g',
    }))
    .filter((r) => r.n)
    .sort((a, b) => a.n.localeCompare(b.n))
    .map((r) => [r.n, r.q, r.u]);
}

export function buildCustomResourceSignature(input: ResourceSignatureInput): string {
  return JSON.stringify({
    cm: normCustomMateriels(input.customMateriels),
    cr: normCustomReactifs(input.customReactifs),
  });
}

export function buildFullResourceSignature(input: ResourceSignatureInput): string {
  return JSON.stringify({
    base: JSON.parse(buildResourceSignature(input)),
    custom: JSON.parse(buildCustomResourceSignature(input)),
  });
}

export function hasFullResourceChanges(
  prev: ResourceSignatureInput,
  next: ResourceSignatureInput,
): boolean {
  return buildFullResourceSignature(prev) !== buildFullResourceSignature(next);
}
