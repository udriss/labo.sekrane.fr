// lib/services/equipmentService-physics.ts

export const physicsEquipmentService = {
  

  async submitEquipment(formData: any, selectedCategory: string, selectedItem: any, getAllEquipmentTypes: () => any[]) {
    // Vérifier si c'est un équipement personnalisé sans ID
    const isNewCustomEquipment = selectedItem?.isCustom && !selectedItem?.id;
    
    if (isNewCustomEquipment) {
      const selectedType = getAllEquipmentTypes().find((t: any) => t.id === selectedCategory);
      if (!selectedType) {
        throw new Error("Catégorie non trouvée");
      }

      // Générer un ID unique pour le nouvel équipement
      const newItemId = `PHY_EQ_CUSTOM_${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Créer le nouvel item avec l'ID généré
      const newItem = {
        id: newItemId,
        name: formData.name || selectedItem.name, // Utiliser le nom du formulaire
        svg: selectedItem.svg || '/svg/default.svg',
        volumes: formData.volume ? [formData.volume] : (selectedItem.volumes || []),
        isCustom: true,
        equipmentTypeId: selectedCategory, // ID de la catégorie sélectionnée
      };

      // Dans submitEquipment, après avoir créé le type
      const typeResponse = await fetch('/api/physics/equipment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory,
          newItem: newItem
        })
      });

      if (!typeResponse.ok) {
        const error = await typeResponse.json();
        throw new Error(error.error || "Erreur lors de la création du type d'équipement");
      }

      const typeResult = await typeResponse.json();
      // Utiliser l'ID retourné par l'API
      const generatedId = typeResult.itemId || newItemId;


      // Créer l'équipement dans l'inventaire avec l'ID généré
      const dataToSubmit = {
        name: formData.name || selectedItem.name,
        equipmentTypeId: selectedCategory, // Utiliser l'ID de la catégorie
        equipmentItemId: generatedId, 
        quantity: formData.quantity || 1,
        volume: formData.volume || null,
        model: formData.model || null,
        serialNumber: formData.serialNumber || null,
        location: formData.location || null,
        room: formData.room || null,
        supplier: formData.supplier || null,
        purchaseDate: formData.purchaseDate || null,
        notes: formData.notes || null
      };

      const response = await fetch("/api/physics/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'ajout");
      }
      
      const result = await response.json();
      // Marquer comme nouvel équipement personnalisé pour le dialog de continuation
      result.isNewCustom = true;
      return result;
    }

    // Pour un équipement existant (custom ou non) qui a déjà un ID
    const equipmentItemId = formData.equipmentItemId;
    
    if (!equipmentItemId) {
      throw new Error("ID de l'équipement manquant");
    }

    const dataToSubmit = {
      name: formData.name,
      equipmentTypeId: selectedCategory, // Sera analysé par l'API pour déterminer si c'est un type ou un item
      equipmentItemId: formData.equipmentItemId || 'ITEM_ID_INTROUVABLE', // Si fourni séparément
      quantity: formData.quantity || 1,
      volume: formData.volume || null,
      model: formData.model || null,
      serialNumber: formData.serialNumber || null,
      barcode: formData.barcode || null,
      location: formData.location || null,
      room: formData.room || null,
      supplier: formData.supplier || null,
      purchaseDate: formData.purchaseDate || null,
      notes: formData.notes || null
    };

    const response = await fetch("/api/physics/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSubmit)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'ajout");
    }
    
    return await response.json();
  },

  async editEquipment(id: string, equipmentData: any) {
    const response = await fetch(`/api/physics/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipmentData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la modification");
    }

    return await response.json();
  },

  async deleteEquipment(id: string) {
    const response = await fetch(`/api/physics/equipment/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression");
    }

    return await response.json();
  },

  async createCustomCategory(categoryName: string) {
    const response = await fetch('/api/physics/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: categoryName,
        isCustom: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la création de la catégorie");
    }

    return await response.json();
  },

  async updateCategoryName(categoryId: string, newName: string) {
    const response = await fetch(`/api/physics/equipment-types/${categoryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la modification de la catégorie");
    }

    return await response.json();
  },

  async deleteCategory(categoryId: string) {
    const response = await fetch(`/api/physics/equipment-types/${categoryId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression de la catégorie");
    }

    return await response.json();
  },

  async getEquipmentTypes() {
    const response = await fetch('/api/physics/equipment-types');
    
    if (!response.ok) {
      throw new Error("Erreur lors du chargement des types d'équipement");
    }
    
    return await response.json();
  },

  async saveEditedItem(selectedManagementCategory: string, selectedManagementItem: any, updatedItem: any) {
    const targetCategory = updatedItem.targetCategory || selectedManagementCategory;
    const isCategoryChange = targetCategory !== selectedManagementCategory;

    if (isCategoryChange) {
      // Si on change de catégorie, faire un déplacement (suppression + ajout)
      const response = await fetch('/api/physics/equipment-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'move',
          sourceCategoryId: selectedManagementCategory,
          targetCategoryId: targetCategory,
          itemName: selectedManagementItem.name,
          updatedItem: updatedItem
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors du déplacement de l\'équipement de physique');
      }

      return { response, targetCategory };
    } else {
      // Mise à jour normale dans la même catégorie
      const response = await fetch('/api/physics/equipment-types', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: selectedManagementCategory,
          itemName: selectedManagementItem.name,
          updatedItem: updatedItem
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'équipement de physique');
      }

      return { response, targetCategory: null };
    }
  },

  async getEquipment() {
    const response = await fetch('/api/physics/equipment');
    
    if (!response.ok) {
      throw new Error("Erreur lors du chargement de l'équipement");
    }
    
    return await response.json();
  },

  async updateEquipmentQuantity(equipmentId: string, newQuantity: number) {
    const response = await fetch(`/api/physics/equipment/${equipmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la mise à jour de la quantité");
    }

    return await response.json();
  },

  async addCustomItemToCategory(categoryId: string, newItem: any) {
    const response = await fetch('/api/physics/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: categoryId,
        newItem: newItem
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'ajout de l'item");
    }

    return await response.json();
  },

  async createCustomItem(categoryId: string, itemData: any) {
    const response = await fetch('/api/physics/equipment-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: categoryId,
        newItem: {
          ...itemData,
          isCustom: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la création de l'item personnalisé");
    }

    return await response.json();
  },

  async deleteCustomItem(categoryId: string, itemId: string) {
    const response = await fetch(`/api/physics/equipment-types/${categoryId}/items/${itemId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression de l'item");
    }

    return await response.json();
  },

  async updateCustomItem(categoryId: string, itemId: string, itemData: any) {
    const response = await fetch(`/api/physics/equipment-types/${categoryId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la modification de l'item");
    }

    return await response.json();
  },

  // Méthodes pour gérer la recherche et le filtrage
  filterEquipment(equipment: any[], filters: any) {
    return equipment.filter(item => {
      // Appliquer les filtres selon la logique définie
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.category && item.equipmentTypeId !== filters.category) {
        return false;
      }
      if (filters.location && item.location !== filters.location) {
        return false;
      }
      if (filters.room && item.room !== filters.room) {
        return false;
      }
      return true;
    });
  },

  // Méthodes pour les statistiques
  getEquipmentStats(equipment: any[]) {
    return {
      total: equipment.length,
      lowStock: equipment.filter(item => item.quantity <= 2).length,
      outOfStock: equipment.filter(item => item.quantity === 0).length,
      categories: [...new Set(equipment.map(item => item.equipmentTypeId))].length
    };
  }
};
