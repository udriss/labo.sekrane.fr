import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const data = await request.json();
    // Await the params
    const { id } = await params;
    const equipmentId = id;

    const updatedEquipment = await prisma.materiel.update({
      where: { id: equipmentId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedEquipment);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'équipement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    const equipmentId = id;

    await prisma.materiel.delete({
      where: { id: equipmentId },
    });

    return NextResponse.json({ message: "Équipement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'équipement" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params
    const { id } = await params;
    const equipmentId = id;

    const equipment = await prisma.materiel.findUnique({
      where: { id: equipmentId },
      include: {
        supplier: true,
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: "Équipement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'équipement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'équipement" },
      { status: 500 }
    );
  }
}
