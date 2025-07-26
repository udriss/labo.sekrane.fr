// lib/services/equipment.ts

export interface EquipmentType {
  id: string
  name: string
  svg: string
  isCustom: boolean
  ownerId?: string 
  items: EquipmentItem[]
}


export interface EquipmentItem {
  id?: string
  name: string
  svg: string
  volumes: string[]
  resolutions?: string[]
  tailles?: string[]
  materiaux?: string[]
  customFields?: { [key: string]: string[] } // Pour les champs personnalisés
  isCustom?: boolean
}

export interface EditingItemData {
  name: string
  volumes: string[]
  newVolume: string
  resolutions: string[]
  newResolution: string
  tailles: string[]
  newTaille: string
  materiaux: string[]
  newMateriau: string
  targetCategory: string
  customFields: { [key: string]: string[] }
  newCustomFieldName: string
  newCustomFieldValue: string
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

