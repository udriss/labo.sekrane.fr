import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/services/db';
import { Box, Typography, Chip, Button, Stack } from '@mui/material';
import Link from 'next/link';
// Avoid next/dynamic with ssr:false in a Server Component; use a thin client wrapper instead
import EventTimeslotsClient from './EventTimeslotsClient';
import { EntityNamesProvider } from '@/components/providers/EntityNamesProvider';

function parseFocus(param?: string | string[] | null): number[] {
  if (!param) return [];
  const raw = Array.isArray(param) ? param.join(',') : param;
  return raw
    .split(/[,;]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

async function loadEvent(id: number) {
  return prisma.evenement.findUnique({
    where: { id },
    include: { timeslots: true },
  });
}

export const dynamic = 'force-dynamic';

export default async function EventTimeslotsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) return notFound();
  const event = await loadEvent(id);
  if (!event) return notFound();
  const searchParamsData = await searchParams;
  const focusIds = parseFocus(searchParamsData.focus);
  const slots = event.timeslots as any[];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        {event.title} – Créneaux
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
        <Link href={`/evenements/${event.id}`}>
          <Button size="small" variant="outlined">
            Retour fiche
          </Button>
        </Link>
        <Link href={`/calendrier`}>
          <Button size="small" variant="outlined">
            Voir le calendrier
          </Button>
        </Link>
      </Stack>
      {focusIds.length > 0 && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Mise en avant des créneaux: {focusIds.join(', ')}
        </Typography>
      )}
      {/* Actions moved to client component to avoid passing event handlers in Server Component */}
      <EntityNamesProvider>
        <EventTimeslotsClient
          slots={slots as any}
          focusIds={focusIds}
          eventId={event.id}
          ownerId={event.ownerId as any}
        />
      </EntityNamesProvider>
      <style>{`
        .focus-slot { animation: pulseFocus 2.5s ease-in-out 1; }
        @keyframes pulseFocus { 0% { box-shadow: 0 0 0 0 rgba(25,118,210,0.4);} 50% { box-shadow: 0 0 0 6px rgba(25,118,210,0);} 100% { box-shadow: 0 0 0 0 rgba(25,118,210,0);} }
      `}</style>
    </Box>
  );
}
