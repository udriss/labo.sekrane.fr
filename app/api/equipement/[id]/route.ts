// app/api/equipement/[id]/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { withAudit } from '@/lib/api/with-audit';
import { 
  EquipmentType, 
  EquipmentItem, 
  EquipmentFormData 
} from '@/types/equipment';

// Interface pour l'équipement dans l'inventaire
interface InventoryEquipment {
  id: string;
  name: string;
  equipmentTypeId: string;
  model?: string;
  serialNumber?: string;
  barcode?: string;
  quantity: number;
  minQuantity?: number;
  volume?: string;
  resolution?: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_ORDER';
  location?: string;
  room?: string;
  supplier?: string;
  purchaseDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Champs enrichis (ajoutés dynamiquement)
  typeName?: string;
  itemName?: string;
  svg?: string;
  availableVolumes?: string[];
}

interface EquipmentInventory {
  equipment: InventoryEquipment[];
  stats: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    outOfOrder: number;
  };
}

interface EquipmentTypesData {
  types: EquipmentType[];
}

const EQUIPMENT_INVENTORY_FILE = path.join(process.cwd(), 'data', 'equipment-inventory.json');
const EQUIPMENT_TYPES_FILE = path.join(process.cwd(), 'data', 'equipment-types.json');

// Fonction pour lire l'inventaire des équipements
async function readEquipmentInventory(): Promise<EquipmentInventory> {
  try {
    const fileContent = await fs.readFile(EQUIPMENT_INVENTORY_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Erreur lecture inventaire équipements:', error);
    return {
      equipment: [],
      stats: {
        total: 0,
        available: 0,
        inUse: 0,
        maintenance: 0,
        outOfOrder: 0
      }
    };
  }
}

// Fonction pour écrire l'inventaire des équipements
async function writeEquipmentInventory(data: EquipmentInventory): Promise<void> {
  await fs.writeFile(EQUIPMENT_INVENTORY_FILE, JSON.stringify(data, null, 2));
}

// Fonction pour lire les types d'équipements
async function readEquipmentTypes(): Promise<EquipmentTypesData> {
  try {
    const fileContent = await fs.readFile(EQUIPMENT_TYPES_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Erreur lecture types équipements:', error);
    return { types: [] };
  }
}

// Fonction pour calculer les statistiques
function calculateStats(equipment: InventoryEquipment[]): EquipmentInventory['stats'] {
  return {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'AVAILABLE').length,
    inUse: equipment.filter(e => e.status === 'IN_USE').length,
    maintenance: equipment.filter(e => e.status === 'MAINTENANCE').length,
    outOfOrder: equipment.filter(e => e.status === 'OUT_OF_ORDER').length
  };
}

// Fonction pour enrichir un équipement avec les données du type
async function enrichEquipmentWithTypeData(equipment: InventoryEquipment): Promise<InventoryEquipment> {
  const types = await readEquipmentTypes();
  
  for (const type of types.types) {
    const item = type.items.find((item: EquipmentItem) => item.id === equipment.equipmentTypeId);
    if (item) {
      return {
        ...equipment,
        typeName: type.name,
        itemName: item.name,
        svg: item.svg,
        availableVolumes: item.volumes
      };
    }
  }
  
  return equipment;
}

// GET - Récupérer un équipement spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const inventory = await readEquipmentInventory();
    const equipment = inventory.equipment.find(e => e.id === id);

    if (!equipment) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    // Enrichir avec les données du type
    const enrichedEquipment = await enrichEquipmentWithTypeData(equipment);

    return NextResponse.json(enrichedEquipment);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'équipement" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un équipement
export const PUT = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const data = await request.json();
      const { id } = await params;

      const inventory = await readEquipmentInventory();
      const equipmentIndex = inventory.equipment.findIndex(e => e.id === id);

      if (equipmentIndex === -1) {
        return NextResponse.json(
          { error: "Équipement non trouvé" },
          { status: 404 }
        );
      }

      // Conserver les champs existants et mettre à jour seulement ceux fournis
      const updatedEquipment: InventoryEquipment = {
        ...inventory.equipment[equipmentIndex],
        ...data,
        quantity: data.quantity !== undefined ? parseInt(data.quantity) : inventory.equipment[equipmentIndex].quantity,
        updatedAt: new Date().toISOString(),
      };

      // Retirer les champs enrichis qui ne doivent pas être sauvegardés
      delete updatedEquipment.typeName;
      delete updatedEquipment.itemName;
      delete updatedEquipment.svg;
      delete updatedEquipment.availableVolumes;

      inventory.equipment[equipmentIndex] = updatedEquipment;

      // Recalculer les statistiques
      inventory.stats = calculateStats(inventory.equipment);

      await writeEquipmentInventory(inventory);

      // Enrichir la réponse avec les données du type
      const enrichedEquipment = await enrichEquipmentWithTypeData(updatedEquipment);

      return NextResponse.json(enrichedEquipment);
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
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      equipmentName: response?.name,
      status: response?.status,
      quantity: response?.quantity,
      location: response?.location,
      room: response?.room
    })
  }
);

// DELETE - Supprimer un équipement
export const DELETE = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const inventory = await readEquipmentInventory();
      const equipmentIndex = inventory.equipment.findIndex(e => e.id === id);

      if (equipmentIndex === -1) {
        return NextResponse.json(
          { error: "Équipement non trouvé" },
          { status: 404 }
        );
      }

      // Stocker les infos avant suppression pour l'audit
      const deletedEquipment = inventory.equipment[equipmentIndex];
      
      // Supprimer l'équipement
      inventory.equipment.splice(equipmentIndex, 1);
      
      // Recalculer les statistiques
      inventory.stats = calculateStats(inventory.equipment);
      
      await writeEquipmentInventory(inventory);

      return NextResponse.json({ 
        message: "Équipement supprimé avec succès",
        deletedEquipment: { 
          id: deletedEquipment.id, 
          name: deletedEquipment.name,
          equipmentTypeId: deletedEquipment.equipmentTypeId,
          quantity: deletedEquipment.quantity
        }
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
      equipmentName: response?.deletedEquipment?.name,
      equipmentTypeId: response?.deletedEquipment?.equipmentTypeId,
      quantity: response?.deletedEquipment?.quantity
    })
  }
);