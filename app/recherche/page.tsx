// app/recherche/page.tsx

'use client';
import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  TextField,
  Typography,
  Paper,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
} from '@mui/material';
import { Search, Science, Inventory, Folder, Description } from '@mui/icons-material';

// Lightweight fetch with abort
async function fetchJSON(url: string, signal: AbortSignal): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Helpers for scoring and snippets
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
function scoreTextByQuery(text: string, query: string): number {
  const t = (text || '').toLowerCase();
  const terms = tokenize(query);
  if (!terms.length) return 0;
  const phrase = terms.join(' ');
  let score = 0;
  if (terms.length > 1 && t.includes(phrase)) score += 100; // prioritize exact phrase
  for (const term of terms) if (t.includes(term)) score += 10;
  for (const term of terms) if (t.startsWith(term)) score += 2;
  return score;
}
function scoreObject(fields: Record<string, any>, query: string, keys: string[]): number {
  let s = 0;
  for (const k of keys) s += scoreTextByQuery(String(fields[k] ?? ''), query);
  return s;
}
function makeSnippetsFromText(text: string, query: string, max = 3, ctx = 60): string[] {
  if (!text) return [];
  const flat = text.replace(/\s+/g, ' ').trim();
  const terms = tokenize(query);
  if (!terms.length) return [];
  const out: string[] = [];
  const used: Array<[number, number]> = [];
  const pushSnippet = (start: number, len: number) => {
    const left = Math.max(0, start - ctx);
    const right = Math.min(flat.length, start + len + ctx);
    let snip = flat.slice(left, right);
    if (left > 0) snip = '… ' + snip;
    if (right < flat.length) snip = snip + ' …';
    out.push(snip);
  };
  if (terms.length > 1) {
    const phrase = terms.join(' ');
    const re = new RegExp(escapeRegex(phrase), 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(flat)) && out.length < max) {
      pushSnippet(m.index, m[0].length);
      used.push([m.index, m.index + m[0].length]);
    }
  }
  if (out.length < max) {
    for (const term of terms) {
      const re = new RegExp(escapeRegex(term), 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(flat)) && out.length < max) {
        const start = m.index;
        const end = start + m[0].length;
        if (!used.some(([a, b]) => !(end <= a || start >= b))) {
          pushSnippet(start, m[0].length);
          used.push([start, end]);
        }
      }
      if (out.length >= max) break;
    }
  }
  return out;
}

// Extract readable text from HTML while skipping scripts/styles and RSC payloads
function extractReadableText(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove noisy nodes
    doc.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
    // Prefer visible content: headings, paragraphs, list items
    const parts: string[] = [];
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, dt, dd').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (t) parts.push(t);
    });
    const text = parts.join(' \u00B7 ');
    return text || (doc.body?.textContent || '').toString();
  } catch {
    return html;
  }
}

type ResultSection = {
  key: string;
  title: string;
  icon: React.ReactNode;
  items: { id: string; label: string; href?: string; extra?: string }[];
  total?: number;
};

