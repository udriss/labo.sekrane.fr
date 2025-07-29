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
import { useEquipmentData } from "@/lib/hooks/useEquipmentData"
import { useEquipmentFilters } from "@/lib/hooks/useEquipmentFilters"
import { useEquipmentQuantity } from "@/lib/hooks/useEquipmentQuantity"
import { useEquipmentForm } from "@/lib/hooks/useEquipmentForm" 
import { useEquipmentDialogs } from "@/lib/hooks/useEquipmentDialogs"
import { useEquipmentDeletion } from "@/lib/hooks/useEquipmentDeletion"
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
import { equipmentService } from "@/lib/services/equipmentService"

// Import des types
import { EquipmentType, EquipmentItem, EditingItemData } from "@/types/equipment"

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
    const volumeToAdd = value || dialogs.editingItemData.newVolume
    if (volumeToAdd.trim() && !dialogs.editingItemData.volumes.includes(volumeToAdd)) {
      dialogs.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        volumes: [...prev.volumes, volumeToAdd.trim()],
        newVolume: ''
      }))
    }
  }
  const handleRemoveVolumeFromEditingItem = (volumeToRemove: string) => {
    dialogs.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  // Handler pour les résolutions
const handleAddResolutionToEditingItem = (value?: string) => {
    const resolutionToAdd = value || dialogs.editingItemData.newResolution
    if (resolutionToAdd.trim() && !dialogs.editingItemData.resolutions?.includes(resolutionToAdd)) {
      dialogs.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        resolutions: [...(prev.resolutions || []), resolutionToAdd.trim()],
        newResolution: ''
      }))
    }
  }

const handleRemoveResolutionFromEditingItem = (resolutionToRemove: string) => {
    dialogs.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      resolutions: prev.resolutions.filter(r => r !== resolutionToRemove)
    }))
  }

// Handler pour les tailles
const handleAddTailleToEditingItem = (value?: string) => {
    const tailleToAdd = value || dialogs.editingItemData.newTaille
    if (tailleToAdd.trim() && !dialogs.editingItemData.tailles?.includes(tailleToAdd)) {
      dialogs.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        tailles: [...(prev.tailles || []), tailleToAdd.trim()],
        newTaille: ''
      }))
    }
  }

const handleRemoveTailleFromEditingItem = (tailleToRemove: string) => {
    dialogs.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      tailles: prev.tailles.filter(t => t !== tailleToRemove)
    }))
  }

// Handler pour les matériaux
const handleAddMateriauToEditingItem = (value?: string) => {
    const materiauToAdd = value || dialogs.editingItemData.newMateriau
    if (materiauToAdd.trim() && !dialogs.editingItemData.materiaux?.includes(materiauToAdd)) {
      dialogs.setEditingItemData((prev: EditingItemData) => ({
        ...prev,
        materiaux: [...(prev.materiaux || []), materiauToAdd.trim()],
        newMateriau: ''
      }))
    }
  }

const handleRemoveMateriauFromEditingItem = (materiauToRemove: string) => {
    dialogs.setEditingItemData((prev: EditingItemData) => ({
      ...prev,
      materiaux: prev.materiaux.filter(m => m !== materiauToRemove)
    }))
  }


