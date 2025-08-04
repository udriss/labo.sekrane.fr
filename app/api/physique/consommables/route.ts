// app/api/physique/consommables/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer tous les consommables physiques
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
          pc.*,
          pct.name as typeName,
          pct.name as categoryName,
          pct.color as type_color,
          pci.name as item_name,
          pci.description as item_description,
          pci.is_custom as itemIsCustom,
          s.name as supplier_name
        FROM physics_consumables pc
        LEFT JOIN physics_consumable_types pct ON pc.physics_consumable_type_id = pct.id
        LEFT JOIN physics_consumable_items pci ON pc.physics_consumable_item_id = pci.id
        LEFT JOIN suppliers s ON pc.supplierId = s.id
        WHERE 1=1
      `;

      const params: any[] = [];

      if (type) {
        query += ' AND pc.physics_consumable_type_id = ?';
        params.push(type);
      }

      if (status) {
        query += ' AND pc.status = ?';
        params.push(status);
      }

      if (room) {
        query += ' AND pc.room = ?';
        params.push(room);
      }

      if (search) {
        query += ' AND (pc.name LIKE ? OR pc.model LIKE ? OR pc.brand LIKE ?)';
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      query += ' ORDER BY pc.name ASC';

      const [rows] = await connection.execute(query, params);

      // Traiter les résultats pour ajouter isCustom et requestedQuantity
      const processedRows = (rows as any[]).map(row => ({
        ...row,
        isCustom: row.isCustom || row.itemIsCustom || false,
        requestedQuantity: row.requestedQuantity || null
      }));

      // Statistiques
      const [statsRows] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'IN_STOCK' THEN 1 ELSE 0 END) as inStock,
          SUM(CASE WHEN status = 'LOW_STOCK' THEN 1 ELSE 0 END) as lowStock,
          SUM(CASE WHEN status = 'OUT_OF_STOCK' THEN 1 ELSE 0 END) as outOfStock,
          SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as expired
        FROM physics_consumables
      `);

      
      
      return NextResponse.json({
        consumables: processedRows,
        stats: (statsRows as any[])[0],
        total: processedRows.length
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des consommables physiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des consommables physiques" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau consommable physique
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      name,
      physics_consumable_type_id,
      physics_consumable_item_id,
      quantity,
      unit,
      brand,
      model,
      specifications,
      purchaseDate,
      expirationDate,
      room,
      location,
      supplierId,
      batchNumber,
      orderReference,
      notes
    } = data;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Le nom du consommable est requis" },
        { status: 400 }
      );
    }

    return withConnection(async (connection) => {
      // Générer un ID unique
      const consumableId = `PHYS_CONS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Convertir les dates
      let formattedPurchaseDate = null;
      let formattedExpirationDate = null;

      if (purchaseDate) {
        formattedPurchaseDate = new Date(purchaseDate).toISOString().split('T')[0];
      }

      if (expirationDate) {
        formattedExpirationDate = new Date(expirationDate).toISOString().split('T')[0];
      }

      // Déterminer le statut automatiquement
      let status = 'IN_STOCK';
      if (quantity <= 0) {
        status = 'OUT_OF_STOCK';
      } else if (expirationDate && new Date(expirationDate) < new Date()) {
        status = 'EXPIRED';
      }

      // Insérer le consommable
      await connection.execute(`
        INSERT INTO physics_consumables (
          id, name, physics_consumable_type_id, physics_consumable_item_id,
          quantity, unit, brand, model, specifications, purchaseDate, expirationDate,
          room, location, status, supplierId, batchNumber, orderReference, notes,
          createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        consumableId,
        name.trim(),
        physics_consumable_type_id || null,
        physics_consumable_item_id || null,
        quantity || 0,
        unit || 'pieces',
        brand?.trim() || null,
        model?.trim() || null,
        specifications?.trim() || null,
        formattedPurchaseDate,
        formattedExpirationDate,
        room?.trim() || null,
        location?.trim() || null,
        status,
        supplierId || null,
        batchNumber?.trim() || null,
        orderReference?.trim() || null,
        notes?.trim() || null
      ]);

      // Récupérer le consommable créé avec ses relations
      const [newRows] = await connection.execute(`
        SELECT 
          pc.*,
          pct.name as typeName,
          pct.color as type_color,
          pci.name as item_name,
          s.name as supplier_name
        FROM physics_consumables pc
        LEFT JOIN physics_consumable_types pct ON pc.physics_consumable_type_id = pct.id
        LEFT JOIN physics_consumable_items pci ON pc.physics_consumable_item_id = pci.id
        LEFT JOIN suppliers s ON pc.supplierId = s.id
        WHERE pc.id = ?
      `, [consumableId]);

      return NextResponse.json({
        consumable: (newRows as any[])[0],
        message: "Consommable physique créé avec succès"
      });
    });
  } catch (error) {
    console.error("Erreur lors de la création du consommable physique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du consommable physique" },
      { status: 500 }
    );
  }
}
