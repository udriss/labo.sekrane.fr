import { useEquipmentData } from '@/lib/hooks/useEquipmentData';
import { useEquipmentForm } from '@/lib/hooks/useEquipmentForm';
import { useEquipmentDialogs } from '@/lib/hooks/useEquipmentDialogs';
import { useEquipmentQuantity } from '@/lib/hooks/useEquipmentQuantity';
import { equipmentService } from '@/lib/services/equipmentService';

export const useEquipmentHandlers = () => {
  const equipmentData = useEquipmentData();
  const form = useEquipmentForm();
  const dialogs = useEquipmentDialogs();
  const quantity = useEquipmentQuantity(equipmentData.fetchEquipment);

  const handleSubmit = async () => {
    try {
      const newEquipment = await equipmentService.submitEquipment(
        form.formData,
        form.selectedCategory,
        form.selectedItem,
        equipmentData.getAllEquipmentTypes
      );

      console.log('Équipement ajouté avec succès:', newEquipment);
      
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
      await equipmentService.editEquipment(dialogs.editingEquipment.id, dialogs.editingEquipment);
      
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

      await equipmentService.deleteEquipment(dialogs.equipmentToDelete.id);
      
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
      await equipmentService.createCustomCategory(dialogs.newCategoryName);
      
      await equipmentData.loadEquipmentTypes();
      dialogs.setCustomCategories(prev => [...prev, { name: dialogs.newCategoryName }]);
      dialogs.setNewCategoryName('');
      dialogs.setNewCategoryDialog(false);
      alert('Catégorie créée avec succès !');
    } catch (error) {
      console.error('Erreur lors de la création de la catégorie:', error);
      alert('Erreur lors de la création de la catégorie');
    }
  };

  const handleSaveCustomEquipment = async () => {
    if (!dialogs.customEquipmentData.name.trim()) {
      alert('Veuillez entrer un nom pour l\'équipement');
      return;
    }

    if (!dialogs.customEquipmentData.category) {
      alert('Veuillez sélectionner une catégorie');
      return;
    }

    try {
      await equipmentService.saveCustomEquipment(dialogs.customEquipmentData);
      
      await equipmentData.loadEquipmentTypes();
      
      dialogs.setAddCustomEquipmentDialog(false);
      dialogs.setNewlyCreatedItem({
        name: dialogs.customEquipmentData.name,
        category: dialogs.customEquipmentData.category,
        volumes: dialogs.customEquipmentData.volumes
      });
      dialogs.setContinueDialog(true);
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipement personnalisé:', error);
      alert('Erreur lors de l\'ajout de l\'équipement');
    }
  };

  const handleSaveEditedItem = async () => {
    if (!dialogs.selectedManagementItem || !dialogs.selectedManagementCategory) return;

    try {
      const result = await equipmentService.saveEditedItem(
        dialogs.selectedManagementCategory,
        dialogs.selectedManagementItem,
        dialogs.editingItemData
      );

      await equipmentData.loadEquipmentTypes();
      
      dialogs.setEditItemDialog(false);
      dialogs.setSelectedManagementItem(null);
      
      if (result.targetCategory) {
        dialogs.setSelectedManagementCategory(result.targetCategory);
        alert('Équipement déplacé avec succès vers la nouvelle catégorie !');
      } else {
        alert('Équipement mis à jour avec succès !');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement:', error);
      alert('Erreur lors de la mise à jour de l\'équipement');
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
    ...equipmentData,
    ...form,
    ...dialogs,
    ...quantity,
    handleSubmit,
    handleSaveEdit,
    confirmDeleteEquipment,
    handleCreateCustomCategory,
    handleSaveCustomEquipment,
    handleSaveEditedItem,
    handleFinishWithoutContinue,
    handleContinueToInventory
  };
};
