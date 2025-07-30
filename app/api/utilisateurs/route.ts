// app/api/utilisateurs/route.ts 

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserServiceSQL } from '@/lib/services/userService.sql';
import bcrypt from 'bcryptjs';
import { withAudit } from '@/lib/api/with-audit';



// Définir les types
interface UserData {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  associatedClasses?: string[]; // Classes pré-enregistrées auxquelles l'utilisateur est associé
  customClasses?: string[]; // Classes personnalisées créées par l'utilisateur
  siteConfig?: {
    materialsViewMode?: 'cards' | 'list';
    chemicalsViewMode?: 'cards' | 'list';
    [key: string]: any;
  };
}

interface UsersFile {
  users: UserData[];
}

export const GET = withAudit(
  async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Seuls les admins peuvent voir tous les utilisateurs
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }


    // Récupérer tous les utilisateurs actifs depuis la base SQL
    const users = await UserServiceSQL.getAllActive();
    // Retourner les utilisateurs sans les mots de passe
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    return NextResponse.json(usersWithoutPasswords);

  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
},
  {
    module: 'USERS',
    entity: 'users-list',
    action: 'READ',
    customDetails: (req, response) => ({
      usersCount: Array.isArray(response) ? response.length : 0,
      action: 'list-all-users'
    })
  }
);

export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const newUserData = await request.json();

    // Validation basique
    if (!newUserData.email || !newUserData.name || !newUserData.password || !newUserData.role) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }


    // Vérifier si l'email existe déjà
    const existing = await UserServiceSQL.findByEmail(newUserData.email);
    if (existing) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 409 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(newUserData.password, 12);

    // Créer le nouvel utilisateur en base SQL
    const newUser = await UserServiceSQL.create({
      email: newUserData.email,
      password: hashedPassword,
      name: newUserData.name,
      role: newUserData.role,
      associatedClasses: newUserData.associatedClasses || [],
      customClasses: newUserData.customClasses || []
    });

    if (!newUser) {
      return NextResponse.json({ error: "Erreur lors de la création de l'utilisateur" }, { status: 500 });
    }
    const { password, ...userWithoutPassword } = newUser;
    return NextResponse.json(userWithoutPassword, { status: 201 });

  } catch (error) {
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
},
  {
    module: 'USERS',
    entity: 'user',
    action: 'CREATE',
    extractEntityIdFromResponse: (response) => response?.id,
    customDetails: (req, response) => ({
      newUserEmail: response?.email,
      newUserName: response?.name,
      newUserRole: response?.role,
      classesAssigned: [
        ...(response?.associatedClasses || []),
        ...(response?.customClasses || [])
      ].length
    })
  }
)