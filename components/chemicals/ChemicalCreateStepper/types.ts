export interface FormState {
  name: string;
  formula: string;
  casNumber: string;
  hazard: string[]; // multi-select hazard classes
  boilingPointC?: number | null;
  meltingPointC?: number | null;
  category?: string;
  molarMass?: number | null;
  density?: number | null;
  quantity: number;
  unit: string;
  minQuantity: number;
  purchaseDate: Date | null;
  expirationDate: Date | null;
  salleId: number | null;
  localisationId: number | null;
  notes: string;
  supplierName: string;
}

export interface ReactifPresetDTO {
  id: number;
  name: string;
  formula?: string;
  casNumber?: string;
  category?: string;
  hazardClass?: string;
  molarMass?: number;
  density?: number;
  boilingPointC?: number;
  meltingPointC?: number;
}

export interface ChemicalCreateStepperProps {
  onCreated?: (optimistic?: any) => void | Promise<void>;
}
