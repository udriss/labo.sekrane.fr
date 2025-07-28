// app/api/user/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { promises as fs } from 'fs';
import path from 'path';
import { withAudit } from '@/lib/api/with-audit';
import { is } from "date-fns/locale";

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Fonction pour lire le fichier users.json
async function readUsersFile() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture users.json:', error);
    return { users: [] };
  }
}

// Fonction pour écrire dans le fichier users.json
async function writeUsersFile(data: any) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur écriture users.json:', error);
    return false;
  }
}

// GET - Récupérer les classes personnalisées de l'utilisateur
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const usersData = await readUsersFile();
    const user = usersData.users.find((u: any) => u.id === session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Retourner les classes personnalisées de l'utilisateur
    const customClasses = (user.customClasses || []).map((className: string, index: number) => ({
      id: `CLASS_CUSTOM_${user.id}_${index}`,
      name: className,
      type: 'custom',
      createdAt: user.updatedAt || user.createdAt,
      createdBy: user.id,
      isCustom: true
    }));

    return NextResponse.json({ customClasses });
  } catch (error) {
    console.error("Erreur lors de la récupération des classes personnalisées:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes personnalisées" },
      { status: 500 }
    );
  }
}

// POST - Ajouter une nouvelle classe personnalisée
export const POST = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nom de classe requis" }, { status: 400 });
    }

    const usersData = await readUsersFile();
    const userIndex = usersData.users.findIndex((u: any) => u.id === session.user.id);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Initialiser customClasses si elle n'existe pas
    if (!usersData.users[userIndex].customClasses) {
      usersData.users[userIndex].customClasses = [];
    }

    // Vérifier si la classe existe déjà
    if (usersData.users[userIndex].customClasses.includes(name.trim())) {
      return NextResponse.json({ error: "Cette classe existe déjà" }, { status: 409 });
    }

    // Ajouter la nouvelle classe
    usersData.users[userIndex].customClasses.push(name.trim());
    usersData.users[userIndex].updatedAt = new Date().toISOString();

    const success = await writeUsersFile(usersData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    const newClass = {
      id: `CLASS_CUSTOM_${session.user.id}_${usersData.users[userIndex].customClasses.length - 1}`,
      name: name.trim(),
      type: 'custom',
      createdAt: new Date().toISOString(),
      createdBy: session.user.id
    };

    return NextResponse.json(newClass, { status: 201 });
  },
  {
    module: 'USERS',
    entity: 'customClass',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      className: response?.name,
      classType: 'custom'
    })
  }
);

// DELETE - Supprimer une classe personnalisée
export const DELETE = withAudit(
  async (request: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const className = searchParams.get('name');

    if (!className) {
      return NextResponse.json({ error: "Nom de classe requis" }, { status: 400 });
    }

    const usersData = await readUsersFile();
    const userIndex = usersData.users.findIndex((u: any) => u.id === session.user.id);
    
    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const customClasses = usersData.users[userIndex].customClasses || [];
    const classIndex = customClasses.indexOf(className);
    
    if (classIndex === -1) {
      return NextResponse.json({ error: "Classe non trouvée" }, { status: 404 });
    }

    // Supprimer la classe
    customClasses.splice(classIndex, 1);
    usersData.users[userIndex].customClasses = customClasses;
    usersData.users[userIndex].updatedAt = new Date().toISOString();

    const success = await writeUsersFile(usersData);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Classe supprimée avec succès",
      deletedClass: { name: className }
    });
  },
  {
    module: 'USERS',
    entity: 'customClass',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedClass?.id,
    customDetails: (req) => ({
      className: new URL(req.url).searchParams.get('name')
    })
  }
);