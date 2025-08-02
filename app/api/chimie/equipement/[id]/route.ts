// app/api/chimie/equipement/[id]/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { withConnection } from '@/lib/db';
import { withAudit } from '@/lib/api/with-audit';
import type { EquipmentWithRelations, EquipmentFormData, EquipmentStatus } from '@/types/equipment-mysql';

// GET - Récupérer un équipement par ID
export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;


      return withConnection(async (connection) => {
        const [rows] = await connection.execute(`
          SELECT 
            ec.*,
            ect.name as type_name,
            ect.svg as type_svg,
            eci.name as item_name,
            eci.svg as item_svg,
            eci.volumes as item_volumes
          FROM chimie_equipment ec
          LEFT JOIN chimie_equipment_types ect ON ec.equipment_type_id = ect.id
          LEFT JOIN chimie_equipment_items eci ON ec.equipment_item_id = eci.id
          WHERE ec.id = ?
        `, [id]);

        const equipment = (rows as any[])[0];

        if (!equipment) {
          return NextResponse.json(
            { error: "Équipement non trouvé" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          materiel: {
            ...equipment,
            // Compatibilité avec l'ancien format
            typeName: equipment.type_name,
            itemName: equipment.item_name,
            svg: equipment.item_svg || equipment.type_svg,
            availableVolumes: equipment.item_volumes ? JSON.parse(equipment.item_volumes) : null,
            equipmentTypeId: equipment.equipment_type_id
          }
        });
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de l'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'équipement" },
        { status: 500 }
      );
    }
  };

