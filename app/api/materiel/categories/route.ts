// Materiel categories management (CRUD) with preset reassignment logic
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  discipline: z.string().min(1).max(64),
  description: z.string().max(255).optional().nullable(),
});
const updateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
});

function normDiscipline(d?: string | null) {
  if (!d) return d;
  const lower = d.toLowerCase();
  if (lower === 'chimie') return 'Chimie';
  if (lower === 'physique') return 'Physique';
  if (lower === 'svt') return 'SVT';
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disciplineParam = searchParams.get('discipline');
    const discipline = normDiscipline(disciplineParam || undefined);

    const where: any = {};
    if (discipline)
      where.discipline = { in: [discipline, discipline.toLowerCase(), discipline.toUpperCase()] };

    // Debug: log discipline filter
    try {
      console.info('[categories.GET] Request:', { raw: disciplineParam, normalized: discipline });
    } catch {}

    const categories = await prisma.materielCategorie.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    // Count presets per category strictly by categoryId
    const categoryIds = categories.map((c) => c.id);
    let byIdCounts: { categoryId: number; _count: { categoryId: number } }[] = [] as any;
    if (categoryIds.length > 0) {
      byIdCounts = (await prisma.materielPreset.groupBy({
        by: ['categoryId'],
        where: {
          categoryId: { in: categoryIds },
          ...(discipline ? { discipline: { in: [discipline, discipline.toLowerCase()] } } : {}),
        },
        _count: { categoryId: true },
      })) as any;
    }

    const categoriesWithCount = categories.map((c) => {
      const idCount = byIdCounts.find((r: any) => r.categoryId === c.id)?._count.categoryId || 0;
      return { ...c, presetCount: idCount };
    });

    // Compute count for 'Sans catégorie' using categoryId null
    const noCatCount = await prisma.materielPreset.count({
      where: {
        categoryId: null as any,
        ...(discipline ? { discipline: { in: [discipline, discipline.toLowerCase()] } } : {}),
      },
    });

    // Debug: log result summary
    try {
      console.info('[categories.GET] Result:', {
        total: categories.length,
        withPresetCount: categoriesWithCount.filter((c) => (c as any).presetCount > 0).length,
        sansCategorieCount: noCatCount,
        sample: categories
          .slice(0, 3)
          .map((c) => ({ id: c.id, name: c.name, discipline: c.discipline })),
      });
    } catch {}

    return NextResponse.json({ categories: categoriesWithCount, sansCategorieCount: noCatCount });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const discipline = normDiscipline(data.discipline);
    const created = await prisma.materielCategorie.create({
      data: {
        name: data.name.trim(),
        discipline: discipline!,
        description: data.description || null,
      },
    });
    return NextResponse.json({ category: { ...created, presetCount: 0 } }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Catégorie déjà existante pour cette discipline' },
        { status: 409 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const existing = await prisma.materielCategorie.findUnique({ where: { id: data.id } });
    if (!existing) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    let updatedName = existing.name;
    if (data.name && data.name !== existing.name) {
      // Rename includes renaming presets referencing old name
      updatedName = data.name.trim();
      await prisma.$transaction([
        prisma.materielPreset.updateMany({
          where: { category: existing.name, discipline: existing.discipline },
          data: { category: updatedName },
        }),
        prisma.materielCategorie.update({
          where: { id: data.id },
          data: { name: updatedName, description: data.description ?? existing.description },
        }),
      ]);
    } else {
      await prisma.materielCategorie.update({
        where: { id: data.id },
        data: { description: data.description ?? existing.description },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    const force = searchParams.get('force') === '1';
    if (!idParam) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const id = parseInt(idParam, 10);
    const category = await prisma.materielCategorie.findUnique({ where: { id } });
    if (!category) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });
    const presetCount = await prisma.materielPreset.count({
      where: {
        OR: [
          { categoryId: category.id },
          { category: category.name, discipline: category.discipline },
        ],
      },
    });
    if (presetCount > 0 && !force) {
      return NextResponse.json(
        {
          requiresForce: true,
          presetCount,
          message:
            'Catégorie utilisée par des presets. Confirmez la suppression pour réassigner en Sans catégorie.',
        },
        { status: 409 },
      );
    }
    await prisma.$transaction([
      prisma.materielPreset.updateMany({
        where: {
          OR: [
            { categoryId: category.id },
            { category: category.name, discipline: category.discipline },
          ],
        },
        data: { category: null, categoryId: null as any },
      }),
      prisma.materielCategorie.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true, reassigned: presetCount });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
