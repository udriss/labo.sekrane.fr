import { useState } from 'react';
import { EquipmentFormData } from '@/types/equipment';

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

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setFormData(prev => ({ 
      ...prev, 
      name: item.name,
      volume: item.volumes && item.volumes.length > 0 ? item.volumes[0] : '',
      equipmentTypeId: item.id
    }));
    handleNext();
  };

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
