// lib/utils/chemical-data-utils.ts

import { promises as fs } from 'fs';
import path from 'path';
import { TimeSlot } from '@/types/calendar';
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { ChemicalRoom, ChemicalLocation } from '@/types/chemicals'













const CHEMICALS_INVENTORY_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json')


interface Event {
  id: string
  title: string
  description?: string | null
  timeSlots: TimeSlot[]
  type: string
  class?: string | null
  room?: string | null
  location?: string | null
  materials?: any[]
  chemicals?: Chemical[]
  equipment?: any[]
  fileName?: string | null
  fileUrl?: string | null
  files?: any[]
  remarks?: string | null
  notes?: string | null
  createdBy?: string | null  // Changé de string | undefined à string | null
  modifiedBy?: any[]
  createdAt: string
  updatedAt: string
  parentEventId?: string 
  [key: string]: any
}

interface Chemical {
  id: string
  name: string
  quantity?: number
  requestedQuantity?: number
  unit?: string
  quantityPrevision?: number
  minQuantity?: number
  isCustom?: boolean
}

interface ChemicalInventory {
  id: string
  name: string
  formula?: string
  molfile?: string | null
  casNumber?: string
  barcode?: string
  quantity: number
  unit: string
  minQuantity: number
  concentration?: number | null
  purity?: number | null
  purchaseDate?: string | null
  expirationDate?: string | null
  openedDate?: string | null
  location?: ChemicalLocation | null
  room?: ChemicalRoom | null
  cabinet?: string
  shelf?: string
  hazardClass?: string | null
  sdsFileUrl?: string | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
  supplier?: string
  quantityPrevision?: number
}

interface ChemicalInventoryFile {
  chemicals: ChemicalInventory[]
  stats: {
    total: number
    inStock: number
    lowStock: number
    expired: number
    expiringSoon: number
  }
}

// Nouvelle fonction pour lire le fichier chemicals inventory
async function readChemicalsInventoryFile(): Promise<ChemicalInventory[]> {
  try {
    const data = await fs.readFile(CHEMICALS_INVENTORY_FILE, 'utf-8')
    const parsed: ChemicalInventoryFile = JSON.parse(data)
    
    return parsed.chemicals || []
  } catch (error) {
    console.error('Erreur lecture fichier chemicals-inventory:', error)
    return []
  }
}

// Fonction pour enrichir les événements avec les données de stock
export async function enrichEventsWithChemicalData(events: Event[]): Promise<Event[]> {
  const chemicalsData = await readChemicalsInventoryFile()
  
  // Créer un map des réactifs chimiques pour un accès rapide
  const chemicalsMap = new Map<string, ChemicalInventory>(
    chemicalsData.map((chem: ChemicalInventory) => [chem.id, chem])
  )
  
  // Enrichir chaque événement
  return events.map((event: Event) => ({
    ...event,
    chemicals: event.chemicals?.map((chemical: Chemical) => {
      const chemicalInventory = chemicalsMap.get(chemical.id)
      
      // Si on trouve le réactif chimique dans l'inventaire
      if (chemicalInventory) {
        return {
          ...chemical,
          // Ajouter les données du stock depuis chemicals-inventory
          quantity: chemicalInventory.quantity || chemical.quantity,
          quantityPrevision: chemicalInventory.quantityPrevision,
          minQuantity: chemicalInventory.minQuantity,
          unit: chemicalInventory.unit || chemical.unit
        }
      }
      
      // Si on ne trouve pas le réactif, retourner tel quel
      return chemical
    }) || []
  }))
}


export async function saveFileToDisk(fileData: {
  userId: string
  fileName: string
  fileContent?: string // Base64 ou URL data
  fileBuffer?: Buffer
}): Promise<string> {
  try {
    // Créer le dossier uploads s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'calendar')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileExtension = path.extname(fileData.fileName)
    const safeFileName = `${timestamp}_${randomString}${fileExtension}`
    const filePath = path.join(uploadDir, safeFileName)

    // Sauvegarder le fichier
    if (fileData.fileBuffer) {
      await writeFile(filePath, fileData.fileBuffer)
    } else if (fileData.fileContent) {
      // Si c'est une data URL, extraire le contenu base64
      const base64Data = fileData.fileContent.replace(/^data:.*,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      await writeFile(filePath, buffer)
    }

    // Retourner le chemin relatif pour l'URL
    return `/uploads/calendar/${fileData.userId}/${safeFileName}`
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du fichier:', error)
    throw error
  }
}

// Fonction helper pour obtenir le type de fichier
export function getFileTypeFromName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
    return 'image/' + extension
  } else if (extension === 'pdf') {
    return 'pdf'
  } else if (['doc', 'docx', 'odt'].includes(extension)) {
    return 'msword'
  }
  return 'other'
}