// types/chemicals.ts

export enum ChemicalStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  EXPIRED = 'EXPIRED',
  EMPTY = 'EMPTY',
  // Ajout de statuts potentiels utilisés dans le composant
  OPENED = 'OPENED',
  QUARANTINE = 'QUARANTINE'
}

export enum Unit {
  g = 'g',
  kg = 'kg', 
  mg = 'mg',
  L = 'L',
  mL = 'mL',
  mol = 'mol',
  mmol = 'mmol',
  pieces = 'pieces',
  piece = 'piece' // Ajouter cette variante pour compatibilité
}

export enum HazardClass {
  FLAMMABLE = 'FLAMMABLE',
  CORROSIVE = 'CORROSIVE',
  TOXIC = 'TOXIC',
  OXIDIZING = 'OXIDIZING',
  EXPLOSIVE = 'EXPLOSIVE',
  RADIOACTIVE = 'RADIOACTIVE',
  BIOLOGICAL = 'BIOLOGICAL',
  NONE = 'NONE'
}

export interface Supplier {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  contactPerson?: string | null
  isActive: boolean
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Chemical {
  id: string
  name: string
  formula?: string | null
  molfile?: string | null
  casNumber?: string | null
  barcode?: string | null
  quantity: number
  unit: Unit
  minQuantity?: number | null
  concentration?: number | null
  purity?: number | null
  purchaseDate?: Date | string | null
  expirationDate?: Date | string | null
  openedDate?: Date | string | null
  storage?: string | null
  room?: string | null
  location?: string | null
  cabinet?: string | null
  shelf?: string | null
  hazardClass?: HazardClass | null
  sdsFileUrl?: string | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  status: ChemicalStatus
  notes?: string | null
  quantityPrevision?: number | null
  createdAt: Date | string
  updatedAt: Date | string
  // Relations
  supplier?: Supplier | null
}

export interface ChemicalWithRelations extends Chemical {
  supplier?: Supplier | null
}

// Interface pour les statistiques des chemicals
export interface ChemicalStats {
  total: number
  inStock: number
  lowStock: number
  expired: number
  expiringSoon: number
}

// Interface pour les données retournées par l'API
export interface ChemicalsResponse {
  chemicals: Chemical[]
  stats: ChemicalStats
}
