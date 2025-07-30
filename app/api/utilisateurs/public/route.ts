// app/api/utilisateurs/public/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserServiceSQL } from '@/lib/services/userService.sql';



export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }


    // Récupérer tous les utilisateurs actifs depuis la base SQL
    const users = await UserServiceSQL.getAllActive();
    // Retourner seulement l'id et le nom des utilisateurs (info publique)
    const publicUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name
    }));
    return NextResponse.json({ users: publicUsers });

  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}