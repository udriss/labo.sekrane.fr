import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Fonction pour lire le fichier users.json
async function readUsersFile() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.users || [];
  } catch (error) {
    console.error('Erreur lecture users.json:', error);
    return [];
  }
}

// Fonction pour écrire dans le fichier users.json
async function writeUsersFile(users: any[]) {
  try {
    const data = { users };
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur écriture users.json:', error);
    return false;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const data = await request.json();
    // Await the params
    const { id } = await params;
    const userId = id;

    // Vérifier que l'utilisateur peut modifier ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await readUsersFile();
    const userIndex = users.findIndex((user: any) => user.id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      name: data.name,
      email: data.email,
    };

    // Si un mot de passe est fourni, le hasher
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Mettre à jour l'utilisateur
    users[userIndex] = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    // Gérer les classes personnalisées (les stocker directement dans l'utilisateur)
    if (data.selectedClasses && Array.isArray(data.selectedClasses)) {
      users[userIndex].customClasses = data.selectedClasses.map((className: string) => ({
        id: `CLASS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        className,
        createdAt: new Date().toISOString()
      }));
    }

    const success = await writeUsersFile(users);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Profil mis à jour avec succès",
      user: users[userIndex]
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Await the params
    const { id } = await params;
    const userId = id;

    // Vérifier que l'utilisateur peut voir ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await readUsersFile();
    const user = users.find((user: any) => user.id === userId);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
