// app/api/migrate/user-classes/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { removeUserCustomClasses } from '@/lib/migrations/removeUserCustomClasses';

// POST - Exécuter la migration pour supprimer users.customClasses
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Vérifier que l'utilisateur est admin
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Non autorisé - admin requis" }, { status: 401 });
    }

    

    // Exécuter la migration
    await removeUserCustomClasses();

    

    return NextResponse.json({
      success: true,
      message: "Migration terminée: colonne customClasses supprimée et données migrées vers la table classes"
    });

  } catch (error) {
    console.error("❌ Erreur lors de la migration user-classes:", error);
    return NextResponse.json(
      { 
        error: "Erreur lors de la migration",
        details: error instanceof Error ? error.message : "Erreur inconnue"
      },
      { status: 500 }
    );
  }
}
