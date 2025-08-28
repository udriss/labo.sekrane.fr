import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';

// GET /api/suppliers?q=partial&limit=10
// Note: Prisma "mode: 'insensitive'" is not available in current client for MySQL; relies on DB collation for case-insensitive matching.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const sortByParam = searchParams.get('sortBy') || 'name';
    const sortDirParam =
      (searchParams.get('sortDir') || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const limitParam = searchParams.get('limit'); // backward compat

    const where = q ? { name: { contains: q } } : {};

    // If explicit pagination requested (page/pageSize) use skip/take & total
    if (pageParam || pageSizeParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam || '24', 10)));
      const allowedSort: Record<string, true> = { name: true, createdAt: true, updatedAt: true };
      const sortBy = allowedSort[sortByParam] ? sortByParam : 'name';
      const [total, suppliers] = await Promise.all([
        prisma.supplier.count({ where }),
        prisma.supplier.findMany({
          where,
          orderBy: { [sortBy]: sortDirParam },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            kind: true,
            contactEmail: true,
            phone: true,
            address: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);
      return NextResponse.json({ suppliers, total, page, pageSize });
    }

    // Legacy simple list (limit)
    const limit = Math.min(parseInt(limitParam || '15', 10), 100);
    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      select: { id: true, name: true, kind: true },
    });
    return NextResponse.json({ suppliers, total: suppliers.length });
  } catch (e) {
    console.error('[suppliers][GET] error', e);
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

const BaseSupplierSchema = z.object({
  name: z.string().min(1).max(191),
  contactEmail: z
    .string()
    .email()
    .max(191)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .max(64)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  address: z
    .string()
    .max(255)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  notes: z
    .string()
    .max(1000)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  kind: z.enum(['NORMAL', 'CUSTOM']).default('CUSTOM'),
});
const CreateSupplierSchema = BaseSupplierSchema;
const UpdateSupplierSchema = BaseSupplierSchema.partial();

// POST /api/suppliers  { name, kind? }
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (
      !session ||
      !['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'].includes(role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json();
    const data = CreateSupplierSchema.parse(body);
    // Try create directly; rely on unique index + collation for case-insensitive duplicates
    try {
      const created = await prisma.supplier.create({
        data: {
          name: data.name,
          kind: data.kind,
          contactEmail: data.contactEmail,
          phone: data.phone,
          address: data.address,
          notes: data.notes,
        },
        select: {
          id: true,
          name: true,
          kind: true,
          contactEmail: true,
          phone: true,
          address: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return NextResponse.json({ supplier: created }, { status: 201 });
    } catch (err: any) {
      // Unique constraint violation -> fetch existing supplier and return it
      if (err?.code === 'P2002') {
        const existing = await prisma.supplier.findFirst({
          where: { name: data.name },
          select: {
            id: true,
            name: true,
            kind: true,
            contactEmail: true,
            phone: true,
            address: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (existing)
          return NextResponse.json({ supplier: existing, duplicated: true }, { status: 200 });
      }
      throw err;
    }
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid data', details: e.issues }, { status: 400 });
    console.error('[suppliers][POST] error', e);
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 });
  }
}

// PUT /api/suppliers?id=123  { name?, contactEmail?, ... }
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (
      !session ||
      !['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'].includes(role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    const body = await req.json();
    const data = UpdateSupplierSchema.parse(body);
    const updated = await prisma.supplier.update({
      where: { id },
      data: data,
      select: {
        id: true,
        name: true,
        kind: true,
        contactEmail: true,
        phone: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ supplier: updated });
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return NextResponse.json({ error: 'Invalid data', details: e.issues }, { status: 400 });
    console.error('[suppliers][PUT] error', e);
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 });
  }
}

// DELETE /api/suppliers?id=123
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (
      !session ||
      !['ADMIN', 'ADMINLABO', 'LABORANTIN_PHYSIQUE', 'LABORANTIN_CHIMIE'].includes(role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '0', 10);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    // Refus si utilisé par un inventaire
    const count = await (prisma as any).reactifInventaire.count({ where: { supplierId: id } });
    if (count > 0)
      return NextResponse.json(
        { error: 'Impossible de supprimer: fournisseur référencé par des réactifs.' },
        { status: 400 },
      );
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[suppliers][DELETE] error', e);
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 });
  }
}
