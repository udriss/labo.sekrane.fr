'use client';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  Stack,
  Autocomplete,
  IconButton,
  Chip,
  MenuItem,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import WizardStepper, { GenericWizardStep } from './WizardStepper';
import { computeWizardValidation } from './wizardValidation';
import {
  Assignment as AssignmentIcon,
  Class as ClassIcon,
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import AddResourcesDialog, { AddResourcesDialogChange } from './AddResourcesDialog';
import { FileUploadSection } from './FileUploadSection';
import type { FileWithMetadata } from '@/types/global';
import 'react-datepicker/dist/react-datepicker.css';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
} from '@/components/shared/FrenchDatePicker';

import {
  Delete as DeleteIcon, 
  Add as AddIcon,
} from '@mui/icons-material';

export interface WizardMeta {
  method?: 'file' | 'manual' | 'preset';
  presetId?: number | string;
  materialsDetailed?: any[];
  chemicalsDetailed?: any[];
  uploads?: string[];
  remarks?: string;
}

export interface WizardForm {
  title: string;
  discipline: 'chimie' | 'physique';
  notes?: string;
}

interface EventWizardCoreProps {
  form: WizardForm;
  onFormChange: (f: WizardForm) => void;
  meta: WizardMeta;
  onMetaChange: (m: WizardMeta) => void;
  mode: 'dialog' | 'page';
  presetOnly?: boolean; // force method=preset and hide method selection cards
  availablePresets?: any[];
  // Prefill when editing a preset: slots read from backend
  initialPresetSlots?: Array<{
    id?: number;
    startDate: string;
    endDate: string;
    timeslotDate?: string | null;
    salleIds?: number[] | null;
    classIds?: number[] | null;
  }>;
  onFinish: () => Promise<void> | void;
  finishLabel?: string;
  onEventCreated?: (eventId: number) => void;
}

