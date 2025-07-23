import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  Slider,
  CircularProgress,
  Alert
} from "@mui/material"
import { Search } from "@mui/icons-material"
import { Room, EquipmentType } from "@/types/equipment"

interface EquipmentInventoryTabProps {
  materiel: any[]
  loading: boolean
  error: string | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  typeFilter: string
  setTypeFilter: (filter: string) => void
  locationFilter: string
  setLocationFilter: (filter: string) => void
  sortBy: string
  setSortBy: (sort: string) => void
  quantityValues: {[key: string]: number}
  setQuantityValues: (values: {[key: string]: number} | ((prev: {[key: string]: number}) => {[key: string]: number})) => void
  updatingCards: Set<string>
  rooms: Room[]
  onEditEquipment: (equipment: any) => void
  onDeleteEquipment: (equipment: any) => void
  onQuantityChange: (id: string, quantity: number) => void
  getFilteredMateriel: () => any
  getTypeLabel: (type: string) => string
}

export function EquipmentInventoryTab({
  materiel,
  loading,
  error,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  locationFilter,
  setLocationFilter,
  sortBy,
  setSortBy,
  quantityValues,
  setQuantityValues,
  updatingCards,
  rooms,
  onEditEquipment,
  onDeleteEquipment,
  onQuantityChange,
  getFilteredMateriel,
  getTypeLabel
}: EquipmentInventoryTabProps) {
 {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
  }

    const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])

  // Charger les types d'équipement
  useEffect(() => {
    const fetchEquipmentTypes = async () => {
      try {
        const response = await fetch('/api/equipment-types')
        if (response.ok) {
          const data = await response.json()
          setEquipmentTypes(data.types || [])
        }
      } catch (error) {
        console.error("Erreur lors du chargement des types d'équipement:", error)
      }
    }
    fetchEquipmentTypes()
  }, [])

  // Fonction pour trouver la catégorie d'un équipement
  const findEquipmentCategory = (equipmentTypeId: string) => {
    for (const type of equipmentTypes) {
      const item = type.items.find((item: any) => item.id === equipmentTypeId)
      if (item) {
        return type
      }
    }
    return null
  }
  
  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Inventaire actuel</Typography>
      
      {/* Barre de recherche et filtres */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Rechercher par nom ou localisation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Type de matériel</InputLabel>
            <Select
              value={typeFilter}
              label="Type de matériel"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">Tous les types</MenuItem>
              <MenuItem value="GLASSWARE">Verrerie</MenuItem>
              <MenuItem value="MEASURING">Mesure</MenuItem>
              <MenuItem value="HEATING">Chauffage</MenuItem>
              <MenuItem value="SAFETY">Sécurité</MenuItem>
              <MenuItem value="MIXING">Mélange</MenuItem>
              <MenuItem value="STORAGE">Stockage</MenuItem>
              <MenuItem value="ELECTRICAL">Électrique</MenuItem>
              <MenuItem value="OPTICAL">Optique</MenuItem>
              <MenuItem value="CUSTOM">Personnalisé</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Lieu de stockage</InputLabel>
            <Select
              value={locationFilter}
              label="Lieu de stockage"
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <MenuItem value="all">Tous les lieux</MenuItem>
              {rooms.map((room) => [
                <MenuItem key={room.id} value={room.name} sx={{ fontWeight: 'bold' }}>
                  🏠 {room.name}
                </MenuItem>,
                ...(room.locations || []).map((location: any) => (
                  <MenuItem 
                    key={`${room.id}-${location.id}`} 
                    value={`${room.name}|${location.name}`}
                    sx={{ pl: 4 }}
                  >
                    📍 {location.name}
                  </MenuItem>
                ))
              ])}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Organiser par</InputLabel>
            <Select
              value={sortBy}
              label="Organiser par"
              onChange={(e) => setSortBy(e.target.value)}
            >
              <MenuItem value="category">Catégorie</MenuItem>
              <MenuItem value="name">Nom</MenuItem>
              <MenuItem value="quantity">Quantité</MenuItem>
              <MenuItem value="type">Type</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Affichage du matériel organisé par sections de type */}
      {(() => {
        const filteredData = getFilteredMateriel()
        
        // Toujours grouper par type pour l'affichage en sections
        let materialByType: any = {}
        
        if (sortBy === 'category' && typeof filteredData === 'object' && !Array.isArray(filteredData)) {
          materialByType = filteredData
        } else {
          // Créer les groupes à partir de la liste filtrée en utilisant equipmentTypeId
          const items = Array.isArray(filteredData) ? filteredData : []
          materialByType = items.reduce((acc: any, item: any) => {
            // Trouver la catégorie en utilisant equipmentTypeId
            const category = findEquipmentCategory(item.equipmentTypeId)
            const typeId = category ? category.id : 'CUSTOM'
            if (!acc[typeId]) acc[typeId] = []
            acc[typeId].push(item)
            return acc
          }, {})
          
          // Trier les éléments dans chaque groupe si nécessaire
          if (sortBy !== 'category') {
            Object.keys(materialByType).forEach(type => {
              materialByType[type].sort((a: any, b: any) => {
                switch (sortBy) {
                  case 'name':
                    return a.name.localeCompare(b.name)
                  case 'quantity':
                    return (b.quantity || 0) - (a.quantity || 0)
                  case 'type':
                    return getTypeLabel(a.type).localeCompare(getTypeLabel(b.type))
                  default:
                    return 0
                }
              })
            })
          }
        }
        
        // Affichage par sections de type
        return Object.entries(materialByType).map(([typeId, items]: [string, any]) => {
          // Trouver le nom de la catégorie
          const category = equipmentTypes.find(type => type.id === typeId)
          const categoryName = category ? category.name : getTypeLabel(typeId)
          
          return (
            <Box key={typeId} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                📦 {categoryName} ({items.length})
              </Typography>
              <Grid container spacing={2}>
              {items.map((item: any) => (
                <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card sx={{ 
                    position: 'relative',
                    opacity: updatingCards.has(item.id) ? 0.7 : 1,
                    transition: 'all 0.2s'
                  }}>
                    {/* Overlay avec spinner pendant la mise à jour */}
                    {updatingCards.has(item.id) && (
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
                    
                    <CardContent>
                    <Typography variant="h6">
                        {item.name}
                        {item.volume && (
                            <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1, fontSize: '1rem' }}>
                                ({item.volume})
                            </Typography>
                        )}
                    </Typography>
                      <Typography color="text.secondary">
                        Type: {getTypeLabel(item.type)}
                      </Typography>
                      {item.volume && (
                        <Typography color="text.secondary">
                          Volume: {item.volume}
                        </Typography>
                      )}
                      {item.location && (
                        <Typography color="text.secondary">
                          📍 {item.location}
                        </Typography>
                      )}
                      {item.room && (
                        <Typography color="text.secondary">
                          🏠 {item.room}
                        </Typography>
                      )}
                      
                      {/* Slider pour la quantité */}
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          Quantité: {quantityValues[item.id] !== undefined ? quantityValues[item.id] : item.quantity}
                        </Typography>
                        <Slider
                          value={quantityValues[item.id] !== undefined ? quantityValues[item.id] : item.quantity}
                          onChange={(_, newValue) => {
                            const value = newValue as number
                            setQuantityValues(prev => ({
                              ...prev,
                              [item.id]: value
                            }))
                          }}
                          onChangeCommitted={(_, newValue) => {
                            const value = newValue as number
                            if (value !== item.quantity) {
                              onQuantityChange(item.id, value)
                            }
                          }}
                          min={0}
                          max={Math.max(item.quantity * 2, 10)}
                          step={1}
                          size="small"
                          valueLabelDisplay="auto"
                          sx={{
                            color: item.quantity === 0 ? 'warning.main' : 'primary.main'
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={item.status || 'Disponible'} 
                          color={item.quantity === 0 ? 'warning' : 'success'} 
                          size="small"
                        />
                        <Box>
                          <Button
                            size="small"
                            onClick={() => onEditEquipment(item)}
                            sx={{ mr: 1 }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => onDeleteEquipment(item)}
                          >
                            Supprimer
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
          )
        })
      })()}
      
      {(() => {
        const filteredData = getFilteredMateriel()
        let totalItems = 0
        
        if (typeof filteredData === 'object' && !Array.isArray(filteredData)) {
          totalItems = Object.values(filteredData).reduce((acc: number, items: any) => acc + items.length, 0)
        } else {
          totalItems = Array.isArray(filteredData) ? filteredData.length : 0
        }
        
        return totalItems === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Aucun équipement trouvé avec les critères sélectionnés.
            </Typography>
          </Box>
        )
      })()}
    </Paper>
  )
}
}
