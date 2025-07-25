// components/calendar/FileUploadSection.tsx
"use client"

import React, { useState, useEffect } from 'react'
import {
  Box, Typography, IconButton, Card, Stack, Chip,
  LinearProgress, Alert, Tooltip, Button
} from '@mui/material'
import {
  CloudUpload, Delete, InsertDriveFile, Image,
  PictureAsPdf, Description, Clear, CheckCircle, Error as ErrorIcon,
  Cancel
} from '@mui/icons-material'

interface FileWithMetadata {
  file: File
  id: string
  uploadProgress?: number
  error?: string
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'
  fileContent?: string // URL du fichier après upload
}

interface FileUploadSectionProps {
  files: FileWithMetadata[]
  onFilesChange: (files: FileWithMetadata[]) => void
  maxFiles?: number
  maxSizePerFile?: number // en MB
  acceptedTypes?: string[]
  autoUpload?: boolean // Pour déclencher l'upload automatiquement
}

interface FileUploadSectionProps {
  files: FileWithMetadata[]
  onFilesChange: (files: FileWithMetadata[]) => void
  maxFiles?: number
  maxSizePerFile?: number
  acceptedTypes?: string[]
  autoUpload?: boolean
}


export function FileUploadSection({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif'],
  autoUpload = true
}: FileUploadSectionProps) {
  const [dragOver, setDragOver] = useState(false)
  const [activeUploads, setActiveUploads] = useState<Record<string, XMLHttpRequest>>({})

  const handleFileSelection = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: FileWithMetadata[] = []
    const errors: string[] = []

    Array.from(selectedFiles).forEach((file) => {
      // Vérifier le nombre de fichiers
      if (files.length + newFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} fichiers autorisés`)
        return
      }

      // Vérifier la taille
      if (file.size > maxSizePerFile * 1024 * 1024) {
        errors.push(`${file.name} dépasse la taille maximale de ${maxSizePerFile}MB`)
        return
      }

      // Vérifier le type
      const extension = `.${file.name.split('.').pop()?.toLowerCase()}`
      if (!acceptedTypes.some(type => extension === type)) {
        errors.push(`${file.name} n'est pas un type de fichier accepté`)
        return
      }

      // Vérifier les doublons
      if (files.some(f => f.file.name === file.name)) {
        errors.push(`${file.name} est déjà ajouté`)
        return
      }

      newFiles.push({
        file,
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uploadProgress: 0,
        uploadStatus: 'pending'
      })
    })

    if (errors.length > 0) {
      alert(errors.join('\n'))
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelection(e.dataTransfer.files)
  }

  const handleFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = acceptedTypes.join(',')
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      handleFileSelection(target.files)
    }
    input.click()
  }

 
  // Fonction uploadToServer complète avec gestion des XHR
  const uploadToServer = async (fileItem: FileWithMetadata) => {
    try {
      updateFileProgress(fileItem.id, 0, 'uploading')

      const formData = new FormData()
      formData.append('file', fileItem.file)

      const xhr = new XMLHttpRequest()

      // Stocker le xhr pour pouvoir l'annuler
      setActiveUploads(prev => ({ ...prev, [fileItem.id]: xhr }))

      return new Promise<void>((resolve, reject) => {
        // Gestion de la progression
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            updateFileProgress(fileItem.id, progress, 'uploading')
          }
        })

        // Upload réussi
        xhr.addEventListener('load', () => {
          // Retirer le xhr des uploads actifs
          setActiveUploads(prev => {
            const { [fileItem.id]: _, ...rest } = prev
            return rest
          })

          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText)
              updateFileProgress(
                fileItem.id, 
                100, 
                'completed', 
                response.fileUrl || response.path
              )
              resolve()
            } catch {
              updateFileProgress(fileItem.id, 0, 'error', undefined, 'Réponse serveur invalide')
              reject(new Error('Réponse serveur invalide'))
            }
          } else {
            let errorMessage = 'Erreur serveur'
            try {
              const errorResponse = JSON.parse(xhr.responseText)
              errorMessage = errorResponse.error || errorMessage
            } catch {}
            
            updateFileProgress(fileItem.id, 0, 'error', undefined, errorMessage)
            reject(new Error(errorMessage))
          }
        })

        // Erreur réseau
        xhr.addEventListener('error', () => {
          setActiveUploads(prev => {
            const { [fileItem.id]: _, ...rest } = prev
            return rest
          })
          updateFileProgress(fileItem.id, 0, 'error', undefined, 'Erreur réseau')
          reject(new Error('Erreur réseau'))
        })

        // Upload annulé
        xhr.addEventListener('abort', () => {
          setActiveUploads(prev => {
            const { [fileItem.id]: _, ...rest } = prev
            return rest
          })
          updateFileProgress(fileItem.id, fileItem.uploadProgress || 0, 'cancelled', undefined, 'Upload annulé')
          reject(new Error('Upload annulé'))
        })

        // Timeout après 5 minutes
        xhr.timeout = 300000
        xhr.addEventListener('timeout', () => {
          setActiveUploads(prev => {
            const { [fileItem.id]: _, ...rest } = prev
            return rest
          })
          updateFileProgress(fileItem.id, 0, 'error', undefined, 'Délai d\'attente dépassé')
          reject(new Error('Délai d\'attente dépassé'))
        })

        xhr.open('POST', '/api/upload')
        xhr.send(formData)
      })
    } catch (error) {
      // Nettoyer en cas d'erreur
      setActiveUploads(prev => {
        const { [fileItem.id]: _, ...rest } = prev
        return rest
      })
      updateFileProgress(fileItem.id, 0, 'error', undefined, 'Erreur lors de l\'upload')
      throw error
    }
  }

  // Fonction pour annuler un upload
  const cancelUpload = (fileId: string) => {
    const xhr = activeUploads[fileId]
    if (xhr) {
      xhr.abort()
    }
  }

  // Mettre à jour la progression d'un fichier
  const updateFileProgress = (
    fileId: string, 
    progress: number, 
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled',
    fileContent?: string,
    error?: string
  ) => {
    onFilesChange(
      files.map(f => 
        f.id === fileId 
          ? { ...f, uploadProgress: progress, uploadStatus: status, fileContent, error }
          : f
      )
    )
  }

  // Nettoyer les uploads actifs au démontage du composant
  useEffect(() => {
    return () => {
      // Annuler tous les uploads actifs
      Object.values(activeUploads).forEach(xhr => {
        xhr.abort()
      })
    }
  }, [])

  // Upload automatique
  useEffect(() => {
    if (autoUpload) {
      files
        .filter(f => f.uploadStatus === 'pending')
        .forEach(async (fileItem) => {
          try {
            await uploadToServer(fileItem)
          } catch (error) {
            console.error('Erreur upload:', error)
          }
        })
    }
  }, [files, autoUpload])

  // ... autres fonctions (handleFileSelection, handleDragOver, etc.) ...

  const removeFile = (fileId: string) => {
    // Annuler l'upload si en cours
    if (files.find(f => f.id === fileId)?.uploadStatus === 'uploading') {
      cancelUpload(fileId)
    }
    onFilesChange(files.filter(f => f.id !== fileId))
  }

  // Fonction pour réessayer un upload échoué
  const retryUpload = async (fileId: string) => {
    const fileItem = files.find(f => f.id === fileId)
    if (fileItem && (fileItem.uploadStatus === 'error' || fileItem.uploadStatus === 'cancelled')) {
      updateFileProgress(fileId, 0, 'pending')
      try {
        await uploadToServer(fileItem)
      } catch (error) {
        console.error('Erreur lors de la nouvelle tentative:', error)
      }
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'uploading':
        return 'primary'
      case 'cancelled':
        return 'warning'
      default:
        return 'inherit'
    }
  }

  return (
    <Box>
      {/* Zone de dépôt - reste identique */}
      <Card
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
          mb: 2
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileInput}
      >
        <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          Glissez-déposez vos fichiers ici
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ou cliquez pour parcourir
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {acceptedTypes.join(', ')} • Max {maxSizePerFile}MB par fichier • {files.length}/{maxFiles} fichiers
        </Typography>
      </Card>

      {/* Liste des fichiers avec boutons d'action */}
      {files.length > 0 && (
        <Stack spacing={1}>
          {files.map((fileItem) => (
            <Card 
              key={fileItem.id} 
              sx={{ 
                p: 1.5,
                borderLeft: 4,
                borderColor: `${getStatusColor(fileItem.uploadStatus)}.main`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                {getFileIcon(fileItem.file.name)}
                <Box flexGrow={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" noWrap>
                      {fileItem.file.name}
                    </Typography>
                    {fileItem.uploadStatus === 'completed' && (
                      <CheckCircle color="success" sx={{ fontSize: 16 }} />
                    )}
                    {fileItem.uploadStatus === 'error' && (
                      <ErrorIcon color="error" sx={{ fontSize: 16 }} />
                    )}
                    {fileItem.uploadStatus === 'cancelled' && (
                      <Cancel color="warning" sx={{ fontSize: 16 }} />
                    )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(fileItem.file.size)}
                    </Typography>
                    {fileItem.uploadStatus === 'uploading' && (
                      <Typography variant="caption" color="primary">
                        • Téléchargement {fileItem.uploadProgress}%
                      </Typography>
                    )}
                    {fileItem.uploadStatus === 'completed' && (
                      <Typography variant="caption" color="success.main">
                        • Téléchargé
                      </Typography>
                    )}
                    {fileItem.uploadStatus === 'error' && (
                      <Typography variant="caption" color="error">
                        • Erreur
                      </Typography>
                    )}
                    {fileItem.uploadStatus === 'cancelled' && (
                      <Typography variant="caption" color="warning.main">
                        • Annulé
                      </Typography>
                    )}
                  </Box>
                </Box>
                
                {/* Boutons d'action */}
                <Box display="flex" gap={0.5}>
                  {/* Bouton annuler pour les uploads en cours */}
                  {fileItem.uploadStatus === 'uploading' && (
                    <Tooltip title="Annuler l'upload">
                      <IconButton
                        size="small"
                        color="warning"
                        onClick={() => cancelUpload(fileItem.id)}
                      >
                        <Cancel fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {/* Bouton réessayer pour les erreurs et annulations */}
                  {(fileItem.uploadStatus === 'error' || fileItem.uploadStatus === 'cancelled') && (
                    <Tooltip title="Réessayer">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => retryUpload(fileItem.id)}
                      >
                        <CloudUpload fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  
                  {/* Bouton supprimer */}
                  <Tooltip title="Supprimer">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => removeFile(fileItem.id)}
                        disabled={fileItem.uploadStatus === 'uploading'}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
              
              {/* Barre de progression */}
              {fileItem.uploadStatus === 'uploading' && (
                <Box sx={{ mt: 1, position: 'relative' }}>
                  <LinearProgress
                    variant="determinate"
                    value={fileItem.uploadProgress || 0}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        backgroundColor: 'primary.main'
                      }
                    }}
                  />
                  {/* Affichage du pourcentage au centre */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      bgcolor: 'background.paper',
                      px: 0.5,
                      borderRadius: 1,
                      boxShadow: 1
                    }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      {fileItem.uploadProgress}%
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Affichage de l'erreur */}
              {fileItem.error && (
                <Alert 
                  severity={fileItem.uploadStatus === 'cancelled' ? 'warning' : 'error'}
                  sx={{ 
                    mt: 1, 
                    py: 0,
                    '& .MuiAlert-message': {
                      fontSize: '0.75rem'
                    }
                  }}
                >
                  {fileItem.error}
                </Alert>
              )}

                            {/* Overlay de progression pour l'effet visuel */}
              {fileItem.uploadStatus === 'uploading' && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'primary.main',
                    opacity: 0.05,
                    width: `${fileItem.uploadProgress}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              )}
            </Card>
          ))}
        </Stack>
      )}

      {files.length >= maxFiles && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Nombre maximum de fichiers atteint ({maxFiles})
        </Alert>
      )}

      {/* Résumé du statut des uploads */}
      {files.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {files.filter(f => f.uploadStatus === 'completed').length > 0 && (
            <Chip
              icon={<CheckCircle />}
              label={`${files.filter(f => f.uploadStatus === 'completed').length} téléchargé${files.filter(f => f.uploadStatus === 'completed').length > 1 ? 's' : ''}`}
              color="success"
              size="small"
              variant="outlined"
            />
          )}
          {files.filter(f => f.uploadStatus === 'uploading').length > 0 && (
            <Chip
              icon={<CloudUpload />}
              label={`${files.filter(f => f.uploadStatus === 'uploading').length} en cours`}
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
          {files.filter(f => f.uploadStatus === 'error').length > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={`${files.filter(f => f.uploadStatus === 'error').length} erreur${files.filter(f => f.uploadStatus === 'error').length > 1 ? 's' : ''}`}
              color="error"
              size="small"
              variant="outlined"
            />
          )}
          {files.filter(f => f.uploadStatus === 'cancelled').length > 0 && (
            <Chip
              icon={<Cancel />}
              label={`${files.filter(f => f.uploadStatus === 'cancelled').length} annulé${files.filter(f => f.uploadStatus === 'cancelled').length > 1 ? 's' : ''}`}
              color="warning"
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}

      {/* Actions globales si nécessaire */}
      {files.some(f => f.uploadStatus === 'uploading') && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Cancel />}
            onClick={() => {
              // Annuler tous les uploads en cours
              files
                .filter(f => f.uploadStatus === 'uploading')
                .forEach(f => cancelUpload(f.id))
            }}
          >
            Annuler tous les uploads
          </Button>
        </Box>
      )}

      {files.some(f => f.uploadStatus === 'error' || f.uploadStatus === 'cancelled') && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CloudUpload />}
            onClick={() => {
              // Réessayer tous les échecs
              files
                .filter(f => f.uploadStatus === 'error' || f.uploadStatus === 'cancelled')
                .forEach(f => retryUpload(f.id))
            }}
          >
            Réessayer les échecs
          </Button>
        </Box>
      )}
    </Box>
  )
}

// Ajout des fonctions manquantes pour la gestion complète

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || ''
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
    return <Image color="success" />
  } else if (extension === 'pdf') {
    return <PictureAsPdf color="error" />
  } else if (['doc', 'docx'].includes(extension)) {
    return <Description color="info" />
  }
  
  return <InsertDriveFile />
}

const formatFileSize = (bytes: number): string => {
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}