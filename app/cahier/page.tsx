// app/cahier/page.tsx

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Autocomplete,
  Chip,
  Grid,
  useTheme,
  useMediaQuery,
  Stack,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  EditNote,
  Add as AddIcon,
  Stop as StopIcon,
  PlayArrow as PlayArrowIcon,
  Check as CheckIcon,
  Description as DescriptionIcon,
  OpenInNew as OpenInNewIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import EventWizardCore, { WizardForm, WizardMeta } from '@/components/calendar/EventWizardCore';
import WizardStepper, { GenericWizardStep } from '@/components/calendar/WizardStepper';
import AddResourcesDialog, {
  AddResourcesDialogChange,
} from '@/components/calendar/AddResourcesDialog';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
} from '@/components/shared/FrenchDatePicker';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';

// Very light abstraction for presets (TP) creation flow.
// Re-uses CreateEventDialog logic except step 1 (always preset mode).

interface PresetItem {
  id: number;
  title: string;
  discipline: string;
  createdAt: string;
}

export default function CahierPage() {
  // Hook pour la gestion des tabs avec URL
  const { tabValue: tab, handleTabChange } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 4, // 0: Mes TP, 1: Nouveau TP, 2: Ajouter en lot, 3: Partagés
  });

  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [sharedPresets, setSharedPresets] = useState<PresetItem[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Bulk delete states
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<Set<number>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [presetsWithDetails, setPresetsWithDetails] = useState<any[]>([]);

  const theme = useTheme();
  const isMobileSmall = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/event-presets')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setPresets(d.presets || []);
          setSharedPresets(d.shared || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleCreated = () => {
    // After creation, switch to list tab with animation
    handleTabChange(0);
    setRefreshTick((x) => x + 1);
  };

  return (
    <Box sx={{ p: 0, maxWidth: 1200, width: '100%', mx: 'auto' }}>
      <Typography
        variant="h4"
        component="div"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>
          <EditNote fontSize="large" />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>Cahier des TP</Box>
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v) => handleTabChange(v)}
        sx={{ mb: 2 }}
        variant={isMobileSmall ? 'scrollable' : 'standard'}
        scrollButtons={isMobileSmall ? 'auto' : false}
        allowScrollButtonsMobile
      >
        <Tab label={`Mes TP (${presets.length})`} />
        <Tab label="Nouveau TP" />
        <Tab label="Ajouter en lot" />
        <Tab label={`Partagés (${sharedPresets.length})`} />
      </Tabs>
      {/* Keep all panels mounted to preserve internal state when switching tabs */}
      <Box role="tabpanel" hidden={tab !== 0} sx={{ mt: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Bulk actions bar */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            {!bulkDeleteMode ? (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setBulkDeleteMode(true)}
                disabled={presets.length === 0}
              >
                Suppression en lot
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setBulkDeleteMode(false);
                    setSelectedPresets(new Set());
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const allIds = new Set(presets.map((p) => p.id));
                    setSelectedPresets(allIds);
                  }}
                  disabled={presets.length === 0 || selectedPresets.size === presets.length}
                >
                  Tout sélectionner
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedPresets(new Set())}
                  disabled={selectedPresets.size === 0}
                >
                  Tout déselectionner
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<DeleteIcon />}
                  disabled={selectedPresets.size === 0}
                  onClick={async () => {
                    // Load details for selected presets
                    const details = await Promise.all(
                      Array.from(selectedPresets).map(async (id) => {
                        try {
                          const r = await fetch(`/api/event-presets/${id}`);
                          if (r.ok) {
                            const data = await r.json();
                            return data.preset;
                          }
                        } catch {}
                        return null;
                      }),
                    );
                    setPresetsWithDetails(details.filter(Boolean));
                    setBulkDeleteDialog(true);
                  }}
                >
                  Supprimer ({selectedPresets.size})
                </Button>
              </>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={34} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
              }}
            >
              {presets.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  onChanged={() => setRefreshTick((x) => x + 1)}
                  bulkDeleteMode={bulkDeleteMode}
                  selected={selectedPresets.has(p.id)}
                  onSelectionChange={(selected) => {
                    const newSet = new Set(selectedPresets);
                    if (selected) {
                      newSet.add(p.id);
                    } else {
                      newSet.delete(p.id);
                    }
                    setSelectedPresets(newSet);
                  }}
                />
              ))}
              {!presets.length && !loading && (
                <Typography variant="body2" color="text.secondary">
                  Aucun TP pour l'instant.
                </Typography>
              )}
            </Box>
          )}
        </motion.div>
      </Box>
      <Box role="tabpanel" hidden={tab !== 1} sx={{ mt: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <PresetWizard onCreated={handleCreated} />
        </motion.div>
      </Box>
      <Box role="tabpanel" hidden={tab !== 2} sx={{ mt: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <BatchPresetWizard onCreated={handleCreated} />
        </motion.div>
      </Box>
      <Box role="tabpanel" hidden={tab !== 3} sx={{ mt: 1 }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={34} />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
              }}
            >
              {sharedPresets.map((p) => (
                <PresetCard
                  key={`s_${p.id}`}
                  preset={p}
                  onChanged={() => setRefreshTick((x) => x + 1)}
                  shared
                />
              ))}
              {!sharedPresets.length && !loading && (
                <Typography variant="body2" color="text.secondary">
                  Aucun TP partagé.
                </Typography>
              )}
            </Box>
          )}
        </motion.div>
      </Box>

      {/* Bulk Delete Dialog */}
      <BulkDeleteDialog
        open={bulkDeleteDialog}
        presets={presetsWithDetails}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={async () => {
          try {
            // Delete all selected presets
            await Promise.all(
              Array.from(selectedPresets).map(async (id) => {
                await fetch(`/api/event-presets/${id}`, { method: 'DELETE' });
              }),
            );

            // Reset states
            setBulkDeleteDialog(false);
            setBulkDeleteMode(false);
            setSelectedPresets(new Set());
            setRefreshTick((x) => x + 1);
          } catch (error) {
            console.error('Erreur lors de la suppression en lot:', error);
          }
        }}
      />
    </Box>
  );
}

