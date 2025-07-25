// components/calendar/FileUploadSection.tsx
"use client"

import React, { useState } from 'react'
import {
  Box, Typography, IconButton, Card, Stack, Chip,
  LinearProgress, Alert, Tooltip
} from '@mui/material'
import {
  CloudUpload, Delete, InsertDriveFile, Image,
  PictureAsPdf, Description, Clear
} from '@mui/icons-material'

interface FileWithMetadata {
  file: File
  id: string
  uploadProgress?: number
  error?: string
}

interface FileUploadSectionProps {
  files: FileWithMetadata[]
  onFilesChange: (files: FileWithMetadata[]) => void
  maxFiles?: number
  maxSizePerFile?: number // en MB
  acceptedTypes?: string[]
}

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

export function FileUploadSection({
  files,
  onFilesChange,
  maxFiles = 5,
  maxSizePerFile = 10, // 10 MB par défaut
  acceptedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']
}: FileUploadSectionProps) {
  const [dragOver, setDragOver] = useState(false)

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
        uploadProgress: 0
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

  const removeFile = (fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId))
  }

  return (
    <Box>
      {/* Zone de dépôt */}
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

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <Stack spacing={1}>
          {files.map((fileItem) => (
            <Card key={fileItem.id} sx={{ p: 1.5 }}>
              <Box display="flex" alignItems="center" gap={1}>
                {getFileIcon(fileItem.file.name)}
                <Box flexGrow={1}>
                  <Typography variant="body2" noWrap>
                    {fileItem.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(fileItem.file.size)}
                  </Typography>
                </Box>
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeFile(fileItem.id)}
                  >
                    <Clear fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              {fileItem.uploadProgress !== undefined && fileItem.uploadProgress < 100 && (
                <LinearProgress
                  variant="determinate"
                  value={fileItem.uploadProgress}
                  sx={{ mt: 1 }}
                />
              )}
              {fileItem.error && (
                <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                  {fileItem.error}
                </Alert>
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
    </Box>
  )
}