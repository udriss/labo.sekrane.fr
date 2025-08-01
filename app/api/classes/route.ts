// app/api/classes/route.ts

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ClassServiceSQL } from '@/lib/services/classService.sql';

// GET - Récupérer les classes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id || session.user.email;
    const classes = await ClassServiceSQL.getClassesForUser(userId);

    return NextResponse.json(classes);
  } catch (error) {
    console.error("Erreur lors de la récupération des classes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des classes" },
      { status: 500 }
    );
  }
}

// POST - Créer une nouvelle classe personnalisée
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type = 'custom' } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Le nom de la classe est requis" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const userId = session.user.id || session.user.email;
    const userEmail = session.user.email;

    // Vérifier si la classe existe déjà
    const exists = await ClassServiceSQL.classExists(trimmedName, userId);
    if (exists) {
      // return NextResponse.json(
      //   { error: "Une classe avec ce nom existe déjà" },
      //   { status: 409 }
      // );
    }

    // Créer la classe
    const newClass = await ClassServiceSQL.createCustomClass(
      trimmedName,
      userId,
      userEmail,
      session.user.name || session.user.email
    );

    return NextResponse.json({
      success: true,
      data: newClass
    });

  } catch (error) {
    console.error("Erreur lors de la création de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la classe" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour une classe personnalisée
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "L'ID et le nom de la classe sont requis" },
        { status: 400 }
      );
    }

    const userId = session.user.id || session.user.email;
    const updatedClass = await ClassServiceSQL.updateCustomClass(id, name.trim(), userId);

    if (!updatedClass) {
      return NextResponse.json(
        { error: "Classe non trouvée ou non autorisé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedClass
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la classe" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une classe personnalisée
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('id');

    if (!classId) {
      return NextResponse.json(
        { error: "L'ID ou l'email de la classe est requis" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    let deleted = false;

    if (classId) {
      deleted = await ClassServiceSQL.deleteCustomClass(classId, userId);
    } 

    if (!deleted) {
      return NextResponse.json(
        { error: "Classe non trouvée ou non autorisé" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Classe supprimée avec succès"
    });

  } catch (error) {
    console.error("Erreur lors de la suppression de la classe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la classe" },
      { status: 500 }
    );
  }
}
