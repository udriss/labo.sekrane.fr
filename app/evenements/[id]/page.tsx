import { notFound } from 'next/navigation';
import { prisma } from '@/lib/services/db';
import EventDetailsPageClient from './EventDetailsPageClient';
import { EntityNamesProvider } from '@/components/providers/EntityNamesProvider';

export const dynamic = 'force-dynamic';

async function loadEvent(id: number) {
  try {
    return await prisma.evenement.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        timeslots: true,
        documents: true,
        materiels: true,
        reactifs: true,
        customMaterielRequests: true,
        customReactifRequests: true,
      },
    });
  } catch {
    return null;
  }
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return notFound();

  const event = await loadEvent(id);
  if (!event) return notFound();

  return (
    <EntityNamesProvider>
      <EventDetailsPageClient initialEvent={event as any} />
    </EntityNamesProvider>
  );
}
