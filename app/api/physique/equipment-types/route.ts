import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer tous les types d'équipements physiques
export async function GET() {
  try {
    return withConnection(async (connection) => {
      const [rows] = await connection.execute(`
        SELECT * FROM physics_equipment_types 
        WHERE isActive = 1 
        ORDER BY name ASC
      `);

      return NextResponse.json({
        types: rows
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des types d'équipements physiques:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des types d'équipements physiques" },
      { status: 500 }
    );
  }
}
