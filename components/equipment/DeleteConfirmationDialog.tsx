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
  Chip
} from '@mui/material'
import { Warning, Delete, Cancel } from '@mui/icons-material'

interface DeleteConfirmationDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  deleteType: 'category' | 'item'
  title: string
  relatedItems?: string[]
  loading?: boolean
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  deleteType,
  title,
  relatedItems = [],
  loading = false
}) => {
  const isCategory = deleteType === 'category'

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
      
      <DialogContent>
        <DialogContentText>
          Êtes-vous sûr de vouloir supprimer {isCategory ? 'la catégorie' : 'l\'équipement'} <strong>"{title}"</strong> ?
        </DialogContentText>
        
        {isCategory && relatedItems.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="error" gutterBottom>
              ⚠️ Cette catégorie contient {relatedItems.length} équipement{relatedItems.length > 1 ? 's' : ''} qui {relatedItems.length > 1 ? 'seront déplacés' : 'sera déplacé'} dans "Sans catégorie" :
            </Typography>
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
          onClick={onConfirm}
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
