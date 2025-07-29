// components/calendar/EventDetailsDialog.tsx

"use client"

import React, { useState, useEffect } from 'react'
import { format } from "date-fns"
import { fr, is } from "date-fns/locale"
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Grid, Typography, Chip, Stack, Divider,
  IconButton, Skeleton, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Avatar,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Tooltip,
  Snackbar,
  TextField,
  Alert as MuiAlert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material'
import {
  Timeline, TimelineItem, TimelineSeparator,
  TimelineDot, TimelineConnector, TimelineContent,
  TimelineOppositeContent,
} from '@mui/lab'
import { 
  Science, Schedule, Assignment, EventAvailable,
  History, Person, PictureAsPdf, Description, Image, Build,
  InsertDriveFile, OpenInNew, Download, Add, Edit, Delete,
  HourglassEmpty, CalendarToday, AccessTime, Room, School, HourglassTop,
  InfoOutlined, SwapHoriz, CheckCircle, Cancel, ManageHistory
} from '@mui/icons-material'
import { CalendarEvent, EventType, EventState } from '@/types/calendar'
import { UserRole } from "@/types/global";
import { SiMoleculer } from "react-icons/si";
import { useSession } from 'next-auth/react'
import StateChangeHandler from '@/components/calendar/StateChangeHandler'
import EventActions from '@/components/calendar/EventActions'
import { getActiveTimeSlots } from '@/lib/calendar-utils-client';


interface DocumentFile {
  fileName: string
  fileUrl?: string
  fileType?: string
  fileSize?: number
  uploadedAt?: string
}

interface TimeSlotFormData {
  id: string
  date: string
  startTime: string
  endTime: string
  userIDAdding: string
  createdBy: string
  modifiedBy: Array<{
    userId: string
    date: string
    action: 'created' | 'modified' | 'deleted'
  }>
}

interface EventDetailsDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onStateChange?: (event: CalendarEvent, newState: EventState, reason?: string, timeSlots?: any[]) => void
  onMoveDate?: (event: CalendarEvent, timeSlots: any[], reason?: string) => void
  onConfirmModification?: (event: CalendarEvent, modificationId: string, action: 'confirm' | 'reject') => void
  onApproveTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: approuver les créneaux proposés
  onRejectTimeSlotChanges?: (event: CalendarEvent) => void // NOUVEAU: rejeter les créneaux proposés
  userRole?: UserRole
  currentUserId?: string
  isMobile?: boolean
  isTablet?: boolean
}

// Définition corrigée de EVENT_TYPES
const EVENT_TYPES = {
  TP: { label: "Travaux Pratiques", color: "#1976d2", icon: <Science /> },
  MAINTENANCE: { label: "Maintenance", color: "#f57c00", icon: <Schedule /> },
  INVENTORY: { label: "Inventaire", color: "#388e3c", icon: <Assignment /> },
  OTHER: { label: "Autre", color: "#7b1fa2", icon: <EventAvailable /> }
}

// Fonction helper pour les labels de changement d'état
const getStateChangeLabel = (fromState: string, toState: string): string => {
  const stateLabels: Record<string, string> = {
    'PENDING': 'À valider',
    'VALIDATED': 'Validé',
    'CANCELLED': 'Annulé',
    'MOVED': 'Déplacé',
    'IN_PROGRESS': 'En préparation'
  }
  
  return `${stateLabels[fromState] || fromState} → ${stateLabels[toState] || toState}`
}
// Fonction pour déterminer le type de fichier
const getFileType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
    return 'image'
  } else if (extension === 'pdf') {
    return 'pdf'
  } else if (['doc', 'docx'].includes(extension)) {
    return 'doc'
  } else {
    return 'other'
  }
}

// Fonction pour obtenir l'icône et la couleur selon le type
const getFileTypeInfo = (fileType: string) => {
  if (fileType.includes('image')) {
    return { icon: <Image sx={{ fontSize: 40 }} />, color: '#4caf50', label: 'Image' }
  }
  if (fileType === 'pdf') {
    return { icon: <PictureAsPdf sx={{ fontSize: 40 }} />, color: '#f44336', label: 'PDF' }
  }
  if (fileType.includes('doc')) {
    return { icon: <Description sx={{ fontSize: 40 }} />, color: '#2196f3', label: 'Document' }
  }
  return { icon: <InsertDriveFile sx={{ fontSize: 40 }} />, color: '#757575', label: 'Fichier' }
}

const formatDateTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, "dd/MM/yyyy HH:mm", { locale: fr })
}

const formatTime = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, "HH:mm", { locale: fr })
}

// Fonction pour formater la taille du fichier
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}




