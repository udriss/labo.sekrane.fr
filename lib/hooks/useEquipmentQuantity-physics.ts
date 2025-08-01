// lib/hooks/useEquipmentQuantity-physics.ts

import { useState } from 'react';

export const useEquipmentQuantity = (fetchEquipment: () => Promise<void>) => {
  const [quantityValues, setQuantityValues] = useState<{[key: string]: number}>({});
  const [animatingQuantities, setAnimatingQuantities] = useState<Set<string>>(new Set());
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set());

  // Fonction pour gérer le changement de quantité
  const handleQuantityChange = async (equipmentId: string, newValue: number, materiel: any[]) => {
    const originalItem = materiel.find((item: any) => item.id === equipmentId) as any;
    const isIncrease = newValue > (originalItem?.quantity || 0);
    
    try {
      setUpdatingCards(prev => new Set([...prev, equipmentId]));
      
      const response = await fetch(`/api/physics/equipment/${equipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newValue
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la quantité');
      }

      setQuantityValues(prev => ({
        ...prev,
        [equipmentId]: newValue
      }));

      // Animation pour les augmentations de quantité
      if (isIncrease) {
        setAnimatingQuantities(prev => new Set([...prev, equipmentId]));
        setTimeout(() => {
          setAnimatingQuantities(prev => {
            const newSet = new Set(prev);
            newSet.delete(equipmentId);
            return newSet;
          });
        }, 1000);
      }

      // Recharger les données
      await fetchEquipment();

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error);
      // Remettre l'ancienne valeur en cas d'erreur
      if (originalItem) {
        setQuantityValues(prev => ({
          ...prev,
          [equipmentId]: originalItem.quantity
        }));
      }
    } finally {
      setUpdatingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(equipmentId);
        return newSet;
      });
    }
  };

  return {
    quantityValues,
    setQuantityValues,
    animatingQuantities,
    updatingCards,
    handleQuantityChange
  };
};
