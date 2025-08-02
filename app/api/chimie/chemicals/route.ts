// app/api/chimie/chemicals/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withAudit } from '@/lib/api/with-audit'
import { c } from 'framer-motion/dist/types.d-Bq-Qm38R';

// Interface pour les chemicals
interface Chemical {
  id: string
  name: string
  formula?: string | null
  molfile?: string | null
  casNumber?: string | null
  barcode?: string | null
  quantity: number
  unit: string
  minQuantity?: number | null
  concentration?: number | null
  purity?: number | null
  purchaseDate?: string | null
  expirationDate?: string | null
  openedDate?: string | null
  storage?: string | null
  room?: string | null
  cabinet?: string | null
  shelf?: string | null
  hazardClass?: string | null
  sdsFileUrl?: string | null
  supplierId?: string | null
  batchNumber?: string | null
  orderReference?: string | null
  status: string
  notes?: string | null
  quantityPrevision?: number | null
  createdAt: string
  updatedAt: string
}

// Fonction pour calculer les statistiques
function calculateChemicalStats(chemicals: Chemical[]) {
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  
  return {
    total: chemicals.length,
    inStock: chemicals.filter((c: Chemical) => c.status === 'IN_STOCK').length,
    lowStock: chemicals.filter((c: Chemical) => c.status === 'LOW_STOCK').length,
    expired: chemicals.filter((c: Chemical) => c.status === 'EXPIRED').length,
    expiringSoon: chemicals.filter((c: Chemical) => {
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

    // Construire la requête SQL de base
    let sql = `
      SELECT c.*, s.name as supplierName 
      FROM chemicals c 
      LEFT JOIN suppliers s ON c.supplierId = s.id 
      WHERE 1=1
    `
    const params: any[] = []

    // Appliquer les filtres
    if (search) {
      sql += ` AND (c.name LIKE ? OR c.formula LIKE ? OR c.casNumber LIKE ?)`
      const searchPattern = `%${search}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (status && status !== 'ALL') {
      sql += ` AND c.status = ?`
      params.push(status)
    }

    if (hazardClass && hazardClass !== 'ALL') {
      sql += ` AND c.hazardClass = ?`
      params.push(hazardClass)
    }

    sql += ` ORDER BY c.name ASC`

    // Exécuter la requête
    const chemicals = await query<Chemical[]>(sql, params)

    // S'assurer que chaque chemical a une quantityPrevision
    const chemicalsWithPrevision = chemicals.map((chemical: Chemical) => ({
      ...chemical,
      // Si quantityPrevision n'existe pas, l'initialiser avec la quantité actuelle
      quantityPrevision: chemical.quantityPrevision !== undefined && chemical.quantityPrevision !== null
        ? chemical.quantityPrevision 
        : chemical.quantity,
      // Ajouter le nom du fournisseur pour compatibilité
      supplier: chemical.supplierId ? { name: (chemical as any).supplierName } : null
    }))

    // Calculer les statistiques
    const stats = calculateChemicalStats(chemicalsWithPrevision)
    
    
    return NextResponse.json({ 
      chemicals: chemicalsWithPrevision,
      stats
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des réactifs chimiques:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des réactifs chimiques' },
      { status: 500 }
    )
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
    const body = await request.json()
    
    // Générer un ID unique
    const newChemicalId = `CHEM_INV_${Array.from({ length: 12 }, () => Math.floor(Math.random() * 36).toString(36).toUpperCase()).join('')}`
    
    // Préparer les données pour l'insertion
    const insertSql = `
      INSERT INTO chemicals (
        id, name, formula, casNumber, quantity, unit, minQuantity, 
        concentration, purchaseDate, expirationDate, storage, room, 
        hazardClass, supplierId, status, quantityPrevision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    
    const params = [
      newChemicalId,
      body.name,
      body.formula || null,
      body.casNumber || null,
      parseFloat(body.quantity) || 0,
      body.unit || 'g',
      body.minQuantity ? parseFloat(body.minQuantity) : null,
      body.concentration ? parseFloat(body.concentration) : null,
      body.purchaseDate || null,
      body.expirationDate || null,
      body.storage || null,
      body.room || null,
      body.hazardClass || null,
      body.supplierId || null,
      body.status || 'IN_STOCK',
      parseFloat(body.quantity) || 0 // quantityPrevision initialisée avec la quantité
    ]
    
    await query(insertSql, params)
    
    // Récupérer le chemical créé avec les relations
    const createdChemical = await query<Chemical[]>(
      `SELECT c.*, s.name as supplierName 
       FROM chemicals c 
       LEFT JOIN suppliers s ON c.supplierId = s.id 
       WHERE c.id = ?`,
      [newChemicalId]
    )
    
    return NextResponse.json(createdChemical[0])
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

    // Vérifier que le chemical existe et récupérer l'état avant modification
    const existingChemical = await query<Chemical[]>(
      'SELECT * FROM chemicals WHERE id = ?',
      [id]
    )
    
    if (existingChemical.length === 0) {
      return NextResponse.json({ error: 'Réactif chimique non trouvé' }, { status: 404 })
    }

    const beforeState = existingChemical[0];

    // Traitement spécial pour la mise à jour de quantité uniquement
    if (updateData.quantity !== undefined && Object.keys(updateData).length === 1) {
      const newQuantity = parseFloat(updateData.quantity)
      const newStatus = newQuantity === 0 ? 'EMPTY' : 
                       newQuantity < 10 ? 'LOW_STOCK' : 'IN_STOCK'
      
      await query(
        'UPDATE chemicals SET quantity = ?, status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, newStatus, id]
      )
    } else {
      // Mise à jour complète - construire dynamiquement la requête
      const updateFields: string[] = []
      const updateParams: any[] = []
      
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'id') {
          updateFields.push(`${key} = ?`)
          if (key === 'quantity' || key === 'concentration' || key === 'minQuantity') {
            updateParams.push(value ? parseFloat(value as string) : null)
          } else {
            updateParams.push(value)
          }
        }
      })
      
      if (updateFields.length > 0) {
        updateFields.push('updatedAt = CURRENT_TIMESTAMP')
        updateParams.push(id)
        
        const updateSql = `UPDATE chemicals SET ${updateFields.join(', ')} WHERE id = ?`
        await query(updateSql, updateParams)
      }
    }

    // Récupérer le chemical mis à jour avec les relations
    const updatedChemical = await query<Chemical[]>(
      `SELECT c.*, s.name as supplierName 
       FROM chemicals c 
       LEFT JOIN suppliers s ON c.supplierId = s.id 
       WHERE c.id = ?`,
      [id]
    )
    
    return NextResponse.json({
      ...updatedChemical[0],
      _audit: {
        before: beforeState,
        updateData
      }
    })
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => {
      const beforeState = response?._audit?.before;
      const updateData = response?._audit?.updateData;
      
      return {
        chemicalName: response?.name,
        quantityUpdate: updateData?.quantity !== undefined && Object.keys(updateData).length === 1,
        before: beforeState,
        after: response,
        fields: Object.keys(updateData || {}),
        quantity: response?.quantity,
        unit: response?.unit
      }
    }
  }
)
