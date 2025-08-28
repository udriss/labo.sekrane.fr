// API endpoint pour gérer les localisations
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';

// Schéma de validation pour une localisation
const LocalisationSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  salleId: z.number().int().min(1, 'ID de salle requis'),
});

// GET - Récupérer toutes les localisations ou celles d'une salle spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salleId = searchParams.get('salleId');

    const whereClause = salleId ? { salleId: parseInt(salleId) } : {};

    const localisations = await prisma.localisation.findMany({
      where: whereClause,
      include: {
        salle: { select: { id: true, name: true } },
        _count: {
          select: {
            materiels: true,
            consommables: true,
            // reactifInventaires removed si non disponible
          },
        },
      },
      orderBy: [{ salle: { name: 'asc' } }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      localisations,
      count: localisations.length,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des localisations:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des localisations' },
      { status: 500 },
    );
  }
}

// POST - Ajouter une nouvelle localisation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = LocalisationSchema.parse(body);

    // Vérifier que la salle existe
    const salle = await prisma.salle.findUnique({
      where: { id: validatedData.salleId },
    });

    if (!salle) {
      return NextResponse.json({ error: 'Salle introuvable' }, { status: 404 });
    }

    const localisation = await prisma.localisation.create({
      data: validatedData,
      include: {
        salle: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        localisation,
        message: 'Localisation ajoutée avec succès',
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }

    // Erreur d'unicité (nom déjà existant dans la salle)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Cette localisation existe déjà dans cette salle' },
        { status: 409 },
      );
    }

    console.error('Erreur lors de l\'ajout de la localisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de la localisation' },
      { status: 500 },
    );
  }
}

// PUT - Mettre à jour une localisation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de la localisation requis' }, { status: 400 });
    }

    const validatedData = LocalisationSchema.partial().parse(updateData);

    // Si on change la salle, vérifier qu'elle existe
    if (validatedData.salleId) {
      const salle = await prisma.salle.findUnique({
        where: { id: validatedData.salleId },
      });

      if (!salle) {
        return NextResponse.json({ error: 'Salle introuvable' }, { status: 404 });
      }
    }

    const localisation = await prisma.localisation.update({
      where: { id: parseInt(id) },
      data: validatedData,
      include: {
        salle: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      localisation,
      message: 'Localisation mise à jour avec succès',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }

    console.error('Erreur lors de la mise à jour de la localisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la localisation' },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer une localisation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la localisation requis' }, { status: 400 });
    }

    // Vérifier si la localisation contient des éléments
    const localisation = await prisma.localisation.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            materiels: true,
            consommables: true,
          },
        },
      },
    });

    if (!localisation) {
      return NextResponse.json({ error: 'Localisation introuvable' }, { status: 404 });
    }

    const totalItems = localisation._count.materiels + localisation._count.consommables;

    if (totalItems > 0) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer la localisation',
          message: `Cette localisation contient ${totalItems} éléments. Veuillez d'abord les déplacer ou les supprimer.`,
          details: {
            materiels: localisation._count.materiels,
            consommables: localisation._count.consommables,
          },
        },
        { status: 409 },
      );
    }

    await prisma.localisation.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Localisation supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la localisation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la localisation' },
      { status: 500 },
    );
  }
}
