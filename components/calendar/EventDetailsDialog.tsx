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
} from '@mui/material'
import {
  Timeline, TimelineItem, TimelineSeparator,
  TimelineDot, TimelineConnector, TimelineContent,
  TimelineOppositeContent
} from '@mui/lab'
import { 
  Science, Schedule, Assignment, EventAvailable, Edit, Delete, 
  History, Person, PictureAsPdf, Description, Image, Build,
  InsertDriveFile, OpenInNew, Download, CheckCircle, Cancel, SwapHoriz,
  HourglassEmpty, CalendarToday, AccessTime, Room, School, HourglassTop,
  InfoOutlined, ManageHistory
} from '@mui/icons-material'
import { CalendarEvent, EventType, EventState } from '@/types/calendar'
import { UserRole } from "@/types/global";
import { SiMoleculer } from "react-icons/si";
import { useSession } from 'next-auth/react'


interface DocumentFile {
  fileName: string
  fileUrl?: string
  fileType?: string
  fileSize?: number
  uploadedAt?: string
}

interface EventDetailsDialogProps {
  open: boolean
  event: CalendarEvent | null
  onClose: () => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onStateChange?: (event: CalendarEvent, newState: EventState, reason?: string) => void
  userRole?: UserRole
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
  userRole,
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
  // Récupérer les informations de session pour le rôle de l'utilisateur
  const { data: session } = useSession()

  // Vérifier si l'utilisateur a le droit de modifier ou supprimer l'événement
  const [validationDialog, setValidationDialog] = useState<{
    open: boolean
    event: CalendarEvent | null
    action: 'cancel' | 'move' | 'validate' | 'in-progress' | 'other' | null
  }>({ open: false, event: null, action: null })
  
  const [validationReason, setValidationReason] = useState('')

    // Vérifier si l'utilisateur peut valider
  const canValidate = userRole === 'LABORANTIN' || userRole === 'ADMINLABO'

  const getEventTypeInfo = (type: EventType) => {
    return EVENT_TYPES[type] || EVENT_TYPES.OTHER
  }

  const calculateDuration = () => {
    if (!event) return 0
    const start = typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate
    const end = typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
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
    // Ancien format avec fileName unique (rétrocompatibilité)
    else if (event.fileName) {
      documents.push({
        fileName: event.fileName,
        fileUrl: event.fileUrl || undefined,
        fileType: getFileType(event.fileName)
      })
    }
    
    return documents
  }

