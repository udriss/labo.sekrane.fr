import { useState } from 'react';

interface MaterielPersoData {
  name: string;
  discipline: string;
  description?: string;
  caracteristiques?: any;
  defaultQty?: number;
  categorieId?: number | null;
}

interface MaterielPerso {
  id: number;
  name: string;
  discipline: string;
  description?: string | null;
  caracteristiques?: any;
  defaultQty?: number | null;
  categorie?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface UseMaterielPersoResult {
  createMaterielPerso: (data: MaterielPersoData) => Promise<number>;
  duplicateDialogOpen: boolean;
  setDuplicateDialogOpen: (open: boolean) => void;
  existingMaterial: MaterielPerso | null;
  pendingData: MaterielPersoData | null;
  confirmUseDuplicate: () => Promise<number>;
  forceCreate: () => Promise<number>;
  isCreating: boolean;
}

export function useMaterielPerso(): UseMaterielPersoResult {
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [existingMaterial, setExistingMaterial] = useState<MaterielPerso | null>(null);
  const [pendingData, setPendingData] = useState<MaterielPersoData | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createMaterielPerso = async (data: MaterielPersoData): Promise<number> => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/materiel-perso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const createdMaterielPerso = await response.json();
        return createdMaterielPerso.id;
      }

      if (response.status === 409) {
        const errorData = await response.json();
        if (errorData.error === 'DUPLICATE_MATERIAL' && errorData.existingMaterial) {
          // Stocker les données pour la dialog
          setExistingMaterial(errorData.existingMaterial);
          setPendingData(data);
          setDuplicateDialogOpen(true);

          // Retourner une promesse qui sera résolue quand l'utilisateur choisira
          return new Promise<number>((resolve, reject) => {
            // Stocker les résolveurs pour les utiliser dans les callbacks
            (window as any).__materielPersoResolver = { resolve, reject };
          });
        }
      }

      // Autres erreurs
      const error = await response.json();
      throw new Error(error.message || 'Erreur lors de la création du matériel personnalisé');
    } finally {
      setIsCreating(false);
    }
  };

  const confirmUseDuplicate = async (): Promise<number> => {
    if (!existingMaterial) {
      throw new Error('Aucun matériel existant trouvé');
    }

    const resolver = (window as any).__materielPersoResolver;
    if (resolver) {
      resolver.resolve(existingMaterial.id);
      delete (window as any).__materielPersoResolver;
    }

    setDuplicateDialogOpen(false);
    setExistingMaterial(null);
    setPendingData(null);

    return existingMaterial.id;
  };

  const forceCreate = async (): Promise<number> => {
    if (!pendingData) {
      throw new Error('Aucune donnée en attente');
    }

    setDuplicateDialogOpen(false);

    try {
      // Ajouter un timestamp pour forcer la création d'un nouveau matériel
      const modifiedData = {
        ...pendingData,
        name: `${pendingData.name} (${new Date().toLocaleTimeString()})`,
      };

      const response = await fetch('/api/materiel-perso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifiedData),
      });

      if (response.ok) {
        const createdMaterielPerso = await response.json();

        const resolver = (window as any).__materielPersoResolver;
        if (resolver) {
          resolver.resolve(createdMaterielPerso.id);
          delete (window as any).__materielPersoResolver;
        }

        return createdMaterielPerso.id;
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la création forcée');
      }
    } catch (error) {
      const resolver = (window as any).__materielPersoResolver;
      if (resolver) {
        resolver.reject(error);
        delete (window as any).__materielPersoResolver;
      }
      throw error;
    } finally {
      setExistingMaterial(null);
      setPendingData(null);
    }
  };

  return {
    createMaterielPerso,
    duplicateDialogOpen,
    setDuplicateDialogOpen,
    existingMaterial,
    pendingData,
    confirmUseDuplicate,
    forceCreate,
    isCreating,
  };
}
