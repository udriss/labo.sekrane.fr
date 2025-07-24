// app/api/user/[id]/route.ts 
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { withAudit } from '@/lib/api/with-audit';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');


// Types
interface UserData {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  associatedClasses?: string[]; // Classes pré-enregistrées
  customClasses?: string[]; // Classes personnalisées créées par l'utilisateur
  siteConfig?: any;
}

interface UsersFile {
  users: UserData[];
}

async function getPredefinedClasses(): Promise<string[]> {
  try {
    const classesFile = path.join(process.cwd(), 'data', 'classes.json');
    const data = await fs.readFile(classesFile, 'utf-8');
    const parsed = JSON.parse(data);
    return parsed.predefinedClasses.map((c: any) => c.name);
  } catch (error) {
    console.error('Erreur lecture classes.json:', error);
    // Retourner les classes par défaut en cas d'erreur
    return [
      "1ère ES", "Terminale ES", "1ère STI2D", "Terminale STI2D",
      "201", "202", "203", "204", "205", "206", "207", "FALLBACK_CLASS"
    ];
  }
}

// Fonction pour lire le fichier users.json
async function readUsersFile(): Promise<UserData[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed: UsersFile = JSON.parse(data);
    return parsed.users || [];
  } catch (error) {
    console.error('Erreur lecture users.json:', error);
    return [];
  }
}

// Fonction pour écrire dans le fichier users.json
async function writeUsersFile(users: UserData[]): Promise<boolean> {
  try {
    const data: UsersFile = { users };
    await fs.writeFile(USERS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur écriture users.json:', error);
    return false;
  }
}

export const PUT = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    
    const data = await request.json();
    const { id } = await params;
    const userId = id;

    // Vérifier que l'utilisateur peut modifier ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await readUsersFile();
    const userIndex = users.findIndex((user) => user.id === userId);

    if (userIndex === -1) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Préparer les données de mise à jour
    const updateData: Partial<UserData> = {
      name: data.name,
      email: data.email,
      updatedAt: new Date().toISOString()
    };

    // Si un mot de passe est fourni, le hasher
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Gérer les classes
    if (data.selectedClasses && Array.isArray(data.selectedClasses)) {
      // Séparer les classes prédéfinies des classes personnalisées
      const associatedClasses: string[] = [];
      const customClasses: string[] = [];

      data.selectedClasses.forEach(async (className: string) => {
        const predefinedClasses = await getPredefinedClasses();
        if (predefinedClasses.includes(className)) {
          associatedClasses.push(className);
        } else {
          customClasses.push(className);
        }
      });

      updateData.associatedClasses = associatedClasses;
      updateData.customClasses = customClasses;
    }

    // Pour la modification par un admin d'un autre utilisateur
    if (data.associatedClasses !== undefined) {
      updateData.associatedClasses = data.associatedClasses;
    }
    if (data.customClasses !== undefined) {
      updateData.customClasses = data.customClasses;
    }

    // Mettre à jour l'utilisateur
    users[userIndex] = {
      ...users[userIndex],
      ...updateData
    };

    const success = await writeUsersFile(users);
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = users[userIndex];

    return NextResponse.json({
      message: "Profil mis à jour avec succès",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
},
  {
    module: 'USERS',
    entity: 'user',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.user?.id,
    customDetails: (req, response) => ({
      modifiedUser: response?.user?.email,
      fieldsUpdated: ['name', 'email', 'classes', 'password'].filter(field => 
        response?.user?.[field] !== undefined
      ),
      classesUpdated: response?.user?.associatedClasses !== undefined || response?.user?.customClasses !== undefined
    })
  }
);


export const GET = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    // Vérifier que l'utilisateur peut voir ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const users = await readUsersFile();
    const user = users.find((user) => user.id === userId);

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // S'assurer que les tableaux existent
    if (!user.associatedClasses) {
      user.associatedClasses = [];
    }
    if (!user.customClasses) {
      user.customClasses = [];
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
},
  {
    module: 'USERS',
    entity: 'user',
    action: 'READ',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      viewedUser: response?.email,
      viewedUserRole: response?.role
    })
  }
);


export const DELETE = withAudit(
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = id;

    if (session.user.id === userId) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 });
    }

    const users = await readUsersFile();
    const userToDelete = users.find((user) => user.id === userId);
    
    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const filteredUsers = users.filter((user) => user.id !== userId);
    const success = await writeUsersFile(filteredUsers);
    
    if (!success) {
      return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Utilisateur supprimé avec succès",
      deletedUser: { id: userToDelete.id, email: userToDelete.email, name: userToDelete.name }
    });
  },
  {
    module: 'USERS',
    entity: 'user',
    action: 'DELETE',
    extractEntityIdFromResponse: (response) => response?.deletedUser?.id,
    customDetails: (req, response) => ({
      deletedUserEmail: response?.deletedUser?.email,
      deletedUserName: response?.deletedUser?.name
    })
  }
)