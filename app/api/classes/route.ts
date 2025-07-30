// app/api/classes/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { promises as fs } from 'fs';
import { UserServiceSQL } from '@/lib/services/userService.sql';
import { withAudit } from '@/lib/api/with-audit';

import path from 'path';
const CLASSES_FILE = path.join(process.cwd(), 'data', 'classes.json');

interface ClassData {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  createdAt: string;
  createdBy: string;
  userId?: string; // Pour les classes personnalisées
  userEmail?: string; // Pour identifier facilement le propriétaire
}

interface ClassesFile {
  predefinedClasses: ClassData[];
  customClasses: ClassData[];
}

// Fonction pour lire le fichier classes.json
async function readClassesFile(): Promise<ClassesFile> {
  try {
    const data = await fs.readFile(CLASSES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Si le fichier n'existe pas, le créer avec la structure de base
    const defaultData: ClassesFile = {
      predefinedClasses: [],
      customClasses: []
    };
    await fs.writeFile(CLASSES_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
}

// Fonction pour écrire dans le fichier classes.json
async function writeClassesFile(data: ClassesFile): Promise<boolean> {
  try {
    await fs.writeFile(CLASSES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur écriture classes.json:', error);
    return false;
  }
}

// GET - Récupérer toutes les classes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const classesData = await readClassesFile();
    
    // Si c'est un admin, récupérer aussi les infos des utilisateurs pour les classes custom
    if (session.user.role === "ADMIN") {
      // Utiliser le service SQL pour enrichir les données des classes custom
      try {
        const users = await UserServiceSQL.getAllActive();
        const allCustomClasses: ClassData[] = [];
        users.forEach((user: any) => {
          if (user.customClasses && Array.isArray(user.customClasses)) {
            user.customClasses.forEach((className: string) => {
              allCustomClasses.push({
                id: `CLASS_CUSTOM_${user.id}_${className.replace(/\s+/g, '_')}`,
                name: className,
                type: 'custom',
                createdAt: user.updatedAt || user.createdAt,
                createdBy: user.id,
                userId: user.id,
                userEmail: user.email
              });
            });
          }
        });
        classesData.customClasses = allCustomClasses;
      } catch (error) {
        console.error('Erreur lecture utilisateurs SQL:', error);
      }
    }

    return NextResponse.json(classesData);
  } catch (error) {
    console.error("Erreur lors de la récupération des classes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes" },
      { status: 500 }
    );
  }
}

// POST - Ajouter une nouvelle classe prédéfinie (Admin seulement)
export const POST = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, type = 'predefined' } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nom de classe requis" }, { status: 400 });
    }

    const classesData = await readClassesFile();
    
    // Vérifier si la classe existe déjà
    const exists = classesData.predefinedClasses.some(c => c.name === name.trim());
    if (exists) {
      return NextResponse.json({ error: "Cette classe existe déjà" }, { status: 409 });
    }

    const newClass: ClassData = {
      id: `CLASS_PRE_${Date.now()}`,
      name: name.trim(),
      type: 'predefined',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id
    };

    classesData.predefinedClasses.push(newClass);
    
    const success = await writeClassesFile(classesData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json(newClass, { status: 201 });
  },
  {
    module: 'USERS',
    entity: 'class',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      className: response?.name,
      classType: response?.type
    })
  }
);

// PUT - Modifier une classe prédéfinie (Admin seulement)
export const PUT = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id, name } = await request.json();

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "ID et nom requis" }, { status: 400 });
    }

    const classesData = await readClassesFile();
    const classIndex = classesData.predefinedClasses.findIndex(c => c.id === id);
    
    if (classIndex === -1) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    // Vérifier si le nouveau nom n'existe pas déjà
    const exists = classesData.predefinedClasses.some(c => c.name === name.trim() && c.id !== id);
    if (exists) {
      return NextResponse.json({ error: "Ce nom de classe existe déjà" }, { status: 409 });
    }

    // Stocker l'ancien nom pour l'audit
    const oldName = classesData.predefinedClasses[classIndex].name;
    classesData.predefinedClasses[classIndex].name = name.trim();
    
    const success = await writeClassesFile(classesData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({
      ...classesData.predefinedClasses[classIndex],
      oldName // Pour l'audit
    });
  },
  {
    module: 'USERS',
    entity: 'class',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      className: response?.name,
      oldName: response?.oldName
    })
  }
)


// DELETE - Supprimer une classe prédéfinie (Admin seulement)
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const classesData = await readClassesFile();
    
    // Trouver la classe à supprimer pour récupérer son nom
    const classToDelete = classesData.predefinedClasses.find(c => c.id === id);
    if (!classToDelete) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }
    
    // Filtrer pour supprimer
    const filteredClasses = classesData.predefinedClasses.filter(c => c.id !== id);
    classesData.predefinedClasses = filteredClasses;
    
    const success = await writeClassesFile(classesData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Classe supprimée avec succès",
      deletedClass: classToDelete
    });
  },
  {
    module: 'USERS',
    entity: 'class',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedClass?.id,
    customDetails: (req, response) => ({
      className: response?.deletedClass?.name
    })
  }
)
