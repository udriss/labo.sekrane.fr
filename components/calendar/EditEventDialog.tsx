'use client';
import React, { useEffect, useMemo, useState } from 'react';
// In-memory cache holder
// @ts-ignore
let editEventDialogCache: any = (globalThis as any).__editEventDialogCache || {};
// @ts-ignore
(globalThis as any).__editEventDialogCache = editEventDialogCache;
import {
  DialogContent,
  TextField,
  MenuItem,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  Card,
  Alert,
  Autocomplete,
  IconButton,
  Tooltip,
} from '@mui/material';

import {
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Assignment as AssignmentIcon,
  Class as ClassIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import AddResourcesDialog, { AddResourcesDialogChange } from './AddResourcesDialog';
import { FileUploadSection } from '@components/calendar/FileUploadSection';
import { computeWizardValidation } from './wizardValidation';
import WizardStepper, { GenericWizardStep } from './WizardStepper';
import { RichTextEditor } from '@components/calendar/RichTextEditor';
import type { FileWithMetadata } from '@/types/global';

import 'react-datepicker/dist/react-datepicker.css';
import FrenchDatePicker, {
  FrenchDateOnly,
  FrenchTimeOnly,
} from '@/components/shared/FrenchDatePicker';

// Global cache to optionally communicate last slots persist result by event id
// @ts-ignore
const __slotsPersistCache = (globalThis as any).__slotsPersistCache || {};
// @ts-ignore
(globalThis as any).__slotsPersistCache = __slotsPersistCache;

export type EditEventForm = {
  title: string;
  discipline: 'chimie' | 'physique';
  notes?: string;
};

export type EditEventMeta = {
  classes?: Array<{ id: number; name: string }>; // agrégé depuis les slots
  salles?: Array<{ id: number; name: string }>;
  materials?: string[];
  chemicals?: string[];
  uploads?: Array<
    | string
    | {
        fileUrl: string;
        fileName?: string;
        fileSize?: number;
        fileType?: string;
      }
  >;
  materialsDetailed?: Array<{
    id?: string | number;
    name: string;
    quantity?: number;
  }>;
  chemicalsDetailed?: Array<{
    id?: string | number;
    name: string;
    requestedQuantity?: number;
    unit?: string;
  }>;
  // Separate arrays for custom items (event-level requests saved via MaterielEventRequest / ReactifEventRequest)
  customMaterials?: Array<{
    name: string;
    quantity?: number;
  }>;
  customChemicals?: Array<{
    name: string;
    requestedQuantity?: number;
    unit?: string;
  }>;
  timeSlotsDrafts?: Array<{
    startDate: string;
    endDate: string;
    timeslotDate?: string;
    notes?: string;
    salleId?: number;
  }>;
  remarks?: string;
  method?: 'file' | 'manual' | 'preset';
  presetId?: string | number;
};

export type EditEventDialogHandle = {
  persistSlots: () => Promise<{ changed: boolean }>;
  computeSlotDiff: () => { newSlots: any[]; modified: any[] };
};

const EditEventDialog = React.forwardRef<
  EditEventDialogHandle,
  {
    initial?: Partial<EditEventForm>;
    onChange: (data: EditEventForm) => void;
    valueMeta?: EditEventMeta;
    onMetaChange?: (meta: EditEventMeta) => void;
    initialSlots?: Array<{ startDate: string; endDate: string }>;
    eventId: number;
    onDuplicateUpload?: (fileUrl: string) => void;
    onPersistSlots?: () => Promise<void>;
  }
>(function EditEventDialogInternal(
  {
    initial,
    onChange,
    valueMeta,
    onMetaChange,
    initialSlots,
    eventId,
    onDuplicateUpload,
    onPersistSlots,
  },
  ref,
) {
  const [form, setForm] = useState<EditEventForm>({
    title: initial?.title ?? '',
    discipline: (initial?.discipline as any) ?? 'chimie',
    notes: initial?.notes ?? '',
  });

  // Sync form state with initial values when they change
  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title ?? '',
        discipline: (initial.discipline as any) ?? 'chimie',
        notes: initial.notes ?? '',
      });
    }
  }, [initial]);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | 'preset' | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([]);
  // Hydrate existing event documents into selectedFiles once eventDocuments change (only if empty to avoid overwriting in-progress uploads)
  const eventDocuments = (event as any)?.documents;
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);
  // Legacy custom matériel / réactifs state removed (managed inside AddResourcesDialog)

  // Data sources
  const [availableClasses, setAvailableClasses] = useState<
    Array<{ id: number; name: string; system?: boolean }>
  >([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<
    Array<{ id: number; name: string; discipline?: 'chimie' | 'physique' }>
  >([]);
  const [availableChemicals, setAvailableChemicals] = useState<
    Array<{ id: number; name: string; unit?: string }>
  >([]);
  const [availableSalles, setAvailableSalles] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingChemicals, setLoadingChemicals] = useState(false);
  const [loadingSalles, setLoadingSalles] = useState(false);

  // Local slots state
  type LocalTimeSlot = {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
    salleIds: number[];
    classIds: number[];
    deleted?: boolean;
    original?: {
      id?: number;
      date: string; // YYYY-MM-DD
      startTime: string; // HH:mm
      endTime: string; // HH:mm
      salleIds: number[];
      classIds: number[];
    };
  };
  const [timeSlots, setTimeSlots] = useState<LocalTimeSlot[]>([
    { date: null, startTime: null, endTime: null, salleIds: [], classIds: [] },
  ]);
  // Helper: compute diffs for persistence
  const computeSlotDiff = React.useCallback(() => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const newSlots: any[] = [];
    const modified: Array<{ index: number; id: number; payload: any }> = [];
    timeSlots.forEach((s, idx) => {
      if (s.deleted) return; // skip deleted from create/modify
      if (!s.date || !s.startTime || !s.endTime) return; // skip incomplete
      const y = s.date as Date;
      const dateStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), sh, sm, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), eh, em, 0, 0);
      const localIsoNoZ = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
      if (!s.original || !s.original.id) {
        newSlots.push({
          startDate: localIsoNoZ(start),
          endDate: localIsoNoZ(end),
          timeslotDate: dateStr,
          salleIds: s.salleIds,
          classIds: s.classIds,
        });
      } else {
        let changed = false;
        if (dateStr !== s.original.date) changed = true;
        if (s.startTime !== s.original.startTime) changed = true;
        if (s.endTime !== s.original.endTime) changed = true;
        const sallesChanged =
          s.salleIds.slice().sort().join(',') !== s.original.salleIds.slice().sort().join(',');
        const classesChanged =
          s.classIds.slice().sort().join(',') !== s.original.classIds.slice().sort().join(',');
        if (sallesChanged || classesChanged) changed = true;
        if (changed) {
          modified.push({
            index: idx,
            id: s.original.id!,
            payload: {
              startDate: localIsoNoZ(start),
              endDate: localIsoNoZ(end),
              timeslotDate: dateStr,
              salleIds: s.salleIds,
              classIds: s.classIds,
              state: 'modified',
            },
          });
        }
      }
    });
    return { newSlots, modified };
  }, [timeSlots]);

  const persistSlots = React.useCallback(async (): Promise<{ changed: boolean }> => {
    const { newSlots, modified } = computeSlotDiff();
    const deletedIds: number[] = timeSlots
      .filter((s) => s.deleted && s.original && typeof s.original.id === 'number')
      .map((s) => s.original!.id!) as number[];
    // Early exit
    if (newSlots.length === 0 && modified.length === 0 && deletedIds.length === 0) {
      // Inform listeners that no slot changes occurred
      try {
        window.dispatchEvent(
          new CustomEvent('event-slots:persist-result', {
            detail: { eventId, changed: false },
          }),
        );
      } catch {}
      return { changed: false };
    }
    try {
      // Notify lists to show a targeted spinner on this event
      try {
        window.dispatchEvent(new CustomEvent('event-update:start', { detail: { eventId } }));
      } catch {}

      const createdForEmit: any[] = [];
      const modifiedForEmit: any[] = [];
      // Create new slots
      if (newSlots.length > 0) {
        const res = await fetch('/api/timeslots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId, discipline: form.discipline, slots: newSlots }),
        });
        if (!res.ok) console.error('Failed creating slots', await res.text());
        else {
          try {
            const json = await res.json();
            const created = json.timeslots || [];
            if (Array.isArray(created)) createdForEmit.push(...created);
            // Merge created into local originals so diff resets
            setTimeSlots((prev) => {
              const next = [...prev];
              let createdIdx = 0;
              for (let i = 0; i < next.length; i++) {
                const ts = next[i];
                if (!ts.original || !ts.original.id) {
                  const c = created[createdIdx++];
                  if (!c) continue;
                  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                  const sd = new Date(c.startDate);
                  const dateStr = `${sd.getUTCFullYear()}-${pad(sd.getUTCMonth() + 1)}-${pad(sd.getUTCDate())}`;
                  const st = `${pad(sd.getUTCHours())}:${pad(sd.getUTCMinutes())}`;
                  const ed = new Date(c.endDate);
                  const et = `${pad(ed.getUTCHours())}:${pad(ed.getUTCMinutes())}`;
                  next[i] = {
                    ...ts,
                    deleted: false,
                    original: {
                      id: c.id,
                      date: dateStr,
                      startTime: st,
                      endTime: et,
                      salleIds: Array.isArray(c.salleIds) ? c.salleIds : [],
                      classIds: Array.isArray(c.classIds) ? c.classIds : [],
                    },
                  };
                }
              }
              return next;
            });
          } catch (e) {
            console.warn('Could not parse created slots response', e);
          }
        }
      }
      // Update modified slots via PUT with state=modified
      for (const m of modified) {
        try {
          const res = await fetch(`/api/timeslots/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(m.payload),
          });
          if (!res.ok) {
            console.error('PUT timeslot failed', m.id, await res.text());
          } else {
            modifiedForEmit.push({ id: m.id, ...m.payload });
            // Update local original snapshot
            setTimeSlots((prev) =>
              prev.map((slot, idx) =>
                idx === m.index && slot.original
                  ? {
                      ...slot,
                      original: {
                        ...slot.original,
                        date: slot.original.date, // date unchanged or recalc below
                        startTime: slot.startTime || slot.original.startTime,
                        endTime: slot.endTime || slot.original.endTime,
                        salleIds: slot.salleIds,
                        classIds: slot.classIds,
                      },
                    }
                  : slot,
              ),
            );
          }
        } catch (e) {
          console.error('PUT timeslot failed', m.id, e);
        }
      }
      // Delete removed slots
      for (const id of deletedIds) {
        try {
          const res = await fetch(`/api/timeslots/${id}`, { method: 'DELETE' });
          if (!res.ok) console.error('DELETE timeslot failed', id, await res.text());
        } catch (e) {
          console.error('DELETE timeslot failed', id, e);
        }
      }
      // Notify lists immediately with consolidated update
      try {
        window.dispatchEvent(
          new CustomEvent('event-slots:updated', {
            detail: {
              eventId,
              created: createdForEmit,
              modified: modifiedForEmit,
              deleted: deletedIds,
            },
          }),
        );
      } catch {}
      // Also emit a simplified persist result (used by pages/snackbars)
      try {
        window.dispatchEvent(
          new CustomEvent('event-slots:persist-result', {
            detail: { eventId, changed: true },
          }),
        );
      } catch {}
      const didChange =
        (createdForEmit.length || 0) > 0 ||
        (modifiedForEmit.length || 0) > 0 ||
        deletedIds.length > 0;
      // Also emit a simplified persist result (used by pages/snackbars)
      try {
        window.dispatchEvent(
          new CustomEvent('event-slots:persist-result', {
            detail: { eventId, changed: didChange },
          }),
        );
      } catch {}
      try {
        // @ts-ignore
        (globalThis as any).__slotsPersistCache[eventId] = { changed: didChange, ts: Date.now() };
      } catch {}
      return { changed: didChange };
    } catch (e) {
      console.error('[persistSlots] erreur', e);
      return { changed: false };
    } finally {
      // Hide spinner
      try {
        window.dispatchEvent(new CustomEvent('event-update:end', { detail: { eventId } }));
      } catch {}
    }
  }, [computeSlotDiff, eventId, form.discipline, timeSlots]);
  // Expose imperative handle
  React.useImperativeHandle(ref, () => ({ persistSlots, computeSlotDiff }), [
    persistSlots,
    computeSlotDiff,
  ]);
  const addTimeSlot = () =>
    setTimeSlots((prev) => [
      ...prev,
      { date: null, startTime: null, endTime: null, salleIds: [], classIds: [], deleted: false },
    ]);
  // Soft-delete in UI, actual deletion occurs on save
  const removeTimeSlot = (index: number) =>
    setTimeSlots((prev) => prev.map((s, i) => (i === index ? { ...s, deleted: true } : s)));
  const undoRemoveTimeSlot = (index: number) =>
    setTimeSlots((prev) => prev.map((s, i) => (i === index ? { ...s, deleted: false } : s)));
  const updateTimeSlot = (index: number, partial: Partial<LocalTimeSlot>) =>
    setTimeSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...partial } : s)));

  // Prefill timeSlots from parent-provided initial slots (existing event timeslots) - only once
  useEffect(() => {
    if (!initialSlots || !Array.isArray(initialSlots) || initialSlots.length === 0) return;
    // Only prefill if timeSlots is still the default empty state
    if (
      timeSlots.length === 1 &&
      !timeSlots[0].date &&
      !timeSlots[0].startTime &&
      !timeSlots[0].endTime
    ) {
      const asLocalLiteral = (d: Date) =>
        new Date(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          d.getUTCHours(),
          d.getUTCMinutes(),
          d.getUTCSeconds(),
          d.getUTCMilliseconds(),
        );
      const mapped: LocalTimeSlot[] = initialSlots.map((s: any) => {
        const sd = asLocalLiteral(new Date(s.startDate));
        const ed = asLocalLiteral(new Date(s.endDate));
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const dateStr = `${sd.getFullYear()}-${pad(sd.getMonth() + 1)}-${pad(sd.getDate())}`;
        const st = `${pad(sd.getHours())}:${pad(sd.getMinutes())}`;
        const et = `${pad(ed.getHours())}:${pad(ed.getMinutes())}`;
        return {
          date: new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()),
          startTime: st,
          endTime: et,
          salleIds: Array.isArray(s.salleIds)
            ? s.salleIds.filter((x: any) => typeof x === 'number')
            : [],
          classIds: Array.isArray(s.classIds)
            ? s.classIds.filter((x: any) => typeof x === 'number')
            : [],
          original: {
            id: s.id,
            date: dateStr,
            startTime: st,
            endTime: et,
            salleIds: Array.isArray(s.salleIds)
              ? s.salleIds.filter((x: any) => typeof x === 'number')
              : [],
            classIds: Array.isArray(s.classIds)
              ? s.classIds.filter((x: any) => typeof x === 'number')
              : [],
          },
        };
      });
      setTimeSlots(mapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlots]);

  // Derive drafts for parent
  useEffect(() => {
    const drafts = timeSlots
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => {
        const y = s.date as Date;
        const [sh, sm] = (s.startTime as string).split(':').map((n) => parseInt(n, 10));
        const [eh, em] = (s.endTime as string).split(':').map((n) => parseInt(n, 10));
        const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), sh, sm, 0, 0);
        const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), eh, em, 0, 0);
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const localIsoNoZ = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        return {
          startDate: localIsoNoZ(start),
          endDate: localIsoNoZ(end),
          timeslotDate: `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`,
          notes: '',
          salleIds: s.salleIds,
          classIds: s.classIds,
        } as any;
      });
    onMetaChange?.({ ...(valueMeta || {}), timeSlotsDrafts: drafts } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots]);

  const steps = useMemo(
    () => [
      "Méthode d'ajout",
      'Description & remarques',
      'Planification : créneaux, classes & calles',
      'Matériel & Réactifs',
      'Documents',
    ],
    [],
  );

  function update<K extends keyof EditEventForm>(key: K, value: EditEventForm[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    onChange(next);
  }

  const updateMeta = React.useCallback(
    (partial: Partial<EditEventMeta>) => {
      const next = { ...(valueMeta || {}), ...partial } as EditEventMeta;
      onMetaChange?.(next);
    },
    [valueMeta, onMetaChange],
  );

  // Hydrate existing documents after updateMeta is defined
  useEffect(() => {
    if (eventDocuments && selectedFiles.length === 0) {
      const docs: any[] = eventDocuments;
      const mapped: FileWithMetadata[] = docs.map((d) => ({
        id: `existing-${d.id}`,
        existingFile: {
          fileName: d.fileName || d.fileUrl,
          fileUrl: d.fileUrl,
          fileSize: d.fileSize,
          fileType: d.fileType,
        },
        uploadStatus: 'completed',
        uploadProgress: 100,
        isPersisted: true,
      }));
      setSelectedFiles(mapped);
      updateMeta({
        uploads: mapped.map((m) => ({
          fileUrl: m.existingFile!.fileUrl,
          fileName: m.existingFile!.fileName,
          fileSize: m.existingFile!.fileSize,
          fileType: m.existingFile!.fileType,
        })),
      });
    }
  }, [eventDocuments, selectedFiles.length, updateMeta]);

  const uniqueClasses = useMemo(() => {
    const setIds = new Set<number>();
    timeSlots.forEach((s) => s.classIds.forEach((id) => setIds.add(id)));
    return Array.from(setIds.values())
      .map((id) => availableClasses.find((c) => c.id === id))
      .filter((c): c is { id: number; name: string; system?: boolean } => !!c);
  }, [timeSlots, availableClasses]);

  const uniqueSalles = useMemo(() => {
    const setIds = new Set<number>();
    timeSlots.forEach((s) => s.salleIds.forEach((id) => setIds.add(id)));
    return Array.from(setIds.values())
      .map((id) => availableSalles.find((r) => r.id === id))
      .filter((r): r is { id: number; name: string } => !!r);
  }, [timeSlots, availableSalles]);

  useEffect(() => {
    if (!onMetaChange) return;
    const prevC = (valueMeta?.classes || [])
      .map((c) => c.id)
      .sort()
      .join(',');
    const nextC = uniqueClasses
      .map((c) => c.id)
      .sort()
      .join(',');
    const prevS = (valueMeta?.salles || [])
      .map((s) => s.id)
      .sort()
      .join(',');
    const nextS = uniqueSalles
      .map((s) => s.id)
      .sort()
      .join(',');
    if (prevC !== nextC || prevS !== nextS) {
      onMetaChange({ ...(valueMeta || {}), classes: uniqueClasses, salles: uniqueSalles });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueClasses, uniqueSalles]);

  // Écoute des événements de mise à jour des documents depuis EventDetailsDialog
  useEffect(() => {
    if (!eventId) return;
    
    const handleDocumentUpdate = async () => {
      try {
        const r = await fetch(`/api/events/${eventId}`);
        if (r.ok) {
          const data = await r.json();
          const documents = data?.event?.documents || [];
          
          // Mettre à jour selectedFiles avec les documents existants
          const mapped: FileWithMetadata[] = documents.map((d: any) => ({
            id: `existing-${d.id}`,
            existingFile: {
              fileName: d.fileName || d.fileUrl,
              fileUrl: d.fileUrl,
              fileSize: d.fileSize,
              fileType: d.fileType,
            },
            uploadStatus: 'completed',
            uploadProgress: 100,
            isPersisted: true,
          }));
          setSelectedFiles(mapped);
          
          // Mettre à jour également la meta
          updateMeta({
            uploads: mapped.map((m) => ({
              fileUrl: m.existingFile!.fileUrl,
              fileName: m.existingFile!.fileName,
              fileSize: m.existingFile!.fileSize,
              fileType: m.existingFile!.fileType,
            })),
          });
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour des documents:', error);
      }
    };

    const onDocumentChange = (event: CustomEvent) => {
      if (event.detail?.eventId === eventId) {
        handleDocumentUpdate();
      }
    };

    // Écouter les événements de mise à jour des documents
    window.addEventListener('event:refetch', onDocumentChange as any);
    window.addEventListener('event-update:end', onDocumentChange as any);

    return () => {
      window.removeEventListener('event:refetch', onDocumentChange as any);
      window.removeEventListener('event-update:end', onDocumentChange as any);
    };
  }, [eventId, updateMeta]);

  // Note: persistNewClass supprimée – création de classes custom hors du dialogue d'édition.

  // Load data
  useEffect(() => {
    // classes
    (async () => {
      try {
        setLoadingClasses(true);
        const r = await fetch('/api/classes');
        if (r.ok) {
          const data = await r.json();
          const list: Array<{ id: number; name: string; system?: boolean }> = [
            ...(data?.predefinedClasses || []),
            ...(data?.customClasses || []),
          ];
          setAvailableClasses(list);
        }
      } catch {
      } finally {
        setLoadingClasses(false);
      }
    })();
    // salles
    (async () => {
      try {
        setLoadingSalles(true);
        const r = await fetch('/api/salles');
        if (r.ok) {
          const d = await r.json();
          const list: Array<{ id: number; name: string }> = Array.isArray(d?.salles)
            ? d.salles.map((s: any) => ({ id: s.id, name: s.name }))
            : [];
          setAvailableSalles(list);
        }
      } catch {
        setAvailableSalles([]);
      } finally {
        setLoadingSalles(false);
      }
    })();
    // materials
    (async () => {
      try {
        setLoadingMaterials(true);
        const r1 = await fetch(`/api/materiel?discipline=${encodeURIComponent(form.discipline)}`);
        const materials: Array<{ id: number; name: string; discipline?: 'chimie' | 'physique' }> =
          [];
        if (r1.ok) {
          const d = await r1.json();
          const list = Array.isArray(d?.materiels)
            ? d.materiels
            : Array.isArray(d?.materiel)
              ? d.materiel
              : [];
          (list as any[]).forEach((m: any) =>
            materials.push({
              id: m.id,
              name: m.itemName || m.name || '',
              discipline: m.discipline,
            }),
          );
        } else {
          const r2 = await fetch('/api/equipment');
          if (r2.ok) {
            const d2 = await r2.json();
            const arr = d2?.equipment || d2?.items || [];
            (arr as any[]).forEach((m) =>
              materials.push({
                id: m.id,
                name: m.itemName || m.name || '',
                discipline: m.discipline,
              }),
            );
          }
        }
        const dedup = Array.from(
          new Map(materials.filter((m) => m.name).map((m) => [m.id, m])).values(),
        );
        setAvailableMaterials(dedup);
      } catch {
        setAvailableMaterials([]);
      } finally {
        setLoadingMaterials(false);
      }
    })();
    // reactifs
    (async () => {
      try {
        setLoadingChemicals(true);
        const rc = await fetch('/api/chemicals');
        if (rc.ok) {
          const d = await rc.json();
          const raw = Array.isArray(d?.reactifs) ? d.reactifs : [];
          const list: Array<{ id: number; name: string; unit?: string }> = (raw as any[])
            .map((c: any) => ({ id: c.id, name: c.reactifPreset?.name || c.name, unit: c.unit }))
            .filter((c) => !!c.name);
          const dedup = Array.from(new Map(list.map((c) => [c.id, c])).values());
          setAvailableChemicals(dedup);
        }
      } catch {
        setAvailableChemicals([]);
      } finally {
        setLoadingChemicals(false);
      }
    })();
  }, [form.discipline]);

  return (
    <DialogContent>
      {(() => {
        const v = computeWizardValidation({
          uploadMethod,
          selectedFilesCount: selectedFiles.length,
          uploadsCount: (valueMeta?.uploads || []).length,
          materialsCount:
            (valueMeta?.materialsDetailed?.length || 0) + (valueMeta?.customMaterials?.length || 0),
          chemicalsCount:
            (valueMeta?.chemicalsDetailed?.length || 0) + (valueMeta?.customChemicals?.length || 0),
          title: form.title,
          timeSlots,
          presetOnly: false,
        });
        (editEventDialogCache as any).validation = v;
        return null;
      })()}
      {(() => {
        const steps: GenericWizardStep[] = [
          {
            key: 'method',
            label: "Méthode d'ajout",
            required: true,
            valid: !!(editEventDialogCache as any).validation?.method,
            content: (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Choisissez comment modifier la séance
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                  <Card
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'file' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'file' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      minWidth: 220,
                      flex: '1 1 220px',
                    }}
                    onClick={() => {
                      setUploadMethod('file');
                      updateMeta({ method: 'file' });
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <CloudUploadIcon color={uploadMethod === 'file' ? 'primary' : 'inherit'} />
                      <Typography>Importer des fichiers</Typography>
                    </Box>
                  </Card>
                  <Card
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'manual' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'manual' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      minWidth: 220,
                      flex: '1 1 220px',
                    }}
                    onClick={() => {
                      setUploadMethod('manual');
                      updateMeta({ method: 'manual' });
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <AssignmentIcon color={uploadMethod === 'manual' ? 'primary' : 'inherit'} />
                      <Typography>Modification manuelle</Typography>
                    </Box>
                  </Card>
                  <Card
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: uploadMethod === 'preset' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'preset' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      minWidth: 220,
                      flex: '1 1 220px',
                    }}
                    onClick={() => {
                      setUploadMethod('preset');
                      updateMeta({ method: 'preset' });
                    }}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <ClassIcon color={uploadMethod === 'preset' ? 'primary' : 'inherit'} />
                      <Typography>TP Preset</Typography>
                    </Box>
                  </Card>
                </Box>
                {uploadMethod === 'file' && (
                  <Box sx={{ mt: 2 }}>
                    <FileUploadSection
                      files={selectedFiles}
                      onFilesChange={(files) => {
                        // Ne pas écraser valueMeta.uploads ici; on le met à jour via onFileUploaded / onFileDeleted
                        setSelectedFiles(files);
                      }}
                      maxFiles={5}
                      maxSizePerFile={10}
                      acceptedTypes={[
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
                      ]}
                      eventId={eventId}
                      onFileUploaded={(fileId, uploaded) => {
                        setSelectedFiles((prev) => {
                          const updated = prev.map((f) =>
                            f.id === fileId
                              ? {
                                  ...f,
                                  existingFile: {
                                    fileName: uploaded.fileName,
                                    fileUrl: uploaded.fileUrl,
                                    fileSize: uploaded.fileSize,
                                    fileType: uploaded.fileType,
                                  },
                                  isPersisted: true,
                                }
                              : f,
                          );
                          // Si le document était un doublon et pas dans la liste, ne pas ajouter double
                          if (
                            !uploaded.duplicate &&
                            !updated.some((f) => f.id === `existing-${uploaded.documentId}`)
                          ) {
                            // Pas besoin d'ajouter un nouvel item: on met juste à jour celui existant
                          }
                          return updated;
                        });
                        // Mise à jour meta en évitant les doublons
                        const current: any[] = (valueMeta?.uploads || []).map((u: any) => ({
                          fileUrl: typeof u === 'string' ? u : u.fileUrl,
                          fileName: typeof u === 'string' ? u : u.fileName,
                          fileSize: typeof u === 'string' ? undefined : u.fileSize,
                          fileType: typeof u === 'string' ? undefined : u.fileType,
                        }));
                        const existingIdx = current.findIndex(
                          (c) => c.fileUrl === uploaded.fileUrl,
                        );
                        if (existingIdx >= 0) {
                          current[existingIdx] = {
                            fileUrl: uploaded.fileUrl,
                            fileName: uploaded.fileName,
                            fileSize: uploaded.fileSize,
                            fileType: uploaded.fileType,
                          };
                        } else if (!uploaded.duplicate) {
                          current.push({
                            fileUrl: uploaded.fileUrl,
                            fileName: uploaded.fileName,
                            fileSize: uploaded.fileSize,
                            fileType: uploaded.fileType,
                          });
                        }
                        updateMeta({ uploads: current });
                        if (uploaded.duplicate) onDuplicateUpload?.(uploaded.fileUrl);
                        
                        // Notifier les autres composants de la mise à jour
                        try {
                          window.dispatchEvent(new CustomEvent('event:refetch', { detail: { eventId } }));
                        } catch (error) {
                          console.error('Erreur lors de la notification de mise à jour des documents:', error);
                        }
                      }}
                      onFileDeleted={(fileUrl) => {
                        setSelectedFiles((prev) =>
                          prev.filter((f) => f.existingFile?.fileUrl !== fileUrl),
                        );
                        const pruned = (valueMeta?.uploads || []).filter((u: any) => {
                          const url = typeof u === 'string' ? u : u.fileUrl;
                          return url !== fileUrl;
                        });
                        updateMeta({ uploads: pruned });
                        
                        // Notifier les autres composants de la mise à jour
                        try {
                          window.dispatchEvent(new CustomEvent('event:refetch', { detail: { eventId } }));
                        } catch (error) {
                          console.error('Erreur lors de la notification de mise à jour des documents:', error);
                        }
                      }}
                    />
                  </Box>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    disabled={
                      !uploadMethod || (uploadMethod === 'file' && selectedFiles.length === 0)
                    }
                    onClick={() => setActiveStep(1)}
                  >
                    Continuer
                  </Button>
                </Box>
              </>
            ),
          },
          {
            key: 'description',
            label: 'Description & remarques',
            required: false,
            valid: !!(editEventDialogCache as any).validation?.description,
            content: (
              <>
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    slotProps={{ htmlInput: { 'data-cy': 'edit-title' } }}
                    label="Titre"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    select
                    label="Discipline"
                    value={form.discipline}
                    onChange={(e) => update('discipline', e.target.value as any)}
                    fullWidth
                  >
                    <MenuItem value="chimie">Chimie</MenuItem>
                    <MenuItem value="physique">Physique</MenuItem>
                  </TextField>
                  <RichTextEditor
                    value={valueMeta?.remarks || form.notes || ''}
                    onChange={(val: string) => {
                      update('notes', val);
                      updateMeta({ remarks: val });
                    }}
                    placeholder="Ajoutez des remarques, instructions spéciales, notes de sécurité..."
                  />
                  <Box display="flex" gap={1}>
                    <Button onClick={() => setActiveStep(0)}>Retour</Button>
                    <Button variant="contained" onClick={() => setActiveStep(2)}>
                      Continuer
                    </Button>
                  </Box>
                </Box>
              </>
            ),
          },
          {
            key: 'timeslots',
            label: 'Planification : créneaux, classes & calles',
            required: true,
            valid: !!(editEventDialogCache as any).validation?.timeSlots,
            content: (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ajustez les créneaux si nécessaire
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="subtitle1" fontWeight={600}>
                      Créneaux horaires
                    </Typography>
                    <Button variant="outlined" size="small" onClick={addTimeSlot}>
                      Ajouter un créneau
                    </Button>
                  </Box>
                  {timeSlots.map((slot, index) => {
                    const isComplete = slot.date && slot.startTime && slot.endTime;
                    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
                    let modified = false;
                    if (slot.original && isComplete) {
                      const y = slot.date as Date;
                      const dateStr = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
                      if (dateStr !== slot.original.date) modified = true;
                      if (slot.startTime !== slot.original.startTime) modified = true;
                      if (slot.endTime !== slot.original.endTime) modified = true;
                      const sallesChanged =
                        slot.salleIds.slice().sort().join(',') !==
                        slot.original.salleIds.slice().sort().join(',');
                      const classesChanged =
                        slot.classIds.slice().sort().join(',') !==
                        slot.original.classIds.slice().sort().join(',');
                      if (sallesChanged || classesChanged) modified = true;
                    }
                    const isNew = !slot.original;
                    return (
                      <Card
                        key={index}
                        sx={{
                          p: 2,
                          position: 'relative',
                          overflow: 'visible',
                          opacity: slot.deleted ? 0.55 : 1,
                          filter: slot.deleted ? 'grayscale(100%)' : 'none',
                        }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          mb={1}
                        >
                          <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Créneau {index + 1}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1}>
                            {isNew && <Chip size="small" color="info" label="Nouveau" />}
                            {!isNew && modified && !slot.deleted && (
                              <Chip size="small" color="warning" label="Modifié" />
                            )}
                            {slot.deleted && <Chip size="small" color="error" label="Supprimé" />}
                            {timeSlots.length > 0 &&
                              (!slot.deleted ? (
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => removeTimeSlot(index)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              ) : (
                                <Button size="small" onClick={() => undoRemoveTimeSlot(index)}>
                                  Annuler
                                </Button>
                              ))}
                          </Box>
                        </Box>
                        {/* Ligne 1 */}
                        <Box
                          display="grid"
                          gap={2}
                          sx={{
                            gridTemplateColumns: {
                              xs: 'repeat(3, 1fr)',
                              sm: 'repeat(6, max-content)',
                            },
                            '& > *': { minWidth: { sm: 120 } },
                          }}
                        >
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={600}>
                              Date
                            </Typography>
                            <FrenchDateOnly
                              selected={slot.date}
                              onChange={(d: Date | null) =>
                                updateTimeSlot(index, { date: d as Date })
                              }
                              customInput={
                                <TextField size="medium" fullWidth sx={{ overflow: 'visible' }} />
                              }
                            />
                          </Box>
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={600}>
                              Début
                            </Typography>
                            <FrenchTimeOnly
                              selected={
                                slot.startTime ? new Date(`1970-01-01T${slot.startTime}:00`) : null
                              }
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                const hh = (d as Date).getHours().toString().padStart(2, '0');
                                const mm = (d as Date).getMinutes().toString().padStart(2, '0');
                                updateTimeSlot(index, { startTime: `${hh}:${mm}` });
                              }}
                              customInput={
                                <TextField size="medium" fullWidth sx={{ overflow: 'visible' }} />
                              }
                            />
                          </Box>
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={600}>
                              Fin
                            </Typography>
                            <FrenchTimeOnly
                              selected={
                                slot.endTime ? new Date(`1970-01-01T${slot.endTime}:00`) : null
                              }
                              onChange={(d: Date | null) => {
                                if (!d) return;
                                const hh = (d as Date).getHours().toString().padStart(2, '0');
                                const mm = (d as Date).getMinutes().toString().padStart(2, '0');
                                updateTimeSlot(index, { endTime: `${hh}:${mm}` });
                              }}
                              customInput={
                                <TextField size="medium" fullWidth sx={{ overflow: 'visible' }} />
                              }
                            />
                          </Box>
                        </Box>
                        {/* Ligne 2 */}
                        <Box
                          mt={2}
                          display="grid"
                          gap={2}
                          sx={{ gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
                        >
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={600}>
                              Salles
                            </Typography>
                            <Autocomplete
                              multiple
                              size="small"
                              options={availableSalles}
                              getOptionLabel={(o) => o.name}
                              value={availableSalles.filter((s) => slot.salleIds.includes(s.id))}
                              onChange={(_, vals) =>
                                updateTimeSlot(index, {
                                  salleIds: (vals as any[]).map((v) => v.id),
                                })
                              }
                              renderInput={(p) => <TextField {...p} placeholder="Salles" />}
                            />
                          </Box>
                          <Box>
                            <Typography variant="caption" display="block" fontWeight={600}>
                              Classes
                            </Typography>
                            <Autocomplete
                              multiple
                              size="small"
                              options={availableClasses}
                              getOptionLabel={(o) => o.name}
                              value={availableClasses.filter((c) => slot.classIds.includes(c.id))}
                              onChange={(_, vals) =>
                                updateTimeSlot(index, {
                                  classIds: (vals as any[]).map((v) => v.id),
                                })
                              }
                              renderInput={(p) => <TextField {...p} placeholder="Classes" />}
                            />
                          </Box>
                        </Box>
                        {!slot.deleted &&
                          slot.date &&
                          slot.startTime &&
                          slot.endTime &&
                          (() => {
                            const [sh, sm] = slot.startTime.split(':').map(Number);
                            const [eh, em] = slot.endTime.split(':').map(Number);
                            const start = sh * 60 + sm;
                            const end = eh * 60 + em;
                            const outside = start < 8 * 60 || end > 19 * 60;
                            const invalid = end <= start;
                            return (
                              <Box mt={1} display="flex" flexDirection="column" gap={1}>
                                {invalid && (
                                  <Alert severity="warning">
                                    L'heure de fin doit être après l'heure de début.
                                  </Alert>
                                )}
                                {outside && (
                                  <Alert severity="info">
                                    Ce créneau est en dehors des heures d'ouverture (08:00 - 19:00).
                                  </Alert>
                                )}
                              </Box>
                            );
                          })()}
                      </Card>
                    );
                  })}
                </Box>
                <Box display="flex" gap={1} mt={2}>
                  <Button onClick={() => setActiveStep(1)}>Retour</Button>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(3)}
                    disabled={timeSlots.some(
                      (s) => !s.date || !s.startTime || !s.endTime || s.startTime! >= s.endTime!,
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
            label: 'Matériel & Réactifs',
            required: false,
            valid:
              (valueMeta?.materialsDetailed || []).length +
                (valueMeta?.customMaterials || []).length +
                (valueMeta?.chemicalsDetailed || []).length +
                (valueMeta?.customChemicals || []).length >
              0,
            content: (
              <>
                <AddResourcesDialog
                  mode="embedded"
                  discipline={form.discipline}
                  presetMaterials={(valueMeta?.materialsDetailed || []) as any}
                  customMaterials={(valueMeta?.customMaterials || []) as any}
                  presetChemicals={(valueMeta?.chemicalsDetailed || []) as any}
                  customChemicals={(valueMeta?.customChemicals || []) as any}
                  onChange={(data: AddResourcesDialogChange) => {
                    const toNumber = (v: any, def: number) => {
                      if (v === '' || v === null || v === undefined) return def;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : def;
                    };
                    const clampMin = (v: number, min: number) => (v < min ? min : v);
                    const sanitizedPresetMaterials = data.presetMaterials
                      .filter((m) => m.name && m.name.trim())
                      .map((m) => ({
                        ...m,
                        name: m.name.trim(),
                        quantity: clampMin(toNumber(m.quantity, 1), 1),
                        isCustom: false,
                      }));
                    const sanitizedCustomMaterials = data.customMaterials
                      .filter((m) => m.name && m.name.trim())
                      .map((m) => ({
                        ...m,
                        name: m.name.trim(),
                        quantity: clampMin(toNumber(m.quantity, 1), 1),
                      }));
                    const sanitizedPresetChemicals = data.presetChemicals
                      .filter((c) => c.name && c.name.trim())
                      .map((c) => ({
                        ...c,
                        name: c.name.trim(),
                        requestedQuantity: Math.max(0, toNumber(c.requestedQuantity, 0)),
                        unit: (c.unit && c.unit.trim()) || 'g',
                        isCustom: false,
                      }));
                    const sanitizedCustomChemicals = data.customChemicals
                      .filter((c) => c.name && c.name.trim())
                      .map((c) => ({
                        ...c,
                        name: c.name.trim(),
                        requestedQuantity: Math.max(0, toNumber(c.requestedQuantity, 0)),
                        unit: (c.unit && c.unit.trim()) || 'g',
                      }));
                    updateMeta({
                      materialsDetailed: sanitizedPresetMaterials,
                      customMaterials: sanitizedCustomMaterials,
                      chemicalsDetailed: sanitizedPresetChemicals,
                      customChemicals: sanitizedCustomChemicals,
                      materials: Array.from(
                        new Set([
                          ...sanitizedPresetMaterials.map((m) => m.name),
                          ...sanitizedCustomMaterials.map((m) => m.name),
                        ]),
                      ),
                      chemicals: Array.from(
                        new Set([
                          ...sanitizedPresetChemicals.map((c) => c.name),
                          ...sanitizedCustomChemicals.map((c) => c.name),
                        ]),
                      ),
                    });
                  }}
                />
                <Box display="flex" gap={1} mt={2}>
                  <Button onClick={() => setActiveStep(2)}>Retour</Button>
                  <Button variant="contained" onClick={() => setActiveStep(4)}>
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
            valid: (valueMeta?.uploads || []).length > 0,
            content: (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Ajoutez des documents liés (protocoles, fiches de sécurité, etc.)
                </Typography>
                <FileUploadSection
                  files={selectedFiles}
                  onFilesChange={(files) => {
                    // Garder uniquement l'état local; ne pas écraser meta.uploads
                    setSelectedFiles(files);
                  }}
                  maxFiles={5}
                  maxSizePerFile={10}
                  acceptedTypes={[
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
                  ]}
                  eventId={eventId}
                  onFileUploaded={(fileId, uploaded) => {
                    setSelectedFiles((prev) =>
                      prev.map((f) =>
                        f.id === fileId
                          ? {
                              ...f,
                              existingFile: {
                                fileName: uploaded.fileName,
                                fileUrl: uploaded.fileUrl,
                                fileSize: uploaded.fileSize,
                                fileType: uploaded.fileType,
                              },
                              isPersisted: true,
                            }
                          : f,
                      ),
                    );
                    const current: any[] = (valueMeta?.uploads || []).map((u: any) => ({
                      fileUrl: typeof u === 'string' ? u : u.fileUrl,
                      fileName: typeof u === 'string' ? u : u.fileName,
                      fileSize: typeof u === 'string' ? undefined : u.fileSize,
                      fileType: typeof u === 'string' ? undefined : u.fileType,
                    }));
                    const existingIdx = current.findIndex((c) => c.fileUrl === uploaded.fileUrl);
                    if (existingIdx >= 0) {
                      current[existingIdx] = {
                        fileUrl: uploaded.fileUrl,
                        fileName: uploaded.fileName,
                        fileSize: uploaded.fileSize,
                        fileType: uploaded.fileType,
                      };
                    } else if (!uploaded.duplicate) {
                      current.push({
                        fileUrl: uploaded.fileUrl,
                        fileName: uploaded.fileName,
                        fileSize: uploaded.fileSize,
                        fileType: uploaded.fileType,
                      });
                    }
                    updateMeta({ uploads: current });
                    if (uploaded.duplicate) onDuplicateUpload?.(uploaded.fileUrl);
                    
                    // Notifier les autres composants de la mise à jour
                    try {
                      window.dispatchEvent(new CustomEvent('event:refetch', { detail: { eventId } }));
                    } catch (error) {
                      console.error('Erreur lors de la notification de mise à jour des documents:', error);
                    }
                  }}
                  onFileDeleted={(fileUrl) => {
                    setSelectedFiles((prev) =>
                      prev.filter((f) => f.existingFile?.fileUrl !== fileUrl),
                    );
                    const pruned = (valueMeta?.uploads || []).filter((u: any) => {
                      const url = typeof u === 'string' ? u : u.fileUrl;
                      return url !== fileUrl;
                    });
                    updateMeta({ uploads: pruned });
                    
                    // Notifier les autres composants de la mise à jour
                    try {
                      window.dispatchEvent(new CustomEvent('event:refetch', { detail: { eventId } }));
                    } catch (error) {
                      console.error('Erreur lors de la notification de mise à jour des documents:', error);
                    }
                  }}
                />
                {(valueMeta?.uploads || []).length > 0 && (
                  <Stack direction="column" spacing={0.75} mt={1}>
                    {(valueMeta?.uploads || []).map((u: any) => {
                      const fileUrl = typeof u === 'string' ? u : u.fileUrl;
                      const effectiveName = 
                        typeof u === 'string' 
                          ? u 
                          : u.fileName || 
                            (() => {
                              try {
                                const raw = decodeURIComponent(String(u.fileUrl || '')).split('?')[0];
                                const parts = raw.split('/');
                                return parts[parts.length - 1] || 'Document';
                              } catch {
                                return 'Document';
                              }
                            })();
                      
                      const sizeLabel = u.fileSize ? `${(u.fileSize / 1024).toFixed(1)} KB` : '';
                      const tooltip = `${effectiveName}${u.fileType ? `\nType: ${u.fileType}` : ''}${sizeLabel ? `\nTaille: ${sizeLabel}` : ''}`;
                      
                      const buildDownloadUrl = (rawUrl: string) => {
                        if (!rawUrl) return rawUrl;
                        // In production, serve via proxy API for auth and headers
                        if (process.env.NODE_ENV === 'production') {
                          const enc = encodeURIComponent(rawUrl);
                          return `/api/documents/proxy?fileUrl=${enc}`;
                        }
                        return rawUrl;
                      };
                      const openUrl = buildDownloadUrl(fileUrl);
                      
                      return (
                        <Box key={fileUrl} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Tooltip title={tooltip} arrow>
                            <Chip
                              label={effectiveName}
                              size="small"
                              variant="outlined"
                              onClick={() => openUrl && window.open(openUrl, '_blank')}
                              icon={<AttachFileIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                maxWidth: 420,
                                '& .MuiChip-label': {
                                  maxWidth: 380,
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                },
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Télécharger">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => openUrl && window.open(openUrl, '_blank')}
                              >
                                <DownloadIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Supprimer (archiver)">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={docActionLoading === fileUrl}
                                onClick={async () => {
                                  try {
                                    setDocActionLoading(fileUrl);
                                    const res = await fetch(
                                      `/api/events/${eventId}/documents?fileUrl=${encodeURIComponent(fileUrl)}`,
                                      { method: 'DELETE' },
                                    );
                                    if (!res.ok) throw new Error('delete failed');
                                    
                                    // Mise à jour optimiste de l'état local
                                    const updatedUploads = (valueMeta?.uploads || []).filter((x: any) => {
                                      const xu = typeof x === 'string' ? x : x.fileUrl;
                                      return xu !== fileUrl;
                                    });
                                    updateMeta({ uploads: updatedUploads });
                                    
                                    // Mise à jour de selectedFiles aussi
                                    setSelectedFiles((prev) =>
                                      prev.filter((f) => f.existingFile?.fileUrl !== fileUrl),
                                    );
                                    
                                    // Notifier les autres composants de la mise à jour
                                    try {
                                      window.dispatchEvent(new CustomEvent('event:refetch', { detail: { eventId } }));
                                    } catch (error) {
                                      console.error('Erreur lors de la notification de mise à jour des documents:', error);
                                    }
                                    
                                  } catch (e) {
                                    console.error('Erreur suppression document:', e);
                                  } finally {
                                    setDocActionLoading(null);
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="inherit" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
                <Box display="flex" gap={1} mt={2}>
                  <Button onClick={() => setActiveStep(3)}>Retour</Button>
                  <Button variant="contained" onClick={() => setActiveStep(5)}>
                    Terminé
                  </Button>
                </Box>
              </>
            ),
          },
          {
            key: 'recap',
            label: 'Récapitulatif',
            required: true,
            valid: !!(editEventDialogCache as any).validation?.recapValid,
            content: (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Titre: {form.title || '(aucun)'}{' '}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Discipline: {form.discipline}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Méthode: {uploadMethod || valueMeta?.method}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Créneaux: {timeSlots.length}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Matériel:{' '}
                  {(valueMeta?.materialsDetailed || []).length +
                    (valueMeta?.customMaterials || []).length}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Réactifs:{' '}
                  {(valueMeta?.chemicalsDetailed || []).length +
                    (valueMeta?.customChemicals || []).length}
                </Typography>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Documents: {(valueMeta?.uploads || []).length}
                </Typography>
                <Alert severity="info" sx={{ mt: 1 }}>
                  Les créneaux marqués <Chip size="small" color="info" label="Nouveau" /> seront
                  ajoutés; ceux marqués <Chip size="small" color="warning" label="Modifié" /> seront
                  mis à jour; ceux marqués <Chip size="small" color="error" label="Supprimé" />{' '}
                  seront supprimés.
                </Alert>
                <Box mt={2} display="flex" gap={1}>
                  <Button onClick={() => setActiveStep(4)}>Retour</Button>
                  <Button
                    variant="contained"
                    disabled={!(editEventDialogCache as any).validation?.recapValid}
                    onClick={async () => {
                      if (!(editEventDialogCache as any).validation?.recapValid) return;

                      // Start background operations but don't wait for them
                      (async () => {
                        try {
                          // Persist slots (new + modified)
                          await persistSlots();
                          // Allow parent hook to chain additional persistence (event meta, etc.)
                          if (onPersistSlots) {
                            await onPersistSlots();
                          }
                        } catch (e) {
                          console.error('Background save error', e);
                        }
                      })();

                      // Close dialog immediately for better UX
                      // The parent wrapper or page should handle closing
                      try {
                        window.dispatchEvent(new CustomEvent('edit-dialog:close-request'));
                      } catch {}
                    }}
                  >
                    Enregistrer
                  </Button>
                </Box>
              </>
            ),
          },
        ];
        return (
          <WizardStepper
            orientation="vertical"
            steps={steps}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            sx={{ '& .wizard-step-required-incomplete .MuiStepIcon-root': { color: 'orange' } }}
          />
        );
      })()}
    </DialogContent>
  );
});

export default EditEventDialog;
