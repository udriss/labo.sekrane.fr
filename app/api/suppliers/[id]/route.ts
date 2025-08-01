import { NextRequest, NextResponse } from "next/server";
import { withConnection } from "@/lib/db";

export const runtime = 'nodejs';

// GET - Récupérer un fournisseur par ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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
        WHERE id = ?
      `, [id]);

      if ((rows as any[]).length === 0) {
        return NextResponse.json(
          { error: "Fournisseur non trouvé" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        supplier: (rows as any[])[0]
      });
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du fournisseur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du fournisseur" },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour un fournisseur
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const { name, email, phone, address, website, contactPerson, isActive } = data;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Le nom du fournisseur est requis" },
        { status: 400 }
      );
    }

    return withConnection(async (connection) => {
      // Vérifier que le fournisseur existe
      const [existingRows] = await connection.execute(
        'SELECT id FROM suppliers WHERE id = ?',
        [id]
      );

      if ((existingRows as any[]).length === 0) {
        return NextResponse.json(
          { error: "Fournisseur non trouvé" },
          { status: 404 }
        );
      }

      // Vérifier si le nom existe déjà pour un autre fournisseur
      const [duplicateRows] = await connection.execute(
        'SELECT id FROM suppliers WHERE name = ? AND id != ? AND isActive = 1',
        [name.trim(), id]
      );

      if ((duplicateRows as any[]).length > 0) {
        return NextResponse.json(
          { error: "Un autre fournisseur avec ce nom existe déjà" },
          { status: 400 }
        );
      }

      // Mettre à jour le fournisseur
      await connection.execute(`
        UPDATE suppliers SET 
          name = ?,
          email = ?,
          phone = ?,
          address = ?,
          website = ?,
          contactPerson = ?,
          isActive = ?,
          updatedAt = NOW()
        WHERE id = ?
      `, [
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        website?.trim() || null,
        contactPerson?.trim() || null,
        isActive !== undefined ? isActive : true,
        id
      ]);

      // Récupérer le fournisseur mis à jour
      const [updatedRows] = await connection.execute(
        'SELECT * FROM suppliers WHERE id = ?',
        [id]
      );

      return NextResponse.json({
        supplier: (updatedRows as any[])[0],
        message: "Fournisseur mis à jour avec succès"
      });
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du fournisseur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du fournisseur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un fournisseur (désactivation)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    return withConnection(async (connection) => {
      // Vérifier que le fournisseur existe
      const [existingRows] = await connection.execute(
        'SELECT id, name FROM suppliers WHERE id = ?',
        [id]
      );

      if ((existingRows as any[]).length === 0) {
        return NextResponse.json(
          { error: "Fournisseur non trouvé" },
          { status: 404 }
        );
      }

      const supplier = (existingRows as any[])[0];

      // Vérifier s'il y a des réactifs chimiques liés
      const [chemicalRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM chemicals WHERE supplierId = ?',
        [id]
      );

      const chemicalCount = (chemicalRows as any[])[0].count;

      if (chemicalCount > 0) {
        // Si des réactifs sont liés, on désactive au lieu de supprimer
        await connection.execute(
          'UPDATE suppliers SET isActive = 0, updatedAt = NOW() WHERE id = ?',
          [id]
        );

        return NextResponse.json({
          message: `Fournisseur désactivé (${chemicalCount} réactifs liés)`,
          supplier: { ...supplier, isActive: false }
        });
      } else {
        // Si aucun réactif lié, suppression complète
        await connection.execute(
          'DELETE FROM suppliers WHERE id = ?',
          [id]
        );

        return NextResponse.json({
          message: "Fournisseur supprimé avec succès",
          supplier: supplier
        });
      }
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du fournisseur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du fournisseur" },
      { status: 500 }
    );
  }
}
