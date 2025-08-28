import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button } from '@mui/material';
import { materielPresetsService } from '@/lib/services/materiel-presets-service';
import { useSnackbar } from '@/components/providers/SnackbarProvider';
import { useDebounce } from '@/lib/hooks/useDebounce';
import {
  StepIndicator,
  CharacteristicDialog,
  Step1,
  Step2,
  Step3,
  MaterialFormData,
  CustomCharacteristic,
  AddMaterialStepperProps,
  DISCIPLINES,
} from './AddMaterialStepper/index';

export function AddMaterialStepper({
  onComplete,
  onCancel,
  isLoading,
  onOptimisticAdd,
  discipline,
}: AddMaterialStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<any | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<'preset' | 'perso' | null>(null);
  const capitalize = (val: string) => val.charAt(0).toUpperCase() + val.slice(1);
  const lockedDiscipline = discipline ? capitalize(discipline) : undefined;

  const [formData, setFormData] = useState<MaterialFormData>({
    name: '',
    categoryId: null,
    discipline: lockedDiscipline || '',
    description: '',
    quantity: 1,
    minStock: 1,
    caracteristiques: [],
  });

  // Keep discipline synced if parent changes
  useEffect(() => {
    if (lockedDiscipline) {
      setFormData((prev: MaterialFormData) => ({ ...prev, discipline: lockedDiscipline }));
    }
  }, [lockedDiscipline]);

  // States pour les presets
  const [presets, setPresets] = useState<any[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<any | null>(null);
  const [editing, setEditing] = useState<Record<number, any>>({});

  // States pour les matériels personnalisés
  const [materielPersos, setMaterielPersos] = useState<any[]>([]);
  const [loadingMaterielPersos, setLoadingMaterielPersos] = useState(false);

  // States pour les catégories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catInput, setCatInput] = useState('');
  const [categoriesInfo, setCategoriesInfo] = useState<
    Array<{ id: number; name: string; discipline: string }>
  >([]);
  const [disciplineLockedByCategory, setDisciplineLockedByCategory] = useState(false);

  // États pour le système de localisation
  const [salles, setSalles] = useState<any[]>([]);
  const [localisations, setLocalisations] = useState<any[]>([]);
  const [loadingSalles, setLoadingSalles] = useState(false);
  const [loadingLocalisations, setLoadingLocalisations] = useState(false);

  // État pour les fournisseurs
  const [suppliers, setSuppliers] = useState<Array<{ id: number; name: string }>>([]);

  // États pour les caractéristiques personnalisées
  const [customCharacteristicDialog, setCustomCharacteristicDialog] = useState(false);
  const [editingCharacteristic, setEditingCharacteristic] = useState<CustomCharacteristic | null>(
    null,
  );

  const { showSnackbar } = useSnackbar();
  const debouncedSearch = useDebounce(search, 300);

  // Vérifie si le matériel est modifié vs preset selon règles demandées
  const isModifiedFromPreset = (): boolean => {
    if (!selectedPreset) return false;
    const presetCategoryId = selectedPreset.categoryId || selectedPreset.category?.id || null;
    const presetName = selectedPreset.name || '';
    const presetSupplier = selectedPreset.supplier || '';
    const presetPurchaseDate = selectedPreset.purchaseDate || '';

    // Helper compare characteristics (order-insensitive per field)
    const normalizeChars = (arr: CustomCharacteristic[] = []) =>
      arr
        .map((c) => ({
          nom: (c.nom || '').toString(),
          unite: c.unite || '',
          valeur: [...c.valeur].map((v) => String(v)).sort(),
        }))
        .sort((a, b) => a.nom.localeCompare(b.nom) || (a.unite || '').localeCompare(b.unite || ''));
    const baselineChars = normalizeChars(selectedPreset.caracteristiques || []);
    const currentChars = normalizeChars(formData.caracteristiques || []);
    const charsEqual =
      baselineChars.length === currentChars.length &&
      baselineChars.every(
        (bc, i) =>
          bc.nom === currentChars[i].nom &&
          bc.unite === currentChars[i].unite &&
          bc.valeur.join('\u0001') === currentChars[i].valeur.join('\u0001'),
      );

    // Champs significatifs: name, categoryId, supplier, purchaseDate, caracteristiques (changed vs baseline)
    const changedName = (formData.name || '') !== presetName;
    const changedCategory = (formData.categoryId ?? null) !== (presetCategoryId ?? null);
    const changedSupplier = (formData.supplier || '') !== presetSupplier;
    const changedPurchaseDate = (formData.purchaseDate || '') !== presetPurchaseDate;
    const hasCustomChange = !charsEqual;

    return (
      changedName || changedCategory || changedSupplier || changedPurchaseDate || hasCustomChange
    );
  };

  const fetchPresets = useCallback(async () => {
    try {
      setLoadingPresets(true);
      const disciplineToSearch = formData.discipline || lockedDiscipline;

      const data = await materielPresetsService.getPresets({
        search: debouncedSearch,
        limit: 100,
        discipline: disciplineToSearch ? disciplineToSearch.toLowerCase() : undefined,
      });

      let list = data.presets || [];
      // Also load "commun" presets if discipline is set and not already commun
      if (disciplineToSearch && disciplineToSearch.toLowerCase() !== 'commun') {
        try {
          const common = await materielPresetsService.getPresets({
            search: debouncedSearch,
            limit: 100,
            discipline: 'commun',
          });
          const existingIds = new Set(list.map((p: any) => p.id));
          const merged = [
            ...list,
            ...(common.presets || []).filter((p: any) => !existingIds.has(p.id)),
          ];
          list = merged;
        } catch (e) {
          /* ignore common fetch errors */
        }
      }
      setPresets(list);
    } catch (e: any) {
      showSnackbar(`Erreur: ${e.message}`, 'error');
    } finally {
      setLoadingPresets(false);
    }
  }, [debouncedSearch, showSnackbar, formData.discipline, lockedDiscipline]);

  const fetchMaterielPersos = useCallback(async () => {
    try {
      setLoadingMaterielPersos(true);
      const disciplineToSearch = formData.discipline || lockedDiscipline;

      const params = new URLSearchParams();
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (disciplineToSearch) params.append('discipline', disciplineToSearch.toLowerCase());
      params.append('limit', '100');

      const response = await fetch(`/api/materiel-perso?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let list = data.materielPersons || []; // Correction: utiliser materielPersons au lieu de materiels

        // Also load "commun" materiel-persos if discipline is set and not already commun
        if (disciplineToSearch && disciplineToSearch.toLowerCase() !== 'commun') {
          try {
            const commonParams = new URLSearchParams();
            if (debouncedSearch) commonParams.append('search', debouncedSearch);
            commonParams.append('discipline', 'commun');
            commonParams.append('limit', '100');

            const commonResponse = await fetch(`/api/materiel-perso?${commonParams.toString()}`);
            if (commonResponse.ok) {
              const commonData = await commonResponse.json();
              const existingIds = new Set(list.map((mp: any) => mp.id));
              const merged = [
                ...list,
                ...(commonData.materielPersons || []).filter((mp: any) => !existingIds.has(mp.id)), // Correction: utiliser materielPersons
              ];
              list = merged;
            }
          } catch (e) {
            /* ignore common fetch errors */
          }
        }
        setMaterielPersos(list);
      }
    } catch (e: any) {
      showSnackbar(`Erreur lors du chargement des matériels personnalisés: ${e.message}`, 'error');
    } finally {
      setLoadingMaterielPersos(false);
    }
  }, [debouncedSearch, showSnackbar, formData.discipline, lockedDiscipline]);

  const fetchCategories = useCallback(async () => {
    try {
      if (!lockedDiscipline && !formData.discipline) return;
      setCatLoading(true);
      const d = (formData.discipline || lockedDiscipline)!.toLowerCase();
      const res = await fetch(`/api/materiel/categories?discipline=${encodeURIComponent(d)}`);
      const data = await res.json();
      if (res.ok) {
        let names: string[] = (data.categories || []).map((c: any) => c.name);
        let infos: Array<{ id: number; name: string; discipline: string }> = (
          data.categories || []
        ).map((c: any) => ({ id: c.id, name: c.name, discipline: c.discipline }));
        // Add commun categories too
        if (d !== 'commun') {
          try {
            const rc = await fetch('/api/materiel/categories?discipline=commun');
            const dc = await rc.json();
            if (rc.ok) {
              const commonCats = (dc.categories || []) as any[];
              const commonNames = commonCats.map((c: any) => c.name);
              names = Array.from(new Set([...names, ...commonNames]));
              const key = (x: any) => `${x.name.toLowerCase()}::${x.discipline.toLowerCase()}`;
              const map = new Map<string, any>();
              [
                ...infos,
                ...commonCats.map((c: any) => ({
                  id: c.id,
                  name: c.name,
                  discipline: c.discipline,
                })),
              ].forEach((c: any) => {
                map.set(key(c), c);
              });
              infos = Array.from(map.values());
            }
          } catch {}
        }
        names.sort((a, b) => a.localeCompare(b));
        setAvailableCategories(names);
        setCategoriesInfo(infos);
      }
    } catch (e) {
      /* ignore */
    } finally {
      setCatLoading(false);
    }
  }, [formData.discipline, lockedDiscipline]);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);
  useEffect(() => {
    fetchMaterielPersos();
  }, [fetchMaterielPersos]);
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Charger les salles au montage
  useEffect(() => {
    const fetchSalles = async () => {
      setLoadingSalles(true);
      try {
        const response = await fetch('/api/salles');
        if (response.ok) {
          const data = await response.json();
          setSalles(data.salles || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des salles:', error);
      } finally {
        setLoadingSalles(false);
      }
    };

    fetchSalles();
  }, []);

  // Charger les localisations quand une salle est sélectionnée
  useEffect(() => {
    const fetchLocalisations = async () => {
      if (!formData.salleId) {
        setLocalisations([]);
        return;
      }

      setLoadingLocalisations(true);
      try {
        const response = await fetch(`/api/localisations?salleId=${formData.salleId}`);
        if (response.ok) {
          const data = await response.json();
          setLocalisations(data.localisations || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des localisations:', error);
      } finally {
        setLoadingLocalisations(false);
      }
    };

    fetchLocalisations();
  }, [formData.salleId]);

  // Reset localisation when salle changes
  useEffect(() => {
    setFormData((prev: MaterialFormData) => ({ ...prev, localisationId: null }));
  }, [formData.salleId]);

  // Charger la liste des fournisseurs depuis l'API suppliers
  useEffect(() => {
    const fetchSuppliersLocal = async () => {
      try {
        const response = await fetch('/api/suppliers?limit=50');
        if (response.ok) {
          const data = await response.json();
          setSuppliers(data.suppliers || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des fournisseurs:', error);
      }
    };

    fetchSuppliersLocal();
  }, []);

  const createCategoryIfNeededStep2 = useCallback(
    async (name: string) => {
      const n = name.trim();
      if (!n) return false;
      const exists = availableCategories.some((c) => c.toLowerCase() === n.toLowerCase());
      if (exists) return true;
      try {
        const d = (formData.discipline || lockedDiscipline || 'Commun').toLowerCase();
        const res = await fetch('/api/materiel/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: n, discipline: d }),
        });
        // accept 200/201 or 409 already exists
        if (!res.ok && res.status !== 409) return false;
        setAvailableCategories((prev) => Array.from(new Set([...prev, n])));
        // Refresh categoriesInfo snapshot for immediate availability/locking
        try {
          const resp = await fetch(`/api/materiel/categories?discipline=${encodeURIComponent(d)}`);
          if (resp.ok) {
            const data = await resp.json();
            const names = (data.categories || []).map((c: any) => c.name) as string[];
            const infos: Array<{ id: number; name: string; discipline: string }> = (
              data.categories || []
            ).map((c: any) => ({ id: c.id, name: c.name, discipline: c.discipline }));
            // merge common when applicable
            if (d !== 'commun') {
              try {
                const rc = await fetch('/api/materiel/categories?discipline=commun');
                if (rc.ok) {
                  const dc = await rc.json();
                  const commonInfos = (dc.categories || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    discipline: c.discipline,
                  }));
                  const key = (x: any) => `${x.name.toLowerCase()}::${x.discipline.toLowerCase()}`;
                  const map = new Map<string, any>();
                  [...infos, ...commonInfos].forEach((c: any) => map.set(key(c), c));
                  setCategoriesInfo(Array.from(map.values()));
                  setAvailableCategories(
                    Array.from(new Set([...names, ...commonInfos.map((c: any) => c.name)])).sort(),
                  );
                } else {
                  setCategoriesInfo(infos);
                }
              } catch {
                setCategoriesInfo(infos);
              }
            } else {
              setCategoriesInfo(infos);
            }
          }
        } catch {}
        return true;
      } catch {
        return false;
      }
    },
    [availableCategories, formData.discipline, lockedDiscipline],
  );

  const filteredPresets = (() => {
    const d = (formData.discipline || lockedDiscipline || '').toLowerCase();
    const allowDiscipline = (pd: string) => {
      const x = pd.toLowerCase();
      if (!d) return true;
      return x === d || x === 'commun';
    };
    const base = presets.filter((p) => allowDiscipline(p.discipline || ''));
    if (!selectedCategory) return base;
    return base.filter((p) => {
      if (!p.category) return selectedCategory === 'Sans catégorie';
      return p.category === selectedCategory;
    });
  })();

  const filteredMaterielPersos = (() => {
    const d = (formData.discipline || lockedDiscipline || '').toLowerCase();
    const allowDiscipline = (pd: string) => {
      const x = pd.toLowerCase();
      if (!d) return true;
      return x === d || x === 'commun';
    };
    const base = materielPersos.filter((mp) => allowDiscipline(mp.discipline || ''));
    if (!selectedCategory) return base;
    return base.filter((mp) => {
      if (!mp.categorie?.name) return selectedCategory === 'Sans catégorie';
      return mp.categorie.name === selectedCategory;
    });
  })();

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset);
    setSelectedSourceType('preset');

    const presetDiscipline = preset.discipline || '';
    // Convertir la discipline en format majuscule pour matcher DISCIPLINES
    const normalizedDiscipline =
      presetDiscipline.charAt(0).toUpperCase() + presetDiscipline.slice(1).toLowerCase();
    const categorieId = preset.categoryId || preset.category?.id || null;

    setFormData((prev: MaterialFormData) => ({
      ...prev,
      name: preset.name,
      categoryId: categorieId,
      discipline: normalizedDiscipline,
      description: preset.description || '',
      quantity: preset.defaultQty || 1,
      // Initialiser les champs utilisés dans la détection de modification
      model: preset.model || '',
      serialNumber: preset.serialNumber || '',
      supplier: preset.supplier || '',
      purchaseDate: preset.purchaseDate || '',
    }));

    if (normalizedDiscipline && !lockedDiscipline) {
      setDisciplineLockedByCategory(true);
    }

    setCurrentStep(1);
  };

  const handleMaterielPersoSelect = (materielPerso: any) => {
    setSelectedPreset(materielPerso);
    setSelectedSourceType('perso');

    const mpDiscipline = materielPerso.discipline || '';
    // Convertir la discipline en format majuscule pour matcher DISCIPLINES
    const normalizedDiscipline =
      mpDiscipline.charAt(0).toUpperCase() + mpDiscipline.slice(1).toLowerCase();
    const categorieId = materielPerso.categorieId || materielPerso.categorie?.id || null;

    setFormData((prev: MaterialFormData) => ({
      ...prev,
      name: materielPerso.name,
      categoryId: categorieId,
      discipline: normalizedDiscipline,
      description: materielPerso.description || '',
      quantity: materielPerso.defaultQty || 1,
      caracteristiques: materielPerso.caracteristiques || [],
      // Initialiser les champs utilisés dans la détection de modification
      model: materielPerso.model || '',
      serialNumber: materielPerso.serialNumber || '',
      supplier: materielPerso.supplier || '',
      purchaseDate: materielPerso.purchaseDate || '',
    }));

    if (normalizedDiscipline && !lockedDiscipline) {
      setDisciplineLockedByCategory(true);
    }

    setCurrentStep(1);
  };

  const handlePresetSave = async (presetData: any) => {
    try {
      if (presetData.id) {
        const updated = await materielPresetsService.updatePreset(presetData.id, presetData);
        setPresets((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showSnackbar('Preset mis à jour', 'success');
      } else {
        const created = await materielPresetsService.createPreset(presetData);
        setPresets((prev) => [created, ...prev]);
        showSnackbar('Preset ajouté', 'success');
      }
      setEditing({});
      setCreating(null);
    } catch (e: any) {
      if (e.message.includes('409') || e.message.includes('déjà existant')) {
        showSnackbar('Un preset avec ce nom existe déjà pour cette discipline', 'error');
      } else {
        showSnackbar(`Erreur: ${e.message}`, 'error');
      }
    }
  };

  const handlePresetDelete = async (id: number) => {
    try {
      await materielPresetsService.deletePreset(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      showSnackbar('Preset supprimé', 'success');
    } catch (e: any) {
      showSnackbar(`Erreur: ${e.message}`, 'error');
    }
  };

  // Handlers pour les caractéristiques
  const openAddCharacteristicDialog = () => {
    setEditingCharacteristic(null);
    setCustomCharacteristicDialog(true);
  };

  const openEditCharacteristicDialog = (characteristic: CustomCharacteristic) => {
    setEditingCharacteristic(characteristic);
    setCustomCharacteristicDialog(true);
  };

  const closeCharacteristicDialog = () => {
    setCustomCharacteristicDialog(false);
    setEditingCharacteristic(null);
  };

  const saveCharacteristic = (characteristic: CustomCharacteristic) => {
    if (editingCharacteristic) {
      // Modification
      setFormData((prev: MaterialFormData) => ({
        ...prev,
        caracteristiques:
          prev.caracteristiques?.map((char) =>
            char.id === editingCharacteristic.id ? characteristic : char,
          ) || [],
      }));
      showSnackbar('Caractéristique modifiée', 'success');
    } else {
      // Ajout
      setFormData((prev: MaterialFormData) => ({
        ...prev,
        caracteristiques: [...(prev.caracteristiques || []), characteristic],
      }));
      showSnackbar('Caractéristique ajoutée', 'success');
    }

    closeCharacteristicDialog();
  };

  const deleteCharacteristic = (id: string) => {
    setFormData((prev: MaterialFormData) => ({
      ...prev,
      caracteristiques: prev.caracteristiques?.filter((char) => char.id !== id) || [],
    }));
    showSnackbar('Caractéristique supprimée', 'success');
  };

  const handleSubmit = async () => {
    try {
      let materielPersoId: number | undefined;
      let materielPresetId: number | undefined;

      // Si le matériel a été modifié par rapport au preset, ajouter un matériel perso
      if (isModifiedFromPreset()) {
        // Récupérer le categorieId depuis le preset sélectionné ou formData
        const categorieId =
          formData.categoryId || selectedPreset?.categoryId || selectedPreset?.category?.id || null;

        const materielPersoData = {
          name: formData.name,
          discipline: formData.discipline.toLowerCase(),
          description: formData.description || '',
          caracteristiques: formData.caracteristiques || null,
          defaultQty: formData.quantity,
          categorieId: categorieId,
        };

        const response = await fetch('/api/materiel-perso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(materielPersoData),
        });

        if (response.ok) {
          const createdMaterielPerso = await response.json();
          materielPersoId = createdMaterielPerso.id;
        } else {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la création du matériel personnalisé');
        }
      } else {
        // Pas modifié: relier à la source sélectionnée
        if (selectedSourceType === 'preset' && selectedPreset?.id) {
          materielPresetId = selectedPreset.id;
        } else if (selectedSourceType === 'perso' && selectedPreset?.id) {
          materielPersoId = selectedPreset.id;
        }
      }

      // Préparer les données finales pour le matériel d'inventaire
      const finalFormData = {
        ...formData,
        // Toujours fournir categoryId basé sur la source sélectionnée
        categoryId:
          formData.categoryId ?? selectedPreset?.categoryId ?? selectedPreset?.category?.id ?? null,
        materielPersoId,
        materielPresetId,
      };

      if (onOptimisticAdd) {
        onOptimisticAdd(finalFormData);
      }
      onComplete(finalFormData);
    } catch (error) {
      console.error('Erreur lors de la création du matériel:', error);
      showSnackbar(
        `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        'error',
      );
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedPreset !== null;
      case 1:
        return formData.name.trim() !== '';
      case 2:
        return true;
      default:
        return false;
    }
  };

  return (
    <Box
      sx={{
        p: 0,
      }}
    >
      <StepIndicator currentStep={currentStep} isLoading={isLoading} />

      <Box sx={{ minHeight: 400 }}>
        {currentStep === 0 && (
          <Step1
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            search={search}
            setSearch={setSearch}
            availableCategories={availableCategories}
            categoriesInfo={categoriesInfo}
            presets={presets}
            filteredPresets={filteredPresets}
            loadingPresets={loadingPresets}
            materielPersos={materielPersos}
            filteredMaterielPersos={filteredMaterielPersos}
            loadingMaterielPersos={loadingMaterielPersos}
            creating={creating}
            setCreating={setCreating}
            editing={editing}
            setEditing={setEditing}
            formData={formData}
            lockedDiscipline={lockedDiscipline}
            onPresetSelect={handlePresetSelect}
            onMaterielPersoSelect={handleMaterielPersoSelect}
            onPresetSave={handlePresetSave}
          />
        )}
        {currentStep === 1 && (
          <Step2
            formData={formData}
            setFormData={setFormData}
            selectedPreset={selectedPreset}
            isModifiedFromPreset={isModifiedFromPreset}
            availableCategories={availableCategories}
            categoriesInfo={categoriesInfo}
            catInput={catInput}
            setCatInput={setCatInput}
            disciplineLockedByCategory={disciplineLockedByCategory}
            setDisciplineLockedByCategory={setDisciplineLockedByCategory}
            lockedDiscipline={lockedDiscipline}
            salles={salles}
            localisations={localisations}
            loadingSalles={loadingSalles}
            loadingLocalisations={loadingLocalisations}
            suppliers={suppliers}
            onOpenCharacteristicDialog={openAddCharacteristicDialog}
            onEditCharacteristic={openEditCharacteristicDialog}
            onDeleteCharacteristic={deleteCharacteristic}
            createCategoryIfNeededStep2={createCategoryIfNeededStep2}
          />
        )}
        {currentStep === 2 && (
          <Step3
            formData={formData}
            salles={salles}
            localisations={localisations}
            categoriesInfo={categoriesInfo}
          />
        )}
      </Box>

      {/* Navigation */}
      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button onClick={onCancel} disabled={isLoading}>
          Annuler
        </Button>

        <Box display="flex" gap={1}>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep((prev) => prev - 1)} disabled={isLoading}>
              Précédent
            </Button>
          )}

          {currentStep < 2 ? (
            <Button
              variant="contained"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed() || isLoading}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? 'Création...' : 'Ajouter le matériel'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Dialog pour les caractéristiques personnalisées */}
      <CharacteristicDialog
        open={customCharacteristicDialog}
        editingCharacteristic={editingCharacteristic}
        onClose={closeCharacteristicDialog}
        onSave={saveCharacteristic}
      />
    </Box>
  );
}
