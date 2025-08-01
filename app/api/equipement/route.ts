// app/api/equipement/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server"
import { withConnection } from '@/lib/db';
import { withAudit } from '@/lib/api/with-audit';
import type { EquipmentWithRelations, EquipmentStats, EquipmentFormData } from '@/types/equipment-mysql';

// Fonction pour parser JSON de manière sécurisée
function safeJSONParse(jsonString: any, fallback: any = null) {
  if (!jsonString || jsonString === '' || jsonString === null || jsonString === undefined) {
    return fallback;
  }
  
  // Si c'est déjà un objet/array, le retourner tel quel
  if (typeof jsonString === 'object') {
    return jsonString || fallback;
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    return parsed || fallback;
  } catch (error) {
    console.warn(`🔧 [equipement] JSON parse error for value: "${jsonString}":`, error);
    return fallback;
  }
}

// Fonction pour calculer les statistiques des équipements
async function calculateEquipmentStats(): Promise<EquipmentStats> {
  return withConnection(async (connection) => {
    // Total des équipements
    const [totalResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM chimie_equipment'
    );
    const total = (totalResult as any)[0].total;

    // Statistiques par statut
    const [statusResults] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count 
      FROM chimie_equipment
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
      FROM chimie_equipment e
      JOIN chimie_equipment_types et ON e.equipment_type_id = et.id
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
      FROM chimie_equipment 
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
      minQuantity: row.min_quantity
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
export async function GET(request: NextRequest) {

    try {
      const { searchParams } = new URL(request.url);
      const search = searchParams.get('search');
      const status = searchParams.get('status');
      const type_id = searchParams.get('type_id');
      const room = searchParams.get('room');
      const discipline = searchParams.get('discipline'); // Nouveau paramètre

      return withConnection(async (connection) => {
        let query, params: any[] = [];

        // Si discipline=physique, utiliser la table physics_equipment
        if (discipline === 'physique') {
          query = `
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
              pet.name as type_name,
              pei.name as item_name,
              pei.description as item_description
            FROM physics_equipment pe
            LEFT JOIN physics_equipment_types pet ON pe.physics_equipment_type_id = pet.id
            LEFT JOIN physics_equipment_items pei ON pe.physics_equipment_item_id = pei.id
            WHERE 1=1
          `;
        } else {
          // Sinon, utiliser la table chimie_equipment par défaut
          query = `
            SELECT 
              e.*,
              et.name as type_name,
              et.svg as type_svg,
              ei.name as item_name,
              ei.svg as item_svg,
              ei.volumes as item_volumes
          FROM chimie_equipment e
          LEFT JOIN chimie_equipment_types et ON e.equipment_type_id = et.id
          LEFT JOIN chimie_equipment_items ei ON e.equipment_item_id = ei.id
          WHERE 1=1
        `;
        }

        // Filtres communs
        if (search) {
          if (discipline === 'physique') {
            query += ` AND (pe.name LIKE ? OR pe.model LIKE ? OR pe.location LIKE ?)`;
          } else {
            query += ` AND (e.name LIKE ? OR ei.name LIKE ?)`;
          }
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern);
          if (discipline === 'physique') {
            params.push(searchPattern); // Pour location aussi en physique
          }
        }

        if (status) {
          if (discipline === 'physique') {
            query += ` AND pe.status = ?`;
          } else {
            query += ` AND e.status = ?`;
          }
          params.push(status);
        }

        if (type_id && discipline !== 'physique') {
          query += ` AND e.equipment_type_id = ?`;
          params.push(type_id);
        }

        if (room) {
          if (discipline === 'physique') {
            query += ` AND pe.room = ?`;
          } else {
            query += ` AND e.room = ?`;
          }
          params.push(room);
        }

        if (discipline === 'physique') {
          query += ` ORDER BY pe.name ASC`;
        } else {
          query += ` ORDER BY e.name ASC`;
        }

        try {
          const [rows] = await connection.execute(query, params);
          
          if (discipline === 'physique') {
            // Format pour physique
            const equipment = (rows as any[]).map(row => ({
              id: row.id,
              name: row.name,
              itemName: row.item_name || row.name,
              type: row.type_name,
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
          } else {
            // Format pour chimie (existant)
            const equipment = (rows as any[]).map(row => {
              const volumes = safeJSONParse(row.item_volumes, []);
              
              return {
                id: row.id,
                name: row.name,
                itemName: row.item_name || row.name,
                type: row.type_name,
                typeSvg: row.type_svg,
                itemSvg: row.item_svg,
                availableVolumes: volumes,
                volume: row.volume,
                location: row.location,
                room: row.room,
                status: row.status,
                quantity: row.quantity,
                minQuantity: row.min_quantity,
                description: row.description,
                maintenanceHistory: safeJSONParse(row.maintenance_history, []),
                lastMaintenanceDate: row.last_maintenance_date,
                notes: row.notes,
                barcode: row.barcode,
                serialNumber: row.serial_number,
                manufacturer: row.manufacturer,
                model: row.model,
                purchaseDate: row.purchase_date,
                warrantyExpiry: row.warranty_expiry,
                value: row.value,
                createdAt: row.created_at,
                updatedAt: row.updated_at
              };
            });

            return NextResponse.json(equipment);
          }
        } catch (dbError: any) {
          // Si la table physics_equipment n'existe pas, retourner une liste vide pour physique
          if (discipline === 'physique' && dbError.code === 'ER_NO_SUCH_TABLE') {
            console.log('📋 Table physics_equipment non trouvée, retour de liste vide');
            return NextResponse.json([]);
          } else {
            throw dbError;
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des équipements:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des équipements" },
        { status: 500 }
      );
    }
}


// POST - Ajouter un nouvel équipement
export const POST = withAudit(
  async (request: NextRequest) => {
    try {
      const data: EquipmentFormData = await request.json();
      console.log('############################# POST /api/equipement - #############################', data);
      // Validation des données requises
      if (!data.name || !data.equipmentTypeId) {
        console.log('POST /api/equipement - Erreur de validation:', !data.name, !data.equipmentTypeId);
        return NextResponse.json(
          { error: "Le nom et l'ID du type d'équipement sont requis" },
          { status: 400 }
        );
      }

      return withConnection(async (connection) => {
        let equipmentTypeId: string;
        let equipmentItemId: string | null = null;

        // D'abord, vérifier si data.equipmentTypeId est un equipment_item_id
        const [itemCheck] = await connection.execute(
          'SELECT id, equipment_type_id FROM chimie_equipment_items WHERE id = ?',
          [data.equipmentTypeId]
        );

        if ((itemCheck as any[]).length > 0) {
          // C'est un equipment_item_id, récupérer le bon equipment_type_id
          const item = (itemCheck as any[])[0];
          equipmentTypeId = item.equipment_type_id;
          equipmentItemId = item.id;
          console.log(`🔧 [equipement] ID fourni est un equipment_item_id: ${item.id} -> equipment_type_id: ${equipmentTypeId}`);
        } else {
          // Vérifier si c'est un equipment_type_id direct
          const [typeRows] = await connection.execute(
            'SELECT id, name FROM chimie_equipment_types WHERE id = ?',
            [data.equipmentTypeId]
          );

          if ((typeRows as any[]).length === 0) {
            console.log(`❌ Ni type ni item d'équipement trouvé pour ID: ${data.equipmentTypeId}`);
            return NextResponse.json(
              { error: "Type ou item d'équipement non trouvé" },
              { status: 400 }
            );
          }

          equipmentTypeId = data.equipmentTypeId;
          // Si equipmentItemId est fourni séparément dans les données
          equipmentItemId = data.equipmentItemId || null;
          console.log(`🔧 [equipement] ID fourni est un equipmentTypeId: ${equipmentTypeId}, equipmentItemId: ${equipmentItemId}`);
        }

        // Validation supplémentaire : si equipmentItemId est fourni, s'assurer qu'il correspond au type
        if (equipmentItemId) {
          const [validationRows] = await connection.execute(
            'SELECT id FROM chimie_equipment_items WHERE id = ? AND equipment_type_id = ?',
            [equipmentItemId, equipmentTypeId]
          );

          if ((validationRows as any[]).length === 0) {
            console.log(`❌ equipment_item_id ${equipmentItemId} incompatible avec equipment_type_id ${equipmentTypeId}`);
            return NextResponse.json(
              { error: "Item d'équipement incompatible avec le type" },
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
          INSERT INTO chimie_equipment (
            id, name, equipment_type_id, equipment_item_id, model, serial_number,
            barcode, quantity, min_quantity, volume, location, room, status,
            purchase_date, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          equipmentId,
          data.name,
          equipmentTypeId,
          equipmentItemId,
          data.model || null,
          data.serialNumber || null,
          data.barcode || null,
          data.quantity || 1,
          data.minQuantity || null,
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
            ei.svg as item_svg,
            ei.volumes as item_volumes
          FROM chimie_equipment e
          LEFT JOIN chimie_equipment_types et ON e.equipment_type_id = et.id
          LEFT JOIN chimie_equipment_items ei ON e.equipment_item_id = ei.id
          WHERE e.id = ?
        `, [equipmentId]);

        const newEquipment = (newEquipmentRows as any[])[0];

        console.log(`✅ [equipement] Équipement créé: ${equipmentId} - Type: ${equipmentTypeId}, Item: ${equipmentItemId}`);

        return NextResponse.json({
          materiel: {
            ...newEquipment,
            // Compatibilité avec l'ancien format
            typeName: newEquipment.type_name,
            itemName: newEquipment.item_name,
            svg: newEquipment.item_svg || newEquipment.type_svg,
            availableVolumes: safeJSONParse(newEquipment.item_volumes, null),
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