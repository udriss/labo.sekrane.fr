// hooks/useReferenceData.ts
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface UseReferenceDataOptions {
  discipline?: 'chimie' | 'physique'
}

export function useReferenceData(options?: UseReferenceDataOptions) {
  const { data: session } = useSession()
  const [materials, setMaterials] = useState<any[]>([])
  const [chemicals, setChemicals] = useState<any[]>([])
  const [userClasses, setUserClasses] = useState<any[]>([])
  const [customClasses, setCustomClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadReferenceData = async () => {
    try {
      setLoading(true)
      
      const discipline = options?.discipline || 'chimie'
      const requests = [
        fetch(`/api/${discipline}/equipement`),
        fetch(`/api/${discipline}/chemicals`),
        fetch('/api/classes')
      ]

      const responses = await Promise.all(requests)
      const [materialsRes, chemicalsRes, classesRes] = responses

      // Gestion des équipements
      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.materiel || [])
      } else {
        console.error('Erreur lors du chargement des équipements')
        setMaterials([])
      }

      // Gestion des réactifs chimiques
      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        setChemicals(chemicalsData.chemicals || [])
      } else {
        console.error('Erreur lors du chargement des réactifs chimiques')
        setChemicals([])
      }

      // Gestion des classes - une seule API
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        const allClasses = classesData.classes || []
        
        // Séparer les classes prédéfinies et custom
        const predefinedClasses = allClasses.filter((c: any) => c.type === 'predefined')
        const allCustomClasses = allClasses.filter((c: any) => c.type === 'custom')
        
        // Classes custom qui appartiennent à l'utilisateur
        let userCustomClasses: any[] = []
        if (session?.user?.id) {
          userCustomClasses = allCustomClasses.filter((c: any) => 
            c.user_id === session.user.id || c.user_email === session.user.email
          )
        }
        
          // Convertir en objets { id, name } pour compatibilité avec les composants
          const predefinedClassObjs = predefinedClasses.map((c: any) => ({ id: c.id, name: c.name }))
          const userCustomClassObjs = userCustomClasses.map((c: any) => ({ id: c.id, name: c.name }))
        
        // Combiner toutes les classes disponibles pour l'utilisateur
          setUserClasses([...predefinedClassObjs, ...userCustomClassObjs])
          setCustomClasses(userCustomClassObjs)
      } else {
        console.error('Erreur lors du chargement des classes')
        setUserClasses([])
        setCustomClasses([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de référence:', error)
      
      setMaterials([])
      setChemicals([])
      // Classes système prédéfinies par défaut - format objet pour compatibilité
      setUserClasses([
        { id: 'c201', name: '201' },
        { id: 'c202', name: '202' },
        { id: 'c203', name: '203' },
        { id: 'c204', name: '204' },
        { id: 'c205', name: '205' },
        { id: 'c206', name: '206' },
        { id: 'c1es', name: '1ère ES' },
        { id: 'ctes', name: 'Terminale ES' },
        { id: 'c1sti2d', name: '1ère STI2D' },
        { id: 'ctsti2d', name: 'Terminale STI2D' },
        { id: 'cprepa1', name: 'Prépa 1ère année' },
        { id: 'cprepa2', name: 'Prépa 2e année' },
      ])
      setCustomClasses([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sauvegarde une nouvelle classe
   * @param classObj - L'objet classe avec au minimum { name: string } ou className string pour compatibilité
   * @param type - Le type de classe ('predefined' | 'custom' | 'auto')
   * @returns Object avec success et éventuellement error
   */
  const saveNewClass = async (
    classObj: string | (Partial<any> & { name: string }),
    type: 'predefined' | 'custom' | 'auto' = 'auto'
  ): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      // Support pour les deux formats : string ou objet
      const className = typeof classObj === 'string' ? classObj : classObj.name
      
      // Validation du nom de classe
      if (!className || !className.trim()) {
        return { 
          success: false, 
          error: 'Le nom de la classe ne peut pas être vide' 
        }
      }

      // Vérifier si la classe existe déjà localement (par nom)
      if (userClasses.some(c => c === className.trim())) {
        return { 
          success: false, 
          error: 'Cette classe existe déjà' 
        }
      }

      // Vérifier les permissions pour les classes prédéfinies
      if (type === 'predefined' && session?.user?.role !== 'ADMIN') {
        return { 
          success: false, 
          error: 'Seuls les administrateurs peuvent ajouter des classes prédéfinies' 
        }
      }

      // Utiliser toujours l'API /api/classes qui gère maintenant les deux types
      const apiEndpoint = '/api/classes'

      // Appel API pour créer la classe
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: className.trim(),
          type: type,
          ...(typeof classObj === 'object' ? classObj : {})
        })
      })

      if (response.ok) {
        const result = await response.json()
        const newClass = result.data
        
        // Mettre à jour la liste locale avec le nom de la classe
        setUserClasses(prev => [...prev, newClass.name])
        
        // Si c'est une classe custom, l'ajouter aussi à customClasses
        if (type === 'custom') {
          setCustomClasses(prev => [...prev, newClass.name])
        }
        
        return { 
          success: true, 
          data: newClass 
        }
      } else {
        // Gérer les erreurs spécifiques de l'API
        const errorData = await response.json().catch(() => null)
        
        if (response.status === 401) {
          return { 
            success: false, 
            error: 'Non autorisé - authentification requise' 
          }
        } else if (response.status === 409) {
          return { 
            success: false, 
            error: 'Cette classe existe déjà' 
          }
        } else {
          return { 
            success: false, 
            error: errorData?.error || 'Erreur lors de la création de la classe' 
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la nouvelle classe:', error)
      return { 
        success: false, 
        error: 'Erreur réseau lors de la création de la classe' 
      }
    }
  }

  /**
   * Supprimer une classe personnalisée (uniquement pour les utilisateurs non-admin)
   * @param className - Le nom de la classe à supprimer
   * @returns Object avec success et éventuellement error
   */
  const deleteCustomClass = async (
    className: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // Vérifier que c'est bien une classe personnalisée
      if (!customClasses.some(c => c === className)) {
        return { 
          success: false, 
          error: 'Cette classe n\'est pas une classe personnalisée' 
        }
      }

      // Les admins ne peuvent pas utiliser cette méthode
      if (session?.user?.role === 'ADMIN') {
        return { 
          success: false, 
          error: 'Les administrateurs doivent utiliser l\'interface d\'administration' 
        }
      }

      // Utiliser l'API /api/classes pour supprimer une classe personnalisée par nom
      const response = await fetch(`/api/classes?name=${encodeURIComponent(className)}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Mettre à jour les listes locales
        setUserClasses(prev => prev.filter(c => c !== className))
        setCustomClasses(prev => prev.filter(c => c !== className))
        
        return { success: true }
      } else {
        const errorData = await response.json().catch(() => null)
        return { 
          success: false, 
          error: errorData?.error || 'Erreur lors de la suppression de la classe' 
        }
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la classe:', error)
      return { 
        success: false, 
        error: 'Erreur réseau lors de la suppression' 
      }
    }
  }

  // Fonction pour rafraîchir les données
  const refreshData = () => {
    loadReferenceData()
  }

  useEffect(() => {
    // Ne charger les données que si la session est disponible
    if (session !== undefined) {
      loadReferenceData()
    }
  }, [session])

  return { 
    materials, 
    chemicals, 
    userClasses, 
    customClasses, 
    setCustomClasses, 
    saveNewClass,
    deleteCustomClass,
    refreshData,
    loading
  }
}

// Alias pour la compatibilité
export const useReferenceDataByDiscipline = useReferenceData