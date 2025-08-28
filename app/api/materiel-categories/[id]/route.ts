import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const category = await prisma.materielCategorie.findUnique({
      where: { id: parseInt(id) },
      include: {
        materielPersons: true,
        _count: {
          select: {
            materielPersons: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching materiel category:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel category' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, discipline, description } = body;

    const category = await prisma.materielCategorie.update({
      where: { id: parseInt(id) },
      data: {
        name,
        discipline,
        description: description || null,
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Error updating materiel category:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name and discipline already exists' },
        { status: 409 },
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update materiel category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    // Check if category has associated materiel
    const category = await prisma.materielCategorie.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            materielPersons: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category._count.materielPersons > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated custom equipment' },
        { status: 400 },
      );
    }

    await prisma.materielCategorie.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting materiel category:', error);

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete materiel category' }, { status: 500 });
  }
}
