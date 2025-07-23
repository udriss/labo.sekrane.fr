// Types et enums définis manuellement basés sur le schéma Prisma

// Import and re-export Prisma client types
import { Role } from '@prisma/client'
export { Role } from '@prisma/client'

// Manually define the Role enum based on your Prisma schema (now imported from Prisma client)

// export enum Role {
//   ADMIN = 'ADMIN',
//   TEACHER = 'TEACHER',
//   STUDENT = 'STUDENT',
//   USER = 'USER',
//   GUEST = 'GUEST'
// }
// }

export enum Unit {
  mL = 'mL',
  L = 'L',
  g = 'g',
  kg = 'kg',
  mg = 'mg',
  mol = 'mol',
  piece = 'pièce'
}

export enum ChemicalStatus {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OPENED = 'OPENED',
  EXPIRED = 'EXPIRED',
  EMPTY = 'EMPTY',
  QUARANTINE = 'QUARANTINE'
}

export enum HazardClass {
  EXPLOSIVE = 'EXPLOSIVE',
  FLAMMABLE = 'FLAMMABLE',
  OXIDIZING = 'OXIDIZING',
  TOXIC = 'TOXIC',
  CORROSIVE = 'CORROSIVE',
  IRRITANT = 'IRRITANT',
  CARCINOGENIC = 'CARCINOGENIC',
  ENVIRONMENTAL = 'ENVIRONMENTAL'
}

export enum EquipmentType {
  GLASSWARE = 'GLASSWARE',
  HEATING = 'HEATING',
  MEASURING = 'MEASURING',
  SAFETY = 'SAFETY',
  MIXING = 'MIXING',
  FILTRATION = 'FILTRATION',
  OPTICAL = 'OPTICAL',
  ELECTRONIC = 'ELECTRONIC',
  OTHER = 'OTHER'
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  RETIRED = 'RETIRED'
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export enum NotebookStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum CalendarType {
  TP = 'TP',
  MAINTENANCE = 'MAINTENANCE',
  INVENTORY = 'INVENTORY',
  OTHER = 'OTHER'
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  CALIBRATION = 'CALIBRATION',
  CLEANING = 'CLEANING'
}

// Interfaces des modèles basées sur le schéma Prisma
export interface User {
  id: string
  email: string
  password: string
  name: string
  role: Role
  class?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
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
  purchaseDate?: Date | null
  expirationDate?: Date | null
  openedDate?: Date | null
  storage?: string | null
  room?: string | null
  cabinet?: string | null
  shelf?: string | null
  hazardClass?: HazardClass | null
  sdsFileUrl?: string | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  status: ChemicalStatus
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Materiel {
  id: string
  name: string
  type: EquipmentType
  model?: string | null
  serialNumber?: string | null
  barcode?: string | null
  quantity: number
  status: EquipmentStatus
  location?: string | null
  room?: string | null
  cabinet?: string | null
  lastMaintenance?: Date | null
  nextMaintenance?: Date | null
  maintenanceNotes?: string | null
  supplierId?: string | null
  purchaseDate?: Date | null
  warrantyEnd?: Date | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Supplier {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  website?: string | null
  notes?: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Order {
  id: string
  orderNumber: string
  supplierId: string
  userId: string
  status: OrderStatus
  orderDate?: Date | null
  deliveryDate?: Date | null
  totalAmount?: number | null
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  id: string
  orderId: string
  chemicalId?: string | null
  equipmentId?: string | null
  quantity: number
  unitPrice?: number | null
  totalPrice?: number | null
  notes?: string | null
}

export interface NotebookEntry {
  id: string
  title: string
  description?: string | null
  protocolFileUrl?: string | null
  scheduledDate: Date
  duration?: number | null
  class: string
  groups: string[]
  createdById: string
  objectives?: string | null
  procedure?: string | null
  observations?: string | null
  results?: string | null
  calculations?: string | null
  conclusions?: string | null
  images: string[]
  attachments: string[]
  studentSigned: boolean
  teacherSigned: boolean
  signedAt?: Date | null
  status: NotebookStatus
  createdAt: Date
  updatedAt: Date
}

export interface Calendar {
  id: string
  title: string
  description?: string | null
  startDate: Date
  endDate: Date
  class?: string | null
  room?: string | null
  type: CalendarType
  notebookId?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  oldData?: any | null
  newData?: any | null
  timestamp: Date
  ipAddress?: string | null
  userAgent?: string | null
}

// Types avec relations pour l'interface
export type ChemicalWithRelations = Chemical & {
  supplier?: Supplier | null
  usedInNotebooks?: Array<{
    id: string
    notebook: NotebookEntry
    quantityUsed: number
    unit: Unit
  }>
  orderItems?: OrderItem[]
}

export type EquipmentWithRelations = Materiel & {
  supplier?: Supplier | null
  usedInNotebooks?: Array<{
    id: string
    notebook: NotebookEntry
    quantity: number
  }>
  orderItems?: OrderItem[]
}

export type OrderWithRelations = Order & {
  supplier: Supplier
  user: User
  items?: Array<OrderItem & {
    chemical?: Chemical | null
    materiel?: Materiel | null
  }>
}

export type NotebookEntryWithRelations = NotebookEntry & {
  createdBy: User
  assignedTo?: User[]
  chemicals?: Array<{
    id: string
    chemical: Chemical
    quantityUsed: number
    unit: Unit
    notes?: string | null
  }>
  materiel?: Array<{
    id: string
    materiel: Materiel
    quantity: number
    notes?: string | null
  }>
}

export type CalendarWithRelations = Calendar & {
  notebook?: NotebookEntry | null
}

// Types pour les statistiques
export interface StatsData {
  chemicals: {
    total: number
    lowStock: number
    expired: number
    // byStatus?: Record<ChemicalStatus, number>
  }
  equipment: {
    total: number
    available: number
    maintenance: number
    outOfStock?: number
    // byStatus?: Record<EquipmentStatus, number>
  }
  orders: {
    pending: number
    total: number
    delivered?: number
    thisMonth?: number
    // totalAmount?: number
    // byStatus?: Record<OrderStatus, number>
  }
  notebook: {
    total: number
    thisMonth?: number
    completed?: number
    inProgress?: number
    // byStatus?: Record<NotebookStatus, number>
  }
  users: {
    total: number
    active: number
    admins: number
  }
  summary?: {
    totalItems: number
    totalExperiments: number
    totalUsers: number
    totalOrders: number
  }
}

// Types pour les événements de scan
export interface ScanResult {
  id: string
  code: string
  type: "chemical" | "materiel"
  name: string
  quantity?: number
  location?: string
  status: "found" | "not_found" | "error"
  timestamp: Date
  details?: Chemical | Materiel
}

export interface ChemicalCompound {
  name: string;
  formula: string;
  casNumber: string;
  category?: string;
  aliases?: string[];
}
