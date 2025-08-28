'use client';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Box, Button, Stack, Paper } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { createChemical } from '@/lib/services/chemicals-service';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import {
  StepIndicator,
  Step1,
  Step2,
  FormState,
  ReactifPresetDTO,
  ChemicalCreateStepperProps,
} from './ChemicalCreateStepper/index';

// --- Helpers conversion unités ---
function normalizeQuantity(value: number, unit: string) {
  if (unit === 'kg') return value * 1000; // en g
  if (unit === 'L') return value * 1000; // en mL
  return value; // g, mL, mol, pièce laissés tel quel
}

function convertDisplay(value: number, unit: string) {
  if (unit === 'g' && value >= 1000) return `${(value / 1000).toFixed(2)} kg`;
  if (unit === 'mL' && value >= 1000) return `${(value / 1000).toFixed(2)} L`;
  if (unit === 'kg') return `${(value * 1000).toFixed(0)} g`; // aide visuelle inverse
  if (unit === 'L') return `${(value * 1000).toFixed(0)} mL`;
  return undefined;
}

export function ChemicalCreateStepper({ onCreated }: ChemicalCreateStepperProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ReactifPresetDTO | null>(null);
  const [presetSearch, setPresetSearch] = useState('');
  const searchRef = useRef<NodeJS.Timeout | null>(null);
  const { showSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [salles, setSalles] = useState<any[]>([]);
  const [localisations, setLocalisations] = useState<any[]>([]);
  const [loadingSalles, setLoadingSalles] = useState(false);
  const [loadingLocalisations, setLoadingLocalisations] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: '',
    formula: '',
    casNumber: '',
    hazard: [],
    boilingPointC: null,
    meltingPointC: null,
    category: '',
    molarMass: null,
    density: null,
    quantity: 0,
    unit: 'g',
    minQuantity: 0,
    purchaseDate: null,
    expirationDate: null,
    salleId: null,
    localisationId: null,
    notes: '',
    supplierName: '',
  });

  // Form initial template
  const initialFormRef = useMemo<FormState>(
    () => ({
      name: '',
      formula: '',
      casNumber: '',
      hazard: [],
      boilingPointC: null,
      meltingPointC: null,
      category: '',
      molarMass: null,
      density: null,
      quantity: 0,
      unit: 'g',
      minQuantity: 0,
      purchaseDate: null,
      expirationDate: null,
      salleId: null,
      localisationId: null,
      notes: '',
      supplierName: '',
    }),
    [],
  );

  // Normalize chemical formula: convert unicode subscripts to digits for matching
  const canonicalFormula = React.useCallback(
    (s: string) =>
      s
        .replace(
          /[₀₁₂₃₄₅₆₇₈₉]/g,
          (m) =>
            ({
              '₀': '0',
              '₁': '1',
              '₂': '2',
              '₃': '3',
              '₄': '4',
              '₅': '5',
              '₆': '6',
              '₇': '7',
              '₈': '8',
              '₉': '9',
            })[m] || m,
        )
        .replace(/\s+/g, '')
        .trim(),
    [],
  );

  const handleCoreFieldChange = (field: 'name' | 'formula' | 'casNumber', value: string) => {
    if (applyingPreset) return; // ignore pendant application preset
    setForm((_) => ({ ...initialFormRef, [field]: value }) as FormState);
    setSelectedPreset(null);
    setSelectedCategory(null);
    setShowInlinePresetPicker(true);
    if (value && value.length >= 2) setPresetSearch(value);
    // tentative d'autofill live sur formule ou CAS si correspondance exacte (canonique)
    if (field === 'formula' && value) {
      const cf = canonicalFormula(value);
      const source = globalMeta.length ? globalMeta : presets;
      const found = source.find((p) => p.formula && canonicalFormula(p.formula) === cf);
      if (found) applyPreset(found);
    } else if (field === 'casNumber' && value) {
      const source = globalMeta.length ? globalMeta : presets;
      const found = source.find(
        (p) => p.casNumber && p.casNumber.toLowerCase() === value.toLowerCase(),
      );
      if (found) applyPreset(found);
    }
  };

  // Dynamic presets state
  const [presets, setPresets] = useState<ReactifPresetDTO[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<
    { id: number; name: string; kind?: string }[]
  >([]);
  const supplierTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [presetTotal, setPresetTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(presetTotal / pageSize));
  const [showInlinePresetPicker, setShowInlinePresetPicker] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [globalMeta, setGlobalMeta] = useState<ReactifPresetDTO[]>([]); // full preset list snapshot
  const [inventoryKeys, setInventoryKeys] = useState<Set<string>>(new Set()); // for highlighting existing items

  // Charger les fournisseurs au démarrage
  useEffect(() => {
    const loadInitialSuppliers = async () => {
      try {
        const r = await fetch('/api/suppliers?limit=50');
        if (r.ok) {
          const d = await r.json();
          setSupplierOptions(d.suppliers || []);
        }
      } catch {
        console.warn('Échec du chargement initial des fournisseurs');
      }
    };
    loadInitialSuppliers();
  }, []);

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const load = async () => {
        setLoadingPresets(true);
        try {
          const params = new URLSearchParams();
          params.set('page', String(page));
          params.set('pageSize', String(pageSize));
          if (presetSearch.trim()) params.set('q', presetSearch.trim());
          const r = await fetch(`/api/chemical-presets?${params.toString()}`);
          if (r.ok) {
            const d = await r.json();
            setPresets(d.presets || []);
            setPresetTotal(d.total || 0);
          }
        } catch {
          /* ignore */
        } finally {
          setLoadingPresets(false);
        }
      };
      load();
    }, 300);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
  }, [presetSearch, page]);

  // Categories from current page (fallback) + allCategories loaded separately
  const categories = useMemo(() => {
    if (allCategories.length) return allCategories;
    const s = new Set<string>();
    presets.forEach((p) => {
      if (p.category)
        p.category.split(',').forEach((c) => {
          const v = c.trim();
          if (v) s.add(v);
        });
      else s.add('Sans catégorie');
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [presets, allCategories]);

  const filteredPresets = useMemo(() => {
    // source: if category filter applied and we have globalMeta, start from globalMeta to include all items not just current page
    let source = selectedCategory && globalMeta.length ? globalMeta : presets;
    if (selectedCategory) {
      if (selectedCategory === 'Sans catégorie') source = source.filter((c) => !c.category);
      else
        source = source.filter((c) =>
          (c.category || '')
            .split(',')
            .map((x) => x.trim())
            .includes(selectedCategory),
        );
    }
    return source;
  }, [presets, selectedCategory, globalMeta]);

  // Load full category list once (large pageSize fetch)
  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '500');
        const r = await fetch('/api/chemical-presets?' + params.toString());
        if (r.ok) {
          const d = await r.json();
          const s = new Set<string>();
          (d.presets || []).forEach((p: ReactifPresetDTO) => {
            if (p.category)
              p.category.split(',').forEach((c: string) => {
                const v = c.trim();
                if (v) s.add(v);
              });
            else s.add('Sans catégorie');
          });
          setAllCategories(Array.from(s).sort((a, b) => a.localeCompare(b)));
          setGlobalMeta(d.presets || []);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // Load current inventory (basic keys for highlight)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/chemicals');
        if (!r.ok) return;
        const d = await r.json();
        const keys = new Set<string>();
        // API shape: { reactifs: [ { reactifPreset: {...}, stock, ... } ] }
        (d.reactifs || []).forEach((c: any) => {
          const preset = c.reactifPreset || c; // fallback if shape differs
          if (preset.casNumber) keys.add('cas:' + String(preset.casNumber).toLowerCase());
          if (preset.name) keys.add('name:' + String(preset.name).toLowerCase());
        });
        setInventoryKeys(keys);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingSalles(true);
      try {
        const r = await fetch('/api/salles');
        if (r.ok) {
          const d = await r.json();
          setSalles(d.salles || []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingSalles(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const sId = form.salleId;
    if (!sId) {
      setLocalisations([]);
      setForm((f) => ({ ...f, localisationId: null }));
      return;
    }
    const load = async () => {
      setLoadingLocalisations(true);
      try {
        const r = await fetch(`/api/localisations?salleId=${sId}`);
        if (r.ok) {
          const d = await r.json();
          setLocalisations(d.localisations || []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingLocalisations(false);
      }
    };
    load();
  }, [form.salleId]);

  const applyPreset = (p: ReactifPresetDTO) => {
    setApplyingPreset(true);
    setSelectedPreset(p);
    setForm((f) => ({
      ...f,
      name: p.name,
      formula: p.formula || '',
      casNumber: p.casNumber || '',
      hazard: p.hazardClass
        ? p.hazardClass
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        : [],
      boilingPointC: p.boilingPointC ?? null,
      meltingPointC: p.meltingPointC ?? null,
      category: p.category || '',
      molarMass: (p as any) && (p as any).molarMass !== undefined ? (p as any).molarMass : null,
      density: (p as any) && (p as any).density !== undefined ? (p as any).density : null,
    }));
    if (activeStep === 0) setActiveStep(1); // avance seulement si on était sur step 0
    setShowInlinePresetPicker(false);
    setTimeout(() => setApplyingPreset(false), 0);
  };

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, 1));
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Nom requis';
    if (form.quantity < 0) return 'Quantité négative';
    if (form.minQuantity < 0) return 'Stock minimum négatif';
    if (form.minQuantity && form.minQuantity > form.quantity) return 'Stock minimum > quantité';
    if (form.casNumber) {
      const casOk = /^\d{2,7}-\d{2}-\d$/.test(form.casNumber.trim());
      if (!casOk) return 'Format CAS invalide';
    }
    if (form.purchaseDate && form.expirationDate && form.expirationDate < form.purchaseDate)
      return 'Expiration avant achat';
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const baseQty = normalizeQuantity(form.quantity, form.unit); // store base in grams or mL conceptually
      // Resolve / pre-create supplier if custom (kind CUSTOM)
      let supplierId: number | undefined;
      if (form.supplierName.trim()) {
        const existing = supplierOptions.find(
          (s) => s.name.toLowerCase() === form.supplierName.trim().toLowerCase(),
        );
        if (existing) supplierId = existing.id;
        else {
          try {
            const r = await fetch('/api/suppliers', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: form.supplierName.trim(), kind: 'CUSTOM' }),
            });
            if (r.ok) {
              const j = await r.json();
              if (j.supplier) {
                supplierId = j.supplier.id;
                setSupplierOptions((opts) => [j.supplier, ...opts]);
              }
            }
          } catch {
            /* ignore */
          }
        }
      }
      const payload = {
        name: form.name,
        formula: form.formula || undefined,
        casNumber: form.casNumber || undefined,
        category: form.category || undefined,
        hazard: form.hazard.length ? form.hazard : undefined,
        molarMass: form.molarMass ?? undefined,
        density: (form as any).density ?? undefined,
        stock: baseQty,
        salleId: form.salleId || undefined,
        localisationId: form.localisationId || undefined,
        boilingPointC: form.boilingPointC ?? undefined,
        meltingPointC: form.meltingPointC ?? undefined,
        unit: form.unit,
        minStock: form.minQuantity || undefined,
        purchaseDate: form.purchaseDate || undefined,
        expirationDate: form.expirationDate || undefined,
        notes: form.notes || undefined,
        supplierId: supplierId,
        supplierName: supplierId ? undefined : form.supplierName || undefined,
      } as any;
      const { reactif } = await createChemical(payload as any);
      setActiveStep(0);
      setSelectedCategory(null);
      setSelectedPreset(null);
      setForm({
        name: '',
        formula: '',
        casNumber: '',
        hazard: [],
        boilingPointC: null,
        meltingPointC: null,
        category: '',
        molarMass: null,
        density: null,
        quantity: 0,
        unit: 'g',
        minQuantity: 0,
        purchaseDate: null,
        expirationDate: null,
        salleId: null,
        localisationId: null,
        notes: '',
        supplierName: '',
      });
      showSnackbar('Réactif ajouté', 'success');
      await onCreated?.(reactif || { id: Date.now(), name: payload.name, stock: payload.stock });
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <StepIndicator currentStep={activeStep} isLoading={submitting} />

      <Box sx={{ minHeight: 400 }}>
        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <Step1
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedPreset={selectedPreset}
                presetSearch={presetSearch}
                setPresetSearch={setPresetSearch}
                categories={categories}
                filteredPresets={filteredPresets}
                loadingPresets={loadingPresets}
                presetTotal={presetTotal}
                page={page}
                setPage={setPage}
                pageSize={pageSize}
                totalPages={totalPages}
                viewMode={viewMode}
                setViewMode={setViewMode}
                inventoryKeys={inventoryKeys}
                globalMeta={globalMeta}
                onPresetSelect={applyPreset}
                onAdvanceToManualEntry={() => setActiveStep(1)}
              />
            </motion.div>
          )}
          {activeStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <Step2
                form={form}
                setForm={setForm}
                selectedPreset={selectedPreset}
                presets={presets}
                globalMeta={globalMeta}
                presetSearch={presetSearch}
                setPresetSearch={setPresetSearch}
                loadingPresets={loadingPresets}
                showInlinePresetPicker={showInlinePresetPicker}
                setShowInlinePresetPicker={setShowInlinePresetPicker}
                applyingPreset={applyingPreset}
                salles={salles}
                localisations={localisations}
                loadingSalles={loadingSalles}
                loadingLocalisations={loadingLocalisations}
                supplierOptions={supplierOptions}
                supplierTimerRef={supplierTimerRef}
                setSupplierOptions={setSupplierOptions}
                error={error}
                submitting={submitting}
                onCoreFieldChange={handleCoreFieldChange}
                onApplyPreset={applyPreset}
                onSubmit={handleSubmit}
                onBack={handleBack}
                onReset={() => {
                  setActiveStep(0);
                  setSelectedPreset(null);
                  setForm(initialFormRef);
                }}
                convertDisplay={convertDisplay}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* Navigation */}
      <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
        <Box display="flex" justifyContent="space-between">
          <Stack direction="row" spacing={1}>
            <Button disabled={submitting || activeStep === 0} onClick={handleBack}>
              Précédent
            </Button>
            <Button
              color="error"
              variant="outlined"
              disabled={submitting || activeStep === 0}
              onClick={() => {
                setActiveStep(0);
                setSelectedPreset(null);
                setForm(initialFormRef);
              }}
            >
              Réinitialiser
            </Button>
          </Stack>

          <Box display="flex" gap={1}>
            {activeStep < 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!selectedPreset || submitting}
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="success"
                onClick={handleSubmit}
                disabled={!form.name.trim() || submitting}
              >
                {submitting ? 'Ajout...' : 'Ajouter le réactif'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default ChemicalCreateStepper;
