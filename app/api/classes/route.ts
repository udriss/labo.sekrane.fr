// app/api/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { promises as fs } from 'fs';
import path from 'path';

const CLASSES_FILE = path.join(process.cwd(), 'data', 'classes.json');
const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

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
      // Lire les utilisateurs pour enrichir les données des classes custom
      try {
        const usersData = await fs.readFile(USERS_FILE, 'utf-8');
        const users = JSON.parse(usersData).users || [];
        
        // Parcourir tous les utilisateurs pour extraire leurs classes personnalisées
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
        console.error('Erreur lecture users.json:', error);
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
export async function POST(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error("Erreur lors de l'ajout de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la classe" },
      { status: 500 }
    );
  }
}

// PUT - Modifier une classe prédéfinie (Admin seulement)
export async function PUT(request: NextRequest) {
  try {
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

    classesData.predefinedClasses[classIndex].name = name.trim();
    
    const success = await writeClassesFile(classesData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json(classesData.predefinedClasses[classIndex]);
  } catch (error) {
    console.error("Erreur lors de la modification de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la classe" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une classe prédéfinie (Admin seulement)
export async function DELETE(request: NextRequest) {
  try {
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
    const filteredClasses = classesData.predefinedClasses.filter(c => c.id !== id);
    
    if (filteredClasses.length === classesData.predefinedClasses.length) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    classesData.predefinedClasses = filteredClasses;
    
    const success = await writeClassesFile(classesData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({ message: "Classe supprimée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la classe" },
      { status: 500 }
    );
  }
}