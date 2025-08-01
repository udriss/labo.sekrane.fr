import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer tous les équipements physiques
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const room = searchParams.get('room');
    const search = searchParams.get('search');

    return withConnection(async (connection) => {
      let query = `
        SELECT 
          pe.*,
          pet.name as type_name,
          pet.color as type_color,
          pet.svg as type_svg,
          pei.name as item_name,
          pei.description as item_description,
          pei.svg as item_svg
        FROM physics_equipment pe
        LEFT JOIN physics_equipment_types pet ON pe.physics_equipment_type_id = pet.id
        LEFT JOIN physics_equipment_items pei ON pe.physics_equipment_item_id = pei.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (type) {
        query += ' AND pe.physics_equipment_type_id = ?';
        params.push(type);
      }

      if (status) {
        query += ' AND pe.status = ?';
        params.push(status);
      }

      if (room) {
        query += ' AND pe.room = ?';
        params.push(room);
      }

      if (search) {
        query += ' AND (pe.name LIKE ? OR pe.model LIKE ? OR pe.serial_number LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY pe.name ASC';

      const [rows] = await connection.execute(query, params);

      // Statistiques
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
          SUM(CASE WHEN status = 'IN_USE' THEN 1 ELSE 0 END) as inUse,
          SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance,
          SUM(CASE WHEN status = 'OUT_OF_ORDER' THEN 1 ELSE 0 END) as outOfOrder,
          SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved
        FROM physics_equipment
      `);

      return NextResponse.json({
        equipment: rows,
        stats: (statsRows as any[])[0],
        total: (rows as any[]).length
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements physiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des équipements physiques" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel équipement physique
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      name,
      physics_equipment_type_id,
      physics_equipment_item_id,
      model,
      serial_number,
      barcode,
      quantity,
      min_quantity,
      volume,
      location,
      room,
      purchase_date,
      notes
    } = data;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Le nom de l'équipement est requis" },
        { status: 400 }
      );
    }

    return withConnection(async (connection) => {
      // Générer un ID unique
      const equipmentId = `PHYS_EQUIP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Convertir la date d'achat
      let formattedPurchaseDate = null;
      if (purchase_date) {
        formattedPurchaseDate = new Date(purchase_date).toISOString().split('T')[0];
      }

      // Vérifier si le code-barres existe déjà
      if (barcode) {
        const [existingRows] = await connection.execute(
          'SELECT id FROM physics_equipment WHERE barcode = ?',
          [barcode]
        );

        if ((existingRows as any[]).length > 0) {
          return NextResponse.json(
            { error: "Ce code-barres existe déjà" },
            { status: 400 }
          );
        }
      }

      // Insérer l'équipement
      await connection.execute(`
        INSERT INTO physics_equipment (
          id, name, physics_equipment_type_id, physics_equipment_item_id,
          model, serial_number, barcode, quantity, min_quantity, volume,
          location, room, status, purchase_date, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        equipmentId,
        name.trim(),
        physics_equipment_type_id || null,
        physics_equipment_item_id || null,
        model?.trim() || null,
        serial_number?.trim() || null,
        barcode?.trim() || null,
        quantity || 1,
        min_quantity || 1,
        volume?.trim() || null,
        location?.trim() || null,
        room?.trim() || null,
        'AVAILABLE', // Statut par défaut
        formattedPurchaseDate,
        notes?.trim() || null
      ]);

      // Récupérer l'équipement créé avec ses relations
      const [newRows] = await connection.execute(`
        SELECT 
          pe.*,
          pet.name as type_name,
          pet.color as type_color,
          pet.svg as type_svg,
          pei.name as item_name,
          pei.svg as item_svg
        FROM physics_equipment pe
        LEFT JOIN physics_equipment_types pet ON pe.physics_equipment_type_id = pet.id
        LEFT JOIN physics_equipment_items pei ON pe.physics_equipment_item_id = pei.id
        WHERE pe.id = ?
      `, [equipmentId]);

      return NextResponse.json({
        equipment: (newRows as any[])[0],
        message: "Équipement physique créé avec succès"
      });
    });
  } catch (error) {
    console.error("Erreur lors de la création de l'équipement physique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'équipement physique" },
      { status: 500 }
    );
  }
}
