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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TableSortLabel,
  Skeleton
} from "@mui/material"
import { Search, Edit, Delete, Room as RoomIcon, HomeFilled } from "@mui/icons-material"
import { Room, EquipmentType } from "@/types/equipment"
import ViewToggle from "@/components/equipment/ViewToggle"  
import { useSiteConfig } from "@/lib/hooks/useSiteConfig"

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
  // Utilisation du hook amélioré
  const { 
    config, 
    updateConfig, 
    loading: configLoading, 
    error: configError 
  } = useSiteConfig()
  
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [orderBy, setOrderBy] = useState<string>('name')
  const [order, setOrder] = useState<'asc' | 'desc'>('asc')

  // Synchroniser avec les préférences utilisateur une fois chargées
  useEffect(() => {
    if (!configLoading && config.materialsViewMode) {
      setViewMode(config.materialsViewMode)
    }
  }, [config.materialsViewMode, configLoading])

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

  // Gestionnaire de changement de vue avec gestion d'erreur
  const handleViewModeChange = async (event: React.MouseEvent<HTMLElement>, newViewMode: 'cards' | 'list') => {
    if (newViewMode !== null) {
      setViewMode(newViewMode)
      try {
        await updateConfig({ materialsViewMode: newViewMode })
      } catch (error) {
        console.error("Erreur lors de la sauvegarde des préférences:", error)
        // Optionnel : afficher une notification à l'utilisateur
      }
    }
  }

  // Gestionnaire de tri pour la vue liste
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

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

  // Affichage du loading combiné (données + config)
  if (loading || configLoading) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={56} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="rectangular" height={200} />
            ))}
          </Box>
        </Stack>
      </Paper>
    )
  }

  // Affichage des erreurs
  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
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

  // Fonction pour obtenir tous les équipements sous forme de liste plate
  const getFlatMaterialList = () => {
    const filteredData = getFilteredMateriel()
    let flatList: any[] = []
    
    if (typeof filteredData === 'object' && !Array.isArray(filteredData)) {
      Object.values(filteredData).forEach((items: any) => {
        flatList = flatList.concat(items)
      })
    } else if (Array.isArray(filteredData)) {
      flatList = filteredData
    }
    
    // Appliquer le tri pour la vue liste
    if (viewMode === 'list') {
      flatList.sort((a, b) => {
        let aValue: any, bValue: any
        
        switch (orderBy) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'type':
            aValue = getTypeLabel(a.type).toLowerCase()
            bValue = getTypeLabel(b.type).toLowerCase()
            break
          case 'quantity':
            aValue = quantityValues[a.id] !== undefined ? quantityValues[a.id] : a.quantity
            bValue = quantityValues[b.id] !== undefined ? quantityValues[b.id] : b.quantity
            break
          case 'location':
            aValue = a.location || ''
            bValue = b.location || ''
            break
          case 'status':
            aValue = a.quantity === 0 ? 'Rupture' : 'Disponible'
            bValue = b.quantity === 0 ? 'Rupture' : 'Disponible'
            break
          default:
            aValue = a[orderBy]
            bValue = b[orderBy]
        }
        
        if (order === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        }
      })
    }
    
    return flatList
  }

  // Rendu de la vue liste (reste inchangé)
  const renderListView = () => {
    const flatList = getFlatMaterialList()
    
    return (
      <TableContainer>
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
                  active={orderBy === 'type'}
                  direction={orderBy === 'type' ? order : 'asc'}
                  onClick={() => handleRequestSort('type')}
                >
                  Type
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
                  active={orderBy === 'location'}
                  direction={orderBy === 'location' ? order : 'asc'}
                  onClick={() => handleRequestSort('location')}
                >
                  Localisation
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
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flatList.map((item) => (
              <TableRow 
                key={item.id}
                sx={{ 
                  opacity: updatingCards.has(item.id) ? 0.5 : 1,
                  position: 'relative'
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {updatingCards.has(item.id) && (
                      <CircularProgress size={20} />
                    )}
                    {item.name}
                    {item.volume && (
                      <Typography variant="body2" color="text.secondary">
                        ({item.volume})
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{getTypeLabel(item.type)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
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
                      sx={{
                        width: 100,
                        color: item.quantity === 0 ? 'warning.main' : 'primary.main'
                      }}
                    />
                    <Typography variant="body2" sx={{ minWidth: 30 }}>
                      {quantityValues[item.id] !== undefined ? quantityValues[item.id] : item.quantity}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {item.room && <Typography variant="body2"><HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.room}</Typography>}
                  {item.location && <Typography variant="body2"><RoomIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.location}</Typography>}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.quantity === 0 ? 'Rupture' : 'Disponible'} 
                    color={item.quantity === 0 ? 'warning' : 'success'} 
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    size="small" 
                    onClick={() => onEditEquipment(item)}
                    disabled={updatingCards.has(item.id)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => onDeleteEquipment(item)}
                    disabled={updatingCards.has(item.id)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )
  }

  // Rendu de la vue cartes (reste inchangé)
  const renderCardsView = () => {
    const filteredData = getFilteredMateriel()
    let materialByType: any = {}
    
    if (sortBy === 'category' && typeof filteredData === 'object' && !Array.isArray(filteredData)) {
      materialByType = filteredData
    } else {
      const items = Array.isArray(filteredData) ? filteredData : []
      materialByType = items.reduce((acc: any, item: any) => {
        const category = findEquipmentCategory(item.equipmentTypeId)
        const typeId = category ? category.id : 'CUSTOM'
        if (!acc[typeId]) acc[typeId] = []
        acc[typeId].push(item)
        return acc
      }, {})
      
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
    
    return Object.entries(materialByType).map(([typeId, items]: [string, any]) => {
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
                    {item.location && (
                      <Typography color="text.secondary">
                        <RoomIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.location}
                      </Typography>
                    )}
                    {item.room && (
                      <Typography color="text.secondary">
                        <HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {item.room}
                      </Typography>
                    )}
                    
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
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      {/* Afficher la notification d'erreur de configuration si nécessaire */}
      <ConfigErrorNotification />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Inventaire actuel</Typography>
        <ViewToggle 
          viewMode={viewMode} 
          onViewModeChange={handleViewModeChange}
        />
      </Box>
      
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
                  <HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {room.name}
                </MenuItem>,
                ...(room.locations || []).map((location: any) => (
                  <MenuItem 
                    key={`${room.id}-${location.id}`} 
                    value={`${room.name}|${location.name}`}
                    sx={{ pl: 4 }}
                  >
                    <RoomIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> {location.name}
                  </MenuItem>
                ))
              ])}
            </Select>
          </FormControl>
          {viewMode === 'cards' && (
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
          )}
        </Stack>
      </Box>

      {/* Affichage conditionnel selon le mode de vue */}
      {viewMode === 'cards' ? renderCardsView() : renderListView()}
      
      {/* Message si aucun résultat */}
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