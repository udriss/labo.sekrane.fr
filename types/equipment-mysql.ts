// Types pour les équipements en MySQL

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  BROKEN = 'BROKEN',
  RETIRED = 'RETIRED'
}

export interface EquipmentType {
  id: string
  name: string
  svg: string
  is_custom: boolean
  owner_id?: string | null
  created_at: Date
  updated_at: Date
}

export interface EquipmentItem {
  id: string
  name: string
  svg: string
  equipment_type_id: string
  volumes?: string | null // JSON
  resolutions?: string | null // JSON
  tailles?: string | null // JSON
  materiaux?: string | null // JSON
  custom_fields?: string | null // JSON
  is_custom: boolean
  created_at: Date
  updated_at: Date
}

export interface Equipment {
  id: string
  name: string
  equipment_type_id: string
  equipment_item_id?: string | null
  model?: string | null
  serial_number?: string | null
  barcode?: string | null
  quantity: number
  min_quantity?: number | null
  volume?: string | null
  location?: string | null
  room?: string | null
  status: EquipmentStatus
  purchase_date?: Date | null
  notes?: string | null
  created_at: Date
  updated_at: Date
}

// Relations avec jointures
export interface EquipmentWithRelations extends Equipment {
  equipment_type?: EquipmentType
  equipment_item?: EquipmentItem
  // Champs de jointure pour les requêtes SQL
  type_name?: string
  type_svg?: string
  item_name?: string
  item_svg?: string
  item_volumes?: string
}

// Statistiques
export interface EquipmentStats {
  total: number
  by_status: {
    available: number
    in_use: number
    maintenance: number
    broken: number
    retired: number
  }
  by_type: Array<{
    type_name: string
    count: number
  }>
  low_stock: Array<{
    id: string
    name: string
    quantity: number
    min_quantity: number
  }>
}

// Formulaire
export interface EquipmentFormData {
  name: string
  equipment_type_id: string
  equipment_item_id?: string
  model?: string
  serial_number?: string
  barcode?: string
  quantity: number
  min_quantity?: number
  volume?: string
  location?: string
  room?: string
  status: EquipmentStatus
  purchase_date?: string
  notes?: string
}
