// app/materiel/page.tsx

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
  Add, Inventory, Settings, Edit, Delete, Save,
   Category, CheckCircle, Warning, Room, HomeFilled
} from "@mui/icons-material"

// Import des hooks personnalisés
import { useEquipmentDataChimie } from "@/lib/hooks/useEquipmentDataChimie"
import { useEquipmentFilters } from "@/lib/hooks/useEquipmentFilters"
import { useEquipmentQuantity } from "@/lib/hooks/useEquipmentQuantity"
import { useEquipmentForm } from "@/lib/hooks/useEquipmentForm" 
import { useEquipmentDialogs } from "@/lib/hooks/useEquipmentDialogs"
import { useEquipmentHandlersChimie } from "@/lib/hooks/useEquipmentHandlers"
import { useEquipmentDeletion } from "@/lib/hooks/useEquipmentDeletionChimie"
import { useSiteConfig } from "@/lib/hooks/useSiteConfig"
import { useSession } from 'next-auth/react'


// Import des composants
import { TabPanel } from "@/components/equipment/tab-panel"
import { EquipmentAddTab } from "@/components/equipment/equipment-add-tab"
import { EquipmentInventoryTab } from "@/components/equipment/equipment-inventory-tab"
import { EquipmentCard } from "@/components/equipment/EquipmentCard"
import ViewToggle from "@/components/equipment/ViewToggle"  
import { EquipmentListView } from "@/components/equipment/EquipmentListView"
import DeleteConfirmationDialog from "@/components/equipment/DeleteConfirmationDialog"
import DuplicateDetectionDialog from "@/components/equipment/DuplicateDetectionDialog"
import { EquipmentManagementTab } from '@/components/equipment/equipment-management-tab'
import { EditCategoryDialog } from '@/components/equipment/dialogs/EditCategoryDialog'

// Import des dialogues
import { ContinueDialog } from "@/components/equipment/dialogs/ContinueDialog"
import { NewCategoryDialog } from "@/components/equipment/dialogs/NewCategoryDialog"
import { DeleteDialog } from "@/components/equipment/dialogs/DeleteDialog"
import { useUsers } from '@/lib/hooks/useUsers';


// Import des services
import { equipmentServiceChimie } from "@/lib/services/equipmentServiceChimie"

// Import des types
import { EquipmentType, EquipmentItem, EditingItemData } from "@/types/equipment"

export default function EquipmentPage() {
  const [tabValue, setTabValue] = useState(0)
  
  // Utilisation du hook centralisé pour les gestionnaires d'équipement
  const equipmentHandlers = useEquipmentHandlersChimie()
  
  // Utilisation des hooks personnalisés pour les fonctionnalités spécifiques
  const filters = useEquipmentFilters(equipmentHandlers.materiel)
  
  // Nouveaux hooks pour les fonctionnalités avancées
  const deletion = useEquipmentDeletion()
  const { config, updateConfig } = useSiteConfig()
  const [viewMode, setViewModeState] = useState<'cards' | 'list'>('cards')
  
  const { users } = useUsers()
  const { data: session } = useSession()

  // États pour l'édition de catégorie
  const [editCategoryDialog, setEditCategoryDialog] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')

  // Initialiser le mode de vue
  useEffect(() => {
    const savedViewMode = config.materialsViewMode || 'cards'
    setViewModeState(savedViewMode)
  }, [config.materialsViewMode])


  // Gestionnaires pour l'édition des items de gestion
const handleAddVolumeToEditingItem = (value?: string) => {
    const volumeToAdd = value || equipmentHandlers.editingItemData.newVolume
    if (volumeToAdd.trim() && !equipmentHandlers.editingItemData.volumes.includes(volumeToAdd)) {
      equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        volumes: [...prev.volumes, volumeToAdd.trim()],
        newVolume: ''
      }))
    }
  }
  const handleRemoveVolumeFromEditingItem = (volumeToRemove: string) => {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  // Handler pour les résolutions
const handleAddResolutionToEditingItem = (value?: string) => {
    const resolutionToAdd = value || equipmentHandlers.editingItemData.newResolution
    if (resolutionToAdd.trim() && !equipmentHandlers.editingItemData.resolutions?.includes(resolutionToAdd)) {
      equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        resolutions: [...(prev.resolutions || []), resolutionToAdd.trim()],
        newResolution: ''
      }))
    }
  }