export default function EventWizardCore({
  form,
  onFormChange,
  meta,
  onMetaChange,
  mode,
  presetOnly = false,
  availablePresets = [],
  initialPresetSlots,
  onFinish,
  finishLabel = 'Terminer',
  onEventCreated,
}: EventWizardCoreProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadMethod, setUploadMethod] = useState<string | null>(
    presetOnly ? 'preset' : (meta as any).method || null,
  );
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  const [internalPresets, setInternalPresets] = useState<any[]>(availablePresets);

  // Function to upload files to a specific event ID (called after event creation)
  const uploadFilesToEvent = useCallback(async (eventId: number): Promise<void> => {
    const filesToUpload = selectedFiles.filter(f => f.file && f.uploadStatus === 'pending');
    
    for (const fileObj of filesToUpload) {
      if (!fileObj.file) continue;
      
      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);
        
        const apiPath = meta.presetId
          ? `/api/event-presets/${meta.presetId}/documents`
          : `/api/events/${eventId}/documents`;
        
        const response = await fetch(apiPath, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const uploaded = await response.json();
          // Marquer le fichier comme uploadé
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? {
                  ...f,
                  existingFile: {
                    fileName: uploaded.fileName || uploaded.document?.fileName,
                    fileUrl: uploaded.fileUrl || uploaded.document?.fileUrl,
                    fileSize: uploaded.fileSize || uploaded.document?.fileSize,
                    fileType: uploaded.fileType || uploaded.document?.fileType,
                  },
                  uploadStatus: 'completed',
                  uploadProgress: 100,
                  isPersisted: true,
                }
              : f
          ));
        }
      } catch (error) {
        console.error('Error uploading file:', fileObj.file.name, error);
      }
    }
  }, [selectedFiles, meta.presetId]);

  // Expose upload function via window global (for parent to call after event creation)
  useEffect(() => {
    (window as any).uploadFilesToEventWizard = uploadFilesToEvent;
    return () => {
      delete (window as any).uploadFilesToEventWizard;
    };
  }, [uploadFilesToEvent]);

  // Time slots (full implementation)
  type LocalTimeSlot = {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
    salleIds: number[];
    classIds: number[];
    originalId?: number;
  };
  const [timeSlots, setTimeSlots] = useState<LocalTimeSlot[]>([
    { date: null, startTime: null, endTime: null, salleIds: [], classIds: [] },
  ]);

  // Prefill selectedFiles from meta.uploads once (edit flows)
  useEffect(() => {
    if (selectedFiles.length > 0) return;
    const uploads = (meta.uploads || []) as any[];
    if (!uploads || uploads.length === 0) return;
    const mapped: FileWithMetadata[] = uploads.map((u, idx) => {
      const fileUrl = typeof u === 'string' ? u : u.fileUrl;
      const fileName =
        typeof u === 'string' ? u.split('/').pop() || 'Document' : u.fileName || 'Document';
      const fileSize = typeof u === 'string' ? undefined : u.fileSize;
      const fileType = typeof u === 'string' ? undefined : u.fileType;
      return {
        id: `existing-${idx}-${fileUrl}`,
        existingFile: {
          fileName: fileName,
          fileUrl,
          fileSize: (fileSize as any) ?? 0,
          fileType: (fileType as any) ?? 'application/octet-stream',
        },
        uploadStatus: 'completed',
        uploadProgress: 100,
        isPersisted: true,
      } as FileWithMetadata;
    });
    setSelectedFiles(mapped);
  }, [meta.uploads, selectedFiles.length]);

  // Prefill timeSlots from initialPresetSlots (edit preset flow) once on mount if empty
  useEffect(() => {
    if (
      !initialPresetSlots ||
      !Array.isArray(initialPresetSlots) ||
      initialPresetSlots.length === 0
    )
      return;
    if (
      timeSlots.length === 1 &&
      !timeSlots[0].date &&
      !timeSlots[0].startTime &&
      !timeSlots[0].endTime
    ) {
      const toLocal = (d: Date) =>
        new Date(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          d.getUTCHours(),
          d.getUTCMinutes(),
          d.getUTCSeconds(),
          d.getUTCMilliseconds(),
        );
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const mapped: LocalTimeSlot[] = initialPresetSlots.map((s: any) => {
        const sd = toLocal(new Date(s.startDate));
        const ed = toLocal(new Date(s.endDate));
        return {
          date: new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()),
          startTime: `${pad(sd.getHours())}:${pad(sd.getMinutes())}`,
          endTime: `${pad(ed.getHours())}:${pad(ed.getMinutes())}`,
          salleIds: Array.isArray(s.salleIds) ? s.salleIds : [],
          classIds: Array.isArray(s.classIds) ? s.classIds : [],
          originalId: s.id,
        } as LocalTimeSlot;
      });
      setTimeSlots(mapped);
      // Expose original snapshot into meta for diff-based updates
      try {
        const originals = initialPresetSlots.map((s: any) => {
          const sd = toLocal(new Date(s.startDate));
          const ed = toLocal(new Date(s.endDate));
          const localIsoNoZ = (dt: Date) =>
            `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
          return {
            id: s.id,
            startDate: localIsoNoZ(sd),
            endDate: localIsoNoZ(ed),
            timeslotDate: `${sd.getFullYear()}-${pad(sd.getMonth() + 1)}-${pad(sd.getDate())}`,
            salleIds: Array.isArray(s.salleIds) ? s.salleIds : [],
            classIds: Array.isArray(s.classIds) ? s.classIds : [],
          };
        });
        onMetaChange({
          ...(meta as any),
          timeSlotsOriginal: originals,
          timeSlotsDeletedIds: [],
        } as any);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPresetSlots]);

  // Data sources for grouping (classes & salles)
  type OptionItem = { id: number; name: string; group: string; isCustom?: boolean };
  const [rawClasses, setRawClasses] = useState<OptionItem[]>([]);
  const [rawSalles, setRawSalles] = useState<OptionItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSalles, setLoadingSalles] = useState(false);

  // Fetch presets only once if not provided / avoid infinite loop when parent passes new [] each render
  const presetsFetchedRef = useRef(false);
  const existingDraftsSnapshotRef = useRef<string>(
    JSON.stringify((meta as any)?.timeSlotsDrafts || []),
  );

  useEffect(() => {
    // If parent supplied presets (length > 0) sync them and mark fetched
    if (availablePresets && availablePresets.length) {
      setInternalPresets(availablePresets);
      presetsFetchedRef.current = true;
      return;
    }
    // Otherwise fetch exactly once
    if (!presetsFetchedRef.current) {
      presetsFetchedRef.current = true;
      fetch('/api/event-presets')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setInternalPresets(d?.presets || []))
        .catch(() => {});
    }
    // depend only on length so new [] instances don't retrigger
  }, [availablePresets]);

  // Fetch classes & salles (with grouping)
  useEffect(() => {
    (async () => {
      try {
        setLoadingClasses(true);
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
          // Personal first
          setRawClasses([...custom, ...predefined]);
        } else setRawClasses([]);
      } catch {
        setRawClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    })();
    (async () => {
      try {
        setLoadingSalles(true);
        const r = await fetch('/api/salles');
        if (r.ok) {
          const d = await r.json();
          const salles: OptionItem[] = (d?.salles || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            group: s.userOwnerId ? 'Mes salles' : 'Salles système',
            isCustom: !!s.userOwnerId,
          }));
          // Ensure personal first
          salles.sort((a, b) =>
            a.group === b.group ? a.name.localeCompare(b.name) : a.group === 'Mes salles' ? -1 : 1,
          );
          setRawSalles(salles);
        } else setRawSalles([]);
      } catch {
        setRawSalles([]);
      } finally {
        setLoadingSalles(false);
      }
    })();
  }, []);

  const groupedClasses = rawClasses; // already ordered
  const groupedSalles = rawSalles; // already ordered

  const addTimeSlot = () =>
    setTimeSlots((prev) => [
      ...prev,
      { date: null, startTime: null, endTime: null, salleIds: [], classIds: [] },
    ]);
  const removeTimeSlot = (index: number) =>
    setTimeSlots((prev) => {
      const removed = prev[index];
      if (removed?.originalId) {
        const current: number[] = ((meta as any).timeSlotsDeletedIds || []) as number[];
        const next = current.includes(removed.originalId)
          ? current
          : [...current, removed.originalId];
        try {
          onMetaChange({ ...(meta as any), timeSlotsDeletedIds: next } as any);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  const updateTimeSlot = (index: number, partial: Partial<LocalTimeSlot>) =>
    setTimeSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  // Derive drafts similar to CreateEventDialog to keep potential parity
  useEffect(() => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const drafts = timeSlots
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => {
        const d = s.date as Date;
        const [sh, sm] = (s.startTime as string).split(':').map(Number);
        const [eh, em] = (s.endTime as string).split(':').map(Number);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0);
        const localIsoNoZ = (dt: Date) =>
          `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
        return {
          startDate: localIsoNoZ(start),
          endDate: localIsoNoZ(end),
          timeslotDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
          salleIds: s.salleIds,
          classIds: s.classIds,
        };
      });

    // Avoid infinite loops: only update parent meta when drafts actually changed
    const draftsStr = JSON.stringify(drafts);
    if (existingDraftsSnapshotRef.current !== draftsStr) {
      try {
        const detailed = timeSlots
          .filter((s) => s.date && s.startTime && s.endTime)
          .map((s) => {
            const d = s.date as Date;
            const [sh, sm] = (s.startTime as string).split(':').map(Number);
            const [eh, em] = (s.endTime as string).split(':').map(Number);
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm, 0, 0);
            const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em, 0, 0);
            const localIsoNoZ = (dt: Date) =>
              `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
            return {
              id: s.originalId,
              startDate: localIsoNoZ(start),
              endDate: localIsoNoZ(end),
              timeslotDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
              salleIds: s.salleIds,
              classIds: s.classIds,
            };
          });
        onMetaChange({
          ...(meta as any),
          timeSlotsDrafts: drafts,
          timeSlotsDraftsDetailed: detailed,
        } as any);
      } catch (e) {
        // ignore
      }
      existingDraftsSnapshotRef.current = draftsStr;
    }
    // depend only on timeSlots and onMetaChange (stable) to avoid reruns
  }, [timeSlots, onMetaChange, meta]);

  const updateMeta = React.useCallback(
    (patch: Partial<WizardMeta>) => onMetaChange({ ...meta, ...patch }),
    [meta, onMetaChange]
  );
  const updateForm = (key: keyof WizardForm, value: any) => onFormChange({ ...form, [key]: value });

  // Step definitions mimic CreateEventDialog: 0 method, 1 description, 2 time slots, 3 resources, 4 documents, 5 recap

  // -------------------- Validation logic per step --------------------
  const validation = computeWizardValidation({
    uploadMethod,
    selectedFilesCount: selectedFiles.length,
    uploadsCount: (meta.uploads || []).length,
    materialsCount: (meta.materialsDetailed || []).length,
    chemicalsCount: (meta.chemicalsDetailed || []).length,
    title: form.title,
    timeSlots,
    presetOnly,
  });
  const {
    method: methodValid,
    description: descriptionValid,
    timeSlots: timeSlotsValid,
    resources: resourcesValid,
    documents: documentsValid,
    recapValid,
  } = validation;
  const canContinueMethod = methodValid;
  const handleContinue = () => setActiveStep((s) => s + 1);
  const isLast = activeStep === (presetOnly ? 4 : 5); // fewer steps w/out method selection

  const steps: GenericWizardStep[] = [
    ...(!presetOnly
      ? [
          {
            key: 'method',
            label: 'Méthode',
            required: true,
            valid: methodValid,
            content: (
              <>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <Card
                    onClick={() => {
                      setUploadMethod('file');
                      updateMeta({ method: 'file' });
                    }}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'file' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'file' ? 'primary.main' : 'divider',
                      minWidth: 220,
                    }}
                  >
                    <Stack alignItems="center" gap={1}>
                      <CloudUploadIcon color={uploadMethod === 'file' ? 'primary' : 'inherit'} />
                      <Typography>Fichiers</Typography>
                    </Stack>
                  </Card>
                  <Card
                    onClick={() => {
                      setUploadMethod('manual');
                      updateMeta({ method: 'manual' });
                    }}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'manual' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'manual' ? 'primary.main' : 'divider',
                      minWidth: 220,
                    }}
                  >
                    <Stack alignItems="center" gap={1}>
                      <AssignmentIcon color={uploadMethod === 'manual' ? 'primary' : 'inherit'} />
                      <Typography>Manuel</Typography>
                    </Stack>
                  </Card>
                  <Card
                    onClick={() => {
                      setUploadMethod('preset');
                      updateMeta({ method: 'preset' });
                    }}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'preset' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'preset' ? 'primary.main' : 'divider',
                      minWidth: 220,
                    }}
                  >
                    <Stack alignItems="center" gap={1}>
                      <ClassIcon color={uploadMethod === 'preset' ? 'primary' : 'inherit'} />
                      <Typography>TP Preset</Typography>
                    </Stack>
                    {uploadMethod === 'preset' && (
                      <Autocomplete
                        size="small"
                        sx={{ mt: 1.5 }}
                        options={availablePresets}
                        getOptionLabel={(o: any) => o.title || ''}
                        value={selectedPreset}
                        onChange={(_, val) => {
                          setSelectedPreset(val);
                          if (val) {
                            updateMeta({
                              presetId: val.id,
                              materialsDetailed: (val.materiels || []).map((m: any) => ({
                                id: m.materielId,
                                name: m.materielName,
                                quantity: m.quantity,
                              })),
                              chemicalsDetailed: (val.reactifs || []).map((r: any) => ({
                                id: r.reactifId,
                                name: r.reactifName,
                                requestedQuantity: Number(r.requestedQuantity) || 0,
                                unit: r.unit || 'g',
                              })),
                              uploads: (val.documents || []).map((d: any) => d.fileUrl),
                            });
                            if (!form.title) updateForm('title', val.title);
                          } else updateMeta({ presetId: undefined });
                        }}
                        renderInput={(p) => <TextField {...p} label="Choisir" />}
                      />
                    )}
                  </Card>
                </Box>
                {uploadMethod === 'file' && (
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
                      const newFiles: FileWithMetadata[] = files.map(file => ({
                        id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                        file,
                        uploadStatus: 'pending',
                        uploadProgress: 0,
                      }));
                      setSelectedFiles(prev => [...prev, ...newFiles]);
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = [
                        '.pdf',
                        '.doc',
                        '.docx',
                        '.odt',
                        '.jpg',
                        '.jpeg',
                        '.png',
                        '.gif',
                        '.txt',
                        '.svg',
                      ].join(',');
                      input.onchange = (e) => {
                        const files = Array.from((e.target as HTMLInputElement).files || []);
                        const newFiles: FileWithMetadata[] = files.map(file => ({
                          id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                          file,
                          uploadStatus: 'pending',
                          uploadProgress: 0,
                        }));
                        setSelectedFiles(prev => [...prev, ...newFiles]);
                      };
                      input.click();
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Glissez-déposez des fichiers ici
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ou cliquez pour parcourir
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Formats: PDF, DOC, DOCX, ODT, JPG, JPEG, PNG, GIF, TXT, SVG • Max 10 Mo
                    </Typography>
                  </Card>
                )}
                {selectedFiles.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Fichiers sélectionnés :
                    </Typography>
                    <Stack spacing={1}>
                      {selectedFiles.map((file) => (
                        <Card key={file.id} sx={{ p: 1.5 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">
                                {file.file?.name || file.existingFile?.fileName || 'Fichier inconnu'}
                              </Typography>
                              {file.uploadStatus === 'completed' && (
                                <Chip label="Uploadé" color="success" size="small" />
                              )}
                              {file.uploadStatus === 'pending' && (
                                <Chip label="En attente" color="warning" size="small" />
                              )}
                            </Box>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    disabled={!canContinueMethod}
                    onClick={handleContinue}
                  >
                    Continuer
                  </Button>
                </Box>
              </>
            ),
          },
        ]
      : []),
    {
      key: 'description',
      label: 'Description',
      required: true,
      valid: descriptionValid,
      content: (
        <>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Titre"
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Discipline"
              value={form.discipline}
              onChange={(e) => updateForm('discipline', e.target.value as any)}
              fullWidth
            >
              <MenuItem value="chimie">chimie</MenuItem>
              <MenuItem value="physique">physique</MenuItem>
            </TextField>
            <TextField
              label="Remarques"
              value={meta.remarks || ''}
              onChange={(e) => updateMeta({ remarks: e.target.value })}
              fullWidth
              multiline
              minRows={3}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleContinue}>
              Continuer
            </Button>
          </Box>
        </>
      ),
    },
    {
      key: 'timeslots',
      label: 'Créneaux',
      required: false,
      valid: timeSlotsValid,
      content: (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Définissez les créneaux (date, heures, salles, classes). Les classes/salles perso sont
            listées en haut.
          </Typography>
          <Box display="flex" justifyContent="flex-end" mb={1}>
            <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={addTimeSlot}>
              Ajouter un créneau
            </Button>
          </Box>
          <Stack spacing={2}>
            {timeSlots.map((slot, idx) => (
              <Card key={`ts-${idx}`} sx={{ p: 2, position: 'relative', overflow: 'visible' }}>
                {timeSlots.length > 1 && (
                  <IconButton
                    aria-label="Supprimer"
                    size="small"
                    color="error"
                    sx={{ position: 'absolute', top: 4, right: 4 }}
                    onClick={() => removeTimeSlot(idx)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Créneau {idx + 1}
                </Typography>
                <Box
                  display="grid"
                  gap={2}
                  sx={{
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(220px, 1fr))' },
                    alignItems: 'flex-start',
                    overflow: 'visible',
                  }}
                >
                  <Box>
                    <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                      Date
                    </Typography>
                    <FrenchDateOnly
                      selected={slot.date}
                      onChange={(d: Date | null) => updateTimeSlot(idx, { date: d as Date })}
                      customInput={<TextField size="medium" fullWidth />}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                      Début
                    </Typography>
                    <FrenchTimeOnly
                      selected={slot.startTime ? new Date(`1970-01-01T${slot.startTime}:00`) : null}
                      onChange={(d: Date | null) => {
                        if (!d) return;
                        const h = d.getHours().toString().padStart(2, '0');
                        const m = d.getMinutes().toString().padStart(2, '0');
                        updateTimeSlot(idx, { startTime: `${h}:${m}` });
                      }}
                      customInput={<TextField size="medium" fullWidth />}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                      Fin
                    </Typography>
                    <FrenchTimeOnly
                      selected={slot.endTime ? new Date(`1970-01-01T${slot.endTime}:00`) : null}
                      onChange={(d: Date | null) => {
                        if (!d) return;
                        const h = d.getHours().toString().padStart(2, '0');
                        const m = d.getMinutes().toString().padStart(2, '0');
                        updateTimeSlot(idx, { endTime: `${h}:${m}` });
                      }}
                      customInput={<TextField size="medium" fullWidth />}
                    />
                  </Box>
                </Box>
                <Box
                  mt={2}
                  display="grid"
                  gap={2}
                  sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
                >
                  <Box>
                    <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                      Salles
                    </Typography>
                    <Autocomplete
                      multiple
                      size="small"
                      disableCloseOnSelect
                      options={groupedSalles}
                      groupBy={(o) => o.group}
                      getOptionLabel={(o) => o.name}
                      value={groupedSalles.filter((s) => slot.salleIds.includes(s.id))}
                      onChange={(_, vals) =>
                        updateTimeSlot(idx, { salleIds: (vals as OptionItem[]).map((v) => v.id) })
                      }
                      renderTags={(value, getTagProps) =>
                        value.map((option, i) => (
                          <Chip
                            {...getTagProps({ index: i })}
                            key={`${option.id}-${option.name}`}
                            label={option.name}
                            size="small"
                            color={option.isCustom ? 'warning' : 'default'}
                          />
                        ))
                      }
                      renderInput={(p) => <TextField {...p} placeholder="Salles" />}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
                      Classes
                    </Typography>
                    <Autocomplete
                      multiple
                      size="small"
                      disableCloseOnSelect
                      options={groupedClasses}
                      groupBy={(o) => o.group}
                      getOptionLabel={(o) => o.name}
                      value={groupedClasses.filter((c) => slot.classIds.includes(c.id))}
                      onChange={(_, vals) =>
                        updateTimeSlot(idx, { classIds: (vals as OptionItem[]).map((v) => v.id) })
                      }
                      renderTags={(value, getTagProps) =>
                        value.map((option, i) => (
                          <Chip
                            {...getTagProps({ index: i })}
                            key={`${option.id}-${option.name}`}
                            label={option.name}
                            size="small"
                            color={option.isCustom ? 'warning' : 'default'}
                          />
                        ))
                      }
                      renderInput={(p) => <TextField {...p} placeholder="Classes" />}
                    />
                  </Box>
                </Box>
                {slot.date &&
                  slot.startTime &&
                  slot.endTime &&
                  (() => {
                    const [sh, sm] = slot.startTime.split(':').map(Number);
                    const [eh, em] = slot.endTime.split(':').map(Number);
                    const start = sh * 60 + sm;
                    const end = eh * 60 + em;
                    const invalid = end <= start;
                    const outside = start < 8 * 60 || end > 19 * 60;
                    return (
                      <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                        {invalid && (
                          <Typography variant="caption" color="error.main">
                            Heures invalides
                          </Typography>
                        )}
                        {outside && (
                          <Typography variant="caption" color="warning.main">
                            En dehors des heures (08:00-19:00)
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
              </Card>
            ))}
          </Stack>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleContinue}
              disabled={timeSlots.some(
                (s) =>
                  !s.date ||
                  !s.startTime ||
                  !s.endTime ||
                  (s.startTime as string) >= (s.endTime as string),
              )}
            >
              Continuer
            </Button>
          </Box>
        </>
      ),
    },
    {
      key: 'resources',
      label: 'Ressources',
      required: false,
      valid: (meta.materialsDetailed || []).length + (meta.chemicalsDetailed || []).length > 0,
      content: (
        <>
          <AddResourcesDialog
            mode="embedded"
            discipline={form.discipline}
            presetMaterials={(meta.materialsDetailed || []) as any}
            customMaterials={[]}
            presetChemicals={(meta.chemicalsDetailed || []) as any}
            customChemicals={[]}
            onChange={(d: AddResourcesDialogChange) => {
              updateMeta({
                materialsDetailed: [
                  ...d.presetMaterials,
                  ...d.customMaterials.map((c) => ({ name: c.name, quantity: c.quantity })),
                ],
                chemicalsDetailed: [
                  ...d.presetChemicals,
                  ...d.customChemicals.map((c) => ({
                    name: c.name,
                    requestedQuantity: c.requestedQuantity,
                    unit: c.unit,
                  })),
                ],
              });
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleContinue}>
              Continuer
            </Button>
          </Box>
        </>
      ),
    },
    {
      key: 'documents',
      label: 'Documents',
      required: false,
      valid: (meta.uploads || []).length > 0,
      content: (
        <>
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
              const newFiles: FileWithMetadata[] = files.map(file => ({
                id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                file,
                uploadStatus: 'pending',
                uploadProgress: 0,
              }));
              setSelectedFiles(prev => [...prev, ...newFiles]);
            }}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = true;
              input.accept = [
                '.pdf',
                '.doc',
                '.docx',
                '.odt',
                '.jpg',
                '.jpeg',
                '.png',
                '.gif',
                '.txt',
                '.svg',
              ].join(',');
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || []);
                const newFiles: FileWithMetadata[] = files.map(file => ({
                  id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                  file,
                  uploadStatus: 'pending',
                  uploadProgress: 0,
                }));
                setSelectedFiles(prev => [...prev, ...newFiles]);
              };
              input.click();
            }}
          >
            <Typography variant="h6" gutterBottom>
              Glissez-déposez des fichiers ici
            </Typography>
            <Typography variant="body2" color="text.secondary">
              ou cliquez pour parcourir
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Formats: PDF, DOC, DOCX, ODT, JPG, JPEG, PNG, GIF, TXT, SVG • Max 10 Mo
            </Typography>
          </Card>
          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Fichiers sélectionnés :
              </Typography>
              <Stack spacing={1}>
                {selectedFiles.map((file) => (
                  <Card key={file.id} sx={{ p: 1.5 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">
                          {file.file?.name || file.existingFile?.fileName || 'Fichier inconnu'}
                        </Typography>
                        {file.uploadStatus === 'completed' && (
                          <Chip label="Uploadé" color="success" size="small" />
                        )}
                        {file.uploadStatus === 'pending' && (
                          <Chip label="En attente" color="warning" size="small" />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedFiles(prev => prev.filter(f => f.id !== file.id));
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleContinue}>
              Continuer
            </Button>
          </Box>
        </>
      ),
    },
    {
      key: 'recap',
      label: 'Récap',
      required: true,
      valid: recapValid,
      content: (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Titre: {form.title || '(aucun)'}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Discipline: {form.discipline}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Méthode: {uploadMethod || meta.method}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Matériel: {(meta.materialsDetailed || []).length}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Réactifs: {(meta.chemicalsDetailed || []).length}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Documents: {(meta.uploads || []).length}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => setActiveStep(0)}>
              Revenir
            </Button>
            <Button
              variant="contained"
              disabled={!recapValid}
              onClick={async () => {
                if (!recapValid) return;
                
                // Upload any remaining pending files before finishing
                const pendingFiles = selectedFiles.filter((f) => 
                  f.file && !f.isPersisted && !pendingUploadsRef.current.has(f.id)
                );
                
                if (pendingFiles.length > 0) {
                  // Show uploading state or disable button temporarily
                  const uploadPromises = pendingFiles.map((fileItem) => {
                    if (!fileItem.file) return Promise.resolve();
                    
                    pendingUploadsRef.current.add(fileItem.id);
                    const formData = new FormData();
                    formData.append('file', fileItem.file);
                    
                    // Choose endpoint: preset only
                    const presetId = meta.presetId ? Number(meta.presetId as any) : undefined;
                    if (!presetId) {
                      // No preset ID available, skip upload for now
                      pendingUploadsRef.current.delete(fileItem.id);
                      return;
                    }
                    
                    const endpoint = `/api/event-presets/${presetId}/documents`;
                    
                    return fetch(endpoint, {
                      method: 'POST',
                      body: formData,
                    })
                    .then(async (res) => {
                      if (res.ok) {
                        const data = await res.json();
                        const doc = data.document || data;
                        
                        // Update selectedFiles and meta.uploads
                        setSelectedFiles((prev) => 
                          prev.map((f) => 
                            f.id === fileItem.id 
                              ? {
                                  ...f,
                                  existingFile: {
                                    fileName: doc.fileName || fileItem.file!.name,
                                    fileUrl: doc.fileUrl,
                                    fileSize: doc.fileSize || fileItem.file!.size,
                                    fileType: doc.fileType || fileItem.file!.type,
                                  },
                                  isPersisted: true,
                                  uploadStatus: 'completed',
                                  uploadProgress: 100,
                                }
                              : f
                          )
                        );
                        
                        const current: any[] = (meta.uploads || []).map((u: any) => ({
                          fileUrl: typeof u === 'string' ? u : u.fileUrl,
                          fileName: typeof u === 'string' ? u : u.fileName,
                          fileSize: typeof u === 'string' ? undefined : u.fileSize,
                          fileType: typeof u === 'string' ? undefined : u.fileType,
                        }));
                        
                        if (!current.find((c) => c.fileUrl === doc.fileUrl)) {
                          current.push({
                            fileUrl: doc.fileUrl,
                            fileName: doc.fileName || fileItem.file!.name,
                            fileSize: doc.fileSize || fileItem.file!.size,
                            fileType: doc.fileType || fileItem.file!.type,
                          });
                          updateMeta({ uploads: current as any });
                        }
                      }
                    })
                    .catch(() => {
                      pendingUploadsRef.current.delete(fileItem.id);
                    });
                  });
                  
                  // Wait for all uploads to complete
                  await Promise.allSettled(uploadPromises);
                }
                
                Promise.resolve(onFinish()).catch(() => {});
              }}
            >
              {finishLabel}
            </Button>
          </Box>
        </>
      ),
    },
  ];

  // Adopt draft files and trigger uploads to preset when presetId becomes available
  const adoptedRef = useRef<Set<string>>(new Set());
  const pendingUploadsRef = useRef<Set<string>>(new Set());
  
  // 1. Handle uploaded draft files -> preset adoption
  useEffect(() => {
    const presetId = meta.presetId ? Number(meta.presetId as any) : undefined;
    if (!presetId) return;
    const list = (meta.uploads || []) as any[];
    if (!Array.isArray(list) || list.length === 0) return;
    const toAdd = list
      .map((u: any) => (typeof u === 'string' ? { fileUrl: u, fileName: u.split('/').pop() || 'Document' } : u))
      .filter((u: any) => u.fileUrl && !adoptedRef.current.has(u.fileUrl));
    if (toAdd.length === 0) return;
    (async () => {
      for (const u of toAdd) {
        try {
          const res = await fetch(`/api/event-presets/${presetId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: u.fileName || u.fileUrl.split('/').pop() || 'Document',
              fileUrl: u.fileUrl,
              fileSize: u.fileSize,
              fileType: u.fileType,
            }),
          });
          adoptedRef.current.add(u.fileUrl);
          await res.text().catch(() => undefined);
        } catch {
          adoptedRef.current.add(u.fileUrl);
        }
      }
    })();
  }, [meta.presetId, meta.uploads]);

  // 2. Auto-upload pending files when presetId becomes available
  useEffect(() => {
    const presetId = meta.presetId ? Number(meta.presetId as any) : undefined;
    if (!presetId) return;
    
    const pendingFiles = selectedFiles.filter((f) => 
      f.file && !f.isPersisted && !pendingUploadsRef.current.has(f.id)
    );
    
    if (pendingFiles.length === 0) return;
    
    // Upload each pending file to the preset
    pendingFiles.forEach((fileItem) => {
      if (!fileItem.file || pendingUploadsRef.current.has(fileItem.id)) return;
      
      pendingUploadsRef.current.add(fileItem.id);
      
      const formData = new FormData();
      formData.append('file', fileItem.file);
      
      fetch(`/api/event-presets/${presetId}/documents`, {
        method: 'POST',
        body: formData,
      })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const doc = data.document || data;
          
          // Update the file item to show it's uploaded
          setSelectedFiles((prev) => 
            prev.map((f) => 
              f.id === fileItem.id 
                ? {
                    ...f,
                    existingFile: {
                      fileName: doc.fileName || fileItem.file!.name,
                      fileUrl: doc.fileUrl,
                      fileSize: doc.fileSize || fileItem.file!.size,
                      fileType: doc.fileType || fileItem.file!.type,
                    },
                    isPersisted: true,
                    uploadStatus: 'completed',
                    uploadProgress: 100,
                  }
                : f
            )
          );
          
          // Update meta.uploads
          const current: any[] = (meta.uploads || []).map((u: any) => ({
            fileUrl: typeof u === 'string' ? u : u.fileUrl,
            fileName: typeof u === 'string' ? u : u.fileName,
            fileSize: typeof u === 'string' ? undefined : u.fileSize,
            fileType: typeof u === 'string' ? undefined : u.fileType,
          }));
          
          if (!current.find((c) => c.fileUrl === doc.fileUrl)) {
            current.push({
              fileUrl: doc.fileUrl,
              fileName: doc.fileName || fileItem.file!.name,
              fileSize: doc.fileSize || fileItem.file!.size,
              fileType: doc.fileType || fileItem.file!.type,
            });
            updateMeta({ uploads: current as any });
          }
          
          console.log(`✅ Fichier uploadé vers preset ${presetId}: ${doc.fileName || fileItem.file!.name}`);
        } else {
          console.error(`❌ Échec upload vers preset ${presetId}: ${fileItem.file!.name}`);
        }
      })
      .catch((error) => {
        console.error(`❌ Erreur upload vers preset ${presetId}:`, fileItem.file!.name, error);
        // Remove from pending on error
        pendingUploadsRef.current.delete(fileItem.id);
      });
    });
  }, [meta.presetId, selectedFiles, meta.uploads, updateMeta]);

  // Function to upload files to a specific preset ID (called after preset creation)
  const uploadFilesToEventWizard = useCallback(async (presetId: number): Promise<void> => {
    const filesToUpload = selectedFiles.filter(f => f.file && f.uploadStatus === 'pending');
    
    for (const fileObj of filesToUpload) {
      if (!fileObj.file) continue;
      
      try {
        const formData = new FormData();
        formData.append('file', fileObj.file);
        
        const response = await fetch(`/api/event-presets/${presetId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const uploaded = await response.json();
          const doc = uploaded.document || uploaded;
          
          // Marquer le fichier comme uploadé
          setSelectedFiles(prev => prev.map(f => 
            f.id === fileObj.id 
              ? {
                  ...f,
                  existingFile: {
                    fileName: doc.fileName || fileObj.file!.name,
                    fileUrl: doc.fileUrl,
                    fileSize: doc.fileSize || fileObj.file!.size,
                    fileType: doc.fileType || fileObj.file!.type,
                  },
                  uploadStatus: 'completed',
                  uploadProgress: 100,
                  isPersisted: true,
                }
              : f
          ));
          console.log(`✅ Fichier uploadé vers preset: ${doc.fileName || fileObj.file.name}`);
        } else {
          console.error(`❌ Échec upload vers preset: ${fileObj.file.name}`);
        }
      } catch (error) {
        console.error('❌ Erreur upload vers preset:', fileObj.file.name, error);
      }
    }

    // Émettre un événement pour notifier que les documents du preset ont été mis à jour
    try {
      window.dispatchEvent(
        new CustomEvent('event-update:end', { detail: { eventId: presetId } })
      );
      console.log(`📄 Documents mis à jour pour preset ${presetId}`);
    } catch (error) {
      console.error('❌ Erreur émission événement preset:', error);
    }
  }, [selectedFiles]);

  // Expose upload function via window global (for parent to call after preset creation)
  useEffect(() => {
    (window as any).uploadFilesToEventWizard = uploadFilesToEventWizard;
    return () => {
      delete (window as any).uploadFilesToEventWizard;
    };
  }, [uploadFilesToEventWizard]);

  // Mémoriser la conversion des fichiers pour éviter les boucles infinies
  const convertedUploads = useMemo(() => {
    return selectedFiles.map(fileObj => {
      if (fileObj.file && fileObj.uploadStatus === 'pending') {
        // Local file format expected by BatchPresetWizard
        return {
          isLocal: true,
          fileData: fileObj.file,
          fileName: fileObj.file.name,
          fileSize: fileObj.file.size,
          fileType: fileObj.file.type,
        };
      } else if (fileObj.existingFile) {
        // Already uploaded file format
        return {
          isLocal: false,
          fileName: fileObj.existingFile.fileName,
          fileUrl: fileObj.existingFile.fileUrl,
          fileSize: fileObj.existingFile.fileSize,
          fileType: fileObj.existingFile.fileType,
        };
      }
      return null;
    }).filter(Boolean);
  }, [selectedFiles]);

  // Référence stable pour éviter les changements inutiles
  const uploadsRef = useRef<any[]>([]);
  
  // Update meta to include files for parent component logic
  useEffect(() => {
    if (updateMeta && convertedUploads) {
      // Vérifier si le contenu a réellement changé pour éviter les boucles
      const uploadsChanged = JSON.stringify(convertedUploads) !== JSON.stringify(uploadsRef.current);
      
      if (uploadsChanged) {
        uploadsRef.current = convertedUploads;
        const currentMeta = (meta || {}) as any;
        updateMeta({
          ...currentMeta,
          uploads: convertedUploads,
        });
      }
    }
  }, [convertedUploads, updateMeta, meta]);

  return (
    <Box>
      <WizardStepper
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        orientation="vertical"
        sx={{ mb: 2 }}
      />
    </Box>
  );
}