// Composant pour afficher une carte de document - VERSION CORRIGÉE
const DocumentCard: React.FC<{ 
  document: DocumentFile,
  onOpenError?: (error: string) => void
}> = ({ document, onOpenError }) => {
  const fileType = document.fileType || getFileType(document.fileName)
  const fileInfo = getFileTypeInfo(fileType)
  const [isHovered, setIsHovered] = useState(false)
  // Ajout d'un état pour gérer les créneaux horaires lors du déplacement



    // Construire l'URL une seule fois
  const documentUrl = document.fileUrl 
    ? (document.fileUrl.startsWith('/uploads/') 
        ? `/api/calendrier/files?path=${encodeURIComponent(document.fileUrl)}`
        : document.fileUrl)
    : null

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (document.fileUrl) {
      try {
        let urlToOpen = document.fileUrl
        
        // Si c'est un fichier local, construire l'URL complète via l'API
        if (document.fileUrl.startsWith('/uploads/')) {
          urlToOpen = `/api/calendrier/files?path=${encodeURIComponent(document.fileUrl)}`
        }
        
        // Ouvrir dans un nouvel onglet
        window.open(urlToOpen, '_blank', 'noopener,noreferrer')
        
        // Ne pas vérifier si la fenêtre est bloquée car cela donne des faux positifs
        // La plupart des navigateurs modernes permettent window.open() sur un événement de clic
        
      } catch (error) {
        console.error('Erreur lors de l\'ouverture du document:', error)
        if (onOpenError) {
          onOpenError('Impossible d\'ouvrir le document. Veuillez réessayer.')
        }
      }
    } else {
      if (onOpenError) {
        onOpenError('L\'URL du document n\'est pas disponible.')
      }
    }
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault() // Important pour empêcher la navigation
    e.stopPropagation()
    
    if (document.fileUrl) {
      try {
        // Si c'est un chemin local (commence par /uploads/)
        if (document.fileUrl.startsWith('/uploads/')) {
          const response = await fetch('/api/calendrier/files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: document.fileUrl,
              fileName: document.fileName
            })
          })

          if (!response.ok) {
            throw new Error('Erreur lors du téléchargement')
          }

          // Récupérer le blob
          const blob = await response.blob()
          
          // Créer un lien de téléchargement
          const url = window.URL.createObjectURL(blob)
          const link = window.document.createElement('a')
          link.href = url
          link.download = document.fileName
          window.document.body.appendChild(link)
          link.click()
          
          // Nettoyer
          window.URL.revokeObjectURL(url)
          window.document.body.removeChild(link)
        } else {
          // Si c'est une URL externe, utiliser l'ancienne méthode
          const link = window.document.createElement('a')
          link.href = document.fileUrl
          link.download = document.fileName
          window.document.body.appendChild(link)
          link.click()
          window.document.body.removeChild(link)
        }
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error)
        if (onOpenError) {
          onOpenError('Impossible de télécharger le document.')
        }
      }
    }
  }

  return (
    <Tooltip 
      title={document.fileUrl ? "Cliquez pour ouvrir dans un nouvel onglet" : "Document non disponible"} 
      arrow
      placement="top"
    >
      <Card 
        sx={{ 
          maxWidth: 200, 
          boxShadow: 2,
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)'
          },
          opacity: document.fileUrl ? 1 : 0.7
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Retirer CardActionArea et utiliser un Box cliquable */}
        <Box
          onClick={handleClick}
          sx={{
            cursor: document.fileUrl ? 'pointer' : 'default',
            '&:focus': {
              outlineColor: 'primary.main',
              outlineOffset: -2,
            },
            // Garder l'outline uniquement pour la navigation au clavier
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -2,
            }
            }}
            tabIndex={document.fileUrl ? 0 : -1}
            role={document.fileUrl ? "button" : undefined}
            onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleClick(e as any)
            }
            }}
          >
          <Box
            sx={{
              height: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${fileInfo.color}15`,
              position: 'relative'
            }}
          >
            <Box sx={{ color: fileInfo.color }}>
              {fileInfo.icon}
            </Box>
            {document.fileUrl && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 0.5,
                  opacity: isHovered ? 1 : 0.8,
                  transition: 'opacity 0.2s'
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    borderRadius: '50%',
                    padding: 0.5,
                    boxShadow: 1,
                    width: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <OpenInNew fontSize="small" sx={{ fontSize: 16, color: 'primary.main' }} />
                </Box>
                <Tooltip title="Télécharger" arrow>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation() // Empêcher le clic de se propager au Box parent
                      handleDownload(e)
                    }}
                    sx={{
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText'
                      }
                    }}
                  >
                    <Download fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              {fileInfo.label}
              {document.fileSize && ` • ${formatFileSize(document.fileSize)}`}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
                color: document.fileUrl ? 'text.primary' : 'text.disabled'
              }}
              title={document.fileName}
            >
              {document.fileName}
            </Typography>
            {document.uploadedAt && (
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ fontSize: '0.65rem' }}
              >
                {formatDateTime(document.uploadedAt)}
              </Typography>
            )}
          </CardContent>
        </Box>
      </Card>
    </Tooltip>
  )
}

const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ 
  open, 
  event, 
  onClose,
  onEdit,
  onDelete, 
  onStateChange,
  onMoveDate,
  onConfirmModification,
  onApproveTimeSlotChanges,
  onRejectTimeSlotChanges,
  userRole,
  currentUserId,
  isMobile = false,
  isTablet = false
}) => {

  const [usersInfo, setUsersInfo] = useState<Record<string, {id: string, name: string, email: string}>>({})
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [creatorInfo, setCreatorInfo] = useState<{id: string, name: string, email: string} | null>(null)
  const [timelineData, setTimelineData] = useState<Array<{
    userId: string,
    userName: string,
    date: string,
    isConsecutive: boolean
  }>>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  // États pour gérer le chargement des boutons de timeslot
  const [loadingTimeslotActions, setLoadingTimeslotActions] = useState<Record<string, 'approve' | 'reject' | null>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  
  const [unifiedDialog, setUnifiedDialog] = useState<{
    open: boolean
    action: 'cancel' | 'move' | 'validate' | 'in-progress' | null
    step: 'confirmation' | 'timeSlots'
  }>({ open: false, action: null, step: 'confirmation' })


  const [formData, setFormData] = useState<{
      timeSlots: TimeSlotFormData[]
      slotStates: { [key: number]: 'initial' | 'replaced' | 'kept' }
    }>({
      timeSlots: [{ 
        id: `TS_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`, 
        date: '', 
        startTime: '', 
        endTime: '', 
        userIDAdding: 'INDISPONIBLE',
        createdBy: '',
        modifiedBy: []
      }],
      slotStates: {}
    })


  const [stateChangeCompleted, setStateChangeCompleted] = useState(false)

  // Initialiser les créneaux avec les créneaux actuels de l'événement
    const initializeWithCurrentSlots = () => {
    if (!event) return;
    const currentSlots = event.actuelTimeSlots || event.timeSlots?.filter((slot: any) => slot.status === 'active') || []
    const initialSlots = currentSlots.map((slot: any) => ({
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
      date: '',
      startTime: '',
      endTime: '',
      userIDAdding: 'INDISPONIBLE',
      createdBy: '',
      modifiedBy: []
    }))
    
    const initialStates: { [key: number]: 'initial' | 'replaced' | 'kept' } = {}
    currentSlots.forEach((_: any, index: number) => {
      initialStates[index] = 'initial'
    })
    
    setFormData({ 
      timeSlots: initialSlots.length > 0 ? initialSlots : formData.timeSlots, 
      slotStates: initialStates 
    })
  }

    
  const openUnifiedDialog = (action: 'cancel' | 'move' | 'validate' | 'in-progress') => {
    setUnifiedDialog({ open: true, action, step: 'confirmation' })
    setStateChangeCompleted(false)
    
    // Initialiser avec les créneaux actuels si on va gérer les créneaux
    if (action === 'move' || action === 'validate') {
      initializeWithCurrentSlots()
    }
  }



  // Fonctions pour gérer les actions de timeslot avec optimisme
  const handleApproveTimeslot = async (slotIndex: number, slotId: string) => {
    if (!event) return
    
    const slotKey = `${event.id}-${slotId}`
    setLoadingTimeslotActions(prev => ({ ...prev, [slotKey]: 'approve' }))
    
    try {
      const response = await fetch('/api/calendrier/approve-single-timeslot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          slotId: slotId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuccessMessage('Créneau approuvé avec succès')
        // Mise à jour avec les données de l'API
        if (onApproveTimeSlotChanges && data.event) {
          onApproveTimeSlotChanges(data.event)
        }
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Erreur lors de l\'approbation du créneau')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur de connexion')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLoadingTimeslotActions(prev => ({ ...prev, [slotKey]: null }))
    }
  }

  const handleRejectTimeslot = async (slotIndex: number, slotId: string) => {
    if (!event) return
    
    const slotKey = `${event.id}-${slotId}`
    setLoadingTimeslotActions(prev => ({ ...prev, [slotKey]: 'reject' }))
    
    try {
      const response = await fetch('/api/calendrier/reject-single-timeslot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          slotId: slotId
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSuccessMessage('Créneau rejeté avec succès')
        // Mise à jour avec les données de l'API
        if (onRejectTimeSlotChanges && data.event) {
          onRejectTimeSlotChanges(data.event)
        }
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setErrorMessage(errorData.error || 'Erreur lors du rejet du créneau')
        setTimeout(() => setErrorMessage(null), 3000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur de connexion')
      setTimeout(() => setErrorMessage(null), 3000)
    } finally {
      setLoadingTimeslotActions(prev => ({ ...prev, [slotKey]: null }))
    }
  }

  // Fonction pour trouver le créneau actuel correspondant à un créneau proposé
  // Nouvelle version : utilise referentActuelTimeID pour la correspondance directe
  const findCorrespondingActualSlot = (proposedSlot: any, actualSlots: any[]) => {
    if (!actualSlots || actualSlots.length === 0) {
      return null;
    }

    // Correspondance directe par referentActuelTimeID si présent
    if (proposedSlot.referentActuelTimeID) {
      const byRef = actualSlots.find(slot => slot.id === proposedSlot.referentActuelTimeID);
      if (byRef) return byRef;
    }

    // Sinon, correspondance par ID (créneau inchangé)
    const byId = actualSlots.find(slot => slot.id === proposedSlot.id);
    if (byId) return byId;

    // Si aucune correspondance, retourner null (plus de matching heuristique)
    return null;
  };

  // Fonction pour vérifier si un créneau proposé est différent du créneau actuel
  const isSlotChanged = (proposedSlot: any, event: CalendarEvent) => {
    const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
    
    if (!correspondingActual) {
      // Nouveau créneau proposé
      return true;
    }
    
    // Comparer les dates
    return correspondingActual.startDate !== proposedSlot.startDate || 
           correspondingActual.endDate !== proposedSlot.endDate;
  };

  // Fonction pour obtenir l'état d'un créneau (validé, en attente, nouveau)
  const getSlotStatus = (proposedSlot: any, event: CalendarEvent) => {
    const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
    
    if (!correspondingActual) {
      return 'new'; // Nouveau créneau
    }
    
    // Vérifier d'abord si c'est une correspondance par ID (créneau inchangé)
    const isExactMatch = correspondingActual.id === proposedSlot.id;
    const isSameDate = correspondingActual.startDate === proposedSlot.startDate && 
                      correspondingActual.endDate === proposedSlot.endDate;
    
    if (isSameDate) {
      return 'approved'; // Créneau validé (identique)
    }
    
    return 'pending'; // Créneau modifié en attente (remplace le créneau correspondingActual)
  };

  // NOUVEAU: Fonction pour détecter s'il y a des changements en attente
  const hasPendingChanges = (event: CalendarEvent) => {
    if (!event.actuelTimeSlots || !event.timeSlots) return false
    
    // Prendre seulement les créneaux actifs pour la comparaison (exclure les "invalid")
    const activeTimeSlots = event.timeSlots.filter(slot => slot.status === 'active')
    
    // Si l'événement est PENDING et que c'est le propriétaire qui a fait les modifications,
    // ne pas considérer comme ayant des changements en attente
    if (event.state === 'PENDING' && event.createdBy === currentUserId) {
      return false;
    }
    
    // Vérifier si chaque créneau proposé valide a été modifié
    return activeTimeSlots.some(proposedSlot => isSlotChanged(proposedSlot, event));
  }

    // Vérifier si l'utilisateur peut valider
  const canValidate = userRole === 'LABORANTIN' || userRole === 'ADMINLABO'

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const calculateDuration = () => {
    if (!event) return 0
    const activeSlots = getActiveTimeSlots(event);
    const firstSlot = activeSlots[0]; // Prendre le premier créneau actif pour l'affichage principal

    const startDate = firstSlot ? new Date(firstSlot.startDate) : new Date();
    const endDate = firstSlot ? new Date(firstSlot.endDate) : new Date();
    const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return hours
  }

  // Fonction pour préparer les documents
  const getDocuments = (): DocumentFile[] => {
    if (!event) return []
    
    const documents: DocumentFile[] = []
    
    // Nouveau format avec array files
    if (event.files && Array.isArray(event.files) && event.files.length > 0) {
      event.files.forEach((file) => {
        documents.push({
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileSize: file.fileSize,
          uploadedAt: file.uploadedAt
        })
      })
    } 


    
    return documents
  }

  // Fonction pour gérer le changement d'état
  const handleStateChange = (event: CalendarEvent, newState: EventState, reason?: string) => {
    if (onStateChange) {
      onStateChange(event, newState, reason);
    }
    onClose();
  };
useEffect(() => {
  const fetchUsersAndPrepareTimeline = async () => {
    if (!event) return
    console.log('Récupération des utilisateurs pour la timeline de l\'événement:', event.id)

    setLoadingUsers(true)
    try {
      // Collecter tous les userIds (modificateurs + créateur)
      const userIds: string[] = []
      
      // Toujours ajouter l'ID du créateur s'il existe
      if (event.createdBy) {
        userIds.push(event.createdBy)
      }
      
      // Ajouter les IDs des modificateurs s'il y en a
      if (event.modifiedBy && event.modifiedBy.length > 0) {
        event.modifiedBy.forEach(entry => userIds.push(entry[0]))
      }

      
      // Récupérer les infos de tous les utilisateurs (y compris le créateur)
      if (userIds.length > 0) {
        const response = await fetch('/api/utilisateurs/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [...new Set(userIds)] }) // Enlever les doublons
        })

        if (response.ok) {
          const users = await response.json()
          setUsersInfo(users)
          
          // Stocker les infos du créateur
          if (event.createdBy && users[event.createdBy]) {
            setCreatorInfo(users[event.createdBy])
          }
          
          // Préparer les données pour la timeline des modifications
          if (event.modifiedBy && event.modifiedBy.length > 0) {
            const allModifications: Array<{
              userId: string, 
              userName: string,
              date: string,
              isConsecutive: boolean
            }> = []
            
            // Créer une entrée pour chaque modification
            event.modifiedBy.forEach(([userId, ...dates]) => {
              const userName = users[userId]?.name || 
                              users[userId]?.email || 
                              `Utilisateur ${userId}`
              
              dates.forEach(date => {
                // Vérifier si la date est valide
                try {
                  const d = new Date(date)
                  if (!isNaN(d.getTime())) {
                    allModifications.push({ userId, userName, date, isConsecutive: false })
                  }
                } catch {
                  // Ignorer les dates invalides
                }
              })
            })
            
            // Trier par date
            allModifications.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            )
            
            // Marquer les modifications consécutives du même utilisateur
            for (let i = 1; i < allModifications.length; i++) {
              if (allModifications[i].userId === allModifications[i - 1].userId) {
                allModifications[i].isConsecutive = true
              }
            }
            
            setTimelineData(allModifications)
          } else {
            // Pas de modifications, mais on a quand même récupéré les infos du créateur
            setTimelineData([])
          }
        } else {
          console.error('Erreur lors de la récupération des utilisateurs')
          setTimelineData([])
        }
      } else {
        // Pas d'utilisateurs à récupérer
        setTimelineData([])
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error)
      setTimelineData([])
    } finally {
      setLoadingUsers(false)
    }
  }

  if (open && event) {
    fetchUsersAndPrepareTimeline()
  }
}, [event, open])

  // Fonction helper pour formater les dates en toute sécurité
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Date invalide'
      }
      return format(date, 'dd MMM yyyy HH:mm', { locale: fr })
    } catch (error) {
      return 'Date invalide'
    }
  }

  if (!event) return null

  const documents = getDocuments()

  const activeSlots = getActiveTimeSlots(event);
  const firstSlot = activeSlots[0]; // Prendre le premier créneau actif pour l'affichage principal
  const eventDate = firstSlot ? new Date(firstSlot.startDate) : new Date();
  const eventStartTime = firstSlot ? new Date(firstSlot.startDate) : new Date();
  const eventEndTime = firstSlot ? new Date(firstSlot.endDate) : new Date();

  return (
    <>
    <Dialog 
    fullScreen={isMobile}
    open={open} 
    onClose={onClose} 
    maxWidth="md"
    fullWidth
    sx ={{
      p: isMobile ? 0 : 2,
    }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box 
          sx ={{
            display: 'flex',
            alignItems: !isMobile ? 'center' : 'flex-start',
            gap: 1,
            flexDirection: isMobile ? 'column' : 'row',
            width: isMobile ? '100%' : 'auto'
          }}
          >
              <Typography variant="h5" component="h3" >Détails de la séance</Typography>
              <Chip 
                label={getEventTypeInfo(event.type).label} 
                color="primary" 
                size="small"
                sx= {{ 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
              />
              {event?.state && (
                <Chip
                  label={
                    event.state === 'PENDING' ? 'À valider' :
                    event.state === 'VALIDATED' ? 'Validé' :
                    event.state === 'CANCELLED' ? 'Annulé' :
                    event.state === 'IN_PROGRESS' ? 'En préparation' :
                    event.state === 'MOVED' ? 'Déplacé' : event.state
                  }
                  color={
                    event.state === 'PENDING' ? 'warning' :
                    event.state === 'VALIDATED' ? 'success' :
                    event.state === 'CANCELLED' ? 'error' :
                    event.state === 'IN_PROGRESS' ? 'info' :
                    event.state === 'MOVED' ? 'secondary' :
                    'default'
                  }
                  size="small"
                  icon={
                    event.state === 'VALIDATED' ? <CheckCircle /> :
                    event.state === 'CANCELLED' ? <Cancel /> :
                    event.state === 'MOVED' ? <SwapHoriz /> :
                    event.state === 'IN_PROGRESS' ? <ManageHistory /> :
                    event.state === 'PENDING' ? <History /> :
                    undefined
                  }
                  sx= {{ 
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}
                />
              )}
            </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Titre et informations principales */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {event.title}
            </Typography>
            {event.description && (
              <Typography variant="body1" color="text.secondary">
                {event.description}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Informations temporelles avec modifications en attente intégrées */}
          <Grid container spacing={2}>
            {/* Modifications en attente - affichage en haut si owner ET des changements valides */}
            {event.createdBy === currentUserId && hasPendingChanges(event) && (
              <Grid size={{ xs: 12 }}>
                <MuiAlert 
                  severity="warning" 
                  sx={{ mb: 2 }}
                  icon={<ManageHistory />}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    Modifications en attente de votre validation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Des utilisateurs ont proposé des modifications pour les créneaux de cet événement. 
                    Veuillez les examiner et les approuver ou les rejeter.
                  </Typography>
                </MuiAlert>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Comparaison des créneaux :
                  </Typography>
                  
                  {/* Tableau de comparaison des créneaux - exclure les créneaux invalid */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {event.timeSlots?.filter(slot => slot.status === 'active').map((proposedSlot) => {
                      const correspondingActual = findCorrespondingActualSlot(proposedSlot, event.actuelTimeSlots || []);
                      const slotStatus = getSlotStatus(proposedSlot, event);
                      const slotKey = `${event.id}-${proposedSlot.id}`;
                      
                      return (
                        <Box key={proposedSlot.id} sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: slotStatus === 'approved' ? 'success.main' : 
                                      slotStatus === 'new' ? 'info.main' : 'warning.main',
                          borderRadius: 1,
                          bgcolor: slotStatus === 'approved' ? 'success.50' : 
                                  slotStatus === 'new' ? 'info.50' : 'warning.50'
                        }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                <strong>Actuel :</strong>
                              </Typography>
                              <Typography variant="body2">
                                {correspondingActual ? 
                                  `${format(new Date(correspondingActual.startDate), 'dd/MM/yyyy HH:mm', { locale: fr })} - ${format(new Date(correspondingActual.endDate), 'HH:mm', { locale: fr })}` :
                                  'Aucun créneau correspondant'
                                }
                              </Typography>
                              {correspondingActual && correspondingActual.id !== proposedSlot.id && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  (sera remplacé)
                                </Typography>
                              )}
                            </Grid>
                            
                            <Grid size={{ xs: 12, md: 4 }}>
                              <Typography variant="body2" color="primary.main" gutterBottom>
                                <strong>Proposé :</strong>
                              </Typography>
                              <Typography variant="body2" color="primary.main">
                                {format(new Date(proposedSlot.startDate), 'dd/MM/yyyy HH:mm', { locale: fr })} - 
                                {format(new Date(proposedSlot.endDate), 'HH:mm', { locale: fr })}
                              </Typography>
                            </Grid>

                            <Grid size={{ xs: 12, md: 4 }}>
                              {slotStatus === 'approved' ? (
                                <Chip 
                                  label="✓ Validé" 
                                  color="success" 
                                  size="small" 
                                  variant="outlined"
                                />
                              ) : (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={loadingTimeslotActions[slotKey] === 'approve' ? 
                                      <CircularProgress size={16} color="inherit" /> : 
                                      <CheckCircle />
                                    }
                                    disabled={!!loadingTimeslotActions[slotKey]}
                                    onClick={() => handleApproveTimeslot(0, proposedSlot.id)}
                                  >
                                    {loadingTimeslotActions[slotKey] === 'approve' ? 'Validation...' : 
                                      slotStatus === 'new' ? 'Valider nouveau' : 'Valider modif'}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={loadingTimeslotActions[slotKey] === 'reject' ? 
                                      <CircularProgress size={16} color="inherit" /> : 
                                      <Cancel />
                                    }
                                    disabled={!!loadingTimeslotActions[slotKey]}
                                    onClick={() => handleRejectTimeslot(0, proposedSlot.id)}
                                  >
                                    {loadingTimeslotActions[slotKey] === 'reject' ? 'Rejet...' : 'Rejeter'}
                                  </Button>
                                </Box>
                              )}
                            </Grid>
                          </Grid>
                          
                          {/* Indicateur de statut */}
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Statut: 
                            </Typography>
                            <Chip
                              size="small"
                              label={
                                slotStatus === 'approved' ? 'Validé' :
                                slotStatus === 'new' ? 'Nouveau créneau' : 
                                'Modification en attente'
                              }
                              color={
                                slotStatus === 'approved' ? 'success' :
                                slotStatus === 'new' ? 'info' : 'warning'
                              }
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      )
                    })}
                  </Box>
                </Box>

                {/* Boutons d'action pour approuver/rejeter les changements */}
                <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/calendrier/approve-timeslots', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: event.id })
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (onApproveTimeSlotChanges && data.event) {
                            onApproveTimeSlotChanges(data.event);
                          }
                        }
                      } catch (error) {
                        console.error('Erreur lors de l\'approbation:', error);
                      }
                    }}
                  >
                    Approuver tous les créneaux
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<Cancel />}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/calendrier/reject-timeslots', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ eventId: event.id })
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (onRejectTimeSlotChanges && data.event) {
                            onRejectTimeSlotChanges(data.event);
                          }
                        }
                      } catch (error) {
                        console.error('Erreur lors du rejet:', error);
                      }
                    }}
                  >
                    Rejeter tous les créneaux
                  </Button>
                </Box>
              </Grid>
            )}
            
            <Grid size = {{ xs: 12, sm: 12 }}>
            {/* Option 1 - Avec icônes et mise en page alignée */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: isMobile ? 'flex-start' : 'center', 
              gap: isMobile ? 1 : 2,
              py: 0.5,
              borderLeft: 3,
              borderColor: 'primary.main',
              flexDirection: isMobile ? 'column' : 'row',
              pl: 1.5,
              mb: 1,
              width: '100%',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography sx= {{ fontWeight: 500, textTransform: 'uppercase' }}>
                  {format(eventDate, 'EEEE d MMMM', { locale: fr })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography color="text.secondary" sx= {{ fontWeight: 500, textTransform: 'uppercase' }}>
                  {format(eventStartTime, 'HH:mm')} - {format(eventEndTime, 'HH:mm')}
                </Typography>
              </Box>
            </Box>
            </Grid>
            <Grid size = {{ xs: 12, sm: 12 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Durée
              </Typography>
              <Typography variant="body1">
                <HourglassTop sx={{ fontSize: 16, color: 'text.secondary' }} /> {calculateDuration()} heure{calculateDuration() > 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>

          {/* Informations de localisation */}
          {(event.class || event.room) && (
            <>

              <Grid container spacing={2}>
                {event.class && (
                  <Grid size = {{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Classe
                    </Typography>
                    <Typography variant="body1">
                      <School sx={{ fontSize: 16, color: 'text.secondary' }} /> {event.class}
                    </Typography>
                  </Grid>
                )}
                {event.room && (
                  <Grid size = {{ xs: 12, sm: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Salle
                    </Typography>
                    <Typography variant="body1">
                      <Room sx={{ fontSize: 16, color: 'text.secondary' }} /> {event.room}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </>
          )}

{/* Matériel et réactifs */}
{((event.materials && event.materials.length > 0) || 
  (event.chemicals && event.chemicals.length > 0)) && (
  <>
    <Divider />
    <Box>
      <Typography variant="h6" gutterBottom>
        Ressources nécessaires
      </Typography>
      <Box 
      sx ={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        mt: 1,
        width: '100%',
      }}
      >
        {/* Table combinée pour Matériel et Réactifs chimiques */}
        <TableContainer 
          sx={{ mt: 2,
            maxWidth: 600,
            margin: '0 auto',
          }}>
          <Table size="small" sx={{ minWidth: 300 }}>
            <TableHead>
              <TableRow>
                <TableCell 
                  sx={{ 
                    fontWeight: 'bold',
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main'
                  }}
                >
                  Type / Nom
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    fontWeight: 'bold',
                    borderBottom: '2px solid',
                    borderColor: 'primary.main',
                    color: 'primary.main'
                  }}
                >
                  Quantité
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
{/* Section Matériel */}
{event.materials && event.materials.length > 0 && (
  <>
    <TableRow>
      <TableCell 
        colSpan={3} 
        sx={{ 
          bgcolor: 'action.hover',
          py: 0.5,
          borderBottom: 'none'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Science sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="caption" fontWeight="medium" color="text.secondary">
            MATÉRIEL
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
    {event.materials.map((material, index) => (
      <TableRow 
        key={`material-${index}`}
        sx={{ 
          '&:hover': { bgcolor: 'action.hover' },
          '& td': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' }
        }}
      >
        <TableCell>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1 
          }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">
                {typeof material === 'string' 
                  ? material 
                  : (material.name || material.itemName || 'Matériel')}
              </Typography>
              {typeof material === 'object' && material.volume && (
                <Typography variant="caption" color="text.secondary">
                  Volume: {material.volume}
                </Typography>
              )}
            </Box>
            {typeof material === 'object' && material.isCustom && (
              <Chip 
                label="Non inventorié" 
                size="small" 
                color="info" 
                variant="outlined"
                sx={{ 
                  height: 20,
                  fontSize: '0.7rem',
                  '& .MuiChip-label': { px: 1 },
                  fontVariant: 'small-caps',
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight="medium" color="info.main">
            {typeof material === 'object' && material.quantity 
              ? `${material.quantity} ${material.quantity > 1 ? 'unités' : 'unité'}`
              : '1 unité'
            }
          </Typography>
        </TableCell>
      </TableRow>
    ))}
  </>
)}

              {/* Section Réactifs chimiques */}
              {event.chemicals && event.chemicals.length > 0 && (
                <>
                  <TableRow>
                    <TableCell 
                      colSpan={3} 
                      sx={{ 
                        bgcolor: 'action.hover',
                        py: 0.5,
                        borderBottom: 'none',
                        borderTop: (event.materials?.length ?? 0) > 0 ? '2px solid' : 'none',
                        borderColor: 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SiMoleculer size={16} color="green" />
                        <Typography variant="caption" fontWeight="medium" color="text.secondary">
                          RÉACTIFS CHIMIQUES
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                  {event.chemicals.map((chemical, index) => (
                    <TableRow 
                      key={`chemical-${index}`}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        '& td': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1 
                        }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 250,
                                display: 'block'
                              }}
                              title={typeof chemical === 'string' ? chemical : (chemical.name || 'Réactif')}
                            >
                              {typeof chemical === 'string' 
                                ? chemical 
                                : (chemical.name || 'Réactif')}
                            </Typography>
                            {typeof chemical === 'object' && chemical.formula && (
                              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                                {chemical.formula}
                              </Typography>
                            )}
                          </Box>
                          {typeof chemical === 'object' && chemical.isCustom && (
                            <Chip 
                              label="Non inventorié" 
                              size="small" 
                              color="info" 
                              variant="outlined"
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                '& .MuiChip-label': { px: 1 },
                                fontVariant: 'small-caps',
                                textTransform: 'uppercase',
                                fontWeight: 'bold',
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" color="warning.main">
                          {typeof chemical === 'object' && chemical.requestedQuantity 
                            ? `${chemical.requestedQuantity} ${chemical.unit || 'unité'}`
                            : '-'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

            </TableBody>
          </Table>
        </TableContainer>
      </Box>
        {/* Alert pour les réactifs personnalisés */}
        {event.chemicals && event.chemicals.some(c =>
          typeof c === 'object' && (c.isCustom || c.id?.endsWith('_CUSTOM'))
        ) && (
<MuiAlert
      severity="info" 
      sx={{
        mt: 2,
        width: 'auto',
        maxWidth: 600,
        margin: '16px auto 0'
      }}
      icon={<InfoOutlined />}
    >
      {(() => {
        // La logique pour trouver les réactifs custom non inventoriés
        const customChemicals = event.chemicals.filter(c =>
          // Garde la vérification de type au cas où 'c' ne serait pas un objet valide
          typeof c === 'object' && (c.isCustom || c.id?.endsWith('_CUSTOM')) // Correction de la condition CUSTOM ici
        );

        const customNames = customChemicals.map(c =>
          typeof c === 'object' ? c.name : ''
        ).filter(Boolean); // .filter(Boolean) retire les chaînes vides ou null/undefined

        if (customNames.length === 1) {
          // Cas où il y a un seul réactif custom non inventorié
          return (
            <>
              <Typography variant="body2">
                Le réactif "{customNames[0]}" n'est pas inventorié.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Le laboratoire sera informé de cette demande personnalisée.
              </Typography>
            </>
          );
        } else {
          // Cas où il y a plusieurs réactifs custom non inventoriés
          return (
            <>
              <Typography variant="body2">
                {customNames.length} réactifs ne sont pas inventoriés :
              </Typography>
              <List dense sx={{ mt: 0, p: 0, gap:0 }}> {/* 'dense' pour une liste plus compacte, 'p:0' pour retirer le padding par défaut de la List */}
                {customNames.map((name, index) => (
                  <ListItem key={name || index} disablePadding> {/* 'disablePadding' pour retirer le padding par défaut du ListItem */}
                    <ListItemText primary={name} />
                  </ListItem>
                ))}
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Le laboratoire sera informé de ces demandes personnalisées.
              </Typography>
            </>
          );
        }
      })()}
    </MuiAlert>
        )}
    </Box>
  </>
)}

          {/* Remarques */}
          {event.remarks && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Remarques
                </Typography>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'grey.50', 
                    borderRadius: 1,
                    '& p': { margin: 0 },
                    '& ul, & ol': { marginTop: 0, marginBottom: 0 }
                  }}
                  dangerouslySetInnerHTML={{ __html: event.remarks }}
                />
              </Box>
            </>
          )}

          {/* Documents joints - Section améliorée */}
          {documents.length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  {documents.length > 1
                    ? `Documents joints (${documents.length})`
                    : 'Document joint'}
                </Typography>
                <Stack 
                  direction="row" 
                  spacing={2} 
                  sx={{ 
                    overflowX: 'auto',
                    pb: 1,
                    '&::-webkit-scrollbar': {
                      height: 8,
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'rgba(0,0,0,0.1)',
                      borderRadius: 4,
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      borderRadius: 4,
                    }
                  }}
                >
                  {documents.map((doc, index) => (
                    <Box key={index} sx={{ flexShrink: 0 }}>
                      <DocumentCard 
                        document={doc} 
                        onOpenError={setErrorMessage}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          {/* Métadonnées */}
          <Divider sx={{ my: 2 }} />
          
          {/* Historique des modifications */}
{/* Historique des modifications */}
{(timelineData.length > 0 || event.createdAt) && (
  <>
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <History /> Historique
      </Typography>
      
      {loadingUsers ? (
        <Stack spacing={2}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="50%" />
        </Stack>
      ) : (
        <Timeline position="alternate" sx={{ mt: 0, pt: 0 }}>
          {/* Date d'ajout en premier */}
          {event.createdAt && (
            <TimelineItem 
              sx={{
                minHeight: 60,
                '&::before': {
                  flex: 0,
                  padding: 0,
                }
              }}
            >
              <TimelineOppositeContent
                sx={{ 
                  m: 'auto 0',
                  py: 0.5
                }}
                align="right"
                variant="body2"
                color="text.secondary"
              >
                {formatDate(event.createdAt)}
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Avatar
                    sx={{ 
                      bgcolor: 'success.main', 
                      width: 24, 
                      height: 24, 
                      fontSize: '0.75rem' 
                    }}
                  >
                    <Person sx={{ fontSize: 16, color: 'white' }} />
                  </Avatar>
                </Box>
                {timelineData.length > 0 && <TimelineConnector sx={{ bgcolor: 'grey.400', height: '20px' }} />}
              </TimelineSeparator>
              
              <TimelineContent sx={{ py: 0.5, px: 2 }}>
                <Typography variant="body2" component="span" fontWeight="medium">
                  {creatorInfo ? (creatorInfo.name || creatorInfo.email) : 'Utilisateur'}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  a ajouté l'événement
                </Typography>
              </TimelineContent>
            </TimelineItem>
          )}

          {/* Modifications suivantes */}
          {timelineData.map((item, index) => {
            const isAlternate = (event.createdAt ? index + 1 : index) % 2 === 0
            const previousUserId = index > 0 ? timelineData[index - 1].userId : event.createdBy
            const isSameUserAsPrevious = item.userId === previousUserId
            
            return (
              <TimelineItem 
                key={index}
                sx={{
                  minHeight: isSameUserAsPrevious ? 40 : 60,
                  '&::before': {
                    flex: 0,
                    padding: 0,
                  }
                }}
              >
                <TimelineOppositeContent
                  sx={{ 
                    m: 'auto 0',
                    py: isSameUserAsPrevious ? 0.1 : 0.5
                  }}
                  align={isAlternate ? "right" : "left"}
                  variant="body2"
                  color="text.secondary"
                >
                  {formatDate(item.date)}
                </TimelineOppositeContent>
                
                <TimelineSeparator>
                  <TimelineConnector sx={{ 
                    bgcolor: isSameUserAsPrevious ? 'grey.300' : 'grey.400',
                    height: isSameUserAsPrevious ? '10px' : '20px'
                  }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!isSameUserAsPrevious && (
                      <Avatar
                        sx={{ 
                          bgcolor: 'primary.main', 
                          width: 24, 
                          height: 24, 
                          fontSize: '0.75rem' 
                        }}
                      >
                        <Person sx={{ fontSize: 16, color: 'white' }} />
                      </Avatar>
                    )}
                    {isSameUserAsPrevious && (
                      <TimelineDot 
                        color={index === timelineData.length - 1 ? "primary" : "grey"}
                        variant="outlined"
                        sx={{ 
                          width: 10,
                          height: 10,
                          margin: 0,
                          transition: 'all 0.3s'
                        }}
                      />
                    )}
                  </Box>
                  
                  {index < timelineData.length - 1 && (
                    <TimelineConnector sx={{ 
                      bgcolor: timelineData[index + 1]?.userId === item.userId ? 'grey.300' : 'grey.400',
                      height: timelineData[index + 1]?.userId === item.userId ? '5px' : '20px'
                    }} />
                  )}
                </TimelineSeparator>
                
                <TimelineContent sx={{ 
                  py: isSameUserAsPrevious ? 0.1 : 0.5,
                  px: 2 
                }}>
                  {!isSameUserAsPrevious ? (
                    <Typography variant="body2" component="span" fontWeight="medium">
                      {item.userName}
                    </Typography>
                  ) : (
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      sx={{ fontStyle: 'italic' }}
                    >
                      Modification supplémentaire
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            )
          })}
        </Timeline>
      )}
    </Box>
  </>
)}


{/* Ajouter dans la section historique, après l'historique des modifications */}
{/* Historique des modifications de créneaux */}
{event.timeSlots && event.timeSlots.some(slot => slot.modifiedBy && slot.modifiedBy.length > 0) && (
  <>
    <Divider sx={{ my: 2 }} />
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Schedule /> Historique des créneaux
      </Typography>
      
      {event.timeSlots.map((slot, slotIndex) => {
        if (!slot.modifiedBy || slot.modifiedBy.length === 0) return null;
        
        const slotStart = new Date(slot.startDate);
        const slotEnd = new Date(slot.endDate);
        
        return (
          <Box key={slot.id+"_"+slotIndex} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: 'primary.main'
            }}>
              <CalendarToday fontSize="small" />
              Créneau {slotIndex + 1}: {format(slotStart, 'dd/MM/yyyy HH:mm')} - {format(slotEnd, 'HH:mm')}
            </Typography>
            
            <Timeline position="right" sx={{ mt: 1, pl: 2 }}>
              {slot.modifiedBy.map((change, changeIndex) => {
                const userInfo = usersInfo[change.userId];
                const userName = userInfo?.name || userInfo?.email || `Utilisateur ${change.userId}`;
                
                return (
                  <TimelineItem key={changeIndex} sx={{ minHeight: 50 }}>
                    <TimelineSeparator>
                      {changeIndex > 0 && <TimelineConnector sx={{ height: 10 }} />}
                      <TimelineDot 
                        variant="outlined"
                        color={
                          change.action === 'created' ? 'success' :
                          change.action === 'modified' ? 'info' :
                          change.action === 'deleted' ? 'error' : 'grey'
                        }
                        sx={{ width: 24, height: 24 }}
                      >
                        {change.action === 'created' && <Add sx={{ fontSize: 14 }} />}
                        {change.action === 'modified' && <Edit sx={{ fontSize: 14 }} />}
                        {change.action === 'deleted' && <Delete sx={{ fontSize: 14 }} />}
                      </TimelineDot>
                      {changeIndex < (slot.modifiedBy?.length ?? 0) - 1 && <TimelineConnector sx={{ height: 10 }} />}
                    </TimelineSeparator>
                    
                    <TimelineContent sx={{ py: 0.5, px: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(change.date)}
                      </Typography>
                      <Typography variant="body2" component="div">
                        <strong>{userName}</strong>
                      </Typography>
                      <Typography variant="caption" component="div" sx={{ 
                        fontWeight: 'bold', 
                        textTransform: 'uppercase',
                        color: 
                          change.action === 'created' ? 'success.main' :
                          change.action === 'modified' ? 'info.main' :
                          change.action === 'deleted' ? 'error.main' : 'text.primary'
                      }}>
                        {change.action === 'created' ? 'Créneau créé' :
                         change.action === 'modified' ? 'Créneau modifié' :
                         change.action === 'deleted' ? 'Créneau supprimé' : change.action}
                      </Typography>
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </Box>
        );
      })}
    </Box>
  </>
)}
        </Stack>
      </DialogContent>
      
        <DialogActions>
            {/* Actions EventActions en haut pour tous */}
<Box sx={{ 
  display: 'flex',
  flexDirection: isTablet || isMobile ? 'column' : 'row',
  width: '100%',
  gap:isTablet || isMobile ? 1 : 2,
   }}>
  {/* Bloc 1 : 4 boutons d'état (2x2 sur grand écran, 4x1 sur mobile/tablette) */}
  {canValidate && (
    <Grid
      container
      spacing={1}
      sx={{
        mb: 1,
        width: '100%',
        minWidth: isMobile || isTablet ? 300 : '40%',
        maxWidth: isMobile || isTablet ? 400 : '40%',
        margin: isMobile ? '0 auto' : '0 auto',
      }}
    >
      {[
        {
          label: 'En préparation',
          onClick: () => openUnifiedDialog('in-progress'),
          variant: 'outlined',
          color: 'primary',
          icon: <ManageHistory />,
          disabled: event.state === 'IN_PROGRESS',
        },
        {
          label: 'Déplacer TP',
          onClick: () => openUnifiedDialog('move'),
          variant: 'outlined',
          color: 'inherit',
          icon: <SwapHoriz />,
          disabled: event.state === 'MOVED',
        },
        {
          label: 'Annuler TP',
          onClick: () => openUnifiedDialog('cancel'),
          variant: 'outlined',
          color: 'error',
          icon: <Cancel />,
          disabled: event.state === 'CANCELLED',
        },
        {
          label: 'Valider TP',
          onClick: () => openUnifiedDialog('validate'),
          variant: 'contained',
          color: 'success',
          icon: <CheckCircle />,
          disabled: event.state === 'VALIDATED',
        },
      ].map((btn, idx) => (
        <Grid
          key={btn.label}
          size={{ xs: 12, sm: 6 }} // Responsive sizing
        >
          <Button
            onClick={btn.onClick}
            variant={btn.variant as any}
            color={btn.color as any}
            startIcon={btn.icon}
            fullWidth
            disabled={btn.disabled}
            sx={{ minWidth: 120 }}
          >
            {btn.label}
          </Button>
        </Grid>
      ))}
    </Grid>
  )}

  {/* Bloc 2 : Modifier/Supprimer (1x2 sur grand écran, 2x1 sur mobile/tablette) */}
  {(onEdit || (onEdit && onDelete)) && (
    <Grid
      container
      spacing={1}
      sx={{
        mb: 1,
        width: '100%',
        minWidth: isMobile || isTablet ? 300 : '40%',
        maxWidth: isMobile || isTablet ? 400 : '40%',
        margin: isMobile ? '0 auto' : '0 auto',
      }}
    >
      {onEdit && (
        <Grid size={{ xs: 12,  sm: 6 }} >
          <Button
            onClick={() => onEdit(event)}
            variant="outlined"
            startIcon={<Edit />}
            fullWidth
            sx={{ minWidth: 120 }}
          >
            Modifier
          </Button>
        </Grid>
      )}
      {onDelete && (
        <Grid size={{ xs: 12, sm: 6 }} >
          <Button
            onClick={() => onDelete(event)}
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            fullWidth
            sx={{ minWidth: 120 }}
          >
            Supprimer
          </Button>
        </Grid>
      )}
    </Grid>
  )}

  {/* Bloc 3 : Fermer */}
  <Box
    sx={{
      display: 'flex',
      gap: 1,
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: isMobile || isTablet ? 'center' : 'flex-end',
      alignContent: 'center',
      minWidth: (isMobile || isTablet) && (onEdit && canValidate) ? 100 : '15%',
      maxWidth: (isMobile || isTablet) && (onEdit && canValidate) ? 100 : '15%',
      width: 'auto',
      margin: isMobile ? '0 auto' : '0 auto',
    }}
  >
    <Button 
    variant='contained'
    fullWidth
    onClick={onClose}>Fermer</Button>
  </Box>
</Box>
        </DialogActions>
  </Dialog>

      {/* Snackbar pour les messages d'erreur */}
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setErrorMessage(null)} 
          severity="error" 
          variant="filled"
        >
          {errorMessage}
        </MuiAlert>
      </Snackbar>

      {/* Snackbar pour les messages de succès */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          variant="filled"
        >
          {successMessage}
        </MuiAlert>
      </Snackbar>
  </>
  )
}

export default EventDetailsDialog