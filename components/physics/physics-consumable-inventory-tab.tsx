"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  TextField,
  MenuItem,
  Button
} from "@mui/material"
import {
  Edit,
  Delete,
  Search,
  Refresh
} from "@mui/icons-material"

interface PhysicsConsumable {
  id: string
  name: string
  quantity: number
  unit: string
  status: string
  room?: string
  location?: string
  type_name?: string
  type_color?: string
  brand?: string
  model?: string
  expirationDate?: string
  requestedQuantity?: number // NOUVEAU: pour les quantités demandées
}

interface PhysicsConsumableInventoryTabProps {
  onStatsUpdate?: () => void
}

const statusLabels: { [key: string]: string } = {
  'IN_STOCK': 'En stock',
  'LOW_STOCK': 'Stock faible',
  'OUT_OF_STOCK': 'Rupture',
  'EXPIRED': 'Expiré'
}

const statusColors: { [key: string]: 'success' | 'warning' | 'error' | 'default' } = {
  'IN_STOCK': 'success',
  'LOW_STOCK': 'warning',
  'OUT_OF_STOCK': 'error',
  'EXPIRED': 'error'
}

export default function PhysicsConsumableInventoryTab({ onStatsUpdate }: PhysicsConsumableInventoryTabProps) {
  const [consumables, setConsumables] = useState<PhysicsConsumable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const loadConsumables = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`/api/physique/consommables?${params}`)
      const data = await response.json()

      if (response.ok) {
        setConsumables(data.consumables || [])
        if (onStatsUpdate) {
          onStatsUpdate()
        }
      } else {
        setError(data.error || "Erreur lors du chargement")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConsumables()
  }, [searchTerm, statusFilter])

  const handleRefresh = () => {
    loadConsumables()
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box p={3}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <Typography variant="h6" component="h2" flexGrow={1}>
          Inventaire des Consommables Physiques
        </Typography>
        
        <TextField
          size="small"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search color="action" sx={{ mr: 1 }} />
          }}
          sx={{ width: 250 }}
        />
        
        <TextField
          select
          size="small"
          label="Statut"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ width: 150 }}
        >
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="IN_STOCK">En stock</MenuItem>
          <MenuItem value="LOW_STOCK">Stock faible</MenuItem>
          <MenuItem value="OUT_OF_STOCK">Rupture</MenuItem>
          <MenuItem value="EXPIRED">Expiré</MenuItem>
        </TextField>
        
        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<Refresh />}
        >
          Actualiser
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Quantité</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Marque/Modèle</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {consumables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    Aucun consommable trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              consumables.map((consumable) => (
                <TableRow key={consumable.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {consumable.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {consumable.type_name && (
                      <Chip
                        label={consumable.type_name}
                        size="small"
                        sx={{
                          bgcolor: consumable.type_color || '#1976d2',
                          color: 'white'
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {consumable.quantity} {consumable.unit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusLabels[consumable.status] || consumable.status}
                      color={statusColors[consumable.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0}>
                      {consumable.room && (
                        <Typography variant="body2">
                          {consumable.room}
                        </Typography>
                      )}
                      {consumable.location && (
                        <Typography variant="caption" color="text.secondary">
                          → {consumable.location}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0}>
                      {consumable.brand && (
                        <Typography variant="body2">
                          {consumable.brand}
                        </Typography>
                      )}
                      {consumable.model && (
                        <Typography variant="caption" color="text.secondary">
                          {consumable.model}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Modifier">
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error">
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
