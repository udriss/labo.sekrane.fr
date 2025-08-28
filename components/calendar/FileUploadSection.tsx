"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { Box, Card, Typography } from "@mui/material";
import type { FileWithMetadata } from "@/types/global";
import { FilePond, registerPlugin } from "react-filepond";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import FilePondPluginImageExifOrientation from "filepond-plugin-image-exif-orientation";
import FilePondPluginImageEdit from "filepond-plugin-image-edit";

// Register core validation + image related plugins (preview, EXIF, edit)
registerPlugin(
  FilePondPluginFileValidateType,
  FilePondPluginFileValidateSize,
  FilePondPluginImageExifOrientation,
  FilePondPluginImageEdit,
);

interface FileUploadSectionProps {
  files: FileWithMetadata[];
  onFilesChange: (files: FileWithMetadata[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // en MB
  acceptedTypes?: string[];
  autoUpload?: boolean; // Pour déclencher l'upload automatiquement
  eventId?: number;
  presetId?: number;
  draftId?: string; // ID réservé pour uploads avant ajout (évite undefined)
  onFileUploaded?: (
    fileId: string,
    uploadedFile: {
      fileName: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
      documentId?: number;
      duplicate?: boolean;
    },
  ) => void;
  onFileDeleted?: (fileUrl: string) => void;
}

export function FileUploadSection({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = [
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
  ],
  autoUpload = true,
  eventId,
  presetId,
  draftId,
  onFileUploaded,
  onFileDeleted,
}: FileUploadSectionProps) {
  // Adapter pour FilePond: types acceptés et contraintes (convertir extensions → MIME)
  const filePondAcceptedMimes = useMemo(() => {
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.odt': 'application/vnd.oasis.opendocument.text',
    };
    const mimes = acceptedTypes
      .map((ext) => map[ext.toLowerCase()])
      .filter((v): v is string => !!v);
    // Dédupliquer
    return Array.from(new Set(mimes));
  }, [acceptedTypes]);
  const maxFileSizeStr = useMemo(() => `${maxSizePerFile}MB`, [maxSizePerFile]);
  // Make a FilePond-friendly files array from current props (existing files shown as local)
  const pondFiles = useMemo(() => {
    return (files || []).map((f) => {
      if (f.existingFile) {
        // Existing file: show as local file loaded from URL
        return {
          source: f.existingFile.fileUrl,
          options: {
            type: "local" as const,
            file: {
              name: f.existingFile.fileName,
              size: f.existingFile.fileSize,
              type: f.existingFile.fileType,
            },
            metadata: {
              persisted: true,
              url: f.existingFile.fileUrl,
              name: f.existingFile.fileName,
              size: f.existingFile.fileSize,
              type: f.existingFile.fileType,
            },
          },
        };
      }
      if (f.file) {
        // New local file not yet uploaded
        return {
          source: f.file,
          options: { type: "local" as const, metadata: { persisted: false } },
        };
      }
      return undefined as any;
    }).filter(Boolean);
  }, [files]);

  const pondRef = useRef<any>(null);
  // Provide initial files only once; then let FilePond manage its own state
  const initialFilesRef = useRef<any>(pondFiles);

  // Inject initial files once on mount to keep FilePond uncontrolled afterwards
  useEffect(() => {
    if (pondRef.current && initialFilesRef.current && initialFilesRef.current.length) {
      try {
        pondRef.current.addFiles(initialFilesRef.current);
      } catch {
        // no-op if API shape differs; FilePond still usable without initial injection
      }
    }
  }, []);

  // One-way sync: if parent removes an existing file, reflect it in FilePond UI
  useEffect(() => {
    const pond: any = pondRef.current;
    if (!pond) return;
    try {
      const currentItems: any[] = pond.getFiles ? pond.getFiles() : [];
      const parentUrls = new Set(
        (files || [])
          .filter((f) => f.existingFile?.fileUrl)
          .map((f) => f.existingFile!.fileUrl),
      );
      currentItems.forEach((it: any) => {
        const meta = (typeof it.getMetadata === 'function' ? it.getMetadata() : it.metadata) || {};
        const serverId: string | undefined = it.serverId || it.server_id;
        const url = serverId ? decodeURIComponent(serverId) : meta.url;
        if (url && !parentUrls.has(url)) {
          try {
            pond.removeFile(it.id || it);
          } catch {
            // ignore removal errors
          }
        }
      });
    } catch {
      // ignore sync errors
    }
  }, [files]);

  // Build FilePond server interface to centralize upload/delete and avoid double state
  const server = useMemo(() => {
    return {
      process: (
        fieldName: string,
        file: File,
        _metadata: Record<string, any>,
        load: (uniqueFileId?: string) => void,
        error: (message?: string) => void,
        progress: (computable: boolean, loaded: number, total: number) => void,
        abort: () => void,
      ) => {
        try {
          const target = presetId
            ? `/api/event-presets/${presetId}/documents`
            : eventId
              ? `/api/events/${eventId}/documents`
              : draftId
                ? `/api/uploads/draft/${encodeURIComponent(draftId)}`
                : `/api/events/undefined/documents`; // will 400, but shouldn't happen if draftId provided
          const formData = new FormData();
          formData.append("file", file);
          const xhr = new XMLHttpRequest();
          xhr.upload.onprogress = (e) => {
            progress(e.lengthComputable, e.loaded, e.total);
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText || "{}");
                const doc = response.document || response;
                const uploadedUrl = doc.fileUrl || response.fileUrl || response.path;
                const uploadedName = doc.fileName || response.fileName || file.name;
                const uploadedSize = doc.fileSize || response.fileSize || file.size;
                const uploadedType = doc.fileType || response.fileType || file.type || "application/octet-stream";
                // Notify FilePond upload finished, use fileUrl as server id
                load(encodeURIComponent(uploadedUrl));
                // Notify parent
                onFileUploaded?.(`pond_${Date.now()}`, {
                  fileName: uploadedName,
                  fileUrl: uploadedUrl,
                  fileSize: uploadedSize,
                  fileType: uploadedType,
                  documentId: doc.id,
                  duplicate: !!response.duplicate,
                });
                // Parent state will be synchronized via onupdatefiles snapshot.
              } catch (e) {
                error("Réponse serveur invalide");
              }
            } else {
              try {
                const parsed = JSON.parse(xhr.responseText || '{}');
                const msg = parsed?.error as string | undefined;
                error(msg || "Erreur serveur");
              } catch {
                error("Erreur serveur");
              }
            }
          };
          xhr.onerror = () => error("Erreur réseau");
          xhr.onabort = () => error("Upload annulé");
          xhr.open("POST", target);
          xhr.send(formData);
          // allow FilePond to cancel
          return {
            abort: () => {
              xhr.abort();
              abort();
            },
          };
        } catch (e) {
          error("Impossible d'uploader ce fichier");
          return { abort() {} };
        }
      },
  revert: (
        uniqueId: string,
        load: () => void,
        error: (message?: string) => void,
      ) => {
        try {
          const fileUrl = decodeURIComponent(uniqueId);
          const target = presetId
            ? `/api/event-presets/${presetId}/documents?fileUrl=${encodeURIComponent(fileUrl)}`
            : eventId
              ? `/api/events/${eventId}/documents?fileUrl=${encodeURIComponent(fileUrl)}`
              : draftId
                ? `/api/uploads/draft/${encodeURIComponent(draftId)}?fileUrl=${encodeURIComponent(fileUrl)}`
                : `/api/events/undefined/documents?fileUrl=${encodeURIComponent(fileUrl)}`;
          fetch(target, { method: "DELETE" })
            .then(async (r) => {
              if (!r.ok) {
                const msg = await r.json().catch(() => ({} as any));
                throw new Error(msg?.error || "Suppression serveur échouée");
              }
      // Notify parent so external lists (e.g., EventDetailsDialog) reflect deletion
      try { onFileDeleted?.(fileUrl); } catch {}
              load();
            })
            .catch((e) => error(e instanceof Error ? e.message : "Erreur suppression"));
        } catch (e) {
          error("Erreur suppression");
        }
      },
      // Load existing file when provided as local source (type: 'local')
      load: (
        source: string,
        load: (file: Blob | string) => void,
        _error: (message?: string) => void,
        _progress: (computable: boolean, loaded: number, total: number) => void,
        abort: () => void,
      ) => {
        // Simple fetch of the file URL
        const controller = new AbortController();
        fetch(source, { signal: controller.signal })
          .then((r) => r.blob())
          .then((blob) => load(blob))
          .catch(() => abort());
        return { abort: () => controller.abort() } as any;
      },
    } as any;
  }, [eventId, presetId, draftId, onFileUploaded, onFileDeleted]);

  return (
    <Box>
      <Card sx={{ p: 2 }}>
  <FilePond
          ref={pondRef}
          credits={false}
          allowMultiple
          instantUpload={autoUpload}
          maxFiles={maxFiles}
          acceptedFileTypes={filePondAcceptedMimes}
          allowFileTypeValidation
          allowFileSizeValidation
          maxFileSize={maxFileSizeStr}
          
          server={server}
          labelFileTypeNotAllowed="Type de fichier non autorisé"
          fileValidateTypeLabelExpectedTypes={`Types autorisés: ${acceptedTypes.join(', ')}`}
          labelMaxFileSizeExceeded="Fichier trop volumineux"
          labelMaxFileSize="Taille maximale: {filesize}"
          labelIdle={`Glissez-déposez vos fichiers ou <span class="filepond--label-action">cliquez pour parcourir</span><br/>Formats: ${acceptedTypes.join(', ')} • Max ${maxSizePerFile} Mo`}
          labelFileProcessing="Téléversement en cours"
          labelFileProcessingAborted="Téléversement annulé"
          labelFileProcessingComplete="Téléversement terminé"
          labelFileProcessingError="Échec du téléversement"
          labelTapToCancel="Touchez pour annuler"
          labelTapToRetry="Touchez pour réessayer"
          labelTapToUndo="Touchez pour annuler"
          labelButtonRetryItemLoad="Réessayer"
          labelButtonRetryItemProcessing="Réessayer"
          labelButtonProcessItem="Téléverser"
          labelButtonAbortItemLoad="Annuler"
          labelButtonAbortItemProcessing="Annuler"
          labelButtonRemoveItem="Supprimer"
          labelButtonUndoItemProcessing="Annuler"
          onupdatefiles={(items) => {
            // Synchronize parent state from current pond state
            const next: FileWithMetadata[] = items.map((it: any) => {
              const serverId: string | undefined = it.serverId || it.server_id;
              const meta = (typeof it.getMetadata === 'function' ? it.getMetadata() : it.metadata) || {};
              // Case 1: processed file with server id
              if (serverId) {
                const url = decodeURIComponent(serverId);
                const name = it.file?.name || it.filename || meta.name;
                const size = it.file?.size || meta.size || 0;
                const type = it.file?.type || meta.type || "application/octet-stream";
                return {
                  id: `existing_${url}`,
                  existingFile: {
                    fileName: name,
                    fileUrl: url,
                    fileSize: size,
                    fileType: type,
                  },
                  uploadStatus: "completed",
                  uploadProgress: 100,
                  isPersisted: true,
                } as FileWithMetadata;
              }
              // Case 2: preloaded existing local item
              if (meta?.persisted && meta?.url) {
                return {
                  id: `existing_${meta.url}`,
                  existingFile: {
                    fileName: meta.name || it.file?.name || it.filename || "fichier",
                    fileUrl: meta.url,
                    fileSize: meta.size || it.file?.size || 0,
                    fileType: meta.type || it.file?.type || "application/octet-stream",
                  },
                  uploadStatus: "completed",
                  uploadProgress: 100,
                  isPersisted: true,
                } as FileWithMetadata;
              }
              // Case 3: local file awaiting upload
              return {
                id: `local_${it.id || Math.random().toString(36).slice(2)}`,
                file: it.file as File,
                uploadStatus: autoUpload ? "uploading" : "pending",
                uploadProgress: 0,
              } as FileWithMetadata;
            });
            onFilesChange(next);
          }}
        />
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {files.length}/{maxFiles} fichiers
        </Typography>
      </Card>
    </Box>
  );
}
