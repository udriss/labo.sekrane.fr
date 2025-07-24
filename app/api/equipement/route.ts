// app/api/equipement/route.ts

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit';

const EQUIPMENT_INVENTORY_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json')
const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json')

// Fonction pour lire l'inventaire des équipements
async function readEquipmentInventory() {
  try {
    const data = await fs.readFile(EQUIPMENT_INVENTORY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture inventaire équipements:', error)
    return { equipment: [], stats: { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 } }
  }
}

// Fonction pour écrire l'inventaire des équipements
async function writeEquipmentInventory(data: any) {
  try {
    await fs.writeFile(EQUIPMENT_INVENTORY_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture inventaire équipements:', error)
    throw error
  }
}

// Fonction pour lire les types d'équipements
async function readEquipmentTypes() {
  try {
    const data = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture types équipements:', error)
    return { types: [] }
  }
}

// Fonction pour calculer les statistiques
function calculateStats(equipment: any[]) {
  return {
    total: equipment.length,
    inStock: equipment.filter((e: any) => e.quantity > 0).length,
    lowStock: equipment.filter((e: any) => e.quantity > 0 && e.quantity <= (e.minQuantity || 1)).length,
    outOfStock: equipment.filter((e: any) => e.quantity === 0).length
  }
}

// GET - Récupérer tous les équipements
export async function GET() {
  try {
    const inventory = await readEquipmentInventory()
    const types = await readEquipmentTypes()
    
    // Enrichir les équipements avec les informations des types
    const enrichedEquipment = inventory.equipment.map((eq: any) => {
      // Trouver le type et l'item correspondant
      for (const type of types.types) {
        const item = type.items.find((item: any) => item.id === eq.equipmentTypeId)
        if (item) {
          return {
            ...eq,
            typeName: type.name,
            itemName: item.name,
            svg: item.svg,
            availableVolumes: item.volumes
          }
        }
      }
      return eq
    })

    // Recalculer les stats
    const stats = calculateStats(inventory.equipment)

    return NextResponse.json({ 
      materiel: enrichedEquipment,
      total: stats.total,
      available: stats.inStock,
      maintenance: stats.outOfStock
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des équipements" },
      { status: 500 }
    )
  }
}

// POST - Ajouter un nouvel équipement
export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    const data = await request.json()
    
    // Validation des données requises
    if (!data.name || !data.equipmentTypeId) {
      return NextResponse.json(
        { error: "Le nom et l'ID du type d'équipement sont requis" },
        { status: 400 }
      )
    }

    // Vérifier que le type d'équipement existe
    const types = await readEquipmentTypes()
    let foundItem = null
    for (const type of types.types) {
      const item = type.items.find((item: any) => item.id === data.equipmentTypeId)
      if (item) {
        foundItem = { ...item, typeName: type.name, typeId: type.id }
        break
      }
    }

    if (!foundItem) {
      return NextResponse.json(
        { error: "Type d'équipement non trouvé" },
        { status: 400 }
      )
    }

    // Lire l'inventaire actuel
    const inventory = await readEquipmentInventory()

    // Créer le nouvel équipement
    const newEquipment = {
      id: `EQUIP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      equipmentTypeId: data.equipmentTypeId,
      model: data.model || null,
      serialNumber: data.serialNumber || null,
      quantity: data.quantity || 1,
      minQuantity: data.minQuantity || 1,
      volume: data.volume || null,
      location: data.location || null,
      room: data.room || null,
      notes: data.notes || null,
      purchaseDate: data.purchaseDate || null,
      status: 'AVAILABLE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Ajouter à l'inventaire
    inventory.equipment.push(newEquipment)
    
    // Recalculer les stats
    inventory.stats = calculateStats(inventory.equipment)

    // Sauvegarder
    await writeEquipmentInventory(inventory)

    return NextResponse.json({ 
      materiel: {
        ...newEquipment,
        typeName: foundItem.typeName,
        itemName: foundItem.name,
        svg: foundItem.svg
      }
    })
  } catch (error) {
    console.error("Erreur lors de la création de l'équipement:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'équipement" },
      { status: 500 }
    )
  }
},
  {
    module: 'EQUIPMENT',
    entity: 'equipment',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.materiel?.id,
    customDetails: (req, response) => ({
      equipmentName: response?.materiel?.name,
      type: response?.materiel?.typeName,
      quantity: response?.materiel?.quantity
    })
  }
);


// PUT - Mettre à jour un équipement
export const PUT = withAudit(
  async (request: NextRequest) => {
  try {
    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json(
        { error: "ID requis pour la mise à jour" },
        { status: 400 }
      )
    }

    // Lire l'inventaire actuel
    const inventory = await readEquipmentInventory()

    // Trouver l'équipement à mettre à jour
    const equipmentIndex = inventory.equipment.findIndex((eq: any) => eq.id === id)
    
    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      )
    }

    // Mettre à jour l'équipement
    inventory.equipment[equipmentIndex] = {
      ...inventory.equipment[equipmentIndex],
      ...updateData,
      quantity: updateData.quantity !== undefined ? parseInt(updateData.quantity) : inventory.equipment[equipmentIndex].quantity,
      updatedAt: new Date().toISOString()
    }

    // Recalculer les stats
    inventory.stats = calculateStats(inventory.equipment)

    // Sauvegarder
    await writeEquipmentInventory(inventory)

    return NextResponse.json({ 
      materiel: inventory.equipment[equipmentIndex]
    })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'équipement:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'équipement" },
      { status: 500 }
    )
  }
},
  {
    module: 'EQUIPMENT',
    entity: 'equipment',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.materiel?.id,
    customDetails: (req, response) => ({
      equipmentName: response?.materiel?.name,
      quantity: response?.materiel?.quantity
    })
  }
);


// DELETE - Supprimer un équipement
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID requis pour la suppression" },
        { status: 400 }
      );
    }

    const inventory = await readEquipmentInventory();
    const equipmentIndex = inventory.equipment.findIndex((eq: any) => eq.id === id);
    
    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    // Stocker les infos avant suppression
    const deletedEquipment = inventory.equipment[equipmentIndex];
    
    inventory.equipment.splice(equipmentIndex, 1);
    inventory.stats = calculateStats(inventory.equipment);
    await writeEquipmentInventory(inventory);

    return NextResponse.json({ 
      message: "Équipement supprimé avec succès",
      deletedEquipment: { id: deletedEquipment.id, name: deletedEquipment.name }
    });
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedEquipment?.id,
    customDetails: (req, response) => ({
      equipmentName: response?.deletedEquipment?.name
    })
  }
)



