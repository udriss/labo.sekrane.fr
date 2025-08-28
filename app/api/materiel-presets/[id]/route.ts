import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const preset = await prisma.materielPreset.findUnique({
      where: { id: parseInt(id) },
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json(preset);
  } catch (error) {
    console.error('Error fetching materiel preset:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel preset' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, category, categoryId, discipline, description, defaultQty } = body;
    // Resolve categoryId if given name only; enforce discipline from category if exists
    let resolvedCategoryId: number | null = categoryId ?? null;
    let resolvedCategoryName: string | null = category ?? null;
    let finalDiscipline = discipline;
    if (!resolvedCategoryId && category) {
      const cat = await prisma.materielCategorie.findFirst({
        where: {
          name: { equals: category },
          discipline: { in: [discipline, discipline?.toLowerCase()] },
        },
      });
      if (cat) {
        resolvedCategoryId = cat.id;
        resolvedCategoryName = cat.name;
        finalDiscipline = cat.discipline;
      }
    }
    if (resolvedCategoryId) {
      const cat = await prisma.materielCategorie.findUnique({ where: { id: resolvedCategoryId } });
      if (cat) {
        finalDiscipline = cat.discipline;
        resolvedCategoryName = cat.name;
      }
    }

    const updated = await prisma.materielPreset.update({
      where: { id: parseInt(id) },
      data: {
        name,
        discipline: finalDiscipline,
        description: description || null,
        defaultQty: defaultQty || null,
        category: resolvedCategoryName, // legacy
        categoryId: resolvedCategoryId as any,
      },
      include: { categorie: true },
    });

    const out = {
      id: updated.id,
      name: updated.name,
      discipline: updated.discipline,
      description: updated.description,
      defaultQty: updated.defaultQty,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      categoryId: (updated as any).categoryId ?? updated.categorie?.id ?? null,
      category: updated.categorie?.name ?? updated.category ?? null,
    };
    return NextResponse.json(out);
  } catch (error: any) {
    console.error('Error updating materiel preset:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A preset with this name and discipline already exists' },
        { status: 409 },
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update materiel preset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.materielPreset.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting materiel preset:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete materiel preset' }, { status: 500 });
  }
}
