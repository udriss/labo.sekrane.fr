'use client';

import React, { Suspense } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { useSearchParams } from 'next/navigation';

function PdfOpenContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('eventId');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filename, setFilename] = React.useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [event, setEvent] = React.useState<any>(null);
  const [salleMap, setSalleMap] = React.useState<Record<number, string>>({});
  const [classMap, setClassMap] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    const run = async () => {
      if (!eventId) {
        setError('Paramètre eventId manquant');
        setLoading(false);
        return;
      }

      try {
        // Récupérer les données de l'événement
        const eventRes = await fetch(`/api/events/${eventId}`);
        if (!eventRes.ok) {
          throw new Error('Événement non trouvé');
        }
        const eventData = await eventRes.json();
        const eventInfo = eventData.event;

        // Récupérer les maps des salles et classes en parallèle
        const [roomsRes, classesRes] = await Promise.all([
          fetch('/api/rooms'),
          fetch('/api/classes'),
        ]);

        let sMap: Record<number, string> = {};
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          const rooms = roomsData?.rooms || [];
          if (Array.isArray(rooms)) {
            sMap = rooms.reduce(
              (acc: any, r: any) => {
                acc[r.id] = r.name || `Salle ${r.id}`;
                return acc;
              },
              {} as Record<number, string>,
            );
          }
        }

        let cMap: Record<number, string> = {};
        if (classesRes.ok) {
          const classesData = await classesRes.json();
          const all = [
            ...(Array.isArray(classesData?.predefinedClasses) ? classesData.predefinedClasses : []),
            ...(Array.isArray(classesData?.customClasses) ? classesData.customClasses : []),
          ];
          cMap = all.reduce(
            (acc: any, c: any) => {
              acc[c.id] = c.name || `Classe ${c.id}`;
              return acc;
            },
            {} as Record<number, string>,
          );
        }

        setEvent(eventInfo);
        setSalleMap(sMap);
        setClassMap(cMap);

        // Générer le PDF avec les maps des salles et classes
        const pdfRes = await fetch('/api/generate-event-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventInfo,
            salleMap: sMap,
            classMap: cMap,
          }),
        });

        if (!pdfRes.ok) {
          const errorData = await pdfRes.json();
          throw new Error(errorData.error || 'Echec de génération');
        }

        const json = await pdfRes.json();
        if (!json?.success || !json?.filename) {
          throw new Error(json?.error || 'PDF non disponible');
        }

        setFilename(json.filename);
        setPdfUrl(`/api/pdf?filename=${json.filename}`);
      } catch (e: any) {
        setError(e?.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [eventId]);

  if (loading) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Génération du PDF…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={2}
      >
        <Typography variant="h6">Erreur</Typography>
        <Typography variant="body2" color="text.secondary">
          {error}
        </Typography>
        <Button variant="outlined" onClick={() => window.close()}>
          Fermer
        </Button>
      </Box>
    );
  }

  if (!pdfUrl) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement du PDF…
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
      }}
    >
      <iframe
        title="Prévisualisation PDF"
        src={pdfUrl}
        style={{ border: 'none', width: '100%', height: '100%' }}
      />
    </Box>
  );
}

function LoadingFallback() {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
      gap={2}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        Chargement…
      </Typography>
    </Box>
  );
}

export default function PdfOpenPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PdfOpenContent />
    </Suspense>
  );
}
