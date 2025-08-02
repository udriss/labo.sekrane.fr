// app/api/chimie/chemicals/update-forecast/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { chemicals } = await request.json()
    
    // Traiter chaque chemical pour mettre à jour sa quantité prévisionnelle
    for (const requestedChemical of chemicals) {
      const { id, requestedQuantity } = requestedChemical;
      
      if (!id || requestedQuantity === undefined) {
        continue; // Ignorer les entrées invalides
      }

      // Récupérer le chemical actuel
      const currentChemicals = await query(
        'SELECT quantity, quantityPrevision FROM chemicals WHERE id = ?',
        [id]
      );

      if (currentChemicals.length === 0) {
        continue; // Chemical non trouvé, passer au suivant
      }

      const currentChemical = currentChemicals[0];
      
      // Calculer la nouvelle quantité prévisionnelle
      let newQuantityPrevision;
      if (currentChemical.quantityPrevision === null || currentChemical.quantityPrevision === undefined) {
        // Si quantityPrevision n'existe pas, l'initialiser avec la quantité actuelle moins la quantité demandée
        newQuantityPrevision = currentChemical.quantity - requestedQuantity;
      } else {
        // Sinon, soustraire la nouvelle quantité demandée
        newQuantityPrevision = currentChemical.quantityPrevision - requestedQuantity;
      }
      
      // S'assurer que la quantité prévisionnelle ne soit pas négative
      newQuantityPrevision = Math.max(0, newQuantityPrevision);

      // Mettre à jour la quantité prévisionnelle dans la base de données
      await query(
        'UPDATE chemicals SET quantityPrevision = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantityPrevision, id]
      );
    }
    
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