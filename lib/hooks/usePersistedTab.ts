// /lib/hooks/usePersistedTab.ts
import { useState, useEffect } from 'react';

interface UsePersistedTabOptions {
  key: string;
  defaultValue: number;
  validValues?: number[];
}

export const usePersistedTab = ({ key, defaultValue, validValues }: UsePersistedTabOptions) => {
  // Fonction helper pour gérer localStorage de manière sûre
  const getStoredTabValue = (): number => {
    try {
      if (typeof window !== 'undefined') {
        const savedTab = localStorage.getItem(key);
        if (savedTab !== null) {
          const parsedValue = parseInt(savedTab, 10);
          if (!isNaN(parsedValue)) {
            // Si des valeurs valides sont spécifiées, vérifier
            if (!validValues || validValues.includes(parsedValue)) {
              return parsedValue;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la lecture du localStorage pour ${key}:`, error);
    }
    return defaultValue;
  };

  const [tabValue, setTabValue] = useState(getStoredTabValue);

  // Sauvegarder dans localStorage
  const saveTabValue = (value: number): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value.toString());
      }
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde dans localStorage pour ${key}:`, error);
    }
  };

  // Handler pour changer de tab
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    saveTabValue(newValue);
  };

  // Synchroniser avec localStorage au montage
  useEffect(() => {
    const storedValue = getStoredTabValue();
    if (storedValue !== tabValue) {
      setTabValue(storedValue);
    }
  }, []);

  return {
    tabValue,
    handleTabChange,
    setTabValue: (value: number) => {
      setTabValue(value);
      saveTabValue(value);
    }
  };
};