"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Button, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Fab, Tab, Tabs,
  Card, CardContent, Chip, Paper, Grid, Avatar, Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton
} from "@mui/material"
import { 
  Add, Inventory, Settings, Edit, Delete, Save, Category, CheckCircle, Warning
} from "@mui/icons-material"

// Import des hooks personnalisés
import { useEquipmentData } from "@/lib/hooks/useEquipmentData"
import { useEquipmentFilters } from "@/lib/hooks/useEquipmentFilters"
import { useEquipmentQuantity } from "@/lib/hooks/useEquipmentQuantity"
import { useEquipmentForm } from "@/lib/hooks/useEquipmentForm" 
import { useEquipmentDialogs } from "@/lib/hooks/useEquipmentDialogs"
import { useEquipmentDeletion } from "@/lib/hooks/useEquipmentDeletion"
import { useSiteConfig } from "@/lib/hooks/useSiteConfig"

// Import des composants
import { TabPanel } from "@/components/equipment/tab-panel"
import { EquipmentAddTab } from "@/components/equipment/equipment-add-tab"
import { EquipmentInventoryTab } from "@/components/equipment/equipment-inventory-tab"
import { EquipmentCard } from "@/components/equipment/EquipmentCard"
import ViewToggle from "@/components/equipment/ViewToggle"  
import { EquipmentListView } from "@/components/equipment/EquipmentListView"
import DeleteConfirmationDialog from "@/components/equipment/DeleteConfirmationDialog"
import DuplicateDetectionDialog from "@/components/equipment/DuplicateDetectionDialog"

// Import des dialogues
import { ContinueDialog } from "@/components/equipment/dialogs/ContinueDialog"
import { NewCategoryDialog } from "@/components/equipment/dialogs/NewCategoryDialog"
import { DeleteDialog } from "@/components/equipment/dialogs/DeleteDialog"

// Import des services
import { equipmentService } from "@/lib/services/equipmentService"

// Import des types
import { EquipmentType, EquipmentItem } from "@/types/equipment"

