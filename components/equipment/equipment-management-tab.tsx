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
import { Settings, Save, Delete, Person, Edit } from "@mui/icons-material"
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
  editingItemData: {
    name: string
    volumes: string[]
    newVolume: string
    resolutions: string[]
    newResolution: string
    tailles: string[]
    newTaille: string
    materiaux: string[]
    newMateriau: string
    targetCategory: string
    customFields: { [key: string]: string[] }
    newCustomFieldName: string
    newCustomFieldValue: string
  }
  setEditingItemData: (data: any) => void
  equipmentTypes: EquipmentType[]
  onSaveEditedItem: () => void
  onAddVolumeToEditingItem: () => void
  onRemoveVolumeFromEditingItem: (volume: string) => void
  getAllCategories: () => EquipmentType[]
  currentUser?: any
  users?: any[]
  onEditCategory?: (categoryId: string) => void
  onDeleteCategory?: (categoryId: string) => void
  onAddResolutionToEditingItem: () => void
  onRemoveResolutionFromEditingItem: (resolution: string) => void
  onAddTailleToEditingItem: () => void
  onRemoveTailleFromEditingItem: (taille: string) => void
  onAddMateriauToEditingItem: () => void
  onRemoveMateriauFromEditingItem: (materiau: string) => void
  onAddCustomFieldToEditingItem: () => void
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
        <Typography variant="h5" gutterBottom>
          Gérer les types d'équipement
        </Typography>
        
        {!selectedManagementCategory ? (
          // Affichage des catégories
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Sélectionnez une catégorie à modifier :
            </Typography>
            <Grid container spacing={2}>
            {getAllCategories().map((category) => (
              <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                    '&:hover': { 
                      transform: 'translateY(-2px)',
                      boxShadow: 4 
                    }
                  }}
                  onClick={() => setSelectedManagementCategory(category.id)}
                >
                  {/* Ajouter l'overline pour les catégories custom */}
                  {category.isCustom && (
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
                  )}
                  
                  <CardContent sx={{ textAlign: 'center', pt: category.isCustom ? 4 : 2 }}>
                    <Avatar 
                      src={category.svg} 
                      sx={{ 
                        width: 64, 
                        height: 64, 
                        mx: 'auto', 
                        mb: 2,
                        bgcolor: category.isCustom ? 'secondary.light' : 'primary.light',
                        filter: category.isCustom ? 'opacity(0.8)' : 'none'
                      }} 
                    />
                    <Typography 
                      variant="h6" 
                      gutterBottom
                      sx={{ fontStyle: category.isCustom ? 'italic' : 'normal' }}
                    >
                      {category.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {category.items?.length || 0} équipements
                    </Typography>
                  </CardContent>
                  
                  {/* Actions conditionnelles pour les catégories custom */}
                  {category.isCustom && canModifyCategory(category) && (
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
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
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
                                  newCustomFieldValue: ''
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
                          <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
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
                                  newCustomFieldValue: ''
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
              onChange={(e) => setEditingItemData((prev: any) => ({
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
                onChange={(e) => setEditingItemData((prev: any) => ({
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
              placeholder="Ex: 250 mL, 10 cm, 1 kg..."
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
              placeholder="Ex: 0.01g, 0.1°C, ±0.5%..."
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
              <Stack spacing={1}>
                <TextField
                  label="Nom du champ"
                  value={editingItemData.newCustomFieldName}
                  onChange={(e) => setEditingItemData((prev: any) => ({
                    ...prev,
                    newCustomFieldName: e.target.value
                  }))}
                  placeholder="Ex: Certification, Compatibilité..."
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
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Valeur"
                    value={editingItemData.newCustomFieldValue}
                    onChange={(e) => setEditingItemData((prev: any) => ({
                      ...prev,
                      newCustomFieldValue: e.target.value
                    }))}
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
                    onKeyDown={(e) => e.key === 'Enter' && onAddCustomFieldToEditingItem()}
                  />
                  <Button
                    onClick={onAddCustomFieldToEditingItem}
                    variant="contained"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                    }}
                            disabled={!editingItemData.newCustomFieldName.trim() || !editingItemData.newCustomFieldValue.trim()}
                  >
                    Ajouter
                  </Button>
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
