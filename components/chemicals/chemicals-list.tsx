"use client"

import { useState, useEffect } from "react"
import { ChemicalStatus, Unit } from "@prisma/client"
import { Chemical } from "@/types/prisma"
import {
  Box,
  Button,
  TextField,
  Chip,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  InputAdornment,
  Alert,
  Stack,
  IconButton,
  Tooltip
} from "@mui/material"
import {
  Search,
  Add,
  Warning,
  CalendarToday,
  Inventory,
  LocationOn
} from "@mui/icons-material"
import { ChemicalForm } from "./chemical-form"
import { ChemicalDetails } from "./chemical-details"

interface ChemicalsListProps {
  chemicals: Chemical[]
  onRefresh: () => void
}

export function ChemicalsList({ chemicals: initialChemicals, onRefresh }: ChemicalsListProps) {
  const [chemicals, setChemicals] = useState<Chemical[]>(initialChemicals || [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ChemicalStatus | "ALL">("ALL")
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  useEffect(() => {
    setChemicals(initialChemicals || [])
  }, [initialChemicals])

  const filteredChemicals = (chemicals || []).filter(chemical => {
    const matchesSearch = chemical.name.toLowerCase().includes(search.toLowerCase()) ||
                         chemical.formula?.toLowerCase().includes(search.toLowerCase()) ||
                         chemical.casNumber?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || chemical.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: ChemicalStatus) => {
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

  const getStatusLabel = (status: ChemicalStatus) => {
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

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Header avec recherche et filtres */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Rechercher par nom, formule ou CAS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Filtrer par statut</InputLabel>
            <Select
              value={statusFilter}
              label="Filtrer par statut"
              onChange={(e) => setStatusFilter(e.target.value as ChemicalStatus | "ALL")}
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              <MenuItem value="IN_STOCK">En stock</MenuItem>
              <MenuItem value="LOW_STOCK">Stock faible</MenuItem>
              <MenuItem value="OUT_OF_STOCK">Rupture</MenuItem>
              <MenuItem value="EXPIRED">Expiré</MenuItem>
              <MenuItem value="USED_UP">Épuisé</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setIsFormOpen(true)}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Ajouter un produit
          </Button>
        </Stack>

        {/* Grille des produits */}
        <Grid container spacing={3}>
          {filteredChemicals.map((chemical) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={chemical.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => {
                  setSelectedChemical(chemical)
                  setIsDetailsOpen(true)
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    {/* En-tête avec nom et statut */}
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 'bold',
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {chemical.name}
                      </Typography>
                      <Chip
                        label={getStatusLabel(chemical.status)}
                        color={getStatusColor(chemical.status) as any}
                        size="small"
                      />
                    </Stack>

                    {/* Formule chimique */}
                    {chemical.formula && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          fontWeight: 'medium',
                        }}
                      >
                        {chemical.formula}
                      </Typography>
                    )}

                    {/* Quantité */}
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2">
                        {chemical.quantity} {chemical.unit}
                      </Typography>
                      {chemical.minQuantity && chemical.quantity <= chemical.minQuantity && (
                        <Tooltip title="Stock faible">
                          <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                        </Tooltip>
                      )}
                    </Stack>

                    {/* Date d'expiration */}
                    {chemical.expirationDate && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography
                          variant="body2"
                          sx={{
                            color: isExpiringSoon(chemical.expirationDate) ? 'error.main' : 'text.primary',
                            fontWeight: isExpiringSoon(chemical.expirationDate) ? 'medium' : 'normal',
                          }}
                        >
                          Exp: {new Date(chemical.expirationDate).toLocaleDateString('fr-FR')}
                        </Typography>
                        {isExpiringSoon(chemical.expirationDate) && (
                          <Tooltip title="Expire bientôt">
                            <Warning sx={{ fontSize: 16, color: 'error.main' }} />
                          </Tooltip>
                        )}
                      </Stack>
                    )}

                    {/* Localisation */}
                    {chemical.storage && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {chemical.storage}
                        </Typography>
                      </Stack>
                    )}

                    {/* Numéro CAS */}
                    {chemical.casNumber && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'monospace',
                          color: 'text.secondary',
                          display: 'block',
                        }}
                      >
                        CAS: {chemical.casNumber}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Message si aucun produit trouvé */}
        {filteredChemicals.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Inventory sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Aucun produit trouvé
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {search || statusFilter !== "ALL" 
                ? "Essayez de modifier vos critères de recherche."
                : "Commencez par ajouter un produit chimique."
              }
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Dialog pour ajouter un produit */}
      <Dialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ajouter un nouveau produit chimique</DialogTitle>
        <DialogContent>
          <ChemicalForm
            onSuccess={() => {
              setIsFormOpen(false)
              onRefresh()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog pour les détails du produit */}
      <Dialog
        open={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedChemical && (
          <ChemicalDetails
            chemical={selectedChemical}
            onClose={() => setIsDetailsOpen(false)}
            onUpdate={onRefresh}
          />
        )}
      </Dialog>
    </Box>
  )
}
