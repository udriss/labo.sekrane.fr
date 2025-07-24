// lib/hooks/useSiteConfig.ts
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SiteConfig {
  materialsViewMode: 'cards' | 'list';
  chemicalsViewMode: 'cards' | 'list';
  theme?: 'light' | 'dark';
  language?: 'fr' | 'en';
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
  dashboard?: {
    defaultView?: string;
    widgetsOrder?: string[];
  };
  [key: string]: any;
}

const defaultConfig: SiteConfig = {
  materialsViewMode: 'cards',
  chemicalsViewMode: 'cards',
  theme: 'light',
  language: 'fr',
  notifications: {
    email: true,
    push: false
  }
};

export const useSiteConfig = () => {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger la configuration depuis le serveur
  const fetchConfig = useCallback(async () => {
    // Attendre que la session soit chargée
    if (status === 'loading') return;
    
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/user/config');
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.siteConfig) {
        setConfig({ ...defaultConfig, ...data.siteConfig });
      } else {
        // Si pas de config, utiliser celle du localStorage comme fallback
        const savedConfig = localStorage.getItem('siteConfig');
        if (savedConfig) {
          try {
            const parsedConfig = JSON.parse(savedConfig);
            setConfig({ ...defaultConfig, ...parsedConfig });
            // Sauvegarder sur le serveur pour la première fois
            await saveConfigToServer({ ...defaultConfig, ...parsedConfig });
          } catch (e) {
            console.error('Erreur parsing localStorage:', e);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      console.error('Erreur lors du chargement de la configuration:', err);
      
      // Fallback sur localStorage en cas d'erreur
      const savedConfig = localStorage.getItem('siteConfig');
      if (savedConfig) {
        try {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig({ ...defaultConfig, ...parsedConfig });
        } catch (e) {
          console.error('Erreur parsing localStorage:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, status]);

  // Charger la config au montage et quand l'utilisateur change
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Sauvegarder la configuration sur le serveur
  const saveConfigToServer = async (newConfig: SiteConfig) => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch('/api/user/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteConfig: newConfig
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      // En cas d'erreur, sauvegarder quand même en localStorage
      localStorage.setItem('siteConfig', JSON.stringify(newConfig));
      throw err;
    }
  };

  // Mettre à jour la configuration
  const updateConfig = useCallback(async (updates: Partial<SiteConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // Sauvegarder en localStorage immédiatement (pour réactivité)
    localStorage.setItem('siteConfig', JSON.stringify(newConfig));
    
    // Sauvegarder sur le serveur de manière asynchrone
    try {
      await saveConfigToServer(newConfig);
      setError(null);
    } catch (err) {
      setError('Erreur lors de la sauvegarde. Les modifications sont sauvegardées localement.');
    }
  }, [config, session?.user?.email]);

  // Réinitialiser la configuration
  const resetConfig = useCallback(async () => {
    setConfig(defaultConfig);
    localStorage.setItem('siteConfig', JSON.stringify(defaultConfig));
    
    try {
      await saveConfigToServer(defaultConfig);
      setError(null);
    } catch (err) {
      setError('Erreur lors de la réinitialisation.');
    }
  }, [session?.user?.email]);

  return {
    config,
    updateConfig,
    resetConfig,
    loading: loading || status === 'loading',
    error,
    refetch: fetchConfig
  };
};