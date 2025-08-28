import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const materielPerso = await prisma.materielPerso.findUnique({
      where: { id: parseInt(id) },
      include: {
        categorie: true,
      },
    });

    if (!materielPerso) {
      return NextResponse.json({ error: 'Custom equipment not found' }, { status: 404 });
    }

    return NextResponse.json(materielPerso);
  } catch (error) {
    console.error('Error fetching materiel perso:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel perso' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, discipline, description, categorieId, volumes, caracteristiques, defaultQty } =
      body;

    const materielPerso = await prisma.materielPerso.update({
      where: { id: parseInt(id) },
      data: {
        name,
        discipline,
        description: description || null,
        categorieId: categorieId ? parseInt(categorieId) : null,
        volumes: volumes || null,
        caracteristiques: caracteristiques || null,
        defaultQty: defaultQty || null,
      },
      include: {
        categorie: true,
      },
    });

    return NextResponse.json(materielPerso);
  } catch (error: any) {
    console.error('Error updating materiel perso:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Custom equipment with this name and discipline already exists' },
        { status: 409 },
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Custom equipment not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update materiel perso' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.materielPerso.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting materiel perso:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Custom equipment not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete materiel perso' }, { status: 500 });
  }
}
