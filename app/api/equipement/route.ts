// app/api/equipement/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server"
import { withConnection } from '@/lib/db';
import { withAudit } from '@/lib/api/with-audit';
import type { EquipmentWithRelations, EquipmentStats, EquipmentFormData } from '@/types/equipment-mysql';

// Fonction pour calculer les statistiques des équipements
async function calculateEquipmentStats(): Promise<EquipmentStats> {
  return withConnection(async (connection) => {
    // Total des équipements
    const [totalResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM equipment'
    );
    const total = (totalResult as any)[0].total;

    // Statistiques par statut
    const [statusResults] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count 
      FROM equipment 
      GROUP BY status
    `);

    const by_status = {
      available: 0,
      in_use: 0,
      maintenance: 0,
      broken: 0,
      retired: 0
    };

    (statusResults as any[]).forEach(row => {
      switch (row.status) {
        case 'AVAILABLE':
          by_status.available = row.count;
          break;
        case 'IN_USE':
          by_status.in_use = row.count;
          break;
        case 'MAINTENANCE':
          by_status.maintenance = row.count;
          break;
        case 'BROKEN':
          by_status.broken = row.count;
          break;
        case 'RETIRED':
          by_status.retired = row.count;
          break;
      }
    });

    // Statistiques par type
    const [typeResults] = await connection.execute(`
      SELECT 
        et.name as type_name,
        COUNT(e.id) as count
      FROM equipment e
      JOIN equipment_types et ON e.equipment_type_id = et.id
      GROUP BY et.id, et.name
      ORDER BY count DESC
    `);

    const by_type = (typeResults as any[]).map(row => ({
      type_name: row.type_name,
      count: row.count
    }));

    // Équipements en stock faible
    const [lowStockResults] = await connection.execute(`
      SELECT 
        id,
        name,
        quantity,
        min_quantity
      FROM equipment 
      WHERE min_quantity IS NOT NULL 
        AND quantity <= min_quantity
        AND status = 'AVAILABLE'
      ORDER BY (quantity - min_quantity) ASC
      LIMIT 10
    `);

    const low_stock = (lowStockResults as any[]).map(row => ({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      min_quantity: row.min_quantity
    }));

    return {
      total,
      by_status,
      by_type,
      low_stock
    };
  });
}

// GET - Récupérer tous les équipements
export const GET = withAudit(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const status = searchParams.get('status');
      const type_id = searchParams.get('type_id');
      const room = searchParams.get('room');

      return withConnection(async (connection) => {
        let query = `
          SELECT 
            e.*,
            et.name as type_name,
            et.svg as type_svg,
            ei.name as item_name,
            ei.svg as item_svg,
            ei.volumes as item_volumes
        FROM equipment e
        LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
        LEFT JOIN equipment_items ei ON e.equipment_item_id = ei.id
        WHERE 1=1
      `;
      const params: any[] = [];

      // Filtres
      if (search) {
        query += ` AND (e.name LIKE ? OR e.serial_number LIKE ? OR e.barcode LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (status) {
        query += ` AND e.status = ?`;
        params.push(status);
      }

      if (type_id) {
        query += ` AND e.equipment_type_id = ?`;
        params.push(type_id);
      }

      if (room) {
        query += ` AND e.room LIKE ?`;
        params.push(`%${room}%`);
      }

      query += ` ORDER BY e.created_at DESC`;

      const [rows] = await connection.execute(query, params);
      const equipment = rows as EquipmentWithRelations[];

      // Calculer les statistiques
      const stats = await calculateEquipmentStats();

      return NextResponse.json({
        materiel: equipment.map(eq => ({
          ...eq,
          // Compatibilité avec l'ancien format
          typeName: eq.type_name,
          itemName: eq.item_name,
          svg: eq.item_svg || eq.type_svg,
          availableVolumes: eq.item_volumes ? JSON.parse(eq.item_volumes) : null,
          equipmentTypeId: eq.equipment_type_id // Compatibilité
        })),
        total: stats.total,
        available: stats.by_status.available,
        maintenance: stats.by_status.maintenance,
        stats
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des équipements" },
      { status: 500 }
    );
  }
},
{
  module: 'EQUIPMENT',
  entity: 'equipment',
  action: 'READ',
  extractEntityIdFromResponse: (response) => undefined // Pas d'ID spécifique pour la liste
}
);

// POST - Ajouter un nouvel équipement
export const POST = withAudit(
  async (request: NextRequest) => {
    try {
      const data: EquipmentFormData = await request.json();
      
      // Validation des données requises
      if (!data.name || !data.equipment_type_id) {
        return NextResponse.json(
          { error: "Le nom et l'ID du type d'équipement sont requis" },
          { status: 400 }
        );
      }

      return withConnection(async (connection) => {
        // Vérifier que le type d'équipement existe
        const [typeRows] = await connection.execute(
          'SELECT id, name FROM equipment_types WHERE id = ?',
          [data.equipment_type_id]
        );

        if ((typeRows as any[]).length === 0) {
          return NextResponse.json(
            { error: "Type d'équipement non trouvé" },
            { status: 400 }
          );
        }

        // Si equipment_item_id est fourni, vérifier qu'il existe
        if (data.equipment_item_id) {
          const [itemRows] = await connection.execute(
            'SELECT id FROM equipment_items WHERE id = ? AND equipment_type_id = ?',
            [data.equipment_item_id, data.equipment_type_id]
          );

          if ((itemRows as any[]).length === 0) {
            return NextResponse.json(
              { error: "Item d'équipement non trouvé ou incompatible avec le type" },
              { status: 400 }
            );
          }
        }

        // Générer un ID unique
        const equipmentId = `EQUIP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Convertir la date d'achat
        let purchaseDate = null;
        if (data.purchase_date) {
          try {
            purchaseDate = new Date(data.purchase_date).toISOString().split('T')[0];
          } catch (e) {
            console.warn('Date d\'achat invalide:', data.purchase_date);
          }
        }

        // Insérer le nouvel équipement
        await connection.execute(`
          INSERT INTO equipment (
            id, name, equipment_type_id, equipment_item_id, model, serial_number,
            barcode, quantity, min_quantity, volume, location, room, status,
            purchase_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          equipmentId,
          data.name,
          data.equipment_type_id,
          data.equipment_item_id || null,
          data.model || null,
          data.serial_number || null,
          data.barcode || null,
          data.quantity || 1,
          data.min_quantity || null,
          data.volume || null,
          data.location || null,
          data.room || null,
          data.status || 'AVAILABLE',
          purchaseDate,
          data.notes || null
        ]);

        // Récupérer l'équipement créé avec ses relations
        const [newEquipmentRows] = await connection.execute(`
          SELECT 
            e.*,
            et.name as type_name,
            et.svg as type_svg,
            ei.name as item_name,
            ei.svg as item_svg
          FROM equipment e
          LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
          LEFT JOIN equipment_items ei ON e.equipment_item_id = ei.id
          WHERE e.id = ?
        `, [equipmentId]);

        const newEquipment = (newEquipmentRows as any[])[0];

        return NextResponse.json({
          materiel: {
            ...newEquipment,
            // Compatibilité avec l'ancien format
            typeName: newEquipment.type_name,
            itemName: newEquipment.item_name,
            svg: newEquipment.item_svg || newEquipment.type_svg,
            equipmentTypeId: newEquipment.equipment_type_id
          }
        });
      });
    } catch (error) {
      console.error("Erreur lors de la création de l'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'équipement" },
        { status: 500 }
      );
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