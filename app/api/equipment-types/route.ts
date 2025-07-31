// app/api/equipment-types/route-mysql.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server'
import { withConnection } from '@/lib/db';
import { withAudit } from '@/lib/api/with-audit'
import type { EquipmentType, EquipmentItem } from '@/types/equipment-mysql';

// GET - Récupérer tous les types d'équipements avec leurs items
export const GET = withAudit(
  async () => {
    try {
      return withConnection(async (connection) => {
        // Récupérer les types d'équipements
        const [typeRows] = await connection.execute(`
          SELECT * FROM equipment_types 
          ORDER BY is_custom ASC, name ASC
        `);

        const types = typeRows as EquipmentType[];

        // Récupérer les items pour chaque type
        const typesWithItems = await Promise.all(
          types.map(async (type) => {
            const [itemRows] = await connection.execute(`
              SELECT * FROM equipment_items 
              WHERE equipment_type_id = ? 
              ORDER BY name ASC
            `, [type.id]);

            const items = (itemRows as EquipmentItem[]).map(item => ({
              ...item,
              // Convertir les JSON strings en objets pour la compatibilité
              volumes: item.volumes ? JSON.parse(item.volumes) : [],
              resolutions: item.resolutions ? JSON.parse(item.resolutions) : [],
              tailles: item.tailles ? JSON.parse(item.tailles) : [],
              materiaux: item.materiaux ? JSON.parse(item.materiaux) : [],
              customFields: item.custom_fields ? JSON.parse(item.custom_fields) : {},
              // Compatibilité avec l'ancien format
              isCustom: item.is_custom
            }));

            return {
              ...type,
              // Compatibilité avec l'ancien format
              isCustom: type.is_custom,
              items
            };
          })
        );

      return NextResponse.json({ 
        types: typesWithItems 
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des types d'équipements:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des types d'équipements" },
      { status: 500 }
    );
  }
},
{
  module: 'EQUIPMENT',
  entity: 'equipment_type',
  action: 'READ',
  extractEntityIdFromResponse: (response) => undefined
}
);

// POST - Créer un nouveau type d'équipement
export const POST = withAudit(
  async (request: NextRequest) => {
    try {
      const data = await request.json();
      
      if (!data.name) {
        return NextResponse.json(
          { error: "Le nom du type d'équipement est requis" },
          { status: 400 }
        );
      }

      return withConnection(async (connection) => {
        // Générer un ID unique
        const typeId = data.id || `CUSTOM_${Date.now()}`;

        // Insérer le nouveau type
        await connection.execute(`
          INSERT INTO equipment_types (id, name, svg, is_custom, owner_id)
          VALUES (?, ?, ?, ?, ?)
        `, [
          typeId,
          data.name,
          data.svg || '/svg/default.svg',
          data.isCustom || true,
          data.ownerId || null
        ]);

        // Si des items sont fournis, les insérer aussi
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            const itemId = item.id || `${typeId}_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await connection.execute(`
              INSERT INTO equipment_items (
                id, name, svg, equipment_type_id, volumes, resolutions, 
                tailles, materiaux, custom_fields, is_custom
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              itemId,
              item.name,
              item.svg || '/svg/default.svg',
              typeId,
              item.volumes ? JSON.stringify(item.volumes) : null,
              item.resolutions ? JSON.stringify(item.resolutions) : null,
              item.tailles ? JSON.stringify(item.tailles) : null,
              item.materiaux ? JSON.stringify(item.materiaux) : null,
              item.customFields ? JSON.stringify(item.customFields) : null,
              item.isCustom || true
            ]);
          }
        }

        // Récupérer le type créé avec ses items
        const [typeRows] = await connection.execute(
          'SELECT * FROM equipment_types WHERE id = ?',
          [typeId]
        );

        const [itemRows] = await connection.execute(
          'SELECT * FROM equipment_items WHERE equipment_type_id = ?',
          [typeId]
        );

        const type = (typeRows as any[])[0];
        const items = (itemRows as any[]).map(item => ({
          ...item,
          volumes: item.volumes ? JSON.parse(item.volumes) : [],
          resolutions: item.resolutions ? JSON.parse(item.resolutions) : [],
          tailles: item.tailles ? JSON.parse(item.tailles) : [],
          materiaux: item.materiaux ? JSON.parse(item.materiaux) : [],
          customFields: item.custom_fields ? JSON.parse(item.custom_fields) : {},
          isCustom: item.is_custom
        }));

        return NextResponse.json({
          type: {
            ...type,
            isCustom: type.is_custom,
            items
          }
        });
      });
    } catch (error) {
      console.error("Erreur lors de la création du type d'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création du type d'équipement" },
        { status: 500 }
      );
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment_type',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.type?.id,
    customDetails: (req, response) => ({
      typeName: response?.type?.name,
      itemsCount: response?.type?.items?.length || 0
    })
  }
);

