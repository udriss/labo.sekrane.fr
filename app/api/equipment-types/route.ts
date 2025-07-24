// app/api/equipment-types/route.ts

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'

const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json')

// Fonction pour s'assurer que la catégorie "Sans catégorie" existe
async function ensureUncategorizedExists(equipmentTypes: any) {
  const uncategorizedId = 'UNCATEGORIZED'
  const uncategorized = equipmentTypes.types.find((t: any) => t.id === uncategorizedId)
  
  if (!uncategorized) {
    equipmentTypes.types.push({
      id: uncategorizedId,
      name: 'Sans catégorie',
      svg: '/svg/default.svg',
      isCustom: true,
      items: []
    })
  }
  
  return uncategorizedId
}

export async function GET() {
  try {
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)
    
    // S'assurer que la catégorie "Sans catégorie" existe
    await ensureUncategorizedExists(equipmentTypes)
    await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
    
    return NextResponse.json(equipmentTypes)
  } catch (error) {
    console.error('Erreur lors du chargement des types d\'équipement:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 })
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    
    // Action de déplacement d'équipement entre catégories
    if (body.action === 'move') {
      const { sourceCategoryId, targetCategoryId, itemName, updatedItem } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)

      const sourceCategory = equipmentTypes.types.find((t: any) => t.id === sourceCategoryId)
      const targetCategory = equipmentTypes.types.find((t: any) => t.id === targetCategoryId)
      
      if (!sourceCategory) {
        return NextResponse.json({ error: 'Catégorie source non trouvée' }, { status: 404 })
      }
      
      if (!targetCategory) {
        return NextResponse.json({ error: 'Catégorie cible non trouvée' }, { status: 404 })
      }

      const itemIndex = sourceCategory.items.findIndex((i: any) => i.name === itemName)
      
      if (itemIndex === -1) {
        return NextResponse.json({ error: 'Équipement non trouvé dans la catégorie source' }, { status: 404 })
      }

      const itemExistsInTarget = targetCategory.items.some((i: any) => i.name === updatedItem.name)
      if (itemExistsInTarget && sourceCategoryId !== targetCategoryId) {
        return NextResponse.json({ error: 'Un équipement avec ce nom existe déjà dans la catégorie cible' }, { status: 400 })
      }

      sourceCategory.items.splice(itemIndex, 1)
      targetCategory.items.push(updatedItem)
      
      await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
      return NextResponse.json({ 
        success: true, 
        message: 'Équipement déplacé avec succès',
        action: 'move',
        itemName: updatedItem.name,
        sourceCategory: sourceCategory.name,
        targetCategory: targetCategory.name
      })
    }
    
    // Nouveau format pour ajouter un équipement à une catégorie existante
    if (body.categoryId && body.newItem) {
      const { categoryId, newItem } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)

      const existingCategory = equipmentTypes.types.find((t: any) => t.id === categoryId)
      
      if (existingCategory) {
        const itemExists = existingCategory.items.some((i: any) => i.name === newItem.name)
        if (!itemExists) {
          let finalItem = { ...newItem, isCustom: true }
          if (categoryId === 'GLASSWARE' && (!newItem.volumes || newItem.volumes.length === 0 || newItem.volumes[0] === 'N/A')) {
            finalItem.volumes = ["1 mL", "5 mL", "10 mL", "25 mL", "50 mL", "100 mL", "250 mL", "500 mL", "1 L", "2 L"]
          }
          
          existingCategory.items.push(finalItem)
          
          await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
          return NextResponse.json({ 
            success: true, 
            message: 'Équipement ajouté à la catégorie',
            action: 'add-to-category',
            itemName: finalItem.name,
            categoryName: existingCategory.name
          })
        } else {
          return NextResponse.json({ error: 'Cet équipement existe déjà dans cette catégorie' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
      }
    }

    // Ajouter un équipement sans catégorie spécifique
    if (body.newItemWithoutCategory) {
      const { newItemWithoutCategory } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)
      
      const uncategorizedId = await ensureUncategorizedExists(equipmentTypes)
      const uncategorizedCategory = equipmentTypes.types.find((t: any) => t.id === uncategorizedId)
      
      const itemExists = uncategorizedCategory.items.some((i: any) => i.name === newItemWithoutCategory.name)
      if (!itemExists) {
        const finalItem = { ...newItemWithoutCategory, isCustom: true }
        uncategorizedCategory.items.push(finalItem)
        
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ 
          success: true, 
          message: 'Équipement ajouté à "Sans catégorie"', 
          categoryId: uncategorizedId,
          action: 'add-uncategorized',
          itemName: finalItem.name
        })
      } else {
        return NextResponse.json({ error: 'Cet équipement existe déjà dans "Sans catégorie"' }, { status: 400 })
      }
    }
      
    // Format original pour créer une nouvelle catégorie
    const { type, item, createEmpty } = body

    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    let existingType = equipmentTypes.types.find((t: any) => t.id === type.id)
    
    if (existingType) {
      if (item && !createEmpty) {
        const itemExists = existingType.items.some((i: any) => i.name === item.name)
        if (!itemExists) {
          existingType.items.push(item)
        }
      }
    } else {
      const newType = {
        ...type,
        isCustom: true,
        items: createEmpty ? [] : [item]
      }
      equipmentTypes.types.push(newType)
    }

    await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))

    return NextResponse.json({ 
      success: true,
      action: existingType ? 'add-to-existing' : 'create-category',
      categoryName: type.name,
      itemName: item?.name
    })
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment-type',
    action: 'CREATE',
    customDetails: (req, response) => ({
      operationType: response?.action || 'unknown',
      itemName: response?.itemName,
      categoryName: response?.categoryName || response?.sourceCategory,
      targetCategory: response?.targetCategory
    })
  }
)

