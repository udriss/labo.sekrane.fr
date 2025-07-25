// app/api/utilisateurs/info/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { promises as fs } from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

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

    const data = await fs.readFile(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    const users = parsed.users || [];

    // Créer un map pour un accès rapide
    const usersMap = new Map();
    users.forEach((user: any) => {
      if (userIds.includes(user.id)) {
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