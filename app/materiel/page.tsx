"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Button, Paper, Stack, Alert, CircularProgress,
  Stepper, Step, StepLabel, StepContent, TextField, FormControl, InputLabel,
  Select, MenuItem, Card, CardContent, CardMedia, CardActions, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Fab, Tab, Tabs,
  Slider, Tooltip, IconButton
} from "@mui/material"
import Grid from "@mui/material/Grid"
import { 
  Science, Category, Numbers, Inventory, Check, Add, Search,
  LocationOn, DateRange, Assignment, Warning, Save, Edit, Delete, CheckCircle
} from "@mui/icons-material"

// Types de matériel prédéfinis avec SVG
const EQUIPMENT_TYPES = [
  { 
    id: 'GLASSWARE', 
    name: 'Verrerie', 
    svg: '/svg/beaker.svg', 
    items: [
      { name: 'Bécher', svg: '/svg/beaker.svg', volumes: ['25ml', '50ml', '100ml', '250ml', '500ml', '1L'] },
      { name: 'Erlenmeyer', svg: '/svg/erlenmeyer.svg', volumes: ['50ml', '100ml', '250ml', '500ml', '1L', '2L'] },
      { name: 'Ballon', svg: '/svg/ballon.svg', volumes: ['50ml', '100ml', '250ml', '500ml', '1L', '2L'] },
      { name: 'Tube à essai', svg: '/svg/tube.svg', volumes: ['10ml', '15ml', '20ml', '25ml'] },
      { name: 'Flacon jaugé', svg: '/svg/flacon.svg', volumes: ['25ml', '50ml', '100ml', '250ml', '500ml', '1L'] },
    ]
  },
  { 
    id: 'MEASURING', 
    name: 'Mesure', 
    svg: '/svg/default.svg', 
    items: [
      { name: 'Pipette graduée', svg: '/svg/pipette.svg', volumes: ['1ml', '2ml', '5ml', '10ml', '25ml', '50ml'] },
      { name: 'Burette', svg: '/svg/burette.svg', volumes: ['10ml', '25ml', '50ml'] },
      { name: 'Éprouvette graduée', svg: '/svg/default.svg', volumes: ['10ml', '25ml', '50ml', '100ml', '250ml', '500ml', '1L'] },
      { name: 'Balance', svg: '/svg/default.svg', volumes: [] },
      { name: 'Pied à coulisse', svg: '/svg/default.svg', volumes: [] },
      { name: 'Thermomètre', svg: '/svg/default.svg', volumes: [] },
    ]
  },
  { 
    id: 'HEATING', 
    name: 'Chauffage', 
    svg: '/svg/default.svg', 
    items: [
      { name: 'Bec Bunsen', svg: '/svg/default.svg', volumes: [] },
      { name: 'Plaque chauffante', svg: '/svg/default.svg', volumes: [] },
      { name: 'Manteau chauffant', svg: '/svg/default.svg', volumes: [] },
      { name: 'Bain-marie', svg: '/svg/default.svg', volumes: [] },
    ]
  },
  { 
    id: 'SAFETY', 
    name: 'Sécurité', 
    svg: '/svg/default.svg', 
    items: [
      { name: 'Lunettes de protection', svg: '/svg/default.svg', volumes: [] },
      { name: 'Gants', svg: '/svg/default.svg', volumes: [] },
      { name: 'Hotte aspirante', svg: '/svg/default.svg', volumes: [] },
      { name: 'Douche de sécurité', svg: '/svg/default.svg', volumes: [] },
    ]
  },
]

