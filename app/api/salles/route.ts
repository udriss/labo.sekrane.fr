// API endpoint pour gérer les salles
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';

// Sous-schéma localisation pour création / mise à jour
const LocalisationPatchSchema = z.object({
  id: z.number().int().optional(), // présent => update ou delete
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  _delete: z.boolean().optional(),
});

// Schéma de validation pour une salle (création / update partiel)
const SalleSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  batiment: z.string().optional(),
  placesDisponibles: z.number().int().min(0).optional(),
  userOwnerId: z.number().int().optional(),
  localisations: z.array(LocalisationPatchSchema).optional(),
});

// GET - Récupérer toutes les salles avec leurs localisations
export async function GET() {
  try {
    const session = await auth();
    const rawUserId = session?.user ? (session.user as any).id : undefined;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;
    const salles = await prisma.salle.findMany({
      include: {
        localisations: { orderBy: { name: 'asc' } },
        userOwner: { select: { id: true, name: true, email: true } },
        _count: { select: { materiels: true, consommables: true, localisations: true } },
      },
      orderBy: { name: 'asc' },
    });
    const mine = typeof userId === 'number' ? salles.filter((s) => s.userOwnerId === userId) : [];
    return NextResponse.json({ success: true, salles, mine, count: salles.length });
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des salles' },
      { status: 500 },
    );
  }
}

// POST - Ajouter une nouvelle salle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const { localisations = [], ...rest } = SalleSchema.parse(body);
    const rawUserId = session?.user ? (session.user as any).id : undefined;
    const userId = typeof rawUserId === 'string' ? parseInt(rawUserId, 10) : rawUserId;
    const providedOwner = typeof rest.userOwnerId === 'number' ? rest.userOwnerId : undefined;
    const finalOwnerId = typeof userId === 'number' ? userId : providedOwner;

    const salle = await prisma.salle.create({
      data: {
        ...rest,
        userOwnerId: finalOwnerId ?? undefined,
        localisations: localisations.length
          ? {
              create: localisations
                .filter((l) => !l._delete)
                .map((l) => ({ name: l.name, description: l.description ?? undefined })),
            }
          : undefined,
      },
      include: {
        localisations: { orderBy: { name: 'asc' } },
        userOwner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        salle,
        message: 'Salle ajoutée avec succès',
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
    console.error('Erreur lors de la création de la salle:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la salle' }, { status: 500 });
  }
}

// PUT - Mettre à jour une salle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID de la salle requis' }, { status: 400 });
    }
    const parsed = SalleSchema.partial().parse(updateData);
    const { localisations, ...fields } = parsed as any;
    // Normalize potential string owner id
    if (fields.userOwnerId && typeof fields.userOwnerId === 'string') {
      const parsedOwner = parseInt(fields.userOwnerId, 10);
      fields.userOwnerId = Number.isNaN(parsedOwner) ? undefined : parsedOwner;
    }
    const tx: any[] = [];
    tx.push(
      prisma.salle.update({
        where: { id: parseInt(id) },
        data: fields,
      }),
    );
    if (Array.isArray(localisations)) {
      for (const loc of localisations) {
        if (loc.id) {
          if (loc._delete) {
            tx.push(prisma.localisation.delete({ where: { id: loc.id } }));
          } else {
            tx.push(
              prisma.localisation.update({
                where: { id: loc.id },
                data: { name: loc.name, description: loc.description ?? undefined },
              }),
            );
          }
        } else if (!loc._delete) {
          tx.push(
            prisma.localisation.create({
              data: {
                name: loc.name,
                description: loc.description ?? undefined,
                salle: { connect: { id: parseInt(id) } },
              },
            }),
          );
        }
      }
    }
    await prisma.$transaction(tx);
    const salle = await prisma.salle.findUnique({
      where: { id: parseInt(id) },
      include: {
        localisations: { orderBy: { name: 'asc' } },
        userOwner: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ success: true, salle, message: 'Salle mise à jour avec succès' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 },
      );
    }
    console.error('Erreur lors de la mise à jour de la salle:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la salle' },
      { status: 500 },
    );
  }
}

// DELETE - Supprimer une salle
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de la salle requis' }, { status: 400 });
    }

    // Vérifier si la salle contient des éléments
    const salle = await prisma.salle.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            materiels: true,
            consommables: true,
            localisations: true,
          },
        },
      },
    });

    if (!salle) {
      return NextResponse.json({ error: 'Salle introuvable' }, { status: 404 });
    }

    const totalItems = salle._count.materiels + salle._count.consommables;

    if (totalItems > 0) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer la salle',
          message: `Cette salle contient ${totalItems} éléments et ${salle._count.localisations} localisations. Veuillez d'abord les déplacer ou les supprimer.`,
          details: {
            materiels: salle._count.materiels,
            consommables: salle._count.consommables,
            localisations: salle._count.localisations,
          },
        },
        { status: 409 },
      );
    }

    await prisma.salle.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Salle supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la salle:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la salle' },
      { status: 500 },
    );
  }
}
