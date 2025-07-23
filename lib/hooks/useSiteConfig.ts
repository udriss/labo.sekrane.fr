import { useState, useEffect } from 'react';

interface SiteConfig {
  materialsViewMode: 'cards' | 'list';
  chemicalsViewMode: 'cards' | 'list';
}

const defaultConfig: SiteConfig = {
  materialsViewMode: 'cards',
  chemicalsViewMode: 'cards'
};

export const useSiteConfig = () => {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);

  useEffect(() => {
    // Charger la configuration depuis localStorage
    const savedConfig = localStorage.getItem('siteConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsedConfig });
      } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
      }
    }
  }, []);

  const updateConfig = (updates: Partial<SiteConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
  };

  return {
    config,
    updateConfig
  };
};
