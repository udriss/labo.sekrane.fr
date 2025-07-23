import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';

interface Equipment {
  id: string;
  name: string;
  equipmentTypeId?: string;
  type: string;
  model?: string;
  serialNumber?: string;
  barcode?: string;
  quantity: number;
  status: string;
  location?: string;
  room?: string;
  cabinet?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  maintenanceNotes?: string;
  supplierId?: string;
  purchaseDate?: string;
  warrantyEnd?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface EquipmentInventory {
  equipment: Equipment[];
  stats: {
    total: number;
    available: number;
    inUse: number;
    maintenance: number;
    outOfOrder: number;
  };
}

async function readEquipmentInventory(): Promise<EquipmentInventory> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'equipment-inventory.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
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

async function writeEquipmentInventory(data: EquipmentInventory): Promise<void> {
  const filePath = path.join(process.cwd(), 'data', 'equipment-inventory.json');
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

function calculateStats(equipment: Equipment[]): EquipmentInventory['stats'] {
  return {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'AVAILABLE').length,
    inUse: equipment.filter(e => e.status === 'IN_USE').length,
    maintenance: equipment.filter(e => e.status === 'MAINTENANCE').length,
    outOfOrder: equipment.filter(e => e.status === 'OUT_OF_ORDER').length
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const { id } = await params;
    const equipmentId = id;

    const inventory = await readEquipmentInventory();
    const equipmentIndex = inventory.equipment.findIndex(e => e.id === equipmentId);

    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    // Mise à jour de l'équipement
    inventory.equipment[equipmentIndex] = {
      ...inventory.equipment[equipmentIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Recalcul des statistiques
    inventory.stats = calculateStats(inventory.equipment);

    await writeEquipmentInventory(inventory);

    return NextResponse.json(inventory.equipment[equipmentIndex]);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'équipement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const equipmentId = id;

    const inventory = await readEquipmentInventory();
    const equipmentIndex = inventory.equipment.findIndex(e => e.id === equipmentId);

    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    // Suppression de l'équipement
    inventory.equipment.splice(equipmentIndex, 1);

    // Recalcul des statistiques
    inventory.stats = calculateStats(inventory.equipment);

    await writeEquipmentInventory(inventory);

    return NextResponse.json({ message: "Équipement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'équipement" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const equipmentId = id;

    const inventory = await readEquipmentInventory();
    const equipment = inventory.equipment.find(e => e.id === equipmentId);

    if (!equipment) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'équipement" },
      { status: 500 }
    );
  }
}