interface EquipmentFormData {
  name: string
  type: string
  model?: string
  serialNumber?: string
  quantity: number
  volume?: string
  customVolume?: string
  resolution?: string
  location?: string
  room?: string
  supplier?: string
  purchaseDate?: string
  notes?: string
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function EquipmentPage() {
  const [tabValue, setTabValue] = useState(0)
  const [materiel, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les filtres et recherche
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [quantityValues, setQuantityValues] = useState<{[key: string]: number}>({})
  const [animatingQuantities, setAnimatingQuantities] = useState<Set<string>>(new Set())
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set())
  const [rooms, setRooms] = useState<any[]>([])

  // État pour le stepper d'ajout
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    type: '',
    quantity: 1,
    volume: '',
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [editingEquipment, setEditingEquipment] = useState<any>(null)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  
  // États pour le dialogue de continuation
  const [continueDialog, setContinueDialog] = useState(false)
  const [newlyCreatedItem, setNewlyCreatedItem] = useState<any>(null)
  
  // États pour la gestion des catégories personnalisées
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [newCategoryDialog, setNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  // États pour la suppression avec animation
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/equipement")
      if (!response.ok) throw new Error("Erreur lors du chargement du matériel")
      const data = await response.json()
      setEquipment(data.materiel || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/salles?includeLocations=true")
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des salles:", error)
    }
  }

  useEffect(() => {
    fetchEquipment()
    fetchRooms()
  }, [])

  // Fonction pour traduire les types
  const getTypeLabel = (type: string) => {
    const typeLabels: {[key: string]: string} = {
      'GLASSWARE': 'Verrerie',
      'MEASURING': 'Mesure',
      'HEATING': 'Chauffage',
      'SAFETY': 'Sécurité',
      'MIXING': 'Mélange',
      'STORAGE': 'Stockage',
      'ELECTRICAL': 'Électrique',
      'OPTICAL': 'Optique',
      'CUSTOM': 'Personnalisé'
    }
    return typeLabels[type] || type
  }

  // Fonction pour filtrer et trier le matériel
  const getFilteredMateriel = () => {
    let filtered = materiel.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.location?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      
      // Filtrage par lieu de stockage (salle ou localisation)
      let matchesLocation = true
      if (locationFilter !== 'all') {
        const [roomName, locationName] = locationFilter.split('|')
        if (locationName) {
          // Filtrage par localisation spécifique
          matchesLocation = item.room === roomName && item.location === locationName
        } else {
          // Filtrage par salle
          matchesLocation = item.room === roomName
        }
      }
      
      return matchesSearch && matchesType && matchesLocation
    })

