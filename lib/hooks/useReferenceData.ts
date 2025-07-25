// hooks/useReferenceData.ts
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function useReferenceData() {
  const { data: session } = useSession()
  const [materials, setMaterials] = useState<any[]>([])
  const [chemicals, setChemicals] = useState<any[]>([])
  const [userClasses, setUserClasses] = useState<string[]>([])
  const [customClasses, setCustomClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const loadReferenceData = async () => {
    try {
      setLoading(true)
      
      const requests = [
        fetch('/api/equipement'),
        fetch('/api/chemicals'),
        fetch('/api/classes')
      ]

      // Si l'utilisateur n'est pas admin, charger aussi ses classes personnalisées
      if (session?.user && session.user.role !== 'ADMIN') {
        requests.push(fetch('/api/user/classes'))
      }

      const responses = await Promise.all(requests)
      const [materialsRes, chemicalsRes, classesRes, userClassesRes] = responses

      // Gestion des équipements
      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.materiel || [])
      } else {
        console.error('Erreur lors du chargement des équipements')
        setMaterials([])
      }

      // Gestion des produits chimiques
      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        setChemicals(chemicalsData.chemicals || [])
      } else {
        console.error('Erreur lors du chargement des produits chimiques')
        setChemicals([])
      }

      // Gestion des classes
      if (classesRes.ok) {
        const classesData = await classesRes.json()
        
        const predefinedClassNames = (classesData.predefinedClasses || [])
          .map((classItem: any) => classItem.name)
        
        let customClassNames: string[] = []
        
        if (session?.user?.role === 'ADMIN') {
          // Pour les admins, prendre les classes custom depuis l'API classes
          customClassNames = (classesData.customClasses || [])
            .map((classItem: any) => classItem.name)
        } else if (userClassesRes && userClassesRes.ok) {
          // Pour les utilisateurs non-admin, prendre leurs propres classes custom
          const userClassesData = await userClassesRes.json()
          customClassNames = (userClassesData.customClasses || [])
            .map((classItem: any) => classItem.name)
        }
        
        setUserClasses([...predefinedClassNames, ...customClassNames])
        setCustomClasses(customClassNames)
      } else {
        console.error('Erreur lors du chargement des classes')
        const defaultClasses = [
          '201', '202', '203', '204', '205', '206', 
          '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
        ]
        setUserClasses(defaultClasses)
        setCustomClasses([])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de référence:', error)
      
      setMaterials([])
      setChemicals([])
      setUserClasses([
        '201', '202', '203', '204', '205', '206', 
        '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
      ])
      setCustomClasses([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sauvegarde une nouvelle classe
   * @param className - Le nom de la classe à créer
   * @param type - Le type de classe ('predefined' | 'custom' | 'auto')
   * @returns Object avec success et éventuellement error
   */
  const saveNewClass = async (
    className: string, 
    type: 'predefined' | 'custom' | 'auto' = 'auto'
  ): Promise<{ success: boolean; error?: string; data?: any }> => {
    try {
      // Validation du nom de classe
      if (!className || !className.trim()) {
        return { 
          success: false, 
          error: 'Le nom de la classe ne peut pas être vide' 
        }
      }

      // Vérifier si la classe existe déjà localement
      if (userClasses.includes(className.trim())) {
        return { 
          success: false, 
          error: 'Cette classe existe déjà' 
        }
      }

      // Déterminer automatiquement le type si nécessaire
      let classType: 'predefined' | 'custom' = 'custom'
      
      if (type === 'auto') {
        classType = session?.user?.role === 'ADMIN' ? 'predefined' : 'custom'
      } else {
        classType = type
      }

      // Vérifier les permissions pour les classes prédéfinies
      if (classType === 'predefined' && session?.user?.role !== 'ADMIN') {
        return { 
          success: false, 
          error: 'Seuls les administrateurs peuvent créer des classes prédéfinies' 
        }
      }

      // Déterminer l'API à utiliser
            // Déterminer l'API à utiliser
      const apiEndpoint = classType === 'predefined' || session?.user?.role === 'ADMIN' 
        ? '/api/classes' 
        : '/api/user/classes'

      // Appel API pour créer la classe
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: className.trim(),
          type: classType
        })
      })

      if (response.ok) {
        const newClass = await response.json()
        
        // Mettre à jour la liste locale
        setUserClasses(prev => [...prev, newClass.name])
        
        // Si c'est une classe custom, l'ajouter aussi à customClasses
        if (classType === 'custom') {
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
      if (!customClasses.includes(className)) {
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

      const response = await fetch(`/api/user/classes?name=${encodeURIComponent(className)}`, {
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