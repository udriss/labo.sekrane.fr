// app/api/equipment-types/check-usage/route.ts
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json')
const INVENTORY_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json')

export async function POST(request: NextRequest) {
  try {
    const { categoryId } = await request.json()
    
    // Charger les types d'équipement
    const typesData = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(typesData)
    
    // Trouver la catégorie
    const category = equipmentTypes.types.find((t: any) => t.id === categoryId)
    if (!category) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }
    
    // Obtenir tous les IDs d'équipements de cette catégorie
    const equipmentIds = category.items
      .filter((item: any) => item.id)
      .map((item: any) => item.id)
    
    // Charger l'inventaire
    const inventoryData = await fs.readFile(INVENTORY_FILE, 'utf-8')
    const inventory = JSON.parse(inventoryData)
    
    // Compter les équipements de l'inventaire qui utilisent ces modèles
    const usageCount = inventory.equipment.filter((item: any) => 
      equipmentIds.includes(item.equipmentTypeId)
    ).length
    
    return NextResponse.json({
      categoryName: category.name,
      itemNames: category.items.map((item: any) => item.name),
      inventoryUsage: usageCount
    })
    
  } catch (error) {
    console.error('Erreur lors de la vérification:', error)
    return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 })
  }
}