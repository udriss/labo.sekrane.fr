// app/api/equipment-types/route.ts

export const runtime = 'nodejs';

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


// Fonction pour supprimer les équipements de l'inventaire par type
async function deleteInventoryItemsByTypeIds(typeIds: string[]) {
  try {
    const INVENTORY_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json')
    const inventoryData = await fs.readFile(INVENTORY_FILE, 'utf-8')
    const inventory = JSON.parse(inventoryData)
    
    // Filtrer les équipements qui ne correspondent pas aux typeIds
    const remainingEquipment = inventory.equipment.filter((item: any) => 
      !typeIds.includes(item.equipmentTypeId)
    )
    
    const deletedCount = inventory.equipment.length - remainingEquipment.length
    
    // Mettre à jour l'inventaire
    inventory.equipment = remainingEquipment
    
    // Recalculer les stats
    inventory.stats = {
      total: remainingEquipment.length,
      available: remainingEquipment.filter((e: any) => e.status === 'AVAILABLE').length,
      inUse: remainingEquipment.filter((e: any) => e.status === 'IN_USE').length,
      maintenance: remainingEquipment.filter((e: any) => e.status === 'MAINTENANCE').length,
      outOfOrder: remainingEquipment.filter((e: any) => e.status === 'OUT_OF_ORDER').length
    }
    
    await fs.writeFile(INVENTORY_FILE, JSON.stringify(inventory, null, 2))
    
    return deletedCount
  } catch (error) {
    console.error('Erreur lors de la suppression des équipements de l\'inventaire:', error)
    return 0
  }
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
        // S'assurer que l'item a un ID
        if (!newItem.id) {
          newItem.id = `EQ${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}_CUSTOM`
        }
        
        // Vérifier que l'item n'existe pas déjà
        const itemExists = existingCategory.items.some((i: any) => i.name === newItem.name)
        if (!itemExists) {
          let finalItem = { ...newItem, isCustom: true }
          
          // Gestion spéciale pour la verrerie
          if (categoryId === 'GLASSWARE' && (!newItem.volumes || newItem.volumes.length === 0 || newItem.volumes[0] === 'VIDE')) {
            finalItem.volumes = ["1 mL", "5 mL", "10 mL", "25 mL", "50 mL", "100 mL", "250 mL", "500 mL", "1 L", "2 L"]
          }
          
          existingCategory.items.push(finalItem)
          
          await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
          
          return NextResponse.json({ 
            success: true, 
            message: 'Équipement ajouté à la catégorie',
            action: 'add-to-category',
            itemName: finalItem.name,
            categoryName: existingCategory.name,
            itemId: finalItem.id // Retourner l'ID généré
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
      
      // S'assurer que l'item a un ID
      if (!newItemWithoutCategory.id) {
        newItemWithoutCategory.id = `EQ${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}_CUSTOM`
      }
      
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
          itemName: finalItem.name,
          itemId: finalItem.id // Retourner l'ID généré
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
        // S'assurer que l'item a un ID
        if (!item.id) {
          item.id = `EQ${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}_CUSTOM`
        }
        
        const itemExists = existingType.items.some((i: any) => i.name === item.name)
        if (!itemExists) {
          existingType.items.push({ ...item, isCustom: true })
        }
      }
    } else {
      const newType = {
        ...type,
        isCustom: true,
        items: createEmpty ? [] : [{ ...item, isCustom: true }]
      }
      
      // S'assurer que les items ont des IDs
      if (newType.items.length > 0 && !newType.items[0].id) {
        newType.items[0].id = `EQ${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}_CUSTOM`
      }
      
      equipmentTypes.types.push(newType)
    }

    await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))

    return NextResponse.json({ 
      success: true,
      action: existingType ? 'add-to-existing' : 'create-category',
      categoryName: type.name,
      itemName: item?.name,
      itemId: item?.id // Retourner l'ID généré
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
      targetCategory: response?.targetCategory,
      itemId: response?.itemId
    })
  }
)


export const PUT = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { categoryId, itemName, updatedItem } = body
    console.log('PUT request body:', body)
    
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



export const DELETE = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { action, categoryId, itemName, deleteItems = false } = body
    
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    if (action === 'deleteCategory') {
      const categoryIndex = equipmentTypes.types.findIndex((t: any) => t.id === categoryId && t.isCustom)
      
      if (categoryIndex !== -1) {
        const deletedCategory = equipmentTypes.types[categoryIndex]
        const itemsToMove = deletedCategory.items || []
        let inventoryDeletedCount = 0
        
        // Si on supprime aussi les items
        if (deleteItems && itemsToMove.length > 0) {
          // Obtenir les IDs des équipements à supprimer
          const typeIdsToDelete = itemsToMove
            .filter((item: any) => item.id)
            .map((item: any) => item.id)
          
          // Supprimer les équipements de l'inventaire
          if (typeIdsToDelete.length > 0) {
            inventoryDeletedCount = await deleteInventoryItemsByTypeIds(typeIdsToDelete)
          }
        } else if (!deleteItems && itemsToMove.length > 0) {
          // Déplacer vers "Sans catégorie"
          await ensureUncategorizedExists(equipmentTypes)
          const uncategorizedCategory = equipmentTypes.types.find((t: any) => t.id === 'UNCATEGORIZED')
          
          if (uncategorizedCategory) {
            uncategorizedCategory.items = [...(uncategorizedCategory.items || []), ...itemsToMove]
          }
        }
        
        // Supprimer la catégorie
        equipmentTypes.types.splice(categoryIndex, 1)
        
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        
        return NextResponse.json({ 
          success: true, 
          message: deleteItems 
            ? `Catégorie et équipements supprimés (${inventoryDeletedCount} équipements retirés de l'inventaire)` 
            : 'Catégorie supprimée, équipements déplacés dans "Sans catégorie"',
          action: 'deleteCategory',
          categoryName: deletedCategory.name,
          categoryId: deletedCategory.id,
          itemsDeleted: deleteItems ? itemsToMove.length : 0,
          itemsMoved: deleteItems ? 0 : itemsToMove.length,
          inventoryDeleted: inventoryDeletedCount
        })
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
      categoryId: response?.categoryId,
      itemsDeleted: response?.itemsDeleted,
      itemsMoved: response?.itemsMoved
    })
  }
)
