// lib/services/equipmentServicePhysique.ts

export const equipmentServicePhysique = {
  

  async submitEquipment(formData: any, selectedCategory: string, selectedItem: any, getAllEquipmentTypes: () => any[]) {
    // Vérifier si c'est un équipement personnalisé sans ID
    const isNewCustomEquipment = selectedItem?.isCustom && !selectedItem?.id;
    
    if (isNewCustomEquipment) {
      const selectedType = getAllEquipmentTypes().find((t: any) => t.id === selectedCategory);
      if (!selectedType) {
        throw new Error("Catégorie non trouvée");
      }

      // Générer un ID unique pour le nouvel équipement
      const newItemId = `EQ_CUSTOM_${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Créer le nouvel item avec l'ID généré
      const newItem = {
        id: newItemId,
        name: formData.name || selectedItem.name, // Utiliser le nom du formulaire
        svg: selectedItem.svg || '/svg/default.svg',
        volumes: formData.volume ? [formData.volume] : (selectedItem.volumes || []),
        isCustom: true,
        equipmentTypeId: selectedCategory, // ID de la catégorie sélectionnée
      };

      // Appel API pour créer le type d'équipement physique
      const typeResponse = await fetch('/api/physique/equipment-types', {
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

      const response = await fetch("/api/physique/equipement", {
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
      equipmentTypeId: selectedCategory,
      equipmentItemId: formData.equipmentItemId || 'ITEM_ID_INTROUVABLE',
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

    const response = await fetch("/api/physique/equipement", {
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

  async deleteCategory(categoryId: string) {
    const response = await fetch(`/api/physique/equipment-types/${categoryId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression de la catégorie");
    }
    
    return await response.json();
  },

  async deleteCustomEquipment(categoryId: string, itemName: string) {
    const response = await fetch(`/api/physique/equipment-types/${categoryId}/items/${encodeURIComponent(itemName)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression de l'équipement");
    }
    
    return await response.json();
  },

  findDuplicates(newItem: any, equipmentTypes: any[]): any[] {
    const duplicates: any[] = [];
    
    equipmentTypes.forEach(type => {
      if (type.items) {
        type.items.forEach((item: any) => {
          // Vérifier les doublons par nom (case insensitive)
          if (item.name.toLowerCase() === newItem.name.toLowerCase()) {
            duplicates.push({
              ...item,
              categoryName: type.name,
              categoryId: type.id
            });
          }
        });
      }
    });
    
    return duplicates;
  }
};