// PUT - Mettre à jour un type d'équipement
export const PUT = withAudit(
  async (request: NextRequest) => {
    try {
      const data = await request.json();
      
      if (!data.id) {
        return NextResponse.json(
          { error: "L'ID du type d'équipement est requis" },
          { status: 400 }
        );
      }

      return withConnection(async (connection) => {
        // Vérifier que le type existe
        const [existingRows] = await connection.execute(
          'SELECT id FROM equipment_types WHERE id = ?',
          [data.id]
        );

        if ((existingRows as any[]).length === 0) {
          return NextResponse.json(
            { error: "Type d'équipement non trouvé" },
            { status: 404 }
          );
        }

        // Mettre à jour le type
        await connection.execute(`
          UPDATE equipment_types 
          SET name = ?, svg = ?, updated_at = NOW()
          WHERE id = ?
        `, [
          data.name,
          data.svg || '/svg/default.svg',
          data.id
        ]);

        // Si des items sont fournis, les mettre à jour
        if (data.items && Array.isArray(data.items)) {
          // Supprimer les anciens items
          await connection.execute(
            'DELETE FROM equipment_items WHERE equipment_type_id = ?',
            [data.id]
          );

          // Insérer les nouveaux items
          for (const item of data.items) {
            const itemId = item.id || `${data.id}_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await connection.execute(`
              INSERT INTO equipment_items (
                id, name, svg, equipment_type_id, volumes, resolutions, 
                tailles, materiaux, custom_fields, is_custom
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              itemId,
              item.name,
              item.svg || '/svg/default.svg',
              data.id,
              item.volumes ? JSON.stringify(item.volumes) : null,
              item.resolutions ? JSON.stringify(item.resolutions) : null,
              item.tailles ? JSON.stringify(item.tailles) : null,
              item.materiaux ? JSON.stringify(item.materiaux) : null,
              item.customFields ? JSON.stringify(item.customFields) : null,
              item.isCustom || false
            ]);
          }
        }

        return NextResponse.json({ success: true });
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du type d'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du type d'équipement" },
        { status: 500 }
      );
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment_type',
    action: 'UPDATE'
  }
);

// DELETE - Supprimer un type d'équipement
export const DELETE = withAudit(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const typeId = searchParams.get('id');
      
      if (!typeId) {
        return NextResponse.json(
          { error: "L'ID du type d'équipement est requis" },
          { status: 400 }
        );
      }

      return withConnection(async (connection) => {
        // Vérifier que le type existe
        const [existingRows] = await connection.execute(
          'SELECT id, name FROM equipment_types WHERE id = ?',
          [typeId]
        );

        if ((existingRows as any[]).length === 0) {
          return NextResponse.json(
            { error: "Type d'équipement non trouvé" },
            { status: 404 }
          );
        }

        const type = (existingRows as any[])[0];

        // Vérifier s'il y a des équipements qui utilisent ce type
        const [equipmentRows] = await connection.execute(
          'SELECT COUNT(*) as count FROM equipment WHERE equipment_type_id = ?',
          [typeId]
        );

        const equipmentCount = (equipmentRows as any[])[0].count;

        if (equipmentCount > 0) {
          return NextResponse.json(
            { error: `Impossible de supprimer le type d'équipement car ${equipmentCount} équipement(s) l'utilisent encore` },
            { status: 400 }
          );
        }

        // Supprimer le type (les items seront supprimés automatiquement grâce à ON DELETE CASCADE)
        await connection.execute('DELETE FROM equipment_types WHERE id = ?', [typeId]);

        return NextResponse.json({ 
          success: true,
          message: `Type d'équipement "${type.name}" supprimé avec succès`
        });
      });
    } catch (error) {
      console.error("Erreur lors de la suppression du type d'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression du type d'équipement" },
        { status: 500 }
      );
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment_type',
    action: 'DELETE'
  }
);