// Handler pour les champs personnalisés
const handleAddCustomFieldToEditingItem = (fieldName: string, values: string[]) => {
  if (fieldName.trim() && values.length > 0) {
    dialogs.setEditingItemData((prev: EditingItemData) => ({
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
    dialogs.setEditingItemData((prev: EditingItemData) => {
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
    const category = equipmentData.equipmentTypes.find(t => t.id === categoryId)
    if (category) {
      setEditingCategoryId(categoryId)
      setEditingCategoryName(category.name)
      setEditCategoryDialog(true)
    }
  }

  // Fonction pour supprimer une catégorie
  const handleDeleteCategory = async (categoryId: string) => {
    const category = equipmentData.equipmentTypes.find(t => t.id === categoryId)
    if (!category) return

    try {
      // Vérifier l'utilisation dans l'inventaire
      const checkResponse = await fetch('/api/equipment-types/check-usage', {
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
            const response = await fetch('/api/equipment-types', {
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
              await equipmentData.loadEquipmentTypes()
              
              // Si on était en train de voir cette catégorie, revenir à la liste
              if (dialogs.selectedManagementCategory === categoryId) {
                dialogs.setSelectedManagementCategory('')
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
      const response = await fetch('/api/equipment-types/category', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: editingCategoryId,
          name: editingCategoryName
        })
      })

      if (response.ok) {
        await equipmentData.loadEquipmentTypes()
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
      
      // Utiliser isNewCustom retourné par submitEquipment
      if (newEquipment.isNewCustom || (form.selectedItem?.isCustom && !form.selectedItem?.id)) {
        dialogs.setNewlyCreatedItem({
          ...newEquipment.materiel,
          category: form.selectedCategory
        })
        dialogs.setContinueDialog(true)
      } else {
        form.handleReset()
        setTabValue(1) // Basculer vers l'onglet inventaire
      }
      
      await equipmentData.fetchEquipment()
      await equipmentData.loadEquipmentTypes()
    } catch (error) {
      console.error('Erreur dans handleSubmitWithTabSwitch:', error)
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
      const newCategory = {
        id: `CUSTOM_${Date.now()}`,
        name: dialogs.newCategoryName,
        svg: '/svg/default.svg',
        ownerId: session?.user?.id // Ajouter l'ID du créateur
      }

      const response = await fetch('/api/equipment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newCategory,
          createEmpty: true
        })
      })

      if (response.ok) {
        await equipmentData.loadEquipmentTypes()
        dialogs.setNewCategoryName('')
        dialogs.setNewCategoryDialog(false)
        alert('Catégorie créée avec succès !')
      }
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



  const handleSaveEditedItem = async () => {
    if (!dialogs.selectedManagementItem || !dialogs.selectedManagementCategory) return

    try {
      const updatedItem = {
      ...dialogs.selectedManagementItem, // Conserver les propriétés existantes comme l'ID
      name: dialogs.editingItemData.name,
      volumes: dialogs.editingItemData.volumes,
      resolutions: dialogs.editingItemData.resolutions,
      tailles: dialogs.editingItemData.tailles,
      materiaux: dialogs.editingItemData.materiaux,
      customFields: dialogs.editingItemData.customFields, // Important : inclure les champs personnalisés
      svg: dialogs.selectedManagementItem.svg || '/svg/default.svg',
      isCustom: dialogs.selectedManagementItem.isCustom
      }

      const result = await equipmentService.saveEditedItem(
        dialogs.selectedManagementCategory,
        dialogs.selectedManagementItem,
        updatedItem
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
          currentUser={session?.user}
          users={users}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          getAllCategories={equipmentData.getAllCategories}
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
          <EquipmentManagementTab
            selectedManagementCategory={dialogs.selectedManagementCategory}
            setSelectedManagementCategory={dialogs.setSelectedManagementCategory}
            selectedManagementItem={dialogs.selectedManagementItem}
            setSelectedManagementItem={dialogs.setSelectedManagementItem}
            editItemDialog={dialogs.editItemDialog}
            setEditItemDialog={dialogs.setEditItemDialog}
            editingItemData={dialogs.editingItemData}
            setEditingItemData={dialogs.setEditingItemData}
            equipmentTypes={equipmentData.equipmentTypes}
            onSaveEditedItem={handleSaveEditedItem}
            onAddVolumeToEditingItem={handleAddVolumeToEditingItem}
            onRemoveVolumeFromEditingItem={handleRemoveVolumeFromEditingItem}
            getAllCategories={equipmentData.getAllCategories}
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
        
        <DialogActions sx={{ pt: 1 }}>
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
            Ajouter l'équipement
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
                    <em>Aucun volume</em>
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
                    <HomeFilled sx={{ fontSize: 16, color: 'text.secondary' }} /> {room.name}
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
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            color="success"
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
        originalName={equipmentData.equipmentTypes.find(t => t.id === editingCategoryId)?.name || ''}
      />
    </Container>
  )
}