const handleRemoveResolutionFromEditingItem = (resolutionToRemove: string) => {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      resolutions: prev.resolutions.filter(r => r !== resolutionToRemove)
    }))
  }

// Handler pour les tailles
const handleAddTailleToEditingItem = (value?: string) => {
    const tailleToAdd = value || equipmentHandlers.editingItemData.newTaille
    if (tailleToAdd.trim() && !equipmentHandlers.editingItemData.tailles?.includes(tailleToAdd)) {
      equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        tailles: [...(prev.tailles || []), tailleToAdd.trim()],
        newTaille: ''
      }))
    }
  }

const handleRemoveTailleFromEditingItem = (tailleToRemove: string) => {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      tailles: prev.tailles.filter(t => t !== tailleToRemove)
    }))
  }

// Handler pour les matériaux
const handleAddMateriauToEditingItem = (value?: string) => {
    const materiauToAdd = value || equipmentHandlers.editingItemData.newMateriau
    if (materiauToAdd.trim() && !equipmentHandlers.editingItemData.materiaux?.includes(materiauToAdd)) {
      equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        materiaux: [...(prev.materiaux || []), materiauToAdd.trim()],
        newMateriau: ''
      }))
    }
  }

const handleRemoveMateriauFromEditingItem = (materiauToRemove: string) => {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      materiaux: prev.materiaux.filter(m => m !== materiauToRemove)
    }))
  }


// Handler pour les champs personnalisés
const handleAddCustomFieldToEditingItem = (fieldName: string, values: string[]) => {
  if (fieldName.trim() && values.length > 0) {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: [...(prev.customFields[fieldName] || []), ...values]
      },
      newCustomFieldName: '',
      newCustomFieldValues: ['']
    }))
  }
}

