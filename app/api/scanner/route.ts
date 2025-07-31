// app/api/scanner/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { query } from '@/lib/db'

const EQUIPMENT_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json')

// Fonction pour lire un fichier JSON
async function readJsonFile(filePath: string, defaultValue: any = {}) {
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`Erreur lecture fichier ${filePath}:`, error)
    return defaultValue
  }
}

// Fonction pour rechercher un réactif par code
async function searchProductByCode(code: string) {
  try {
    // Recherche dans les réactifs chimiques (MySQL)
    const chemicals = await query(
      `SELECT c.*, s.name as supplierName 
       FROM chemicals c 
       LEFT JOIN suppliers s ON c.supplierId = s.id 
       WHERE c.barcode = ? OR c.casNumber = ? OR c.id = ?`,
      [code, code, code]
    )
    
    if (chemicals.length > 0) {
      const chemical = {
        ...chemicals[0],
        supplier: chemicals[0].supplierId ? { name: chemicals[0].supplierName } : null
      }
      return {
        type: 'chemical',
        data: chemical
      }
    }

    // Recherche dans l'équipement (toujours en JSON pour l'instant)
    const equipmentData = await readJsonFile(EQUIPMENT_FILE, { equipment: [] })
    const equipment = equipmentData.equipment?.find((e: any) => 
      e.barcode === code || e.serialNumber === code || e.id === code
    )
    
    if (equipment) {
      return {
        type: 'materiel',
        data: equipment
      }
    }

    return null
  } catch (error) {
    console.error('Erreur recherche réactif:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { error: 'Le paramètre code est requis' },
        { status: 400 }
      )
    }

    const result = await searchProductByCode(code)
    
    if (!result) {
      return NextResponse.json(
        { error: 'Réactif non trouvé', code },
        { status: 404 }
      )
    }

    return NextResponse.json({
      type: result.type,
      product: result.data,
      found: true
    })
  } catch (error) {
    console.error('Erreur API scanner:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    )
  }
}