    // Trier par catégorie par défaut, puis par nom
    if (sortBy === 'category') {
      const grouped = filtered.reduce((acc: any, item: any) => {
        const type = item.type || 'CUSTOM'
        if (!acc[type]) acc[type] = []
        acc[type].push(item)
        return acc
      }, {})
      
      // Retourner un objet groupé pour l'affichage par catégorie
      return grouped
    } else {
      // Tri normal
      filtered.sort((a: any, b: any) => {
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
      return filtered
    }
  }

  // Fonction pour gérer le changement de quantité
  const handleQuantityChange = async (equipmentId: string, newValue: number) => {
    const originalItem = materiel.find((item: any) => item.id === equipmentId) as any
    const isIncrease = newValue > (originalItem?.quantity || 0)
    
    try {
      setUpdatingCards(prev => new Set([...prev, equipmentId]))
      
      const response = await fetch(`/api/equipement/${equipmentId}`, {
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

      // Mettre à jour seulement l'élément concerné
      setEquipment((prev: any) => prev.map((item: any) => 
        item.id === equipmentId 
          ? { ...item, quantity: newValue }
          : item
      ))
      
      setQuantityValues(prev => ({
        ...prev,
        [equipmentId]: newValue
      }))

      // Animation pour les augmentations de quantité
      if (isIncrease) {
        setAnimatingQuantities(prev => new Set([...prev, equipmentId]))
        setTimeout(() => {
          setAnimatingQuantities(prev => {
            const newSet = new Set(prev)
            newSet.delete(equipmentId)
            return newSet
          })
        }, 1000)
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error)
      // Remettre l'ancienne valeur en cas d'erreur
      if (originalItem) {
        setQuantityValues(prev => ({
          ...prev,
          [equipmentId]: originalItem.quantity
        }))
      }
    } finally {
      setUpdatingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(equipmentId)
        return newSet
      })
    }
  }

  // Fonction pour rendre une carte d'équipement avec slider
  const renderEquipmentCard = (item: any) => {
    const currentQuantity = quantityValues[item.id] ?? item.quantity
    const maxQuantity = Math.max(currentQuantity * 2, 10)
    const isUpdating = updatingCards.has(item.id)
    const isDeleting = deletingItems.has(item.id)
    const isCustomItem = item.isCustom || !EQUIPMENT_TYPES.some(type => 
      type.items.some(preset => preset.name === item.name)
    )

    return (
      <Card sx={{ 
        height: '100%', 
        position: 'relative',
        opacity: isUpdating || isDeleting ? 0.5 : 1,
        transform: isDeleting ? 'scale(0.9)' : 'scale(1)',
        transition: 'all 0.5s ease-in-out',
        border: isDeleting ? '2px solid' : '1px solid',
        borderColor: isDeleting ? 'error.main' : 'divider'
      }}>
        {/* Overlay avec spinner pendant la mise à jour ou suppression */}
        {(isUpdating || isDeleting) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 1
            }}
          >
            <CircularProgress size={24} color={isDeleting ? "error" : "primary"} />
          </Box>
        )}

        
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6">{item.name}</Typography>
            {isCustomItem && (
              <Chip 
                label={`👤 ${item.createdBy || 'Personnalisé'}`}
                size="small" 
                color="secondary" 
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Typography color="text.secondary">
            Type: {getTypeLabel(item.type)}
          </Typography>

          
          {/* Slider de quantité */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{
                fontWeight: animatingQuantities.has(item.id) ? 'bold' : 'normal',
                fontSize: animatingQuantities.has(item.id) ? '1.1rem' : '0.875rem',
                color: animatingQuantities.has(item.id) ? 'success.main' : 'text.secondary',
                transition: 'all 0.3s ease-in-out',
                transform: animatingQuantities.has(item.id) ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              Quantité: {currentQuantity}
            </Typography>
            <Slider
              value={currentQuantity}
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
                  handleQuantityChange(item.id, value)
                }
              }}
              min={0}
              max={maxQuantity}
              step={1}
              size="small"
              valueLabelDisplay="auto"
              sx={{
                color: currentQuantity === 0 ? 'error.main' : 'primary.main'
              }}
            />
          </Box>
          
          {item.location && (
            <Typography color="text.secondary">
              📍 {item.location}
            </Typography>
          )}
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip 
              label={item.status || 'Disponible'} 
              color="success" 
              size="small"
            />
            <Box>
              <Tooltip title="Modifier">
                <IconButton
                  size="small"
                  onClick={() => handleEditEquipment(item)}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteEquipment(item)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleReset = () => {
    setActiveStep(0)
    setFormData({
      name: '',
      type: '',
      quantity: 1,
      volume: '',
    })
    setSelectedCategory('')
    setSelectedItem(null)
  }

  const handleEditEquipment = (equipment: any) => {
    setEditingEquipment(equipment)
    setOpenEditDialog(true)
  }

  // Fonction pour obtenir les volumes disponibles pour un équipement
  const getAvailableVolumes = (equipmentName: string): string[] => {
    for (const type of EQUIPMENT_TYPES) {
      const item = type.items.find(item => item.name === equipmentName)
      if (item) {
        return item.volumes || []
      }
    }
    return []
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/equipement/${editingEquipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEquipment)
      })
      
      if (!response.ok) throw new Error("Erreur lors de la modification")
      
