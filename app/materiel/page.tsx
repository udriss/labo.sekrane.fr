"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Button, Paper, Stack, Alert, CircularProgress,
  Stepper, Step, StepLabel, StepContent, TextField, FormControl, InputLabel,
  Select, MenuItem, Card, CardContent, CardMedia, CardActions, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Fab, Tab, Tabs
} from "@mui/material"
import Grid from "@mui/material/Grid"
import { 
  Science, Category, Numbers, Inventory, Check, Add, Search,
  LocationOn, DateRange, Assignment, Warning, Save
} from "@mui/icons-material"

// Types de matériel prédéfinis avec SVG
const EQUIPMENT_TYPES = [
  { id: 'GLASSWARE', name: 'Verrerie', svg: '/svg/beaker.svg', items: [
    { name: 'Bécher 100ml', svg: '/svg/beaker.svg' },
    { name: 'Erlenmeyer 250ml', svg: '/svg/erlenmeyer.svg' },
    { name: 'Ballon 500ml', svg: '/svg/ballon.svg' },
    { name: 'Tube à essai', svg: '/svg/tube.svg' },
    { name: 'Pipette graduée', svg: '/svg/pipette.svg' },
    { name: 'Burette', svg: '/svg/burette.svg' },
  ]},
  { id: 'HEATING', name: 'Chauffage', svg: '/svg/default.svg', items: [
    { name: 'Bec Bunsen', svg: '/svg/default.svg' },
    { name: 'Plaque chauffante', svg: '/svg/default.svg' },
    { name: 'Thermomètre', svg: '/svg/default.svg' },
  ]},
  { id: 'MEASURING', name: 'Mesure', svg: '/svg/default.svg', items: [
    { name: 'Balance', svg: '/svg/default.svg' },
    { name: 'Éprouvette graduée', svg: '/svg/default.svg' },
    { name: 'Pied à coulisse', svg: '/svg/default.svg' },
  ]},
  { id: 'SAFETY', name: 'Sécurité', svg: '/svg/default.svg', items: [
    { name: 'Lunettes de protection', svg: '/svg/default.svg' },
    { name: 'Gants', svg: '/svg/default.svg' },
    { name: 'Hotte aspirante', svg: '/svg/default.svg' },
  ]},
]

interface EquipmentFormData {
  name: string
  type: string
  model?: string
  serialNumber?: string
  quantity: number
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

  // État pour le stepper d'ajout
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    type: '',
    quantity: 1,
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<any>(null)

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

  useEffect(() => {
    fetchEquipment()
  }, [])

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
    })
    setSelectedCategory('')
    setSelectedItem(null)
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setFormData(prev => ({ ...prev, type: categoryId }))
    handleNext()
  }

  const handleItemSelect = (item: any) => {
    setSelectedItem(item)
    setFormData(prev => ({ ...prev, name: item.name }))
    handleNext()
  }

  const handleFormChange = (field: keyof EquipmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/equipement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error("Erreur lors de l'ajout")
      
      await fetchEquipment()
      handleReset()
      setTabValue(1) // Basculer vers l'onglet inventaire
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    }
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
                  sx={{
                    '& .MuiStepIcon-root': {
                      fontSize: '2rem',
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
                  {EQUIPMENT_TYPES.map((category) => (
                    <Grid key={category.id} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.05)' }
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
                </Grid>
              </Box>
            )}

            {/* Étape 1: Sélection d'équipement */}
            {activeStep === 1 && selectedCategory && (
              <Box>
                <Typography variant="h5" gutterBottom>
                  Choisir un équipement - {EQUIPMENT_TYPES.find(t => t.id === selectedCategory)?.name}
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
                <Typography variant="h5" gutterBottom>Détails de l'équipement</Typography>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Nom de l'équipement"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Modèle"
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
                      type="number"
                      label="Quantité"
                      value={formData.quantity}
                      onChange={(e) => handleFormChange('quantity', parseInt(e.target.value))}
                      margin="normal"
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Localisation"
                      value={formData.location || ''}
                      onChange={(e) => handleFormChange('location', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Salle"
                      value={formData.room || ''}
                      onChange={(e) => handleFormChange('room', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      label="Fournisseur"
                      value={formData.supplier || ''}
                      onChange={(e) => handleFormChange('supplier', e.target.value)}
                      margin="normal"
                    />
                    <TextField
                      fullWidth
                      type="date"
                      label="Date d'achat"
                      value={formData.purchaseDate || ''}
                      onChange={(e) => handleFormChange('purchaseDate', e.target.value)}
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Notes"
                      value={formData.notes || ''}
                      onChange={(e) => handleFormChange('notes', e.target.value)}
                      margin="normal"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Étape 3: Récapitulatif */}
            {activeStep === 3 && (
              <Box>
                <Typography variant="h5" gutterBottom>Récapitulatif</Typography>
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <List>
                          <ListItem>
                            <ListItemAvatar>
                              <Avatar src={selectedItem?.svg} />
                            </ListItemAvatar>
                            <ListItemText 
                              primary={formData.name}
                              secondary={`Type: ${EQUIPMENT_TYPES.find(t => t.id === formData.type)?.name}`}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Quantité"
                              secondary={formData.quantity}
                            />
                          </ListItem>
                          {formData.model && (
                            <ListItem>
                              <ListItemText 
                                primary="Modèle"
                                secondary={formData.model}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <List>
                          {formData.location && (
                            <ListItem>
                              <ListItemText 
                                primary="Localisation"
                                secondary={formData.location}
                              />
                            </ListItem>
                          )}
                          {formData.room && (
                            <ListItem>
                              <ListItemText 
                                primary="Salle"
                                secondary={formData.room}
                              />
                            </ListItem>
                          )}
                          {formData.supplier && (
                            <ListItem>
                              <ListItemText 
                                primary="Fournisseur"
                                secondary={formData.supplier}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Grid>
                    </Grid>
                  </CardContent>
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
              Précédent
            </Button>
            <Box>
              <Button onClick={handleReset} sx={{ mr: 1 }}>
                Réinitialiser
              </Button>
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
                    (activeStep === 2 && !formData.name)
                  }
                >
                  Suivant
                </Button>
              )}
            </Box>
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
            <Grid container spacing={2}>
              {materiel.map((item: any) => (
                <Grid key={item.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6">{item.name}</Typography>
                      <Typography color="text.secondary">
                        Type: {item.type}
                      </Typography>
                      <Typography color="text.secondary">
                        Quantité: {item.quantity}
                      </Typography>
                      <Chip 
                        label={item.status || 'Disponible'} 
                        color="success" 
                        size="small" 
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
      </TabPanel>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Container>
  )
}
