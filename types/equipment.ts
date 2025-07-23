// Types et interfaces pour la gestion des équipements
export interface EquipmentType {
  id: string
  name: string
  svg: string
  isCustom?: boolean
  items: EquipmentItem[]
}

export interface EquipmentItem {
  name: string
  svg: string
  volumes: string[]
  isCustom?: boolean
}

export interface EquipmentFormData {
  name: string
  equipmentTypeId: string
  model?: string
  serialNumber?: string
  quantity: number
  volume?: string
  customVolume?: string
  resolution?: string
  location?: string
  room?: string
  supplier?: string
  purchaseDate?: string
  notes?: string
}

export interface RoomLocation {
  id: string
  name: string
  description?: string
}

export interface Room {
  id: string
  name: string
  description?: string
  locations?: RoomLocation[]
}

export interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}