      await fetchEquipment()
      setOpenEditDialog(false)
      setEditingEquipment(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la modification")
    }
  }

  const handleDeleteEquipment = (equipment: any) => {
    setEquipmentToDelete(equipment)
    setDeleteDialog(true)
  }

  const confirmDeleteEquipment = async () => {
    if (!equipmentToDelete) return

    try {
      // Ajouter l'ID à la liste des éléments en cours de suppression
      setDeletingItems(prev => new Set([...prev, equipmentToDelete.id]))
      setDeleteDialog(false)

      const response = await fetch(`/api/equipement/${equipmentToDelete.id}`, {
        method: "DELETE"
      })
      
      if (!response.ok) throw new Error("Erreur lors de la suppression")
      
      // Attendre un peu pour l'animation
      setTimeout(async () => {
        await fetchEquipment()
        setDeletingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(equipmentToDelete.id)
          return newSet
        })
        setEquipmentToDelete(null)
      }, 1000)

    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression")
      setDeletingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(equipmentToDelete.id)
        return newSet
      })
      setEquipmentToDelete(null)
    }
  }

  // Gestion des catégories personnalisées
  const handleCreateCustomCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: 'CUSTOM_' + Date.now(),
        name: newCategoryName.trim(),
        svg: '/svg/default.svg',
        items: []
      }
      setCustomCategories(prev => [...prev, newCategory])
      setNewCategoryName('')
      setNewCategoryDialog(false)
    }
  }

  const getAllCategories = () => {
    return [...EQUIPMENT_TYPES, ...customCategories]
  }

  // Correction du FAB - ouvre directement le formulaire d'ajout
  const handleQuickAdd = () => {
    setTabValue(0)  // Va à l'onglet ajout
    setActiveStep(0)  // Remet à la première étape
    setSelectedCategory('')  // Reset la sélection
    setSelectedItem(null)
    setFormData({
      name: '',
      type: '',
      quantity: 1,
      volume: '',
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setFormData(prev => ({ ...prev, type: categoryId }))
    handleNext()
  }

  const handleItemSelect = (item: any) => {
    setSelectedItem(item)
    setFormData(prev => ({ 
      ...prev, 
      name: item.name,
      volume: item.volumes && item.volumes.length > 0 ? item.volumes[0] : ''
    }))
    handleNext()
  }

  const handleFormChange = (field: keyof EquipmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      // Construire le nom final avec le volume si applicable
      const finalName = formData.volume 
        ? `${formData.name} ${formData.customVolume || formData.volume}`
        : formData.name

      const dataToSubmit = {
        ...formData,
        name: finalName
      }

      const response = await fetch("/api/equipement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit)
      })
      
      if (!response.ok) throw new Error("Erreur lors de l'ajout")
      
      const newEquipment = await response.json()
      await fetchEquipment()
      
      // Si c'est un équipement personnalisé, proposer de continuer
      if (selectedItem?.name === 'Équipment personnalisé') {
        setNewlyCreatedItem(newEquipment)
        setContinueDialog(true)
      } else {
        handleReset()
        setTabValue(1) // Basculer vers l'onglet inventaire
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    }
  }

  // Fonction pour continuer l'ajout dans l'inventaire
  const handleContinueToInventory = () => {
    if (!newlyCreatedItem) {
      console.error('Aucun élément nouvellement créé trouvé')
      setContinueDialog(false)
      return
    }

    setContinueDialog(false)
    setActiveStep(2) // Aller à l'étape "Compléter les informations"
    setFormData(prev => ({
      ...prev,
      name: newlyCreatedItem.name || '',
      type: newlyCreatedItem.type || '',
      quantity: 1,
      location: '',
      room: '',
      notes: ''
    }))
    setNewlyCreatedItem(null)
  }

  // Fonction pour terminer sans continuer
  const handleFinishWithoutContinue = () => {
    setContinueDialog(false)
    setNewlyCreatedItem(null)
    handleReset()
    setTabValue(1) // Basculer vers l'onglet inventaire
  }

  const steps = [
    {
      label: 'Catégorie',
      description: 'Choisir le type de matériel',
      icon: <Category />
    },
    {
      label: 'Matériel',
      description: 'Sélectionner l\'équipement',
      icon: <Science />
    },
    {
      label: 'Détails',
      description: 'Compléter les informations',
      icon: <Assignment />
    },
    {
      label: 'Finalisation',
      description: 'Vérifier et enregistrer',
      icon: <Check />
    }
  ]

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Gestion du Matériel
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Inventaire et ajout de matériel de laboratoire
      </Typography>

      {/* Tabs principales */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Ajouter du matériel" icon={<Add />} />
          <Tab label="Inventaire actuel" icon={<Inventory />} />
        </Tabs>
      </Box>

      {/* Onglet Ajout */}
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={3} sx={{ p: 3 }}>
          {/* Stepper horizontal */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  icon={step.icon}
                  onClick={() => {
                    // Permettre la navigation vers les étapes précédentes
                    // et vers l'étape suivante si on a les données nécessaires
                    if (index < activeStep || 
                        (index === 1 && selectedCategory) ||
                        (index === 2 && selectedItem) ||
                        (index === 3 && formData.name && formData.type)) {
                      setActiveStep(index)
                    }
                  }}
                  sx={{
                    '& .MuiStepIcon-root': {
                      fontSize: '2rem',
                    },
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      borderRadius: 1,
                    }
                  }}
                >
                  <Typography variant="h6">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Contenu des étapes */}
          <Box sx={{ minHeight: 400 }}>
            {/* Étape 0: Sélection de catégorie */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="h5" gutterBottom>Choisir une catégorie</Typography>
                <Grid container spacing={3}>
                  {getAllCategories().map((category) => (
                    <Grid key={category.id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.05)' },
                          border: selectedCategory === category.id ? 2 : 1,
                          borderColor: selectedCategory === category.id ? 'primary.main' : 'divider'
                        }}
                        onClick={() => handleCategorySelect(category.id)}
                      >
                        <CardMedia
                          component="img"
                          height="120"
                          image={category.svg}
                          alt={category.name}
                          sx={{ objectFit: 'contain', p: 2 }}
                        />
                        <CardContent>
                          <Typography variant="h6" textAlign="center">
                            {category.name}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  
                  {/* Bouton pour ajouter une nouvelle catégorie */}
                  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        '&:hover': { transform: 'scale(1.05)' },
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.light',
                        opacity: 0.7
                      }}
                      onClick={() => setNewCategoryDialog(true)}
                    >
                      <CardContent sx={{ 
                        height: 120, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center', 
                        alignItems: 'center' 
                      }}>
                        <Add sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                      </CardContent>
                      <CardContent sx={{ pt: 0 }}>
                        <Typography variant="h6" textAlign="center" color="primary.main">
                          Nouvelle catégorie
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Étape 1: Sélection d'équipement */}
            {activeStep === 1 && selectedCategory && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  Choisir un équipement - {getAllCategories().find(t => t.id === selectedCategory)?.name}
                </Typography>
                <Grid container spacing={2}>
                  {EQUIPMENT_TYPES.find(t => t.id === selectedCategory)?.items.map((item, index) => (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          border: selectedItem?.name === item.name ? 2 : 0,
                          borderColor: 'primary.main'
                        }}
                        onClick={() => handleItemSelect(item)}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={item.svg} sx={{ width: 56, height: 56 }} />
                          <Typography variant="body1">{item.name}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                <Button 
                  variant="outlined" 
                  sx={{ mt: 2 }} 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, name: 'Équipement personnalisé' }))
                    setSelectedItem({ name: 'Équipment personnalisé', svg: '/svg/default.svg' })
                    handleNext()
                  }}
                >
                  Ajouter un équipement personnalisé
                </Button>
              </Box>
            )}

            {/* Étape 2: Détails */}
            {activeStep === 2 && (
              <Box>
                <Typography variant="h5" gutterBottom>Compléter les informations</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nom de l'équipement"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      margin="normal"
                      disabled={selectedItem?.name !== 'Équipment personnalisé'}
                      helperText={selectedItem?.name !== 'Équipment personnalisé' ? 
                        'Nom prédéfini pour cet équipement' : 
                        'Saisissez le nom de votre équipement personnalisé'
                      }
                    />
                    
                    {/* Sélection de volume pour la verrerie et équipement de mesure */}
                    {selectedItem?.volumes && selectedItem.volumes.length > 0 && (
                      <Autocomplete
                        freeSolo
                        options={selectedItem.volumes}
                        value={formData.customVolume || formData.volume || ''}
                        onInputChange={(_, newValue) => {
                          handleFormChange('volume', newValue)
                          handleFormChange('customVolume', newValue)
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label="Volume"
                            margin="normal"
                            placeholder="Choisissez un volume ou saisissez le vôtre"
                            helperText="Sélectionnez dans la liste ou tapez une valeur personnalisée"
                          />
                        )}
                        noOptionsText="Tapez votre volume personnalisé"
                        sx={{ mt: 2 }}
                      />
                    )}

                    {/* Champ résolution pour les appareils de mesure */}
                    {selectedCategory === 'MEASURING' && (
                      <TextField
                        fullWidth
                        label="Résolution de l'appareil"
                        value={formData.resolution || ''}
                        onChange={(e) => handleFormChange('resolution', e.target.value)}
                        margin="normal"
                        placeholder="ex: 0.1mg, 0.01ml, 0.1°C"
                        helperText="Précision de l'appareil de mesure"
                      />
                    )}

                    <TextField
                      fullWidth
                      label="Quantité"
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => handleFormChange('quantity', parseInt(e.target.value) || 1)}
                      margin="normal"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Modèle/Référence"
                      value={formData.model || ''}
                      onChange={(e) => handleFormChange('model', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Numéro de série"
                      value={formData.serialNumber || ''}
                      onChange={(e) => handleFormChange('serialNumber', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Localisation"
                      value={formData.location || ''}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      margin="normal"
                      placeholder="ex: Armoire A, Étagère 2"
                    />
                    <TextField
                      fullWidth
                      label="Salle"
                      value={formData.room || ''}
                      onChange={(e) => handleFormChange('room', e.target.value)}
                      margin="normal"
                      placeholder="ex: Labo 101"
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      margin="normal"
                      multiline
                      rows={3}
                      placeholder="Observations, état, remarques..."
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Étape 3: Finalisation */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h5" gutterBottom>Vérification</Typography>
                <Card sx={{ p: 3 }}>
                  <Stack spacing={2}>
                    <Typography><strong>Nom:</strong> {formData.volume ? `${formData.name} ${formData.customVolume || formData.volume}` : formData.name}</Typography>
                    <Typography><strong>Type:</strong> {EQUIPMENT_TYPES.find(t => t.id === formData.type)?.name}</Typography>
                    <Typography><strong>Quantité:</strong> {formData.quantity}</Typography>
                    {formData.model && <Typography><strong>Modèle:</strong> {formData.model}</Typography>}
                    {formData.location && <Typography><strong>Localisation:</strong> {formData.location}</Typography>}
                    {formData.room && <Typography><strong>Salle:</strong> {formData.room}</Typography>}
                    {formData.notes && <Typography><strong>Notes:</strong> {formData.notes}</Typography>}
                  </Stack>
                </Card>
              </Box>
            )}
          </Box>

          {/* Boutons de navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Retour
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={<Save />}
              >
                Enregistrer
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={
                  (activeStep === 0 && !selectedCategory) ||
                  (activeStep === 1 && !selectedItem) ||
                  (activeStep === 2 && !formData.name.trim())
                }
              >
                Suivant
              </Button>
            )}
          </Box>
        </Paper>
      </TabPanel>

      {/* Onglet Inventaire */}
      <TabPanel value={tabValue} index={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
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
                // Créer les groupes à partir de la liste filtrée
                const items = Array.isArray(filteredData) ? filteredData : []
                materialByType = items.reduce((acc: any, item: any) => {
                  const type = item.type || 'CUSTOM'
                  if (!acc[type]) acc[type] = []
                  acc[type].push(item)
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
              return Object.entries(materialByType).map(([type, items]: [string, any]) => (
                <Box key={type} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}>
                    📦 {getTypeLabel(type)} ({items.length})
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
                            <Typography variant="h6">{item.name}</Typography>
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
                                    handleQuantityChange(item.id, value)
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
                                  onClick={() => handleEditEquipment(item)}
                                  sx={{ mr: 1 }}
                                >
                                  Modifier
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteEquipment(item.id)}
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
              ))
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
                    {searchTerm || typeFilter !== 'all' || locationFilter !== 'all' ? 
                      'Aucun matériel ne correspond aux critères de recherche' :
                      'Aucun matériel dans l\'inventaire'
                    }
                  </Typography>
                </Box>
              )
            })()}
          </Paper>
        )}
      </TabPanel>

      {/* Dialog de modification d'équipement */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier l'équipement</DialogTitle>
        <DialogContent>
          {editingEquipment && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Nom (sans volume)"
                value={editingEquipment.name?.split(' - ')[0] || editingEquipment.name || ''}
                onChange={(e) => {
                  const baseName = e.target.value
                  const volume = editingEquipment.volume || ''
                  const newName = volume ? `${baseName} - ${volume}` : baseName
                  setEditingEquipment({...editingEquipment, name: newName, baseName})
                }}
              />
              <Autocomplete
                freeSolo
                options={getAvailableVolumes(editingEquipment.baseName || editingEquipment.name?.split(' - ')[0] || editingEquipment.name || '')}
                value={editingEquipment.volume || ''}
                onInputChange={(_, newValue) => {
                  const volume = newValue
                  const baseName = editingEquipment.baseName || editingEquipment.name?.split(' - ')[0] || editingEquipment.name || ''
                  const newName = volume ? `${baseName} - ${volume}` : baseName
                  setEditingEquipment({...editingEquipment, volume, name: newName})
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    fullWidth
                    label="Volume"
                    placeholder="ex: 250ml, 1L ou valeur personnalisée"
                  />
                )}
                noOptionsText="Aucun volume prédéfini - vous pouvez saisir une valeur personnalisée"
              />
              {editingEquipment.type === 'MEASURING' && (
                <TextField
                  fullWidth
                  label="Résolution de l'appareil"
                  value={editingEquipment.resolution || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, resolution: e.target.value})}
                  placeholder="ex: 0.1mg, 0.01ml"
                />
              )}
              <TextField
                fullWidth
                label="Quantité"
                type="number"
                value={editingEquipment.quantity || 1}
                onChange={(e) => setEditingEquipment({...editingEquipment, quantity: parseInt(e.target.value) || 1})}
                inputProps={{ min: 1 }}
              />
              <TextField
                fullWidth
                label="Localisation"
                value={editingEquipment.location || ''}
                onChange={(e) => setEditingEquipment({...editingEquipment, location: e.target.value})}
              />
              <TextField
                fullWidth
                label="Salle"
                value={editingEquipment.room || ''}
                onChange={(e) => setEditingEquipment({...editingEquipment, room: e.target.value})}
              />
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={editingEquipment.notes || ''}
                onChange={(e) => setEditingEquipment({...editingEquipment, notes: e.target.value})}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* FAB pour ajout rapide */}
      <Fab
        color="primary"
        aria-label="add equipment"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleQuickAdd}
      >
        <Add />
      </Fab>

      {/* Dialogue de continuation après ajout de matériel personnalisé */}
      <Dialog
        open={continueDialog}
        onClose={() => setContinueDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Matériel créé avec succès !
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {newlyCreatedItem?.name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Paper 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2
            }}
          >
            <Typography variant="body1" gutterBottom>
              Souhaitez-vous poursuivre et ajouter ce matériel à votre inventaire avec des détails complémentaires ?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              Vous pourrez spécifier la quantité, localisation, salle et notes.
            </Typography>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleFinishWithoutContinue}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Non, terminer
          </Button>
          <Button 
            onClick={handleContinueToInventory}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Inventory />}
          >
            Oui, ajouter à l'inventaire
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue pour créer une nouvelle catégorie */}
      <Dialog
        open={newCategoryDialog}
        onClose={() => setNewCategoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nouvelle catégorie de matériel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la catégorie"
            fullWidth
            variant="outlined"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreateCustomCategory}
            variant="contained"
            disabled={!newCategoryName.trim()}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de suppression stylisé */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="inherit" />
            <Typography variant="h6">Confirmer la suppression</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Paper sx={{ 
            p: 2, 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2
          }}>
            <Typography variant="body1" gutterBottom>
              Êtes-vous sûr de vouloir supprimer "{equipmentToDelete?.name}" ?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              Cette action est irréversible. L'équipement sera définitivement retiré de l'inventaire.
            </Typography>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setDeleteDialog(false)}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={confirmDeleteEquipment}
            variant="contained"
            color="error"
            sx={{ 
              backgroundColor: 'rgba(244, 67, 54, 0.8)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(244, 67, 54, 1)' },
              fontWeight: 'bold'
            }}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
