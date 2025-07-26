// lib/services/equipmentService.ts

export const equipmentService = {
  async submitEquipment(formData: any, selectedCategory: string, selectedItem: any, getAllEquipmentTypes: () => any[]) {
    const dataToSubmit = {
      name: formData.name,
      equipmentTypeId: formData.equipmentTypeId,
      quantity: formData.quantity,
      volume: formData.volume,
      isCustom: selectedCategory.startsWith('CUSTOM')
    };

    console.log("Données à soumettre:", dataToSubmit);

    const response = await fetch("/api/equipement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSubmit)
    });
    
    if (!response.ok) throw new Error("Erreur lors de l'ajout");
    
    const newEquipment = await response.json();
    
    return newEquipment;
  },

  async editEquipment(equipmentId: string, equipmentData: any) {
    const response = await fetch(`/api/equipement/${equipmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(equipmentData)
    });
    
    if (!response.ok) throw new Error("Erreur lors de la modification");
    
    return response;
  },

  async deleteEquipment(equipmentId: string) {
    const response = await fetch(`/api/equipement/${equipmentId}`, {
      method: "DELETE"
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Erreur de suppression:", errorData);
      throw new Error(errorData.message || "Erreur lors de la suppression");
    }
    
    return response;
  },

  async createCustomCategory(categoryName: string) {
    const newCategory = {
      id: 'CUSTOM_' + Date.now(),
      name: categoryName.trim(),
      svg: '/svg/default.svg',
      items: []
    };

    const response = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: newCategory,
        createEmpty: true // Nouveau paramètre pour ne pas créer d'item exemple
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la création de la catégorie');
    }

    return newCategory;
  },

  async deleteCustomCategory(categoryId: string) {
    const response = await fetch('/api/equipment-types', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteCategory',
        categoryId: categoryId
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression de la catégorie');
    }

    return response;
  },

  async saveCustomEquipment(customEquipmentData: any) {
    const response = await fetch('/api/equipment-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        categoryId: customEquipmentData.category,
        newItem: {
          name: customEquipmentData.name,
          svg: '/svg/default.svg',
          volumes: customEquipmentData.volumes.length > 0 ? customEquipmentData.volumes : ['N/A'],
          isCustom: true
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de l\'ajout de l\'équipement');
    }

    return response;
  },

  async deleteCustomEquipment(categoryId: string, itemName: string) {
    const response = await fetch('/api/equipment-types', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'deleteItem',
        categoryId: categoryId,
        itemName: itemName
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la suppression de l\'équipement');
    }

    return response;
  },

  async saveEditedItem(selectedManagementCategory: string, selectedManagementItem: any, editingItemData: any) {
    const updatedItem = {
      ...selectedManagementItem,
      name: editingItemData.name,
      volumes: editingItemData.volumes
    };

    const targetCategory = editingItemData.targetCategory || selectedManagementCategory;
    const isCategoryChange = targetCategory !== selectedManagementCategory;

    if (isCategoryChange) {
      // Si on change de catégorie, faire un déplacement (suppression + ajout)
      const response = await fetch('/api/equipment-types', {
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
        throw new Error('Erreur lors du déplacement');
      }

      return { response, targetCategory };
    } else {
      // Mise à jour normale dans la même catégorie
      const response = await fetch('/api/equipment-types', {
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
        throw new Error('Erreur lors de la mise à jour');
      }

      return { response, targetCategory: null };
    }
  },

  async checkSimilarEquipment(equipmentName: string) {
    const response = await fetch(`/api/equipment-types/similar?name=${encodeURIComponent(equipmentName)}`);
    
    if (!response.ok) {
      throw new Error('Erreur lors de la vérification des équipements similaires');
    }
    
    return await response.json();
  },

  // Fonction pour supprimer une catégorie
  async deleteCategory(categoryId: string) {
    try {
      const response = await fetch('/api/equipment-types', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteCategory',
          categoryId
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la suppression de la catégorie')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error)
      throw error
    }
  },

  // Fonction pour détecter les doublons
  findDuplicates(newItem: any, equipmentTypes: any[]) {
    const duplicates: any[] = []
    const newItemName = newItem.name?.toLowerCase().trim()
    
    if (!newItemName) return duplicates

    equipmentTypes.forEach(category => {
      category.items?.forEach((item: any) => {
        const itemName = item.name?.toLowerCase().trim()
        
        // Vérification de similarité simple
        if (itemName && (
          itemName === newItemName ||
          itemName.includes(newItemName) ||
          newItemName.includes(itemName) ||
          // Vérification de distance de Levenshtein simplifiée
          this.calculateSimilarity(newItemName, itemName) > 0.8
        )) {
          duplicates.push({
            ...item,
            categoryName: category.name,
            categoryId: category.id
          })
        }
      })
    })

    return duplicates
  },

  // Fonction pour calculer la similarité entre deux chaînes
  calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1.0
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  },

  // Distance de Levenshtein pour mesurer la similarité
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  },

  // Fonction pour ajouter un équipement sans catégorie spécifique
  async addEquipmentToUncategorized(newItem: any) {
    try {
      const response = await fetch('/api/equipment-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newItemWithoutCategory: newItem
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'ajout de l\'équipement')
      }

      return await response.json()
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipement:', error)
      throw error
    }
  }
};
