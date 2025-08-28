import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get('discipline');

    const where: any = {};

    if (discipline && discipline !== 'all') {
      where.discipline = discipline;
    }

    const categories = await prisma.materielCategorie.findMany({
      where,
      orderBy: [{ discipline: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            materielPersons: true,
          },
        },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching materiel categories:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, discipline, description } = body;

    if (!name || !discipline) {
      return NextResponse.json({ error: 'Name and discipline are required' }, { status: 400 });
    }

    const category = await prisma.materielCategorie.create({
      data: {
        name,
        discipline,
        description: description || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Error creating materiel category:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A category with this name and discipline already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: 'Failed to create materiel category' }, { status: 500 });
  }
}
