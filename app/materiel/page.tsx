// app/materiel/page.tsx

'use client';
import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Alert, Typography, Button, Box, Chip } from '@mui/material';
import { DisciplineSelection } from '@/components/material/DisciplineSelection';
import { MaterielManagement } from '@/components/material/MaterielManagement';
import type { Materiel } from '@/components/material/MaterielManagement';
import { useTabWithURL } from '@/lib/hooks/useTabWithURL';
import { motion } from 'framer-motion';

// Rely on GlobalErrorBoundary defined in app/layout.tsx for global error handling.

function MaterielContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const disciplineParam = searchParams.get('discipline');
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(disciplineParam);
  const [isClient, setIsClient] = useState(false);

  // Hook pour la gestion des tabs avec URL (en préservant le paramètre discipline)
  const { tabValue, handleTabChange } = useTabWithURL({
    defaultTab: 0,
    maxTabs: 6, // 6 onglets maintenant (avec Export)
    preserveOtherParams: true,
  });

  // Protection contre les erreurs d'hydratation
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleDisciplineSelect = (discipline: string) => {
    setSelectedDiscipline(discipline);
    // Mettre à jour l'URL en préservant le tab si présent
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('discipline', discipline);
    router.push(`/materiel?${newParams.toString()}`);
  };

  // Export géré via un onglet dans MaterielManagement (plus de dialog ici)

  if (!isClient) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedDiscipline) {
    return (
      <Box component={motion.div} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <DisciplineSelection onSelect={handleDisciplineSelect} />
      </Box>
    );
  }

  return (
    <Box component={motion.div} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      {/* Export déplacé dans un onglet dédié */}
      <MaterielManagement
        discipline={selectedDiscipline}
        initialTab={tabValue}
        onTabChange={handleTabChange}
      />
      {/* Plus de dialog d'export ici */}
    </Box>
  );
}

export default function MaterielPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <MaterielContent />
    </Suspense>
  );
}
