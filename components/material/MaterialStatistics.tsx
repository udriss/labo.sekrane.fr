'use client';
import React from 'react';
import { Typography, Grid, Card, CardContent } from '@mui/material';
import { Materiel } from './MaterielManagement';

interface Category {
  id: number;
  name: string;
  discipline: string;
  description?: string;
}

interface MaterialStatisticsProps {
  materiels: Materiel[];
  categories: Category[];
  discipline: string;
}

export function MaterialStatistics({ materiels, categories, discipline }: MaterialStatisticsProps) {
  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Statistiques du matériel {discipline}
      </Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary">
                {materiels.length}
              </Typography>
              <Typography color="text.secondary">Matériels total</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="secondary">
                {categories.length}
              </Typography>
              <Typography color="text.secondary">Catégories disponibles</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main">
                {materiels.filter((m) => m.quantity <= 5).length}
              </Typography>
              <Typography color="text.secondary">Stock faible (≤ 5)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
}
