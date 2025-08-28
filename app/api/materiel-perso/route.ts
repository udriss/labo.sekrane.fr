import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get('discipline');
    const categorieId = searchParams.get('categorieId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (discipline && discipline !== 'all') {
      where.discipline = discipline;
    }

    if (categorieId) {
      where.categorieId = parseInt(categorieId);
    }

    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }

    const [materielPersons, total] = await Promise.all([
      prisma.materielPerso.findMany({
        where,
        skip,
        take: limit,
        include: {
          categorie: true,
        },
        orderBy: [{ discipline: 'asc' }, { name: 'asc' }],
      }),
      prisma.materielPerso.count({ where }),
    ]);

    return NextResponse.json({
      materielPersons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching materiel perso:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel perso' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, discipline, description, categorieId, volumes, caracteristiques, defaultQty } =
      body;

    if (!name || !discipline) {
      return NextResponse.json({ error: 'Name and discipline are required' }, { status: 400 });
    }

    const materielPerso = await prisma.materielPerso.create({
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

    return NextResponse.json(materielPerso, { status: 201 });
  } catch (error: any) {
    console.error('Error creating materiel perso:', error);
    return NextResponse.json({ error: 'Failed to create materiel perso' }, { status: 500 });
  }
}
