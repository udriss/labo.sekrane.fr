// components/equipment/DeleteConfirmationDialog.tsx
'use client'

import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  FormControlLabel,
  Checkbox,
  Alert
} from '@mui/material'
import { Warning, Delete, Cancel } from '@mui/icons-material'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (deleteItems?: boolean) => void
  deleteType: 'category' | 'item'
  title: string
  relatedItems?: string[]
  loading?: boolean
  inventoryUsage?: number // Nombre d'équipements dans l'inventaire qui utilisent ces modèles
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  deleteType,
  title,
  relatedItems = [],
  loading = false,
  inventoryUsage = 0
}) => {
  const isCategory = deleteType === 'category'
  const [deleteRelatedItems, setDeleteRelatedItems] = React.useState(false)

  const handleConfirm = () => {
    if (isCategory) {
      onConfirm(deleteRelatedItems)
    } else {
      onConfirm()
    }
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth 
      aria-labelledby="delete-confirmation-title"
    >
      <DialogTitle id="delete-confirmation-title">
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" />
          <Typography variant="h6">
            Confirmer la suppression
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent 
          >
        <DialogContentText
        >
          Êtes-vous sûr de vouloir supprimer {isCategory ? 'la catégorie' : 'l\'équipement'} <strong>"{title}"</strong> ?
        </DialogContentText>
        
        {isCategory && relatedItems.length > 0 && (
          <Box mt={2}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Cette catégorie contient {relatedItems.length} équipement{relatedItems.length > 1 ? 's' : ''}.
            </Alert>
            
            <List dense>
              {relatedItems.slice(0, 5).map((item, index) => (
                <ListItem key={index} sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={item}
                    slotProps={{ primary: { variant: 'body2' } }}
                  />
                </ListItem>
              ))}
              {relatedItems.length > 5 && (
                <ListItem sx={{ py: 0.5 }}>
                  <Chip 
                    size="small" 
                    label={`et ${relatedItems.length - 5} autre${relatedItems.length - 5 > 1 ? 's' : ''}...`}
                    variant="outlined"
                  />
                </ListItem>
              )}
            </List>

            {inventoryUsage > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                ⚠️ Attention : {inventoryUsage} équipement{inventoryUsage > 1 ? 's' : ''} dans l'inventaire 
                utilise{inventoryUsage > 1 ? 'nt' : ''} ces modèles d'équipements.
              </Alert>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteRelatedItems}
                  onChange={(e) => setDeleteRelatedItems(e.target.checked)}
                  color="error"
                />
              }
              label={
                <Typography variant="body2">
                  Supprimer également tous les équipements de cette catégorie
                  {!deleteRelatedItems && <strong> (sinon ils seront déplacés dans "Sans catégorie")</strong>}
                </Typography>
              }
              sx={{ mt: 2 }}
            />
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary" mt={2}>
          Cette action est irréversible.
        </Typography>
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
          onClick={handleConfirm}
          color="error"
          variant="contained"
          startIcon={<Delete />}
          disabled={loading}
        >
          {loading ? 'Suppression...' : 'Supprimer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DeleteConfirmationDialog