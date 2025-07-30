// app/api/equipment-types/category/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'

const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json')

export const PUT = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { categoryId, name } = body
    
    if (!categoryId || !name) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    const categoryIndex = equipmentTypes.types.findIndex((t: any) => t.id === categoryId)
    
    if (categoryIndex === -1) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    const oldName = equipmentTypes.types[categoryIndex].name
    equipmentTypes.types[categoryIndex].name = name
    
    await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Catégorie mise à jour',
      categoryId,
      oldName,
      newName: name
    })
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment-category',
    action: 'UPDATE',
    customDetails: (req, response) => ({
      categoryId: response?.categoryId,
      oldName: response?.oldName,
      newName: response?.newName
    })
  }
)