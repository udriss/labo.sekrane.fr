"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Class as ClassIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ControlPointDuplicate,
  HideSource,
  NoMeetingRoom,
  MeetingRoom,
  GroupAdd,
  GroupOff
} from "@mui/icons-material";
import WizardStepper, { GenericWizardStep } from "./WizardStepper";
import { RichTextEditor } from "@components/calendar/RichTextEditor";
import AddResourcesDialog, {
  AddResourcesDialogChange,
} from "./AddResourcesDialog";
import { computeWizardValidation } from "./wizardValidation";
import type { FileWithMetadata } from "@/types/global";
import {
  FrenchDateOnly,
  FrenchTimeOnly,
} from "@/components/shared/FrenchDatePicker";

export type CreateEventForm = {
  title: string;
  discipline: "chimie" | "physique";
  notes?: string;
};

export type CreateEventMeta = {
  classes?: Array<{ id: number; name: string }>; // auto-agrégé depuis les créneaux
  salles?: Array<{ id: number; name: string }>; // auto-agrégé depuis les créneaux
  materials?: string[];
  chemicals?: string[];
  uploads?: any[]; // allow richer file objects
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
  customMaterials?: Array<{ name: string; quantity?: number }>;
  customChemicals?: Array<{
    name: string;
    requestedQuantity?: number;
    unit?: string;
  }>;
  remarks?: string;
  method?: "file" | "manual" | "preset";
  presetId?: string | number;
  laborantinKind?: "maintenance" | "fermeture" | "autre";
  timeSlotsDrafts?: any[];
};

// In-memory cache to persist dialog state across open/close cycles
let createEventDialogCache: {
  form?: CreateEventForm;
  meta?: CreateEventMeta;
  timeSlots?: any[];
  uploadMethod?: "file" | "manual" | "preset" | null;
  selectedPreset?: any;
  selectedFiles?: FileWithMetadata[];
} = {};

export function resetCreateEventDialogCache() {
  createEventDialogCache = {} as any;
}

