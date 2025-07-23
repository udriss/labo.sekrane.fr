'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material'
import { Warning, Merge, Cancel, Add } from '@mui/icons-material'

interface DuplicateDetectionDialogProps {
  open: boolean
  onClose: () => void
  onMerge: () => void
  onAddAnyway: () => void
  newItem: {
    name: string
    volumes?: string[]
    description?: string
  }
  existingItems: Array<{
    name: string
    categoryName: string
    volumes?: string[]
    description?: string
  }>
  loading?: boolean
}

const DuplicateDetectionDialog: React.FC<DuplicateDetectionDialogProps> = ({
  open,
  onClose,
  onMerge,
  onAddAnyway,
  newItem,
  existingItems,
  loading = false
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md" 
      fullWidth
      aria-labelledby="duplicate-detection-title"
    >
      <DialogTitle id="duplicate-detection-title">
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" />
          <Typography variant="h6">
            Équipements similaires détectés
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          L'équipement que vous tentez d'ajouter semble similaire à des équipements existants.
        </Alert>

        <Typography variant="h6" gutterBottom>
          Nouvel équipement :
        </Typography>
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" color="primary">
              {newItem.name}
            </Typography>
            {newItem.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {newItem.description}
              </Typography>
            )}
            {newItem.volumes && newItem.volumes.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2" gutterBottom>
                  Volumes :
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {newItem.volumes.map((volume, index) => (
                    <Chip
                      key={index}
                      label={volume}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          Équipements similaires existants :
        </Typography>
        
        <List>
          {existingItems.map((item, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <Card variant="outlined" sx={{ width: '100%' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6">
                      {item.name}
                    </Typography>
                    <Chip
                      label={item.categoryName}
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  </Box>
                  {item.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {item.description}
                    </Typography>
                  )}
                  {item.volumes && item.volumes.length > 0 && (
                    <Box mt={1}>
                      <Typography variant="body2" gutterBottom>
                        Volumes :
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {item.volumes.map((volume, vIndex) => (
                          <Chip
                            key={vIndex}
                            label={volume}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Que souhaitez-vous faire ?</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            • <strong>Fusionner :</strong> Combiner les informations avec l'équipement existant le plus similaire
          </Typography>
          <Typography variant="body2">
            • <strong>Ajouter quand même :</strong> Créer un nouvel équipement distinct
          </Typography>
        </Alert>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<Cancel />}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button
          onClick={onAddAnyway}
          color="secondary"
          variant="outlined"
          startIcon={<Add />}
          disabled={loading}
        >
          Ajouter quand même
        </Button>
        <Button
          onClick={onMerge}
          color="primary"
          variant="contained"
          startIcon={<Merge />}
          disabled={loading}
        >
          {loading ? 'Fusion...' : 'Fusionner'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DuplicateDetectionDialog
