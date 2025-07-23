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
  MenuItem
} from "@mui/material"
import { Settings, Save, Delete } from "@mui/icons-material"
import { EquipmentType, EquipmentItem } from "@/types/equipment"

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
    targetCategory: string
  }
  setEditingItemData: (data: any) => void
  equipmentTypes: EquipmentType[]
  onSaveEditedItem: () => void
  onAddVolumeToEditingItem: () => void
  onRemoveVolumeFromEditingItem: (volume: string) => void
  getAllCategories: () => EquipmentType[]
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
  getAllCategories
}: EquipmentManagementTabProps) {
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
                      '&:hover': { 
                        transform: 'translateY(-2px)',
                        boxShadow: 4 
                      }
                    }}
                    onClick={() => setSelectedManagementCategory(category.id)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
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
                                  volumes: [...item.volumes],
                                  newVolume: '',
                                  targetCategory: selectedManagementCategory
                                })
                                setEditItemDialog(true)
                              }}
                            >
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                  <Avatar src={item.svg} sx={{ width: 48, height: 48 }} />
                                  <Typography variant="h6">{item.name}</Typography>
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
                                      />
                                    ))}
                                    {item.volumes.length > 3 && (
                                      <Chip 
                                        label={`+${item.volumes.length - 3}`} 
                                        size="small" 
                                        variant="outlined" 
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
                                  volumes: [...item.volumes],
                                  newVolume: '',
                                  targetCategory: selectedManagementCategory
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
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
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
        
        <DialogContent sx={{ pt: 3 }}>
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
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Volumes disponibles
              </Typography>
              
              {/* Volumes existants */}
              {editingItemData.volumes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {editingItemData.volumes.map((volume, index) => (
                    <Chip
                      key={index}
                      label={volume}
                      onDelete={() => onRemoveVolumeFromEditingItem(volume)}
                      deleteIcon={<Delete />}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' }
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Ajouter un nouveau volume */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Nouveau volume"
                  value={editingItemData.newVolume}
                  onChange={(e) => setEditingItemData((prev: any) => ({
                    ...prev,
                    newVolume: e.target.value
                  }))}
                  placeholder="Ex: 250ml, 10cm, 1kg..."
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
                  onKeyPress={(e) => e.key === 'Enter' && onAddVolumeToEditingItem()}
                />
                <Button
                  onClick={onAddVolumeToEditingItem}
                  variant="contained"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Ajouter
                </Button>
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
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
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