export default function CreateEventDialog({
  initial,
  onChange,
  valueMeta,
  onMetaChange,
  createType = "tp",
  onEventCreated,
  copiedEventId,
}: {
  initial?: Partial<CreateEventForm>;
  onChange: (data: CreateEventForm) => void;
  valueMeta?: CreateEventMeta;
  onMetaChange?: (meta: CreateEventMeta) => void;
  createType?: "tp" | "laborantin";
  onEventCreated?: (eventId: number) => void;
  copiedEventId?: number | null;
}) {
  const [form, setForm] = useState<CreateEventForm>(
    () =>
      createEventDialogCache.form || {
        title: initial?.title ?? "",
        discipline: (initial?.discipline as any) ?? "chimie",
        notes: initial?.notes ?? "",
      }
  );
  const [activeStep, setActiveStep] = useState(0);
  const isLaborantin = createType === "laborantin";
  const [laborKind, setLaborKind] = useState<
    "maintenance" | "fermeture" | "autre" | undefined
  >((valueMeta?.laborantinKind as any) || undefined);

  // Method/preset selection state
  const [uploadMethod, setUploadMethod] = useState<
    "file" | "manual" | "preset" | null
  >(createEventDialogCache.uploadMethod ?? null);
  const [selectedPreset, setSelectedPreset] = useState<any>(
    createEventDialogCache.selectedPreset ?? null
  );
  const [availablePresets, setAvailablePresets] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/event-presets");
        if (!r.ok) return;
        const d = await r.json();
        setAvailablePresets(d?.presets || []);
      } catch {
        setAvailablePresets([]);
      }
    })();
  }, []);

  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>(
    createEventDialogCache.selectedFiles || []
  );

  // État pour gérer l'événement ajouté (pour upload des fichiers)
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);

  // Function to upload files to a specific event ID (called after event creation)
  const uploadFilesToEvent = useCallback(
    async (eventId: number): Promise<void> => {
      // 1) Upload local File objects (multipart)
      const localPending = selectedFiles.filter(
        (f) => f.file && f.uploadStatus === "pending"
      );
      for (const fileObj of localPending) {
        if (!fileObj.file) continue;
        try {
          const formData = new FormData();
          formData.append("file", fileObj.file);
          const response = await fetch(`/api/events/${eventId}/documents`, {
            method: "POST",
            body: formData,
          });
          if (response.ok) {
            const uploaded = await response.json();
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? {
                      ...f,
                      existingFile: {
                        fileName:
                          uploaded.fileName || uploaded.document?.fileName,
                        fileUrl: uploaded.fileUrl || uploaded.document?.fileUrl,
                        fileSize:
                          uploaded.fileSize || uploaded.document?.fileSize,
                        fileType:
                          uploaded.fileType || uploaded.document?.fileType,
                      },
                      uploadStatus: "completed",
                      uploadProgress: 100,
                      isPersisted: true,
                    }
                  : f
              )
            );
            console.log(
              `✅ Fichier uploadé: ${uploaded.fileName || fileObj.file.name}`
            );
          } else {
            console.error(`❌ Échec upload: ${fileObj.file.name}`);
          }
        } catch (error) {
          console.error("❌ Erreur upload:", fileObj.file.name, error);
        }
      }

      // 2) Copy existing files (from presets) to event folder and update database
      const existingPending = selectedFiles.filter(
        (f) => !f.file && f.existingFile && f.uploadStatus === "pending"
      );
      for (const fileObj of existingPending) {
        const ef = fileObj.existingFile!;
        try {
          // Check if this is a preset file that needs to be copied
          const isPresetFile = ef.fileUrl.includes("/preset/");

          if (isPresetFile) {
            // For preset files, we need to copy them to the event folder
            // The API will handle the file copying and return the new URL
            const response = await fetch(`/api/events/${eventId}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: ef.fileName || "document",
                fileUrl: ef.fileUrl, // Original preset URL - API will copy the file
                fileSize: ef.fileSize,
                fileType: ef.fileType || "application/octet-stream",
                copyFromPreset: true, // Flag to indicate this needs copying
              }),
            });

            if (response.ok) {
              const uploaded = await response.json();
              setSelectedFiles((prev) =>
                prev.map((f) =>
                  f.id === fileObj.id
                    ? {
                        ...f,
                        existingFile: {
                          fileName: uploaded.document?.fileName || ef.fileName,
                          fileUrl: uploaded.document?.fileUrl || ef.fileUrl,
                          fileSize: uploaded.document?.fileSize ?? ef.fileSize,
                          fileType: uploaded.document?.fileType || ef.fileType,
                        },
                        uploadStatus: "completed",
                        uploadProgress: 100,
                        isPersisted: true,
                      }
                    : f
                )
              );
              console.log(
                `✅ Document copié depuis preset: ${ef.fileName || ef.fileUrl}`
              );
            } else {
              console.error(
                `❌ Échec copie preset: ${ef.fileName || ef.fileUrl}`
              );
            }
          } else {
            // For non-preset files, just reference them
            const response = await fetch(`/api/events/${eventId}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: ef.fileName || "document",
                fileUrl: ef.fileUrl,
                fileSize: ef.fileSize,
                fileType: ef.fileType || "application/octet-stream",
              }),
            });

            if (response.ok) {
              const uploaded = await response.json();
              setSelectedFiles((prev) =>
                prev.map((f) =>
                  f.id === fileObj.id
                    ? {
                        ...f,
                        existingFile: {
                          fileName: uploaded.document?.fileName || ef.fileName,
                          fileUrl: uploaded.document?.fileUrl || ef.fileUrl,
                          fileSize: uploaded.document?.fileSize ?? ef.fileSize,
                          fileType: uploaded.document?.fileType || ef.fileType,
                        },
                        uploadStatus: "completed",
                        uploadProgress: 100,
                        isPersisted: true,
                      }
                    : f
                )
              );
              console.log(`✅ Document lié: ${ef.fileName || ef.fileUrl}`);
            } else {
              console.error(`❌ Échec liaison: ${ef.fileName || ef.fileUrl}`);
            }
          }
        } catch (error) {
          console.error(
            "❌ Erreur traitement document:",
            ef.fileName || ef.fileUrl,
            error
          );
        }
      }

      // Émettre un événement pour notifier que les documents de l'événement ont été mis à jour
      try {
        window.dispatchEvent(
          new CustomEvent("event-update:end", { detail: { eventId } })
        );
        console.log(`📄 Documents mis à jour pour événement ${eventId}`);
      } catch (error) {
        console.error("❌ Erreur émission événement:", error);
      }
    },
    [selectedFiles]
  );

  // Expose upload function to parent AND trigger it when event is created
  useEffect(() => {
    if (onEventCreated && createdEventId) {
      onEventCreated(createdEventId);
      // Auto-upload files when event is created
      uploadFilesToEvent(createdEventId);
    }
  }, [onEventCreated, createdEventId, uploadFilesToEvent]);

  // Update meta to include files for parent component upload logic (avoid loops)
  useEffect(() => {
    if (!onMetaChange) return;
    const uploads = selectedFiles
      .map((fileObj) => {
        if (fileObj.file && fileObj.uploadStatus === "pending") {
          return {
            isLocal: true,
            fileData: fileObj.file,
            fileName: fileObj.file.name,
            fileSize: fileObj.file.size,
            fileType: fileObj.file.type,
          };
        } else if (fileObj.existingFile) {
          return {
            isLocal: false,
            fileName: fileObj.existingFile.fileName,
            fileUrl: fileObj.existingFile.fileUrl,
            fileSize: fileObj.existingFile.fileSize,
            fileType: fileObj.existingFile.fileType,
          };
        }
        return null;
      })
      .filter(Boolean);
    const currentMeta = (valueMeta || {}) as any;
    // Skip if uploads are identical to avoid infinite update loops
    try {
      const a = JSON.stringify(
        (currentMeta.uploads || []).map((u: any) =>
          typeof u === "string" ? { fileUrl: u } : u
        )
      );
      const b = JSON.stringify(
        (uploads || []).map((u: any) =>
          typeof u === "string" ? { fileUrl: u } : u
        )
      );
      if (a === b) return;
    } catch {}
    onMetaChange({ ...currentMeta, uploads });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFiles]);

  // Refs to store latest callback values
  const onChangeRef = useRef(onChange);
  const onMetaChangeRef = useRef(onMetaChange);

  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onMetaChangeRef.current = onMetaChange;
  }, [onMetaChange]);

  // Fetch event data when copying from an existing event
  useEffect(() => {
    if (!copiedEventId) return;

    let cancelled = false;

    const fetchEventData = async () => {
      // Réinitialiser complètement l'état avant de copier
      try {
        resetCreateEventDialogCache();
      } catch (error) {
        console.warn("Erreur lors de la réinitialisation du cache:", error);
      }

      // Réinitialiser tous les états locaux
      setForm({
        title: "",
        discipline: "chimie",
        notes: "",
      });
      setActiveStep(0);
      setLaborKind(undefined);
      setUploadMethod(null);
      setSelectedPreset(null);
      setSelectedFiles([]);
      setTimeSlots([
        {
          date: null,
          startTime: null,
          endTime: null,
          salleIds: [],
          classIds: [],
        },
      ]);
      setCreatedEventId(null);

      // Réinitialiser le meta via les callbacks
      onChangeRef.current?.({
        title: "",
        discipline: "chimie",
        notes: "",
      });
      onMetaChangeRef.current?.({
        method: "manual",
        materialsDetailed: [],
        customMaterials: [],
        chemicalsDetailed: [],
        customChemicals: [],
        uploads: [],
        remarks: "",
      });

      try {
        const response = await fetch(`/api/events/${copiedEventId}`);
        if (!response.ok || cancelled) return;

        const data = await response.json();
        if (cancelled) return;

        const event = data.event;

        // Populate form with basic event data
        const newForm = {
          title: event.title || "Copie de l'événement", // Ensure title is always provided
          discipline: event.discipline || "chimie",
          notes: event.notes || "",
        };
        setForm(newForm);
        onChangeRef.current(newForm);

        // Populate meta with detailed data
        const newMeta: CreateEventMeta = {
          method: "manual", // Set to manual since we're copying existing data
          materialsDetailed: (event.materiels || [])
            .filter((m: any) => m && (m.materielName || m.name)) // Filter out invalid materials
            .map((m: any) => ({
              id: m.materielId || m.id,
              name: m.materielName || m.name,
              quantity: m.quantity || 1,
            })),
          customMaterials: (event.customMaterielRequests || [])
            .filter((m: any) => m && m.name) // Filter out invalid custom materials
            .map((m: any) => ({
              name: m.name,
              quantity: m.quantity || 1,
            })),
          chemicalsDetailed: (event.reactifs || [])
            .filter((r: any) => r && (r.reactifName || r.name)) // Filter out invalid chemicals
            .map((r: any) => ({
              id: r.reactifId || r.id,
              name: r.reactifName || r.name,
              requestedQuantity: r.requestedQuantity || 0,
              unit: r.unit || "g",
            })),
          customChemicals: (event.customReactifRequests || [])
            .filter((c: any) => c && c.name) // Filter out invalid custom chemicals
            .map((c: any) => ({
              name: c.name,
              requestedQuantity: c.requestedQuantity || 0,
              unit: c.unit || "g",
            })),
          uploads: (event.documents || [])
            .filter((doc: any) => doc && doc.fileUrl) // Filter out invalid documents
            .map((doc: any) => ({
              fileName: doc.fileName,
              fileUrl: doc.fileUrl,
              fileSize: doc.fileSize || 0,
              fileType: doc.fileType || "application/octet-stream",
            })),
          remarks: event.notes,
        };

        // Update meta
        onMetaChangeRef.current?.(newMeta);

        // Transform copied event documents into FileWithMetadata with pending status
        const docs: any[] = (event.documents || []).filter((doc: any) => doc && doc.fileUrl); // Filter out invalid documents
        if (docs.length) {
          const newFiles: FileWithMetadata[] = [];
          for (const d of docs) {
            if (!d?.fileUrl) continue;
            const baseName = (() => {
              try {
                const raw = decodeURIComponent(String(d.fileUrl)).split("?")[0];
                const parts = raw.split("/");
                return d.fileName || parts[parts.length - 1] || "document";
              } catch {
                return d.fileName || "document";
              }
            })();
            newFiles.push({
              id: `copied_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              existingFile: {
                fileName: baseName,
                fileUrl: d.fileUrl,
                fileSize: d.fileSize || 0,
                fileType: d.fileType || "application/octet-stream",
              },
              uploadStatus: "pending",
              uploadProgress: 0,
            });
          }
          if (newFiles.length) {
            setSelectedFiles((prev) => {
              // deduplicate by existing fileUrl
              const byUrl = new Map<string, FileWithMetadata>();
              [...prev, ...newFiles].forEach((f) => {
                const url =
                  f.existingFile?.fileUrl || `${f.file?.name || ""}:${f.id}`;
                if (url) byUrl.set(url, f);
              });
              const merged = Array.from(byUrl.values());
              createEventDialogCache.selectedFiles = merged;
              return merged;
            });
          }
        }

        // Populate time slots
        if (event.timeslots && event.timeslots.length > 0) {
          const timeSlotsFromEvent = event.timeslots.map((slot: any) => {
            // Extract time from startDate/endDate or use existing format
            let startTime = null;
            let endTime = null;
            let date = null;

            if (slot.startDate) {
              const startDate = new Date(slot.startDate);
              startTime = `${startDate
                .getHours()
                .toString()
                .padStart(2, "0")}:${startDate
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
              if (!date && slot.timeslotDate) {
                date = new Date(slot.timeslotDate);
              } else if (!date) {
                date = new Date(
                  startDate.getFullYear(),
                  startDate.getMonth(),
                  startDate.getDate()
                );
              }
            }

            if (slot.endDate) {
              const endDate = new Date(slot.endDate);
              endTime = `${endDate
                .getHours()
                .toString()
                .padStart(2, "0")}:${endDate
                .getMinutes()
                .toString()
                .padStart(2, "0")}`;
            }

            if (slot.timeslotDate && !date) {
              date = new Date(slot.timeslotDate);
            }

            return {
              date,
              startTime,
              endTime,
              salleIds: slot.salleIds || [],
              classIds: slot.classIds || [],
            };
          });

          setTimeSlots(timeSlotsFromEvent);
          createEventDialogCache.timeSlots = timeSlotsFromEvent;
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching event data for copy:", error);
        }
      }
    };

    fetchEventData();

    return () => {
      cancelled = true;
    };
  }, [copiedEventId]);

  // Add method to trigger upload after external event creation
  const triggerFileUpload = useCallback(
    (eventId: number) => {
      setCreatedEventId(eventId);
      uploadFilesToEvent(eventId);
    },
    [uploadFilesToEvent]
  );

  // Data sources for classes, salles, chemicals
  const [availableClasses, setAvailableClasses] = useState<
    Array<{
      id: number;
      name: string;
      system?: boolean;
      group?: string;
      isCustom?: boolean;
    }>
  >([]);
  const [availableSalles, setAvailableSalles] = useState<
    Array<{ id: number; name: string; group?: string; isCustom?: boolean }>
  >([]);
  const [availableChemicals, setAvailableChemicals] = useState<
    Array<{ id: number; name: string; unit?: string }>
  >([]);

  // Local time slots state
  type LocalTimeSlot = {
    date: Date | null;
    startTime: string | null;
    endTime: string | null;
    salleIds: number[];
    classIds: number[];
  };
  const [timeSlots, setTimeSlots] = useState<LocalTimeSlot[]>(
    () =>
      (createEventDialogCache.timeSlots as LocalTimeSlot[] | undefined) || [
        {
          date: null,
          startTime: null,
          endTime: null,
          salleIds: [],
          classIds: [],
        },
      ]
  );

  // Persist cache (debounced via rAF)
  const rafRef = useRef(0);
  const scheduleCacheSave = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const f = form;
    const m = valueMeta;
    const ts = timeSlots;
    const um = uploadMethod;
    const sp = selectedPreset;
    const sf = selectedFiles;
    rafRef.current = requestAnimationFrame(() => {
      createEventDialogCache = {
        form: f,
        meta: m,
        timeSlots: ts,
        uploadMethod: um,
        selectedPreset: sp,
        selectedFiles: sf,
      };
    });
  }, [form, valueMeta, timeSlots, uploadMethod, selectedPreset, selectedFiles]);
  useEffect(() => {
    scheduleCacheSave();
  }, [scheduleCacheSave]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const addTimeSlot = () =>
    setTimeSlots((prev) => [
      ...prev,
      {
        date: null,
        startTime: null,
        endTime: null,
        salleIds: [],
        classIds: [],
      },
    ]);
  const removeTimeSlot = (index: number) =>
    setTimeSlots((prev) => prev.filter((_, i) => i !== index));
  const updateTimeSlot = (index: number, partial: Partial<LocalTimeSlot>) =>
    setTimeSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...partial } : s))
    );

  // Derive drafts for parent (ISO strings, local time)
  useEffect(() => {
    const drafts = timeSlots
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => {
        const y = s.date as Date;
        const [sh, sm] = (s.startTime as string)
          .split(":")
          .map((n) => parseInt(n, 10));
        const [eh, em] = (s.endTime as string)
          .split(":")
          .map((n) => parseInt(n, 10));
        const start = new Date(
          y.getFullYear(),
          y.getMonth(),
          y.getDate(),
          sh,
          sm,
          0,
          0
        );
        const end = new Date(
          y.getFullYear(),
          y.getMonth(),
          y.getDate(),
          eh,
          em,
          0,
          0
        );
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        const localIsoNoZ = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
            d.getDate()
          )}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
        return {
          startDate: localIsoNoZ(start),
          endDate: localIsoNoZ(end),
          timeslotDate: `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(
            y.getDate()
          )}`,
          notes: "",
          salleIds: s.salleIds,
          classIds: s.classIds,
        } as any;
      });
    onMetaChange?.({ ...(valueMeta || {}), timeSlotsDrafts: drafts } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeSlots]);

  // Load classes, salles, chemicals on discipline change
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/classes");
        if (r.ok) {
          const d = await r.json();
          const custom: any[] = (d?.custom || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            system: false,
            isCustom: true,
            group: c.group || "",
          }));
          const predefined: any[] = (d?.classes || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            system: true,
            isCustom: false,
            group: c.group || "",
          }));
          setAvailableClasses([...custom, ...predefined]);
        }
      } catch {
        setAvailableClasses([]);
      }
      try {
        const r = await fetch("/api/salles");
        if (r.ok) {
          const d = await r.json();
          const list: any[] = (d?.salles || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            group: s.group || "",
            isCustom: s.isCustom || false,
          }));
          setAvailableSalles(list);
        }
      } catch {
        setAvailableSalles([]);
      }
      try {
        const rc = await fetch("/api/chemicals");
        if (rc.ok) {
          const d = await rc.json();
          const raw = Array.isArray(d?.reactifs) ? d.reactifs : [];
          const list: Array<{ id: number; name: string; unit?: string }> = (
            raw as any[]
          )
            .map((c: any) => ({
              id: c.id,
              name: c.reactifPreset?.name || c.name,
              unit: c.unit,
            }))
            .filter((c) => !!c.name);
          const dedup = Array.from(
            new Map(list.map((c) => [c.id, c])).values()
          );
          setAvailableChemicals(dedup);
        }
      } catch {
        setAvailableChemicals([]);
      }
    })();
  }, [form.discipline]);

  // Derive unique classes/salles from selected slot ids
  const uniqueClasses = useMemo(() => {
    const idSet = new Set<number>();
    timeSlots.forEach((s) => s.classIds.forEach((cid) => idSet.add(cid)));
    return Array.from(idSet.values())
      .map((id) => availableClasses.find((c) => c.id === id))
      .filter((c): c is { id: number; name: string } => !!c)
      .map((c) => ({ id: c.id, name: c.name }));
  }, [timeSlots, availableClasses]);

  const uniqueSalles = useMemo(() => {
    const idSet = new Set<number>();
    timeSlots.forEach((s) => s.salleIds.forEach((rid) => idSet.add(rid)));
    return Array.from(idSet.values())
      .map((id) => availableSalles.find((s) => s.id === id))
      .filter((s): s is { id: number; name: string } => !!s)
      .map((s) => ({ id: s.id, name: s.name }));
  }, [timeSlots, availableSalles]);

  // Push aggregates to meta
  useEffect(() => {
    onMetaChange?.({
      ...(valueMeta || {}),
      classes: uniqueClasses,
      salles: uniqueSalles,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueClasses, uniqueSalles]);

  // Helpers to update form/meta
  function update<K extends keyof CreateEventForm>(
    key: K,
    value: CreateEventForm[K]
  ) {
    const next = { ...form, [key]: value };
    setForm(next);
    onChange(next);
  }
  function updateMeta(partial: Partial<CreateEventMeta>) {
    const next = { ...(valueMeta || {}), ...partial } as CreateEventMeta;
    onMetaChange?.(next);
  }

  // Validation flags for stepper
  const validation = useMemo(
    () =>
      computeWizardValidation({
        uploadMethod,
        selectedFilesCount: selectedFiles.length, // Compte tous les fichiers (uploadés et en attente)
        uploadsCount: selectedFiles.filter((f) => f.existingFile).length, // Compte seulement les fichiers déjà uploadés
        materialsCount:
          (valueMeta?.materialsDetailed?.length || 0) +
          (valueMeta?.customMaterials?.length || 0),
        chemicalsCount:
          (valueMeta?.chemicalsDetailed?.length || 0) +
          (valueMeta?.customChemicals?.length || 0),
        title: form.title,
        timeSlots,
        presetOnly: isLaborantin,
      }),
    [
      uploadMethod,
      selectedFiles,
      valueMeta,
      form.title,
      timeSlots,
      isLaborantin,
    ]
  );
  (createEventDialogCache as any).validation = validation;

  // Validation pour la création d'événement
  const canCreateEvent = useMemo(() => {
    // Vérifier la discipline
    if (!form.discipline) return false;

    // Vérifier les créneaux
    const validTimeSlots = timeSlots.filter(
      (slot) =>
        slot.date &&
        slot.startTime &&
        slot.endTime &&
        slot.startTime < slot.endTime
    );
    if (validTimeSlots.length === 0) return false;

    return true;
  }, [form.discipline, timeSlots]);

  // State for showing resources step
  const [showResources, setShowResources] = useState(false);

  // State for showing salles/classes section
  const [showSallesClasses, setShowSallesClasses] = useState(false);

  // Derived step indexes
  const idxDescription = 0;
  const idxTimeslots = 1;
  const idxResources = isLaborantin ? -1 : showResources ? 3 : -1;
  const idxDocuments = 2;

  const steps: GenericWizardStep[] = [
    isLaborantin
      ? {
          key: "labor-kind",
          label: "Type d'événement",
          required: true,
          valid: !!laborKind,
          content: (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choisissez le type d'événement laborantin
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                {[
                  { k: "maintenance", label: "Maintenance" },
                  { k: "fermeture", label: "Fermeture labo" },
                  { k: "autre", label: "Autre" },
                ].map((opt) => (
                  <Card
                    key={opt.k}
                    sx={{
                      p: 2,
                      cursor: "pointer",
                      border:
                        laborKind === (opt.k as any)
                          ? "2px solid"
                          : "1px solid",
                      borderColor:
                        laborKind === (opt.k as any)
                          ? "primary.main"
                          : "divider",
                      "&:hover": { borderColor: "primary.main" },
                      minWidth: 220,
                      flex: "1 1 220px",
                    }}
                    onClick={() => {
                      const lk = opt.k as "maintenance" | "fermeture" | "autre";
                      setLaborKind(lk);
                      updateMeta({ laborantinKind: lk });
                      if (!form.title)
                        setForm((f) => ({ ...f, title: opt.label }));
                    }}
                  >
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      gap={1}
                    >
                      <Typography>{opt.label}</Typography>
                    </Box>
                  </Card>
                ))}
              </Box>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  disabled={!laborKind}
                  onClick={() => setActiveStep(idxTimeslots)}
                >
                  Continuer
                </Button>
              </Box>
            </>
          ),
        }
      : {
          key: "method",
          label: "Méthode d'ajout & description",
          required: true,
          valid: !!validation.method && !!validation.description,
          content: (
            <>
              {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choisissez comment ajouter la séance
              </Typography> */}
              <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
                <Card
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    border:
                      uploadMethod === "manual" ? "2px solid" : "1px solid",
                    borderColor:
                      uploadMethod === "manual" ? "primary.main" : "divider",
                    "&:hover": { borderColor: "primary.main" },
                    minWidth: 220,
                    flex: "1 1 220px",
                  }}
                  onClick={() => {
                    setUploadMethod("manual");
                    updateMeta({ method: "manual" });
                  }}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={1}
                  >
                    <AssignmentIcon
                      color={uploadMethod === "manual" ? "primary" : "inherit"}
                    />
                    <Typography>Ajout manuelle</Typography>
                  </Box>
                </Card>
                <Card
                  sx={{
                    p: 2,
                    cursor: "pointer",
                    border:
                      uploadMethod === "preset" ? "2px solid" : "1px solid",
                    borderColor:
                      uploadMethod === "preset" ? "primary.main" : "divider",
                    "&:hover": { borderColor: "primary.main" },
                    minWidth: 220,
                    flex: "1 1 220px",
                  }}
                  onClick={() => {
                    setUploadMethod("preset");
                    updateMeta({ method: "preset" });
                  }}
                >
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={1}
                  >
                    <ClassIcon
                      color={uploadMethod === "preset" ? "primary" : "inherit"}
                    />
                    <Typography>TP Preset</Typography>
                  </Box>
                  {uploadMethod === "preset" && (
                    <Autocomplete
                      sx={{ mt: 2 }}
                      size="small"
                      options={availablePresets}
                      value={selectedPreset}
                      onChange={(_, val) => {
                        setSelectedPreset(val);
                        if (val) {
                          // Reset all local dialog state to avoid overlap with previous selection
                          try {
                            resetCreateEventDialogCache();
                          } catch {}
                          setSelectedFiles([]);
                          createEventDialogCache.selectedFiles = [];
                          setTimeSlots([
                            {
                              date: null,
                              startTime: null,
                              endTime: null,
                              salleIds: [],
                              classIds: [],
                            },
                          ]);
                          // Clear meta before applying new preset
                          updateMeta({
                            materialsDetailed: [],
                            chemicalsDetailed: [],
                            customMaterials: [],
                            customChemicals: [],
                            uploads: [],
                            remarks: "",
                          });
                          // Also reflect cleared slots in cache
                          createEventDialogCache.timeSlots = [
                            {
                              date: null,
                              startTime: null,
                              endTime: null,
                              salleIds: [],
                              classIds: [],
                            },
                          ];
                          // Clear local title & notes
                          setForm((f) => ({ ...f, title: "", notes: "" }));

                          (async () => {
                            try {
                              // Fetch full preset details to include all related tables
                              const presetRes = await fetch(
                                `/api/event-presets/${val.id}`
                              );
                              const presetJson = presetRes.ok
                                ? await presetRes.json()
                                : { preset: val };
                              const preset = presetJson?.preset || val;

                              // Load preset time slots
                              try {
                                const creneauxRes = await fetch(
                                  `/api/event-presets/${val.id}/creneaux`
                                );
                                if (creneauxRes.ok) {
                                  const raw = await creneauxRes.json();
                                  const presetCreneaux = Array.isArray(raw)
                                    ? raw
                                    : raw?.timeslots ||
                                      raw?.creneaux ||
                                      raw?.slots ||
                                      raw?.data ||
                                      [];
                                  console.log(
                                    "🟢 Créneaux récupérés:",
                                    presetCreneaux
                                  );
                                  if (
                                    Array.isArray(presetCreneaux) &&
                                    presetCreneaux.length > 0
                                  ) {
                                    const newTimeSlots = presetCreneaux.map(
                                      (creneau: any) => ({
                                        date: creneau.date
                                          ? new Date(creneau.date)
                                          : creneau.timeslotDate
                                          ? new Date(creneau.timeslotDate)
                                          : creneau.startDate
                                          ? new Date(creneau.startDate)
                                          : null,
                                        startTime:
                                          creneau.startTime ||
                                          (creneau.startDate
                                            ? (() => {
                                                const d = new Date(
                                                  creneau.startDate
                                                );
                                                return isNaN(d.getTime())
                                                  ? null
                                                  : `${d
                                                      .getHours()
                                                      .toString()
                                                      .padStart(2, "0")}:${d
                                                      .getMinutes()
                                                      .toString()
                                                      .padStart(2, "0")}`;
                                              })()
                                            : null),
                                        endTime:
                                          creneau.endTime ||
                                          (creneau.endDate
                                            ? (() => {
                                                const d = new Date(
                                                  creneau.endDate
                                                );
                                                return isNaN(d.getTime())
                                                  ? null
                                                  : `${d
                                                      .getHours()
                                                      .toString()
                                                      .padStart(2, "0")}:${d
                                                      .getMinutes()
                                                      .toString()
                                                      .padStart(2, "0")}`;
                                              })()
                                            : null),
                                        salleIds: creneau.salleIds || [],
                                        classIds: creneau.classIds || [],
                                      })
                                    );
                                    setTimeSlots(newTimeSlots);
                                    createEventDialogCache.timeSlots =
                                      newTimeSlots;
                                  }
                                }
                              } catch (error) {
                                console.error(
                                  "Erreur lors du chargement des créneaux preset:",
                                  error
                                );
                              }

                              updateMeta({
                                method: "preset",
                                presetId: preset.id,
                                materialsDetailed: (preset.materiels || [])
                                  .filter((m: any) => m && (m.materielName || m.name)) // Filter out invalid materials
                                  .map((m: any) => ({
                                    id: m.materielId || undefined,
                                    name: m.materielName || m.name,
                                    quantity: m.quantity || 1,
                                  })),
                                chemicalsDetailed: (preset.reactifs || [])
                                  .filter((r: any) => r && (r.reactifName || r.name)) // Filter out invalid chemicals
                                  .map((r: any) => ({
                                    id: r.reactifId || undefined,
                                    name: r.reactifName || r.name,
                                    requestedQuantity: Number(r.requestedQuantity) || 0,
                                    unit: r.unit || "g",
                                  })),
                                uploads: (preset.documents || [])
                                  .filter((d: any) => d && d.fileUrl) // Filter out invalid documents
                                  .map((d: any) => d.fileUrl),
                                remarks: preset.remarks || "",
                              });

                              // Reference preset documents directly; backend will copy into user folder on event creation
                              const docs: any[] = (preset.documents || []).filter((d: any) => d && d.fileUrl); // Filter out invalid documents
                              if (docs.length) {
                                const newFiles: FileWithMetadata[] = [];
                                for (const d of docs) {
                                  if (!d?.fileUrl) continue;
                                  const baseName = (() => {
                                    try {
                                      const raw = decodeURIComponent(
                                        String(d.fileUrl)
                                      ).split("?")[0];
                                      const parts = raw.split("/");
                                      return (
                                        d.fileName ||
                                        parts[parts.length - 1] ||
                                        "document"
                                      );
                                    } catch {
                                      return d.fileName || "document";
                                    }
                                  })();
                                  newFiles.push({
                                    id: `preset_${Date.now()}_${Math.random()
                                      .toString(36)
                                      .slice(2)}`,
                                    existingFile: {
                                      fileName: baseName,
                                      fileUrl: d.fileUrl,
                                      fileSize: d.fileSize || 0,
                                      fileType:
                                        d.fileType ||
                                        "application/octet-stream",
                                    },
                                    uploadStatus: "pending",
                                    uploadProgress: 0,
                                  });
                                }
                                if (newFiles.length) {
                                  setSelectedFiles((prev) => {
                                    // deduplicate by existing fileUrl
                                    const byUrl = new Map<
                                      string,
                                      FileWithMetadata
                                    >();
                                    [...prev, ...newFiles].forEach((f) => {
                                      const url =
                                        f.existingFile?.fileUrl ||
                                        `${f.file?.name || ""}:${f.id}`;
                                      if (url) byUrl.set(url, f);
                                    });
                                    const merged = Array.from(byUrl.values());
                                    createEventDialogCache.selectedFiles =
                                      merged;
                                    return merged;
                                  });
                                }
                              }

                              setForm((f) => ({ ...f, title: preset.title }));
                              if (preset.remarks)
                                setForm((f) => ({
                                  ...f,
                                  notes: preset.remarks,
                                }));
                              const dsc = String(
                                preset.discipline || ""
                              ).toLowerCase();
                              if (dsc === "chimie" || dsc === "physique") {
                                setForm((f) => ({
                                  ...f,
                                  discipline: dsc as any,
                                }));
                              }
                            } catch {
                              // fallback to basic meta only
                              updateMeta({
                                method: "preset",
                                presetId: val.id,
                              });
                            }
                          })();
                        } else {
                          // Clear all fields when preset is unset
                          updateMeta({
                            method: "preset",
                            presetId: undefined,
                            materialsDetailed: [],
                            chemicalsDetailed: [],
                            customMaterials: [],
                            customChemicals: [],
                            uploads: [],
                            remarks: "",
                          });
                          setSelectedFiles([]);
                          createEventDialogCache.selectedFiles = [];
                          const emptySlots = [
                            {
                              date: null,
                              startTime: null,
                              endTime: null,
                              salleIds: [],
                              classIds: [],
                            },
                          ];
                          setTimeSlots(emptySlots);
                          createEventDialogCache.timeSlots = emptySlots;
                          setForm((f) => ({ ...f, title: "", notes: "" }));
                        }
                      }}
                      getOptionLabel={(o: any) => o.title || ""}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      renderInput={(params) => (
                        <TextField {...params} label="Choisir" />
                      )}
                    />
                  )}
                </Card>
              </Box>

              {(uploadMethod === "manual" ||
                (uploadMethod === "preset" && !!selectedPreset)) && (
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    slotProps={{ htmlInput: { "data-cy": "create-title" } }}
                    label="Titre"
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    fullWidth
                    disabled={uploadMethod === "preset" && selectedPreset}
                  />
                  <TextField
                    select
                    label="Discipline"
                    value={form.discipline}
                    onChange={(e) =>
                      update("discipline", e.target.value as any)
                    }
                    fullWidth
                  >
                    <MenuItem value="chimie">Chimie</MenuItem>
                    <MenuItem value="physique">Physique</MenuItem>
                  </TextField>
                  <RichTextEditor
                    value={valueMeta?.remarks || form.notes || ""}
                    onChange={(val: string) => {
                      update("notes", val);
                      updateMeta({ remarks: val });
                    }}
                    placeholder="Ajoutez des remarques, instructions spéciales, notes de sécurité..."
                  />
                </Box>
              )}

              <Box display="flex" gap={1} mt={2}>
                <Button onClick={() => setActiveStep(0)}>Retour</Button>
                <Button
                  variant="contained"
                  disabled={!uploadMethod || !form.title}
                  onClick={() => setActiveStep(idxTimeslots)}
                >
                  Continuer
                </Button>
              </Box>
            </>
          ),
        },
    {
      key: "timeslots",
      label: "Planification : créneaux, classes & salles",
      required: true,
      valid: !!validation.timeSlots,
      content: (
        <>
          {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Définissez les créneaux, associez des salles et des classes dans une
            interface unifiée.
          </Typography> */}
          <Box display="flex" flexDirection="column" gap={3}>
            <Box>
              <Box
                display="flex"
                alignItems="center"
                justifyContent='flex-start'
                mb={1}
              >
                {/* <Typography variant="subtitle1" fontWeight={600}>
                  Créneaux horaires
                </Typography> */}
              </Box>
              <Stack spacing={2}>
                {timeSlots.map((slot, index) => (
                  <Card
                    key={index}
                    sx={{ p: 2, position: "relative", overflow: "visible" }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      mb={1}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        Créneau {index + 1}
                      </Typography>
                      {timeSlots.length > 1 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeTimeSlot(index)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={2} alignItems="flex-start">
                      <Grid size={{ xs: 4 }}>
                        <Typography
                          variant="caption"
                          display="block"
                          fontWeight={600}
                          gutterBottom
                        >
                          Date
                        </Typography>
                        <FrenchDateOnly
                          selected={slot.date}
                          onChange={(d: Date | null) =>
                            updateTimeSlot(index, { date: d })
                          }
                          customInput={<TextField size="medium" fullWidth />}
                        />
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography
                          variant="caption"
                          display="block"
                          fontWeight={600}
                          gutterBottom
                        >
                          Début
                        </Typography>
                        <FrenchTimeOnly
                          selected={
                            slot.startTime
                              ? new Date(`1970-01-01T${slot.startTime}:00`)
                              : null
                          }
                          onChange={(d: Date | null) => {
                            if (!d) return;
                            const hh = (d as Date)
                              .getHours()
                              .toString()
                              .padStart(2, "0");
                            const mm = (d as Date)
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");
                            updateTimeSlot(index, { startTime: `${hh}:${mm}` });
                          }}
                          customInput={<TextField size="medium" fullWidth />}
                        />
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography
                          variant="caption"
                          display="block"
                          fontWeight={600}
                          gutterBottom
                        >
                          Fin
                        </Typography>
                        <FrenchTimeOnly
                          selected={
                            slot.endTime
                              ? new Date(`1970-01-01T${slot.endTime}:00`)
                              : null
                          }
                          onChange={(d: Date | null) => {
                            if (!d) return;
                            const hh = (d as Date)
                              .getHours()
                              .toString()
                              .padStart(2, "0");
                            const mm = (d as Date)
                              .getMinutes()
                              .toString()
                              .padStart(2, "0");
                            updateTimeSlot(index, { endTime: `${hh}:${mm}` });
                          }}
                          customInput={<TextField size="medium" fullWidth />}
                        />
                      </Grid>
                    </Grid>
                    {showSallesClasses && (
                    <Box
                      mt={2}
                      display="grid"
                      gap={2}
                      sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
                    >
                      <Box>
                        <Typography
                          variant="caption"
                          display="block"
                          fontWeight={600}
                          gutterBottom
                        >
                          Salles
                        </Typography>
                        <Autocomplete
                          multiple
                          size="small"
                          options={availableSalles}
                          groupBy={(o) => o.group || ""}
                          getOptionLabel={(o) => o.name}
                          value={availableSalles.filter((s) =>
                            slot.salleIds.includes(s.id)
                          )}
                          onChange={(_, vals) =>
                            updateTimeSlot(index, {
                              salleIds: (vals as any[]).map((v) => v.id),
                            })
                          }
                          renderInput={(p) => (
                            <TextField {...p} placeholder="Salles" />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, i) => (
                              <Chip
                                {...getTagProps({ index: i })}
                                key={`${option.id}-${option.name}`}
                                label={option.name}
                                size="small"
                                color={option.isCustom ? "warning" : "default"}
                              />
                            ))
                          }
                        />
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          display="block"
                          fontWeight={600}
                          gutterBottom
                        >
                          Classes
                        </Typography>
                        <Autocomplete
                          multiple
                          size="small"
                          options={availableClasses}
                          groupBy={(o) => o.group || ""}
                          getOptionLabel={(o) => o.name}
                          value={availableClasses.filter((c) =>
                            slot.classIds.includes(c.id)
                          )}
                          onChange={(_, vals) =>
                            updateTimeSlot(index, {
                              classIds: (vals as any[]).map((v) => v.id),
                            })
                          }
                          renderInput={(p) => (
                            <TextField {...p} placeholder="Classes" />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, i) => (
                              <Chip
                                {...getTagProps({ index: i })}
                                key={`${option.id}-${option.name}`}
                                label={option.name}
                                size="small"
                                color={option.isCustom ? "warning" : "default"}
                              />
                            ))
                          }
                        />
                      </Box>
                    </Box>
                    )}
                    {slot.date &&
                      slot.startTime &&
                      slot.endTime &&
                      (() => {
                        const [sh, sm] = slot.startTime.split(":").map(Number);
                        const [eh, em] = slot.endTime.split(":").map(Number);
                        const start = sh * 60 + sm;
                        const end = eh * 60 + em;
                        const outside = start < 8 * 60 || end > 19 * 60;
                        const invalid = end <= start;
                        return (
                          <Box
                            mt={1}
                            display="flex"
                            flexDirection="column"
                            gap={1}
                          >
                            {invalid && (
                              <Alert severity="warning">
                                L'heure de fin doit être après l'heure de début.
                              </Alert>
                            )}
                            {outside && (
                              <Alert severity="info">
                                Ce créneau est en dehors des heures d'ouverture
                                (08:00 - 19:00).
                              </Alert>
                            )}
                          </Box>
                        );
                      })()}
                  </Card>
                ))}
              </Stack>
            </Box>
          </Box>
          {/* Divider pour salles/classes */}
          {!showSallesClasses && (
            <Box sx={{ position: "relative", my: 2 }}>
              <Divider />
                <Box>
                  <Tooltip title="Afficher salles et classes">
                <IconButton
                size="medium"
                  onClick={() => setShowSallesClasses(true)}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "45%",
                    transform: "translate(-45%, -50%)",
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: "divider",
                    "&:hover": {
                      bgcolor: "primary.dark",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <GroupAdd />
                </IconButton>
                </Tooltip>
                <Tooltip title="Afficher salles et classes">
                <IconButton
                  size="medium"
                  onClick={() => setShowSallesClasses(true)}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "55%",
                    transform: "translate(-55%, -50%)",
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: "divider",
                    "&:hover": {
                      bgcolor: "primary.dark",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <MeetingRoom />
                </IconButton>
                </Tooltip>
                </Box>
              
            </Box>
          )}
          {showSallesClasses && (
            <Box sx={{ position: "relative", my: 2 }}>
              <Divider />
              
                  <Tooltip title="Masquer salles et classes">
                <IconButton
                size="medium"
                  onClick={() => setShowSallesClasses(false)}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "45%",
                    transform: "translate(-45%, -50%)",
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: "divider",
                    "&:hover": {
                      bgcolor: "primary.dark",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <GroupOff />
                </IconButton>
                </Tooltip>
                <Tooltip title="Masquer salles et classes">
                <IconButton
                size="medium"
                  onClick={() => setShowSallesClasses(false)}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "55%",
                    transform: "translate(-55%, -50%)",
                    bgcolor: "background.paper",
                    border: "2px solid",
                    borderColor: "divider",
                    "&:hover": {
                      bgcolor: "primary.dark",
                      borderColor: "primary.main",
                    },
                  }}
                >
                  <NoMeetingRoom />
                </IconButton>
                </Tooltip>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 3,
              justifyContent: "space-between",
              flexDirection: { xs: "column", sm: "row" },

            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                flexDirection: { sm: "column", md: "row" },
                mt: 2,
                width: "100%",
              }}
            >
              <Button onClick={() => setActiveStep(0)}>Retour</Button>
                <Button
                  variant="contained"
                  onClick={() =>
                    setActiveStep(isLaborantin ? idxDocuments : idxDocuments)
                  }
                  disabled={timeSlots.some(
                    (s) =>
                      !s.date ||
                      !s.startTime ||
                      !s.endTime ||
                      s.startTime! >= s.endTime!
                  )}
                >
                  Continuer
                </Button>
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mt: 2,
                flexDirection: { xs: "column", sm: "row" },
                width: "100%",
              }}
            >
                <Button
                  variant="outlined"
                  size="small"
                  onClick={addTimeSlot}
                  startIcon={<AddIcon />}
                >
                  <Typography variant='overline'>Ajouter un créneau</Typography>
                </Button>
            </Box>
          </Box>
        </>
      ),
    },
    {
      key: "documents",
      label: "Documents",
      required: false,
      valid: (valueMeta?.uploads || []).length > 0,
      content: (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Ajoutez des documents liés (protocoles, fiches de sécurité, etc.)
          </Typography>
          <Card
            sx={{
              p: 3,
              border: "2px dashed",
              borderColor: "divider",
              bgcolor: "background.paper",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "center",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []);
              const newFiles: FileWithMetadata[] = files.map((file) => ({
                id: `local_${Date.now()}_${Math.random()
                  .toString(36)
                  .slice(2)}`,
                file,
                uploadStatus: "pending",
                uploadProgress: 0,
              }));
              setSelectedFiles((prev) => [...prev, ...newFiles]);
              createEventDialogCache.selectedFiles = [
                ...selectedFiles,
                ...newFiles,
              ];
            }}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = [
                ".pdf",
                ".doc",
                ".docx",
                ".odt",
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".txt",
                ".svg",
              ].join(",");
              input.onchange = (e) => {
                const files = Array.from(
                  (e.target as HTMLInputElement).files || []
                );
                const newFiles: FileWithMetadata[] = files.map((file) => ({
                  id: `local_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2)}`,
                  file,
                  uploadStatus: "pending",
                  uploadProgress: 0,
                }));
                setSelectedFiles((prev) => [...prev, ...newFiles]);
                createEventDialogCache.selectedFiles = [
                  ...selectedFiles,
                  ...newFiles,
                ];
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
              Formats: PDF, DOC, DOCX, ODT, JPG, JPEG, PNG, GIF, TXT, SVG • Max
              10 Mo
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
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">
                          {file.file?.name ||
                            file.existingFile?.fileName ||
                            "Fichier inconnu"}
                        </Typography>
                        {file.uploadStatus === "completed" && (
                          <Chip label="Uploadé" color="success" size="small" />
                        )}
                        {file.uploadStatus === "pending" && (
                          <Chip
                            label="En attente"
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedFiles((prev) =>
                            prev.filter((f) => f.id !== file.id)
                          );
                          createEventDialogCache.selectedFiles =
                            selectedFiles.filter((f) => f.id !== file.id);
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
          {/* {(valueMeta?.uploads || []).length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
              {(valueMeta?.uploads || []).map((u: any) => {
                const fileUrl = typeof u === 'string' ? u : u.fileUrl;
                const label = typeof u === 'string' ? u : u.fileName || u.fileUrl;
                return (
                  <Chip
                    key={fileUrl}
                    label={label}
                    size="small"
                    onDelete={() =>
                      updateMeta({
                        uploads: (valueMeta?.uploads || []).filter((x: any) => {
                          const xu = typeof x === 'string' ? x : x.fileUrl;
                          return xu !== fileUrl;
                        }),
                      })
                    }
                  />
                );
              })}
            </Stack>
          )} */}
          <Box display="flex" gap={1} mt={2}>
            <Button onClick={() => setActiveStep(idxTimeslots)}>Retour</Button>
            <Button variant="contained" disabled={!canCreateEvent}
            onClick={() => setActiveStep(idxDocuments + 1)}
            >
              Terminé
            </Button>
          </Box>
        </>
      ),
    },
    ...(!isLaborantin && showResources
      ? ([
          {
            key: "resources",
            label: "Matériel & Réactifs",
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
                      if (v === "" || v === null || v === undefined) return def;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : def;
                    };
                    const clampMin = (v: number, min: number) =>
                      v < min ? min : v;
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
                        requestedQuantity: Math.max(
                          0,
                          toNumber(c.requestedQuantity, 0)
                        ),
                        unit: (c.unit && c.unit.trim()) || "g",
                        isCustom: false,
                      }));
                    const sanitizedCustomChemicals = data.customChemicals
                      .filter((c) => c.name && c.name.trim())
                      .map((c) => ({
                        ...c,
                        name: c.name.trim(),
                        requestedQuantity: Math.max(
                          0,
                          toNumber(c.requestedQuantity, 0)
                        ),
                        unit: (c.unit && c.unit.trim()) || "g",
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
                        ])
                      ),
                      chemicals: Array.from(
                        new Set([
                          ...sanitizedPresetChemicals.map((c) => c.name),
                          ...sanitizedCustomChemicals.map((c) => c.name),
                        ])
                      ),
                    });
                  }}
                />
                <Box display="flex" gap={1} mt={2}>
                  <Button onClick={() => setActiveStep(idxTimeslots)}>
                    Retour
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(idxDocuments)}
                  >
                    Continuer
                  </Button>
                </Box>
              </>
            ),
          },
        ] as GenericWizardStep[])
      : []),
    /* {
      key: 'recap',
      label: 'Récapitulatif',
      required: true,
      valid: !!validation.recapValid,
      content: (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Titre: {form.title || '(aucun)'}{' '}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Discipline: {form.discipline}
          </Typography>
          {isLaborantin && (
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Type: {laborKind || '(non défini)'}
            </Typography>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Méthode: {isLaborantin ? '—' : uploadMethod || valueMeta?.method}
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Créneaux: {timeSlots.length}
          </Typography>
          {!isLaborantin && (
            <>
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
            </>
          )}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Documents: {(valueMeta?.uploads || []).length}
          </Typography>
          <Box display="flex" gap={1} mt={2}>
            <Button onClick={() => setActiveStep(idxDocuments)}>Retour</Button>
            <Button
              variant="contained"
              disabled={!validation.recapValid}
              onClick={() => setActiveStep(idxRecap + 1)}
            >
              Terminer
            </Button>
          </Box>
        </>
      ),
    }, */
  ];

  return (
    <DialogContent>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Tooltip title="Réinitialiser tout le formulaire">
          <IconButton
            onClick={() => {
              // Réinitialiser complètement l'état
              resetCreateEventDialogCache();

              // Réinitialiser tous les états locaux
              setForm({
                title: "",
                discipline: "chimie",
                notes: "",
              });
              setActiveStep(0);
              setLaborKind(undefined);
              setUploadMethod(null);
              setSelectedPreset(null);
              setSelectedFiles([]);
              setTimeSlots([
                {
                  date: null,
                  startTime: null,
                  endTime: null,
                  salleIds: [],
                  classIds: [],
                },
              ]);
              setCreatedEventId(null);
              setShowResources(false);
              setShowSallesClasses(false);

              // Réinitialiser le meta via les callbacks
              onChangeRef.current?.({
                title: "",
                discipline: "chimie",
                notes: "",
              });
              onMetaChangeRef.current?.({
                method: "manual",
                materialsDetailed: [],
                customMaterials: [],
                chemicalsDetailed: [],
                customChemicals: [],
                uploads: [],
                remarks: "",
              });
            }}
            color="error"
            sx={{
              animation: "spin 2s linear infinite",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <WizardStepper
        orientation="vertical"
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        sx={{
          "& .wizard-step-required-incomplete .MuiStepIcon-root": {
            color: "orange",
          },
        }}
      />
      {/* Debug: isLaborantin={isLaborantin}, showResources={showResources}, activeStep={activeStep}, idxDocuments={idxDocuments} */}
      {/* Temporarily force display for debugging */}
      {!isLaborantin && !showResources && (
        <Box sx={{ position: "relative", my: 2 }}>
          <Divider />
          <Tooltip title="Afficher les ressources">
            <IconButton
              onClick={() => setShowResources(true)}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "divider",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
            >
              <ControlPointDuplicate />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {!isLaborantin && showResources && (
        <Box sx={{ position: "relative", my: 2 }}>
          <Divider />
          <Tooltip title="Masquer les ressources">
            <IconButton
              onClick={() => setShowResources(false)}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                bgcolor: "background.paper",
                border: "2px solid",
                borderColor: "divider",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
            >
              <HideSource />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </DialogContent>
  );
}
