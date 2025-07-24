// lib/hooks/useClasses.ts
import { useState, useEffect } from 'react';

interface ClassData {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  createdAt: string;
  createdBy: string;
}

export const useClasses = () => {
  const [predefinedClasses, setPredefinedClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/classes');
        if (response.ok) {
          const data = await response.json();
          // Extraire uniquement les noms des classes prédéfinies
          const classNames = data.predefinedClasses.map((c: ClassData) => c.name);
          setPredefinedClasses(classNames);
        } else {
          throw new Error('Erreur lors du chargement des classes');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        console.error('Erreur lors du chargement des classes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  return { predefinedClasses, loading, error };
};