// components/equipment/equipment-add-tab.tsx

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Card,
  CardContent,
  CardMedia,
  TextField,
  Button,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Divider,
  Avatar,
  Chip,
  IconButton,
  CardActions,
  Tooltip
} from "@mui/material"
import { 
  Add, 
  Check, 
  Science, 
  Category, 
  Numbers, 
  Home, 
  LocationOn,
  Edit,
  Delete,
  Person,
  Settings,
  Room
} from "@mui/icons-material"
import { EquipmentType, EquipmentItem, EquipmentFormData } from "@/types/equipment"

interface EquipmentAddTabProps {
  activeStep: number
  setActiveStep: (step: number) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  selectedItem: EquipmentItem | null
  setSelectedItem: (item: EquipmentItem | null) => void
  formData: EquipmentFormData
  setFormData: (data: EquipmentFormData) => void
  equipmentTypes: EquipmentType[]
  rooms: any[]
  onCategorySelect: (categoryId: string) => void
  onItemSelect: (item: EquipmentItem) => void
  onFormChange: (field: string, value: any) => void
  onSubmit: () => void
  onReset: () => void
  loading: boolean
  currentUser?: any // Ajouter l'utilisateur actuel
  users?: any[] // Ajouter la liste des utilisateurs
  onEditCategory?: (categoryId: string) => void
  onDeleteCategory?: (categoryId: string) => void
  getAllCategories: () => EquipmentType[]
}

