import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const toLocalLiteral = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const toLocal = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
  if (typeof d === 'string') {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(d)) return d.replace(/\.\d{3}$/, '');
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? d : toLocal(parsed);
  }
  return toLocal(d);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const discipline = searchParams.get('discipline');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (discipline && discipline !== 'all') {
      // Handle case variations by checking both original and lowercase
      where.discipline = {
        in: [discipline, discipline.toLowerCase()],
      };
    }

    if (category) {
      // search by category name through relation only (no legacy)
      where.categorie = { name: { contains: category } };
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: search } },
        { description: { contains: search } },
        { categorie: { name: { contains: search } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.materielPreset.findMany({
        where,
        skip,
        take: limit,
        include: { categorie: true },
        orderBy: [{ discipline: 'asc' }, { categorie: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.materielPreset.count({ where }),
    ]);

    const presets = rows.map((p) => ({
      id: p.id,
      name: p.name,
      discipline: p.discipline,
      description: p.description,
      defaultQty: p.defaultQty,
      createdAt: toLocalLiteral(p.createdAt),
      updatedAt: toLocalLiteral(p.updatedAt),
      categoryId: p.categoryId ?? p.categorie?.id ?? null,
      category: p.categorie?.name ?? p.category ?? null,
    }));

    return NextResponse.json({
      presets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching materiel presets:', error);
    return NextResponse.json({ error: 'Failed to fetch materiel presets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, category, categoryId, discipline, description, defaultQty } = body;

    if (!name || !discipline) {
      return NextResponse.json({ error: 'Name and discipline are required' }, { status: 400 });
    }

    // resolve categoryId by name if not provided
    let resolvedCategoryId: number | null = categoryId ?? null;
    let resolvedCategoryName: string | null = category ?? null;
    if (!resolvedCategoryId && category) {
      const cat = await prisma.materielCategorie.findFirst({
        where: {
          name: { equals: category },
          discipline: { in: [discipline, discipline.toLowerCase()] },
        },
      });
      if (cat) {
        resolvedCategoryId = cat.id;
        resolvedCategoryName = cat.name;
      }
    }
    // enforce discipline from category if found
    let finalDiscipline = discipline;
    if (resolvedCategoryId) {
      const cat = await prisma.materielCategorie.findUnique({ where: { id: resolvedCategoryId } });
      if (cat) finalDiscipline = cat.discipline;
    }
    const created = await prisma.materielPreset.create({
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
      id: created.id,
      name: created.name,
      discipline: created.discipline,
      description: created.description,
      defaultQty: created.defaultQty,
      createdAt: toLocalLiteral(created.createdAt),
      updatedAt: toLocalLiteral(created.updatedAt),
      categoryId: (created as any).categoryId ?? created.categorie?.id ?? null,
      category: created.categorie?.name ?? created.category ?? null,
    };
    return NextResponse.json(out, { status: 201 });
  } catch (error: any) {
    console.error('Error creating materiel preset:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A preset with this name and discipline already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: 'Failed to create materiel preset' }, { status: 500 });
  }
}