function PresetCard({
  preset,
  onChanged,
  shared = false,
  bulkDeleteMode = false,
  selected = false,
  onSelectionChange,
}: {
  preset: any;
  onChanged: () => void;
  shared?: boolean;
  bulkDeleteMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}) {
  const [openEdit, setOpenEdit] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [presetDetails, setPresetDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // Load preset details immediately on mount
  useEffect(() => {
    let cancelled = false;

    const loadDetails = async () => {
      setLoadingDetails(true);
      try {
        const r = await fetch(`/api/event-presets/${preset.id}`);
        if (r.ok && !cancelled) {
          const data = await r.json();
          setPresetDetails(data.preset);
        }
      } catch {
        // Ignore errors, fallback to basic display
      }
      if (!cancelled) {
        setLoadingDetails(false);
      }
    };

    // Reset state when preset.id changes
    setPresetDetails(null);
    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [preset.id]); // Only depend on preset.id

  const handleDelete = async () => {
    // Load preset details for the delete dialog
    try {
      const r = await fetch(`/api/event-presets/${preset.id}`);
      if (r.ok) {
        const data = await r.json();
        setPresetDetails(data.preset);
        setDeleteDialog(true);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
    }
  };

  const handleShare = async (userIds: number[]) => {
    try {
      const r = await fetch(`/api/event-presets/${preset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedIds: userIds }),
      });
      if (r.ok) {
        onChanged();
        setOpenShare(false);
      }
    } catch (e) {
      console.error('Erreur lors du partage:', e);
    }
  };

  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      onClick={bulkDeleteMode && !shared ? () => onSelectionChange?.(!selected) : undefined}
      sx={{
        cursor: bulkDeleteMode && !shared ? 'pointer' : 'default',
        border: bulkDeleteMode && selected ? 2 : 0,
        borderColor: bulkDeleteMode && selected ? 'primary.main' : 'transparent',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
          {/* Bulk delete mode checkbox */}
          {bulkDeleteMode && !shared && (
            <Box sx={{ pt: 0.5 }}>
              <Checkbox
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation(); // Empêcher la propagation vers le clic sur la carte
                  onSelectionChange?.(e.target.checked);
                }}
                size="small"
              />
            </Box>
          )}

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {preset.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {preset.discipline}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {new Date(preset.createdAt).toLocaleString('fr-FR')}
            </Typography>

            {/* Enhanced information display */}
            {presetDetails && (
              <Box sx={{ mt: 1 }}>
                {/* Show classes if available */}
                {presetDetails.creneaux?.some((c: any) => c.classIds?.length) && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Classes:{' '}
                      {[
                        ...new Set(
                          presetDetails.creneaux
                            .flatMap((c: any) => c.classIds || [])
                            .filter((id: any) => typeof id === 'number'),
                        ),
                      ].join(', ')}
                    </Typography>
                  </Box>
                )}

                {/* Show timeslot count */}
                {presetDetails.creneaux?.length > 0 && (
                  <Box sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {presetDetails.creneaux.length} créneau
                      {presetDetails.creneaux.length > 1 ? 'x' : ''}
                    </Typography>
                  </Box>
                )}

                {/* Show resource counts */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {presetDetails.materiels?.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {presetDetails.materiels.length} matériel
                      {presetDetails.materiels.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                  {presetDetails.reactifs?.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {presetDetails.reactifs.length} réactif
                      {presetDetails.reactifs.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                  {presetDetails.documents?.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {presetDetails.documents.length} document
                      {presetDetails.documents.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>

                {/* Show sharing status */}
                {presetDetails.sharedIds?.length > 0 && (
                  <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                    Partagé avec {presetDetails.sharedIds.length} utilisateur
                    {presetDetails.sharedIds.length > 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Box display="flex" gap={1}>
            {!bulkDeleteMode && (
              <>
                {shared ? (
                  <Tooltip title="Copier dans mes TP">
                    <span>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={async () => {
                          const r = await fetch(`/api/event-presets/${preset.id}/duplicate`, {
                            method: 'POST',
                          });
                          if (r.ok) onChanged();
                        }}
                      >
                        Copier
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip title="Partager">
                      <span>
                        <IconButton size="small" onClick={() => setOpenShare(true)}>
                          <Box
                            component="svg"
                            sx={{ width: 16, height: 16 }}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M18 16.08C17.24 16.08 16.56 16.38 16.04 16.85L8.91 12.7C8.96 12.47 9 12.24 9 12S8.96 11.53 8.91 11.3L15.96 7.19C16.5 7.69 17.21 8 18 8C19.66 8 21 6.66 21 5S19.66 2 18 2 15 3.34 15 5C15 5.24 15.04 5.47 15.09 5.7L8.04 9.81C7.5 9.31 6.79 9 6 9C4.34 9 3 10.34 3 12S4.34 15 6 15C6.79 15 7.5 14.69 8.04 14.19L15.16 18.34C15.11 18.55 15.08 18.77 15.08 19C15.08 20.61 16.39 21.92 18 21.92S20.92 20.61 20.92 19 19.61 17.08 18 17.08L18 16.08Z" />
                          </Box>
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <span>
                        <IconButton size="small" onClick={() => setOpenEdit(true)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <span>
                        <IconButton size="small" color="error" onClick={handleDelete}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardContent>

      {!shared && (
        <>
          <EditPresetDialog
            open={openEdit}
            presetId={preset.id}
            onClose={() => setOpenEdit(false)}
            onSaved={() => {
              setOpenEdit(false);
              onChanged();
            }}
          />

          <SharePresetDialog
            open={openShare}
            presetId={preset.id}
            currentSharedIds={presetDetails?.sharedIds || []}
            onClose={() => setOpenShare(false)}
            onSaved={handleShare}
          />
        </>
      )}

      {/* Single Delete Dialog */}
      {presetDetails && (
        <BulkDeleteDialog
          open={deleteDialog}
          presets={[presetDetails]}
          onClose={() => setDeleteDialog(false)}
          onConfirm={async () => {
            try {
              await fetch(`/api/event-presets/${preset.id}`, { method: 'DELETE' });
              setDeleteDialog(false);
              onChanged();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          }}
        />
      )}
    </Card>
  );
}

function EditPresetDialog({
  open,
  presetId,
  onClose,
  onSaved,
}: {
  open: boolean;
  presetId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WizardForm>({ title: '', discipline: 'chimie', notes: '' });
  const [meta, setMeta] = useState<WizardMeta>({
    method: 'preset',
    materialsDetailed: [],
    chemicalsDetailed: [],
    uploads: [],
    remarks: '',
  });
  const [initialSlots, setInitialSlots] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/event-presets/${presetId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const p = d?.preset;
        if (!p) return;
        setForm({
          title: p.title || '',
          discipline: p.discipline || 'chimie',
          notes: p.notes || '',
        });
        setMeta({
          method: 'preset',
          materialsDetailed: (p.materiels || []).map((m: any) => ({
            id: m.materielId,
            name: m.materielName,
            quantity: m.quantity,
          })),
          chemicalsDetailed: (p.reactifs || []).map((r: any) => ({
            id: r.reactifId,
            name: r.reactifName,
            requestedQuantity: Number(r.requestedQuantity) || 0,
            unit: r.unit || 'g',
          })),
          uploads: (p.documents || []).map((d: any) => ({
            fileName: d.fileName || d.fileUrl,
            fileUrl: d.fileUrl,
            fileSize: d.fileSize,
            fileType: d.fileType,
          })) as any,
          remarks: p.notes || '',
        });
      })
      .finally(() => !cancelled && setLoading(false));
    // Load preset slots
    fetch(`/api/event-presets/${presetId}/creneaux`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setInitialSlots(d?.timeslots || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, presetId]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/event-presets/${presetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || 'TP',
          discipline: form.discipline,
          notes: meta.remarks || form.notes,
          materiels: (meta.materialsDetailed || []).map((m: any) => ({
            materielId: m.id ?? undefined,
            materielName: m.name,
            quantity: m.quantity || 1,
            isCustom: !m.id,
          })),
          reactifs: (meta.chemicalsDetailed || []).map((r: any) => ({
            reactifId: r.id ?? undefined,
            reactifName: r.name,
            requestedQuantity: r.requestedQuantity || 0,
            unit: r.unit || 'g',
            isCustom: !r.id,
          })),
          documents: (meta.uploads || [])
            .filter((u: any) => !u.isLocal || u.fileUrl) // ✅ Filtrer les fichiers locaux non uploadés
            .map((u: any) => ({
              fileName: u.fileName || u.name || 'document',
              fileUrl: u.fileUrl || u.url || u,
              fileSize: u.fileSize,
              fileType: u.fileType,
            })),
        }),
      });
      if (!res.ok) return;
      // Diff-based preset slots CRUD
      const detailed: any[] = (meta as any).timeSlotsDraftsDetailed || [];
      const originals: any[] = (meta as any).timeSlotsOriginal || [];
      const deletedIds: number[] = (meta as any).timeSlotsDeletedIds || [];

      const byId = (arr: any[]) => {
        const m: Record<number, any> = {};
        arr.forEach((x) => {
          if (x && typeof x.id === 'number') m[x.id] = x;
        });
        return m;
      };
      const originalsById = byId(originals);
      const detailedById = byId(detailed);

      // Deletions first
      for (const delId of deletedIds) {
        if (delId && originalsById[delId]) {
          await fetch(`/api/event-presets/creneaux/${delId}`, { method: 'DELETE' });
        }
      }
      // Updates for those with id present and changed
      for (const d of detailed) {
        if (d.id && originalsById[d.id]) {
          const o = originalsById[d.id];
          const changed =
            d.startDate !== o.startDate ||
            d.endDate !== o.endDate ||
            d.timeslotDate !== o.timeslotDate ||
            JSON.stringify(d.salleIds || []) !== JSON.stringify(o.salleIds || []) ||
            JSON.stringify(d.classIds || []) !== JSON.stringify(o.classIds || []);
          if (changed) {
            await fetch(`/api/event-presets/creneaux/${d.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                startDate: d.startDate,
                endDate: d.endDate,
                timeslotDate: d.timeslotDate,
                salleIds: d.salleIds,
                classIds: d.classIds,
              }),
            });
          }
        }
      }
      // Creations for those without id
      const toCreate = detailed.filter((x) => !x.id);
      if (toCreate.length) {
        await fetch(`/api/event-presets/${presetId}/creneaux`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discipline: form.discipline, slots: toCreate }),
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Modifier le TP</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <EventWizardCore
            form={form}
            onFormChange={setForm}
            meta={meta}
            onMetaChange={setMeta}
            mode="dialog"
            presetOnly
            initialPresetSlots={initialSlots}
            onFinish={handleSave}
            finishLabel={saving ? 'Sauvegarde…' : 'Enregistrer'}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<CloseIcon />} onClick={onClose}>
          Fermer
        </Button>
        <Button startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} variant="contained">
          {saving ? 'Sauvegarde…' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Dialog for sharing presets with other users
function SharePresetDialog({
  open,
  presetId,
  currentSharedIds,
  onClose,
  onSaved,
}: {
  open: boolean;
  presetId: number;
  currentSharedIds: number[];
  onClose: () => void;
  onSaved: (userIds: number[]) => void;
}) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [selectedUsers, setSelectedUsers] = useState<
    Array<{ id: number; name: string; email: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      setLoading(true);
      try {
        const usersRes = await fetch('/api/users');

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          let allUsers = usersData.users || [];

          // Get current user ID from session
          const currentUserId = (session?.user as any)?.id;

          // Filter out current user from the list
          if (currentUserId) {
            allUsers = allUsers.filter((user: any) => user.id !== currentUserId);
          }

          setUsers(allUsers);

          // Set currently shared users
          const currentlyShared = allUsers.filter((user: any) =>
            currentSharedIds.includes(user.id),
          );
          setSelectedUsers(currentlyShared);
        }
      } catch {
        // Ignore errors
      }
      setLoading(false);
    };

    loadUsers();
  }, [open, currentSharedIds, session?.user]);

  const handleSave = () => {
    onSaved(selectedUsers.map((user) => user.id));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Partager ce TP</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sélectionnez les utilisateurs avec qui vous souhaitez partager ce TP.
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Autocomplete
            multiple
            options={users}
            value={selectedUsers}
            onChange={(_, newValue) => {
              setSelectedUsers(newValue);
            }}
            getOptionLabel={(user) => user.name || user.email}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Rechercher des utilisateurs"
                placeholder={
                  selectedUsers.length === 0 ? 'Commencez à taper un nom ou email...' : ''
                }
                variant="outlined"
              />
            )}
            renderOption={(props, user) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography variant="body2">{user.name || user.email}</Typography>
                  {user.name && (
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
            filterOptions={(options, { inputValue }) => {
              const filtered = options.filter((user) => {
                const searchText = inputValue.toLowerCase();
                const name = (user.name || '').toLowerCase();
                const email = (user.email || '').toLowerCase();
                return name.includes(searchText) || email.includes(searchText);
              });
              return filtered;
            }}
            renderTags={(value, getTagProps) =>
              value.map((user, index) => {
                const tagProps = getTagProps({ index });
                return (
                  <Chip {...tagProps} key={user.id} label={user.name || user.email} size="small" />
                );
              })
            }
            sx={{ mb: 2 }}
          />
        )}

        {users.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary">
            Aucun utilisateur disponible pour le partage
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={handleSave}>
          Partager ({selectedUsers.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function PresetWizard({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState<WizardForm>({ title: '', discipline: 'chimie', notes: '' });
  const [meta, setMeta] = useState<WizardMeta>({
    method: 'preset',
    materialsDetailed: [],
    chemicalsDetailed: [],
    uploads: [],
  });
  const [saving, setSaving] = useState(false);

  // Progress tracking state for single preset creation
  const [singleProgress, setSingleProgress] = useState<{
    title: string;
    status: 'pending' | 'creating' | 'slots' | 'documents' | 'completed' | 'error';
    documentCount: number;
    slotsCount: number;
    error?: string;
  } | null>(null);

  // Completion control to delay tab change
  const [creationComplete, setCreationComplete] = useState(false);

  const handleFinish = async () => {
    if (saving) return;
    setSaving(true);
    
    try {
      // Récupérer les créneaux s'ils existent pour les ajouter après création
      const drafts: any[] = (meta as any).timeSlotsDrafts || [];
      const uploads = meta.uploads || [];
      
      // Initialize progress tracking
      setSingleProgress({
        title: form.title || 'TP',
        status: 'creating',
        documentCount: uploads.length,
        slotsCount: drafts.length,
      });

      const res = await fetch('/api/event-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || 'TP',
          discipline: form.discipline,
          notes: meta.remarks || form.notes,
          materiels: (meta.materialsDetailed || []).map((m: any) => ({
            materielId: m.id ?? undefined,
            materielName: m.name,
            quantity: m.quantity || 1,
            isCustom: !m.id,
          })),
          reactifs: (meta.chemicalsDetailed || []).map((r: any) => ({
            reactifId: r.id ?? undefined,
            reactifName: r.name,
            requestedQuantity: r.requestedQuantity || 0,
            unit: r.unit || 'g',
            isCustom: !r.id,
          })),
          documents: (meta.uploads || [])
            .filter((u: any) => !u.isLocal || u.fileUrl) // ✅ Filtrer les fichiers locaux non uploadés
            .map((u: any) => ({
              fileName: u.fileName || u.name || 'document',
              fileUrl: u.fileUrl || u.url || u,
              fileSize: u.fileSize,
              fileType: u.fileType,
            })),
        }),
      });
      
      if (!res.ok) {
        throw new Error(`Échec création TP: ${form.title || 'TP'}`);
      }
      
      const created = await res.json();
      const presetId = created?.preset?.id;
      
      if (!presetId) {
        throw new Error('ID preset manquant');
      }

      // Update progress to slots phase
      setSingleProgress(prev => prev ? { ...prev, status: 'slots' } : null);
      
      // ✅ Ajouter les créneaux séparément s'ils existent
      if (drafts.length > 0) {
        await fetch(`/api/event-presets/${presetId}/creneaux`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discipline: form.discipline, slots: drafts }),
        });
      }

      // Update progress to documents phase
      setSingleProgress(prev => prev ? { ...prev, status: 'documents' } : null);

      // ✅ Uploader les fichiers après création du preset
      if ((window as any).uploadFilesToEventWizard && uploads.length > 0) {
        try {
          await (window as any).uploadFilesToEventWizard(presetId);
          console.log('📄 Fichiers uploadés vers preset:', presetId);
        } catch (error) {
          console.error('❌ Erreur upload fichiers preset:', error);
        }
      }

      // Mark as completed
      setSingleProgress(prev => prev ? { ...prev, status: 'completed' } : null);
      setCreationComplete(true);

      // Delay the onCreated call to let user see the completion
      setTimeout(() => {
        onCreated();
      }, 2000); // 2 seconds delay to see the completion

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      setSingleProgress(prev => 
        prev ? { ...prev, status: 'error', error: errorMessage } : null
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <EventWizardCore
        form={form}
        onFormChange={setForm}
        meta={meta}
        onMetaChange={setMeta}
        mode="page"
        presetOnly
        // Ne pas passer [] pour éviter refetch en boucle; laisser le composant auto-fetcher et cache
        onFinish={handleFinish}
        finishLabel={saving ? 'Sauvegarde...' : 'Ajouter le TP'}
      />
      
      {singleProgress && (
        <Box sx={{ mt: 3, width: '100%', maxWidth: 600, mx: 'auto' }}>
          <Typography
            variant="body2"
            gutterBottom
            sx={{
              fontWeight: 'bold',
              color: 'text.primary',
              width: '100%',
              textAlign: 'left',
            }}
          >
            Ajout en cours...
          </Typography>

          <Box display="flex" flexDirection="column" gap={1}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 1,
                display: 'flex',
                justifyContent: 'flex-end',
                width: '100%',
                textAlign: 'right',
              }}
            >
              • TP • Créneaux • Documents
            </Typography>
            
            <Card sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor:
                      singleProgress.status === 'completed'
                        ? 'success.main'
                        : singleProgress.status === 'error'
                          ? 'error.main'
                          : singleProgress.status === 'pending'
                            ? 'grey.300'
                            : 'primary.main',
                    animation:
                      singleProgress.status === 'creating' ||
                      singleProgress.status === 'slots' ||
                      singleProgress.status === 'documents'
                        ? 'pulse 1.5s ease-in-out infinite'
                        : 'none',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                      '100%': { opacity: 1 },
                    },
                  }}
                />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {singleProgress.title}
                </Typography>
                <Box display="flex" gap={1}>
                  {/* Status indicators */}
                  <Tooltip
                    title={
                      singleProgress.status === 'completed' || singleProgress.status === 'creating'
                        ? 'TP ajouté'
                        : 'TP en attente'
                    }
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor:
                          singleProgress.status === 'completed' || singleProgress.status === 'creating'
                            ? 'success.main'
                            : 'grey.300',
                      }}
                    />
                  </Tooltip>

                  <Tooltip
                    title={
                      singleProgress.slotsCount === 0
                        ? 'Aucun créneau'
                        : singleProgress.status === 'completed' || singleProgress.status === 'slots'
                          ? `${singleProgress.slotsCount} créneau(x) ajouté(s)`
                          : 'Créneaux en attente'
                    }
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor:
                          singleProgress.slotsCount === 0
                            ? 'grey.400'
                            : singleProgress.status === 'completed' ||
                                singleProgress.status === 'slots' ||
                                singleProgress.status === 'documents'
                              ? 'success.main'
                              : 'grey.300',
                      }}
                    />
                  </Tooltip>

                  <Tooltip
                    title={
                      singleProgress.documentCount === 0
                        ? 'Aucun document'
                        : singleProgress.status === 'completed'
                          ? `${singleProgress.documentCount} document(s) ajouté(s)`
                          : 'Documents en attente'
                    }
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor:
                          singleProgress.documentCount === 0
                            ? 'grey.400'
                            : singleProgress.status === 'completed'
                              ? 'success.main'
                              : 'grey.300',
                      }}
                    />
                  </Tooltip>
                </Box>

                {singleProgress.status === 'creating' && <CircularProgress size={16} />}
                {singleProgress.status === 'slots' && <CircularProgress size={16} />}
                {singleProgress.status === 'documents' && <CircularProgress size={16} />}
                {singleProgress.error && (
                  <Typography variant="caption" color="error">
                    {singleProgress.error}
                  </Typography>
                )}
              </Box>
            </Card>

            {creationComplete && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckIcon color="success" />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
                  TP ajouté avec succès !
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  onClick={() => {
                    setSingleProgress(null);
                    setCreationComplete(false);
                    onCreated();
                  }}
                  sx={{ mr: 1 }}
                >
                  Terminer maintenant
                </Button>
                <Typography variant="caption" color="text.secondary">
                  ou retour automatique dans quelques secondes...
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ===================== Batch creation wizard =====================
type OptionItem = { id: number; name: string; group: string; isCustom?: boolean };

function BatchPresetWizard({ onCreated }: { onCreated: () => void }) {
  // Step 1: description + naming
  const [discipline, setDiscipline] = useState<'chimie' | 'physique'>('chimie');
  const [count, setCount] = useState<number>(5);
  const [baseName, setBaseName] = useState<string>('');
  const [format, setFormat] = useState<'base_hash' | 'hash_base' | 'custom'>('base_hash');
  const [customPattern, setCustomPattern] = useState<string>('Événement {i}');
  const [notes, setNotes] = useState<string>('');

  // Step 2: scheduling
  const [mode, setMode] = useState<'recurrence' | 'manual' | 'none'>('recurrence');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [weekday, setWeekday] = useState<number>(new Date().getDay()); // 0=Dimanche
  const [timeStart, setTimeStart] = useState<string | null>('10:00');
  const [timeEnd, setTimeEnd] = useState<string | null>('12:00');
  const [manualDates, setManualDates] = useState<
    Array<{ date: Date | null; startTime: string | null; endTime: string | null }>
  >([]);
  const [timeslotsTouched, setTimeslotsTouched] = useState(false);
  type BatchSlot = {
    key: string;
    date: Date;
    startTime: string;
    endTime: string;
    targetIndex: number | null; // TP index association
  };
  const [batchSlots, setBatchSlots] = useState<BatchSlot[]>([]);
  // Global class/salle apply
  const [rawClasses, setRawClasses] = useState<OptionItem[]>([]);
  const [rawSalles, setRawSalles] = useState<OptionItem[]>([]);
  const [globalClass, setGlobalClass] = useState<OptionItem | null>(null);
  const [globalSalle, setGlobalSalle] = useState<OptionItem | null>(null);

  // Step 3: resources
  const [materials, setMaterials] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);

  // Step 4: documents mapping
  type LocalDoc = { id: string; file: File; targetIndex: number | null };
  const [docs, setDocs] = useState<LocalDoc[]>([]);
  const addFiles = (files: File[]) => {
    setDocs((prev) => {
      const alreadyAssigned = prev.filter((d) => d.targetIndex != null).length;
      const next = files.map((f, i) => ({
        id: `${Date.now()}_${Math.random()}`,
        file: f,
        targetIndex: count > 0 ? (alreadyAssigned + i) % count : null,
      }));
      return [...prev, ...next];
    });
  };
  const handlePickFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      addFiles(files);
    };
    input.click();
  };

  // Fetch classes & salles once
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/classes');
        if (r.ok) {
          const d = await r.json();
          const predefined = (d?.predefinedClasses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            group: 'Classes système',
            isCustom: false,
          }));
          const custom = (d?.customClasses || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            group: 'Mes classes',
            isCustom: true,
          }));
          setRawClasses([...custom, ...predefined]);
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch('/api/salles');
        if (r.ok) {
          const d = await r.json();
          const salles: OptionItem[] = (d?.salles || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            group: s.userOwnerId ? 'Mes salles' : 'Salles système',
            isCustom: !!s.userOwnerId,
          }));
          salles.sort((a, b) =>
            a.group === b.group ? a.name.localeCompare(b.name) : a.group === 'Mes salles' ? -1 : 1,
          );
          setRawSalles(salles);
        }
      } catch {}
    })();
  }, []);

  const groupedClasses = rawClasses;
  const groupedSalles = rawSalles;

  // Helpers
  const formatTitle = (i: number) => {
    const n = i + 1; // 1-based
    const fallback = 'Événement';
    if (format === 'base_hash') return `${baseName.trim() || fallback} ${n}`;
    if (format === 'hash_base') return `${n} ${baseName.trim() || fallback}`;
    const token = customPattern && customPattern.includes('{i}') ? customPattern : 'Événement {i}';
    return token.replace('{i}', String(n));
  };

  // Build schedule preview dates (memoized) for recurrence or manual
  const schedulePreview = useMemo((): Array<{ date: Date; startTime: string; endTime: string }> => {
    if (mode === 'none') return [];
    if (mode === 'manual') {
      const selected = manualDates.filter((d) => d.date && d.startTime && d.endTime) as Array<{
        date: Date;
        startTime: string;
        endTime: string;
      }>;
      return selected.slice(0, count);
    }
    // recurrence
    const res: Array<{ date: Date; startTime: string; endTime: string }> = [];
    if (!startDate || !timeStart || !timeEnd) return res;
    let d = new Date(startDate);
    // Align to desired weekday
    const jsWeekday = weekday; // 0..6, 0=Sun
    while (d.getDay() !== jsWeekday) {
      d.setDate(d.getDate() + 1);
    }
    for (let i = 0; i < count; i++) {
      res.push({ date: new Date(d), startTime: timeStart, endTime: timeEnd });
      d = new Date(d);
      d.setDate(d.getDate() + 7);
    }
    return res;
  }, [mode, manualDates, count, startDate, timeStart, timeEnd, weekday]);
  // Rebuild/merge batchSlots when schedule changes (preserve user mapping where possible)
  useEffect(() => {
    setBatchSlots((prev) => {
      const next: BatchSlot[] = schedulePreview.map((s, i) => {
        const match = prev.find(
          (p) =>
            p.date.getTime() === s.date.getTime() &&
            p.startTime === s.startTime &&
            p.endTime === s.endTime,
        );
        const targetIndex = match ? match.targetIndex : count > 0 ? i % count : null;
        return {
          key: `${s.date.getTime()}_${s.startTime}_${s.endTime}`,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          targetIndex,
        };
      });
      const equal =
        prev.length === next.length &&
        prev.every(
          (p, idx) =>
            p.date.getTime() === next[idx].date.getTime() &&
            p.startTime === next[idx].startTime &&
            p.endTime === next[idx].endTime &&
            p.targetIndex === next[idx].targetIndex,
        );
      return equal ? prev : next;
    });
  }, [schedulePreview, count]);

  // Steps
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Progress tracking state
  const [batchProgress, setBatchProgress] = useState<{
    currentIndex: number;
    total: number;
    events: Array<{
      index: number;
      title: string;
      status: 'pending' | 'creating' | 'slots' | 'documents' | 'completed' | 'error';
      presetId?: number;
      documentCount: number;
      slotsCount: number;
      error?: string;
    }>;
  } | null>(
    // Fake value for development testing
    // process.env.NODE_ENV === 'development' ? {
    //   currentIndex: 2,
    //   total: 5,
    //   events: [
    //     {
    //       index: 0,
    //       title: 'TP Chimie 1',
    //       status: 'completed',
    //       documentCount: 2,
    //       slotsCount: 1,
    //     },
    //     {
    //       index: 1,
    //       title: 'TP Chimie 2',
    //       status: 'completed',
    //       documentCount: 1,
    //       slotsCount: 2,
    //     },
    //     {
    //       index: 2,
    //       title: 'TP Chimie 3',
    //       status: 'documents',
    //       documentCount: 3,
    //       slotsCount: 1,
    //     },
    //     {
    //       index: 3,
    //       title: 'TP Chimie 4',
    //       status: 'pending',
    //       documentCount: 0,
    //       slotsCount: 1,
    //     },
    //     {
    //       index: 4,
    //       title: 'TP Chimie 5',
    //       status: 'pending',
    //       documentCount: 1,
    //       slotsCount: 0,
    //     },
    //   ]
    // } :
    null,
  );

  // Batch control states
  const [batchStopped, setBatchStopped] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [batchComplete, setBatchComplete] = useState(false);

  // Handle batch resumption
  useEffect(() => {
    if (!batchStopped || !batchProgress || !abortController) return;

    // Find the first pending task to resume from
    const hasPendingTasks = batchProgress.events.some((e) => e.status === 'pending');
    if (!hasPendingTasks) {
      // No more tasks to resume
      setBatchComplete(true);
    }
  }, [batchStopped, batchProgress, abortController]);

  // Function to resume batch processing
  const handleBatchResume = async () => {
    if (!batchProgress) return;

    setSaving(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const pendingEvents = batchProgress.events.filter((e) => e.status === 'pending');

      for (const event of pendingEvents) {
        if (batchStopped || controller.signal.aborted) {
          break;
        }

        const i = event.index;
        const title = event.title;

        // Update current event status
        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                currentIndex: i,
                events: prev.events.map((e) => (e.index === i ? { ...e, status: 'creating' } : e)),
              }
            : null,
        );

        // Continue with the same creation logic as the original function...
        const r = await fetch('/api/event-presets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            discipline,
            notes,
            materiels: materials.map((m: any) => ({
              materielId: m.id ?? undefined,
              materielName: m.name,
              quantity: m.quantity || 1,
              isCustom: !m.id,
            })),
            reactifs: chemicals.map((r: any) => ({
              reactifId: r.id ?? undefined,
              reactifName: r.name,
              requestedQuantity: r.requestedQuantity || 0,
              unit: r.unit || 'g',
              isCustom: !r.id,
            })),
            documents: [],
          }),
        });

        if (!r.ok) throw new Error(`Échec création TP ${i + 1}: ${title}`);
        const created = await r.json();
        const presetId = created?.preset?.id;

        if (!presetId) throw new Error(`ID preset manquant pour TP ${i + 1}`);

        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((e) =>
                  e.index === i ? { ...e, presetId, status: 'slots' } : e,
                ),
              }
            : null,
        );

        // Create slots logic...
        const slots = batchSlots
          .filter((bs) => bs.targetIndex === i)
          .map((s) => {
            const y = s.date;
            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
            const [sh, sm] = (s.startTime as string).split(':').map((n) => parseInt(n, 10));
            const [eh, em] = (s.endTime as string).split(':').map((n) => parseInt(n, 10));
            const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), sh, sm, 0, 0);
            const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), eh, em, 0, 0);
            const localIsoNoZ = (d: Date) =>
              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
            return {
              startDate: localIsoNoZ(start),
              endDate: localIsoNoZ(end),
              timeslotDate: `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`,
              salleIds: globalSalle ? [globalSalle.id] : [],
              classIds: globalClass ? [globalClass.id] : [],
            };
          });

        if (presetId && slots.length) {
          await fetch(`/api/event-presets/${presetId}/creneaux`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discipline, slots }),
          });
        }

        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((e) => (e.index === i ? { ...e, status: 'documents' } : e)),
              }
            : null,
        );

        // Upload documents logic...
        if (presetId) {
          const filesForThis = docs.filter((d) => d.targetIndex === i);
          for (const d of filesForThis) {
            if (batchStopped || controller.signal.aborted) {
              break;
            }

            const formData = new FormData();
            formData.append('file', d.file);
            await fetch(`/api/event-presets/${presetId}/documents`, {
              method: 'POST',
              body: formData,
            });
          }
        }

        setBatchProgress((prev) =>
          prev
            ? {
                ...prev,
                events: prev.events.map((e) => (e.index === i ? { ...e, status: 'completed' } : e)),
              }
            : null,
        );
      }

      // Mark as complete if all done and not stopped
      if (!batchStopped && !controller.signal.aborted) {
        setBatchComplete(true);
      }
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
      setBatchProgress((prev) =>
        prev
          ? {
              ...prev,
              events: prev.events.map((e) =>
                e.index === prev.currentIndex ? { ...e, status: 'error', error: errorMessage } : e,
              ),
            }
          : null,
      );
    } finally {
      setSaving(false);
    }
  };

  // Validations mimic EventWizardCore for required steps
  const descriptionValid =
    count > 0 && (format !== 'custom' ? !!baseName.trim() : !!customPattern.trim());
  // In 'none' mode, timeslots are optional; otherwise require at least one defined slot
  const timeSlotsValid = mode === 'none' ? true : timeslotsTouched && batchSlots.length > 0;

  const steps: GenericWizardStep[] = [
    {
      key: 'description',
      label: 'Description',
      required: true,
      valid: descriptionValid,
      content: (
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            select
            label="Discipline"
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value as any)}
            fullWidth
          >
            <MenuItem value="chimie">chimie</MenuItem>
            <MenuItem value="physique">physique</MenuItem>
          </TextField>
          <TextField
            type="number"
            label="Nombre de TP à ajouter"
            value={count}
            onChange={(e) => setCount(Math.max(1, Number(e.target.value || 1)))}
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Nom de base"
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            helperText="Sera utilisé selon le format choisi"
          />
          <TextField
            select
            label="Format du titre"
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            fullWidth
          >
            <MenuItem value="base_hash">Nom de base + compteur (ex: TP 1)</MenuItem>
            <MenuItem value="hash_base">Compteur + nom de base (ex: 1 TP)</MenuItem>
            <MenuItem value="custom">Personnalisé (utilisez {`{i}`} pour l'index)</MenuItem>
          </TextField>
          {format === 'custom' && (
            <TextField
              label="Patron personnalisé"
              value={customPattern}
              onChange={(e) => setCustomPattern(e.target.value)}
              helperText="Ex: Séance {i} - "
            />
          )}
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={3}
          />
          <Box>
            <Typography variant="subtitle2">Aperçu des titres</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {Array.from({ length: Math.min(5, Math.max(1, count)) }).map((_, i) => (
                <Chip key={i} label={formatTitle(i)} size="small" />
              ))}
            </Box>
          </Box>
          <Box>
            <Button variant="contained" onClick={() => setActiveStep(1)} disabled={count < 1}>
              Continuer
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      key: 'timeslots',
      label: 'Créneaux',
      required: false,
      valid: timeSlotsValid,
      content: (
        <Box display="flex" flexDirection="column" gap={2}>
          <Box>
            <TextField
              select
              label="Mode de planification"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as 'recurrence' | 'manual' | 'none');
                setTimeslotsTouched(true);
              }}
              fullWidth
            >
              <MenuItem value="recurrence">Récurrence hebdomadaire</MenuItem>
              <MenuItem value="manual">Sélection manuelle des jours</MenuItem>
              <MenuItem value="none">Sans créneaux (à planifier plus tard)</MenuItem>
            </TextField>
          </Box>
          {mode === 'none' ? (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Aucun créneau ne sera ajouté maintenant. Vous pourrez les planifier plus tard.
              </Typography>
            </Box>
          ) : mode === 'recurrence' ? (
            <Box
              display="grid"
              gap={2}
              sx={{ gridTemplateColumns: { xs: '1fr', sm: 'repeat(1, minmax(220px, 1fr))' } }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    sm: 'row',
                  },
                  gap: 1,
                  width: '100%',
                  alignItems: 'end',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                    À partir du
                  </Typography>
                  <FrenchDateOnly
                    selected={startDate}
                    onChange={(d: Date | null) => {
                      setStartDate(d);
                      setTimeslotsTouched(true);
                    }}
                    customInput={<TextField fullWidth />}
                  />
                </Box>
                <TextField
                  select
                  label="Jour de la semaine"
                  value={weekday}
                  onChange={(e) => {
                    setWeekday(Number(e.target.value));
                    setTimeslotsTouched(true);
                  }}
                  fullWidth
                >
                  <MenuItem value={0}>Dimanche</MenuItem>
                  <MenuItem value={1}>Lundi</MenuItem>
                  <MenuItem value={2}>Mardi</MenuItem>
                  <MenuItem value={3}>Mercredi</MenuItem>
                  <MenuItem value={4}>Jeudi</MenuItem>
                  <MenuItem value={5}>Vendredi</MenuItem>
                  <MenuItem value={6}>Samedi</MenuItem>
                </TextField>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  width: '100%',
                }}
              ></Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    sm: 'row',
                  },
                  gap: 1,
                  width: '100%',
                  alignItems: 'end',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                    Heure de début
                  </Typography>
                  <FrenchTimeOnly
                    selected={timeStart ? new Date(`1970-01-01T${timeStart}:00`) : null}
                    onChange={(d: Date | null) => {
                      if (!d) return;
                      const h = d.getHours().toString().padStart(2, '0');
                      const m = d.getMinutes().toString().padStart(2, '0');
                      setTimeStart(`${h}:${m}`);
                      setTimeslotsTouched(true);
                    }}
                    customInput={<TextField fullWidth />}
                  />
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                    Heure de fin
                  </Typography>
                  <FrenchTimeOnly
                    selected={timeEnd ? new Date(`1970-01-01T${timeEnd}:00`) : null}
                    onChange={(d: Date | null) => {
                      if (!d) return;
                      const h = d.getHours().toString().padStart(2, '0');
                      const m = d.getMinutes().toString().padStart(2, '0');
                      setTimeEnd(`${h}:${m}`);
                      setTimeslotsTouched(true);
                    }}
                    customInput={<TextField fullWidth />}
                  />
                </Box>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Ajoutez les jours souhaités puis renseignez l'heure pour chacun
              </Typography>
              <Box display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
                <FrenchDateOnly
                  selected={null}
                  onChange={(d: Date | null) => {
                    setManualDates((prev) => [
                      ...prev,
                      {
                        date: d as Date,
                        startTime: timeStart || '10:00',
                        endTime: timeEnd || '12:00',
                      },
                    ]);
                    setTimeslotsTouched(true);
                  }}
                  customInput={<TextField placeholder="Choisir un jour" />}
                />
                <Button
                  variant="outlined"
                  onClick={() => {
                    setManualDates((prev) => [
                      ...prev,
                      {
                        date: new Date(),
                        startTime: timeStart || '10:00',
                        endTime: timeEnd || '12:00',
                      },
                    ]);
                    setTimeslotsTouched(true);
                  }}
                >
                  Ajouter aujourd'hui
                </Button>
              </Box>
              <Box
                display="grid"
                gap={2}
                sx={{
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(220px, 1fr))' },
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                    Définir début pour tous
                  </Typography>
                  <FrenchTimeOnly
                    selected={timeStart ? new Date(`1970-01-01T${timeStart}:00`) : null}
                    onChange={(d: Date | null) => {
                      if (!d) return;
                      const h = d.getHours().toString().padStart(2, '0');
                      const m = d.getMinutes().toString().padStart(2, '0');
                      const v = `${h}:${m}`;
                      setTimeStart(v);
                      setManualDates((prev) => prev.map((r) => ({ ...r, startTime: v })));
                      setTimeslotsTouched(true);
                    }}
                    customInput={<TextField fullWidth />}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" fontWeight={600} gutterBottom display="block">
                    Définir fin pour tous
                  </Typography>
                  <FrenchTimeOnly
                    selected={timeEnd ? new Date(`1970-01-01T${timeEnd}:00`) : null}
                    onChange={(d: Date | null) => {
                      if (!d) return;
                      const h = d.getHours().toString().padStart(2, '0');
                      const m = d.getMinutes().toString().padStart(2, '0');
                      const v = `${h}:${m}`;
                      setTimeEnd(v);
                      setManualDates((prev) => prev.map((r) => ({ ...r, endTime: v })));
                      setTimeslotsTouched(true);
                    }}
                    customInput={<TextField fullWidth />}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {manualDates.map((row, idx) => (
                  <Card key={idx} sx={{ p: 1.5 }}>
                    <Box
                      display="grid"
                      gap={2}
                      sx={{
                        gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr 1fr 1fr' },
                        alignItems: 'center',
                      }}
                    >
                      <IconButton
                        aria-label="Supprimer"
                        color="error"
                        size="small"
                        onClick={() => {
                          setManualDates((prev) => prev.filter((_, i) => i !== idx));
                          setTimeslotsTouched(true);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <FrenchDateOnly
                        selected={row.date}
                        onChange={(d: Date | null) => {
                          setManualDates((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, date: d as Date } : r)),
                          );
                          setTimeslotsTouched(true);
                        }}
                        customInput={<TextField fullWidth />}
                      />
                      <FrenchTimeOnly
                        selected={row.startTime ? new Date(`1970-01-01T${row.startTime}:00`) : null}
                        onChange={(d: Date | null) => {
                          if (!d) return;
                          const h = d.getHours().toString().padStart(2, '0');
                          const m = d.getMinutes().toString().padStart(2, '0');
                          setManualDates((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, startTime: `${h}:${m}` } : r)),
                          );
                          setTimeslotsTouched(true);
                        }}
                        customInput={<TextField fullWidth />}
                      />
                      <FrenchTimeOnly
                        selected={row.endTime ? new Date(`1970-01-01T${row.endTime}:00`) : null}
                        onChange={(d: Date | null) => {
                          if (!d) return;
                          const h = d.getHours().toString().padStart(2, '0');
                          const m = d.getMinutes().toString().padStart(2, '0');
                          setManualDates((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, endTime: `${h}:${m}` } : r)),
                          );
                          setTimeslotsTouched(true);
                        }}
                        customInput={<TextField fullWidth />}
                      />
                    </Box>
                  </Card>
                ))}
              </Box>
            </Box>
          )}

          <Box display="grid" gap={2} sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box>
              <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                Classe pour tous
              </Typography>
              <Autocomplete
                size="small"
                options={groupedClasses}
                groupBy={(o) => o.group}
                getOptionLabel={(o) => o.name}
                value={globalClass}
                onChange={(_, v) => setGlobalClass(v)}
                renderInput={(p) => <TextField {...p} placeholder="Choisir une classe" />}
              />
            </Box>
            <Box>
              <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                Salle pour tous
              </Typography>
              <Autocomplete
                size="small"
                options={groupedSalles}
                groupBy={(o) => o.group}
                getOptionLabel={(o) => o.name}
                value={globalSalle}
                onChange={(_, v) => setGlobalSalle(v)}
                renderInput={(p) => <TextField {...p} placeholder="Choisir une salle" />}
              />
            </Box>
          </Box>
          <Box>
            <Typography variant="subtitle2">Aperçu et association des créneaux</Typography>
            {batchSlots.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Aucun créneau pour le moment.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                {batchSlots.map((s, idx) => {
                  const usageMap = batchSlots.reduce<Record<number, number>>((acc, cur) => {
                    if (cur.targetIndex != null)
                      acc[cur.targetIndex] = (acc[cur.targetIndex] || 0) + 1;
                    return acc;
                  }, {});
                  const dateStr = s.date.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <Card key={s.key} sx={{ p: 1.5 }}>
                      <Grid
                        container
                        sx={{
                          display: 'flex',
                          alignContent: 'center',
                          flexDirection: { xs: 'column', md: 'row' },
                          justifyContent: 'space-around',
                        }}
                      >
                        <Grid
                          size={{ xs: 12, md: 4 }}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: { xs: 'start', md: 'flex-end' },
                            width: '100%',
                          }}
                        >
                          <Typography variant="body2" sx={{ mb: { xs: 1, sm: 1, md: 0 } }}>
                            {dateStr} : {s.startTime} → {s.endTime}
                          </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, md: 7 }}>
                          <TextField
                            select
                            size="small"
                            label="Associer à"
                            value={s.targetIndex ?? ''}
                            sx={{ width: '100%' }}
                            onChange={(e) => {
                              const v = e.target.value === '' ? null : Number(e.target.value);
                              setBatchSlots((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, targetIndex: v } : x)),
                              );
                              setTimeslotsTouched(true);
                            }}
                          >
                            <MenuItem value="">— Non associé —</MenuItem>
                            {Array.from({ length: count }).map((_, i) => (
                              <MenuItem key={i} value={i}>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                  }}
                                >
                                  <span>{formatTitle(i)}</span>
                                  {!!usageMap[i] && <Chip size="small" label={`×${usageMap[i]}`} />}
                                </Box>
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      </Grid>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
          <Box>
            <Button variant="contained" onClick={() => setActiveStep(2)}>
              Continuer
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      key: 'resources',
      label: 'Ressources',
      required: false,
      valid: materials.length + chemicals.length > 0,
      content: (
        <Box>
          <AddResourcesDialog
            mode="embedded"
            discipline={discipline}
            presetMaterials={materials as any}
            customMaterials={[]}
            presetChemicals={chemicals as any}
            customChemicals={[]}
            onChange={(d: AddResourcesDialogChange) => {
              setMaterials([
                ...d.presetMaterials,
                ...d.customMaterials.map((c) => ({ name: c.name, quantity: c.quantity })),
              ]);
              setChemicals([
                ...d.presetChemicals,
                ...d.customChemicals.map((c) => ({
                  name: c.name,
                  requestedQuantity: c.requestedQuantity,
                  unit: c.unit,
                })),
              ]);
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setActiveStep(3)}>
              Continuer
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      required: false,
      valid: docs.length > 0,
      content: (
        <Box display="flex" flexDirection="column" gap={2}>
          <Card
            sx={{
              p: 3,
              border: '2px dashed',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []);
              addFiles(files);
            }}
            onClick={handlePickFiles}
          >
            <Typography variant="h6" gutterBottom>
              Glissez-déposez des fichiers ici
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ou cliquez pour parcourir
            </Typography>
          </Card>
          {docs.some((d) => d.targetIndex == null) && (
            <Card sx={{ p: 1.5, borderLeft: '4px solid', borderColor: 'warning.main' }}>
              <Typography variant="body2" color="warning.main">
                Certains fichiers ne sont pas associés à un TP.
              </Typography>
            </Card>
          )}
          {docs.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              {docs.map((d, idx) => {
                const usageMap = docs.reduce<Record<number, number>>((acc, cur) => {
                  if (cur.targetIndex != null)
                    acc[cur.targetIndex] = (acc[cur.targetIndex] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <Card key={d.id} sx={{ p: 1.5 }}>
                    <Box
                      display="grid"
                      gap={1}
                      sx={{
                        gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                        alignItems: 'center',
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2">{d.file.name}</Typography>
                      </Box>
                      <TextField
                        select
                        size="small"
                        label="Associer à"
                        value={d.targetIndex ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          setDocs((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, targetIndex: v } : x)),
                          );
                        }}
                      >
                        <MenuItem value="">— Non associé —</MenuItem>
                        {Array.from({ length: count }).map((_, i) => (
                          <MenuItem key={i} value={i}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                              }}
                            >
                              <span>{formatTitle(i)}</span>
                              {!!usageMap[i] && <Chip size="small" label={`×${usageMap[i]}`} />}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}
          <Box>
            <Button variant="contained" onClick={() => setActiveStep(4)}>
              Continuer
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      key: 'recap',
      label: 'Récap',
      required: true,
      valid: descriptionValid,
      content: (
        <Box>
          <Typography variant="subtitle2">Discipline: {discipline}</Typography>
          <Typography variant="subtitle2">Nombre: {count}</Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Format des titres:{' '}
            {Array.from({ length: Math.min(3, count) })
              .map((_, i) => formatTitle(i))
              .join(', ')}
            {count > 3 ? '…' : ''}
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              gap: 2,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Stack
              sx={{
                display: 'flex',
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' },
                flexGrow: 1,
                width: '100%',
                maxWidth: 600,
              }}
            >
              {!batchProgress ? (
                <Button fullWidth variant="outlined" onClick={() => setActiveStep(0)}>
                  Revenir
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  color={batchStopped ? 'primary' : 'error'}
                  startIcon={batchStopped ? <PlayArrowIcon /> : <StopIcon />}
                  disabled={batchComplete} // Griser le bouton quand le batch est terminé
                  onClick={() => {
                    if (batchStopped) {
                      // Reprendre - relancer le processus depuis les tâches pending
                      setBatchStopped(false);

                      const pendingTasks =
                        batchProgress?.events.filter((e) => e.status === 'pending') || [];
                      if (pendingTasks.length > 0) {
                        // Restart the batch process for remaining tasks
                        handleBatchResume();
                      }
                    } else {
                      // Arrêter
                      setBatchStopped(true);
                      if (abortController) {
                        abortController.abort();
                      }
                    }
                  }}
                >
                  {batchStopped ? 'Reprendre' : 'Arrêter tout'}
                </Button>
              )}

              {batchComplete ? (
                <Button
                  fullWidth
                  startIcon={<CheckIcon />}
                  variant="contained"
                  color="success"
                  onClick={() => {
                    setBatchProgress(null);
                    setBatchComplete(false);
                    setBatchStopped(false);
                    onCreated();
                  }}
                >
                  Terminer
                </Button>
              ) : (
                <Button
                  fullWidth
                  startIcon={<AddIcon />}
                  variant="outlined"
                  color="success"
                  sx={{
                    minWidth: 250,
                  }}
                  disabled={saving || !!batchProgress}
                  onClick={async () => {
                    if (saving) return;
                    setSaving(true);
                    setBatchStopped(false);
                    setBatchComplete(false);

                    const controller = new AbortController();
                    setAbortController(controller);

                    // Initialize progress tracking
                    const events = Array.from({ length: count }).map((_, i) => {
                      const slotsForThis = batchSlots.filter((bs) => bs.targetIndex === i);
                      const docsForThis = docs.filter((d) => d.targetIndex === i);
                      return {
                        index: i,
                        title: formatTitle(i),
                        status: 'pending' as const,
                        documentCount: docsForThis.length,
                        slotsCount: slotsForThis.length,
                      };
                    });

                    setBatchProgress({
                      currentIndex: 0,
                      total: count,
                      events,
                    });

                    try {
                      // Create EvenementPreset (TP) items instead of events
                      const titles = Array.from({ length: count }).map((_, i) => formatTitle(i));
                      for (let i = 0; i < titles.length; i++) {
                        // Check if stopped
                        if (batchStopped || controller.signal.aborted) {
                          break;
                        }

                        // Update current event status
                        setBatchProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                currentIndex: i,
                                events: prev.events.map((e) =>
                                  e.index === i ? { ...e, status: 'creating' } : e,
                                ),
                              }
                            : null,
                        );

                        const title = titles[i];
                        const r = await fetch('/api/event-presets', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title,
                            discipline,
                            notes,
                            materiels: materials.map((m: any) => ({
                              materielId: m.id ?? undefined,
                              materielName: m.name,
                              quantity: m.quantity || 1,
                              isCustom: !m.id,
                            })),
                            reactifs: chemicals.map((r: any) => ({
                              reactifId: r.id ?? undefined,
                              reactifName: r.name,
                              requestedQuantity: r.requestedQuantity || 0,
                              unit: r.unit || 'g',
                              isCustom: !r.id,
                            })),
                            documents: [],
                          }),
                        });
                        if (!r.ok) throw new Error(`Échec création TP ${i + 1}: ${title}`);
                        const created = await r.json();
                        const presetId = created?.preset?.id;

                        if (!presetId) throw new Error(`ID preset manquant pour TP ${i + 1}`);

                        // Check if stopped after creation
                        if (batchStopped || controller.signal.aborted) {
                          break;
                        }

                        setBatchProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                events: prev.events.map((e) =>
                                  e.index === i ? { ...e, presetId, status: 'slots' } : e,
                                ),
                              }
                            : null,
                        );

                        // Create associated preset slots only for slots mapped to this preset index
                        const slots = batchSlots
                          .filter((bs) => bs.targetIndex === i)
                          .map((s) => {
                            const y = s.date;
                            const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                            const [sh, sm] = (s.startTime as string)
                              .split(':')
                              .map((n) => parseInt(n, 10));
                            const [eh, em] = (s.endTime as string)
                              .split(':')
                              .map((n) => parseInt(n, 10));
                            const start = new Date(
                              y.getFullYear(),
                              y.getMonth(),
                              y.getDate(),
                              sh,
                              sm,
                              0,
                              0,
                            );
                            const end = new Date(
                              y.getFullYear(),
                              y.getMonth(),
                              y.getDate(),
                              eh,
                              em,
                              0,
                              0,
                            );
                            const localIsoNoZ = (d: Date) =>
                              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
                            return {
                              startDate: localIsoNoZ(start),
                              endDate: localIsoNoZ(end),
                              timeslotDate: `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`,
                              salleIds: globalSalle ? [globalSalle.id] : [],
                              classIds: globalClass ? [globalClass.id] : [],
                            };
                          });
                        if (presetId && slots.length) {
                          await fetch(`/api/event-presets/${presetId}/creneaux`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ discipline, slots }),
                          });
                        }

                        // Check if stopped after slots
                        if (batchStopped || controller.signal.aborted) {
                          break;
                        }

                        setBatchProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                events: prev.events.map((e) =>
                                  e.index === i ? { ...e, status: 'documents' } : e,
                                ),
                              }
                            : null,
                        );

                        // Upload files assigned to this preset
                        if (presetId) {
                          const filesForThis = docs.filter((d) => d.targetIndex === i);
                          for (const d of filesForThis) {
                            // Check if stopped during file upload
                            if (batchStopped || controller.signal.aborted) {
                              break;
                            }

                            const formData = new FormData();
                            formData.append('file', d.file);
                            await fetch(`/api/event-presets/${presetId}/documents`, {
                              method: 'POST',
                              body: formData,
                            });
                          }
                        }

                        setBatchProgress((prev) =>
                          prev
                            ? {
                                ...prev,
                                events: prev.events.map((e) =>
                                  e.index === i ? { ...e, status: 'completed' } : e,
                                ),
                              }
                            : null,
                        );
                      }

                      // Mark as complete only if not stopped
                      if (!batchStopped && !controller.signal.aborted) {
                        setBatchComplete(true);
                      }
                    } catch (e) {
                      console.error(e);
                      const errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
                      setBatchProgress((prev) =>
                        prev
                          ? {
                              ...prev,
                              events: prev.events.map((e) =>
                                e.index === prev.currentIndex
                                  ? { ...e, status: 'error', error: errorMessage }
                                  : e,
                              ),
                            }
                          : null,
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  {saving ? 'Ajout...' : 'Ajouter tous les TP'}
                </Button>
              )}
            </Stack>

            {batchProgress && (
              <Box sx={{ mt: 2, width: '100%', maxWidth: 600 }}>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  Ajout en cours... ({batchProgress.currentIndex + 1}/{batchProgress.total})
                </Typography>

                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      mt: 1,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      width: '100%',
                      textAlign: 'right',
                    }}
                  >
                    • TP • Créneaux • Documents
                  </Typography>
                  {batchProgress.events.map((event) => (
                    <Card key={event.index} sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor:
                              event.status === 'completed'
                                ? 'success.main'
                                : event.status === 'error'
                                  ? 'error.main'
                                  : event.status === 'pending'
                                    ? 'grey.300'
                                    : 'primary.main',
                            animation:
                              event.status === 'creating' ||
                              event.status === 'slots' ||
                              event.status === 'documents'
                                ? 'pulse 1.5s ease-in-out infinite'
                                : 'none',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                              '100%': { opacity: 1 },
                            },
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {event.title}
                        </Typography>
                        <Box display="flex" gap={1}>
                          {/* Status indicators */}
                          <Tooltip
                            title={
                              event.status === 'completed' || event.status === 'creating'
                                ? 'TP ajouté'
                                : 'TP en attente'
                            }
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor:
                                  event.status === 'completed' || event.status === 'creating'
                                    ? 'success.main'
                                    : 'grey.300',
                              }}
                            />
                          </Tooltip>

                          <Tooltip
                            title={
                              event.slotsCount === 0
                                ? 'Aucun créneau'
                                : event.status === 'completed' || event.status === 'slots'
                                  ? `${event.slotsCount} créneau(x) ajouté(s)`
                                  : 'Créneaux en attente'
                            }
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor:
                                  event.slotsCount === 0
                                    ? 'grey.400'
                                    : event.status === 'completed' ||
                                        event.status === 'slots' ||
                                        event.status === 'documents'
                                      ? 'success.main'
                                      : 'grey.300',
                              }}
                            />
                          </Tooltip>

                          <Tooltip
                            title={
                              event.documentCount === 0
                                ? 'Aucun document'
                                : event.status === 'completed'
                                  ? `${event.documentCount} document(s) ajouté(s)`
                                  : 'Documents en attente'
                            }
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor:
                                  event.documentCount === 0
                                    ? 'grey.400'
                                    : event.status === 'completed'
                                      ? 'success.main'
                                      : 'grey.300',
                              }}
                            />
                          </Tooltip>
                        </Box>

                        {event.status === 'creating' && <CircularProgress size={16} />}
                        {event.status === 'slots' && <CircularProgress size={16} />}
                        {event.status === 'documents' && <CircularProgress size={16} />}
                        {event.error && (
                          <Typography variant="caption" color="error">
                            {event.error}
                          </Typography>
                        )}
                      </Box>
                    </Card>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <WizardStepper
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        orientation="vertical"
      />
    </Box>
  );
}
// Composant pour le dialog de suppression en lot
function BulkDeleteDialog({
  open,
  presets,
  onClose,
  onConfirm,
}: {
  open: boolean;
  presets: any[];
  onClose: () => void;
  onConfirm: () => void;
}) {
  const openDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const totalDocuments = presets.reduce((sum, preset) => sum + (preset.documents?.length || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DeleteSweepIcon color="error" />
          Confirmer la suppression en lot
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ⚠️ ATTENTION : Suppression définitive
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Tous les fichiers documents associés ({totalDocuments} fichier
            {totalDocuments > 1 ? 's' : ''}) seront automatiquement supprimés du disque et ne
            pourront pas être récupérés.
          </Typography>
        </Alert>

        <Typography variant="h6" gutterBottom>
          {presets.length} TP{presets.length > 1 ? 's' : ''} à supprimer :
        </Typography>

        <List sx={{ maxHeight: 400, overflow: 'auto' }}>
          {presets.map((preset) => (
            <Box key={preset.id}>
              <ListItem sx={{ px: 0, py: 1 }}>
                <ListItemIcon>
                  <DeleteIcon color="error" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {preset.title}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {preset.discipline} • Créé le{' '}
                        {new Date(preset.createdAt).toLocaleDateString('fr-FR')}
                      </Typography>
                      {preset.creneaux?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {preset.creneaux.length} créneau{preset.creneaux.length > 1 ? 'x' : ''}
                        </Typography>
                      )}
                      {(preset.materiels?.length > 0 || preset.reactifs?.length > 0) && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          • {preset.materiels?.length || 0} matériel
                          {(preset.materiels?.length || 0) > 1 ? 's' : ''}•{' '}
                          {preset.reactifs?.length || 0} réactif
                          {(preset.reactifs?.length || 0) > 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>

              {/* Documents section */}
              {preset.documents?.length > 0 && (
                <Box sx={{ ml: 6, mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
                    Documents à supprimer définitivement :
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {preset.documents.map((doc: any, idx: number) => (
                      <Box
                        key={idx}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
                      >
                        <DescriptionIcon fontSize="small" color="action" />
                        <Typography variant="caption" sx={{ flex: 1 }}>
                          {doc.fileName || 'Document'}
                        </Typography>
                        <Tooltip title="Ouvrir le document">
                          <IconButton
                            size="small"
                            onClick={() => openDocument(doc.fileUrl)}
                            sx={{ ml: 'auto' }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {preset !== presets[presets.length - 1] && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={onConfirm}>
          Supprimer définitivement ({presets.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
