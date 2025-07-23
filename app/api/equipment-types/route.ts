import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Action de déplacement d'équipement entre catégories
    if (body.action === 'move') {
      const { sourceCategoryId, targetCategoryId, itemName, updatedItem } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)

      // Chercher les catégories source et cible
      const sourceCategory = equipmentTypes.types.find((t: any) => t.id === sourceCategoryId)
      const targetCategory = equipmentTypes.types.find((t: any) => t.id === targetCategoryId)
      
      if (!sourceCategory) {
        return NextResponse.json({ error: 'Catégorie source non trouvée' }, { status: 404 })
      }
      
      if (!targetCategory) {
        return NextResponse.json({ error: 'Catégorie cible non trouvée' }, { status: 404 })
      }

      // Chercher l'item dans la catégorie source
      const itemIndex = sourceCategory.items.findIndex((i: any) => i.name === itemName)
      
      if (itemIndex === -1) {
        return NextResponse.json({ error: 'Équipement non trouvé dans la catégorie source' }, { status: 404 })
      }

      // Vérifier si l'item n'existe pas déjà dans la catégorie cible
      const itemExistsInTarget = targetCategory.items.some((i: any) => i.name === updatedItem.name)
      if (itemExistsInTarget && sourceCategoryId !== targetCategoryId) {
        return NextResponse.json({ error: 'Un équipement avec ce nom existe déjà dans la catégorie cible' }, { status: 400 })
      }

      // Supprimer l'item de la catégorie source
      sourceCategory.items.splice(itemIndex, 1)
      
      // Ajouter l'item modifié à la catégorie cible
      targetCategory.items.push(updatedItem)
      
      // Sauvegarder le fichier
      await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
      return NextResponse.json({ success: true, message: 'Équipement déplacé avec succès' })
    }
    
    // Nouveau format pour ajouter un équipement à une catégorie existante
    if (body.categoryId && body.newItem) {
      const { categoryId, newItem } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)

      // Chercher la catégorie existante
      const existingCategory = equipmentTypes.types.find((t: any) => t.id === categoryId)
      
      if (existingCategory) {
        // Vérifier si l'item n'existe pas déjà
        const itemExists = existingCategory.items.some((i: any) => i.name === newItem.name)
        if (!itemExists) {
          // Si c'est de la verrerie personnalisée, ajouter des volumes par défaut
          let finalItem = { ...newItem, isCustom: true }
          if (categoryId === 'GLASSWARE' && (!newItem.volumes || newItem.volumes.length === 0 || newItem.volumes[0] === 'N/A')) {
            finalItem.volumes = ["1 mL", "5 mL", "10 mL", "25 mL", "50 mL", "100 mL", "250 mL", "500 mL", "1 L", "2 L"]
          }
          
          existingCategory.items.push(finalItem)
          
          // Sauvegarder le fichier
          await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
          return NextResponse.json({ success: true, message: 'Équipement ajouté à la catégorie' })
        } else {
          return NextResponse.json({ error: 'Cet équipement existe déjà dans cette catégorie' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
      }
    }

    // Ajouter un équipement sans catégorie spécifique (va dans "Sans catégorie")
    if (body.newItemWithoutCategory) {
      const { newItemWithoutCategory } = body
      
      const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
      const equipmentTypes = JSON.parse(data)
      
      // S'assurer que la catégorie "Sans catégorie" existe
      const uncategorizedId = await ensureUncategorizedExists(equipmentTypes)
      const uncategorizedCategory = equipmentTypes.types.find((t: any) => t.id === uncategorizedId)
      
      // Vérifier si l'item n'existe pas déjà
      const itemExists = uncategorizedCategory.items.some((i: any) => i.name === newItemWithoutCategory.name)
      if (!itemExists) {
        const finalItem = { ...newItemWithoutCategory, isCustom: true }
        uncategorizedCategory.items.push(finalItem)
        
        // Sauvegarder le fichier
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ success: true, message: 'Équipement ajouté à "Sans catégorie"', categoryId: uncategorizedId })
      } else {
        return NextResponse.json({ error: 'Cet équipement existe déjà dans "Sans catégorie"' }, { status: 400 })
      }
    }
      
    // Format original pour créer une nouvelle catégorie
    const { type, item, createEmpty } = body

    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    // Chercher le type existant ou en créer un nouveau
    let existingType = equipmentTypes.types.find((t: any) => t.id === type.id)
    
    if (existingType) {
      // Ajouter l'item au type existant s'il n'existe pas déjà
      if (item && !createEmpty) {
        const itemExists = existingType.items.some((i: any) => i.name === item.name)
        if (!itemExists) {
          existingType.items.push(item)
        }
      }
    } else {
      // Créer un nouveau type personnalisé
      const newType = {
        ...type,
        isCustom: true,
        items: createEmpty ? [] : [item]
      }
      equipmentTypes.types.push(newType)
    }

    // Sauvegarder le fichier
    await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, itemName, updatedItem } = body
    
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    // Chercher la catégorie
    const category = equipmentTypes.types.find((t: any) => t.id === categoryId)
    
    if (category) {
      // Chercher l'item à mettre à jour
      const itemIndex = category.items.findIndex((i: any) => i.name === itemName)
      
      if (itemIndex !== -1) {
        // Mettre à jour l'item
        category.items[itemIndex] = updatedItem
        
        // Sauvegarder le fichier
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ success: true, message: 'Équipement mis à jour' })
      } else {
        return NextResponse.json({ error: 'Équipement non trouvé' }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, categoryId, itemName } = body
    
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    if (action === 'deleteCategory') {
      // Supprimer une catégorie personnalisée
      const categoryIndex = equipmentTypes.types.findIndex((t: any) => t.id === categoryId && t.isCustom)
      
      if (categoryIndex !== -1) {
        equipmentTypes.types.splice(categoryIndex, 1)
        await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
        return NextResponse.json({ success: true, message: 'Catégorie supprimée' })
      } else {
        return NextResponse.json({ error: 'Catégorie personnalisée non trouvée' }, { status: 404 })
      }
    } else if (action === 'deleteItem') {
      // Supprimer un équipement personnalisé
      const category = equipmentTypes.types.find((t: any) => t.id === categoryId)
      
      if (category) {
        const itemIndex = category.items.findIndex((i: any) => i.name === itemName && i.isCustom)
        
        if (itemIndex !== -1) {
          category.items.splice(itemIndex, 1)
          await fs.writeFile(EQUIPMENT_TYPES_FILE, JSON.stringify(equipmentTypes, null, 2))
          return NextResponse.json({ success: true, message: 'Équipement supprimé' })
        } else {
          return NextResponse.json({ error: 'Équipement personnalisé non trouvé' }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
      }
    }
    
    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
