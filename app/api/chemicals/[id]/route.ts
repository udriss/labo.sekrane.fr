// app/api/chemicals/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import fs from 'fs/promises';
import path from 'path';
import { withAudit } from '@/lib/api/with-audit';

// Chemin vers le fichier JSON local
const CHEMICALS_INVENTORY_FILE = path.join(process.cwd(), 'data', 'chemicals-inventory.json');

// Fonction pour lire le fichier JSON
async function readChemicalsInventory() {
  try {
    const data = await fs.readFile(CHEMICALS_INVENTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Fichier chemicals-inventory.json non trouvé, initialisation depuis PRISMA...');
    // Si le fichier n'existe pas, peupler depuis PRISMA
    return await initializeFromPrisma();
  }
}

// Fonction pour initialiser le fichier JSON depuis PRISMA (une seule fois)
async function initializeFromPrisma() {
  try {
    
    
    const prismaChemicals = await prisma.chemical.findMany({
      include: {
        supplier: true,
      },
    });

    const jsonData = { chemicals: prismaChemicals };

    // Créer le répertoire data s'il n'existe pas
    const dataDir = path.dirname(CHEMICALS_INVENTORY_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Sauvegarder dans le fichier JSON
    await writeChemicalsInventory(jsonData);
    
    
    return jsonData;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation depuis PRISMA:', error);
    // En cas d'erreur, retourner une structure vide
    return { chemicals: [] };
  }
}

// Fonction pour écrire dans le fichier JSON
async function writeChemicalsInventory(data: any) {
  try {
    await fs.writeFile(CHEMICALS_INVENTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Erreur lors de l\'écriture du fichier chemicals-inventory.json:', error);
    throw error;
  }
}

export const GET = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const chemicalId = id;

    // Lire depuis le fichier JSON local
    const inventory = await readChemicalsInventory();
    const chemical = inventory.chemicals.find((chem: any) => chem.id === chemicalId);

    if (!chemical) {
      return NextResponse.json(
        { error: "Réactif chimique non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(chemical);
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

    // Lire le fichier JSON
    const inventory = await readChemicalsInventory();
    
    // Trouver et mettre à jour le réactif chimique
    const chemicalIndex = inventory.chemicals.findIndex((c: any) => c.id === chemicalId);
    
    if (chemicalIndex === -1) {
      return NextResponse.json({ error: "Chemical not found" }, { status: 404 });
    }

    // Mettre à jour les données
    inventory.chemicals[chemicalIndex] = {
      ...inventory.chemicals[chemicalIndex],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Sauvegarder dans le fichier JSON
    await writeChemicalsInventory(inventory);

    return NextResponse.json({
      message: "Chemical updated successfully",
      chemical: inventory.chemicals[chemicalIndex]
    });
  },
  {
    module: 'CHEMICALS',
    entity: 'chemical',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.chemical?.id,
    customDetails: (req, response) => ({
      chemicalName: response?.chemical?.name,
      fieldsUpdated: Object.keys(response?.chemical || {})
    })
  }
)

// DELETE - Envelopper car c'est une suppression sensible
export const DELETE = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const chemicalId = id;

    // Lire le fichier JSON
    const inventory = await readChemicalsInventory();
    
    // Trouver l'index du réactif chimique à supprimer
    const chemicalIndex = inventory.chemicals.findIndex((c: any) => c.id === chemicalId);
    
    if (chemicalIndex === -1) {
      return NextResponse.json({ error: "Chemical not found" }, { status: 404 });
    }

    // Stocker le nom avant suppression pour l'audit
    const deletedChemical = inventory.chemicals[chemicalIndex];

    // Supprimer le réactif chimique du tableau
    inventory.chemicals.splice(chemicalIndex, 1);

    // Sauvegarder dans le fichier JSON
    await writeChemicalsInventory(inventory);

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
