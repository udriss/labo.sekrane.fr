// lib/hooks/useEquipmentDataChimie.ts

import { useState, useEffect } from 'react';
import { EquipmentType } from '@/types/equipment';

export const useEquipmentDataChimie = () => {
  const [materiel, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [customEquipmentTypes, setCustomEquipmentTypes] = useState<EquipmentType[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Charger les types d'équipement depuis l'API
  const loadEquipmentTypes = async () => {
    try {
      const response = await fetch('/api/chimie/equipment-types');
      if (response.ok) {
        const data = await response.json();
        setEquipmentTypes(data.types || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des types d'équipement:", error);
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/chimie/equipement");
      if (!response.ok) throw new Error("Erreur lors du chargement du matériel");
      const data = await response.json();
      setEquipment(data.materiel || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/salles?includeLocations=true");
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des salles:", error);
    }
  };

  useEffect(() => {
    loadEquipmentTypes();
    fetchEquipment();
    fetchRooms();
  }, []);

  // Fonction pour obtenir tous les types d'équipement (standard + personnalisés)
  const getAllEquipmentTypes = () => {
    return [...equipmentTypes, ...customEquipmentTypes];
  };

  const getAllCategories = () => {
    return getAllEquipmentTypes();
  };

  return {
    materiel,
    setEquipment,
    loading,
    error,
    setError,
    equipmentTypes,
    customEquipmentTypes,
    setCustomEquipmentTypes,
    rooms,
    loadEquipmentTypes,
    fetchEquipment,
    fetchRooms,
    getAllEquipmentTypes,
    getAllCategories
  };
};
