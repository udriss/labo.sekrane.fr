import React from 'react';
import { Box, Typography, Card, CardContent, Paper } from '@mui/material';
import { MaterialFormData } from './types';

interface Step3Props {
  formData: MaterialFormData;
  salles: any[];
  localisations: any[];
  categoriesInfo: Array<{ id: number; name: string; discipline: string }>;
}

export function Step3({ formData, salles, localisations, categoriesInfo }: Step3Props) {
  const getCategoryName = () => {
    if (!formData.categoryId) return 'Aucune catégorie';
    const category = categoriesInfo.find((c) => c.id === formData.categoryId);
    return category?.name || 'Catégorie inconnue';
  };
  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" color="primary">
                Nom :
              </Typography>
              <Typography>{formData.name}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="primary">
                Catégorie :
              </Typography>
              <Typography>{getCategoryName()}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="primary">
                Discipline :
              </Typography>
              <Typography>{formData.discipline}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="primary">
                Quantité :
              </Typography>
              <Typography>{formData.quantity}</Typography>
            </Box>
            {formData.minStock && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Stock minimum :
                </Typography>
                <Typography>{formData.minStock}</Typography>
              </Box>
            )}
            {formData.model && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Modèle :
                </Typography>
                <Typography>{formData.model}</Typography>
              </Box>
            )}
            {formData.serialNumber && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  N° de série :
                </Typography>
                <Typography>{formData.serialNumber}</Typography>
              </Box>
            )}
            {formData.supplier && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Fournisseur :
                </Typography>
                <Typography>{formData.supplier}</Typography>
              </Box>
            )}
            {formData.salleId && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Salle :
                </Typography>
                <Typography>
                  {salles.find((s) => s.id === formData.salleId)?.name || 'N/A'}
                </Typography>
              </Box>
            )}
            {formData.localisationId && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Localisation :
                </Typography>
                <Typography>
                  {localisations.find((l) => l.id === formData.localisationId)?.name || 'N/A'}
                </Typography>
              </Box>
            )}
            {formData.purchaseDate && (
              <Box>
                <Typography variant="subtitle2" color="primary">
                  Date d&apos;achat :
                </Typography>
                <Typography>{formData.purchaseDate}</Typography>
              </Box>
            )}
            {formData.description && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" color="primary">
                  Description :
                </Typography>
                <Typography>{formData.description}</Typography>
              </Box>
            )}
            {formData.notes && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" color="primary">
                  Notes :
                </Typography>
                <Typography>{formData.notes}</Typography>
              </Box>
            )}
            {formData.caracteristiques && formData.caracteristiques.length > 0 && (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="subtitle2" color="primary">
                  Caractéristiques personnalisées :
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {formData.caracteristiques.map((characteristic) => (
                    <Paper key={characteristic.id} variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="caption" fontWeight={600}>
                        {characteristic.nom}
                        {characteristic.unite && ` (${characteristic.unite})`}:
                      </Typography>
                      <br />
                      <Typography variant="caption">{characteristic.valeur.join(', ')}</Typography>
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
