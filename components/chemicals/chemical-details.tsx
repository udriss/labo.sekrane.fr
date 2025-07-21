"use client"

import { useState } from "react"
import { Chemical, ChemicalStatus } from "@/types/prisma"
import {
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Tooltip
} from "@mui/material"
import {
  Edit,
  Delete,
  Close,
  Warning,
  CalendarToday,
  Inventory,
  LocationOn,
  Business,
  Science,
  Assignment,
  QrCode
} from "@mui/icons-material"
import { ChemicalForm } from "./chemical-form"

interface ChemicalDetailsProps {
  chemical: Chemical
  onClose: () => void
  onUpdate: () => void
}

export function ChemicalDetails({ chemical, onClose, onUpdate }: ChemicalDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/chemicals/${chemical.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la suppression")
      }

      onUpdate()
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
      setIsDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case ChemicalStatus.IN_STOCK:
        return "success"
      case ChemicalStatus.LOW_STOCK:
        return "warning"
      case ChemicalStatus.EMPTY:
        return "error"
      case ChemicalStatus.EXPIRED:
        return "default"
      case ChemicalStatus.OPENED:
        return "info"
      case ChemicalStatus.QUARANTINE:
        return "secondary"
      default:
        return "default"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case ChemicalStatus.IN_STOCK:
        return "En stock"
      case ChemicalStatus.LOW_STOCK:
        return "Stock faible"
      case ChemicalStatus.EMPTY:
        return "Vide"
      case ChemicalStatus.EXPIRED:
        return "Expiré"
      case ChemicalStatus.OPENED:
        return "Ouvert"
      case ChemicalStatus.QUARANTINE:
        return "Quarantaine"
      default:
        return status
    }
  }

  const isExpiringSoon = (expirationDate: Date | null) => {
    if (!expirationDate) return false
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    return new Date(expirationDate) <= thirtyDaysFromNow
  }

  if (isEditing) {
    return (
      <ChemicalForm
        chemical={chemical}
        onSuccess={() => {
          setIsEditing(false)
          onUpdate()
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="start" sx={{ mb: 3 }}>
        <Stack spacing={1}>
          <Typography variant="h4" component="h1">
            {chemical.name}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={getStatusLabel(chemical.status)}
              color={getStatusColor(chemical.status) as any}
            />
            {chemical.minQuantity && chemical.quantity <= chemical.minQuantity && (
              <Chip
                icon={<Warning />}
                label="Stock faible"
                color="warning"
                variant="outlined"
              />
            )}
            {chemical.expirationDate && isExpiringSoon(chemical.expirationDate) && (
              <Chip
                icon={<Warning />}
                label="Expire bientôt"
                color="error"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Modifier">
            <IconButton onClick={() => setIsEditing(true)}>
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton color="error" onClick={() => setIsDeleting(true)}>
              <Delete />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
        }}
      >
        {/* Informations principales */}
        <Paper sx={{ p: 3, height: 'fit-content' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Science />
            Informations chimiques
          </Typography>
          <Stack spacing={2}>
            {chemical.formula && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Formule chimique
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
                  {chemical.formula}
                </Typography>
              </Box>
            )}
            
            {chemical.casNumber && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Numéro CAS
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {chemical.casNumber}
                </Typography>
              </Box>
            )}

            {chemical.barcode && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Code-barres
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <QrCode fontSize="small" />
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {chemical.barcode}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Stock et quantités */}
        <Paper sx={{ p: 3, height: 'fit-content' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory />
            Stock
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Quantité disponible
              </Typography>
              <Typography variant="h5" color="primary">
                {chemical.quantity} {chemical.unit}
              </Typography>
            </Box>
            
            {chemical.minQuantity && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stock minimum
                </Typography>
                <Typography variant="body1">
                  {chemical.minQuantity} {chemical.unit}
                </Typography>
              </Box>
            )}

            <Box>
              <Typography variant="caption" color="text.secondary">
                Statut
              </Typography>
              <Typography variant="body1">
                {getStatusLabel(chemical.status)}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Dates importantes */}
        <Paper sx={{ p: 3, height: 'fit-content' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday />
            Dates importantes
          </Typography>
          <Stack spacing={2}>
            {chemical.purchaseDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date d'achat
                </Typography>
                <Typography variant="body1">
                  {new Date(chemical.purchaseDate).toLocaleDateString('fr-FR')}
                </Typography>
              </Box>
            )}
            
            {chemical.expirationDate && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Date d'expiration
                </Typography>
                <Typography 
                  variant="body1"
                  sx={{
                    color: isExpiringSoon(chemical.expirationDate) ? 'error.main' : 'text.primary',
                    fontWeight: isExpiringSoon(chemical.expirationDate) ? 'medium' : 'normal',
                  }}
                >
                  {new Date(chemical.expirationDate).toLocaleDateString('fr-FR')}
                  {isExpiringSoon(chemical.expirationDate) && " ⚠️"}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Localisation et fournisseur */}
        <Paper sx={{ p: 3, height: 'fit-content' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn />
            Localisation
          </Typography>
          <Stack spacing={2}>
            {chemical.storage && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Stockage
                </Typography>
                <Typography variant="body1">
                  {chemical.storage}
                </Typography>
              </Box>
            )}
            
            {chemical.room && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Salle
                </Typography>
                <Typography variant="body1">
                  {chemical.room}
                </Typography>
              </Box>
            )}
            
            {chemical.cabinet && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Armoire
                </Typography>
                <Typography variant="body1">
                  {chemical.cabinet}
                </Typography>
              </Box>
            )}
            
            {chemical.shelf && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Étagère
                </Typography>
                <Typography variant="body1">
                  {chemical.shelf}
                </Typography>
              </Box>
            )}
            
            {chemical.supplierId && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  ID Fournisseur
                </Typography>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business fontSize="small" />
                  {chemical.supplierId}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Notes */}
        {chemical.notes && (
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assignment />
                Notes
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {chemical.notes}
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer le produit chimique "{chemical.name}" ?
            Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleting(false)} disabled={loading}>
            Annuler
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Delete />}
          >
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
