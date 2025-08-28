'use client';

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Alert,
  Skeleton,
  Stack,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { SiMoleculer } from 'react-icons/si';
import { ChemicalsList } from '@/components/chemicals/ChemicalsList';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import DataExportTab from '@/components/export/DataExportTab';
import type { Column } from '@/types/export';
import { parseLatexToReact } from '@/lib/utils/latex';

// Rely on global error boundary in layout; use Suspense fallbacks locally.

// Chargement lazy avec React.lazy au lieu de next/dynamic
const ChemicalCreateStepper = lazy(() => import('@/components/chemicals/ChemicalCreateStepper'));
const ReactifPresetsManager = lazy(() => import('@/components/chemicals/ReactifPresetsManager'));
const LabSafetyAnalysis = lazy(() => import('@/components/chemicals/LabSafetyAnalysis'));

// Chargement dynamique pour réduire le bundle initial
const CircularFallback = ({ label }: { label?: string }) => (
  <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
    <CircularProgress />
    {label && (
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    )}
  </Box>
);

interface ChemicalApiItem {
  id: number;
  name: string;
  formula?: string | null;
  casNumber?: string | null;
  hazard?: string | null; // alias of hazard class if provided by API
  hazardClass?: string | null;
  category?: string | null;
  supplier?: string | null;
  supplierKind?: 'NORMAL' | 'CUSTOM' | null;
  stock: number;
  location?: string | null;
  molarMass?: number | null;
  density?: number | null;
  meltingPointC?: number | null;
  boilingPointC?: number | null;
  createdAt: string;
  updatedAt: string;
}

