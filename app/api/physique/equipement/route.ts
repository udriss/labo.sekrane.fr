// app/api/physique/equipement/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server"
import { withConnection } from '@/lib/db';

// GET - Récupérer l'équipement de physique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const room = searchParams.get('room')

    return withConnection(async (connection) => {
      let query = `
        SELECT 
          pe.id,
          pe.name,
          pe.model,
          pe.serial_number,
          pe.barcode,
          pe.quantity,
          pe.min_quantity,
          pe.volume,
          pe.location,
          pe.room,
          pe.status,
          pe.purchase_date,
          pe.notes,
          pe.created_at,
          pe.updated_at,
          pet.name as type,
          pei.name as item_name,
          pei.description as item_description
        FROM physics_equipment pe
        LEFT JOIN physics_equipment_types pet ON pe.physics_equipment_type_id = pet.id
        LEFT JOIN physics_equipment_items pei ON pe.physics_equipment_item_id = pei.id
        WHERE 1=1
      `;
      
      const queryParams: any[] = [];

      if (search) {
        query += ` AND (pe.name LIKE ? OR pe.model LIKE ? OR pe.location LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }

      if (status) {
        query += ` AND pe.status = ?`;
        queryParams.push(status);
      }

      if (room) {
        query += ` AND pe.room = ?`;
        queryParams.push(room);
      }

      query += ` ORDER BY pe.name ASC`;

      const [rows] = await connection.execute(query, queryParams);
      
      // Transformer les données pour correspondre au format attendu
      const equipment = (rows as any[]).map(row => ({
        id: row.id,
        name: row.name,
        itemName: row.item_name || row.name,
        type: row.type,
        model: row.model,
        serialNumber: row.serial_number,
        barcode: row.barcode,
        quantity: row.quantity,
        minQuantity: row.min_quantity,
        volume: row.volume,
        location: row.location,
        room: row.room,
        status: row.status,
        purchaseDate: row.purchase_date,
        notes: row.notes,
        description: row.item_description,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return NextResponse.json(equipment);
    });
  } catch (error) {
    console.error('🔧 [GET] /api/physique/equipement - Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'équipement de physique' },
      { status: 500 }
    );
  }
}