// PUT - Envelopper car mise à jour
export const PUT = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { categoryId, itemName, updatedItem } = body
    
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    const category = equipmentTypes.types.find((t: any) => t.id === categoryId)
    
    if (category) {
      const itemIndex = category.items.findIndex((i: any) => i.name === itemName)
      
      if (itemIndex !== -1) {
        category.items[itemIndex] = updatedItem
        
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ 
          success: true, 
          message: 'Équipement mis à jour',
          categoryName: category.name,
          itemName: updatedItem.name,
          oldItemName: itemName
        })
      } else {
        return NextResponse.json({ error: 'Équipement non trouvé' }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment-type',
    action: 'UPDATE',
    customDetails: (req, response) => ({
      categoryName: response?.categoryName,
      itemName: response?.itemName,
      oldItemName: response?.oldItemName
    })
  }
)

// DELETE - Envelopper car suppression
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { action, categoryId, itemName } = body
    
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    if (action === 'deleteCategory') {
      const categoryIndex = equipmentTypes.types.findIndex((t: any) => t.id === categoryId && t.isCustom)
      
      if (categoryIndex !== -1) {
        const deletedCategory = equipmentTypes.types[categoryIndex]
        equipmentTypes.types.splice(categoryIndex, 1)
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ 
          success: true, 
          message: 'Catégorie supprimée',
          action: 'deleteCategory',
          categoryName: deletedCategory.name,
          categoryId: deletedCategory.id
        })
      } else {
        return NextResponse.json({ error: 'Catégorie personnalisée non trouvée' }, { status: 404 })
      }
    } else if (action === 'deleteItem') {
      const category = equipmentTypes.types.find((t: any) => t.id === categoryId)
      
      if (category) {
        const itemIndex = category.items.findIndex((i: any) => i.name === itemName && i.isCustom)
        
        if (itemIndex !== -1) {
          const deletedItem = category.items[itemIndex]
          category.items.splice(itemIndex, 1)
          await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
          return NextResponse.json({ 
            success: true, 
            message: 'Équipement supprimé',
            action: 'deleteItem',
            itemName: deletedItem.name,
            categoryName: category.name
          })
        } else {
          return NextResponse.json({ error: 'Équipement personnalisé non trouvé' }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
      }
    }
    
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment-type',
    action: 'DELETE',
    customDetails: (req, response) => ({
      operationType: response?.action,
      itemName: response?.itemName,
      categoryName: response?.categoryName,
      categoryId: response?.categoryId
    })
  }
)
