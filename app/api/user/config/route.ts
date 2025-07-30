// app/api/user/config/route.ts 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserServiceSQL } from '@/lib/services/userService.sql';
import { withAudit } from '@/lib/api/with-audit';



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

    // Récupérer l'utilisateur SQL par email
    const user = await UserServiceSQL.findByEmail(session.user.email);
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

    // Récupérer l'utilisateur SQL par email
    const user = await UserServiceSQL.findByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    const updatedUser = await UserServiceSQL.update(user.id, {
      siteConfig: {
        ...user.siteConfig,
        ...siteConfig,
        lastUpdated: new Date().toISOString()
      }
    });
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde' },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      siteConfig: updatedUser.siteConfig
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