  // Fonction pour gérer le changement d'état
  const handleStateChange = (newState: EventState, reason?: string) => {
    if (!event) return;

    if (onStateChange) {
      onStateChange(event, newState, reason);
    }
    setValidationDialog({ open: false, action: null, event: null });
    setValidationReason('');
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
      
      console.log('User IDs collectés pour la timeline:', userIds)
      
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
          console.log('Utilisateurs récupérés:', users)
          
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

 const openValidationDialog = (event: CalendarEvent, action: 'cancel' | 'move' | 'validate' | 'in-progress') => {
    setValidationDialog({ open: true, event, action })
  }
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
          <Box display="flex" gap={1}>
            {onEdit && (
              <IconButton
                onClick={() => {
                  onEdit(event)
                  onClose()
                }}
                size="small"
                color="primary"
              >
                <Edit />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                onClick={() => {
                  onDelete(event)
                  onClose()
                }}
                size="small"
                color="error"
              >
                <Delete />
              </IconButton>
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

          {/* Informations temporelles */}
          <Grid container spacing={2}>
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
                  {format(event.startDate, 'EEEE d MMMM', { locale: fr })}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography color="text.secondary" sx= {{ fontWeight: 500, textTransform: 'uppercase' }}>
                  {format(event.startDate, 'HH:mm')} - {format(event.endDate, 'HH:mm')}
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
{event.stateChanger && event.stateChanger.length > 0 && (
  <>
    <Divider sx={{ my: 2 }} />
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SwapHoriz /> Historique des validations
      </Typography>
      
      <Timeline position="alternate" sx={{ mt: 0, pt: 0 }}>
        {event.stateChanger.map((change, index) => {
          const userInfo = usersInfo[change.userId]
          const userName = userInfo?.name || userInfo?.email || `Utilisateur ${change.userId}`
          
          return (
            <TimelineItem key={index}>
              <TimelineOppositeContent
                sx={{ m: 'auto 0' }}
                variant="body2"
                color="text.secondary"
              >
                {formatDate(change.date)}
              </TimelineOppositeContent>
              
              <TimelineSeparator>
                {index > 0 && <TimelineConnector />}
                <TimelineDot 
                  color={
                    change.toState === 'VALIDATED' ? 'success' :
                    change.toState === 'CANCELLED' ? 'error' :
                    change.toState === 'MOVED' ? 'info' :
                    change.toState === 'PENDING' ? 'warning' :
                    change.toState === 'IN_PROGRESS' ? 'info' :
                    'grey'
                  }
                >
                  {change.toState === 'VALIDATED' && <CheckCircle />}
                  {change.toState === 'CANCELLED' && <Cancel />}
                  {change.toState === 'MOVED' && <SwapHoriz />}
                  {change.toState === 'PENDING' && <HourglassEmpty />}
                  {change.toState === 'IN_PROGRESS' && <ManageHistory />}
                </TimelineDot>
                {event.stateChanger && index < event.stateChanger.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              
              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Typography variant="body2" component="div">
                  <strong>{userName}</strong>
                </Typography>
                <Typography variant="caption" component="div"
                sx= {{ fontWeight: 'bold', textTransform: 'uppercase' }}
                >
                  {getStateChangeLabel(change.fromState, change.toState)}
                </Typography>
                {change.reason && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Raison : {change.reason}
                  </Typography>
                )}
              </TimelineContent>
            </TimelineItem>
          )
        })}
      </Timeline>
    </Box>
  </>
)}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Box sx={{
          display: 'flex',
          gap: 1,
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: isMobile || isTablet ? 'center' : 'flex-end',
          alignContent: 'center',
          width: '100%',
        }}>
          <Button onClick={onClose}>Fermer</Button>

          {canValidate && (
            <Grid
              container 
              spacing={1}
              sx={{
                maxWidth: isMobile || isTablet ? 200 : 400,
                width: isMobile || isTablet ? 200 : 'auto',
                margin: isMobile ? '0 auto' : '0 0',
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
              }}
            >
              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  onClick={() => openValidationDialog(event, 'in-progress')}
                  variant="outlined"
                  color="primary"
                  startIcon={<ManageHistory />}
                  fullWidth
                  disabled={event.state === 'IN_PROGRESS'}
                >
                  En préparation
                </Button>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  onClick={() => openValidationDialog(event, 'move')}
                  variant="outlined"
                  startIcon={<SwapHoriz />}
                  fullWidth
                  disabled={event.state === 'MOVED'}
                >
                  Déplacer TP
                </Button>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  onClick={() => openValidationDialog(event, 'cancel')}
                  variant="outlined"
                  color="error"
                  startIcon={<Cancel />}
                  fullWidth
                  disabled={event.state === 'CANCELLED'}
                >
                  Annuler TP
                </Button>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Button
                  onClick={() => openValidationDialog(event, 'validate')}
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircle />}
                  fullWidth
                  disabled={event.state === 'VALIDATED'}
                >
                  Valider TP
                </Button>
              </Grid>
            </Grid>
          )}

          <Grid
            container 
            spacing={1}
            sx={{
              maxWidth: 200,
              width: isMobile || isTablet ? 200 : 'auto',
              margin: isMobile ? '0 auto' : '0 0',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'column',
              justifyContent: isMobile || isTablet ? 'center' : 'flex-end',
            }}
          >
            <Grid size={{ xs: 12, sm: 12 }}>
              {onEdit && (
                <Button 
                  onClick={() => {
                    onEdit(event)
                    onClose()
                  }}
                  variant="outlined"
                  startIcon={<Edit />}
                  fullWidth
                >
                  Modifier
                </Button>
              )}
            </Grid>

            <Grid size={{ xs: 12, sm: 12 }}>
              {onDelete && (
                <Button 
                  onClick={() => {
                    onDelete(event)
                    onClose()
                  }}
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  fullWidth
                >
                  Supprimer
                </Button>
              )}
            </Grid>
          </Grid>
        </Box>
      </DialogActions>
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
          sx={{ width: '100%' }}
        >
          {errorMessage}
        </MuiAlert>
      </Snackbar>
    </Dialog>

      {/* Dialog de confirmation pour annulation/déplacement */}
{/* Dialog de confirmation pour annulation/déplacement/validation/préparation */}
<Dialog 
  fullScreen={isMobile}
  open={validationDialog.open} 
  onClose={() => {
    setValidationDialog({ open: false, event: null, action: null })
    setValidationReason('');
  }}
  maxWidth="sm"
  fullWidth
>
  <DialogTitle>
    {validationDialog.action === 'cancel' ? 'Annuler le TP' : 
     validationDialog.action === 'move' ? 'Déplacer le TP' :
     validationDialog.action === 'validate' ? 'Valider le TP' :
     validationDialog.action === 'in-progress' ? 'Marquer en préparation' : 
     'Action non reconnue'}
  </DialogTitle>
  <DialogContent>
    <Stack spacing={2}>
      <Typography variant="body2">
        {validationDialog.action === 'cancel' 
          ? 'Êtes-vous sûr de vouloir annuler cet événement ?'
          : validationDialog.action === 'move' 
            ? 'Êtes-vous sûr de vouloir marquer cet événement comme déplacé ?'
            : validationDialog.action === 'validate'
              ? 'Êtes-vous sûr de vouloir valider cet événement ?'
              : validationDialog.action === 'in-progress'
                ? 'Êtes-vous sûr de vouloir marquer cet événement comme étant en préparation ?'
                : 'Action non reconnue. Veuillez réessayer.'}
      </Typography>
      <Typography variant="body2" fontWeight="bold">
        {event.title}
      </Typography>
      <TextField
        autoFocus
        margin="dense"
        label="Raison (optionnel)"
        fullWidth
        multiline
        rows={3}
        value={validationReason}
        onChange={(e) => setValidationReason(e.target.value)}
        placeholder={
          validationDialog.action === 'cancel' 
            ? 'Indiquez la raison de l\'annulation...'
            : validationDialog.action === 'move' 
              ? 'Indiquez la raison du déplacement...'
              : validationDialog.action === 'validate'
                ? 'Indiquez la raison de la validation...'
                : validationDialog.action === 'in-progress'
                  ? 'Indiquez la raison de la mise en préparation...'
                  : 'Indiquez une raison...'
        }
      />
    </Stack>
  </DialogContent>
  <DialogActions>
    <Button 
      onClick={() => {
        setValidationDialog({ open: false, event: null, action: null })
        setValidationReason('');
      }}
    >
      Annuler
    </Button>
    <Button
      onClick={() => {
        let newState: EventState;
        switch (validationDialog.action) {
          case 'cancel':
            newState = 'CANCELLED';
            break;
          case 'move':
            newState = 'MOVED';
            break;
          case 'validate':
            newState = 'VALIDATED';
            break;
          case 'in-progress':
            newState = 'IN_PROGRESS';
            break;
          default:
            return; // Ne rien faire si l'action n'est pas reconnue
        }
        handleStateChange(newState, validationReason);
      }}
      variant="contained"
      color={
        validationDialog.action === 'cancel' 
          ? 'error' 
          : validationDialog.action === 'move'
            ? 'primary'
            : validationDialog.action === 'validate'
              ? 'success'
              : validationDialog.action === 'in-progress'
                ? 'info'
                : 'warning'
      }
    >
      Confirmer
    </Button>
  </DialogActions>
</Dialog>
  </>
  )
}

export default EventDetailsDialog