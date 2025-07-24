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
  Tooltip,
  Slider,
  CardActions,
  CircularProgress,
  Backdrop,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Skeleton
} from "@mui/material"
import {
  Search,
  Add,
  Warning,
  CalendarToday,
  Inventory,
  LocationOn,
  Edit,
  Delete,
  Save
} from "@mui/icons-material"
import { ChemicalForm } from "./chemical-form"
import { ChemicalDetails } from "./chemical-details"
import ViewToggle from "@/components/equipment/ViewToggle"
import { useSiteConfig } from "@/lib/hooks/useSiteConfig"

// Types pour le tri
type Order = 'asc' | 'desc'
type OrderBy = 'name' | 'formula' | 'quantity' | 'status' | 'expirationDate' | 'storage'

interface ChemicalsListProps {
  chemicals: Chemical[]
  onRefresh: () => void
}

export function ChemicalsList({ chemicals: initialChemicals, onRefresh }: ChemicalsListProps) {
  const { 
    config, 
    updateConfig, 
    loading: configLoading, 
    error: configError 
  } = useSiteConfig()

  const [chemicals, setChemicals] = useState<Chemical[]>(initialChemicals || [])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ChemicalStatus | "ALL">("ALL")
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null)
  const [quantityValues, setQuantityValues] = useState<{[key: string]: number}>({})
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set())
  
  // États pour la vue et le tri
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [order, setOrder] = useState<Order>('asc')
  const [orderBy, setOrderBy] = useState<OrderBy>('name')

  // Synchroniser avec les préférences utilisateur une fois chargées
  useEffect(() => {
    if (!configLoading && config.chemicalsViewMode) {
      setViewMode(config.chemicalsViewMode)
    }
  }, [config.chemicalsViewMode, configLoading])

  useEffect(() => {
    setChemicals(initialChemicals || [])
    // Initialiser les valeurs de quantité
    const initialQuantities: {[key: string]: number} = {}
    initialChemicals?.forEach(chemical => {
      initialQuantities[chemical.id] = chemical.quantity
    })
    setQuantityValues(initialQuantities)
  }, [initialChemicals])

  // Gestionnaire de changement de vue avec gestion d'erreur
  const handleViewModeChange = async (event: React.MouseEvent<HTMLElement>, newViewMode: 'cards' | 'list') => {
    if (newViewMode !== null) {
      setViewMode(newViewMode)
      try {
        await updateConfig({ chemicalsViewMode: newViewMode })
      } catch (error) {
        console.error("Erreur lors de la sauvegarde des préférences:", error)
      }
    }
  }

  // Gestionnaire de tri pour la vue liste
  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  // Fonction de tri
  const sortData = (data: Chemical[]) => {
    return [...data].sort((a, b) => {
      let aValue: any = a[orderBy]
      let bValue: any = b[orderBy]

      // Gestion des valeurs null/undefined
      if (aValue === null || aValue === undefined) aValue = ''
      if (bValue === null || bValue === undefined) bValue = ''

      // Gestion spéciale pour les dates
      if (orderBy === 'expirationDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }

      if (bValue < aValue) {
        return order === 'asc' ? 1 : -1
      }
      if (bValue > aValue) {
        return order === 'asc' ? -1 : 1
      }
      return 0
    })
  }

  const filteredChemicals = (chemicals || []).filter(chemical => {
    const matchesSearch = chemical.name.toLowerCase().includes(search.toLowerCase()) ||
                         chemical.formula?.toLowerCase().includes(search.toLowerCase()) ||
                         chemical.casNumber?.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === "ALL" || chemical.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const sortedChemicals = viewMode === 'list' ? sortData(filteredChemicals) : filteredChemicals

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

  const handleQuantityChange = async (chemicalId: string, newValue: number) => {
    try {
      // Marquer la carte comme en cours de mise à jour
      setUpdatingCards(prev => new Set([...prev, chemicalId]))
      
      const response = await fetch(`/api/chemicals/${chemicalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newValue
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la quantité')
      }

      // Mettre à jour seulement la carte concernée
      setChemicals(prev => prev.map(chemical => 
        chemical.id === chemicalId 
          ? { ...chemical, quantity: newValue }
          : chemical
      ))
      
      setQuantityValues(prev => ({
        ...prev,
        [chemicalId]: newValue
      }))

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error)
      // Remettre l'ancienne valeur en cas d'erreur
      const originalChemical = chemicals.find(c => c.id === chemicalId)
      if (originalChemical) {
        setQuantityValues(prev => ({
          ...prev,
          [chemicalId]: originalChemical.quantity
        }))
      }
    } finally {
      // Retirer le spinner
      setUpdatingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(chemicalId)
        return newSet
      })
    }
  }

  const handleDeleteChemical = async (chemicalId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit chimique ?')) {
      return
    }

    try {
      const response = await fetch(`/api/chemicals/${chemicalId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      onRefresh()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const getMaxSliderValue = (currentQuantity: number) => {
    return Math.max(currentQuantity * 4, 10) // Minimum 10 pour éviter les sliders trop petits
  }

  // Affichage du loading combiné (données + config)
  if (configLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Skeleton variant="rectangular" width="100%" height={56} />
            <Skeleton variant="rectangular" width={200} height={56} />
            <Skeleton variant="rectangular" width={150} height={40} />
          </Stack>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map(i => (
              <Grid size={{ xs: 12, md: 6, lg: 4 }} key={i}>
                <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Box>
    )
  }

  // Notification d'erreur de configuration (non bloquante)
  const ConfigErrorNotification = () => {
    if (configError && !configLoading) {
      return (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          onClose={() => {}} // Permettre de fermer la notification
        >
          Les préférences sont sauvegardées localement. Connexion au serveur impossible.
        </Alert>
      )
    }
    return null
  }

  // Rendu de la vue liste
  const renderListView = () => {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'name'}
                  direction={orderBy === 'name' ? order : 'asc'}
                  onClick={() => handleRequestSort('name')}
                >
                  Nom
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'formula'}
                  direction={orderBy === 'formula' ? order : 'asc'}
                  onClick={() => handleRequestSort('formula')}
                >
                  Formule
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'quantity'}
                  direction={orderBy === 'quantity' ? order : 'asc'}
                  onClick={() => handleRequestSort('quantity')}
                >
                  Quantité
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'status'}
                  direction={orderBy === 'status' ? order : 'asc'}
                  onClick={() => handleRequestSort('status')}
                >
                  Statut
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'expirationDate'}
                  direction={orderBy === 'expirationDate' ? order : 'asc'}
                  onClick={() => handleRequestSort('expirationDate')}
                >
                  Expiration
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'storage'}
                  direction={orderBy === 'storage' ? order : 'asc'}
                  onClick={() => handleRequestSort('storage')}
                >
                  Stockage
                </TableSortLabel>
              </TableCell>
              <TableCell>CAS</TableCell>
                            <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedChemicals.map((chemical) => (
              <TableRow 
                key={chemical.id}
                sx={{ 
                  opacity: updatingCards.has(chemical.id) ? 0.5 : 1,
                  position: 'relative'
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {updatingCards.has(chemical.id) && (
                      <CircularProgress size={20} />
                    )}
                    <Typography variant="body2" fontWeight="medium">
                      {chemical.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {chemical.formula || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                    <Slider
                      value={quantityValues[chemical.id] || chemical.quantity}
                      onChange={(_, newValue) => {
                        const value = newValue as number
                        setQuantityValues(prev => ({
                          ...prev,
                          [chemical.id]: value
                        }))
                      }}
                      onChangeCommitted={(_, newValue) => {
                        const value = newValue as number
                        if (value !== chemical.quantity) {
                          handleQuantityChange(chemical.id, value)
                        }
                      }}
                      min={0}
                      max={getMaxSliderValue(chemical.quantity)}
                      step={0.1}
                      size="small"
                      sx={{
                        width: 100,
                        color: chemical.quantity <= (chemical.minQuantity || 0) ? 'warning.main' : 'primary.main'
                      }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      {quantityValues[chemical.id] || chemical.quantity} {chemical.unit}
                    </Typography>
                    {chemical.minQuantity && (quantityValues[chemical.id] || chemical.quantity) <= chemical.minQuantity && (
                      <Tooltip title="Stock faible">
                        <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(chemical.status)}
                    color={getStatusColor(chemical.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {chemical.expirationDate ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: isExpiringSoon(chemical.expirationDate) ? 'error.main' : 'text.primary',
                          fontWeight: isExpiringSoon(chemical.expirationDate) ? 'medium' : 'normal',
                        }}
                      >
                        {new Date(chemical.expirationDate).toLocaleDateString('fr-FR')}
                      </Typography>
                      {isExpiringSoon(chemical.expirationDate) && (
                        <Tooltip title="Expire bientôt">
                          <Warning sx={{ fontSize: 16, color: 'error.main' }} />
                        </Tooltip>
                      )}
                    </Stack>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {chemical.storage || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {chemical.casNumber || '-'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Voir détails">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedChemical(chemical)
                          setIsDetailsOpen(true)
                        }}
                      >
                        <Inventory fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedChemical(chemical)
                          setIsFormOpen(true)
                        }}
                        disabled={updatingCards.has(chemical.id)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteChemical(chemical.id)}
                        disabled={updatingCards.has(chemical.id)}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  // Rendu de la vue cartes (existante)
  const renderCardsView = () => {
    return (
      <Grid container spacing={3}>
        {sortedChemicals.map((chemical) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={chemical.id}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                opacity: updatingCards.has(chemical.id) ? 0.7 : 1,
              }}
            >
              {/* Overlay avec spinner pendant la mise à jour */}
              {updatingCards.has(chemical.id) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    borderRadius: 1
                  }}
                >
                  <CircularProgress size={40} />
                </Box>
              )}
              <CardContent sx={{ pb: 1 }}>
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

                  {/* Contrôle de quantité avec slider */}
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Inventory sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        Quantité: {quantityValues[chemical.id] || chemical.quantity} {chemical.unit}
                      </Typography>
                      {chemical.minQuantity && (quantityValues[chemical.id] || chemical.quantity) <= chemical.minQuantity && (
                        <Tooltip title="Stock faible">
                          <Warning sx={{ fontSize: 16, color: 'warning.main' }} />
                        </Tooltip>
                      )}
                    </Stack>
                    
                    <Box sx={{ px: 1 }}>
                      <Slider
                        value={quantityValues[chemical.id] || chemical.quantity}
                        onChange={(_, newValue) => {
                          const value = newValue as number
                          setQuantityValues(prev => ({
                            ...prev,
                            [chemical.id]: value
                          }))
                        }}
                        onChangeCommitted={(_, newValue) => {
                          const value = newValue as number
                          if (value !== chemical.quantity) {
                            handleQuantityChange(chemical.id, value)
                          }
                        }}
                        min={0}
                        max={getMaxSliderValue(chemical.quantity)}
                        step={0.1}
                        size="small"
                        valueLabelDisplay="auto"
                        sx={{
                          color: chemical.quantity <= (chemical.minQuantity || 0) ? 'warning.main' : 'primary.main'
                        }}
                      />
                    </Box>
                  </Box>

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

              {/* Actions */}
              <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedChemical(chemical)
                    setIsDetailsOpen(true)
                  }}
                >
                  Voir détails
                </Button>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Modifier">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedChemical(chemical)
                        setIsFormOpen(true)
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteChemical(chemical.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <ConfigErrorNotification />
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

          <ViewToggle 
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedChemical(null)
              setIsFormOpen(true)
            }}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Ajouter un produit
          </Button>
        </Stack>
                {/* Affichage selon le mode de vue */}
        {viewMode === 'cards' ? renderCardsView() : renderListView()}

        {/* Message si aucun produit trouvé */}
        {sortedChemicals.length === 0 && (
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

      {/* Dialog pour ajouter/modifier un produit */}
      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedChemical(null)
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedChemical ? "Modifier le produit chimique" : "Ajouter un nouveau produit chimique"}
          {selectedChemical && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ID: {selectedChemical.id}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <ChemicalForm
            chemical={selectedChemical || undefined}
            onSuccess={() => {
              setIsFormOpen(false)
              setSelectedChemical(null)
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