export interface CustomCharacteristic {
  id: string;
  nom: string;
  valeur: (string | number)[];
  unite?: string;
}

export interface MaterialFormData {
  name: string;
  categoryId?: number | null;
  discipline: string;
  description?: string;
  quantity: number;
  minStock?: number;
  model?: string;
  serialNumber?: string;
  supplier?: string;
  notes?: string;
  purchaseDate?: string;
  salleId?: number | null;
  localisationId?: number | null;
  caracteristiques?: CustomCharacteristic[];
  materielPresetId?: number | null;
}

export interface AddMaterialStepperProps {
  onComplete: (material: MaterialFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onOptimisticAdd?: (material: MaterialFormData) => void;
  discipline?: string;
}

export const DISCIPLINES = ['Chimie', 'Physique', 'SVT', 'Technologie', 'Informatique', 'Commun'];

export const CATEGORIES = [
  'Instrument de mesure',
  'Verrerie',
  'Électronique',
  'Mécanique',
  'Optique',
  'Sécurité',
  'Chauffage',
  'Microscope',
  'Balance',
  'Agitateur',
  'Centrifugeuse',
  'pH-mètre',
  'Spectrophotomètre',
  'Autre',
];
