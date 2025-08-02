// lib/hooks/useEquipmentDeletionPhysique.ts

'use client'

import { useState } from 'react'
import { equipmentServicePhysique } from '@/lib/services/equipmentServicePhysique'

interface DeleteState {
  isOpen: boolean
  type: 'category' | 'item' | null
  categoryId: string | null
  itemName: string | null
  title: string
  relatedItems: string[]
  inventoryUsage?: number
  onConfirm?: (deleteItems?: boolean) => void
}

interface DuplicateState {
  isOpen: boolean
  newItem: any
  existingItems: any[]
  onConfirmCallback: (() => void) | null
}

export const useEquipmentDeletionPhysique = () => {
  const [deleteState, setDeleteState] = useState<DeleteState>({
    isOpen: false,
    type: null,
    categoryId: null,
    itemName: null,
    title: '',
    relatedItems: [],
    inventoryUsage: 0,
    onConfirm: undefined
  })

  const [duplicateState, setDuplicateState] = useState<DuplicateState>({
    isOpen: false,
    newItem: null,
    existingItems: [],
    onConfirmCallback: null
  })
  
  const [loading, setLoading] = useState(false)

  // Nouvelle fonction openDeletionDialog générique
  const openDeletionDialog = (params: {
    type: 'category' | 'item'
    id: string
    title: string
    relatedItems?: string[]
    inventoryUsage?: number
    onConfirm: (deleteItems?: boolean) => void
  }) => {
    setDeleteState({
      isOpen: true,
      type: params.type,
      categoryId: params.type === 'category' ? params.id : null,
      itemName: params.type === 'item' ? params.title : null,
      title: params.title,
      relatedItems: params.relatedItems || [],
      inventoryUsage: params.inventoryUsage || 0,
      onConfirm: params.onConfirm
    })
  }

  // Fonctions pour la suppression (conserver pour la compatibilité)
  const openCategoryDeletion = (categoryId: string, categoryName: string, relatedItems: string[] = []) => {
    setDeleteState({
      isOpen: true,
      type: 'category',
      categoryId,
      itemName: null,
      title: categoryName,
      relatedItems,
      inventoryUsage: 0,
      onConfirm: undefined
    })
  }

  const openItemDeletion = (categoryId: string, itemName: string) => {
    setDeleteState({
      isOpen: true,
      type: 'item',
      categoryId,
      itemName,
      title: itemName,
      relatedItems: [],
      inventoryUsage: 0,
      onConfirm: undefined
    })
  }

  const closeDeletionDialog = () => {
    setDeleteState({
      isOpen: false,
      type: null,
      categoryId: null,
      itemName: null,
      title: '',
      relatedItems: [],
      inventoryUsage: 0,
      onConfirm: undefined
    })
  }

  // Modifier confirmDeletion pour accepter le paramètre deleteItems
  const confirmDeletion = async (deleteItems?: boolean) => {
    // Si on a une fonction onConfirm personnalisée, l'utiliser
    if (deleteState.onConfirm) {
      setLoading(true)
      try {
        await deleteState.onConfirm(deleteItems)
        closeDeletionDialog()
        return true
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
        return false
      } finally {
        setLoading(false)
      }
    }
    
    // Sinon, utiliser l'ancienne logique
    if (!deleteState.type || !deleteState.categoryId) return false

    setLoading(true)
    try {
      if (deleteState.type === 'category') {
        await equipmentServicePhysique.deleteCategory(deleteState.categoryId)
      } else if (deleteState.type === 'item' && deleteState.itemName) {
        await equipmentServicePhysique.deleteCustomEquipment(deleteState.categoryId, deleteState.itemName)
      }
      closeDeletionDialog()
      return true
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Fonctions pour la détection de doublons
  const checkForDuplicates = async (newItem: any, equipmentTypes: any[]): Promise<boolean> => {
    const duplicates = equipmentServicePhysique.findDuplicates(newItem, equipmentTypes)
    
    if (duplicates.length > 0) {
      setDuplicateState({
        isOpen: true,
        newItem,
        existingItems: duplicates,
        onConfirmCallback: null
      })
      return true
    }
    return false
  }

  const openDuplicateDialog = (newItem: any, existingItems: any[], onConfirm: () => void) => {
    setDuplicateState({
      isOpen: true,
      newItem,
      existingItems,
      onConfirmCallback: onConfirm
    })
  }

  const closeDuplicateDialog = () => {
    setDuplicateState({
      isOpen: false,
      newItem: null,
      existingItems: [],
      onConfirmCallback: null
    })
  }

  const handleMergeDuplicate = async () => {
    // Pour l'instant, on fait juste comme "ajouter quand même"
    // Dans une version plus avancée, on pourrait implémenter une vraie fusion
    if (duplicateState.onConfirmCallback) {
      duplicateState.onConfirmCallback()
    }
    closeDuplicateDialog()
  }

  const handleAddAnyway = () => {
    if (duplicateState.onConfirmCallback) {
      duplicateState.onConfirmCallback()
    }
    closeDuplicateDialog()
  }

  return {
    // État de suppression
    deleteState,
    loading,
    openDeletionDialog,
    openCategoryDeletion,
    openItemDeletion,
    closeDeletionDialog,
    confirmDeletion,
    
    // État de doublons
    duplicateState,
    checkForDuplicates,
    openDuplicateDialog,
    closeDuplicateDialog,
    handleMergeDuplicate,
    handleAddAnyway
  }
}

export default useEquipmentDeletionPhysique
