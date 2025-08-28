'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Chip } from '@mui/material';
import { Add as AddIcon, Handyman as HandymanIcon } from '@mui/icons-material';
import { SlChemistry } from 'react-icons/sl';
import { AddMaterialStepper } from './AddMaterialStepper';
import { MaterialInventory } from './MaterialInventory';
import { MaterialCategories } from './MaterialCategories';
import { MaterialStatistics } from './MaterialStatistics';
import { MaterialEditDialog } from './MaterialEditDialog';
import { MaterialPresetsManager } from './MaterialPresetsManager';
import { PersonalMaterialsManager } from './PersonalMaterialsManager';
import DataExportTab from '@/components/export/DataExportTab';
import type { Column } from '@/types/export';

// Types exportés pour être utilisés par les sous-composants
export interface Materiel {
  id: number;
  name: string;
  discipline: string;
  categoryId?: number | null;
  category?: { id: number; name: string; discipline: string } | null;
  quantity: number;
  minStock?: number | null;
  model?: string | null;
  serialNumber?: string | null;
  supplier?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  equipmentTypeId?: string | null;
  salleId?: number | null;
  localisationId?: number | null;
  materielPersoId?: number | null;
  salle?: { id: number; name: string } | null;
  localisation?: { id: number; name: string } | null;
  materielPerso?: { id: number; name: string; caracteristiques?: any } | null;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: number;
  name: string;
  discipline: string;
  description?: string;
  presetCount?: number;
}

interface Salle {
  id: number;
  name: string;
  description?: string;
  batiment?: string;
}

interface Localisation {
  id: number;
  name: string;
  description?: string;
  salleId: number;
}

