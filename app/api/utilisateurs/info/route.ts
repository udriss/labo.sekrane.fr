// app/api/utilisateurs/info/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserServiceSQL } from '@/lib/services/userService.sql';



export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { userIds } = await request.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds doit être un tableau" }, { status: 400 });
    }


    // Récupérer les utilisateurs SQL par IDs
    const users = await Promise.all(userIds.map((id: string) => UserServiceSQL.findById(id)));
    const usersMap = new Map();
    users.forEach((user) => {
      if (user) {
        usersMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email
        });
      }
    });
    return NextResponse.json(Object.fromEntries(usersMap));

  } catch (error) {
    console.error("Erreur lors de la récupération des infos utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des infos utilisateurs" },
      { status: 500 }
    );
  }
}