export function EquipmentAddTab({
  activeStep,
  setActiveStep,
  selectedCategory,
  setSelectedCategory,
  selectedItem,
  setSelectedItem,
  formData,
  setFormData,
  equipmentTypes,
  rooms,
  onCategorySelect,
  onItemSelect,
  onFormChange,
  onSubmit,
  onReset,
  loading,
  currentUser,
  users = [],
  onEditCategory,
  onDeleteCategory,
  getAllCategories,
}: EquipmentAddTabProps) {
  const steps = [
    {
      label: 'Catégorie',
      description: 'Choisir le type de matériel',
      icon: <Category />
    },
    {
      label: 'Équipement',
      description: 'Sélectionner l\'équipement spécifique',
      icon: <Science />
    },
    {
      label: 'Détails',
      description: 'Remplir les détails',
      icon: <Numbers />
    },
    {
      label: 'Confirmation',
      description: 'Vérifier et enregistrer',
      icon: <Check />
    }
  ]

  // Séparer les catégories standard et custom
  const getStandardCategories = () => equipmentTypes.filter(type => !type.isCustom)
  const getCustomCategories = () => equipmentTypes.filter(type => type.isCustom)

  // Vérifier si l'utilisateur peut modifier/supprimer une catégorie
  const canModifyCategory = (category: EquipmentType) => {
    if (!currentUser) return false
    return (
      category.ownerId === currentUser.id || 
      currentUser.role === 'ADMIN' || 
      currentUser.role === 'ADMINLABO'
    )
  }

  // Obtenir le nom du propriétaire
  const getOwnerName = (ownerId?: string) => {
    if (!ownerId || ownerId === 'SYSTEM') return 'Système'
    const owner = users.find(user => user.id === ownerId)
    return owner?.name || 'Inconnu'
  }

  const presetCategories = getAllCategories().filter(c => !c.isCustom)
              const customCategories = getAllCategories().filter(c => c.isCustom)

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      {/* Stepper horizontal */}
      <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              icon={
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    bgcolor: index === activeStep ? 'primary.main' : 'grey.300',
                    color: index === activeStep ? 'white' : 'text.secondary',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {step.icon}
                </Box>
              }
              onClick={() => {
                if (index < activeStep || 
                    (index === 1 && selectedCategory) ||
                    (index === 2 && selectedItem) ||
                    (index === 3 && formData.name && formData.equipmentTypeId)) {
                  setActiveStep(index)
                }
              }}
              sx={{
                cursor: 'pointer',
                '& .MuiStepIcon-root': {
                  fontSize: '2rem',
                },
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  borderRadius: 1,
                },
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: index === activeStep ? 'bold' : 'normal',
                  color: index === activeStep ? 'primary.main' : 'text.secondary',
                }}
              >
                {step.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: index === activeStep ? 'primary.main' : 'text.secondary',
                }}
              >
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
            
            {/* Catégories standard */}
            {getStandardCategories().length > 0 && (
              <>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      mb: 3,
                      pb: 1,
                      borderBottom: '2px solid',
                      borderColor: 'primary.main'
                    }}>
                      <Avatar sx={{ 
                        bgcolor: 'primary.main', 
                        width: 32, 
                        height: 32,
                        fontSize: '1rem'
                      }}>
                        📦
                      </Avatar>
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                        Catégories standard
                      </Typography>
                      <Chip 
                        label={`${presetCategories.length} catégories`} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                <Grid container spacing={3}>
                  {getStandardCategories().map((category) => (
                    <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.05)' },
                          border: selectedCategory === category.id ? 2 : 1,
                          borderColor: selectedCategory === category.id ? 'primary.main' : 'divider'
                        }}
                        onClick={() => onCategorySelect(category.id)}
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
              </>
            )}

            {/* Divider si on a les deux types */}
            {getStandardCategories().length > 0 && getCustomCategories().length > 0 && (
            <Divider sx={{ my: 4 }}>
              <Box sx={{ 
                my: 5, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'divider' }} />
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'divider' }} />
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'divider' }} />
              </Box>
            </Divider>
            )}

            {/* Catégories personnalisées */}
            {getCustomCategories().length > 0 && (
              <>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        mb: 3,
                        pb: 1,
                        borderBottom: '2px solid',
                        borderColor: 'secondary.main'
                      }}>
                        <Avatar sx={{ 
                          bgcolor: 'secondary.main', 
                          width: 32, 
                          height: 32,
                          fontSize: '1rem'
                        }}>
                          🔧
                        </Avatar>
                        <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 600 }}>
                          Catégories personnalisées
                        </Typography>
                        <Chip 
                          label={`${customCategories.length} catégories`} 
                          size="small" 
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                <Grid container spacing={3}>
                  {getCustomCategories().map((category) => (
                    <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'scale(1.05)' },
                          border: selectedCategory === category.id ? 2 : 1,
                          borderColor: selectedCategory === category.id ? 'secondary.main' : 'divider',
                          bgcolor: 'action.hover',
                          position: 'relative'
                        }}
                        onClick={() => onCategorySelect(category.id)}
                      >
                        {/* Overline avec le nom du créateur */}
                        <Typography
                          variant="overline"
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            right: 8,
                            color: 'text.secondary',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontSize: '0.7rem'
                          }}
                        >
                          <Person fontSize="inherit" />
                          par {getOwnerName(category.ownerId)}
                        </Typography>

                        <CardMedia
                          component="img"
                          height="120"
                          image={category.svg}
                          alt={category.name}
                          sx={{ 
                            objectFit: 'contain', 
                            p: 2,
                            mt: 3, // Espace pour l'overline
                            filter: 'opacity(0.8)'
                          }}
                        />
                        <CardContent>
                          <Typography variant="h6" textAlign="center" sx={{ fontStyle: 'italic' }}>
                            {category.name}
                          </Typography>
                        </CardContent>
                        
                        {/* Actions si l'utilisateur peut modifier */}
                        {canModifyCategory(category) && (
                          <CardActions sx={{ justifyContent: 'center', pb: 1 }}>
                            <Tooltip title="Modifier la catégorie">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEditCategory?.(category.id)
                                }}
                                sx={{ color: 'primary.main' }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                                                        <Tooltip title="Supprimer la catégorie">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteCategory?.(category.id)
                                }}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </CardActions>
                        )}
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        )}

        {/* Étape 1: Sélection d'équipement */}
        {activeStep === 1 && selectedCategory && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Choisir un équipement - {equipmentTypes.find(t => t.id === selectedCategory)?.name}
            </Typography>
            
            {(() => {
              const category = equipmentTypes.find((t: EquipmentType) => t.id === selectedCategory)
              const allItems = category?.items || []
              const presetItems = allItems.filter((item: EquipmentItem) => !item.isCustom)
              const customItems = allItems.filter((item: EquipmentItem) => item.isCustom)
              
              return (
                <>
                  {/* Équipements preset */}
                  {presetItems.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                        📦 Équipements standard
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        {presetItems.map((item: EquipmentItem, index: number) => (
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                border: selectedItem?.name === item.name ? 2 : 0,
                                borderColor: 'primary.main'
                              }}
                              onClick={() => onItemSelect(item)}
                            >
                              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.svg} sx={{ width: 56, height: 56 }} />
                                <Typography variant="body1">{item.name}</Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}
                  
                  {/* Divider si on a les deux types */}
                  {presetItems.length > 0 && customItems.length > 0 && (
                    <Divider sx={{ my: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Équipements personnalisés
                      </Typography>
                    </Divider>
                  )}
                  
                  {/* Équipements personnalisés */}
                  {customItems.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                        🔧 Équipements personnalisés
                      </Typography>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        {customItems.map((item: EquipmentItem, index: number) => (
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                border: selectedItem?.name === item.name ? 2 : 0,
                                borderColor: 'secondary.main',
                                bgcolor: 'action.hover'
                              }}
                              onClick={() => onItemSelect(item)}
                            >
                              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar 
                                  src={item.svg} 
                                  sx={{ 
                                    width: 56, 
                                    height: 56,
                                    bgcolor: 'secondary.light',
                                    color: 'secondary.contrastText'
                                  }} 
                                />
                                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                                  {item.name}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}

                  {/* Message si aucun équipement */}
                  {allItems.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Aucun équipement dans cette catégorie
                      </Typography>
                    </Box>
                  )}
                </>
              )
            })()}
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
                  onChange={(e) => onFormChange('name', e.target.value)}
                  margin="normal"
                  disabled={selectedItem?.name !== 'Équipement personnalisé'}
                  helperText={selectedItem?.name !== 'Équipement personnalisé' ? 
                    'Nom prédéfini pour cet équipement' : 
                    'Saisissez le nom de votre équipement personnalisé'
                  }
                />
                
                {/* Sélection de volume */}
                {selectedItem?.volumes && selectedItem.volumes.length > 0 && (
                  <Autocomplete
                    freeSolo
                    options={selectedItem.volumes}
                    value={formData.customVolume || formData.volume || ''}
                    onInputChange={(_, newValue) => {
                      onFormChange('volume', newValue)
                      onFormChange('customVolume', newValue)
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Volume/Capacité"
                        margin="normal"
                        placeholder="Choisissez un volume ou saisissez le vôtre"
                        helperText="Sélectionnez dans la liste ou tapez une valeur personnalisée"
                      />
                    )}
                    noOptionsText="Tapez votre volume personnalisé"
                    sx={{ mt: 2 }}
                  />
                )}

                {/* Champ résolution */}
                {selectedItem?.resolutions && selectedItem.resolutions.length > 0 && (
                  <Autocomplete
                    freeSolo
                    options={selectedItem.resolutions}
                    value={formData.resolution || ''}
                    onChange={(_, newValue) => onFormChange('resolution', newValue)}
                    onInputChange={(_, newValue) => onFormChange('resolution', newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Résolution/Précision"
                        margin="normal"
                        placeholder="ex: 0.1mg, 0.01ml, 0.1°C"
                        helperText="Précision de l'appareil"
                      />
                    )}
                    noOptionsText="Tapez votre résolution personnalisée"
                  />
                )}

                {/* Champ taille/dimension */}
                {selectedItem?.tailles && selectedItem.tailles.length > 0 && (
                  <Autocomplete
                    freeSolo
                    options={selectedItem.tailles}
                    value={formData.taille || ''}
                    onChange={(_, newValue) => onFormChange('taille', newValue)}
                    onInputChange={(_, newValue) => onFormChange('taille', newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Taille/Dimension"
                        margin="normal"
                        placeholder="ex: 10x10cm, Ø15mm, L:50cm"
                        helperText="Dimensions de l'équipement"
                      />
                    )}
                    noOptionsText="Tapez vos dimensions personnalisées"
                  />
                )}

                {/* Champ matériau */}
                {selectedItem?.materiaux && selectedItem.materiaux.length > 0 && (
                  <Autocomplete
                    freeSolo
                    options={selectedItem.materiaux}
                    value={formData.materiau || ''}
                    onChange={(_, newValue) => onFormChange('materiau', newValue)}
                    onInputChange={(_, newValue) => onFormChange('materiau', newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        label="Matériau"
                        margin="normal"
                        placeholder="ex: Verre borosilicate, Inox 316L..."
                        helperText="Matériau de fabrication"
                      />
                    )}
                    noOptionsText="Tapez votre matériau personnalisé"
                  />
                )}

                <TextField
                  fullWidth
                  label="Quantité"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => onFormChange('quantity', parseInt(e.target.value) || 1)}
                  margin="normal"
                  InputProps={{ inputProps: { min: 1 } }}
                />
                
                <TextField
                  fullWidth
                  label="Modèle"
                  value={formData.model || ''}
                  onChange={(e) => onFormChange('model', e.target.value)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Numéro de série"
                  value={formData.serialNumber || ''}
                  onChange={(e) => onFormChange('serialNumber', e.target.value)}
                  margin="normal"
                />
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                {/* Section Champs personnalisés si disponibles */}
                {selectedItem?.customFields && Object.keys(selectedItem.customFields).length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Settings /> Champs personnalisés
                    </Typography>
                    
                    {Object.entries(selectedItem.customFields).map(([fieldName, fieldValues]) => (
                      <Autocomplete
                        key={fieldName}
                        freeSolo
                        options={fieldValues}
                        value={formData.customFields?.[fieldName] || ''}
                        onChange={(_, newValue) => {
                          const updatedCustomFields = {
                            ...formData.customFields,
                            [fieldName]: newValue
                          }
                          onFormChange('customFields', updatedCustomFields)
                        }}
                        onInputChange={(_, newValue) => {
                          const updatedCustomFields = {
                            ...formData.customFields,
                            [fieldName]: newValue
                          }
                          onFormChange('customFields', updatedCustomFields)
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            label={fieldName}
                            margin="normal"
                            placeholder={`Sélectionnez ou saisissez ${fieldName.toLowerCase()}`}
                            helperText={`Valeurs disponibles: ${fieldValues.join(', ')}`}
                          />
                        )}
                        noOptionsText={`Tapez votre ${fieldName.toLowerCase()} personnalisé`}
                      />
                    ))}
                  </Box>
                )}

                <Typography variant="h6" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Home /> Localisation
                </Typography>
                
                {/* Sélection de salle */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Salle</InputLabel>
                  <Select
                    value={formData.room || ''}
                    label="Salle"
                    onChange={(e) => {
                      onFormChange('room', e.target.value)
                      // Reset location when room changes
                      onFormChange('location', '')
                    }}
                  >
                    <MenuItem value="">
                      <em>Aucune salle</em>
                    </MenuItem>
                    {rooms.map((room) => (
                      <MenuItem key={room.id} value={room.name}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Home fontSize="small" />
                          <span>{room.name}</span>
                          {room.locations && room.locations.length > 0 && (
                            <Chip 
                              size="small" 
                              label={`${room.locations.length} loc.`} 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Sélection de localisation si la salle en a */}
                {formData.room && (() => {
                  const selectedRoom = rooms.find(room => room.name === formData.room)
                  if (selectedRoom && selectedRoom.locations && selectedRoom.locations.length > 0) {
                    return (
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Localisation précise</InputLabel>
                        <Select
                          value={formData.location || ''}
                          label="Localisation précise"
                          onChange={(e) => onFormChange('location', e.target.value)}
                        >
                          <MenuItem value="">
                            <em>Aucune localisation précise</em>
                          </MenuItem>
                          {selectedRoom.locations.map((location: any) => (
                            <MenuItem key={location.id} value={location.name}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LocationOn fontSize="small" color="secondary" />
                                <span>{location.name}</span>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )
                  }
                  return null
                })()}

                {/* Affichage de la sélection actuelle */}
                {formData.room && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'info.light' }}>
                    <Typography variant="body2" color="info.contrastText">
                      <strong><Room sx={{ fontSize: 16, color: 'text.secondary' }} /> Localisation sélectionnée:</strong><br />
                      <Home fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                      {formData.room}
                      {formData.location && (
                        <>
                          <br />
                          <LocationOn fontSize="small" sx={{ mr: 1, ml: 2, verticalAlign: 'middle' }} />
                          {formData.location}
                        </>
                      )}
                    </Typography>
                  </Paper>
                )}
                
                <TextField
                  fullWidth
                  label="Fournisseur"
                  value={formData.supplier || ''}
                  onChange={(e) => onFormChange('supplier', e.target.value)}
                  margin="normal"
                />
                
                <TextField
                  fullWidth
                  label="Date d'achat"
                  type="date"
                  value={formData.purchaseDate || ''}
                  onChange={(e) => onFormChange('purchaseDate', e.target.value)}
                  margin="normal"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                
                <TextField
                  fullWidth
                  label="Notes"
                  value={formData.notes || ''}
                  onChange={(e) => onFormChange('notes', e.target.value)}
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Étape 3: Confirmation */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h5" gutterBottom>Résumé de l'équipement</Typography>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>Informations générales</Typography>
                  <Typography><strong>Nom:</strong> {formData.name}</Typography>
                  <Typography><strong>Type:</strong> {selectedItem?.name}</Typography>
                  <Typography><strong>Catégorie:</strong> {equipmentTypes.find(t => t.id === selectedCategory)?.name}</Typography>
                  <Typography><strong>Quantité:</strong> {formData.quantity}</Typography>
                  {formData.volume && <Typography><strong>Volume:</strong> {formData.volume}</Typography>}
                  {formData.resolution && <Typography><strong>Résolution:</strong> {formData.resolution}</Typography>}
                  </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6" gutterBottom>Détails techniques</Typography>
                  {formData.model && <Typography><strong>Modèle:</strong> {formData.model}</Typography>}
                  {formData.serialNumber && <Typography><strong>N° série:</strong> {formData.serialNumber}</Typography>}
                  {formData.room && <Typography><strong>Salle:</strong> {formData.room}</Typography>}
                  {formData.location && <Typography><strong>Localisation:</strong> {formData.location}</Typography>}
                  {formData.supplier && <Typography><strong>Fournisseur:</strong> {formData.supplier}</Typography>}
                  {formData.purchaseDate && <Typography><strong>Date d'achat:</strong> {new Date(formData.purchaseDate).toLocaleDateString('fr-FR')}</Typography>}
                </Grid>
              </Grid>
              {formData.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>Notes</Typography>
                  <Typography>{formData.notes}</Typography>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      {/* Boutons de navigation */}
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
          <Button color="error" 
          variant="outlined" 
          onClick={onReset}
          disabled={activeStep === 0}
          >
            Recommencer
          </Button>
        
        <Stack direction="row" spacing={2}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(activeStep - 1)}
        >
          Précédent
        </Button>
          
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={onSubmit}
              disabled={loading}
              color="success"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={() => setActiveStep(activeStep + 1)}
              disabled={
                (activeStep === 0 && !selectedCategory) ||
                (activeStep === 1 && !selectedItem) ||
                (activeStep === 2 && (!formData.name || (!formData.equipmentTypeId && !selectedItem)))
              }
            >
              Suivant
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  )
}