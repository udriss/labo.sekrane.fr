// lib/hooks/useEquipmentHandlers-physics.ts
import { useEquipmentData } from '@/lib/hooks/useEquipmentData-physics';
import { useEquipmentForm } from '@/lib/hooks/useEquipmentForm';
import { useEquipmentDialogs } from '@/lib/hooks/useEquipmentDialogs';
import { useEquipmentQuantity } from '@/lib/hooks/useEquipmentQuantity-physics';
import { physicsEquipmentService } from '@/lib/services/equipmentService-physics';

export const useEquipmentHandlers = () => {
  const equipmentData = useEquipmentData();
  const form = useEquipmentForm();
  const dialogs = useEquipmentDialogs();
  const quantity = useEquipmentQuantity(equipmentData.fetchEquipment);

  const handleSubmit = async () => {
    try {
      const newEquipment = await physicsEquipmentService.submitEquipment(
        form.formData,
        form.selectedCategory,
        form.selectedItem,
        equipmentData.getAllEquipmentTypes
      );

      console.log('Équipement de physique ajouté avec succès:', newEquipment);
      
      // Actualiser les données
      await equipmentData.fetchEquipment();
      await equipmentData.loadEquipmentTypes();
      
      // Si c'est un équipement personnalisé, ouvrir le dialogue de continuation
      if (form.selectedItem?.name === 'Équipement personnalisé') {
        dialogs.setNewlyCreatedItem(newEquipment);
        dialogs.setContinueDialog(true);
        return { switchToInventory: false }; // Rester sur l'onglet actuel pour le dialogue
      } else {
        form.handleReset();
        // Retourner l'indication de basculer vers l'onglet inventaire
        return { switchToInventory: true };
      }
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de l'ajout");
      return { switchToInventory: false }; // Rester sur l'onglet actuel en cas d'erreur
    }
  };

  const handleSaveEdit = async () => {
    try {
      await physicsEquipmentService.editEquipment(dialogs.editingEquipment.id, dialogs.editingEquipment);
      
      await equipmentData.fetchEquipment();
      dialogs.setOpenEditDialog(false);
      dialogs.setEditingEquipment(null);
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la modification");
    }
  };

  const confirmDeleteEquipment = async () => {
    if (!dialogs.equipmentToDelete || !dialogs.equipmentToDelete.id) {
      equipmentData.setError("Impossible de supprimer l'équipement : ID manquant.");
      dialogs.setDeleteDialog(false);
      dialogs.setEquipmentToDelete(null);
      return;
    }

    try {
      dialogs.setDeletingItems(prev => new Set([...prev, dialogs.equipmentToDelete.id]));
      dialogs.setDeleteDialog(false);

      await physicsEquipmentService.deleteEquipment(dialogs.equipmentToDelete.id);
      
      setTimeout(async () => {
        await equipmentData.fetchEquipment();
        dialogs.setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(dialogs.equipmentToDelete.id);
          return newSet;
        });
        dialogs.setEquipmentToDelete(null);
      }, 500);

    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la suppression");
      dialogs.setDeletingItems(prev => {
        const newSet = new Set(prev);
        if (dialogs.equipmentToDelete) {
          newSet.delete(dialogs.equipmentToDelete.id);
        }
        return newSet;
      });
      dialogs.setEquipmentToDelete(null);
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!dialogs.newCategoryName.trim()) {
      alert('Veuillez entrer un nom pour la catégorie');
      return;
    }

    try {
      await physicsEquipmentService.createCustomCategory(dialogs.newCategoryName);
      
      await equipmentData.loadEquipmentTypes();
      dialogs.setNewCategoryDialog(false);
      dialogs.setNewCategoryName('');
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la création de la catégorie");
    }
  };

  const handleContinueWithSameItem = async () => {
    try {
      if (!dialogs.newlyCreatedItem) return;
      
      // Remplir le formulaire avec les données de l'équipement créé
      const createdItem = dialogs.newlyCreatedItem;
      
      // Trouver l'item correspondant dans les types d'équipement
      const allTypes = equipmentData.getAllEquipmentTypes();
      const correspondingType = allTypes.find((type: any) => 
        type.items?.some((item: any) => item.id === createdItem.equipmentItemId)
      );
      
      if (correspondingType) {
        const correspondingItem = correspondingType.items.find((item: any) => item.id === createdItem.equipmentItemId);
        
        if (correspondingItem) {
          form.setSelectedCategory(correspondingType.id);
          form.setSelectedItem(correspondingItem);
          form.setFormData({
            ...form.formData,
            name: correspondingItem.name,
            quantity: 1, // Reset à 1 pour le nouvel ajout
            volume: '',
            model: '',
            serialNumber: '',
            location: '',
            room: '',
            supplier: '',
            purchaseDate: undefined,
            notes: ''
          });
        }
      }
      
      dialogs.setContinueDialog(false);
      dialogs.setNewlyCreatedItem(null);
      
    } catch (error) {
      equipmentData.setError(error instanceof Error ? error.message : "Erreur lors de la continuation");
    }
  };

  const handleFinishAddingEquipment = () => {
    form.handleReset();
    dialogs.setContinueDialog(false);
    dialogs.setNewlyCreatedItem(null);
  };

  const handleSaveEditedItem = async () => {
    if (!dialogs.selectedManagementItem || !dialogs.selectedManagementCategory) return;

    try {
      const result = await physicsEquipmentService.saveEditedItem(
        dialogs.selectedManagementCategory,
        dialogs.selectedManagementItem,
        dialogs.editingItemData
      );

      await equipmentData.loadEquipmentTypes();
      
      dialogs.setEditItemDialog(false);
      dialogs.setSelectedManagementItem(null);
      
      if (result.targetCategory) {
        dialogs.setSelectedManagementCategory(result.targetCategory);
        alert('Équipement de physique déplacé avec succès vers la nouvelle catégorie !');
      } else {
        alert('Équipement de physique mis à jour avec succès !');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement de physique:', error);
      alert('Erreur lors de la mise à jour de l\'équipement de physique');
    }
  };

  const handleFinishWithoutContinue = () => {
    dialogs.setContinueDialog(false);
    dialogs.setNewlyCreatedItem(null);
    form.handleReset();
    return { switchToInventory: true };
  };

  const handleContinueToInventory = () => {
    dialogs.setContinueDialog(false);
    if (dialogs.newlyCreatedItem) {
      form.setSelectedItem({
        name: dialogs.newlyCreatedItem.name,
        svg: '/svg/default.svg',
        volumes: dialogs.newlyCreatedItem.volumes || ['N/A']
      });
      form.setFormData(prev => ({
        ...prev,
        name: dialogs.newlyCreatedItem.name,
        type: dialogs.newlyCreatedItem.category
      }));
      form.setActiveStep(2);
      return { switchToAddTab: true };
    }
    dialogs.setNewlyCreatedItem(null);
  };

  return {
    // Data
    ...equipmentData,
    ...form,
    ...dialogs,
    ...quantity,
    
    // Actions
    handleSubmit,
    handleSaveEdit,
    confirmDeleteEquipment,
    handleCreateCustomCategory,
    handleContinueWithSameItem,
    handleFinishAddingEquipment,
    handleSaveEditedItem,
    handleFinishWithoutContinue,
    handleContinueToInventory
  };
};