// PUT - Mettre à jour un équipement
export const PUT = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const data: Partial<EquipmentFormData> = await request.json();

      return withConnection(async (connection) => {
        // Vérifier que l'équipement existe et récupérer l'état avant modification
        const [existingRows] = await connection.execute(`
          SELECT 
            e.*,
            et.name as type_name,
            ei.name as item_name
          FROM chimie_equipment e
          LEFT JOIN chimie_equipment_types et ON e.equipment_type_id = et.id
          LEFT JOIN chimie_equipment_items ei ON e.equipment_item_id = ei.id
          WHERE e.id = ?
        `, [id]);

        if ((existingRows as any[]).length === 0) {
          return NextResponse.json(
            { error: "Équipement non trouvé" },
            { status: 404 }
          );
        }

        const beforeState = (existingRows as any[])[0];

        // Si equipment_type_id est fourni, vérifier qu'il existe
        if (data.equipmentItemId) {
          const [typeRows] = await connection.execute(
            'SELECT id FROM chimie_equipment_types WHERE id = ?',
            [data.equipmentTypeId]
          );

          if ((typeRows as any[]).length === 0) {
            return NextResponse.json(
              { error: "Type d'équipement non trouvé" },
              { status: 400 }
            );
          }
        }

        // Si equipment_item_id est fourni, vérifier qu'il existe et est compatible
        if (data.equipmentItemId && data.equipmentTypeId) {
          const [itemRows] = await connection.execute(
            'SELECT id FROM chimie_equipment_items WHERE id = ? AND equipment_type_id = ?',
            [data.equipmentItemId, data.equipmentTypeId]
          );

          if ((itemRows as any[]).length === 0) {
            return NextResponse.json(
              { error: "Item d'équipement non trouvé ou incompatible avec le type" },
              { status: 400 }
            );
          }
        }

        // Convertir la date d'achat si fournie
        let purchaseDate = undefined;
        if (data.purchase_date !== undefined) {
          if (data.purchase_date) {
            try {
              purchaseDate = new Date(data.purchase_date).toISOString().split('T')[0];
            } catch (e) {
              console.warn('Date d\'achat invalide:', data.purchase_date);
              purchaseDate = null;
            }
          } else {
            purchaseDate = null;
          }
        }

        // Construire la requête de mise à jour dynamiquement
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        const fieldsMapping = {
          name: 'name',
          equipmentTypeId: 'equipment_type_id',
          equipmentItemId: 'equipment_item_id',
          model: 'model',
          serial_number: 'serial_number',
          barcode: 'barcode',
          quantity: 'quantity',
          minQuantity: 'min_quantity',
          volume: 'volume',
          location: 'location',
          room: 'room',
          status: 'status',
          notes: 'notes'
        };

        Object.entries(fieldsMapping).forEach(([dataKey, dbField]) => {
          if (data[dataKey as keyof EquipmentFormData] !== undefined) {
            updateFields.push(`${dbField} = ?`);
            updateValues.push(data[dataKey as keyof EquipmentFormData]);
          }
        });

        if (purchaseDate !== undefined) {
          updateFields.push('purchase_date = ?');
          updateValues.push(purchaseDate);
        }

        if (updateFields.length === 0) {
          return NextResponse.json(
            { error: "Aucune donnée à mettre à jour" },
            { status: 400 }
          );
        }

        // Ajouter la date de mise à jour
        updateFields.push('updated_at = NOW()');
        updateValues.push(id); // Pour la clause WHERE

        // Exécuter la mise à jour
        await connection.execute(
          `UPDATE chimie_equipment SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );

        // Récupérer l'équipement mis à jour avec ses relations
        const [updatedRows] = await connection.execute(`
          SELECT 
            ec.*,
            ect.name as type_name,
            ect.svg as type_svg,
            eci.name as item_name,
            eci.svg as item_svg,
            eci.volumes as item_volumes
          FROM chimie_equipment ec
          LEFT JOIN chimie_equipment_types ect ON ec.equipment_type_id = ect.id
          LEFT JOIN chimie_equipment_items eci ON ec.equipment_item_id = eci.id
          WHERE ec.id = ?
        `, [id]);

        const updatedEquipment = (updatedRows as any[])[0];
        return NextResponse.json({
          materiel: {
            ...updatedEquipment,
            // Compatibilité avec l'ancien format
            typeName: updatedEquipment.type_name,
            itemName: updatedEquipment.item_name,
            svg: updatedEquipment.item_svg || updatedEquipment.type_svg,
            availableVolumes: (() => {
              const v = updatedEquipment.item_volumes;
              if (!v || v === 'null') return null;
              if (Array.isArray(v)) return v;
              if (typeof v === 'string') {
                try {
                  // Si la chaîne est vide ou "null", retourne null
                  if (v.trim() === '' || v.trim() === 'null') return null;
                  return JSON.parse(v);
                } catch (e) {
                  console.warn('item_volumes JSON parse error:', v, e);
                  return null;
                }
              }
              return null;
            })(),
            equipmentTypeId: updatedEquipment.equipment_type_id
          },
          _audit: {
            before: beforeState,
            updateData: data
          }
        });
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'équipement" },
        { status: 500 }
      );
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.materiel?.id,
    customDetails: (req, response) => {
      const beforeState = response?._audit?.before;
      const updateData = response?._audit?.updateData;
      
      return {
        equipmentName: response?.materiel?.name,
        quantityUpdate: updateData?.quantity !== undefined && Object.keys(updateData).length === 1,
        before: beforeState,
        after: response?.materiel,
        fields: Object.keys(updateData || {}),
        quantity: response?.materiel?.quantity
      }
    }
  }
);

// DELETE - Supprimer un équipement
export const DELETE = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      return withConnection(async (connection) => {
        // Vérifier que l'équipement existe
        const [existingRows] = await connection.execute(
          'SELECT id, name FROM chimie_equipment WHERE id = ?',
          [id]
        );

        if ((existingRows as any[]).length === 0) {
          return NextResponse.json(
            { error: "Équipement non trouvé" },
            { status: 404 }
          );
        }

        const equipment = (existingRows as any[])[0];

        // Supprimer l'équipement
        await connection.execute('DELETE FROM chimie_equipment WHERE id = ?', [id]);

        return NextResponse.json({ 
          success: true,
          message: `Équipement "${equipment.name}" supprimé avec succès`,
          deletedEquipment: { id: equipment.id, name: equipment.name }
        });
      });
    } catch (error) {
      console.error("Erreur lors de la suppression de l'équipement:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de l'équipement" },
        { status: 500 }
      );
    }
  },
  {
    module: 'EQUIPMENT',
    entity: 'equipment',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedEquipment?.id,
    customDetails: (req, response) => ({
      equipmentName: response?.deletedEquipment?.name
    })
  }
);
