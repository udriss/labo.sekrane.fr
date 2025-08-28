'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  IconButton,
  Typography,
  TextField,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
  Slider,
  InputAdornment,
  Pagination,
} from '@mui/material';
import {
  Delete,
  Edit,
  Refresh,
  Search,
  Warning,
  CalendarToday,
  Inventory,
  LocationOn,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon,
} from '@mui/icons-material';
import { ChemicalCard, ChemicalItem } from './ChemicalCard';
import { ChemicalEditDialog } from './ChemicalEditDialog';
import { parseLatexToReact } from '@/lib/utils/latex';

interface ChemicalsListProps {
  chemicals?: ChemicalItem[]; // optionnel: si absent on fetch /api/chemicals
  onRefresh?: () => Promise<void> | void; // callback externe optionnel
  onGoToPreset?: (presetId?: number) => void; // navigation vers onglet presets
}

type Order = 'asc' | 'desc';
type OrderBy = 'name' | 'formula' | 'stock' | 'status' | 'expirationDate' | 'location';

export function ChemicalsList({
  chemicals: chemicalsProp,
  onRefresh,
  onGoToPreset,
}: ChemicalsListProps) {
  const [chemicalsState, setChemicalsState] = useState<ChemicalItem[]>(chemicalsProp || []);
  const [loadingList, setLoadingList] = useState(false);

  const mapApiChemical = (c: any): ChemicalItem => {
    const preset = c.reactifPreset || {};
    const location = [c.salle?.name, c.localisation?.name].filter(Boolean).join(' / ') || null;
    const stock: number = c.stock ?? 0;
    const minStock: number | undefined = c.minStock ?? undefined;
    let status: string | undefined;
    if (stock <= 0) status = 'OUT_OF_STOCK';
    else if (minStock != null && stock <= minStock) status = 'LOW_STOCK';
    else status = 'IN_STOCK';
    return {
      id: c.id,
      name: preset.name || '—',
      formula: preset.formula || undefined,
      casNumber: preset.casNumber || undefined,
      hazard: preset.hazardClass || undefined,
      stock,
      unit: c.unit || undefined,
      location,
      expirationDate: c.expirationDate || null,
      status,
      minQuantity: c.minStock ?? undefined,
      supplier: c.supplier?.name || undefined,
      supplierKind: c.supplier?.kind || undefined,
      minStock: c.minStock ?? undefined,
      supplierId: c.supplierId ?? c.supplier?.id ?? null,
      purchaseDate: c.purchaseDate || null,
      notes: c.notes || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      salleId: c.salle?.id ?? c.salleId ?? null,
      localisationId: c.localisation?.id ?? c.localisationId ?? null,
      reactifPresetId: c.reactifPresetId ?? preset.id,
      category: preset.category ?? null,
      hazardClass: preset.hazardClass ?? null,
      molarMass: preset.molarMass ?? null,
      density: (preset as any).density ?? null,
      meltingPointC: preset.meltingPointC ?? null,
      boilingPointC: preset.boilingPointC ?? null,
    };
  };

  const performFetch = async () => {
    if (onRefresh && chemicalsProp) {
      await onRefresh();
      return;
    }
    try {
      setLoadingList(true);
      const res = await fetch('/api/chemicals');
      if (!res.ok) {
        const txt = await res.text();
        throw new Error('Erreur chargement inventaire');
      }
      const json = await res.json();
      const arr = Array.isArray(json.reactifs) ? json.reactifs : [];
      if (arr.length) {
        const mapped = arr.map((c: any) => {
          const mc = mapApiChemical(c);
          return mc;
        });
        setChemicalsState(mapped);
      } else {
        console.debug('[ChemicalsList][debug] json missing array', Object.keys(json));
      }
    } catch (e) {
      console.error('[ChemicalsList][debug] fetch error', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!chemicalsProp) performFetch();
    // Charger la liste complète des suppliers au démarrage
    fetchAllSuppliers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chemicalsProp) {
      // Toujours normaliser via mapApiChemical pour éviter d'avoir des objets bruts (ex: supplier) au rendu
      const mapped: ChemicalItem[] = chemicalsProp.map((c: any) => {
        try {
          return mapApiChemical(c);
        } catch (e) {
          console.warn('[ChemicalsList][warn] mapApiChemical fallback', e);
          return {
            id: c.id,
            name: c.name || c.reactifPreset?.name || '—',
            stock: c.stock ?? 0,
            supplier: typeof c.supplier === 'object' && c.supplier ? c.supplier.name : c.supplier,
            supplierKind: c.supplier?.kind,
            createdAt: c.createdAt || new Date().toISOString(),
            updatedAt: c.updatedAt || new Date().toISOString(),
          } as ChemicalItem;
        }
      });
      setChemicalsState(mapped);
    }
  }, [chemicalsProp]);
  // Filters aligned with presets manager layout
  const [nameFilter, setNameFilter] = useState('');
  const [casFilter, setCasFilter] = useState('');
  const [formulaFilter, setFormulaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<ChemicalItem | null>(null);
  const [form, setForm] = useState({
    salleId: null as number | null,
    localisationId: null as number | null,
    unit: '' as string,
    minStock: '' as any,
    supplierName: '' as string,
    purchaseDate: '' as string,
    expirationDate: '' as string,
    notes: '' as string,
  });
  const [supplierOptions, setSupplierOptions] = useState<
    { id: number; name: string; kind: string }[]
  >([]);
  const [allSuppliers, setAllSuppliers] = useState<{ id: number; name: string; kind: string }[]>(
    [],
  );
  const supplierTimerRef = React.useRef<any>(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [salles, setSalles] = useState<any[]>([]);
  const [loadingSalles, setLoadingSalles] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<OrderBy>('name');
  const [quantityValues, setQuantityValues] = useState<{
    [key: string]: number;
  }>({});
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set());
  const [formStock, setFormStock] = useState<number>(0);

  // Initialize quantity values
  useEffect(() => {
    const initialQuantities: { [key: string]: number } = {};
    chemicalsState.forEach((chemical) => {
      initialQuantities[chemical.id] = chemical.stock;
    });
    setQuantityValues(initialQuantities);
  }, [chemicalsState]);

  // Load view preference
  useEffect(() => {
    try {
      const storedView = localStorage.getItem('chemicals-view');
      if (storedView) setViewMode(storedView as 'cards' | 'list');
    } catch {}
  }, []);

  const handleViewModeChange = (mode: 'cards' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('chemicals-view', mode);
    } catch {}
  };

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortData = (data: ChemicalItem[]) => {
    return [...data].sort((a, b) => {
      // Special case: location sorts by salle then localisation
      if (orderBy === 'location') {
        const [aSalle = '', aLoc = ''] = (a.location || '').split(' / ');
        const [bSalle = '', bLoc = ''] = (b.location || '').split(' / ');
        const salleCompare = aSalle.localeCompare(bSalle, undefined, {
          sensitivity: 'base',
        });
        if (salleCompare !== 0) return order === 'asc' ? salleCompare : -salleCompare;
        const locCompare = aLoc.localeCompare(bLoc, undefined, {
          sensitivity: 'base',
        });
        return order === 'asc' ? locCompare : -locCompare;
      }

      let aValue: any = a[orderBy];
      let bValue: any = b[orderBy];

      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';

      if (orderBy === 'expirationDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (bValue < aValue) {
        return order === 'asc' ? 1 : -1;
      }
      if (bValue > aValue) {
        return order === 'asc' ? -1 : 1;
      }
      return 0;
    });
  };
  const filtered = useMemo(() => {
    const n = nameFilter.trim().toLowerCase();
    const cas = casFilter.trim().toLowerCase();
    const f = formulaFilter.trim().toLowerCase();
    const out = chemicalsState.filter((c) => {
      const nameMatch = n ? c.name.toLowerCase().includes(n) : true;
      const casMatch = cas ? (c.casNumber || '').toLowerCase().includes(cas) : true;
      const formulaMatch = f ? (c.formula || '').toLowerCase().includes(f) : true;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return nameMatch && casMatch && formulaMatch && matchesStatus;
    });
    return out;
  }, [chemicalsState, nameFilter, casFilter, formulaFilter, statusFilter]);

  const sortedChemicals = viewMode === 'list' ? sortData(filtered) : filtered;

  // Pagination on the sorted/filtered array
  const total = sortedChemicals.length;
  const paginatedChemicals = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedChemicals.slice(start, start + pageSize);
  }, [sortedChemicals, page, pageSize]);

  // Reset page when filters or view changes or pageSize changes
  useEffect(() => {
    setPage(1);
  }, [nameFilter, casFilter, formulaFilter, statusFilter, viewMode, pageSize]);

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expDate = new Date(expirationDate);
    return expDate <= thirtyDaysFromNow;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'success';
      case 'LOW_STOCK':
        return 'warning';
      case 'OUT_OF_STOCK':
        return 'error';
      case 'EXPIRED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'En stock';
      case 'LOW_STOCK':
        return 'Stock faible';
      case 'OUT_OF_STOCK':
        return 'Rupture';
      case 'EXPIRED':
        return 'Expiré';
      default:
        return status || 'Inconnu';
    }
  };

  const computeStockStatus = (quantity: number, minStock: number | undefined) => {
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (minStock != null && quantity <= minStock) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const startEdit = async (chem: ChemicalItem) => {
    // Ensure salles are loaded before opening the edit dialog so helper text and localisations
    // reflect the current state immediately.
    try {
      await fetchSalles();
    } catch (e) {
      // ignore fetch errors, we'll still open the dialog
    }
    setEditing(chem);
    setForm({
      salleId: chem.salleId ?? null,
      localisationId: chem.localisationId ?? null,
      unit: chem.unit || '',
      minStock: chem.minStock != null ? String(chem.minStock) : '',
      supplierName: chem.supplier || '',
      purchaseDate: chem.purchaseDate ? chem.purchaseDate.split('T')[0] : '',
      expirationDate: chem.expirationDate ? chem.expirationDate.split('T')[0] : '',
      notes: chem.notes || '',
    });
    setFormStock(chem.stock);
    // charger quelques fournisseurs initiaux
    void fetchSuppliers('');
  };

  const fetchSuppliers = async (q: string) => {
    try {
      setLoadingSuppliers(true);
      const r = await fetch(`/api/suppliers?q=${encodeURIComponent(q)}&limit=15`);
      if (r.ok) {
        const j = await r.json();
        setSupplierOptions(j.suppliers || []);
      }
    } catch (e) {
      /* noop */
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchAllSuppliers = async () => {
    try {
      const r = await fetch('/api/suppliers?limit=100');
      if (r.ok) {
        const j = await r.json();
        setAllSuppliers(j.suppliers || []);
        // Initialiser aussi les options avec tous les suppliers
        setSupplierOptions(j.suppliers || []);
      }
    } catch (e) {
      console.error('Erreur lors du chargement des suppliers:', e);
    }
  };

  useEffect(() => {
    if (!editing) return;
    if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current);
    supplierTimerRef.current = setTimeout(() => {
      fetchSuppliers(form.supplierName.trim());
    }, 250);
    return () => {
      if (supplierTimerRef.current) clearTimeout(supplierTimerRef.current);
    };
  }, [form.supplierName, editing]);

  // When the selected salle changes in the form, clear localisationId because localisations are tied to salles
  useEffect(() => {
    // keep a ref of previous salleId to detect changes
    const prevSalleIdRef = { current: null as number | null };
    return () => {
      prevSalleIdRef.current = null;
    };
    // Note: we can't directly get previous value easily here without a dedicated ref; instead,
    // implement a simple effect that watches form.salleId changes below.
  }, []);

  // Watch for salleId changes and reset localisationId
  useEffect(() => {
    // Reset localisation when salle changes
    // This effect runs whenever form.salleId changes
    if (editing == null) return;
    // If the current localisation does not belong to the selected salle, clear it
    const selectedSalle = salles.find((s) => s.id === form.salleId);
    if (!selectedSalle) return; // nothing to do until salle resolved
    const hasLoc = selectedSalle.localisations?.some((l: any) => l.id === form.localisationId);
    if (!hasLoc && form.localisationId != null) {
      setForm((f) => ({ ...f, localisationId: null }));
    }
  }, [form.salleId, form.localisationId, salles, editing]);

  const fetchSalles = async () => {
    try {
      setLoadingSalles(true);
      const r = await fetch('/api/salles');
      if (!r.ok) throw new Error('Chargement salles échoué');
      const j = await r.json();
      setSalles(j.salles || []);
    } catch (e) {
      /* noop */
    } finally {
      setLoadingSalles(false);
    }
  };

  const createSupplierIfNeeded = async (supplierName: string): Promise<number | null> => {
    if (!supplierName.trim()) return null;

    // Vérifier si le fournisseur existe déjà
    const existing = allSuppliers.find(
      (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase(),
    );

    if (existing) {
      return existing.id;
    }

    // Ajouter un nouveau fournisseur
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supplierName.trim(),
          kind: 'CUSTOM',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSupplier = data.supplier;

        // Mettre à jour les listes locales
        setAllSuppliers((prev) => [...prev, newSupplier]);
        setSupplierOptions((prev) => [...prev, newSupplier]);

        return newSupplier.id;
      }
    } catch (error) {
      console.error('Erreur lors de la création du fournisseur:', error);
    }

    return null;
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      setLoadingAction(true);
      setError(null);
      const payload: any = { id: editing.id };
      const changes: Record<string, { before: any; after: any }> = {};

      // Gestion améliorée du fournisseur
      if (form.supplierName && form.supplierName !== (editing.supplier || '')) {
        const supplierId = await createSupplierIfNeeded(form.supplierName);
        if (supplierId) {
          payload.supplierId = supplierId;
          changes.supplier = {
            before: editing.supplier || '',
            after: form.supplierName,
          };
        } else {
          payload.supplierName = form.supplierName; // fallback
          changes.supplier = {
            before: editing.supplier || '',
            after: form.supplierName,
          };
        }
      }

      // Salle / localisation : envoyer explicitement null si réinitialisé
      if (form.salleId !== editing.salleId) {
        payload.salleId = form.salleId === undefined ? null : form.salleId;
        const beforeSalle = editing.salleId
          ? salles.find((s) => s.id === editing.salleId)?.name || 'Inconnue'
          : 'Aucune';
        const afterSalle = form.salleId
          ? salles.find((s) => s.id === form.salleId)?.name || 'Inconnue'
          : 'Aucune';
        changes.salle = { before: beforeSalle, after: afterSalle };
      } else if (form.salleId === null && editing.salleId !== null) {
        payload.salleId = null;
        const beforeSalle = editing.salleId
          ? salles.find((s) => s.id === editing.salleId)?.name || 'Inconnue'
          : 'Aucune';
        changes.salle = { before: beforeSalle, after: 'Aucune' };
      }

      if (form.localisationId !== editing.localisationId) {
        payload.localisationId = form.localisationId === undefined ? null : form.localisationId;
        const beforeLocalisation = editing.localisationId
          ? salles
              .find((s) => s.id === editing.salleId)
              ?.localisations?.find((l: any) => l.id === editing.localisationId)?.name || 'Inconnue'
          : 'Aucune';
        const afterLocalisation = form.localisationId
          ? salles
              .find((s) => s.id === form.salleId)
              ?.localisations?.find((l: any) => l.id === form.localisationId)?.name || 'Inconnue'
          : 'Aucune';
        changes.localisation = {
          before: beforeLocalisation,
          after: afterLocalisation,
        };
      } else if (form.localisationId === null && editing.localisationId !== null) {
        payload.localisationId = null;
        const beforeLocalisation = editing.localisationId
          ? salles
              .find((s) => s.id === editing.salleId)
              ?.localisations?.find((l: any) => l.id === editing.localisationId)?.name || 'Inconnue'
          : 'Aucune';
        changes.localisation = { before: beforeLocalisation, after: 'Aucune' };
      }

      if (formStock !== editing.stock) {
        payload.stock = formStock;
        changes.stock = { before: editing.stock, after: formStock };
      }

      if (form.unit !== undefined && form.unit !== editing.unit) {
        payload.unit = form.unit;
        changes.unit = { before: editing.unit || '', after: form.unit };
      }

      if (form.minStock !== '' && form.minStock !== String(editing.minStock || '')) {
        payload.minStock = parseFloat(form.minStock);
        changes.minStock = {
          before: editing.minStock || 0,
          after: parseFloat(form.minStock),
        };
      }

      if (form.purchaseDate && form.purchaseDate !== (editing.purchaseDate || '').split('T')[0]) {
        payload.purchaseDate = form.purchaseDate;
        changes.purchaseDate = {
          before: editing.purchaseDate
            ? new Date(editing.purchaseDate).toLocaleDateString('fr-FR')
            : 'Non définie',
          after: new Date(form.purchaseDate).toLocaleDateString('fr-FR'),
        };
      }

      if (
        form.expirationDate &&
        form.expirationDate !== (editing.expirationDate || '').split('T')[0]
      ) {
        payload.expirationDate = form.expirationDate;
        changes.expirationDate = {
          before: editing.expirationDate
            ? new Date(editing.expirationDate).toLocaleDateString('fr-FR')
            : 'Non définie',
          after: new Date(form.expirationDate).toLocaleDateString('fr-FR'),
        };
      }

      if (form.notes !== editing.notes) {
        payload.notes = form.notes;
        changes.notes = {
          before: editing.notes || '',
          after: form.notes || '',
        };
      }

      // Check if any changes were made
      if (Object.keys(changes).length === 0) {
        setLoadingAction(false);
        setEditing(null);
        return; // No changes to save
      }

      // Add changes to payload for API
      payload._changes = changes;

      const res = await fetch('/api/chemicals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Echec mise à jour');
      const json = await res.json();
      if (json.reactif) {
        setChemicalsState((arr) =>
          arr.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  salleId: json.reactif.salleId ?? json.reactif.salle?.id ?? null,
                  localisationId:
                    json.reactif.localisationId ?? json.reactif.localisation?.id ?? null,
                  location:
                    [json.reactif.salle?.name, json.reactif.localisation?.name]
                      .filter(Boolean)
                      .join(' / ') || null,
                  stock: json.reactif.stock ?? formStock ?? c.stock,
                  unit: json.reactif.unit || form.unit || c.unit,
                  minStock: json.reactif.minStock ?? c.minStock,
                  supplier:
                    json.reactif.supplier?.name ||
                    form.supplierName ||
                    (typeof c.supplier === 'object' && c.supplier
                      ? (c.supplier as any).name
                      : c.supplier),
                  supplierKind: json.reactif.supplier?.kind || c.supplierKind,
                  purchaseDate: json.reactif.purchaseDate || c.purchaseDate,
                  expirationDate: json.reactif.expirationDate || c.expirationDate,
                  notes: json.reactif.notes ?? form.notes ?? c.notes,
                  status:
                    (json.reactif.stock ?? formStock ?? c.stock) <= 0
                      ? 'OUT_OF_STOCK'
                      : (
                            json.reactif.minStock != null
                              ? (json.reactif.stock ?? formStock ?? c.stock) <=
                                json.reactif.minStock
                              : false
                          )
                        ? 'LOW_STOCK'
                        : 'IN_STOCK',
                }
              : c,
          ),
        );
        const updatedStock = json.reactif.stock ?? formStock;
        if (updatedStock !== undefined) {
          setQuantityValues((q) => ({ ...q, [editing.id]: updatedStock }));
        }
        // Ensure parent list is in sync with server-side changes (salle/localisation)
        try {
          if (onRefresh) await onRefresh();
          else await performFetch();
        } catch (e) {
          /* ignore refresh errors */
        }
      } else if (!chemicalsProp) {
        await performFetch();
      }
      setEditing(null);
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce réactif ?')) return;
    try {
      setLoadingAction(true);
      setError(null);
      const res = await fetch(`/api/chemicals?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Echec suppression');
      if (onRefresh) await onRefresh();
      else await performFetch();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoadingAction(false);
    }
  };

  // Debounced commit map (id -> timer)
  const commitTimers = React.useRef<Record<number, any>>({});

  const commitQuantityChange = async (chemicalId: number, newValue: number) => {
    // Clear existing timer
    if (commitTimers.current[chemicalId]) {
      clearTimeout(commitTimers.current[chemicalId]);
    }

    // Debounce API call (only after user stops dragging)
    commitTimers.current[chemicalId] = setTimeout(async () => {
      const prev = chemicalsState.find((c) => c.id === chemicalId);
      setUpdatingCards((s) => new Set([...s, chemicalId.toString()]));

      try {
        const response = await fetch('/api/chemicals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: chemicalId, stock: newValue }),
        });
        if (!response.ok) throw new Error('Erreur lors de la mise à jour de la quantité');
        const json = await response.json();
        if (json?.reactif) {
          // Mettre à jour uniquement l'élément concerné
          setChemicalsState((arr) =>
            arr.map((c) => (c.id === chemicalId ? { ...c, stock: json.reactif.stock } : c)),
          );
        } else {
          // Pas de retour ciblé -> fallback refetch partiel seulement si pas de prop passée
          if (!chemicalsProp) performFetch();
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la quantité :', error);
        // rollback
        if (prev) {
          setQuantityValues((q) => ({ ...q, [chemicalId]: prev.stock }));
        }
      } finally {
        setUpdatingCards((set) => {
          const clone = new Set(set);
          clone.delete(chemicalId.toString());
          return clone;
        });
        delete commitTimers.current[chemicalId];
      }
    }, 500); // 500ms debounce
  };

  // Slider UI updates are handled inline; commit occurs on changeCommitted via commitQuantityChange

  const getMaxSliderValue = (currentQuantity: number) => {
    return Math.max(currentQuantity * 2.5, 10);
  };

  const renderCardsView = () => (
    <Grid container spacing={2}>
      {paginatedChemicals.map((chemical) => (
        <ChemicalCard
          key={chemical.id}
          chemical={chemical}
          quantityValue={quantityValues[chemical.id]}
          isUpdating={updatingCards.has(chemical.id.toString())}
          onSliderChange={(id, v) => setQuantityValues((prev) => ({ ...prev, [id]: v }))}
          onSliderCommit={(id, v) => commitQuantityChange(id, v)}
          onEdit={startEdit}
          onDelete={handleDelete}
          getMaxSliderValue={getMaxSliderValue}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      ))}
    </Grid>
  );

  const renderListView = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Nom
                </TableSortLabel>
              </TableCell>
              <TableCell>Formule</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'stock'}
                  direction={orderBy === 'stock' ? order : 'asc'}
                  onClick={() => handleRequestSort('stock')}
                >
                  Stock
                </TableSortLabel>
              </TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'location'}
                  direction={orderBy === 'location' ? order : 'asc'}
                  onClick={() => handleRequestSort('location')}
                >
                  Localisation
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedChemicals.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {updatingCards.has(c.id.toString()) && <CircularProgress size={20} />}
                    <Typography variant="body2" fontWeight={600}>
                      {c.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {c.formula ? (
                      <span style={{ fontFamily: 'monospace' }}>
                        {parseLatexToReact(c.formula)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      minWidth: 150,
                    }}
                  >
                    <Slider
                      value={quantityValues[c.id] || c.stock}
                      onChange={(_, newValue) => {
                        const value = newValue as number;
                        // update UI immediately
                        setQuantityValues((prev) => ({
                          ...prev,
                          [c.id]: value,
                        }));
                      }}
                      onChangeCommitted={(_, newValue) => {
                        const value = newValue as number;
                        commitQuantityChange(c.id, value);
                      }}
                      min={0}
                      max={getMaxSliderValue(c.stock)}
                      step={0.1}
                      size="small"
                      sx={{
                        width: 100,
                        color:
                          c.minStock != null && (quantityValues[c.id] || c.stock) <= c.minStock
                            ? 'warning.main'
                            : 'primary.main',
                      }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      {quantityValues[c.id] || c.stock} {c.unit || ''}
                    </Typography>
                    {c.minStock != null && (quantityValues[c.id] || c.stock) <= c.minStock && (
                      <Tooltip title="Stock faible">
                        <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {(() => {
                    const currentQty =
                      typeof quantityValues[c.id] === 'number' ? quantityValues[c.id] : c.stock;
                    const dynamicStatus = computeStockStatus(currentQty, c.minStock);
                    return (
                      <Chip
                        label={getStatusLabel(dynamicStatus)}
                        color={getStatusColor(dynamicStatus) as any}
                        size="small"
                      />
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {c.salleId || c.location ? (
                    <Box>
                      <Typography variant="body2">
                        {c.location ? c.location.split(' / ')[0] : '-'}
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 0.5,
                        }}
                      >
                        <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {c.location && c.location.split(' / ')[1]
                            ? c.location.split(' / ')[1]
                            : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="Editer">
                      <IconButton size="small" onClick={() => startEdit(c)}>
                        <Edit fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                        <Delete fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {paginatedChemicals.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Aucun réactif trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box
      sx={{ p: 0 }}
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Pagination Top */}
      <Stack
        direction="row"
        spacing={2}
        justifyContent="flex-end"
        alignItems="center"
        sx={{ mt: 2 }}
      >
        <Pagination
          size="small"
          page={page}
          count={Math.max(1, Math.ceil(total / pageSize))}
          onChange={(_, v) => setPage(v)}
          showFirstButton
          showLastButton
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <IconButton
            onClick={() => handleViewModeChange('cards')}
            color={viewMode === 'cards' ? 'primary' : 'default'}
          >
            <CardViewIcon />
          </IconButton>
          <IconButton
            onClick={() => handleViewModeChange('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ListViewIcon />
          </IconButton>
          <Tooltip title="Actualiser">
            <span>
              <IconButton
                onClick={() => (onRefresh ? onRefresh() : performFetch())}
                disabled={loadingAction || loadingList}
              >
                <Refresh />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Stack>

      {/* Header recherché/tri (disposition transposée) */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ md: 'center' }}
        sx={{ my: 3, gap: 3 }}
      >
        <Stack
          sx={{
            gap: 1,
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            alignItems: { md: 'center' },
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              width: '100%',
            }}
          >
            <TextField
              size="small"
              fullWidth
              label="Nom"
              placeholder="Recherche nom..."
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flexGrow: 1, width: '100%' }}
            />
            <TextField
              size="small"
              fullWidth
              label="CAS"
              placeholder="Recherche CAS..."
              value={casFilter}
              onChange={(e) => {
                setCasFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              size="small"
              fullWidth
              label="Formule (LaTeX)"
              placeholder="Recherche formule..."
              value={formulaFilter}
              onChange={(e) => {
                setFormulaFilter(e.target.value);
                setPage(1);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexGrow: 1,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              width: '100%',
              my: { xs: 0, sm: 1 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
                flexDirection: { xs: 'row', sm: 'row' },
                gap: 1,
                width: '100%',
                my: 1,
              }}
            >
              <FormControl size="small" sx={{ minWidth: 30, width: '100%' }}>
                <InputLabel>Tri</InputLabel>
                <Select
                  value={orderBy}
                  label="Tri"
                  onChange={(e) => {
                    setOrderBy(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <MenuItem value="name">Nom</MenuItem>
                  <MenuItem value="formula">Formule</MenuItem>
                  <MenuItem value="stock">Stock</MenuItem>
                  <MenuItem value="location">Localisation</MenuItem>
                  <MenuItem value="expirationDate">Date d'expiration</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120, width: '100%' }}>
                <InputLabel>Ordre</InputLabel>
                <Select
                  value={order}
                  label="Ordre"
                  onChange={(e) => {
                    setOrder(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <MenuItem value="asc">Asc</MenuItem>
                  <MenuItem value="desc">Desc</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 50, width: '100%' }}>
                <InputLabel>Taille</InputLabel>
                <Select
                  value={pageSize}
                  label="Taille"
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {[9, 15, 25, 33, 99].map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <FormControl sx={{ minWidth: 150, flexGrow: 1, width: '100%' }} size="small">
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                label="Statut"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">Tous les statuts</MenuItem>
                <MenuItem value="IN_STOCK">En stock</MenuItem>
                <MenuItem value="LOW_STOCK">Stock faible</MenuItem>
                <MenuItem value="OUT_OF_STOCK">Rupture</MenuItem>
                <MenuItem value="EXPIRED">Expiré</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Affichage selon le mode de vue */}
      <AnimatePresence mode="popLayout">
        {viewMode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            {renderCardsView()}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {renderListView()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message si aucun réactif trouvé */}
      {sortedChemicals.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun réactif trouvé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {nameFilter || casFilter || formulaFilter || statusFilter !== 'ALL'
              ? 'Essayez de modifier vos critères de recherche.'
              : 'Commencez par ajouter un réactif chimique.'}
          </Typography>
        </Box>
      )}

      {/* Pagination Bottom */}
      {total > 0 && (
        <Stack
          direction="row"
          spacing={2}
          justifyContent="flex-end"
          alignItems="center"
          sx={{ mt: 1 }}
        >
          <Pagination
            size="small"
            page={page}
            count={Math.max(1, Math.ceil(total / pageSize))}
            onChange={(_, v) => setPage(v)}
            showFirstButton
            showLastButton
          />
        </Stack>
      )}

      {/* Dialog pour modifier un réactif (lieu + localisation) */}
      <ChemicalEditDialog
        open={!!editing}
        editing={editing}
        form={form}
        formStock={formStock}
        salles={salles}
        supplierOptions={supplierOptions}
        loadingSuppliers={loadingSuppliers}
        loadingSalles={loadingSalles}
        loadingAction={loadingAction}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
        onFormChange={(field, value) => {
          setForm((f) => ({ ...f, [field]: value }));
          // Réinitialiser la localisation quand on change de salle
          if (field === 'salleId') {
            setForm((f) => ({ ...f, localisationId: null }));
          }
        }}
        onStockChange={setFormStock}
        onGoToPreset={onGoToPreset}
      />
    </Box>
  );
}

export default ChemicalsList;
