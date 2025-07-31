// app/api/chemicals/[id]/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { query } from '@/lib/db'
import { withAudit } from '@/lib/api/with-audit';

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

export const GET = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const chemicalId = id;

    // Récupérer le chemical depuis la base de données
    const chemicals = await query<Chemical[]>(
      `SELECT c.*, s.name as supplierName 
       FROM chemicals c 
       LEFT JOIN suppliers s ON c.supplierId = s.id 
       WHERE c.id = ?`,
      [chemicalId]
    );

    if (chemicals.length === 0) {
      return NextResponse.json(
        { error: "Réactif chimique non trouvé" },
        { status: 404 }
      );
    }

    const chemical = chemicals[0];
    
    // Ajouter la relation supplier pour compatibilité
    const chemicalWithSupplier = {
      ...chemical,
      supplier: chemical.supplierId ? { name: (chemical as any).supplierName } : null
    };

    return NextResponse.json(chemicalWithSupplier);
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'READ',
    extractEntityIdFromResponse: (response) => response?._auditId || response?.id
  }
)

// PUT - Envelopper car c'est une modification sensible
export const PUT = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const data = await request.json();
    const { id } = await params;
    const chemicalId = id;

    // Vérifier que le chemical existe et récupérer l'état avant modification
    const existingChemicals = await query<Chemical[]>(
      'SELECT * FROM chemicals WHERE id = ?',
      [chemicalId]
    );
    
    if (existingChemicals.length === 0) {
      return NextResponse.json({ error: "Chemical not found" }, { status: 404 });
    }

    const beforeState = existingChemicals[0];

    // Construire la requête de mise à jour dynamiquement
    const updateFields: string[] = []
    const updateParams: any[] = []
    
    Object.entries(data).forEach(([key, value]) => {
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
      updateParams.push(chemicalId)
      
      const updateSql = `UPDATE chemicals SET ${updateFields.join(', ')} WHERE id = ?`
      await query(updateSql, updateParams)
    }

    // Récupérer le chemical mis à jour avec les relations
    const updatedChemicals = await query<Chemical[]>(
      `SELECT c.*, s.name as supplierName 
       FROM chemicals c 
       LEFT JOIN suppliers s ON c.supplierId = s.id 
       WHERE c.id = ?`,
      [chemicalId]
    );

    const updatedChemical = {
      ...updatedChemicals[0],
      supplier: updatedChemicals[0].supplierId ? { name: (updatedChemicals[0] as any).supplierName } : null
    };

    return NextResponse.json({
      message: "Chemical updated successfully",
      chemical: updatedChemical,
      _audit: {
        before: beforeState,
        updateData: data
      }
    });
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.chemical?.id,
    customDetails: (req, response) => {
      const beforeState = response?._audit?.before;
      const updateData = response?._audit?.updateData;
      
      return {
        chemicalName: response?.chemical?.name,
        quantityUpdate: updateData?.quantity !== undefined && Object.keys(updateData).length === 1,
        before: beforeState,
        after: response?.chemical,
        fields: Object.keys(updateData || {}),
        quantity: response?.chemical?.quantity,
        unit: response?.chemical?.unit
      }
    }
  }
)

// DELETE - Envelopper car c'est une suppression sensible
export const DELETE = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const chemicalId = id;

    // Vérifier que le chemical existe et récupérer ses informations avant suppression
    const existingChemicals = await query<Chemical[]>(
      'SELECT * FROM chemicals WHERE id = ?',
      [chemicalId]
    );
    
    if (existingChemicals.length === 0) {
      return NextResponse.json({ error: "Chemical not found" }, { status: 404 });
    }

    const deletedChemical = existingChemicals[0];

    // Supprimer le chemical de la base de données
    await query('DELETE FROM chemicals WHERE id = ?', [chemicalId]);

    return NextResponse.json({ 
      message: "Réactif chimique supprimé avec succès",
      deletedChemical: { id: deletedChemical.id, name: deletedChemical.name }
    });
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedChemical?.id,
    customDetails: (req, response) => ({
      chemicalName: response?.deletedChemical?.name
    })
  }
)
