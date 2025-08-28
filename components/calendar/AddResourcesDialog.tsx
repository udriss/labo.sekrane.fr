'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Autocomplete,
  Chip,
  Stack,
  IconButton,
  Box,
  Alert,
  Divider,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Undo as UndoIcon } from '@mui/icons-material';

// Shared types
export type PresetMaterial = { id: number; name: string; quantity?: number };
export type CustomMaterial = { id?: number; tempId?: string; name: string; quantity?: number };
export type PresetChemical = {
  id: number;
  name: string;
  requestedQuantity?: number;
  unit?: string;
};
export type CustomChemical = {
  id?: number;
  tempId?: string;
  name: string;
  requestedQuantity?: number;
  unit?: string;
};

export interface AddResourcesDialogChange {
  presetMaterials: PresetMaterial[];
  customMaterials: CustomMaterial[];
  presetChemicals: PresetChemical[];
  customChemicals: CustomChemical[];
  removedPresetMaterialIds?: number[];
  removedPresetChemicalIds?: number[];
}

interface BaseProps {
  discipline: 'chimie' | 'physique';
  presetMaterials: PresetMaterial[];
  customMaterials: CustomMaterial[];
  presetChemicals: PresetChemical[];
  customChemicals: CustomChemical[];
  onChange: (data: AddResourcesDialogChange) => void; // fired on any internal state change
  onSave?: (data: AddResourcesDialogChange) => void | Promise<void>; // only for dialog mode
  onClose?: () => void; // only for dialog mode
  /** Optional label overrides */
  title?: string;
  saveLabel?: string;
  closeLabel?: string;
  mode?: 'dialog' | 'embedded';
  open?: boolean; // dialog mode only
}

/**
 * Unified resources manager (Matériel & Réactifs) extracted from Step 3 logic.
 */
