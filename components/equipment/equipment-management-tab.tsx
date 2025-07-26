// components/equipment/equipment-management-tab.tsx

import { useState } from "react"
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  CardActions,
} from "@mui/material"
import { Settings, Save, Delete, Person, Edit, Add } from "@mui/icons-material"
import { EquipmentType, EquipmentItem, EditingItemData } from "@/types/equipment"
import { getPresetSuggestions } from '@/data/equipment-presets'
import { MultiSelectInput } from '@/components/equipment/multi-select-input'

interface EquipmentManagementTabProps {
  selectedManagementCategory: string
  setSelectedManagementCategory: (category: string) => void
  selectedManagementItem: EquipmentItem | null
  setSelectedManagementItem: (item: EquipmentItem | null) => void
  editItemDialog: boolean
  setEditItemDialog: (open: boolean) => void
  editingItemData: EditingItemData  // Remplacé ici
  setEditingItemData: React.Dispatch<React.SetStateAction<EditingItemData>>  // Type complet
  equipmentTypes: EquipmentType[]
  onSaveEditedItem: () => void
  onAddVolumeToEditingItem: (value?: string) => void  // Ajout du paramètre optionnel
  onRemoveVolumeFromEditingItem: (volume: string) => void
  getAllCategories: () => EquipmentType[]
  currentUser?: any
  users?: any[]
  onEditCategory?: (categoryId: string) => void
  onDeleteCategory?: (categoryId: string) => void
  onAddResolutionToEditingItem: (value?: string) => void  // Ajout du paramètre optionnel
  onRemoveResolutionFromEditingItem: (resolution: string) => void
  onAddTailleToEditingItem: (value?: string) => void  // Ajout du paramètre optionnel
  onRemoveTailleFromEditingItem: (taille: string) => void
  onAddMateriauToEditingItem: (value?: string) => void  // Ajout du paramètre optionnel
  onRemoveMateriauFromEditingItem: (materiau: string) => void
  onAddCustomFieldToEditingItem: (fieldName: string, values: string[]) => void  // Signature mise à jour
  onRemoveCustomFieldFromEditingItem: (fieldName: string) => void
}

