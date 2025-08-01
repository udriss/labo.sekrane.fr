import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer tous les fournisseurs
export async function GET() {
  try {
    return withConnection(async (connection) => {
      const [rows] = await connection.execute(`
        SELECT 
          id,
          name,
          email,
          phone,
          address,
          website,
          contactPerson,
          isActive,
          createdAt,
          updatedAt
        FROM suppliers 
        WHERE isActive = 1 
        ORDER BY name ASC
      `);

      return NextResponse.json({
        suppliers: rows,
        total: (rows as any[]).length
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des fournisseurs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des fournisseurs" },
      { status: 500 }
    );
  }
}

// POST - Créer un nouveau fournisseur
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, email, phone, address, website, contactPerson } = data;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Le nom du fournisseur est requis" },
        { status: 400 }
      );
    }

    return withConnection(async (connection) => {
      // Vérifier si le nom existe déjà
      const [existingRows] = await connection.execute(
        'SELECT id FROM suppliers WHERE name = ? AND isActive = 1',
        [name.trim()]
      );

      if ((existingRows as any[]).length > 0) {
        return NextResponse.json(
          { error: "Un fournisseur avec ce nom existe déjà" },
          { status: 400 }
        );
      }

      // Générer un ID unique
      const supplierId = `SUPP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insérer le nouveau fournisseur
      await connection.execute(`
        INSERT INTO suppliers (
          id, name, email, phone, address, website, contactPerson, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, [
        supplierId,
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        website?.trim() || null,
        contactPerson?.trim() || null
      ]);

      // Récupérer le fournisseur créé
      const [newRows] = await connection.execute(
        'SELECT * FROM suppliers WHERE id = ?',
        [supplierId]
      );

      return NextResponse.json({
        supplier: (newRows as any[])[0],
        message: "Fournisseur créé avec succès"
      });
    });
  } catch (error) {
    console.error("Erreur lors de la création du fournisseur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du fournisseur" },
      { status: 500 }
    );
  }
}
