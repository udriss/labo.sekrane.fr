// app/api/user/[id]/route.ts 
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { UserServiceSQL } from '@/lib/services/userService.sql';
import { ClassServiceSQL } from '@/lib/services/classService.sql';
import path from 'path';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { withAudit } from '@/lib/api/with-audit';




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
    const classes = await ClassServiceSQL.getAllClasses();
    return classes.predefinedClasses.map(c => c.name);
  } catch (error) {
    console.error('Erreur lecture classes depuis SQL:', error);
    // Retourner les classes par défaut en cas d'erreur
    return [
      "1ère ES", "Terminale ES", "1ère STI2D", "Terminale STI2D",
      "201", "202", "203", "204", "205", "206", "207", "FALLBACK_CLASS"
    ];
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


    // Récupérer l'utilisateur
    const user = await UserServiceSQL.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      name: data.name,
      email: data.email,
      updatedAt: new Date().toISOString()
    };
    if (data.role) {
      updateData.role = data.role;
    }

    // Si un mot de passe est fourni, le hasher
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Gérer les classes
    if (data.selectedClasses && Array.isArray(data.selectedClasses)) {
      // Séparer les classes prédéfinies des classes personnalisées
      const predefinedClasses = await getPredefinedClasses();
      updateData.associatedClasses = data.selectedClasses.filter((c: string) => predefinedClasses.includes(c));
      updateData.customClasses = data.selectedClasses.filter((c: string) => !predefinedClasses.includes(c));
    }

    // Pour la modification par un admin d'un autre utilisateur
    if (data.associatedClasses !== undefined) {
      updateData.associatedClasses = data.associatedClasses;
    }
    if (data.customClasses !== undefined) {
      updateData.customClasses = data.customClasses;
    }

    // Mettre à jour l'utilisateur en base SQL
    const updatedUser = await UserServiceSQL.update(userId, updateData);
    if (!updatedUser) {
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 });
    }

    // Retourner l'utilisateur sans le mot de passe
    const { password, ...userWithoutPassword } = updatedUser;
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


export async function GET(
  request: NextRequest, 
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Vérifier que l'utilisateur peut voir ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }


    // Récupérer l'utilisateur
    const user = await UserServiceSQL.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    // S'assurer que les tableaux existent
    if (!user.associatedClasses) user.associatedClasses = [];
    if (!user.customClasses) user.customClasses = [];
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
}



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


    // Supprimer l'utilisateur en base SQL
    const userToDelete = await UserServiceSQL.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }
    await UserServiceSQL.deactivate(userId);
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