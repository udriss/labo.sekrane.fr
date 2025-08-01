import { useState } from 'react';
import { EquipmentFormData, EquipmentItem } from '@/types/equipment';

export const useEquipmentForm = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    equipmentTypeId: '',
    quantity: 1,
    volume: '',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      name: '',
      equipmentTypeId: '',
      quantity: 1,
      volume: '',
    });
    setSelectedCategory('');
    setSelectedItem(null);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setFormData(prev => ({ ...prev, equipmentTypeId: categoryId }));
    handleNext();
  };

  const handleItemSelect = (item: EquipmentItem) => {
    setSelectedItem(item)
    
    // Si c'est un équipement custom sans ID, permettre la modification du nom
    if (item.isCustom && !item.id) {
      setFormData(prev => ({
        ...prev,
        name: '', // Nom vide pour permettre la saisie
        equipmentTypeId: '' // Pas d'ID car il n'existe pas encore
      }))
    } else {
      // Pour tout équipement avec un ID (custom ou non)
      // Envoyer le bon equipmentTypeId et equipmentItemId
      setFormData(prev => ({
        ...prev,
        name: item.name,
        equipmentTypeId: (item as any).equipmentTypeId,
        equipmentItemId: item.id // L'ID de l'item spécifique
      }))
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return {
    activeStep,
    setActiveStep,
    formData,
    setFormData,
    selectedCategory,
    setSelectedCategory,
    selectedItem,
    setSelectedItem,
    handleNext,
    handleBack,
    handleReset,
    handleCategorySelect,
    handleItemSelect,
    handleFormChange
  };
};