function TabPanel({
  value,
  index,
  children,
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  if (value !== index) return null;
  return <Box sx={{ py: 0, px: 0 }}>{children}</Box>;
}

function ReactifsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hook pour la gestion des tabs avec URL
  const { tabValue: tab, handleTabChange } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 5, // 0..4 (avec onglet Export)
  });

  const [chemicals, setChemicals] = useState<ChemicalApiItem[]>([]);
  const [loadingChemicals, setLoadingChemicals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  // export via onglet dédié

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // Protection contre les erreurs d'hydratation
  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchLock = React.useRef(false);
  const lastFetch = React.useRef<number>(0);
  const fetchChemicals = useCallback(
    async (force = false) => {
      if (fetchLock.current) return; // éviter chevauchement
      const now = Date.now();
      if (!force && now - lastFetch.current < 600) return; // anti rafale <600ms
      fetchLock.current = true;
      try {
        // si déjà des données et un fetch récent <5s, éviter refetch (sauf si force)
        if (!force && chemicals.length && now - lastFetch.current < 5000) return;
        setLoadingChemicals(true);
        setError(null);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const res = await fetch('/api/chemicals', { signal: controller.signal, cache: 'no-store' });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Chargement échoué');
        const data = await res.json();
        const arr = data.reactifs || [];

        setChemicals(arr);
        lastFetch.current = now; // mettre à jour seulement après succès
      } catch (e: any) {
        if (e?.name !== 'AbortError') setError(e.message || 'Erreur inconnue');
      } finally {
        setLoadingChemicals(false);
        fetchLock.current = false;
      }
    },
    [chemicals.length],
  );

  // Initialisation - fetch si tab=0
  useEffect(() => {
    // premier fetch via requestIdleCallback pour laisser peindre le skeleton
    if (tab === 0) {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => fetchChemicals());
      } else {
        setTimeout(() => fetchChemicals(), 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Chargement si accès direct à l'onglet sécurité
  useEffect(() => {
    if (tab === 3 && chemicals.length === 0 && !loadingChemicals) fetchChemicals();
  }, [tab, chemicals.length, loadingChemicals, fetchChemicals]);

  // Chargement inventaire à l'arrivée sur l'onglet
  useEffect(() => {
    if (tab === 0 && chemicals.length === 0 && !loadingChemicals) fetchChemicals();
  }, [tab, chemicals.length, loadingChemicals, fetchChemicals]);

  // Chargement si accès direct à l'onglet Export (tab=4)
  useEffect(() => {
    if (tab === 4 && chemicals.length === 0 && !loadingChemicals) fetchChemicals();
  }, [tab, chemicals.length, loadingChemicals, fetchChemicals]);

  const updateUrl = (newTab: number, presetId?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', String(newTab));
    if (presetId) params.set('preset', String(presetId));
    else if (newTab !== 3) params.delete('preset');
    router.replace('?' + params.toString(), { scroll: false });
  };

  const handleChange = (_: any, newValue: number) => {
    handleTabChange(newValue);
    updateUrl(newValue);
  };

  const goToPresets = (presetId?: number) => {
    handleTabChange(2);
    updateUrl(2, presetId);
  };

  const presetFocusId = (() => {
    const v = parseInt(searchParams.get('preset') || '', 10);
    return isNaN(v) ? undefined : v;
  })();

  // Colonnes d'export et mapping à plat des données
  const exportColumns: Column<ChemicalApiItem>[] = [
    { id: 'name', header: 'Nom', cell: (r) => r.name, exportValue: (r) => r.name },
    {
      id: 'formula',
      header: 'Formule',
      cell: (r) =>
        r.formula ? (
          <span style={{ fontFamily: 'monospace' }}>{parseLatexToReact(r.formula)}</span>
        ) : (
          ''
        ),
      exportValue: (r) => r.formula || '',
    },
    {
      id: 'cas',
      header: 'CAS',
      cell: (r) => r.casNumber || '-',
      exportValue: (r) => r.casNumber || '',
    },
    {
      id: 'hazard',
      header: 'Classe de danger',
      cell: (r) => r.hazardClass || r.hazard || '-',
      exportValue: (r) => r.hazardClass || r.hazard || '',
    },
    { id: 'stock', header: 'Stock', cell: (r) => r.stock, exportValue: (r) => r.stock },
    {
      id: 'location',
      header: 'Localisation',
      cell: (r) => r.location || '-',
      exportValue: (r) => r.location || '',
    },
    {
      id: 'supplier',
      header: 'Fournisseur',
      cell: (r) => r.supplier || '-',
      exportValue: (r) => r.supplier || '',
    },
    {
      id: 'supplierKind',
      header: 'Type fournisseur',
      cell: (r) => r.supplierKind || '-',
      exportValue: (r) => r.supplierKind || '',
    },
    {
      id: 'category',
      header: 'Catégorie',
      cell: (r) => r.category || '-',
      exportValue: (r) => r.category || '',
    },
    {
      id: 'molarMass',
      header: 'M.M (g/mol)',
      cell: (r) => r.molarMass ?? '-',
      exportValue: (r) => r.molarMass ?? '',
    },
    {
      id: 'density',
      header: 'd',
      cell: (r) => r.density ?? '-',
      exportValue: (r) => r.density ?? '',
    },
    {
      id: 'mp',
      header: 'Pf (°C)',
      cell: (r) => r.meltingPointC ?? '-',
      exportValue: (r) => r.meltingPointC ?? '',
    },
    {
      id: 'bp',
      header: 'Eb (°C)',
      cell: (r) => r.boilingPointC ?? '-',
      exportValue: (r) => r.boilingPointC ?? '',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (r) => {
        const label = r.stock <= 0 ? 'Rupture' : r.stock <= 5 ? 'Stock faible' : 'En stock';
        const color: 'default' | 'error' | 'warning' | 'success' =
          r.stock <= 0 ? 'error' : r.stock <= 5 ? 'warning' : 'success';
        return <Chip size="small" color={color} label={label} />;
      },
      exportValue: (r) => (r.stock <= 0 ? 'Rupture' : r.stock <= 5 ? 'Stock faible' : 'En stock'),
      getCellStyle: (r) =>
        r.stock <= 0
          ? { bg: '#fde7e9', fg: '#a50e0e', bold: true }
          : r.stock <= 5
            ? { bg: '#fff4e5', fg: '#8a5200', bold: true }
            : { bg: '#e9f7ef', fg: '#1e6b3a' },
    },
  ];

  const exportRows: ChemicalApiItem[] = React.useMemo(() => {
    const asRec = (v: unknown): Record<string, unknown> =>
      typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};
    const getName = (v: unknown): string | null =>
      typeof v === 'string'
        ? v
        : typeof v === 'object' && v && 'name' in (v as any) && typeof (v as any).name === 'string'
          ? (v as any).name
          : null;
    return chemicals.map((raw) => {
      const c = asRec(raw);
      const preset = asRec(c.reactifPreset);
      const salle = asRec(c.salle);
      const localisation = asRec(c.localisation);
      const supplierObj = asRec(c.supplier);
      const supplierName =
        getName(c.supplier) ?? (typeof c.supplier === 'string' ? (c.supplier as string) : null);
      const supplierKind =
        typeof supplierObj.kind === 'string' ? (supplierObj.kind as 'NORMAL' | 'CUSTOM') : null;
      const location = [getName(salle), getName(localisation)].filter(Boolean).join(' / ') || null;
      return {
        id: Number(c.id),
        name:
          (typeof c.name === 'string' && c.name) ||
          (typeof preset.name === 'string' ? (preset.name as string) : '—'),
        formula: (typeof c.formula === 'string'
          ? c.formula
          : typeof preset.formula === 'string'
            ? (preset.formula as string)
            : null) as string | null,
        casNumber: (typeof c.casNumber === 'string'
          ? c.casNumber
          : typeof preset.casNumber === 'string'
            ? (preset.casNumber as string)
            : null) as string | null,
        hazard: (typeof c.hazard === 'string'
          ? c.hazard
          : typeof c.hazardClass === 'string'
            ? (c.hazardClass as string)
            : typeof preset.hazardClass === 'string'
              ? (preset.hazardClass as string)
              : null) as string | null,
        hazardClass: (typeof c.hazardClass === 'string'
          ? (c.hazardClass as string)
          : typeof preset.hazardClass === 'string'
            ? (preset.hazardClass as string)
            : null) as string | null,
        category: (typeof c.category === 'string'
          ? c.category
          : typeof preset.category === 'string'
            ? (preset.category as string)
            : null) as string | null,
        supplier: supplierName,
        supplierKind,
        stock: typeof c.stock === 'number' ? (c.stock as number) : 0,
        location,
        molarMass: typeof preset.molarMass === 'number' ? (preset.molarMass as number) : null,
        density: typeof preset.density === 'number' ? (preset.density as number) : null,
        meltingPointC:
          typeof preset.meltingPointC === 'number' ? (preset.meltingPointC as number) : null,
        boilingPointC:
          typeof preset.boilingPointC === 'number' ? (preset.boilingPointC as number) : null,
        createdAt: String(c.createdAt || ''),
        updatedAt: String(c.updatedAt || ''),
      };
    });
  }, [chemicals]);

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SiMoleculer /> Réactifs
      </Typography>
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={handleChange}
        sx={{ mb: 2 }}
        variant={isMobileSmall ? 'scrollable' : 'standard'}
        scrollButtons={isMobileSmall ? 'auto' : false}
        allowScrollButtonsMobile
      >
        <Tab label="Inventaire" />
        <Tab label="Ajouter" />
        <Tab label="Presets" />
        <Tab label="Sécurité" />
        <Tab label="Export" />
      </Tabs>

      {tab === 0 && (
        <TabPanel value={tab} index={0}>
          {loadingChemicals && chemicals.length === 0 ? (
            <Stack spacing={2}>
              <Skeleton variant="rounded" height={60} />
              <Skeleton variant="rounded" height={180} />
              <Skeleton variant="rounded" height={180} />
            </Stack>
          ) : (
            <ChemicalsList
              chemicals={
                chemicals as unknown as import('@/components/chemicals/ChemicalCard').ChemicalItem[]
              }
              onRefresh={() => fetchChemicals(true)}
              onGoToPreset={(id) => goToPresets(id)}
            />
          )}
        </TabPanel>
      )}
      {tab === 1 && (
        <TabPanel value={tab} index={1}>
          {!isClient ? (
            <CircularFallback label="Chargement du formulaire…" />
          ) : (
            <Suspense fallback={<CircularFallback label="Chargement du formulaire…" />}>
              <ChemicalCreateStepper
                onCreated={async () => {
                  await fetchChemicals(true); // forcer le refresh
                  handleTabChange(0);
                }}
              />
            </Suspense>
          )}
        </TabPanel>
      )}
      {tab === 2 && (
        <TabPanel value={tab} index={2}>
          {!isClient ? (
            <CircularFallback label="Chargement des presets…" />
          ) : (
            <Suspense fallback={<CircularFallback label="Chargement des presets…" />}>
              <ReactifPresetsManager presetFocusId={presetFocusId} />
            </Suspense>
          )}
        </TabPanel>
      )}
      {tab === 3 && (
        <TabPanel value={tab} index={3}>
          {!isClient ? (
            <Stack spacing={2}>
              <Skeleton variant="text" width={240} height={32} />
              <Skeleton variant="rounded" height={120} />
              <Skeleton variant="rounded" height={120} />
            </Stack>
          ) : (
            <Suspense
              fallback={
                <Stack spacing={2}>
                  <Skeleton variant="text" width={240} height={32} />
                  <Skeleton variant="rounded" height={120} />
                  <Skeleton variant="rounded" height={120} />
                </Stack>
              }
            >
              <LabSafetyAnalysis
                chemicals={chemicals}
                loading={loadingChemicals}
                lastUpdated={chemicals.length ? new Date() : null}
              />
            </Suspense>
          )}
        </TabPanel>
      )}
      {tab === 4 && (
        <TabPanel value={tab} index={4}>
          <Box sx={{ mt: 1 }}>
            <DataExportTab
              title="Export réactifs"
              rows={exportRows}
              columns={exportColumns}
              filename="reactifs"
              defaultSelected={[
                'name',
                'formula',
                'cas',
                'hazard',
                'stock',
                'location',
                'category',
                'molarMass',
                'density',
                'status',
              ]}
            />
          </Box>
        </TabPanel>
      )}
    </Box>
  );
}

export default function ReactifsPage() {
  return (
    <Suspense
      fallback={
        <Box p={3}>
          <CircularProgress />
        </Box>
      }
    >
      <ReactifsPageInner />
    </Suspense>
  );
}

// Dialog outside to avoid re-mounting on tab switches
// We must export default above; so include dialog within the inner component:
