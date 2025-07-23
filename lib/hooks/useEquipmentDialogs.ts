import { useState } from 'react';

export const useEquipmentDialogs = () => {
  // États pour l'édition d'équipement
  const [editingEquipment, setEditingEquipment] = useState<any>(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  
  // États pour le dialogue de continuation
  const [continueDialog, setContinueDialog] = useState(false);
  const [newlyCreatedItem, setNewlyCreatedItem] = useState<any>(null);
  
  // États pour la gestion des catégories personnalisées
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // États pour la suppression avec animation
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null);
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  // États pour l'ajout d'équipement personnalisé aux catégories
  const [addCustomEquipmentDialog, setAddCustomEquipmentDialog] = useState(false);
  const [customEquipmentData, setCustomEquipmentData] = useState({
    name: '',
    category: '',
    volumes: [] as string[],
    newVolume: ''
  });

  // États pour la gestion des types d'équipement (onglet 3)
  const [selectedManagementCategory, setSelectedManagementCategory] = useState<string>('');
  const [selectedManagementItem, setSelectedManagementItem] = useState<any>(null);
  const [editItemDialog, setEditItemDialog] = useState(false);
  const [editingItemData, setEditingItemData] = useState({
    name: '',
    volumes: [] as string[],
    newVolume: '',
    targetCategory: ''
  });

  const handleEditEquipment = (equipment: any) => {
    setEditingEquipment(equipment);
    setOpenEditDialog(true);
  };

  const handleDeleteEquipment = (equipment: any) => {
    setEquipmentToDelete(equipment);
    setDeleteDialog(true);
  };

  return {
    // Edit equipment states
    editingEquipment,
    setEditingEquipment,
    openEditDialog,
    setOpenEditDialog,
    
    // Continue dialog states
    continueDialog,
    setContinueDialog,
    newlyCreatedItem,
    setNewlyCreatedItem,
    
    // Custom categories states
    customCategories,
    setCustomCategories,
    newCategoryDialog,
    setNewCategoryDialog,
    newCategoryName,
    setNewCategoryName,
    
    // Delete dialog states
    deleteDialog,
    setDeleteDialog,
    equipmentToDelete,
    setEquipmentToDelete,
    deletingItems,
    setDeletingItems,
    
    // Custom equipment dialog states
    addCustomEquipmentDialog,
    setAddCustomEquipmentDialog,
    customEquipmentData,
    setCustomEquipmentData,
    
    // Management states
    selectedManagementCategory,
    setSelectedManagementCategory,
    selectedManagementItem,
    setSelectedManagementItem,
    editItemDialog,
    setEditItemDialog,
    editingItemData,
    setEditingItemData,
    
    // Handlers
    handleEditEquipment,
    handleDeleteEquipment
  };
};
