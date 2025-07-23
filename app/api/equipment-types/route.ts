import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json')

export async function GET() {
  try {
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)
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
          if (categoryId === 'GLASSWARE' && (!newItem.volumes || newItem.volumes.length === 0)) {
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
      
    
    // Format original pour créer une nouvelle catégorie
    const { type, item } = body

    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    const equipmentTypes = JSON.parse(data)

    // Chercher le type existant ou en créer un nouveau
    let existingType = equipmentTypes.types.find((t: any) => t.id === type.id)
    
    if (existingType) {
      // Ajouter l'item au type existant s'il n'existe pas déjà
      const itemExists = existingType.items.some((i: any) => i.name === item.name)
      if (!itemExists) {
        existingType.items.push(item)
      }
    } else {
      // Créer un nouveau type personnalisé
      const newType = {
        ...type,
        isCustom: true,
        items: [item]
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
