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
    const chemicalId = id;

    const updatedChemical = await prisma.chemical.update({
      where: { id: chemicalId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedChemical);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du produit chimique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du produit chimique" },
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
    const chemicalId = id;

    await prisma.chemical.delete({
      where: { id: chemicalId },
    });

    return NextResponse.json({ message: "Produit chimique supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du produit chimique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du produit chimique" },
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
    const chemicalId = id;

    const chemical = await prisma.chemical.findUnique({
      where: { id: chemicalId },
      include: {
        supplier: true,
      },
    });

    if (!chemical) {
      return NextResponse.json(
        { error: "Produit chimique non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json(chemical);
  } catch (error) {
    console.error("Erreur lors de la récupération du produit chimique:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du produit chimique" },
      { status: 500 }
    );
  }
}
