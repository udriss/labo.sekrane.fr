// app/api/chemicals/update-forecast/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const CHEMICALS_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json')

export async function POST(request: NextRequest) {
  try {
    const { chemicals } = await request.json()
    
    // Lire le fichier actuel
    const fileContent = await fs.readFile(CHEMICALS_FILE, 'utf-8')
    const inventoryData = JSON.parse(fileContent)
    
    // Mettre à jour les quantités prévisionnelles
    chemicals.forEach((requestedChemical: any) => {
      const inventoryChemical = inventoryData.chemicals.find(
        (c: any) => c.id === requestedChemical.id
      )
      
      if (inventoryChemical) {
        // Si quantityPrevision n'existe pas, l'initialiser
        if (inventoryChemical.quantityPrevision === undefined || inventoryChemical.quantityPrevision === null) {
          inventoryChemical.quantityPrevision = inventoryChemical.quantity - (requestedChemical.requestedQuantity || 0)
        } else {
          // Sinon, soustraire la nouvelle quantité demandée
          inventoryChemical.quantityPrevision -= (requestedChemical.requestedQuantity || 0)
        }
        
        // S'assurer que la quantité prévisionnelle ne soit pas négative
        inventoryChemical.quantityPrevision = Math.max(0, inventoryChemical.quantityPrevision)
      }
    })
    
    // Sauvegarder le fichier mis à jour
    await fs.writeFile(CHEMICALS_FILE, JSON.stringify(inventoryData, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Quantités prévisionnelles mises à jour' 
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des quantités prévisionnelles:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour' },
      { status: 500 }
    )
  }
}