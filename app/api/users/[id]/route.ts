import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const data = await request.json();
    // Await the params
    const { id } = await params;
    const userId = id;



    // Vérifier que l'utilisateur peut modifier ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      name: data.name,
      email: data.email,
    };

    // Si un mot de passe est fourni, le hasher
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Gérer les classes personnalisées
    if (data.selectedClasses && Array.isArray(data.selectedClasses)) {
      // Supprimer les anciennes classes personnalisées
      await prisma.userClass.deleteMany({
        where: { userId }
      });

      // Ajouter les nouvelles classes personnalisées
      if (data.selectedClasses.length > 0) {
        await prisma.userClass.createMany({
          data: data.selectedClasses.map((className: string) => ({
            userId,
            className
          }))
        });
      }
    }

    // Récupérer l'utilisateur mis à jour avec ses classes
    const userWithClasses = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customClasses: true
      }
    });

    return NextResponse.json({
      message: "Profil mis à jour avec succès",
      user: userWithClasses
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Await the params
    const { id } = await params;
    const userId = id;

    // Vérifier que l'utilisateur peut voir ce profil
    if (session.user.id !== userId && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customClasses: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
