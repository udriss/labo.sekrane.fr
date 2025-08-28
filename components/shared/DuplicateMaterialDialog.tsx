import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { WarningAmber, Info } from '@mui/icons-material';

interface MaterielPerso {
  id: number;
  name: string;
  discipline: string;
  description?: string | null;
  caracteristiques?: any;
  defaultQty?: number | null;
  categorie?: {
    id: number;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface DuplicateMaterialDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingMaterial: MaterielPerso;
  newMaterialName: string;
  discipline: string;
}

export function DuplicateMaterialDialog({
  open,
  onClose,
  onConfirm,
  existingMaterial,
  newMaterialName,
  discipline,
}: DuplicateMaterialDialogProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmber color="warning" />
        Matériel similaire détecté
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Un matériel avec le nom "{newMaterialName}" existe déjà dans la discipline "{discipline}
            ".
          </Typography>
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Info color="primary" />
              <Typography variant="h6">Matériel existant</Typography>
            </Box>

            <Typography variant="h6" gutterBottom>
              {existingMaterial.name}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip
                label={existingMaterial.discipline}
                color="primary"
                variant="outlined"
                size="small"
              />
              {existingMaterial.categorie && (
                <Chip
                  label={existingMaterial.categorie.name}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>

            {existingMaterial.description && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Description:
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  {existingMaterial.description}
                </Typography>
              </>
            )}

            {existingMaterial.defaultQty && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Quantité par défaut : {existingMaterial.defaultQty}
              </Typography>
            )}

            {existingMaterial.caracteristiques && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Caractéristiques personnalisées:
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(existingMaterial.caracteristiques).map(([key, value]) => (
                    <Typography key={key} variant="body2" sx={{ mb: 0.5 }}>
                      <strong>{key}:</strong> {String(value)}
                    </Typography>
                  ))}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              Créé le: {formatDate(existingMaterial.createdAt)}
              {existingMaterial.updatedAt !== existingMaterial.createdAt && (
                <> • Modifié le: {formatDate(existingMaterial.updatedAt)}</>
              )}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Voulez-vous utiliser ce matériel existant ou ajouter un nouveau matériel avec le même
            nom ?
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary">
          Utiliser le matériel existant
        </Button>
      </DialogActions>
    </Dialog>
  );
}
