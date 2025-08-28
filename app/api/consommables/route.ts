// api/consommables/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';

const createConsumableSchema = z.object({
  name: z.string().min(1),
  stock: z.number().int().min(0).default(0),
  unit: z.string().optional(),
  location: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    let whereClause: any = {};
    if (search) {
      whereClause.name = { contains: search };
    }
    if (lowStock) whereClause.stock = { lte: parseInt(lowStock) || 5 };

    const consommables = await prisma.consommable.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ consommables });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch consommables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createConsumableSchema.parse(body);

    const consumable = await prisma.consommable.create({
      data: validatedData,
    });

    return NextResponse.json({ consumable }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create consumable' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body as any;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const consumable = await prisma.consommable.update({ where: { id: Number(id) }, data });
    return NextResponse.json({ consumable });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update consumable' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.consommable.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete consumable' }, { status: 500 });
  }
}