export default function EquipmentPage() {
  const [tabValue, setTabValue] = useState(0)
  
  // Utilisation des hooks personnalisés
  const equipmentData = useEquipmentData()
  const filters = useEquipmentFilters(equipmentData.materiel)
  const quantity = useEquipmentQuantity(equipmentData.fetchEquipment)
  const form = useEquipmentForm()
  const dialogs = useEquipmentDialogs()
  
  // Nouveaux hooks pour les fonctionnalités avancées
  const deletion = useEquipmentDeletion()
  const { config, updateConfig } = useSiteConfig()
  const [viewMode, setViewModeState] = useState<'cards' | 'list'>('cards')

  // Initialiser le mode de vue
  useEffect(() => {
    const savedViewMode = config.materialsViewMode || 'cards'
    setViewModeState(savedViewMode)
  }, [config.materialsViewMode])

  // Gestionnaire pour changer de vue
  const handleViewModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newViewMode: 'cards' | 'list'
  ) => {
    if (newViewMode !== null) {
      setViewModeState(newViewMode)
      updateConfig({ materialsViewMode: newViewMode })
    }
  }

  // Fonction pour obtenir les volumes disponibles pour un équipement
  const getAvailableVolumes = (equipmentTypeId: string): string[] => {
    for (const equipmentType of equipmentData.getAllEquipmentTypes()) {
      const item = equipmentType.items.find((item: EquipmentItem) => item.id === equipmentTypeId)
      if (item) {
        return item.volumes || []
      }
    }
    return []
  }

  // Gestion de l'ajout rapide
  const handleQuickAdd = () => {
    setTabValue(0)
    form.setActiveStep(0)
    form.setSelectedCategory('')
    form.setSelectedItem(null)
    form.setFormData({
      name: '',
      equipmentTypeId: '',
      quantity: 1,
      volume: '',
    })
  }

  // Gestionnaire pour la soumission avec gestion des onglets
  const handleSubmitWithTabSwitch = async () => {
    try {
      const newEquipment = await equipmentService.submitEquipment(
        form.formData,
        form.selectedCategory,
        form.selectedItem,
        equipmentData.getAllEquipmentTypes
      )
      
      if (form.selectedItem?.name === 'Équipement personnalisé') {
        dialogs.setNewlyCreatedItem(newEquipment)
        dialogs.setContinueDialog(true)
      } else {
        form.handleReset()
        setTabValue(1) // Basculer vers l'onglet inventaire
      }
      
      await equipmentData.fetchEquipment()
      await equipmentData.loadEquipmentTypes()
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    }
  }

  // Gestionnaire pour la modification d'équipement
  const handleSaveEdit = async () => {
    try {
      await equipmentService.editEquipment(dialogs.editingEquipment.id, dialogs.editingEquipment)
      
      await equipmentData.fetchEquipment()
      dialogs.setOpenEditDialog(false)
      dialogs.setEditingEquipment(null)
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la modification")
    }
  }

  // Gestionnaire pour la suppression d'équipement
  const confirmDeleteEquipment = async () => {
    if (!dialogs.equipmentToDelete?.id) {
      equipmentData.setError("Impossible de supprimer l'équipement : ID manquant.")
      dialogs.setDeleteDialog(false)
      dialogs.setEquipmentToDelete(null)
      return
    }

    try {
      dialogs.setDeletingItems(prev => new Set([...prev, dialogs.equipmentToDelete.id]))
      dialogs.setDeleteDialog(false)

      await equipmentService.deleteEquipment(dialogs.equipmentToDelete.id)
      
      setTimeout(async () => {
        await equipmentData.fetchEquipment()
        dialogs.setDeletingItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(dialogs.equipmentToDelete.id)
          return newSet
        })
        dialogs.setEquipmentToDelete(null)
      }, 500)

    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la suppression")
      dialogs.setDeletingItems(prev => {
        const newSet = new Set(prev)
        if (dialogs.equipmentToDelete) {
          newSet.delete(dialogs.equipmentToDelete.id)
        }
        return newSet
      })
      dialogs.setEquipmentToDelete(null)
    }
  }

  // Gestionnaire pour créer une catégorie personnalisée
  const handleCreateCustomCategory = async () => {
    if (!dialogs.newCategoryName.trim()) {
      alert('Veuillez entrer un nom pour la catégorie')
      return
    }

    try {
      await equipmentService.createCustomCategory(dialogs.newCategoryName)
      
      await equipmentData.loadEquipmentTypes()
      dialogs.setCustomCategories(prev => [...prev, { name: dialogs.newCategoryName }])
      dialogs.setNewCategoryName('')
      dialogs.setNewCategoryDialog(false)
      alert('Catégorie créée avec succès !')
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error)
      alert('Erreur lors de la création de la catégorie')
    }
  }

  // Gestionnaires pour les volumes dans l'équipement personnalisé
  const handleAddVolumeToCustomEquipment = () => {
    if (dialogs.customEquipmentData.newVolume.trim()) {
      dialogs.setCustomEquipmentData(prev => ({
        ...prev,
        volumes: [...prev.volumes, prev.newVolume.trim()],
        newVolume: ''
      }))
    }
  }

  const handleRemoveVolumeFromCustomEquipment = (volumeToRemove: string) => {
    dialogs.setCustomEquipmentData(prev => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  // Gestionnaire pour sauvegarder un équipement personnalisé
  const handleSaveCustomEquipment = async () => {
    if (!dialogs.customEquipmentData.name.trim()) {
      alert('Veuillez entrer un nom pour l\'équipement')
      return
    }

    // if (!dialogs.customEquipmentData.category) {
    //   alert('Veuillez sélectionner une catégorie')
    //   return
    // }

    try {
      await equipmentService.saveCustomEquipment(dialogs.customEquipmentData)
      
      await equipmentData.loadEquipmentTypes()
      
      dialogs.setAddCustomEquipmentDialog(false)
      dialogs.setNewlyCreatedItem({
        name: dialogs.customEquipmentData.name,
        category: dialogs.customEquipmentData.category,
        volumes: dialogs.customEquipmentData.volumes
      })
      dialogs.setContinueDialog(true)
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipement personnalisé:', error)
      alert('Erreur lors de l\'ajout de l\'équipement')
    }
  }

  // Gestionnaires pour les dialogues de continuation
  const handleFinishWithoutContinue = () => {
    dialogs.setContinueDialog(false)
    dialogs.setNewlyCreatedItem(null)
    form.handleReset()
    setTabValue(1) // Basculer vers l'onglet inventaire
  }

  const handleContinueToInventory = () => {
    dialogs.setContinueDialog(false)
    if (dialogs.newlyCreatedItem) {
      form.setSelectedItem({
        name: dialogs.newlyCreatedItem.name,
        svg: '/svg/default.svg',
        volumes: dialogs.newlyCreatedItem.volumes || ['N/A']
      })
      form.setFormData(prev => ({
        ...prev,
        name: dialogs.newlyCreatedItem.name,
        type: dialogs.newlyCreatedItem.category
      }))
      form.setActiveStep(2) // Aller à l'étape des détails
      setTabValue(0) // Rester sur l'onglet d'ajout
    }
    dialogs.setNewlyCreatedItem(null)
  }

  // Gestionnaires pour l'édition des items de gestion
  const handleAddVolumeToEditingItem = () => {
    if (dialogs.editingItemData.newVolume.trim()) {
      dialogs.setEditingItemData(prev => ({
        ...prev,
        volumes: [...prev.volumes, prev.newVolume.trim()],
        newVolume: ''
      }))
    }
  }

  const handleRemoveVolumeFromEditingItem = (volumeToRemove: string) => {
    dialogs.setEditingItemData(prev => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  const handleSaveEditedItem = async () => {
    if (!dialogs.selectedManagementItem || !dialogs.selectedManagementCategory) return

    try {
      const result = await equipmentService.saveEditedItem(
        dialogs.selectedManagementCategory,
        dialogs.selectedManagementItem,
        dialogs.editingItemData
      )

      await equipmentData.loadEquipmentTypes()
      
      dialogs.setEditItemDialog(false)
      dialogs.setSelectedManagementItem(null)
      
      if (result.targetCategory) {
        dialogs.setSelectedManagementCategory(result.targetCategory)
        alert('Équipement déplacé avec succès vers la nouvelle catégorie !')
      } else {
        alert('Équipement mis à jour avec succès !')
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement:', error)
      alert('Erreur lors de la mise à jour de l\'équipement')
    }
  }

  // Gestionnaire de changement de quantité
  const handleQuantityChangeWithMaterial = (equipmentId: string, newValue: number) => {
    const currentItem = equipmentData.materiel.find((item: any) => item.id === equipmentId) as any
    if (newValue !== currentItem?.quantity) {
      quantity.handleQuantityChange(equipmentId, newValue, equipmentData.materiel)
    }
  }

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
          <Tab label="Gérer les types" icon={<Settings />} />
        </Tabs>
      </Box>

      {/* Onglet Ajout */}
      <TabPanel value={tabValue} index={0}>
        <EquipmentAddTab
          activeStep={form.activeStep}
          setActiveStep={form.setActiveStep}
          selectedCategory={form.selectedCategory}
          setSelectedCategory={form.setSelectedCategory}
          selectedItem={form.selectedItem}
          setSelectedItem={form.setSelectedItem}
          formData={form.formData}
          setFormData={form.setFormData}
          equipmentTypes={equipmentData.equipmentTypes}
          rooms={equipmentData.rooms}
          onCategorySelect={form.handleCategorySelect}
          onItemSelect={form.handleItemSelect}
          onFormChange={form.handleFormChange}
          onSubmit={handleSubmitWithTabSwitch}
          onReset={form.handleReset}
          loading={equipmentData.loading}
        />
      </TabPanel>

      {/* Onglet Inventaire */}
      <TabPanel value={tabValue} index={1}>
        <EquipmentInventoryTab
          materiel={equipmentData.materiel}
          loading={equipmentData.loading}
          error={equipmentData.error}
          searchTerm={filters.searchTerm}
          setSearchTerm={filters.setSearchTerm}
          typeFilter={filters.typeFilter}
          setTypeFilter={filters.setTypeFilter}
          locationFilter={filters.locationFilter}
          setLocationFilter={filters.setLocationFilter}
          sortBy={filters.sortBy}
          setSortBy={filters.setSortBy}
          rooms={equipmentData.rooms}
          quantityValues={quantity.quantityValues}
          setQuantityValues={quantity.setQuantityValues}
          updatingCards={quantity.updatingCards}
          onQuantityChange={handleQuantityChangeWithMaterial}
          onEditEquipment={dialogs.handleEditEquipment}
          onDeleteEquipment={dialogs.handleDeleteEquipment}
          getTypeLabel={filters.getTypeLabel}
          getFilteredMateriel={filters.getFilteredMateriel}
        />
      </TabPanel>

      {/* Onglet Gestion des types */}
      <TabPanel value={tabValue} index={2}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Gérer les types d'équipement
            </Typography>
          </Box>
          
          {!dialogs.selectedManagementCategory ? (
            // Affichage des catégories
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Sélectionnez une catégorie à modifier :
              </Typography>
              <Grid container spacing={2}>
                {equipmentData.getAllCategories().map((category) => (
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
                      onClick={() => dialogs.setSelectedManagementCategory(category.id)}
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => {
                      dialogs.setSelectedManagementCategory('')
                      dialogs.setSelectedManagementItem(null)
                    }}
                  >
                    ← Retour aux catégories
                  </Button>
                  <Typography variant="h6">
                    {equipmentData.getAllCategories().find(c => c.id === dialogs.selectedManagementCategory)?.name}
                  </Typography>
                </Box>
                <ViewToggle 
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                />
              </Box>

              {(() => {
                const allItems = equipmentData.getAllEquipmentTypes().find((t: EquipmentType) => t.id === dialogs.selectedManagementCategory)?.items || []
                const presetItems = allItems.filter((item: EquipmentItem) => !item.isCustom)
                const customItems = allItems.filter((item: EquipmentItem) => item.isCustom)

                return (
                  <>
                    {viewMode === 'cards' ? (
                      // Vue en cartes (existante)
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
                                dialogs.setSelectedManagementItem(item)
                                dialogs.setEditingItemData({
                                  name: item.name,
                                  volumes: [...item.volumes],
                                  newVolume: '',
                                  targetCategory: dialogs.selectedManagementCategory
                                })
                                dialogs.setEditItemDialog(true)
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
                                dialogs.setSelectedManagementItem(item)
                                dialogs.setEditingItemData({
                                  name: item.name,
                                  volumes: [...item.volumes],
                                  newVolume: '',
                                  targetCategory: dialogs.selectedManagementCategory
                                })
                                dialogs.setEditItemDialog(true)
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
              ) : (
                // Vue en liste
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Nom</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Volumes disponibles</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Équipements standard */}
                      {presetItems.length > 0 && (
                        <>
                          <TableRow>
                            <TableCell colSpan={4} sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>
                              <Typography variant="subtitle1" color="primary">
                                📦 Équipements standard ({presetItems.length})
                              </Typography>
                            </TableCell>
                          </TableRow>
                          {presetItems.map((item: EquipmentItem, index: number) => (
                            <TableRow 
                              key={index} 
                              hover
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                dialogs.setSelectedManagementItem(item)
                                dialogs.setEditingItemData({
                                  name: item.name,
                                  volumes: [...item.volumes],
                                  newVolume: '',
                                  targetCategory: dialogs.selectedManagementCategory
                                })
                                dialogs.setEditItemDialog(true)
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar src={item.svg} sx={{ width: 32, height: 32 }} />
                                  {item.name}
                                </Box>
                              </TableCell>
                              <TableCell>Standard</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {item.volumes?.slice(0, 3).map((volume, vIndex) => (
                                    <Chip key={vIndex} label={volume} size="small" />
                                  ))}
                                  {item.volumes?.length > 3 && (
                                    <Chip label={`+${item.volumes.length - 3}`} size="small" />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                                  <Edit />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )}
              
              {/* Équipements personnalisés */}
              {customItems.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={4} sx={{ bgcolor: 'grey.100', fontWeight: 'bold' }}>
                      <Typography variant="subtitle1" color="secondary">
                        🔧 Équipements personnalisés ({customItems.length})
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {customItems.map((item: EquipmentItem, index: number) => (
                    <TableRow 
                      key={index} 
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        dialogs.setSelectedManagementItem(item)
                        dialogs.setEditingItemData({
                          name: item.name,
                          volumes: [...item.volumes],
                          newVolume: '',
                          targetCategory: dialogs.selectedManagementCategory
                        })
                        dialogs.setEditItemDialog(true)
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar 
                            src={item.svg} 
                            sx={{ 
                              width: 32, 
                              height: 32,
                              bgcolor: 'secondary.light'
                            }} 
                          />
                          <Typography sx={{ fontStyle: 'italic' }}>{item.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>Personnalisé</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {item.volumes?.slice(0, 3).map((volume, vIndex) => (
                            <Chip key={vIndex} label={volume} size="small" color="secondary" />
                          ))}
                          {item.volumes?.length > 3 && (
                            <Chip label={`+${item.volumes.length - 3}`} size="small" color="secondary" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  )
})()}
            </Box>
          )}
        </Paper>
      </TabPanel>


        {/* Boutons d'action pour la gestion */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'stretch', 
            maxWidth: 600, 
            mx: 'auto',
            mt: 3
          }}
        >
          <Stack direction="column" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Category />}
              onClick={() => {
                dialogs.setNewCategoryName('')
                dialogs.setNewCategoryDialog(true)
              }}
            >
              Nouvelle catégorie
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                dialogs.setCustomEquipmentData({
                  name: '',
                  category: '',
                  volumes: [],
                  newVolume: ''
                })
                dialogs.setAddCustomEquipmentDialog(true)
              }}
            >
              Ajouter équipement
            </Button>
          </Stack>
        </Box>


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
      <ContinueDialog
        open={dialogs.continueDialog}
        onClose={() => dialogs.setContinueDialog(false)}
        newlyCreatedItem={dialogs.newlyCreatedItem}
        onFinishWithoutContinue={handleFinishWithoutContinue}
        onContinueToInventory={handleContinueToInventory}
      />

      {/* Dialogue pour créer une nouvelle catégorie */}
      <NewCategoryDialog
        open={dialogs.newCategoryDialog}
        onClose={() => dialogs.setNewCategoryDialog(false)}
        categoryName={dialogs.newCategoryName}
        setCategoryName={dialogs.setNewCategoryName}
        onCreateCategory={handleCreateCustomCategory}
      />

      {/* Dialogue de suppression stylisé */}
      <DeleteDialog
        open={dialogs.deleteDialog}
        onClose={() => dialogs.setDeleteDialog(false)}
        equipmentToDelete={dialogs.equipmentToDelete}
        onConfirmDelete={confirmDeleteEquipment}
      />

      {/* Dialog pour ajouter un équipement personnalisé aux catégories */}
      <Dialog
        open={dialogs.addCustomEquipmentDialog}
        onClose={() => dialogs.setAddCustomEquipmentDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Add />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Ajouter un équipement personnalisé
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Catégorie: {equipmentData.getAllCategories().find(c => c.id === dialogs.customEquipmentData.category)?.name}
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
            <Stack spacing={3}>
              {/* Sélecteur de catégorie */}
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'white' }}>Catégorie</InputLabel>
                <Select
                  value={dialogs.customEquipmentData.category}
                  label="Catégorie"
                  onChange={(e) => dialogs.setCustomEquipmentData(prev => ({
                    ...prev,
                    category: e.target.value
                  }))}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                    '& .MuiSvgIcon-root': { color: 'white' }
                  }}
                >
                  {equipmentData.getAllCategories().map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Nom de l'équipement"
                value={dialogs.customEquipmentData.name}
                onChange={(e) => dialogs.setCustomEquipmentData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Ex: Micropipette, Balance analytique..."
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

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Volumes/Tailles disponibles (optionnel)
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    label="Ajouter un volume"
                    value={dialogs.customEquipmentData.newVolume}
                    onChange={(e) => dialogs.setCustomEquipmentData(prev => ({
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
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVolumeToCustomEquipment()}
                  />
                  <Button
                    onClick={handleAddVolumeToCustomEquipment}
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

                {dialogs.customEquipmentData.volumes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {dialogs.customEquipmentData.volumes.map((volume, index) => (
                      <Chip
                        key={index}
                        label={volume}
                        onDelete={() => handleRemoveVolumeFromCustomEquipment(volume)}
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Stack>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => dialogs.setAddCustomEquipmentDialog(false)}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveCustomEquipment}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!dialogs.customEquipmentData.name.trim()}
          >
            Créer l'équipement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de modification d'équipement preset */}
      <Dialog
        open={dialogs.editItemDialog}
        onClose={() => {
          dialogs.setEditItemDialog(false)
          dialogs.setSelectedManagementItem(null)
        }}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings />
            <Typography variant="h6">
              Modifier {dialogs.selectedManagementItem?.name}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Nom de l'équipement */}
            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={dialogs.editingItemData.name}
              onChange={(e) => dialogs.setEditingItemData(prev => ({
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
                value={dialogs.editingItemData.targetCategory}
                label="Catégorie"
                onChange={(e) => dialogs.setEditingItemData(prev => ({
                  ...prev,
                  targetCategory: e.target.value
                }))}
              >
                {equipmentData.getAllCategories().map((category) => (
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
              {dialogs.editingItemData.volumes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {dialogs.editingItemData.volumes.map((volume, index) => (
                    <Chip
                      key={index}
                      label={volume}
                      onDelete={() => handleRemoveVolumeFromEditingItem(volume)}
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
                  value={dialogs.editingItemData.newVolume}
                  onChange={(e) => dialogs.setEditingItemData(prev => ({
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
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVolumeToEditingItem()}
                />
                <Button
                  onClick={handleAddVolumeToEditingItem}
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
              dialogs.setEditItemDialog(false)
              dialogs.setSelectedManagementItem(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveEditedItem}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!dialogs.editingItemData.name.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition d'un équipement de l'inventaire */}
      <Dialog
        open={dialogs.openEditDialog}
        onClose={() => {
          dialogs.setOpenEditDialog(false)
          dialogs.setEditingEquipment(null)
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Edit />
            <Typography variant="h6">
              Modifier {dialogs.editingEquipment?.name}
              {dialogs.editingEquipment?.volume && (
                <span style={{ fontWeight: 400, fontSize: '1rem', marginLeft: 8 }}>
                  ({dialogs.editingEquipment.volume})
                </span>
              )}
            </Typography>
          </Box>
        </DialogTitle>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* Nom de l'équipement */}
            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={dialogs.editingEquipment?.name || ''}
              onChange={(e) => dialogs.setEditingEquipment((prev: any) => ({ ...prev, name: e.target.value }))}
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
            
            {/* Volume avec sélection des volumes preset */}
            {dialogs.editingEquipment?.equipmentTypeId && getAvailableVolumes(dialogs.editingEquipment.equipmentTypeId).length > 0 ? (
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
                <InputLabel>Volume</InputLabel>
                <Select
                  value={dialogs.editingEquipment?.volume || ''}
                  label="Volume"
                  onChange={(e) => dialogs.setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Aucun volume spécifié</em>
                  </MenuItem>
                  {getAvailableVolumes(dialogs.editingEquipment.equipmentTypeId).map((volume) => (
                    <MenuItem key={volume} value={volume}>
                      {volume}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                fullWidth
                label="Volume"
                value={dialogs.editingEquipment?.volume || ''}
                onChange={(e) => dialogs.setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))}
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
            )}
            
            {/* Quantité */}
            <TextField
              fullWidth
              label="Quantité"
              type="number"
              value={dialogs.editingEquipment?.quantity || 1}
              onChange={(e) => dialogs.setEditingEquipment((prev: any) => ({ ...prev, quantity: Number(e.target.value) }))}
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
            
            {/* Salle */}
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
              <InputLabel>Salle</InputLabel>
              <Select
                value={dialogs.editingEquipment?.room || ''}
                label="Salle"
                onChange={(e) => {
                  dialogs.setEditingEquipment((prev: any) => ({ 
                    ...prev, 
                    room: e.target.value,
                    location: '' // Reset location when room changes
                  }))
                }}
              >
                <MenuItem value="">
                  <em>Aucune salle spécifiée</em>
                </MenuItem>
                {equipmentData.rooms.map((room) => (
                  <MenuItem key={room.id} value={room.name}>
                    🏠 {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Localisation dans la salle */}
            {dialogs.editingEquipment?.room && (
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
                <InputLabel>Localisation</InputLabel>
                <Select
                  value={dialogs.editingEquipment?.location || ''}
                  label="Localisation"
                  onChange={(e) => dialogs.setEditingEquipment((prev: any) => ({ ...prev, location: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Aucune localisation spécifiée</em>
                  </MenuItem>
                  {(() => {
                    const selectedRoom = equipmentData.rooms.find(room => room.name === dialogs.editingEquipment.room)
                    return selectedRoom?.locations?.map((location: any) => (
                      <MenuItem key={location.id} value={location.name}>
                        📍 {location.name}
                      </MenuItem>
                    )) || []
                  })()}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button
            onClick={() => {
              dialogs.setOpenEditDialog(false)
              dialogs.setEditingEquipment(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!dialogs.editingEquipment?.name?.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour la confirmation de suppression */}
      {deletion.deleteState && (
        <DeleteConfirmationDialog
          open={deletion.deleteState.isOpen}
          onClose={deletion.closeDeletionDialog}
          onConfirm={async () => {
            const success = await deletion.confirmDeletion()
            if (success) {
              await equipmentData.loadEquipmentTypes()
              console.log(`${deletion.deleteState.type === 'category' ? 'Catégorie' : 'Équipement'} supprimé${deletion.deleteState.type === 'category' ? 'e' : ''} avec succès`)
            } else {
              console.error('Erreur lors de la suppression')
            }
          }}
          deleteType={deletion.deleteState.type || 'item'}
          title={deletion.deleteState.title || ''}
          relatedItems={deletion.deleteState.relatedItems || []}
          loading={deletion.loading}
        />
      )}

      {/* Dialog pour la détection de doublons */}
      {deletion.duplicateState && (
        <DuplicateDetectionDialog
          open={deletion.duplicateState.isOpen}
          onClose={deletion.closeDuplicateDialog}
          onMerge={deletion.handleMergeDuplicate}
          onAddAnyway={deletion.handleAddAnyway}
          newItem={deletion.duplicateState.newItem || {}}
          existingItems={deletion.duplicateState.existingItems || []}
          loading={deletion.loading}
        />
      )}
    </Container>
  )
}
