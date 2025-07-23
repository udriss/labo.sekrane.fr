import { useState } from 'react';

export const useEquipmentFilters = (materiel: any[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Fonction pour traduire les types
  const getTypeLabel = (type: string) => {
    const typeLabels: {[key: string]: string} = {
      'GLASSWARE': 'Verrerie',
      'MEASURING': 'Mesure',
      'HEATING': 'Chauffage',
      'SAFETY': 'Sécurité',
      'MIXING': 'Mélange',
      'STORAGE': 'Stockage',
      'ELECTRICAL': 'Électrique',
      'OPTICAL': 'Optique',
      'CUSTOM': 'Personnalisé'
    };
    return typeLabels[type] || type;
  };

  // Fonction pour filtrer et trier le matériel
  const getFilteredMateriel = () => {
    let filtered = materiel.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      
      // Filtrage par lieu de stockage (salle ou localisation)
      let matchesLocation = true;
      if (locationFilter !== 'all') {
        const [roomName, locationName] = locationFilter.split('|');
        if (locationName) {
          // Filtrage par localisation spécifique
          matchesLocation = item.room === roomName && item.location === locationName;
        } else {
          // Filtrage par salle
          matchesLocation = item.room === roomName;
        }
      }
      
      return matchesSearch && matchesType && matchesLocation;
    });

    // Trier par catégorie par défaut, puis par nom
    if (sortBy === 'category') {
      const grouped = filtered.reduce((acc: any, item: any) => {
        const type = item.type || 'CUSTOM';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      }, {});
      
      // Retourner un objet groupé pour l'affichage par catégorie
      return grouped;
    } else {
      // Tri normal
      filtered.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'quantity':
            return (b.quantity || 0) - (a.quantity || 0);
          case 'type':
            return getTypeLabel(a.type).localeCompare(getTypeLabel(b.type));
          default:
            return 0;
        }
      });
      return filtered;
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    locationFilter,
    setLocationFilter,
    sortBy,
    setSortBy,
    getTypeLabel,
    getFilteredMateriel
  };
};
