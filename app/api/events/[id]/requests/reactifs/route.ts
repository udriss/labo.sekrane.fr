import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/services/db';
import { z } from 'zod';
import { auth } from '@/auth';

const schema = z.object({
  name: z.string().min(1),
  requestedQuantity: z.number().min(0).default(0),
  unit: z.string().min(1).default('g'),
  discipline: z.string().optional(),
});

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const eventId = Number(id);
  if (Number.isNaN(eventId))
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const data = schema.parse(body);
    const event = await prisma.evenement.findUnique({ where: { id: eventId } });
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    const created = await prisma.reactifEventRequest.create({
      data: {
        eventId,
        userId,
        name: data.name,
        requestedQuantity: data.requestedQuantity,
        unit: data.unit,
        discipline: data.discipline || event.discipline,
        isCustom: true,
      },
    });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const requestId = url.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await prisma.reactifEventRequest.delete({ where: { id: Number(requestId) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const requestId = url.searchParams.get('requestId');
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 });
  try {
    const session = await auth();
    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const parsed = schema.partial().parse(body);
    const updated = await prisma.reactifEventRequest.update({
      where: { id: Number(requestId) },
      data: {
        name: parsed.name,
        requestedQuantity:
          typeof parsed.requestedQuantity === 'number' ? parsed.requestedQuantity : undefined,
        unit: parsed.unit,
        discipline: parsed.discipline,
      },
    });
    return NextResponse.json({ request: updated });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