export default function AddResourcesDialog(props: BaseProps) {
  const {
    discipline,
    presetMaterials,
    customMaterials,
    presetChemicals,
    customChemicals,
    onChange,
    onSave,
    onClose,
    title = 'Matériel & Réactifs',
    saveLabel = 'Terminer',
    mode = 'dialog',
    open = false,
  } = props;

  // Local working copies (avoid mutating parents until onSave in dialog mode; in embedded mode propagate immediately)
  const [locPresetMaterials, setLocPresetMaterials] = useState<PresetMaterial[]>(presetMaterials);
  const [locCustomMaterials, setLocCustomMaterials] = useState<CustomMaterial[]>(customMaterials);
  const [locPresetChemicals, setLocPresetChemicals] = useState<PresetChemical[]>(presetChemicals);
  const [locCustomChemicals, setLocCustomChemicals] = useState<CustomChemical[]>(customChemicals);
  const [removedPresetMaterialIds, setRemovedPresetMaterialIds] = useState<number[]>([]);
  const [removedPresetChemicalIds, setRemovedPresetChemicalIds] = useState<number[]>([]);
  // Persist meta for removed preset items so chips stay visible even if parent props no longer include them
  const [removedPresetMaterialMeta, setRemovedPresetMaterialMeta] = useState<
    Record<number, { id: number; name: string; quantity?: number }>
  >({});
  const [removedPresetChemicalMeta, setRemovedPresetChemicalMeta] = useState<
    Record<number, { id: number; name: string; requestedQuantity?: number; unit?: string }>
  >({});
  // Track removed custom items by lowercase name (no stable id)
  const [removedCustomMaterialNames, setRemovedCustomMaterialNames] = useState<string[]>([]);
  const [removedCustomChemicalNames, setRemovedCustomChemicalNames] = useState<string[]>([]);

  // Inputs for adding custom
  const [customMatName, setCustomMatName] = useState('');
  const [customMatQty, setCustomMatQty] = useState<number>(1);
  const [customChemName, setCustomChemName] = useState('');
  const [customChemQty, setCustomChemQty] = useState<number>(0);
  const [customChemUnit, setCustomChemUnit] = useState<string>('');

  // Catalog data
  const [availableMaterials, setAvailableMaterials] = useState<PresetMaterial[]>([]);
  const [availableChemicals, setAvailableChemicals] = useState<PresetChemical[]>([]);
  const [availableChemicalsNoPreset, setAvailableChemicalsNoPreset] = useState<PresetChemical[]>(
    [],
  );
  const [showNoPresetGroup, setShowNoPresetGroup] = useState(false);
  const [forceShowChem, setForceShowChem] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingChemicals, setLoadingChemicals] = useState(false);

  // Sync for dialog mode when opened; embedded mode initializes once from initial props and then is source of truth
  const embeddedInitialized = useRef(false);
  const wasOpenRef = useRef(false);
  // Helper to build a lightweight signature for comparing incoming vs local
  const buildSig = (pm: any[], cm: any[], pc: any[], cc: any[]) =>
    JSON.stringify({
      pm: pm.map((m) => [m.id, m.name, m.quantity]).sort(),
      cm: cm.map((m) => [m.id, m.name, m.quantity]).sort(),
      pc: pc.map((c) => [c.id, c.name, c.requestedQuantity, c.unit]).sort(),
      cc: cc.map((c) => [c.id, c.name, c.requestedQuantity, c.unit]).sort(),
    });
  const lastAppliedEmbedded = useRef<string>('');

  useEffect(() => {
    if (mode === 'dialog') {
      // Only resync when dialog transitions closed -> open
      if (open && !wasOpenRef.current) {
        setLocPresetMaterials(presetMaterials);
        setLocCustomMaterials(customMaterials);
        setLocPresetChemicals(presetChemicals);
        setLocCustomChemicals(customChemicals);
        setRemovedPresetMaterialIds([]);
        setRemovedPresetChemicalIds([]);
        setRemovedPresetMaterialMeta({});
        setRemovedPresetChemicalMeta({});
        setRemovedCustomMaterialNames([]);
        setRemovedCustomChemicalNames([]);
        lastAppliedEmbedded.current = buildSig(
          presetMaterials,
          customMaterials,
          presetChemicals,
          customChemicals,
        );
      }
      wasOpenRef.current = open;
    } else if (mode === 'embedded') {
      const incomingSig = buildSig(
        presetMaterials,
        customMaterials,
        presetChemicals,
        customChemicals,
      );
      const localSig = buildSig(
        locPresetMaterials,
        locCustomMaterials,
        locPresetChemicals,
        locCustomChemicals,
      );
      // Resync if local still matches last applied OR local is empty while incoming has data
      if (
        (!lastAppliedEmbedded.current ||
          localSig === lastAppliedEmbedded.current ||
          (locPresetMaterials.length === 0 &&
            locCustomMaterials.length === 0 &&
            locPresetChemicals.length === 0 &&
            locCustomChemicals.length === 0)) &&
        incomingSig !== localSig
      ) {
        setLocPresetMaterials(presetMaterials);
        setLocCustomMaterials(customMaterials);
        setLocPresetChemicals(presetChemicals);
        setLocCustomChemicals(customChemicals);
        lastAppliedEmbedded.current = incomingSig;
      }
      if (!embeddedInitialized.current) embeddedInitialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, presetMaterials, customMaterials, presetChemicals, customChemicals]);

  // Fetch catalog
  useEffect(() => {
    (async () => {
      try {
        setLoadingMaterials(true);
        const r1 = await fetch(`/api/materiel?discipline=${encodeURIComponent(discipline)}`);
        const mats: PresetMaterial[] = [];
        if (r1.ok) {
          const d = await r1.json();
          const list = Array.isArray(d?.materiels)
            ? d.materiels
            : Array.isArray(d?.materiel)
              ? d.materiel
              : [];
          (list as any[]).forEach((m: any) =>
            mats.push({ id: m.id, name: m.itemName || m.name || '', quantity: 1 }),
          );
        }
        const dedup = Array.from(
          new Map(mats.filter((m) => m.name).map((m) => [m.id, m])).values(),
        );
        setAvailableMaterials(dedup);
      } catch {
        setAvailableMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    })();
  }, [discipline]);
  useEffect(() => {
    (async () => {
      try {
        setLoadingChemicals(true);
        const rc = await fetch('/api/chemicals');
        if (rc.ok) {
          const d = await rc.json();
          const raw = Array.isArray(d?.reactifs) ? d.reactifs : [];
          // Split by preset presence
          const withPreset = (raw as any[]).filter(
            (c: any) => c.reactifPreset && c.reactifPreset.id && c.reactifPreset.name,
          );
          const noPreset = (raw as any[]).filter((c: any) => !c.reactifPreset);
          // Strict preset list for main group
          const presetMapped = withPreset.map((c: any) => ({
            id: c.reactifPreset.id as number,
            name: String(c.reactifPreset.name),
            requestedQuantity: 1,
            unit: c.unit || '',
          }));
          const uniq = new Map<number, PresetChemical>();
          for (const item of presetMapped) {
            if (!uniq.has(item.id)) uniq.set(item.id, item);
          }
          setAvailableChemicals(Array.from(uniq.values()));
          // Prepare non-preset group, dedup by name
          const noPresetMapped: PresetChemical[] = noPreset
            .map((c: any) => ({
              id: c.id as number,
              name: String(c.name || 'Sans nom'),
              requestedQuantity: 1,
              unit: c.unit || '',
            }))
            .filter((c) => !!c.name && c.name !== 'Sans nom');
          const uniqNo = new Map<string, PresetChemical>();
          for (const item of noPresetMapped) {
            const key = `${item.name}`.toLowerCase();
            if (!uniqNo.has(key)) uniqNo.set(key, item);
          }
          setAvailableChemicalsNoPreset(Array.from(uniqNo.values()));
        }
      } catch {
        setAvailableChemicals([]);
        setAvailableChemicalsNoPreset([]);
      } finally {
        setLoadingChemicals(false);
      }
    })();
  }, [discipline]);

  // propagate (embedded mode immediate) but avoid infinite loops by diffing signature
  const lastEmitted = useRef<string>('');
  useEffect(() => {
    if (mode !== 'embedded') return;
    const sig = JSON.stringify({
      pm: locPresetMaterials,
      cm: locCustomMaterials,
      pc: locPresetChemicals,
      cc: locCustomChemicals,
      rpm: removedPresetMaterialIds,
      rpc: removedPresetChemicalIds,
      rcm: removedCustomMaterialNames,
      rcc: removedCustomChemicalNames,
    });
    if (sig === lastEmitted.current) return;
    lastEmitted.current = sig;
    onChange({
      presetMaterials: locPresetMaterials,
      customMaterials: locCustomMaterials,
      presetChemicals: locPresetChemicals,
      customChemicals: locCustomChemicals,
      removedPresetMaterialIds,
      removedPresetChemicalIds,
    });
  }, [
    locPresetMaterials,
    locCustomMaterials,
    locPresetChemicals,
    locCustomChemicals,
    removedPresetMaterialIds,
    removedPresetChemicalIds,
    removedCustomMaterialNames,
    removedCustomChemicalNames,
    mode,
    onChange,
  ]);

  const handleSelectMaterials = (vals: PresetMaterial[]) => {
    const newIds = new Set(vals.map((v) => v.id));
    const removedItems = locPresetMaterials.filter((m) => !newIds.has(m.id));
    if (removedItems.length) {
      setRemovedPresetMaterialIds((prev) =>
        Array.from(new Set([...prev, ...removedItems.map((m) => m.id)])),
      );
      setRemovedPresetMaterialMeta((prev) => {
        const next = { ...prev };
        removedItems.forEach((m) => {
          if (!next[m.id]) next[m.id] = { id: m.id, name: m.name, quantity: m.quantity };
        });
        return next;
      });
    }
    // Keep ids that are still not reselected
    setRemovedPresetMaterialIds((prev) => prev.filter((id) => !newIds.has(id)));
    const prevMap = new Map(locPresetMaterials.map((m) => [m.id, m]));
    const merged = vals.map((v) => ({
      id: v.id,
      name: v.name,
      quantity: prevMap.get(v.id)?.quantity || v.quantity || 1,
    }));
    setLocPresetMaterials(merged);
  };
  const handleSelectChemicals = (vals: PresetChemical[]) => {
    const newIds = new Set(vals.map((v) => v.id));
    const removedItems = locPresetChemicals.filter((c) => !newIds.has(c.id));
    if (removedItems.length) {
      setRemovedPresetChemicalIds((prev) =>
        Array.from(new Set([...prev, ...removedItems.map((c) => c.id)])),
      );
      setRemovedPresetChemicalMeta((prev) => {
        const next = { ...prev };
        removedItems.forEach((c) => {
          if (!next[c.id])
            next[c.id] = {
              id: c.id,
              name: c.name,
              requestedQuantity: c.requestedQuantity,
              unit: c.unit,
            };
        });
        return next;
      });
    }
    setRemovedPresetChemicalIds((prev) => prev.filter((id) => !newIds.has(id)));
    const prevMap = new Map(locPresetChemicals.map((c) => [c.id, c]));
    const merged = vals.map((v) => ({
      id: v.id,
      name: v.name,
      requestedQuantity: prevMap.get(v.id)?.requestedQuantity ?? v.requestedQuantity ?? 1,
      unit: prevMap.get(v.id)?.unit || v.unit || '',
    }));
    setLocPresetChemicals(merged);
  };

  const content = (
    <Box display="grid" gap={4} sx={{ gridTemplateColumns: '1fr', mb: 1 }}>
      {/* Matériel */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          Matériel
        </Typography>
        <Box display="grid" gap={3} sx={{ gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
              Catalogue
            </Typography>
            <Autocomplete
              multiple
              options={availableMaterials.map((m) => ({ ...m, group: 'Catalogue' }))}
              loading={loadingMaterials}
              groupBy={(o: any) => o.group}
              getOptionLabel={(o) => o.name}
              value={locPresetMaterials.map(
                (d) =>
                  availableMaterials.find((m) => m.id === d.id) || {
                    id: d.id,
                    name: d.name,
                    quantity: d.quantity,
                    group: 'Catalogue',
                  },
              )}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onChange={(_, vals) => handleSelectMaterials(vals as any)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    {...getTagProps({ index })}
                    key={`${option.id}-${option.name}`}
                    label={option.name}
                    size="small"
                  />
                ))
              }
              renderInput={(p) => <TextField {...p} label="Matériel" placeholder="Rechercher…" />}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
              {locPresetMaterials.map((m) => (
                <Box
                  key={`mat-pres-${m.id}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <Chip label={m.name} size="small" />
                  <TextField
                    type="number"
                    size="small"
                    slotProps={{ htmlInput: { min: 1, style: { width: 60 } } }}
                    value={m.quantity ?? 1}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value || '1', 10));
                      setLocPresetMaterials((prev) =>
                        prev.map((it) => (it.id === m.id ? { ...it, quantity: qty } : it)),
                      );
                    }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      handleSelectMaterials(locPresetMaterials.filter((x) => x.id !== m.id))
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            {removedPresetMaterialIds.length > 0 && (
              <Box mt={1}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Supprimés (avant validation)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                  {removedPresetMaterialIds.map((id) => {
                    const meta = removedPresetMaterialMeta[id];
                    if (!meta) return null;
                    return (
                      <Chip
                        key={`mat-rem-${id}`}
                        label={meta.name}
                        variant="outlined"
                        onDelete={() => {
                          setRemovedPresetMaterialIds((prev) => prev.filter((x) => x !== id));
                          setLocPresetMaterials((prev) => [
                            ...prev,
                            { id: meta.id, name: meta.name, quantity: meta.quantity || 1 },
                          ]);
                        }}
                        deleteIcon={<UndoIcon />}
                        sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'warning.main' }}>
              Perso
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              <TextField
                size="small"
                placeholder="Nom"
                value={customMatName}
                onChange={(e) => setCustomMatName(e.target.value)}
                sx={{ flex: 1, minWidth: 140 }}
              />
              <TextField
                size="small"
                type="number"
                placeholder="Qté"
                value={customMatQty}
                onChange={(e) => setCustomMatQty(Math.max(1, parseInt(e.target.value || '1', 10)))}
                sx={{ width: 80 }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={!customMatName.trim()}
                onClick={() => {
                  const name = customMatName.trim();
                  const qty = customMatQty;
                  setLocCustomMaterials((prev) => {
                    const existing = prev.filter((m) => m.name !== name);
                    return [
                      ...existing,
                      {
                        name,
                        quantity: qty,
                        tempId: `tmp-mat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      },
                    ];
                  });
                  setCustomMatName('');
                  setCustomMatQty(1);
                }}
              >
                Ajouter
              </Button>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
              {locCustomMaterials.map((m, idx) => (
                <Box
                  key={`mat-cus-${m.id || m.tempId || idx}-${m.name}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <Chip label={`${m.name} (PERSO)`} size="small" color="warning" />
                  <TextField
                    type="number"
                    size="small"
                    slotProps={{ htmlInput: { min: 1, style: { width: 60 } } }}
                    value={m.quantity ?? 1}
                    onChange={(e) => {
                      const qty = Math.max(1, parseInt(e.target.value || '1', 10));
                      setLocCustomMaterials((prev) =>
                        prev.map((it, i) => (i === idx ? { ...it, quantity: qty } : it)),
                      );
                    }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      const lname = m.name.toLowerCase();
                      setRemovedCustomMaterialNames((prev) =>
                        prev.includes(lname) ? prev : [...prev, lname],
                      );
                      setLocCustomMaterials((prev) => prev.filter((_, i) => i !== idx));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            {removedCustomMaterialNames.length > 0 && (
              <Box mt={1}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Supprimés (avant validation)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                  {removedCustomMaterialNames.map((name, index) => (
                    <Chip
                      key={`mat-cus-rem-${name}-${index}`}
                      label={name}
                      variant="outlined"
                      onDelete={() => {
                        setRemovedCustomMaterialNames((prev) => prev.filter((n) => n !== name));
                        setLocCustomMaterials((prev) => [
                          ...prev,
                          { name, quantity: 1, tempId: `undo-mat-${name}` },
                        ]);
                      }}
                      deleteIcon={<UndoIcon />}
                      sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
      {/* Chemicals */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          Réactifs
        </Typography>
        {discipline === 'chimie' || forceShowChem ? (
          <Box display="grid" gap={3} sx={{ gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                Catalogue
              </Typography>
              <Autocomplete
                multiple
                options={
                  [
                    ...availableChemicals.map((c) => ({ ...c, group: 'Catalogue' })),
                    ...(showNoPresetGroup
                      ? availableChemicalsNoPreset.map((c) => ({
                          ...c,
                          group: 'Sans preset',
                          disabled: true,
                        }))
                      : []),
                  ] as any
                }
                loading={loadingChemicals}
                groupBy={(o: any) => o.group}
                getOptionLabel={(o) => o.name}
                filterSelectedOptions
                value={locPresetChemicals.map(
                  (d) =>
                    availableChemicals.find((c) => c.id === d.id) || {
                      id: d.id,
                      name: d.name,
                      requestedQuantity: d.requestedQuantity,
                      unit: d.unit,
                      group: 'Catalogue',
                    },
                )}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                onChange={(_, vals) => handleSelectChemicals(vals as any)}
                renderGroup={(params) => (
                  <li key={params.key}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      px={2}
                      py={0.5}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {params.group}
                      </Typography>
                      {params.group === 'Sans preset' && (
                        <Button size="small" onClick={() => setShowNoPresetGroup(false)}>
                          Masquer
                        </Button>
                      )}
                    </Box>
                    <ul style={{ opacity: params.group === 'Sans preset' ? 0.6 : 1 }}>
                      {params.children}
                    </ul>
                  </li>
                )}
                getOptionDisabled={(option: any) => option.disabled === true}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={`${option.id}-${option.name}-${index}`}
                      label={option.name}
                      size="small"
                      color="secondary"
                    />
                  ))
                }
                renderInput={(p) => <TextField {...p} label="Réactifs" placeholder="Rechercher…" />}
              />
              {!showNoPresetGroup && availableChemicalsNoPreset.length > 0 && (
                <Box mt={1}>
                  <Button size="small" onClick={() => setShowNoPresetGroup(true)}>
                    Afficher le groupe « Sans preset » ({availableChemicalsNoPreset.length})
                  </Button>
                </Box>
              )}
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                {locPresetChemicals.map((c, index) => (
                  <Box
                    key={`chem-pres-${c.id}-${index}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                  >
                    <Chip label={c.name} size="small" color="secondary" />
                    <TextField
                      type="number"
                      size="small"
                      slotProps={{ htmlInput: { min: 0, style: { width: 60 } } }}
                      value={c.requestedQuantity ?? 0}
                      onChange={(e) => {
                        const qty = Math.max(0, parseFloat(e.target.value || '0'));
                        setLocPresetChemicals((prev) =>
                          prev.map((it) =>
                            it.id === c.id ? { ...it, requestedQuantity: qty } : it,
                          ),
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      placeholder="unité"
                      slotProps={{ htmlInput: { style: { width: 50 } } }}
                      value={c.unit || ''}
                      onChange={(e) => {
                        const u = e.target.value;
                        setLocPresetChemicals((prev) =>
                          prev.map((it) => (it.id === c.id ? { ...it, unit: u } : it)),
                        );
                      }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() =>
                        handleSelectChemicals(locPresetChemicals.filter((x) => x.id !== c.id))
                      }
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
              {removedPresetChemicalIds.length > 0 && (
                <Box mt={1}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Supprimés (avant validation)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                    {removedPresetChemicalIds.map((id, index) => {
                      const meta = removedPresetChemicalMeta[id];
                      if (!meta) return null;
                      return (
                        <Chip
                          key={`chem-rem-${id}-${index}`}
                          label={meta.name}
                          variant="outlined"
                          onDelete={() => {
                            setRemovedPresetChemicalIds((prev) => prev.filter((x) => x !== id));
                            setLocPresetChemicals((prev) => [
                              ...prev,
                              {
                                id: meta.id,
                                name: meta.name,
                                requestedQuantity: meta.requestedQuantity ?? 0,
                                unit: meta.unit || 'sans unité',
                              },
                            ]);
                          }}
                          deleteIcon={<UndoIcon />}
                          sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'warning.main' }}>
                Perso
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <TextField
                  size="small"
                  placeholder="Nom"
                  value={customChemName}
                  onChange={(e) => setCustomChemName(e.target.value)}
                  sx={{ flex: 1, minWidth: 120 }}
                />
                <TextField
                  size="small"
                  type="number"
                  placeholder="Qté"
                  value={customChemQty}
                  onChange={(e) => setCustomChemQty(Math.max(0, parseFloat(e.target.value || '0')))}
                  sx={{ width: 70 }}
                />
                <TextField
                  size="small"
                  placeholder="Unité"
                  value={customChemUnit}
                  onChange={(e) => setCustomChemUnit(e.target.value)}
                  sx={{ width: 60 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={!customChemName.trim()}
                  onClick={() => {
                    const name = customChemName.trim();
                    const qty = customChemQty;
                    const unit = customChemUnit || 'g';
                    setLocCustomChemicals((prev) => {
                      const existing = prev.filter((c) => c.name !== name);
                      return [
                        ...existing,
                        {
                          name,
                          requestedQuantity: qty,
                          unit,
                          tempId: `tmp-chem-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        },
                      ];
                    });
                    setCustomChemName('');
                    setCustomChemQty(0);
                    setCustomChemUnit('');
                  }}
                >
                  Ajouter
                </Button>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                {locCustomChemicals.map((c, idx) => (
                  <Box
                    key={`chem-cus-${c.id || c.tempId || idx}-${c.name}`}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                  >
                    <Chip label={`${c.name} (PERSO)`} size="small" color="warning" />
                    <TextField
                      type="number"
                      size="small"
                      slotProps={{ htmlInput: { min: 0, style: { width: 60 } } }}
                      value={c.requestedQuantity ?? 0}
                      onChange={(e) => {
                        const qty = Math.max(0, parseFloat(e.target.value || '0'));
                        setLocCustomChemicals((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, requestedQuantity: qty } : it)),
                        );
                      }}
                    />
                    <TextField
                      size="small"
                      placeholder="unité"
                      slotProps={{ htmlInput: { style: { width: 50 } } }}
                      value={c.unit || ''}
                      onChange={(e) => {
                        const u = e.target.value;
                        setLocCustomChemicals((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, unit: u } : it)),
                        );
                      }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        const lname = c.name.toLowerCase();
                        setRemovedCustomChemicalNames((prev) =>
                          prev.includes(lname) ? prev : [...prev, lname],
                        );
                        setLocCustomChemicals((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
              {removedCustomChemicalNames.length > 0 && (
                <Box mt={1}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    Supprimés (avant validation)
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                    {removedCustomChemicalNames.map((name, index) => (
                      <Chip
                        key={`chem-cus-rem-${name}-${index}`}
                        label={name}
                        variant="outlined"
                        onDelete={() => {
                          setRemovedCustomChemicalNames((prev) => prev.filter((n) => n !== name));
                          setLocCustomChemicals((prev) => [
                            ...prev,
                            { name, requestedQuantity: 0, unit: '', tempId: `undo-chem-${name}` },
                          ]);
                        }}
                        deleteIcon={<UndoIcon />}
                        sx={{ textDecoration: 'line-through', opacity: 0.6 }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 1 }}>
              Pas de réactifs pour la discipline Physique.
            </Alert>
            <Button size="small" variant="outlined" onClick={() => setForceShowChem(true)}>
              Afficher quand même
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (mode === 'dialog') {
    return (
      <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>{content}</DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="contained"
            onClick={async () => {
              const data: AddResourcesDialogChange = {
                presetMaterials: locPresetMaterials,
                customMaterials: locCustomMaterials,
                presetChemicals: locPresetChemicals,
                customChemicals: locCustomChemicals,
                removedPresetMaterialIds,
                removedPresetChemicalIds,
              };
              await onSave?.(data);
              onChange(data);
              onClose?.();
            }}
          >
            {saveLabel}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
  return <Box>{content}</Box>;
}
