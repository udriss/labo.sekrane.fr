// app/api/user/config/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import fs from 'fs/promises';
import path from 'path';
import { withAudit } from '@/lib/api/with-audit';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// Types pour la structure du fichier
interface UserData {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  siteConfig?: any;
}

interface UsersFile {
  users: UserData[];
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Lire le fichier users.json
    const fileContent = await fs.readFile(USERS_FILE_PATH, 'utf-8');
    const data: UsersFile = JSON.parse(fileContent);
    
    // Trouver l'utilisateur par email de session
    const user = data.users.find((u) => u.email === session.user.email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.id,
      siteConfig: user.siteConfig || {}
    });
  } catch (error) {
    console.error('Erreur lecture fichier:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export const POST = withAudit(
  async (request: NextRequest) => {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { siteConfig } = body;

    if (!siteConfig) {
      return NextResponse.json(
        { error: 'siteConfig requis' },
        { status: 400 }
      );
    }

    // Lire le fichier actuel
    const fileContent = await fs.readFile(USERS_FILE_PATH, 'utf-8');
    const data: UsersFile = JSON.parse(fileContent);
    
    // Trouver l'utilisateur par email de session
    const userIndex = data.users.findIndex((u) => u.email === session.user.email);
    
    if (userIndex === -1) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour la configuration
    data.users[userIndex].siteConfig = {
      ...data.users[userIndex].siteConfig,
      ...siteConfig,
      lastUpdated: new Date().toISOString()
    };

    // Sauvegarder le fichier
    await fs.writeFile(
      USERS_FILE_PATH, 
      JSON.stringify(data, null, 2),
      'utf-8'
    );

    return NextResponse.json({
      success: true,
      siteConfig: data.users[userIndex].siteConfig
    });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
},
  {
    module: 'USERS',
    entity: 'user-config',
    action: 'UPDATE',
    extractEntityIdFromResponse: (response) => response?.userId,
    customDetails: (req, response) => ({
      configKeys: Object.keys(response?.siteConfig || {}),
      viewModeUpdated: response?.siteConfig?.materialsViewMode || response?.siteConfig?.chemicalsViewMode
    })
  }
);