// app/api/chemicals/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { withAudit } from '@/lib/api/with-audit'

const CHEMICALS_INVENTORY_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json')

// Fonction pour lire l'inventaire des produits chimiques
async function readChemicalsInventory() {
  try {
    const data = await fs.readFile(CHEMICALS_INVENTORY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Erreur lecture inventaire chemicals:', error)
    return { chemicals: [], stats: { total: 0, inStock: 0, lowStock: 0, expired: 0, expiringSoon: 0 } }
  }
}

// Fonction pour écrire l'inventaire des produits chimiques
async function writeChemicalsInventory(data: any) {
  try {
    await fs.writeFile(CHEMICALS_INVENTORY_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Erreur écriture inventaire chemicals:', error)
    throw error
  }
}

// Fonction pour calculer les statistiques
function calculateChemicalStats(chemicals: any[]) {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  return {
    total: chemicals.length,
    inStock: chemicals.filter((c: any) => c.status === 'IN_STOCK').length,
    lowStock: chemicals.filter((c: any) => c.status === 'LOW_STOCK').length,
    expired: chemicals.filter((c: any) => c.status === 'EXPIRED').length,
    expiringSoon: chemicals.filter((c: any) => {
      if (!c.expirationDate) return false
      return new Date(c.expirationDate) <= thirtyDaysFromNow && c.status === 'IN_STOCK'
    }).length
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const hazardClass = searchParams.get('hazardClass')

    // Lire l'inventaire depuis le fichier JSON
    const inventory = await readChemicalsInventory()
    let chemicals = inventory.chemicals

    // Appliquer les filtres
    if (search) {
      const searchLower = search.toLowerCase()
      chemicals = chemicals.filter((c: any) => 
        c.name?.toLowerCase().includes(searchLower) ||
        c.formula?.toLowerCase().includes(searchLower) ||
        c.casNumber?.toLowerCase().includes(searchLower)
      )
    }

    if (status && status !== 'ALL') {
      chemicals = chemicals.filter((c: any) => c.status === status)
    }

    if (hazardClass && hazardClass !== 'ALL') {
      chemicals = chemicals.filter((c: any) => c.hazardClass === hazardClass)
    }

    // Recalculer les statistiques
    const stats = calculateChemicalStats(inventory.chemicals)

    return NextResponse.json({ 
      chemicals,
      stats
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des produits chimiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des produits chimiques' },
      { status: 500 }
    )
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    
    // Lire l'inventaire actuel
    const inventory = await readChemicalsInventory()
    
    // Créer le nouveau produit chimique
    const newChemical = {
      id: `CHEM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      formula: body.formula || null,
      molfile: null,
      casNumber: body.casNumber || null,
      barcode: null,
      quantity: parseFloat(body.quantity) || 0,
      unit: body.unit || 'g',
      minQuantity: body.minQuantity ? parseFloat(body.minQuantity) : null,
      concentration: body.concentration ? parseFloat(body.concentration) : null,
      purity: null,
      purchaseDate: body.purchaseDate || null,
      expirationDate: body.expirationDate || null,
      openedDate: null,
      storage: body.storage || '',
      room: body.room || null,
      cabinet: null,
      shelf: null,
      hazardClass: body.hazardClass || null,
      sdsFileUrl: null,
      supplierId: body.supplierId || null,
      batchNumber: null,
      orderReference: null,
      status: body.status || 'IN_STOCK',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      supplier: null
    }
    
    // Ajouter à l'inventaire
    inventory.chemicals.push(newChemical)
    
    // Recalculer les stats
    inventory.stats = calculateChemicalStats(inventory.chemicals)
    
    // Sauvegarder
    await writeChemicalsInventory(inventory)
    
    return NextResponse.json(newChemical)
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      chemicalName: response?.name,
      hazardClass: response?.hazardClass,
      quantity: response?.quantity,
      unit: response?.unit
    })
  }
)

// PUT - Envelopper car c'est une modification
export const PUT = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID requis pour la mise à jour' }, { status: 400 })
    }

    // Lire l'inventaire actuel
    const inventory = await readChemicalsInventory()

    // Trouver le produit chimique à mettre à jour
    const chemicalIndex = inventory.chemicals.findIndex((c: any) => c.id === id)
    
    if (chemicalIndex === -1) {
      return NextResponse.json({ error: 'Produit chimique non trouvé' }, { status: 404 })
    }

    // Stocker l'ancien état pour l'audit
    const oldChemical = { ...inventory.chemicals[chemicalIndex] };

    // Traitement spécial pour la mise à jour de quantité uniquement
    if (updateData.quantity !== undefined && Object.keys(updateData).length === 1) {
      const newQuantity = parseFloat(updateData.quantity)
      inventory.chemicals[chemicalIndex].quantity = newQuantity
      inventory.chemicals[chemicalIndex].status = newQuantity === 0 ? 'EMPTY' : 
                                                   newQuantity < 10 ? 'LOW_STOCK' : 'IN_STOCK'
      inventory.chemicals[chemicalIndex].updatedAt = new Date().toISOString()
    } else {
      // Mise à jour complète
      inventory.chemicals[chemicalIndex] = {
        ...inventory.chemicals[chemicalIndex],
        ...updateData,
        quantity: updateData.quantity ? parseFloat(updateData.quantity) : inventory.chemicals[chemicalIndex].quantity,
        concentration: updateData.concentration ? parseFloat(updateData.concentration) : inventory.chemicals[chemicalIndex].concentration,
        updatedAt: new Date().toISOString()
      }
    }

    // Recalculer les stats
    inventory.stats = calculateChemicalStats(inventory.chemicals)

    // Sauvegarder
    await writeChemicalsInventory(inventory)
    
    return NextResponse.json(inventory.chemicals[chemicalIndex])
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      chemicalName: response?.name,
      quantityUpdate: response?.quantity !== undefined,
      fields: Object.keys(response || {})
    })
  }
)
