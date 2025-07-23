"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Button, Stack, Alert, CircularProgress,
  TextField, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, Fab, Tab, Tabs,
  Card, CardContent, Chip, Slider, Tooltip, IconButton, Paper, Stepper,
  Step, StepLabel, Grid, Avatar, CardMedia, Divider
} from "@mui/material"
import { 
  Add, Inventory, Settings, Edit, Delete, Check, Science, Category, Numbers,
  Search, Warning, Save, Assignment, LocationOn, CheckCircle
} from "@mui/icons-material"

// Import des composants refactorisés
import { TabPanel } from "@/components/equipment/tab-panel"
import { EquipmentAddTab } from "@/components/equipment/equipment-add-tab"
import { EquipmentInventoryTab } from "@/components/equipment/equipment-inventory-tab"
import { EquipmentManagementTab } from "@/components/equipment/equipment-management-tab"

// Import des types
import { EquipmentType, EquipmentItem, EquipmentFormData, Room, RoomLocation } from "@/types/equipment"

export default function EquipmentPage() {
  const [tabValue, setTabValue] = useState(0)
  const [materiel, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // États pour les types d'équipement dynamiques
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [customEquipmentTypes, setCustomEquipmentTypes] = useState<EquipmentType[]>([])
  
  // États pour les filtres et recherche
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [quantityValues, setQuantityValues] = useState<{[key: string]: number}>({})
  const [animatingQuantities, setAnimatingQuantities] = useState<Set<string>>(new Set())
  const [updatingCards, setUpdatingCards] = useState<Set<string>>(new Set())
  const [rooms, setRooms] = useState<any[]>([])

  // État pour le stepper d'ajout
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState<EquipmentFormData>({
    name: '',
    equipmentTypeId: '',
    quantity: 1,
    volume: '',
  })
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [editingEquipment, setEditingEquipment] = useState<any>(null)
  const [openEditDialog, setOpenEditDialog] = useState(false)
  
  // États pour le dialogue de continuation
  const [continueDialog, setContinueDialog] = useState(false)
  const [newlyCreatedItem, setNewlyCreatedItem] = useState<any>(null)
  
  // États pour la gestion des catégories personnalisées
  const [customCategories, setCustomCategories] = useState<any[]>([])
  const [newCategoryDialog, setNewCategoryDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  // États pour la suppression avec animation
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [equipmentToDelete, setEquipmentToDelete] = useState<any>(null)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  // États pour l'ajout d'équipement personnalisé aux catégories
  const [addCustomEquipmentDialog, setAddCustomEquipmentDialog] = useState(false)
  const [customEquipmentData, setCustomEquipmentData] = useState({
    name: '',
    category: '',
    volumes: [] as string[],
    newVolume: ''
  })

  // États pour la gestion des types d'équipement (onglet 3)
  const [selectedManagementCategory, setSelectedManagementCategory] = useState<string>('')
  const [selectedManagementItem, setSelectedManagementItem] = useState<any>(null)
  const [editItemDialog, setEditItemDialog] = useState(false)
  const [editingItemData, setEditingItemData] = useState({
    name: '',
    volumes: [] as string[],
    newVolume: '',
    targetCategory: ''
  })

  // Charger les types d'équipement depuis l'API
  const loadEquipmentTypes = async () => {
    try {
      const response = await fetch('/api/equipment-types')
      if (response.ok) {
        const data = await response.json()
        setEquipmentTypes(data.types || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des types d'équipement:", error)
    }
  }

  const fetchEquipment = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/equipement")
      if (!response.ok) throw new Error("Erreur lors du chargement du matériel")
      const data = await response.json()
      setEquipment(data.materiel || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/salles?includeLocations=true")
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des salles:", error)
    }
  }

  useEffect(() => {
    loadEquipmentTypes()
    fetchEquipment()
    fetchRooms()
  }, [])

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
    }
    return typeLabels[type] || type
  }

  // Fonction pour filtrer et trier le matériel
  const getFilteredMateriel = () => {
    let filtered = materiel.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.location?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      
      // Filtrage par lieu de stockage (salle ou localisation)
      let matchesLocation = true
      if (locationFilter !== 'all') {
        const [roomName, locationName] = locationFilter.split('|')
        if (locationName) {
          // Filtrage par localisation spécifique
          matchesLocation = item.room === roomName && item.location === locationName
        } else {
          // Filtrage par salle
          matchesLocation = item.room === roomName
        }
      }
      
      return matchesSearch && matchesType && matchesLocation
    })

    // Trier par catégorie par défaut, puis par nom
    if (sortBy === 'category') {
      const grouped = filtered.reduce((acc: any, item: any) => {
        const type = item.type || 'CUSTOM'
        if (!acc[type]) acc[type] = []
        acc[type].push(item)
        return acc
      }, {})
      
      // Retourner un objet groupé pour l'affichage par catégorie
      return grouped
    } else {
      // Tri normal
      filtered.sort((a: any, b: any) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name)
          case 'quantity':
            return (b.quantity || 0) - (a.quantity || 0)
          case 'type':
            return getTypeLabel(a.type).localeCompare(getTypeLabel(b.type))
          default:
            return 0
        }
      })
      return filtered
    }
  }

  // Fonction pour gérer le changement de quantité
  const handleQuantityChange = async (equipmentId: string, newValue: number) => {
    const originalItem = materiel.find((item: any) => item.id === equipmentId) as any
    const isIncrease = newValue > (originalItem?.quantity || 0)
    
    try {
      setUpdatingCards(prev => new Set([...prev, equipmentId]))
      
      const response = await fetch(`/api/equipement/${equipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: newValue
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la quantité')
      }

      // Mettre à jour seulement l'élément concerné
      setEquipment((prev: any) => prev.map((item: any) => 
        item.id === equipmentId 
          ? { ...item, quantity: newValue }
          : item
      ))
      
      setQuantityValues(prev => ({
        ...prev,
        [equipmentId]: newValue
      }))

      // Animation pour les augmentations de quantité
      if (isIncrease) {
        setAnimatingQuantities(prev => new Set([...prev, equipmentId]))
        setTimeout(() => {
          setAnimatingQuantities(prev => {
            const newSet = new Set(prev)
            newSet.delete(equipmentId)
            return newSet
          })
        }, 1000)
      }

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error)
      // Remettre l'ancienne valeur en cas d'erreur
      if (originalItem) {
        setQuantityValues(prev => ({
          ...prev,
          [equipmentId]: originalItem.quantity
        }))
      }
    } finally {
      setUpdatingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(equipmentId)
        return newSet
      })
    }
  }

  // Fonction pour obtenir tous les types d'équipement (standard + personnalisés)
  const getAllEquipmentTypes = () => {
    return [...equipmentTypes, ...customEquipmentTypes]
  }

  // Fonction pour rendre une carte d'équipement avec slider
  const renderEquipmentCard = (item: any) => {
    const currentQuantity = quantityValues[item.id] ?? item.quantity
    const maxQuantity = Math.max(currentQuantity * 2, 10)
    const isUpdating = updatingCards.has(item.id)
    const isDeleting = deletingItems.has(item.id)
    const isCustomItem = item.isCustom || !getAllEquipmentTypes().some((type: EquipmentType) => 
      type.items.some((preset: EquipmentItem) => preset.name === item.name)
    )

    // Affichage du nom concaténé avec le volume si présent
    const displayName = item.volume ? `${item.name} ${item.volume}` : item.name
    return (
      <Card sx={{ 
        height: '100%', 
        position: 'relative',
        opacity: isUpdating || isDeleting ? 0.5 : 1,
        transform: isDeleting ? 'scale(0.9)' : 'scale(1)',
        transition: 'all 0.5s ease-in-out',
        border: isDeleting ? '2px solid' : '1px solid',
        borderColor: isDeleting ? 'error.main' : 'divider'
      }}>
        {/* Overlay avec spinner pendant la mise à jour ou suppression */}
        {(isUpdating || isDeleting) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: 1
            }}
          >
            <CircularProgress size={24} color={isDeleting ? "error" : "primary"} />
          </Box>
        )}

        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6">{displayName}</Typography>
            {isCustomItem && (
              <Chip 
                label={`👤 ${item.createdBy || 'Personnalisé'}`}
                size="small" 
                color="secondary" 
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
          <Typography color="text.secondary">
            Type: {getTypeLabel(item.type)}
          </Typography>

          {/* Slider de quantité */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              gutterBottom
              sx={{
                fontWeight: animatingQuantities.has(item.id) ? 'bold' : 'normal',
                fontSize: animatingQuantities.has(item.id) ? '1.1rem' : '0.875rem',
                color: animatingQuantities.has(item.id) ? 'success.main' : 'text.secondary',
                transition: 'all 0.3s ease-in-out',
                transform: animatingQuantities.has(item.id) ? 'scale(1.1)' : 'scale(1)'
              }}
            >
              Quantité: {currentQuantity}
            </Typography>
            <Slider
              value={currentQuantity}
              onChange={(_, newValue) => {
                const value = newValue as number
                setQuantityValues(prev => ({
                  ...prev,
                  [item.id]: value
                }))
              }}
              onChangeCommitted={(_, newValue) => {
                const value = newValue as number
                if (value !== item.quantity) {
                  handleQuantityChange(item.id, value)
                }
              }}
              min={0}
              max={maxQuantity}
              step={1}
              size="small"
              valueLabelDisplay="auto"
              sx={{
                color: currentQuantity === 0 ? 'error.main' : 'primary.main'
              }}
            />
          </Box>

          {item.location && (
            <Typography color="text.secondary">
              📍 {item.location}
            </Typography>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Chip 
              label={item.status || 'Disponible'} 
              color="success" 
              size="small"
            />
            <Box>
              <Tooltip title="Modifier">
                <IconButton
                  size="small"
                  onClick={() => handleEditEquipment(item)}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Supprimer">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteEquipment(item)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    )
  }

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleReset = () => {
    setActiveStep(0)
    setFormData({
      name: '',
      equipmentTypeId: '',
      quantity: 1,
      volume: '',
    })
    setSelectedCategory('')
    setSelectedItem(null)
  }

  const handleEditEquipment = (equipment: any) => {
    setEditingEquipment(equipment)
    setOpenEditDialog(true)
  }

  // Fonction pour obtenir les volumes disponibles pour un équipement
  const getAvailableVolumes = (equipmentName: string): string[] => {
    for (const equipmentTypeId of getAllEquipmentTypes()) {
      const item = equipmentTypeId.items.find((item: EquipmentItem) => item.name === equipmentName)
      if (item) {
        return item.volumes || []
      }
    }
    return []
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/equipement/${editingEquipment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingEquipment)
      })
      
      if (!response.ok) throw new Error("Erreur lors de la modification")
      
      await fetchEquipment()
      setOpenEditDialog(false)
      setEditingEquipment(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la modification")
    }
  }

  const handleDeleteEquipment = (equipment: any) => {
    setEquipmentToDelete(equipment)
    setDeleteDialog(true)
  }

  const confirmDeleteEquipment = async () => {
    if (!equipmentToDelete || !equipmentToDelete.id) {
      setError("Impossible de supprimer l'équipement : ID manquant.");
      setDeleteDialog(false);
      setEquipmentToDelete(null);
      return;
    }

    try {
      setDeletingItems(prev => new Set([...prev, equipmentToDelete.id]));
      setDeleteDialog(false);

      const response = await fetch(`/api/equipement/${equipmentToDelete.id}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erreur de suppression:", errorData);
        throw new Error(errorData.message || "Erreur lors de la suppression");
      }
      
      setTimeout(async () => {
        await fetchEquipment();
        setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(equipmentToDelete.id);
          return newSet;
        });
        setEquipmentToDelete(null);
      }, 500);

    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de la suppression");
      setDeletingItems(prev => {
        const newSet = new Set(prev);
        if (equipmentToDelete) {
          newSet.delete(equipmentToDelete.id);
        }
        return newSet;
      });
      setEquipmentToDelete(null);
    }
  };

  // Gestion des catégories personnalisées
  const handleCreateCustomCategory = () => {
    if (newCategoryName.trim()) {
      const newCategory = {
        id: 'CUSTOM_' + Date.now(),
        name: newCategoryName.trim(),
        svg: '/svg/default.svg',
        items: []
      }
      setCustomCategories(prev => [...prev, newCategory])
      setNewCategoryName('')
      setNewCategoryDialog(false)
    }
  }

  const getAllCategories = () => {
    return getAllEquipmentTypes()
  }

  // Correction du FAB - ouvre directement le formulaire d'ajout
  const handleQuickAdd = () => {
    setTabValue(0)  // Va à l'onglet ajout
    setActiveStep(0)  // Remet à la première étape
    setSelectedCategory('')  // Reset la sélection
    setSelectedItem(null)
    setFormData({
      name: '',
      equipmentTypeId: '',
      quantity: 1,
      volume: '',
    })
  }

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setFormData(prev => ({ ...prev, equipmentTypeId: categoryId }))
    handleNext()
  }

  const handleItemSelect = (item: any) => {
    setSelectedItem(item)
    setFormData(prev => ({ 
      ...prev, 
      name: item.name,
      volume: item.volumes && item.volumes.length > 0 ? item.volumes[0] : '',
      equipmentTypeId: item.id
    }))
    handleNext()
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      // Construire le nom final avec le volume si applicable
      // Le nom doit être uniquement le nom de l'item (issu de equipment-types.json)
      const dataToSubmit = {
        name: formData.name, // juste le nom de l'item
        equipmentTypeId: formData.equipmentTypeId,
        quantity: formData.quantity,
        volume: formData.volume,
        isCustom: selectedCategory.startsWith('CUSTOM')
      }

      console.log("Données à soumettre:", dataToSubmit)

      const response = await fetch("/api/equipement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit)
      })
      
      if (!response.ok) throw new Error("Erreur lors de l'ajout")
      
      const newEquipment = await response.json()
      
      // Si c'est un équipement personnalisé, l'ajouter aux types d'équipement
      if (selectedItem?.name === 'Équipement personnalisé') {
        const selectedType = getAllEquipmentTypes().find((t: EquipmentType) => t.id === selectedCategory)
        if (selectedType) {
          const newItem = {
            name: formData.name,
            svg: '/svg/default.svg',
            volumes: formData.volume ? [formData.volume] : []
          }

          // Sauvegarder dans l'API des types d'équipement
          try {
            await fetch('/api/equipment-types', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: selectedType,
                item: newItem
              })
            })
            
            // Recharger les types d'équipement localement
            await loadEquipmentTypes()
          } catch (error) {
            console.error('Erreur lors de la sauvegarde du type d\'équipement:', error)
          }
        }
        
        setNewlyCreatedItem(newEquipment)
        setContinueDialog(true)
      } else {
        handleReset()
        setTabValue(1) // Basculer vers l'onglet inventaire
      }
      
      await fetchEquipment()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'ajout")
    }
  }




  // Fonction pour terminer sans continuer
  const handleFinishWithoutContinue = () => {
    setContinueDialog(false)
    setNewlyCreatedItem(null)
    handleReset()
    setTabValue(1) // Basculer vers l'onglet inventaire
  }

  // Fonctions pour gérer l'ajout d'équipement personnalisé aux catégories
  const handleAddVolumeToCustomEquipment = () => {
    if (customEquipmentData.newVolume.trim()) {
      setCustomEquipmentData(prev => ({
        ...prev,
        volumes: [...prev.volumes, prev.newVolume.trim()],
        newVolume: ''
      }));
    }
  };

  const handleRemoveVolumeFromCustomEquipment = (volumeToRemove: string) => {
    setCustomEquipmentData(prev => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }));
  };

  const handleSaveCustomEquipment = async () => {
    if (!customEquipmentData.name.trim()) {
      alert('Veuillez entrer un nom pour l\'équipement');
      return;
    }

    try {
      // Ajouter l'équipement à la catégorie dans le fichier JSON
      const response = await fetch('/api/equipment-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: customEquipmentData.category,
          newItem: {
            name: customEquipmentData.name,
            svg: '/svg/default.svg',
            volumes: customEquipmentData.volumes.length > 0 ? customEquipmentData.volumes : ['N/A']
          }
        }),
      });

      if (response.ok) {
        // Recharger les types d'équipement
        await loadEquipmentTypes();
        
        // Fermer le dialog et montrer le dialog de continuation
        setAddCustomEquipmentDialog(false);
        setNewlyCreatedItem({
          name: customEquipmentData.name,
          category: customEquipmentData.category,
          volumes: customEquipmentData.volumes
        });
        setContinueDialog(true);
      } else {
        throw new Error('Erreur lors de l\'ajout de l\'équipement');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'équipement personnalisé:', error);
      alert('Erreur lors de l\'ajout de l\'équipement');
    }
  };

   // Fonction pour continuer l'ajout dans l'inventaire 
  const handleContinueToInventory = () => {
    setContinueDialog(false);
    if (newlyCreatedItem) {
      // Sélectionner l'équipement nouvellement créé et continuer à l'étape suivante
      setSelectedItem({
        name: newlyCreatedItem.name,
        svg: '/svg/default.svg',
        volumes: newlyCreatedItem.volumes || ['N/A']
      });
      setFormData(prev => ({
        ...prev,
        name: newlyCreatedItem.name,
        type: newlyCreatedItem.category
      }));
      setActiveStep(2); // Aller à l'étape des détails
      setTabValue(0); // Rester sur l'onglet d'ajout
    }
    setNewlyCreatedItem(null);
  };

  // Fonctions pour la gestion des types d'équipement
  const handleAddVolumeToEditingItem = () => {
    if (editingItemData.newVolume.trim()) {
      setEditingItemData(prev => ({
        ...prev,
        volumes: [...prev.volumes, prev.newVolume.trim()],
        newVolume: ''
      }))
    }
  }

  const handleRemoveVolumeFromEditingItem = (volumeToRemove: string) => {
    setEditingItemData(prev => ({
      ...prev,
      volumes: prev.volumes.filter(v => v !== volumeToRemove)
    }))
  }

  const handleSaveEditedItem = async () => {
    if (!selectedManagementItem || !selectedManagementCategory) return

    try {
      // Créer l'item mis à jour
      const updatedItem = {
        ...selectedManagementItem,
        name: editingItemData.name,
        volumes: editingItemData.volumes
      }

      // Vérifier si on change de catégorie
      const targetCategory = editingItemData.targetCategory || selectedManagementCategory
      const isCategoryChange = targetCategory !== selectedManagementCategory

      if (isCategoryChange) {
        // Si on change de catégorie, faire un déplacement (suppression + ajout)
        const response = await fetch('/api/equipment-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'move',
            sourceCategoryId: selectedManagementCategory,
            targetCategoryId: targetCategory,
            itemName: selectedManagementItem.name,
            updatedItem: updatedItem
          })
        })

        if (response.ok) {
          // Recharger les types d'équipement
          await loadEquipmentTypes()
          
          // Fermer le dialog et changer la catégorie sélectionnée
          setEditItemDialog(false)
          setSelectedManagementItem(null)
          setSelectedManagementCategory(targetCategory)
          
          alert('Équipement déplacé avec succès vers la nouvelle catégorie !')
        } else {
          throw new Error('Erreur lors du déplacement')
        }
      } else {
        // Mise à jour normale dans la même catégorie
        const response = await fetch('/api/equipment-types', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            categoryId: selectedManagementCategory,
            itemName: selectedManagementItem.name,
            updatedItem: updatedItem
          })
        })

        if (response.ok) {
          // Recharger les types d'équipement
          await loadEquipmentTypes()
          
          // Fermer le dialog
          setEditItemDialog(false)
          setSelectedManagementItem(null)
          
          alert('Équipement mis à jour avec succès !')
        } else {
          throw new Error('Erreur lors de la mise à jour')
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'équipement:', error)
      alert('Erreur lors de la mise à jour de l\'équipement')
    }
  }

  const steps = [
    {
      label: 'Catégorie',
      description: 'Choisir le type de matériel',
      icon: <Category />
    },
    {
      label: 'Matériel',
      description: 'Sélectionner l\'équipement',
      icon: <Science />
    },
    {
      label: 'Détails',
      description: 'Compléter les informations',
      icon: <Assignment />
    },
    {
      label: 'Finalisation',
      description: 'Vérifier et enregistrer',
      icon: <Check />
    }
  ]

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Gestion du Matériel
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Inventaire et ajout de matériel de laboratoire
      </Typography>

      {/* Tabs principales */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Ajouter du matériel" icon={<Add />} />
          <Tab label="Inventaire actuel" icon={<Inventory />} />
          <Tab label="Gérer les types" icon={<Settings />} />
        </Tabs>
      </Box>

      {/* Onglet Ajout */}
      <TabPanel value={tabValue} index={0}>
        <EquipmentAddTab
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          formData={formData}
          setFormData={setFormData}
          equipmentTypes={equipmentTypes}
          rooms={rooms}
          onCategorySelect={handleCategorySelect}
          onItemSelect={handleItemSelect}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onReset={handleReset}
          loading={loading}
        />
      </TabPanel>

      {/* Onglet Inventaire */}
      <TabPanel value={tabValue} index={1}>
        <EquipmentInventoryTab
          materiel={materiel}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          rooms={rooms}
          quantityValues={quantityValues}
          setQuantityValues={setQuantityValues}
          updatingCards={updatingCards}
          onQuantityChange={handleQuantityChange}
          onEditEquipment={handleEditEquipment}
          onDeleteEquipment={handleDeleteEquipment}
          getTypeLabel={getTypeLabel}
          getFilteredMateriel={getFilteredMateriel}
        />
      </TabPanel>

      {/* Onglet Gestion des types */}
      <TabPanel value={tabValue} index={2}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Gérer les types d'équipement
          </Typography>
          
          {!selectedManagementCategory ? (
            // Affichage des catégories
            <Box>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Sélectionnez une catégorie à modifier :
              </Typography>
              <Grid container spacing={2}>
                {getAllCategories().map((category) => (
                  <Grid key={category.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { 
                          transform: 'translateY(-2px)',
                          boxShadow: 4 
                        }
                      }}
                      onClick={() => setSelectedManagementCategory(category.id)}
                    >
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Avatar 
                          src={category.svg} 
                          sx={{ 
                            width: 64, 
                            height: 64, 
                            mx: 'auto', 
                            mb: 2,
                            bgcolor: 'primary.light'
                          }} 
                        />
                        <Typography variant="h6" gutterBottom>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {category.items?.length || 0} équipements
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            // Affichage des équipements de la catégorie sélectionnée
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    setSelectedManagementCategory('')
                    setSelectedManagementItem(null)
                  }}
                >
                  ← Retour aux catégories
                </Button>
                <Typography variant="h6">
                  {getAllCategories().find(c => c.id === selectedManagementCategory)?.name}
                </Typography>
              </Box>
              
              {(() => {
                const allItems = getAllEquipmentTypes().find((t: EquipmentType) => t.id === selectedManagementCategory)?.items || []
                const presetItems = allItems.filter((item: EquipmentItem) => !item.isCustom)
                const customItems = allItems.filter((item: EquipmentItem) => item.isCustom)
                
                return (
                  <>
                    {/* Équipements preset */}
                    {presetItems.length > 0 && (
                      <>
                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                          📦 Équipements standard
                        </Typography>
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                          {presetItems.map((item: EquipmentItem, index: number) => (
                            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card 
                                sx={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  '&:hover': { 
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4 
                                  }
                                }}
                                onClick={() => {
                                  setSelectedManagementItem(item)
                                  setEditingItemData({
                                    name: item.name,
                                    volumes: [...item.volumes],
                                    newVolume: '',
                                    targetCategory: selectedManagementCategory
                                  })
                                  setEditItemDialog(true)
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar src={item.svg} sx={{ width: 48, height: 48 }} />
                                    <Typography variant="h6">{item.name}</Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.volumes?.length || 0} volumes disponibles
                                  </Typography>
                                  {item.volumes?.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                      {item.volumes.slice(0, 3).map((volume, vIndex) => (
                                        <Chip 
                                          key={vIndex} 
                                          label={volume} 
                                          size="small" 
                                          variant="outlined" 
                                        />
                                      ))}
                                      {item.volumes.length > 3 && (
                                        <Chip 
                                          label={`+${item.volumes.length - 3}`} 
                                          size="small" 
                                          variant="outlined" 
                                        />
                                      )}
                                    </Box>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}
                    
                    {/* Divider si on a les deux types */}
                    {presetItems.length > 0 && customItems.length > 0 && (
                      <Divider sx={{ my: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Équipements personnalisés
                        </Typography>
                      </Divider>
                    )}
                    
                    {/* Équipements personnalisés */}
                    {customItems.length > 0 && (
                      <>
                        <Typography variant="h6" sx={{ mb: 2, color: 'secondary.main' }}>
                          🔧 Équipements personnalisés
                        </Typography>
                        <Grid container spacing={2}>
                          {customItems.map((item: EquipmentItem, index: number) => (
                            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                              <Card 
                                sx={{ 
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  bgcolor: 'action.hover',
                                  '&:hover': { 
                                    transform: 'translateY(-2px)',
                                    boxShadow: 4 
                                  }
                                }}
                                onClick={() => {
                                  setSelectedManagementItem(item)
                                  setEditingItemData({
                                    name: item.name,
                                    volumes: [...item.volumes],
                                    newVolume: '',
                                    targetCategory: selectedManagementCategory
                                  })
                                  setEditItemDialog(true)
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Avatar 
                                      src={item.svg} 
                                      sx={{ 
                                        width: 48, 
                                        height: 48,
                                        bgcolor: 'secondary.light',
                                        color: 'secondary.contrastText'
                                      }} 
                                    />
                                    <Typography variant="h6" sx={{ fontStyle: 'italic' }}>
                                      {item.name}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {item.volumes?.length || 0} volumes disponibles
                                  </Typography>
                                  {item.volumes?.length > 0 && (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                      {item.volumes.slice(0, 3).map((volume, vIndex) => (
                                        <Chip 
                                          key={vIndex} 
                                          label={volume} 
                                          size="small" 
                                          variant="outlined" 
                                          color="secondary"
                                        />
                                      ))}
                                      {item.volumes.length > 3 && (
                                        <Chip 
                                          label={`+${item.volumes.length - 3}`} 
                                          size="small" 
                                          variant="outlined" 
                                          color="secondary"
                                        />
                                      )}
                                    </Box>
                                  )}
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </>
                    )}
                  </>
                )
              })()}
            </Box>
          )}
        </Paper>
      </TabPanel>

      {/* FAB pour ajout rapide */}
      <Fab
        color="primary"
        aria-label="add equipment"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleQuickAdd}
      >
        <Add />
      </Fab>

      {/* Dialogue de continuation après ajout de matériel personnalisé */}
      <Dialog
        open={continueDialog}
        onClose={() => setContinueDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <CheckCircle />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Matériel créé avec succès !
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {newlyCreatedItem?.name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Paper 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2
            }}
          >
            <Typography variant="body1" gutterBottom>
              Souhaitez-vous poursuivre et ajouter ce matériel à votre inventaire avec des détails complémentaires ?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              Vous pourrez spécifier la quantité, localisation, salle et notes.
            </Typography>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleFinishWithoutContinue}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Non, terminer
          </Button>
          <Button 
            onClick={handleContinueToInventory}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Inventory />}
          >
            Oui, ajouter à l'inventaire
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue pour créer une nouvelle catégorie */}
      <Dialog
        open={newCategoryDialog}
        onClose={() => setNewCategoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nouvelle catégorie de matériel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la catégorie"
            fullWidth
            variant="outlined"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomCategory()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleCreateCustomCategory}
            variant="contained"
            disabled={!newCategoryName.trim()}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de suppression stylisé */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Warning color="inherit" />
            <Typography variant="h6">Confirmer la suppression</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Paper sx={{ 
            p: 2, 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2
          }}>
            <Typography variant="body1" gutterBottom>
              Êtes-vous sûr de vouloir supprimer "{equipmentToDelete?.name}" ?
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
              Cette action est irréversible. L'équipement sera définitivement retiré de l'inventaire.
            </Typography>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setDeleteDialog(false)}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={confirmDeleteEquipment}
            variant="contained"
            color="error"
            sx={{ 
              backgroundColor: 'rgba(244, 67, 54, 0.8)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(244, 67, 54, 1)' },
              fontWeight: 'bold'
            }}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour ajouter un équipement personnalisé aux catégories */}
      <Dialog
        open={addCustomEquipmentDialog}
        onClose={() => setAddCustomEquipmentDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
              <Add />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Ajouter un équipement personnalisé
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Catégorie: {getAllCategories().find(c => c.id === customEquipmentData.category)?.name}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Paper 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(255,255,255,0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 2
            }}
          >
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Nom de l'équipement"
                value={customEquipmentData.name}
                onChange={(e) => setCustomEquipmentData(prev => ({
                  ...prev,
                  name: e.target.value
                }))}
                placeholder="Ex: Micropipette, Balance analytique..."
                sx={{
                  '& .MuiInputLabel-root': { color: 'white' },
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&.Mui-focused fieldset': { borderColor: 'white' }
                  }
                }}
              />

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Volumes/Tailles disponibles (optionnel)
                </Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <TextField
                    label="Ajouter un volume"
                    value={customEquipmentData.newVolume}
                    onChange={(e) => setCustomEquipmentData(prev => ({
                      ...prev,
                      newVolume: e.target.value
                    }))}
                    placeholder="Ex: 250ml, 10cm, 1kg..."
                    sx={{
                      flex: 1,
                      '& .MuiInputLabel-root': { color: 'white' },
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                        '&.Mui-focused fieldset': { borderColor: 'white' }
                      }
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddVolumeToCustomEquipment()}
                  />
                  <Button
                    onClick={handleAddVolumeToCustomEquipment}
                    variant="contained"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                    }}
                  >
                    Ajouter
                  </Button>
                </Stack>

                {customEquipmentData.volumes.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {customEquipmentData.volumes.map((volume, index) => (
                      <Chip
                        key={index}
                        label={volume}
                        onDelete={() => handleRemoveVolumeFromCustomEquipment(volume)}
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' }
                        }}
                      />
                    ))}
                  </Box>
                )}
              </Box>
            </Stack>
          </Paper>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setAddCustomEquipmentDialog(false)}
            sx={{ 
              color: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleSaveCustomEquipment}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!customEquipmentData.name.trim()}
          >
            Créer l'équipement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de modification d'équipement preset */}
      <Dialog
        open={editItemDialog}
        onClose={() => {
          setEditItemDialog(false)
          setSelectedManagementItem(null)
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Settings />
            <Typography variant="h6">
              Modifier {selectedManagementItem?.name}
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Nom de l'équipement */}
            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={editingItemData.name}
              onChange={(e) => setEditingItemData(prev => ({
                ...prev,
                name: e.target.value
              }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />

            {/* Sélecteur de catégorie */}
            <FormControl 
              fullWidth
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                },
                '& .MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <InputLabel>Catégorie</InputLabel>
              <Select
                value={editingItemData.targetCategory}
                label="Catégorie"
                onChange={(e) => setEditingItemData(prev => ({
                  ...prev,
                  targetCategory: e.target.value
                }))}
              >
                {getAllCategories().map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={category.svg} sx={{ width: 24, height: 24 }} />
                      {category.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Gestion des volumes */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                Volumes disponibles
              </Typography>
              
              {/* Volumes existants */}
              {editingItemData.volumes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {editingItemData.volumes.map((volume, index) => (
                    <Chip
                      key={index}
                      label={volume}
                      onDelete={() => handleRemoveVolumeFromEditingItem(volume)}
                      deleteIcon={<Delete />}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' }
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Ajouter un nouveau volume */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Nouveau volume"
                  value={editingItemData.newVolume}
                  onChange={(e) => setEditingItemData(prev => ({
                    ...prev,
                    newVolume: e.target.value
                  }))}
                  placeholder="Ex: 250ml, 10cm, 1kg..."
                  sx={{
                    flex: 1,
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' }
                    }
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddVolumeToEditingItem()}
                />
                <Button
                  onClick={handleAddVolumeToEditingItem}
                  variant="contained"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Ajouter
                </Button>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button
            onClick={() => {
              setEditItemDialog(false)
              setSelectedManagementItem(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveEditedItem}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!editingItemData.name.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'édition d'un équipement de l'inventaire */}
      <Dialog
        open={openEditDialog}
        onClose={() => {
          setOpenEditDialog(false)
          setEditingEquipment(null)
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Edit />
            <Typography variant="h6">
              Modifier {editingEquipment?.name}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Nom de l'équipement */}
            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={editingEquipment?.name || ''}
              onChange={(e) => setEditingEquipment((prev: any) => ({ ...prev, name: e.target.value }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />
            {/* Volume */}
            <TextField
              fullWidth
              label="Volume"
              value={editingEquipment?.volume || ''}
              onChange={(e) => setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />
            {/* Quantité */}
            <TextField
              fullWidth
              label="Quantité"
              type="number"
              value={editingEquipment?.quantity || 1}
              onChange={(e) => setEditingEquipment((prev: any) => ({ ...prev, quantity: Number(e.target.value) }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />
            {/* Localisation */}
            <TextField
              fullWidth
              label="Localisation"
              value={editingEquipment?.location || ''}
              onChange={(e) => setEditingEquipment((prev: any) => ({ ...prev, location: e.target.value }))}
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' }
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <Button
            onClick={() => {
              setOpenEditDialog(false)
              setEditingEquipment(null)
            }}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
              fontWeight: 'bold'
            }}
            startIcon={<Save />}
            disabled={!editingEquipment?.name?.trim()}
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