export default function RecherchePage() {
  const params = useSearchParams();
  const router = useRouter();
  const q0 = (params.get('q') || '').trim();
  const [q, setQ] = React.useState(q0);
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<ResultSection[]>([]);

  React.useEffect(() => {
    const query = (params.get('q') || '').trim();
    setQ(query);
    if (!query) {
      setSections([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setSections([]);
      const next: ResultSection[] = [];

      // Matériel
      const mat = await fetchJSON(`/api/materiel`, ctrl.signal);
      if (mat && Array.isArray(mat.materiels)) {
        const scored = mat.materiels
          .map((m: any) => ({ m, s: scoreObject(m, query, ['name', 'discipline']) }))
          .filter((x: any) => x.s > 0)
          .sort((a: any, b: any) => b.s - a.s)
          .map((x: any) => x.m);
        next.push({
          key: 'materiel',
          title: 'Matériel',
          icon: <Inventory fontSize="small" />,
          items: scored.slice(0, 10).map((m: any) => ({
            id: String(m.id),
            label: m.name,
            href: '/materiel',
            extra: m.category?.name || m.discipline,
          })),
          total: scored.length,
        });
        setSections([...next]);
      }

      // Réactifs (inventaire + presets en base)
      const chem = await fetchJSON(`/api/chemicals?q=${encodeURIComponent(query)}`, ctrl.signal);
      if (chem) {
        const inv = Array.isArray(chem.reactifs) ? chem.reactifs : [];
        const presets = Array.isArray(chem.presets) ? chem.presets : [];
        const all = [
          ...inv.map((c: any) => ({
            id: c.id,
            name: c.reactifPreset?.name || c.name,
            casNumber: c.reactifPreset?.casNumber,
            category: c.reactifPreset?.category,
            kind: 'inventaire',
          })),
          ...presets.map((p: any) => ({
            id: p.id,
            name: p.name,
            casNumber: p.casNumber,
            category: p.category,
            kind: 'preset',
          })),
        ];
        const scored = all
          .map((r: any) => ({ r, s: scoreObject(r, query, ['name', 'casNumber', 'category']) }))
          .filter((x: any) => x.s > 0)
          .sort((a: any, b: any) => b.s - a.s)
          .map((x: any) => x.r);
        next.push({
          key: 'reactifs',
          title: 'Réactifs',
          icon: <Science fontSize="small" />,
          items: scored.slice(0, 10).map((r: any) => ({
            id: String(r.id),
            label: r.name,
            href: '/reactifs',
            extra: r.casNumber || r.category || r.kind,
          })),
          total: scored.length,
        });
        setSections([...next]);
      }

      // Consommables
      const cons = await fetchJSON(
        `/api/consommables?search=${encodeURIComponent(query)}`,
        ctrl.signal,
      );
      if (cons && Array.isArray(cons.consommables)) {
        const scored = cons.consommables
          .map((c: any) => ({ c, s: scoreObject(c, query, ['name', 'unit']) }))
          .filter((x: any) => x.s > 0)
          .sort((a: any, b: any) => b.s - a.s)
          .map((x: any) => x.c);
        next.push({
          key: 'consommables',
          title: 'Consommables',
          icon: <Folder fontSize="small" />,
          items: scored.slice(0, 10).map((c: any) => ({
            id: String(c.id),
            label: c.name,
            href: '/consommables',
            extra: c.unit || '',
          })),
          total: scored.length,
        });
        setSections([...next]);
      }

      // Docs: use public API for clean snippets; fallback to HTML parse if API fails
      try {
        const res = await fetch(`/api/public/docs-search?q=${encodeURIComponent(query)}`, {
          cache: 'no-store',
        });
        let snippets: string[] = [];
        if (res.ok) {
          const json = await res.json().catch(() => ({ snippets: [] }));
          snippets = Array.isArray(json.snippets) ? json.snippets : [];
        }
        if (!snippets.length) {
          // Fallback client-side: fetch /docs HTML and extract
          const htmlRes = await fetch('/docs', {
            cache: 'no-store',
            headers: { accept: 'text/html' },
          });
          if (htmlRes.ok) {
            const html = await htmlRes.text();
            const text = extractReadableText(html);
            snippets = makeSnippetsFromText(text, query, 3, 70);
          }
        }
        if (snippets.length) {
          next.push({
            key: 'docs',
            title: 'Documentation',
            icon: <Description fontSize="small" />,
            items: snippets.map((snip, i) => ({
              id: `docs-${i}`,
              label: snip,
              href: '/docs',
              extra: 'Page /docs',
            })),
            total: snippets.length,
          });
          setSections([...next]);
        }
      } catch {}

      setLoading(false);
    })();
    return () => ctrl.abort();
  }, [params]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Search />
          <Typography variant="h6" fontWeight="bold">
            Recherche
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            placeholder="Rechercher..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = q.trim();
                router.push(`/recherche?q=${encodeURIComponent(v)}`);
              }
            }}
            sx={{ minWidth: 300 }}
          />
          <Button
            variant="contained"
            onClick={() => router.push(`/recherche?q=${encodeURIComponent(q.trim())}`)}
          >
            Chercher
          </Button>
        </Stack>
      </Paper>

      {loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} /> Recherche en cours…
        </Alert>
      )}

      {sections.length === 0 && !loading && (
        <Alert severity="warning">Aucun résultat pour "{q}"</Alert>
      )}

      {sections.map((s) => (
        <Paper key={s.key} sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            {s.icon}
            <Typography variant="h6" fontWeight="bold">
              {s.title}
            </Typography>
            {typeof s.total === 'number' && (
              <Chip label={`${Math.min(10, s.items.length)}/${s.total}`} size="small" />
            )}
          </Stack>
          <List dense>
            {s.items.map((it) => (
              <ListItem key={it.id} disablePadding>
                <ListItemButton component="a" href={it.href}>
                  <ListItemText primary={it.label} secondary={it.extra} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      ))}
    </Container>
  );
}
