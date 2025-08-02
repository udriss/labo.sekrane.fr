import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer tous les types de consommables physiques
export async function GET() {
  try {
    return withConnection(async (connection) => {
      const [rows] = await connection.execute(`
        SELECT * FROM physics_consumable_types 
        WHERE isActive = 1 
        ORDER BY name ASC
      `);

      return NextResponse.json({
        types: rows
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des types de consommables physiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des types de consommables physiques" },
      { status: 500 }
    );
  }
}