interface FormData {
  name: string;
  categoryId: number | null;
  quantity: number;
  minStock: number; // ajouté pour correspondre à MaterialEditDialog
  model: string;
  serialNumber: string;
  supplier: string;
  purchaseDate: string;
  notes: string;
  salleId: number | null;
  localisationId: number | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: object; // Add the sx property to the interface
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`materiel-tabpanel-${index}`}
      aria-labelledby={`materiel-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 0, px: 0 }}>{children}</Box>}
    </Box>
  );
}

export function MaterielManagement({
  discipline,
  initialTab = 0,
  onTabChange,
}: {
  discipline: string;
  initialTab?: number;
  onTabChange?: (tabIndex: number) => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));
  // États principaux
  const [tabValue, setTabValue] = useState(initialTab);
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [commonCategories, setCommonCategories] = useState<Category[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour l'inventaire
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<Materiel | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showAddStepper, setShowAddStepper] = useState(false);

  // États pour les fournisseurs
  const [supplierOptions, setSupplierOptions] = useState<
    { id: number; name: string; kind: string }[]
  >([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // États pour les catégories
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const [catSort, setCatSort] = useState<'name-asc' | 'name-desc' | 'count-desc'>('name-asc');
  const [allPresets, setAllPresets] = useState<any[]>([]);
  const [allMaterielPersos, setAllMaterielPersos] = useState<any[]>([]);
  const [materielPersoLoading, setMaterielPersoLoading] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<number | string>>(new Set());
  const [updatingPresetId, setUpdatingPresetId] = useState<number | null>(null);
  const [creatingCatForPreset, setCreatingCatForPreset] = useState<number | null>(null);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatDesc, setEditingCatDesc] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{
    id: number;
    name: string;
    presetCount: number;
  } | null>(null);
  const [forceDeletePending, setForceDeletePending] = useState(false);

  // État du formulaire d'édition
  const [formData, setFormData] = useState<FormData>({
    name: '',
    categoryId: null,
    quantity: 1,
    minStock: 0,
    model: '',
    serialNumber: '',
    supplier: '',
    purchaseDate: '',
    notes: '',
    salleId: null,
    localisationId: null,
  });

  // Gestion des onglets et préférences
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    try {
      localStorage.setItem(`materiel-tab-${discipline}`, newValue.toString());
    } catch {}

    // Notifier le parent du changement de tab pour update l'URL
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  const handleViewModeChange = useCallback(
    (mode: 'card' | 'list') => {
      setViewMode(mode);
      try {
        localStorage.setItem(`materiel-view-${discipline}`, mode);
      } catch {}
    },
    [discipline],
  );

  // Fonctions de chargement des données
  const fetchMateriels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/materiel?discipline=${discipline}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setMateriels(data.materiels || []);
    } catch (e) {
      setError('Erreur lors du chargement des matériels');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [discipline]);

  const fetchCategories = useCallback(async () => {
    try {
      setCatLoading(true);
      const [disciplineRes, commonRes] = await Promise.all([
        fetch(`/api/materiel/categories?discipline=${discipline}`),
        fetch(`/api/materiel/categories?discipline=commun`),
      ]);

      const [disciplineData, commonData] = await Promise.all([
        disciplineRes.json(),
        commonRes.json(),
      ]);

      if (!disciplineRes.ok) throw new Error(disciplineData.error || 'Erreur');

      setCategories(disciplineData.categories || []);

      if (commonRes.ok) {
        setCommonCategories(commonData.categories || []);
      }

      setCatError(null);
    } catch (e: any) {
      console.error(e);
      setCatError(e.message || 'Erreur catégories');
    } finally {
      setCatLoading(false);
    }
  }, [discipline]);

  // Charger les fournisseurs
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoadingSuppliers(true);
      const response = await fetch('/api/suppliers?limit=50');
      if (response.ok) {
        const data = await response.json();
        setSupplierOptions(data.suppliers || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error);
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  const fetchAllPresets = useCallback(async () => {
    try {
      const d = discipline.toLowerCase();
      const res = await fetch(`/api/materiel-presets?discipline=${d}&limit=500`);
      const data = await res.json();
      let list: any[] = data.presets || [];
      if (d !== 'commun') {
        try {
          const rc = await fetch('/api/materiel-presets?discipline=commun&limit=500');
          const dc = await rc.json();
          if (rc.ok) {
            const ids = new Set(list.map((p) => p.id));
            list = [...list, ...(dc.presets || []).filter((p: any) => !ids.has(p.id))];
          }
        } catch {}
      }
      setAllPresets(list);
    } catch (e) {
      console.error('fetchAllPresets', e);
    }
  }, [discipline]);

  const fetchAllMaterielPersos = useCallback(async () => {
    try {
      setMaterielPersoLoading(true);
      const d = discipline.toLowerCase();
      const res = await fetch(`/api/materiel-perso?discipline=${d}&limit=500`);
      const data = await res.json();
      let list: any[] = data.materielPersons || []; // Correction: materielPersons au lieu de materielPersos

      // Charger aussi les matériels perso "commun" si on n'est pas déjà sur "commun"
      if (d !== 'commun') {
        try {
          const resCommun = await fetch('/api/materiel-perso?discipline=commun&limit=500');
          const dataCommun = await resCommun.json();
          if (resCommun.ok) {
            const ids = new Set(list.map((mp) => mp.id));
            list = [
              ...list,
              ...(dataCommun.materielPersons || []).filter((mp: any) => !ids.has(mp.id)),
            ]; // Correction ici aussi
          }
        } catch (e) {
          console.error('Erreur lors du chargement des matériels perso communs:', e);
        }
      }

      if (res.ok) {
        setAllMaterielPersos(list);
      } else {
        console.error('Erreur lors du chargement des matériels perso:', data.error);
        setAllMaterielPersos([]);
      }
    } catch (e) {
      console.error('fetchAllMaterielPersos', e);
      setAllMaterielPersos([]);
    } finally {
      setMaterielPersoLoading(false);
    }
  }, [discipline]);

  const fetchSalles = async () => {
    try {
      const response = await fetch('/api/salles');
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setSalles(data.salles || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLocalisations = useCallback(async (salleId?: number) => {
    try {
      const url = salleId ? `/api/localisations?salleId=${salleId}` : '/api/localisations';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setLocalisations(data.localisations || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fonctions de gestion du matériel
  const handleMaterialComplete = async (materialData: any) => {
    try {
      let response;

      // Si le MaterielPerso a déjà été ajouté par AddMaterialStepper, on crée seulement l'entrée Materiel
      if (materialData.materielPersoId) {
        response = await fetch('/api/materiel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...materialData,
            discipline,
            materielPersoId: materialData.materielPersoId,
            materielPresetId: materialData.materielPresetId || null,
          }),
        });
      } else {
        // Ajouter un matériel standard sans caractéristiques personnalisées
        response = await fetch('/api/materiel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...materialData,
            discipline,
            materielPresetId: materialData.materielPresetId || null,
          }),
        });
      }

      if (!response.ok) throw new Error("Erreur lors de l'ajout");
      setShowAddStepper(false);
      await fetchMateriels();

      // Si on a ajouté un MaterielPerso, actualiser la liste
      if (materialData.materielPersoId) {
        await fetchAllMaterielPersos();
      }

      setTabValue(1);
    } catch (e) {
      console.error(e);
      setError("Erreur lors de l'ajout du matériel");
    }
  };

  const handleOptimisticAdd = (materialData: any) => {
    const tempMaterial: Materiel = {
      id: Date.now(),
      ...materialData,
      discipline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      salle: materialData.salleId ? salles.find((s) => s.id === materialData.salleId) : null,
      localisation: materialData.localisationId
        ? localisations.find((l) => l.id === materialData.localisationId)
        : null,
    };
    setMateriels((prev) => [tempMaterial, ...prev]);
  };

  const handleEditMateriel = (materiel: Materiel) => {
    setEditingItem(materiel);
    setFormData({
      name: materiel.name,
      categoryId: materiel.categoryId || null,
      quantity: materiel.quantity,
      minStock: materiel.minStock ?? 0,
      model: materiel.model || '',
      serialNumber: materiel.serialNumber || '',
      supplier: materiel.supplier || '',
      purchaseDate: materiel.purchaseDate ? materiel.purchaseDate.split('T')[0] : '',
      notes: materiel.notes || '',
      salleId: materiel.salleId || null,
      localisationId: materiel.localisationId || null,
    });
    if (materiel.salleId) fetchLocalisations(materiel.salleId);
    setEditDialogOpen(true);
  };

  const handleUpdateMateriel = async () => {
    if (!editingItem) return;

    // Compare current values with form data to detect actual changes
    const changes: Record<string, { old: any; new: any }> = {};

    // Check for actual changes
    if (editingItem.name !== formData.name) {
      changes.name = { old: editingItem.name, new: formData.name };
    }
    if (editingItem.categoryId !== formData.categoryId) {
      const oldCategoryName = editingItem.category?.name || '';
      const newCategoryName = formData.categoryId
        ? categories.find((c) => c.id === formData.categoryId)?.name || ''
        : '';
      changes.category = { old: oldCategoryName, new: newCategoryName };
    }
    if (editingItem.quantity !== formData.quantity) {
      changes.quantity = { old: editingItem.quantity, new: formData.quantity };
    }
    if ((editingItem.minStock ?? 0) !== formData.minStock) {
      changes.minStock = { old: editingItem.minStock ?? 0, new: formData.minStock };
    }
    if ((editingItem.model || '') !== formData.model) {
      changes.model = { old: editingItem.model || '', new: formData.model };
    }
    if ((editingItem.serialNumber || '') !== formData.serialNumber) {
      changes.serialNumber = { old: editingItem.serialNumber || '', new: formData.serialNumber };
    }
    if ((editingItem.supplier || '') !== formData.supplier) {
      changes.supplier = { old: editingItem.supplier || '', new: formData.supplier };
    }
    if ((editingItem.salleId || null) !== formData.salleId) {
      const oldSalle = editingItem.salleId
        ? salles.find((s) => s.id === editingItem.salleId)?.name
        : '';
      const newSalle = formData.salleId ? salles.find((s) => s.id === formData.salleId)?.name : '';
      changes.salle = { old: oldSalle || '', new: newSalle || '' };
    }
    if ((editingItem.localisationId || null) !== formData.localisationId) {
      const oldLoc = editingItem.localisationId
        ? localisations.find((l) => l.id === editingItem.localisationId)?.name
        : '';
      const newLoc = formData.localisationId
        ? localisations.find((l) => l.id === formData.localisationId)?.name
        : '';
      changes.localisation = { old: oldLoc || '', new: newLoc || '' };
    }
    if ((editingItem.notes || '') !== formData.notes) {
      changes.notes = { old: editingItem.notes || '', new: formData.notes };
    }

    const purchaseDateOld = editingItem.purchaseDate ? editingItem.purchaseDate.split('T')[0] : '';
    if (purchaseDateOld !== formData.purchaseDate) {
      changes.purchaseDate = { old: purchaseDateOld, new: formData.purchaseDate };
    }

    // If no changes detected, don't send request
    if (Object.keys(changes).length === 0) {
      setEditDialogOpen(false);
      setEditingItem(null);
      return;
    }

    try {
      const response = await fetch('/api/materiel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          ...formData,
          purchaseDate: formData.purchaseDate
            ? new Date(formData.purchaseDate).toISOString()
            : undefined,
          _changes: changes, // Send changes for notification
        }),
      });
      if (!response.ok) throw new Error('Erreur lors de la modification');

      // L'API renvoie { materiel: {...} }
      const apiPayload = await response.json();
      const updatedMateriel = apiPayload.materiel || apiPayload; // fallback si structure change

      // Mise à jour ciblée sans re-fetch global
      setMateriels((prev) =>
        prev.map((item) => {
          if (item.id !== editingItem.id) return item;
          return {
            ...item, // conserver d'éventuels champs locaux non retournés
            ...updatedMateriel,
            salle: formData.salleId ? salles.find((s) => s.id === formData.salleId) : null,
            localisation: formData.localisationId
              ? localisations.find((l) => l.id === formData.localisationId)
              : null,
          } as typeof item;
        }),
      );

      setEditDialogOpen(false);
      setEditingItem(null);
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la modification du matériel');
    }
  };

  const handleDeleteMateriel = async (materiel: Materiel) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${materiel.name}" ?`)) return;
    try {
      const response = await fetch(`/api/materiel?id=${materiel.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erreur lors de la suppression');
      await fetchMateriels();
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la suppression du matériel');
    }
  };

  const handleQuantityChange = async (materielId: number, newQuantity: number) => {
    // Optimistic update
    setMateriels((prev) =>
      prev.map((item) => (item.id === materielId ? { ...item, quantity: newQuantity } : item)),
    );

    try {
      const response = await fetch('/api/materiel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: materielId,
          quantity: newQuantity,
        }),
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la quantité');
      }
      // No need to re-fetch, the state is already updated optimistically
    } catch (e) {
      console.error(e);
      setError('Erreur lors de la mise à jour de la quantité, restauration des données.');
      // Rollback on error
      await fetchMateriels();
    }
  };

  const handleInputChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };
        // Si la salle change, reset localisation localement et fetch la liste
        if (field === 'salleId') {
          const newSalleId = value as number | null;
          if (newSalleId && newSalleId !== prev.salleId) {
            fetchLocalisations(newSalleId);
            next.localisationId = null;
          }
        }
        return next;
      });
    },
    [fetchLocalisations],
  );

  const handleSalleChange = (value: number | null) => handleInputChange('salleId', value);
  const handleLocalisationChange = (value: number | null) =>
    handleInputChange('localisationId', value);

  // Fonctions pour la gestion des catégories
  const updatePresetCategoryId = async (preset: any, newCategoryId: number | null) => {
    try {
      setUpdatingPresetId(preset.id);
      const body: any = {
        name: preset.name,
        categoryId: newCategoryId,
        discipline: preset.discipline,
        description: preset.description || null,
        defaultQty: preset.defaultQty || null,
      };
      const res = await fetch(`/api/materiel-presets/${preset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Maj preset impossible');
      setAllPresets((prev) => prev.map((p) => (p.id === preset.id ? data : p)));
      fetchCategories();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUpdatingPresetId(null);
    }
  };

  const createCategoryInline = async (
    name: string,
    disciplineCat: string,
  ): Promise<number | null> => {
    try {
      if (!name.trim()) return null;
      const res = await fetch('/api/materiel/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), discipline: disciplineCat.toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 409) throw new Error(data.error || 'Création impossible');

      let id: number | null = null;
      if (res.ok) {
        id = data?.id ?? data?.category?.id ?? null;
      } else if (res.status === 409) {
        await fetchCategories();
        const found = categories.find(
          (c) =>
            c.name?.toLowerCase() === name.trim().toLowerCase() &&
            (c.discipline?.toLowerCase?.() ?? discipline.toLowerCase()) ===
              disciplineCat.toLowerCase(),
        );
        id = found?.id ?? null;
      }
      if (!id) await fetchCategories();
      return id;
    } catch (e: any) {
      alert(e.message);
      return null;
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
    setEditingCatDesc(cat.description || '');
  };

  const cancelEditCategory = () => {
    setEditingCatId(null);
    setEditingCatName('');
    setEditingCatDesc('');
  };

  const saveEditCategory = async () => {
    if (!editingCatId) return;
    try {
      const res = await fetch('/api/materiel/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingCatId,
          name: editingCatName.trim(),
          description: editingCatDesc || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Modification impossible');
      cancelEditCategory();
      await fetchCategories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const confirmDeleteCategory = (cat: Category) => {
    const count = allPresets.filter((p) => p.categoryId === cat.id).length;
    setDeleteDialog({ id: cat.id, name: cat.name, presetCount: count });
  };

  const performDeleteCategory = async (force = false) => {
    if (!deleteDialog) return;
    try {
      setForceDeletePending(true);
      const res = await fetch(
        `/api/materiel/categories?id=${deleteDialog.id}${force ? '&force=1' : ''}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (res.status === 409 && data.requiresForce) {
        setDeleteDialog((d) => d && { ...d, presetCount: data.presetCount });
        setForceDeletePending(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Suppression impossible');
      setDeleteDialog(null);
      await fetchCategories();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setForceDeletePending(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    try {
      const storedTab = localStorage.getItem(`materiel-tab-${discipline}`);
      if (storedTab) setTabValue(parseInt(storedTab, 10));
      const storedView = localStorage.getItem(`materiel-view-${discipline}`);
      if (storedView) setViewMode(storedView as 'card' | 'list');
    } catch {}
    (async () => {
      await Promise.all([
        fetchMateriels(),
        fetchCategories(),
        fetchSalles(),
        fetchLocalisations(),
        fetchSuppliers(),
      ]);
    })();
  }, [discipline, fetchMateriels, fetchCategories, fetchSuppliers, fetchLocalisations]);

  useEffect(() => {
    if (tabValue === 2 || tabValue === 3 || tabValue === 4) {
      fetchAllPresets();
      fetchAllMaterielPersos();
    }
  }, [tabValue, fetchAllPresets, fetchAllMaterielPersos]);

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <Box
        className="flex items-center justify-between mb-4"
        sx={{
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: 1,
        }}
      >
        <Typography
          variant="h4"
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            {discipline?.toLowerCase() === 'chimie' ? (
              // use relative sizing so the icon centers with the text
              <SlChemistry size="2em" />
            ) : (
              // inherit font size so MUI icon matches text height and centers
              <HandymanIcon fontSize="medium" />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
            Matériel&nbsp;
            <Box component="strong" sx={{ fontWeight: 700 }}>
              {discipline.charAt(0).toUpperCase() + discipline.slice(1)}
            </Box>
          </Box>
        </Typography>
        <Button
          variant="outlined"
          onClick={() => {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete('discipline');
            window.location.href = '/materiel';
          }}
          fullWidth={isMobile}
        >
          Changer de discipline
        </Button>
      </Box>

      {error && (
        <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          allowScrollButtonsMobile
        >
          <Tab label="Inventaire" />
          <Tab label="Ajouter" />
          <Tab label="Presets" />
          <Tab label="Perso" />
          <Tab label="Catégories" />
          <Tab label="Export" />
          {/* <Tab label="Statistiques" /> */}
        </Tabs>
      </Box>

      <TabPanel
        value={tabValue}
        index={0}
        sx={{
          p: 0,
        }}
      >
        <MaterialInventory
          materiels={materiels}
          categories={categories}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          viewMode={viewMode}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
          onViewModeChange={handleViewModeChange}
          onEditMateriel={handleEditMateriel}
          onDeleteMateriel={handleDeleteMateriel}
          onQuantityChange={handleQuantityChange}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <AddMaterialStepper
          onComplete={handleMaterialComplete}
          onCancel={() => setShowAddStepper(false)}
          onOptimisticAdd={handleOptimisticAdd}
          discipline={discipline}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <MaterialPresetsManager discipline={discipline} />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <PersonalMaterialsManager discipline={discipline} />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <MaterialCategories
          discipline={discipline}
          categories={categories}
          commonCategories={commonCategories}
          allPresets={allPresets}
          allMaterielPersos={allMaterielPersos}
          catLoading={catLoading}
          materielPersoLoading={materielPersoLoading}
          catError={catError}
          catSearch={catSearch}
          catSort={catSort}
          editingCatId={editingCatId}
          editingCatName={editingCatName}
          editingCatDesc={editingCatDesc}
          updatingPresetId={updatingPresetId}
          creatingCatForPreset={creatingCatForPreset}
          expandedCats={expandedCats}
          onCatSearchChange={setCatSearch}
          onCatSortChange={setCatSort}
          onStartEditCategory={startEditCategory}
          onCancelEditCategory={cancelEditCategory}
          onSaveEditCategory={saveEditCategory}
          onConfirmDeleteCategory={confirmDeleteCategory}
          onUpdatePresetCategoryId={updatePresetCategoryId}
          onCreateCategoryInline={createCategoryInline}
          onFetchCategories={fetchCategories}
          setCatError={setCatError}
          setEditingCatName={setEditingCatName}
          setEditingCatDesc={setEditingCatDesc}
          setExpandedCats={setExpandedCats}
          setCreatingCatForPreset={setCreatingCatForPreset}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        {/* Export onglet */}
        <Box sx={{ mt: 1 }}>
          {(() => {
            const columns: Column<Materiel>[] = [
              { id: 'name', header: 'Nom', cell: (r) => r.name, exportValue: (r) => r.name },
              {
                id: 'category',
                header: 'Catégorie',
                cell: (r) => r.category?.name || '-',
                exportValue: (r) => r.category?.name || '',
              },
              {
                id: 'quantity',
                header: 'Quantité',
                cell: (r) => r.quantity,
                exportValue: (r) => r.quantity,
              },
              {
                id: 'minStock',
                header: 'Seuil min.',
                cell: (r) => r.minStock ?? '-',
                exportValue: (r) => (r.minStock ?? '').toString(),
              },
              {
                id: 'status',
                header: 'Statut',
                cell: (r) => {
                  const label =
                    r.quantity <= 0
                      ? 'Rupture'
                      : r.minStock != null && r.quantity <= r.minStock
                        ? 'Stock faible'
                        : 'En stock';
                  const color: 'default' | 'error' | 'warning' | 'success' =
                    r.quantity <= 0
                      ? 'error'
                      : r.minStock != null && r.quantity <= r.minStock
                        ? 'warning'
                        : 'success';
                  return <Chip size="small" color={color} label={label} />;
                },
                exportValue: (r) =>
                  r.quantity <= 0
                    ? 'Rupture'
                    : r.minStock != null && r.quantity <= r.minStock
                      ? 'Stock faible'
                      : 'En stock',
                getCellStyle: (r) =>
                  r.quantity <= 0
                    ? { bg: '#fde7e9', fg: '#a50e0e', bold: true }
                    : r.minStock != null && r.quantity <= r.minStock
                      ? { bg: '#fff4e5', fg: '#8a5200', bold: true }
                      : { bg: '#e9f7ef', fg: '#1e6b3a' },
              },
              {
                id: 'location',
                header: 'Localisation',
                cell: (r) =>
                  [r.salle?.name, r.localisation?.name].filter(Boolean).join(' / ') || '-',
                exportValue: (r) =>
                  [r.salle?.name, r.localisation?.name].filter(Boolean).join(' / '),
              },
              {
                id: 'supplier',
                header: 'Fournisseur',
                cell: (r) => r.supplier || '-',
                exportValue: (r) => r.supplier || '',
              },
            ];
            return (
              <DataExportTab
                title={`Inventaire matériel - ${discipline}`}
                rows={materiels}
                columns={columns}
                filename={`materiel_${discipline}`}
              />
            );
          })()}
        </Box>
      </TabPanel>

      {/* <TabPanel value={tabValue} index={5}>
        <MaterialStatistics materiels={materiels} categories={categories} discipline={discipline} />
      </TabPanel> */}

      <MaterialEditDialog
        open={editDialogOpen}
        editingItem={editingItem}
        formData={formData}
        categories={categories}
        salles={salles}
        localisations={localisations}
        supplierOptions={supplierOptions}
        loadingSuppliers={loadingSuppliers}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleUpdateMateriel}
        onInputChange={handleInputChange}
        onSalleChange={handleSalleChange}
        onLocalisationChange={handleLocalisationChange}
      />

      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Supprimer la catégorie</DialogTitle>
        <DialogContent>
          {deleteDialog && deleteDialog.presetCount > 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Cette catégorie contient {deleteDialog.presetCount} preset(s). Les presets seront
              réassignés à "Sans catégorie" si vous confirmez.
            </Alert>
          ) : (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Confirmez la suppression de la catégorie "{deleteDialog?.name}".
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Annuler</Button>
          {deleteDialog && deleteDialog.presetCount > 0 && (
            <Button
              color="warning"
              onClick={() => performDeleteCategory(true)}
              disabled={forceDeletePending}
            >
              {forceDeletePending ? 'Suppression...' : 'Forcer la suppression'}
            </Button>
          )}
          {deleteDialog && deleteDialog.presetCount === 0 && (
            <Button
              color="error"
              onClick={() => performDeleteCategory(true)}
              disabled={forceDeletePending}
            >
              {forceDeletePending ? 'Suppression...' : 'Supprimer'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MaterielManagement;
