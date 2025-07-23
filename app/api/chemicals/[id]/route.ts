import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import fs from 'fs/promises';
import path from 'path';

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
    console.log('Initialisation du fichier JSON depuis la base de données PRISMA...');
    
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
    console.log(`Fichier JSON initialisé avec ${jsonData.chemicals.length} produits chimiques`);
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    const { id } = await params;
    const chemicalId = id;

    // Lire le fichier JSON
    const inventory = await readChemicalsInventory();
    
    // Trouver et mettre à jour le produit chimique
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
  } catch (error) {
    console.error("Error updating chemical:", error);
    return NextResponse.json(
      { error: "Failed to update chemical" },
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
    const chemicalId = id;

    // Lire le fichier JSON
    const inventory = await readChemicalsInventory();
    
    // Trouver l'index du produit chimique à supprimer
    const chemicalIndex = inventory.chemicals.findIndex((c: any) => c.id === chemicalId);
    
    if (chemicalIndex === -1) {
      return NextResponse.json({ error: "Chemical not found" }, { status: 404 });
    }

    // Supprimer le produit chimique du tableau
    inventory.chemicals.splice(chemicalIndex, 1);

    // Sauvegarder dans le fichier JSON
    await writeChemicalsInventory(inventory);

    return NextResponse.json({ message: "Produit chimique supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit chimique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du produit chimique" },
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
    const chemicalId = id;

    // Lire depuis le fichier JSON local
    const inventory = await readChemicalsInventory();
    const chemical = inventory.chemicals.find((chem: any) => chem.id === chemicalId);

    if (!chemical) {
      return NextResponse.json(
        { error: "Produit chimique non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(chemical);
  } catch (error) {
    console.error("Erreur lors de la récupération du produit chimique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du produit chimique" },
      { status: 500 }
    );
  }
}
