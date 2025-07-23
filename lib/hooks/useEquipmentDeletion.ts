'use client'

import { useState } from 'react'
import { equipmentService } from '@/lib/services/equipmentService'

interface DeleteState {
  isOpen: boolean
  type: 'category' | 'item' | null
  categoryId: string | null
  itemName: string | null
  title: string
  relatedItems: string[]
}

interface DuplicateState {
  isOpen: boolean
  newItem: any
  existingItems: any[]
  onConfirmCallback: (() => void) | null
}

export const useEquipmentDeletion = () => {
  const [deleteState, setDeleteState] = useState<DeleteState>({
    isOpen: false,
    type: null,
    categoryId: null,
    itemName: null,
    title: '',
    relatedItems: []
  })
  
  const [duplicateState, setDuplicateState] = useState<DuplicateState>({
    isOpen: false,
    newItem: null,
    existingItems: [],
    onConfirmCallback: null
  })
  
  const [loading, setLoading] = useState(false)

  // Fonctions pour la suppression
  const openCategoryDeletion = (categoryId: string, categoryName: string, relatedItems: string[] = []) => {
    setDeleteState({
      isOpen: true,
      type: 'category',
      categoryId,
      itemName: null,
      title: categoryName,
      relatedItems
    })
  }

  const openItemDeletion = (categoryId: string, itemName: string) => {
    setDeleteState({
      isOpen: true,
      type: 'item',
      categoryId,
      itemName,
      title: itemName,
      relatedItems: []
    })
  }

  const closeDeletionDialog = () => {
    setDeleteState({
      isOpen: false,
      type: null,
      categoryId: null,
      itemName: null,
      title: '',
      relatedItems: []
    })
  }

  const confirmDeletion = async () => {
    if (!deleteState.type || !deleteState.categoryId) return

    setLoading(true)
    try {
      if (deleteState.type === 'category') {
        await equipmentService.deleteCategory(deleteState.categoryId)
      } else if (deleteState.type === 'item' && deleteState.itemName) {
        await equipmentService.deleteCustomEquipment(deleteState.categoryId, deleteState.itemName)
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
    const duplicates = equipmentService.findDuplicates(newItem, equipmentTypes)
    
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

export default useEquipmentDeletion
