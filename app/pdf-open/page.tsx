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

  React.useEffect(() => {
    const run = async () => {
      if (!eventId) {
        setError('Paramètre eventId manquant');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/generate-event-pdf?eventId=${eventId}&t=${Date.now()}`);
        if (!res.ok) throw new Error('Echec de génération');
        const json = await res.json();
        if (!json?.success || !json?.filename) {
          throw new Error(json?.error || 'PDF non disponible');
        }
        setFilename(json.filename);
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

  const pdfUrl = `/api/public-files/${filename}`;

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
