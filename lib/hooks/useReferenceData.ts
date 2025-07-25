// hooks/useReferenceData.ts
import { useState, useEffect } from 'react'

export function useReferenceData() {
  const [materials, setMaterials] = useState<any[]>([])
  const [chemicals, setChemicals] = useState<any[]>([])
  const [userClasses, setUserClasses] = useState<string[]>([])
  const [customClasses, setCustomClasses] = useState<string[]>([])

  const loadReferenceData = async () => {
    try {
      const [materialsRes, chemicalsRes, classesRes] = await Promise.all([
        fetch('/api/equipement'),
        fetch('/api/chemicals'),
        fetch('/api/classes')
      ])

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.materiel || [])
      }

      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        setChemicals(chemicalsData.chemicals || [])
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json()
        const allClasses = [
          ...(classesData.predefinedClasses || []),
          ...(classesData.customClasses || [])
        ]
        setUserClasses(allClasses.map((classItem: any) => classItem.name))
      } else {
        setUserClasses([
          '201', '202', '203', '204', '205', '206', 
          '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
        ])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de référence:', error)
      setUserClasses([
        '201', '202', '203', '204', '205', '206', 
        '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
      ])
    }
  }

  const saveNewClass = async (className: string) => {
    try {
      const response = await fetch('/api/configurable-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'classes',
          value: className,
          sortOrder: userClasses.length + customClasses.length + 1
        })
      })

      if (response.ok) {
        setUserClasses(prev => [...prev, className])
        return true
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la nouvelle classe:', error)
    }
    return false
  }

  useEffect(() => {
    loadReferenceData()
  }, [])

  return { 
    materials, 
    chemicals, 
    userClasses, 
    customClasses, 
    setCustomClasses, 
    saveNewClass 
  }
}