export function EquipmentManagementTab({
  selectedManagementCategory,
  setSelectedManagementCategory,
  selectedManagementItem,
  setSelectedManagementItem,
  editItemDialog,
  setEditItemDialog,
  editingItemData,
  setEditingItemData,
  equipmentTypes,
  onSaveEditedItem,
  onAddVolumeToEditingItem,
  onRemoveVolumeFromEditingItem,
  getAllCategories, 
  currentUser,
  users,
  onEditCategory,
  onDeleteCategory,
  onAddResolutionToEditingItem,
  onRemoveResolutionFromEditingItem,
  onAddTailleToEditingItem,
  onRemoveTailleFromEditingItem,
  onAddMateriauToEditingItem,
  onRemoveMateriauFromEditingItem,
  onAddCustomFieldToEditingItem,
  onRemoveCustomFieldFromEditingItem,
}: EquipmentManagementTabProps) {

  
  const canModifyCategory = (category: EquipmentType) => {
    if (!currentUser) return false
    return (
      category.ownerId === currentUser.id || 
      currentUser.role === 'ADMIN' || 
      currentUser.role === 'ADMINLABO'
    )
  }

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId || ownerId === 'SYSTEM') return 'Système'
    const owner = users?.find(user => user.id === ownerId)
    return owner?.name || 'Inconnu'
  }



  return (
    <>
      <Paper elevation={3} sx={{ p: 3 }}>        
        {!selectedManagementCategory ? (
          // Affichage des catégories
          <Box>
            {(() => {
              const presetCategories = getAllCategories().filter(c => !c.isCustom)
              const customCategories = getAllCategories().filter(c => c.isCustom)
              
              return (
                <>
                  {/* Section Catégories Standard */}
                  <Box sx={{ mb: 5 }}>
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
                    
                    <Grid container spacing={2}>
                      {presetCategories.map((category) => (
                        <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                          <Card 
                            sx={{ 
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative',
                              border: '1px solid',
                              borderColor: 'divider',
                              '&:hover': { 
                                transform: 'translateY(-2px)',
                                boxShadow: 4,
                                borderColor: 'primary.main'
                              }
                            }}
                            onClick={() => setSelectedManagementCategory(category.id)}
                          >
                            <CardContent sx={{ textAlign: 'center', pt: 2 }}>
                              <Avatar 
                                src={category.svg} 
                                sx={{ 
                                  width: 64, 
                                  height: 64, 
                                  mx: 'auto', 
                                  mb: 2,
                                  bgcolor: 'primary.light'
                                }} 
                              />
                              <Typography variant="h6" gutterBottom>
                                {category.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {category.items?.length || 0} équipements
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>

                  {/* Séparateur visuel */}
{/* Séparateur visuel */}
{customCategories.length > 0 && (
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
                  {/* Section Catégories Personnalisées */}
                  {customCategories.length > 0 && (
                    <Box>
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
                      
                      <Grid container spacing={2}>
                        {customCategories.map((category) => (
                          <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                border: 1,
                                borderColor: 'secondary.main',
                                bgcolor: 'action.hover',
                                '&:hover': { transform: 'scale(1.025)' },
                              }}
                              onClick={() => setSelectedManagementCategory(category.id)}
                            >
                              <Box sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                color: 'black',
                                py: 0.5,
                                px: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                fontSize: '0.75rem'
                              }}>
                                <Person fontSize="inherit" />
                                <Typography variant="caption" sx={{ color: 'inherit' }}>
                                  par {getOwnerName(category.ownerId)}
                                </Typography>
                              </Box>
                              
                              <CardContent sx={{ textAlign: 'center', pt: 5 }}>
                                <Avatar 
                                  src={category.svg} 
                                  sx={{ 
                                    width: 64, 
                                    height: 64, 
                                    mx: 'auto', 
                                    mb: 2,
                                    bgcolor: 'secondary.light',
                                    filter: 'opacity(0.9)'
                                  }} 
                                />
                                <Typography 
                                  variant="h6" 
                                  gutterBottom
                                  sx={{ fontStyle: 'italic', color: 'secondary.dark' }}
                                >
                                  {category.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {category.items?.length || 0} équipements
                                </Typography>
                              </CardContent>
                              
                              {canModifyCategory(category) && (
                                <CardActions sx={{ 
                                  justifyContent: 'center', 
                                  pb: 1,
                                  bgcolor: 'rgba(0,0,0,0.02)',
                                  borderTop: '1px solid',
                                  borderColor: 'divider'
                                }}>
                                  <Tooltip title="Modifier la catégorie">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onEditCategory?.(category.id)
                                      }}
                                      sx={{ color: 'secondary.main' }}
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
                    </Box>
                  )}

                  {/* Message si aucune catégorie personnalisée */}
                  {customCategories.length === 0 && (
                    <Box sx={{ 
                      mt: 5,
                      p: 4,
                      textAlign: 'center',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'action.hover'
                    }}>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        Aucune catégorie personnalisée créée
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Créez vos propres catégories depuis l'onglet "Ajouter"
                      </Typography>
                    </Box>
                  )}
                </>
              )
            })()}
          </Box>
        ) : (
          // Affichage des équipements de la catégorie sélectionnée
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setSelectedManagementCategory('')
                  setSelectedManagementItem(null)
                }}
              >
                ← Retour aux catégories
              </Button>
              <Typography variant="h6">
                {getAllCategories().find(c => c.id === selectedManagementCategory)?.name}
              </Typography>
            </Box>
            
            {(() => {
              const allItems = equipmentTypes.find((t: EquipmentType) => t.id === selectedManagementCategory)?.items || []
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
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { 
                                  transform: 'translateY(-2px)',
                                  boxShadow: 4 
                                }
                              }}
                              onClick={() => {
                                setSelectedManagementItem(item)
                                setEditingItemData({
                                  name: item.name,
                                  volumes: [...(item.volumes || [])],
                                  newVolume: '',
                                  resolutions: [...(item.resolutions || [])],
                                  newResolution: '',
                                  tailles: [...(item.tailles || [])],
                                  newTaille: '',
                                  materiaux: [...(item.materiaux || [])],
                                  newMateriau: '',
                                  targetCategory: selectedManagementCategory,
                                  customFields: { ...(item.customFields || {}) },
                                  newCustomFieldName: '',
                                  newCustomFieldValues: ['']
                                })
                                setEditItemDialog(true)
                              }}
                            >
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar src={item.svg} sx={{ width: 48, height: 48 }} />
                              <Typography variant="h6">{item.name}</Typography>
                            </Box>
                            
                            {/* Afficher tous les champs disponibles */}
                            <Stack spacing={1}>
                              {(item.volumes?? []).length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  📏 {item.volumes.length} volumes
                                </Typography>
                              )}
                              {(item.resolutions?? []).length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  🎯 {(item.resolutions?.length ?? 0)} résolutions
                                </Typography>
                              )}
                              {(item.tailles ?? []).length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  📐 {(item.tailles ?? []).length} tailles
                                </Typography>
                              )}
                              {(item.materiaux ?? []).length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  🧱 {(item.materiaux ?? []).length} matériaux
                                </Typography>
                              )}
                              {item.customFields && Object.keys(item.customFields).length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                  ⚙️ {Object.keys(item.customFields).length} champs personnalisés
                                </Typography>
                              )}
                            </Stack>
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
                      <Grid container spacing={2}>
                        {customItems.map((item: EquipmentItem, index: number) => (
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                bgcolor: 'action.hover',
                                '&:hover': { 
                                  transform: 'translateY(-2px)',
                                  boxShadow: 4 
                                }
                              }}
                              onClick={() => {
                                setSelectedManagementItem(item)
                                setEditingItemData({
                                  name: item.name,
                                  volumes: [...(item.volumes || [])],
                                  newVolume: '',
                                  resolutions: [...(item.resolutions || [])],
                                  newResolution: '',
                                  tailles: [...(item.tailles || [])],
                                  newTaille: '',
                                  materiaux: [...(item.materiaux || [])],
                                  newMateriau: '',
                                  targetCategory: selectedManagementCategory,
                                  customFields: { ...(item.customFields || {}) },
                                  newCustomFieldName: '',
                                  newCustomFieldValues: ['']
                                })
                                setEditItemDialog(true)
                              }}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                  <Avatar 
                                    src={item.svg} 
                                    sx={{ 
                                      width: 48, 
                                      height: 48,
                                      bgcolor: 'secondary.light',
                                      color: 'secondary.contrastText'
                                    }} 
                                  />
                                  <Typography variant="h6" sx={{ fontStyle: 'italic' }}>
                                    {item.name}
                                  </Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                  {item.volumes?.length || 0} volumes disponibles
                                </Typography>
                                {item.volumes?.length > 0 && (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                    {item.volumes.slice(0, 3).map((volume, vIndex) => (
                                      <Chip 
                                        key={vIndex} 
                                        label={volume} 
                                        size="small" 
                                        variant="outlined" 
                                        color="secondary"
                                      />
                                    ))}
                                    {item.volumes.length > 3 && (
                                      <Chip 
                                        label={`+${item.volumes.length - 3}`} 
                                        size="small" 
                                        variant="outlined" 
                                        color="secondary"
                                      />
                                    )}
                                  </Box>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}
                </>
              )
            })()}
          </Box>
        )}
      </Paper>

      {/* Dialog de modification d'équipement preset */}
      <Dialog
        open={editItemDialog}
        onClose={() => {
          setEditItemDialog(false)
          setSelectedManagementItem(null)
        }}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings />
            <Typography variant="h6">
              Modifier {selectedManagementItem?.name}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent 
        style={{ paddingTop: '24px' }} // car MUI ajoute un padding par défaut
        sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Nom de l'équipement */}
            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={editingItemData.name}
              onChange={(e) => setEditingItemData((prev: EditingItemData) => ({
                ...prev,
                name: e.target.value
              }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />

            {/* Sélecteur de catégorie */}
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={editingItemData.targetCategory}
                label="Catégorie"
                onChange={(e) => setEditingItemData((prev: EditingItemData) => ({
                  ...prev,
                  targetCategory: e.target.value
                }))}
              >
                {getAllCategories().map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={category.svg} sx={{ width: 24, height: 24 }} />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Gestion des volumes */}
            <MultiSelectInput
              label="Volumes disponibles"
              placeholder="Ex : 250 mL, 10 cm³, 1 gal..."
              suggestions={getPresetSuggestions('volumes', selectedManagementItem?.name, 
                getAllCategories().find(c => c.id === selectedManagementCategory)?.name
              )}
              values={editingItemData.volumes}
              newValue={editingItemData.newVolume}
              type="volume"
              onAddValue={onAddVolumeToEditingItem}
              onRemoveValue={onRemoveVolumeFromEditingItem}
              onNewValueChange={(value) => setEditingItemData((prev: EditingItemData) => ({ ...prev, newVolume: value }))}
            />

            {/* Gestion des résolutions */}
            <MultiSelectInput
              label="Résolutions/Précisions"
              placeholder="Ex : 0.01g, 0.1°C, ± 0.5%..."
              suggestions={getPresetSuggestions('resolutions', selectedManagementItem?.name,
                getAllCategories().find(c => c.id === selectedManagementCategory)?.name
              )}
              values={editingItemData.resolutions || []}
              newValue={editingItemData.newResolution}
              type="resolution"
              onAddValue={onAddResolutionToEditingItem}
              onRemoveValue={onRemoveResolutionFromEditingItem}
              onNewValueChange={(value) => setEditingItemData((prev: EditingItemData) => ({ ...prev, newResolution: value }))}
            />

            {/* Gestion des tailles */}
            <MultiSelectInput
              label="Tailles/Dimensions"
              placeholder="Ex: 10x10cm, Ø15mm, L:50cm..."
              suggestions={getPresetSuggestions('tailles', selectedManagementItem?.name,
                getAllCategories().find(c => c.id === selectedManagementCategory)?.name
              )}
              values={editingItemData.tailles || []}
              newValue={editingItemData.newTaille}
              type="taille"
              onAddValue={onAddTailleToEditingItem}
              onRemoveValue={onRemoveTailleFromEditingItem}
              onNewValueChange={(value) => setEditingItemData((prev: EditingItemData) => ({ ...prev, newTaille: value }))}
            />

            {/* Gestion des matériaux */}
            <MultiSelectInput
              label="Matériaux"
              placeholder="Ex: Verre borosilicate, Plastique PP, Inox 316L..."
              suggestions={getPresetSuggestions('materiaux', selectedManagementItem?.name,
                getAllCategories().find(c => c.id === selectedManagementCategory)?.name
              )}
              values={editingItemData.materiaux || []}
              newValue={editingItemData.newMateriau}
              type="materiau"
              onAddValue={onAddMateriauToEditingItem}
              onRemoveValue={onRemoveMateriauFromEditingItem}
              onNewValueChange={(value) => setEditingItemData((prev: EditingItemData) => ({ ...prev, newMateriau: value }))}
            />

            {/* Section pour les champs personnalisés */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Champs personnalisés
              </Typography>
              
              {/* Champs personnalisés existants */}
              {Object.entries(editingItemData.customFields || {}).map(([fieldName, values]) => (
                <Box key={fieldName} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                    {fieldName}
                    <IconButton
                      size="small"
                      onClick={() => onRemoveCustomFieldFromEditingItem(fieldName)}
                      sx={{ ml: 1, color: 'rgba(255,255,255,0.7)' }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {values.map((value, index) => (
                      <Chip
                        key={index}
                        label={value}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: 'white'
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}

              {/* Ajouter un nouveau champ personnalisé */}
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Nom du champ"
                    value={editingItemData.newCustomFieldName}
                    onChange={(e) => setEditingItemData((prev: EditingItemData) => ({
                      ...prev,
                      newCustomFieldName: e.target.value
                    }))}
                    placeholder="Ex: Certification, Compatibilité..."
                    sx={{
                      flex: 1,
                      '& .MuiInputLabel-root': { color: 'white' },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'white' }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      // Ajouter toutes les valeurs non vides
                      const validValues = editingItemData.newCustomFieldValues.filter(v => v.trim())
                      if (editingItemData.newCustomFieldName.trim() && validValues.length > 0) {
                        onAddCustomFieldToEditingItem(editingItemData.newCustomFieldName, validValues)
                        // Réinitialiser
                        setEditingItemData((prev: EditingItemData) => ({
                          ...prev,
                          newCustomFieldName: '',
                          newCustomFieldValues: ['']
                        }))
                      }
                    }}
                    variant="contained"
                    disabled={
                      !editingItemData.newCustomFieldName.trim() || 
                      !editingItemData.newCustomFieldValues.some(v => v.trim())
                    }
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    Ajouter
                  </Button>
                </Stack>

                {/* Champs de valeurs multiples */}
                <Stack spacing={1}>
                  {editingItemData.newCustomFieldValues.map((value, index) => (
                    <Stack key={index} direction="row" spacing={1} alignItems="center">
                      <TextField
                        label={`Valeur ${index + 1}`}
                        value={value}
                        onChange={(e) => {
                          const newValues = [...editingItemData.newCustomFieldValues]
                          newValues[index] = e.target.value
                          setEditingItemData((prev: EditingItemData) => ({
                            ...prev,
                            newCustomFieldValues: newValues
                          }))
                        }}
                        placeholder="Entrez une valeur..."
                        sx={{
                          flex: 1,
                          '& .MuiInputLabel-root': { color: 'white' },
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                            '&.Mui-focused fieldset': { borderColor: 'white' }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            // Si c'est le dernier champ et qu'il n'est pas vide, ajouter un nouveau
                            if (index === editingItemData.newCustomFieldValues.length - 1 && value.trim()) {
                              setEditingItemData((prev: EditingItemData) => ({
                                ...prev,
                                newCustomFieldValues: [...prev.newCustomFieldValues, '']
                              }))
                            }
                          }
                        }}
                      />
                      
                      {/* Bouton pour supprimer (seulement s'il y a plus d'un champ) */}
                      <IconButton
                        onClick={() => {
                          if (editingItemData.newCustomFieldValues.length > 1) {
                            const newValues = editingItemData.newCustomFieldValues.filter((_, i) => i !== index)
                            setEditingItemData((prev: EditingItemData) => ({
                              ...prev,
                              newCustomFieldValues: newValues
                            }))
                          }
                        }}
                        disabled={editingItemData.newCustomFieldValues.length === 1}
                        sx={{
                          color: editingItemData.newCustomFieldValues.length === 1 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                          '&:hover': { 
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.9)'
                          }
                        }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                      
                      {/* Bouton pour ajouter un nouveau champ */}
                      <IconButton
                        onClick={() => {
                          // Ajouter un nouveau champ après celui-ci
                          const newValues = [...editingItemData.newCustomFieldValues]
                          newValues.splice(index + 1, 0, '')
                          setEditingItemData((prev: EditingItemData) => ({
                            ...prev,
                            newCustomFieldValues: newValues
                          }))
                          }}
                          sx={(theme) => ({
                            backgroundColor: `${theme.palette.success.light}CC`, // CC = ~80% opacity
                            color: 'white',
                            fontWeight: 'bold',
                            '&:hover': { 
                            backgroundColor: `${theme.palette.success.dark}CC`,
                            color: 'white',
                            opacity: 1
                            }
                          })}
                          >
                        {/* Icône Add avec traits plus épais */}
                        <Add fontSize="small"  />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Stack>
            </Box>




          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button
            onClick={() => {
              setEditItemDialog(false)
              setSelectedManagementItem(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={onSaveEditedItem}
            variant="contained"
            color="success"
            sx={{ 
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!editingItemData.name.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
