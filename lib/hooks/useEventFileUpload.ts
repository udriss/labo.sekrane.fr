import { useCallback, useRef } from 'react';
import type { FileWithMetadata } from '@/types/global';

/**
 * Hook pour gérer l'upload de fichiers lors de l\'ajout d'événements
 * Permet l'upload différé des fichiers et le nettoyage en cas d'annulation
 */
export function useEventFileUpload() {
  const uploadFnRef = useRef<(() => Promise<FileWithMetadata[]>) | null>(null);
  const cleanupFnRef = useRef<(() => Promise<void>) | null>(null);

  // Enregistre la fonction d'upload fournie par le composant enfant
  const registerUploadFunction = useCallback((uploadFn: () => Promise<FileWithMetadata[]>) => {
    uploadFnRef.current = uploadFn;
  }, []);

  // Enregistre la fonction de nettoyage pour le draftId spécifique
  const registerCleanupFunction = useCallback((draftId: string) => {
    cleanupFnRef.current = (window as any)[`cleanupCreateEvent_${draftId}`] || 
                           (window as any)[`cleanupWizard_${draftId}`];
  }, []);

  // Upload tous les fichiers en attente
  const uploadPendingFiles = useCallback(async (): Promise<FileWithMetadata[]> => {
    if (!uploadFnRef.current) {
      console.warn('Upload function not registered');
      return [];
    }
    return await uploadFnRef.current();
  }, []);

  // Nettoie les fichiers uploadés en cas d'annulation
  const cleanupDraftFiles = useCallback(async (): Promise<void> => {
    if (cleanupFnRef.current) {
      await cleanupFnRef.current();
    }
  }, []);

  return {
    registerUploadFunction,
    registerCleanupFunction,
    uploadPendingFiles,
    cleanupDraftFiles,
  };
}