const handleRemoveCustomFieldFromEditingItem = (fieldName: string) => {
    equipmentHandlers.setEditingItemData((prev: EditingItemData) => {
      const newCustomFields = { ...prev.customFields }
      delete newCustomFields[fieldName]
      return {
        ...prev,
        customFields: newCustomFields
      }
    })
  }


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

  const handleEditCategory = (categoryId: string) => {
    const category = equipmentHandlers.equipmentTypes.find(t => t.id === categoryId)
    if (category) {
      setEditingCategoryId(categoryId)
      setEditingCategoryName(category.name)
      setEditCategoryDialog(true)
    }
  }

  // Fonction pour supprimer une catégorie
  const handleDeleteCategory = async (categoryId: string) => {
    const category = equipmentHandlers.equipmentTypes.find(t => t.id === categoryId)
    if (!category) return

    try {
      // Vérifier l'utilisation dans l'inventaire
      const checkResponse = await fetch('/api/chimie/equipment-types/check-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId })
      })
      
      const usageData = await checkResponse.json()
      
      // Ouvrir le dialogue de confirmation avec les infos d'utilisation
      deletion.openDeletionDialog({
        type: 'category',
        id: categoryId,
        title: category.name,
        relatedItems: usageData.itemNames || [],
        inventoryUsage: usageData.inventoryUsage || 0,
        onConfirm: async (deleteItems?: boolean) => {
          try {
            const response = await fetch('/api/chimie/equipment-types', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: 'deleteCategory', 
                categoryId,
                deleteItems: deleteItems || false
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              await equipmentHandlers.loadEquipmentTypes()
              
              // Si on était en train de voir cette catégorie, revenir à la liste
              if (equipmentHandlers.selectedManagementCategory === categoryId) {
                equipmentHandlers.setSelectedManagementCategory('')
              }
              
              // Afficher un message de succès
              if (deleteItems) {
                alert(`Catégorie "${category.name}" et ses ${result.itemsDeleted} équipements supprimés avec succès`)
              } else if (result.itemsMoved > 0) {
                alert(`Catégorie "${category.name}" supprimée. ${result.itemsMoved} équipements déplacés dans "Sans catégorie"`)
              } else {
                alert(`Catégorie "${category.name}" supprimée avec succès`)
              }
            } else {
              const error = await response.json()
              alert(error.error || 'Erreur lors de la suppression')
            }
          } catch (error) {
            console.error('Erreur lors de la suppression:', error)
            alert('Erreur lors de la suppression de la catégorie')
          }
        }
      })
    } catch (error) {
      console.error('Erreur lors de la vérification:', error)
      alert('Erreur lors de la vérification de l\'utilisation')
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategoryName.trim() || !editingCategoryId) return

    try {
      const response = await fetch('/api/chimie/equipment-types/category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editingCategoryId,
          name: editingCategoryName
        })
      })

      if (response.ok) {
        await equipmentHandlers.loadEquipmentTypes()
        setEditCategoryDialog(false)
        setEditingCategoryId('')
        setEditingCategoryName('')
        // TODO: Afficher un message de succès
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la modification')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la modification de la catégorie')
    }
  }
  // Fonction pour obtenir les volumes disponibles pour un équipement
  const getAvailableVolumes = (equipmentTypeId: string): string[] => {
    for (const equipmentType of equipmentHandlers.getAllEquipmentTypes()) {
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
    equipmentHandlers.setActiveStep(0)
    equipmentHandlers.setSelectedCategory('')
    equipmentHandlers.setSelectedItem(null)
    equipmentHandlers.setFormData({
      name: '',
      equipmentTypeId: '',
      quantity: 1,
      volume: '',
    })
  }

  // Gestionnaire pour la soumission avec gestion des onglets
  const handleSubmitWithTabSwitch = async () => {
    try {  
      const result = await equipmentHandlers.handleSubmit()
      
      // Si le hook retourne une indication de basculer vers l'inventaire
      if (result?.switchToInventory) {
        setTabValue(1) // Basculer vers l'onglet inventaire
      }
    } catch (error) {
      console.error('Erreur dans handleSubmitWithTabSwitch:', error)
      equipmentHandlers.setError(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    }
  }

  // Les gestionnaires pour l'édition et la suppression sont maintenant dans le hook centralisé
  // handleSaveEdit -> equipmentHandlers.handleSaveEdit
  // confirmDeleteEquipment -> equipmentHandlers.confirmDeleteEquipment

  // Gestionnaire pour créer une catégorie personnalisée
  const handleCreateCustomCategory = async () => {
    if (!equipmentHandlers.newCategoryName.trim()) {
      alert('Veuillez entrer un nom pour la catégorie')
      return
    }

    try {
      const newCategory = {
        id: `CUSTOM_${Date.now()}`,
        name: equipmentHandlers.newCategoryName,
        svg: '/svg/default.svg',
        ownerId: session?.user?.id // Ajouter l'ID du créateur
      }

      const response = await fetch('/api/chimie/equipment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newCategory,
          createEmpty: true
        })
      })

      if (response.ok) {
        await equipmentHandlers.loadEquipmentTypes()
        equipmentHandlers.setNewCategoryName('')
        equipmentHandlers.setNewCategoryDialog(false)
        alert('Catégorie créée avec succès !')
      }
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error)
      alert('Erreur lors de la création de la catégorie')
    }
  }

  // Gestionnaires pour les volumes dans l'équipement personnalisé
  const handleAddVolumeToCustomEquipment = () => {
    if (equipmentHandlers.customEquipmentData.newVolume.trim()) {
      equipmentHandlers.setCustomEquipmentData(prev => ({
        ...prev,
        volumes: [...prev.volumes, prev.newVolume.trim()],
        newVolume: ''
      }))
    }
  }

  const handleRemoveVolumeFromCustomEquipment = (volumeToRemove: string) => {
    equipmentHandlers.setCustomEquipmentData(prev => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  // Gestionnaire pour sauvegarder un équipement personnalisé
  const handleSaveCustomEquipment = async () => {
    if (!equipmentHandlers.customEquipmentData.name.trim()) {
      alert('Veuillez entrer un nom pour l\'équipement')
      return
    }

    // if (!equipmentHandlers.customEquipmentData.category) {
    //   alert('Veuillez sélectionner une catégorie')
    //   return
    // }

    try {
      await equipmentServiceChimie.saveCustomEquipment(equipmentHandlers.customEquipmentData)
      
      await equipmentHandlers.loadEquipmentTypes()
      
      equipmentHandlers.setAddCustomEquipmentDialog(false)
      equipmentHandlers.setNewlyCreatedItem({
        name: equipmentHandlers.customEquipmentData.name,
        category: equipmentHandlers.customEquipmentData.category,
        volumes: equipmentHandlers.customEquipmentData.volumes
      })
      equipmentHandlers.setContinueDialog(true)
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipement personnalisé:', error)
      alert('Erreur lors de l\'ajout de l\'équipement')
    }
  }

  // Gestionnaires pour les dialogues de continuation avec gestion des onglets
  const handleFinishWithoutContinue = () => {
    const result = equipmentHandlers.handleFinishWithoutContinue()
    if (result?.switchToInventory) {
      setTabValue(1) // Basculer vers l'onglet inventaire
    }
  }

  const handleContinueToInventory = () => {
    const result = equipmentHandlers.handleContinueToInventory()
    if (result?.switchToAddTab) {
      setTabValue(0) // Rester sur l'onglet d'ajout
    }
  }

  // handleSaveEditedItem est maintenant dans le hook centralisé
  // equipmentHandlers.handleSaveEditedItem

  // Gestionnaire de changement de quantité
  const handleQuantityChangeWithMaterial = (equipmentId: string, newValue: number) => {
    const currentItem = equipmentHandlers.materiel.find((item: any) => item.id === equipmentId) as any
    if (newValue !== currentItem?.quantity) {
      equipmentHandlers.handleQuantityChange(equipmentId, newValue, equipmentHandlers.materiel)
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
          activeStep={equipmentHandlers.activeStep}
          setActiveStep={equipmentHandlers.setActiveStep}
          selectedCategory={equipmentHandlers.selectedCategory}
          setSelectedCategory={equipmentHandlers.setSelectedCategory}
          selectedItem={equipmentHandlers.selectedItem}
          setSelectedItem={equipmentHandlers.setSelectedItem}
          formData={equipmentHandlers.formData}
          setFormData={equipmentHandlers.setFormData}
          equipmentTypes={equipmentHandlers.equipmentTypes}
          rooms={equipmentHandlers.rooms}
          onCategorySelect={equipmentHandlers.handleCategorySelect}
          onItemSelect={equipmentHandlers.handleItemSelect}
          onFormChange={equipmentHandlers.handleFormChange}
          onSubmit={handleSubmitWithTabSwitch}
          onReset={equipmentHandlers.handleReset}
          loading={equipmentHandlers.loading}
          currentUser={session?.user}
          users={users}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          getAllCategories={equipmentHandlers.getAllCategories}
        />
      </TabPanel>

      {/* Onglet Inventaire */}
      <TabPanel value={tabValue} index={1}>
        <EquipmentInventoryTab
          materiel={equipmentHandlers.materiel}
          loading={equipmentHandlers.loading}
          error={equipmentHandlers.error}
          searchTerm={filters.searchTerm}
          setSearchTerm={filters.setSearchTerm}
          typeFilter={filters.typeFilter}
          setTypeFilter={filters.setTypeFilter}
          locationFilter={filters.locationFilter}
          setLocationFilter={filters.setLocationFilter}
          sortBy={filters.sortBy}
          setSortBy={filters.setSortBy}
          rooms={equipmentHandlers.rooms}
          quantityValues={equipmentHandlers.quantityValues}
          setQuantityValues={equipmentHandlers.setQuantityValues}
          updatingCards={equipmentHandlers.updatingCards}
          onQuantityChange={handleQuantityChangeWithMaterial}
          onEditEquipment={equipmentHandlers.handleEditEquipment}
          onDeleteEquipment={equipmentHandlers.handleDeleteEquipment}
          getTypeLabel={filters.getTypeLabel}
          getFilteredMateriel={filters.getFilteredMateriel}
        />
      </TabPanel>

      {/* Onglet Gestion des types */}
      <TabPanel value={tabValue} index={2}>
          <EquipmentManagementTab
            selectedManagementCategory={equipmentHandlers.selectedManagementCategory}
            setSelectedManagementCategory={equipmentHandlers.setSelectedManagementCategory}
            selectedManagementItem={equipmentHandlers.selectedManagementItem}
            setSelectedManagementItem={equipmentHandlers.setSelectedManagementItem}
            editItemDialog={equipmentHandlers.editItemDialog}
            setEditItemDialog={equipmentHandlers.setEditItemDialog}
            editingItemData={equipmentHandlers.editingItemData}
            setEditingItemData={equipmentHandlers.setEditingItemData}
            equipmentTypes={equipmentHandlers.equipmentTypes}
            onSaveEditedItem={equipmentHandlers.handleSaveEditedItem}
            onAddVolumeToEditingItem={handleAddVolumeToEditingItem}
            onRemoveVolumeFromEditingItem={handleRemoveVolumeFromEditingItem}
            getAllCategories={equipmentHandlers.getAllCategories}
            currentUser={session?.user}
            users={users}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddResolutionToEditingItem={handleAddResolutionToEditingItem}
            onRemoveResolutionFromEditingItem={handleRemoveResolutionFromEditingItem}
            onAddTailleToEditingItem={handleAddTailleToEditingItem}
            onRemoveTailleFromEditingItem={handleRemoveTailleFromEditingItem}
            onAddMateriauToEditingItem={handleAddMateriauToEditingItem}
            onRemoveMateriauFromEditingItem={handleRemoveMateriauFromEditingItem}
            onAddCustomFieldToEditingItem={handleAddCustomFieldToEditingItem}
            onRemoveCustomFieldFromEditingItem={handleRemoveCustomFieldFromEditingItem}
          />
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
                equipmentHandlers.setNewCategoryName('')
                equipmentHandlers.setNewCategoryDialog(true)
              }}
            >
              Nouvelle catégorie
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                equipmentHandlers.setCustomEquipmentData({
                  name: '',
                  category: '',
                  volumes: [],
                  newVolume: ''
                })
                equipmentHandlers.setAddCustomEquipmentDialog(true)
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
        open={equipmentHandlers.continueDialog}
        onClose={() => equipmentHandlers.setContinueDialog(false)}
        newlyCreatedItem={equipmentHandlers.newlyCreatedItem}
        onFinishWithoutContinue={handleFinishWithoutContinue}
        onContinueToInventory={handleContinueToInventory}
      />

      {/* Dialogue pour créer une nouvelle catégorie */}
      <NewCategoryDialog
        open={equipmentHandlers.newCategoryDialog}
        onClose={() => equipmentHandlers.setNewCategoryDialog(false)}
        categoryName={equipmentHandlers.newCategoryName}
        setCategoryName={equipmentHandlers.setNewCategoryName}
        onCreateCategory={handleCreateCustomCategory}
      />

      {/* Dialogue de suppression stylisé */}
      <DeleteDialog
        open={equipmentHandlers.deleteDialog}
        onClose={() => equipmentHandlers.setDeleteDialog(false)}
        equipmentToDelete={equipmentHandlers.equipmentToDelete}
        onConfirmDelete={equipmentHandlers.confirmDeleteEquipment}
      />

      {/* Dialog pour ajouter un équipement personnalisé aux catégories */}
      <Dialog
        open={equipmentHandlers.addCustomEquipmentDialog}
        onClose={() => equipmentHandlers.setAddCustomEquipmentDialog(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              padding: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Add />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Ajouter un équipement personnalisé
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Catégorie: {equipmentHandlers.getAllCategories().find(c => c.id === equipmentHandlers.customEquipmentData.category)?.name}
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
                  value={equipmentHandlers.customEquipmentData.category}
                  label="Catégorie"
                  onChange={(e) => equipmentHandlers.setCustomEquipmentData(prev => ({
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
                  {equipmentHandlers.getAllCategories().map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Nom de l'équipement"
                value={equipmentHandlers.customEquipmentData.name}
                onChange={(e) => equipmentHandlers.setCustomEquipmentData(prev => ({
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
                    value={equipmentHandlers.customEquipmentData.newVolume}
                    onChange={(e) => equipmentHandlers.setCustomEquipmentData(prev => ({
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

                {equipmentHandlers.customEquipmentData.volumes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {equipmentHandlers.customEquipmentData.volumes.map((volume, index) => (
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
        
        <DialogActions sx={{ pt: 1 }}>
          <Button 
            onClick={() => equipmentHandlers.setAddCustomEquipmentDialog(false)}
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
            disabled={!equipmentHandlers.customEquipmentData.name.trim()}
          >
            Ajouter l'équipement
          </Button>
        </DialogActions>
      </Dialog>


      {/* Dialog d'édition d'un équipement de l'inventaire */}
      <Dialog
        open={equipmentHandlers.openEditDialog}
        onClose={() => {
          equipmentHandlers.setOpenEditDialog(false)
          equipmentHandlers.setEditingEquipment(null)
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
              Modifier {equipmentHandlers.editingEquipment?.name}
              {equipmentHandlers.editingEquipment?.volume && (
                <span style={{ fontWeight: 400, fontSize: '1rem', marginLeft: 8 }}>
                  ({equipmentHandlers.editingEquipment.volume})
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
              value={equipmentHandlers.editingEquipment?.name || ''}
              onChange={(e) => equipmentHandlers.setEditingEquipment((prev: any) => ({ ...prev, name: e.target.value }))}
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
            {equipmentHandlers.editingEquipment?.equipmentTypeId && getAvailableVolumes(equipmentHandlers.editingEquipment.equipmentTypeId).length > 0 ? (
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
                  value={equipmentHandlers.editingEquipment?.volume || ''}
                  label="Volume"
                  onChange={(e) => equipmentHandlers.setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Aucun volume</em>
                  </MenuItem>
                  {getAvailableVolumes(equipmentHandlers.editingEquipment.equipmentTypeId).map((volume) => (
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
                value={equipmentHandlers.editingEquipment?.volume || ''}
                onChange={(e) => equipmentHandlers.setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))}
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
              value={equipmentHandlers.editingEquipment?.quantity || 1}
              onChange={(e) => equipmentHandlers.setEditingEquipment((prev: any) => ({ ...prev, quantity: Number(e.target.value) }))}
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
                value={equipmentHandlers.editingEquipment?.room || ''}
                label="Salle"
                onChange={(e) => {
                  equipmentHandlers.setEditingEquipment((prev: any) => ({ 
                    ...prev, 
                    room: e.target.value,
                    location: '' // Reset location when room changes
                  }))
                }}
              >
                <MenuItem value="">
                  <em>Aucune salle spécifiée</em>
                </MenuItem>
                {equipmentHandlers.rooms.map((room) => (
                  <MenuItem key={room.id} value={room.name}>
                    <HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {room.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Localisation dans la salle */}
            {equipmentHandlers.editingEquipment?.room && (
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
                  value={equipmentHandlers.editingEquipment?.location || ''}
                  label="Localisation"
                  onChange={(e) => equipmentHandlers.setEditingEquipment((prev: any) => ({ ...prev, location: e.target.value }))}
                >
                  <MenuItem value="">
                    <em>Aucune localisation spécifiée</em>
                  </MenuItem>
                  {(() => {
                    const selectedRoom = equipmentHandlers.rooms.find(room => room.name === equipmentHandlers.editingEquipment.room)
                    return selectedRoom?.locations?.map((location: any) => (
                      <MenuItem key={location.id} value={location.name}>
                        <Room sx={{ fontSize: 16, color: 'text.secondary' }} /> {location.name}
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
              equipmentHandlers.setOpenEditDialog(false)
              equipmentHandlers.setEditingEquipment(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={equipmentHandlers.handleSaveEdit}
            variant="contained"
            sx={{ 
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            color="success"
            disabled={!equipmentHandlers.editingEquipment?.name?.trim()}
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
              await equipmentHandlers.loadEquipmentTypes()
              
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

      {/* Dialog d'édition de catégorie */}
      <EditCategoryDialog
        open={editCategoryDialog}
        onClose={() => {
          setEditCategoryDialog(false)
          setEditingCategoryId('')
          setEditingCategoryName('')
        }}
        categoryName={editingCategoryName}
        setCategoryName={setEditingCategoryName}
        onUpdateCategory={handleUpdateCategory}
        originalName={equipmentHandlers.equipmentTypes.find(t => t.id === editingCategoryId)?.name || ''}
      />
    </Container>
  )
}
