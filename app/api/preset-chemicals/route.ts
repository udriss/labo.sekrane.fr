import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const categories = await prisma.chemicalCategory.findMany({
      include: {
        presetChemicals: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erreur lors de la récupération des molécules prédéfinies:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des molécules prédéfinies" },
      { status: 500 }
    );
  }
}
