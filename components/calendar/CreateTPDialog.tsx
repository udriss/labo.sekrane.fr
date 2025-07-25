// components/calendar/CreateTPDialog.tsx
"use client"

import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, Box, Typography, IconButton,
  Stepper, Step, StepLabel, StepContent, Button, TextField,
  Card, Chip, Autocomplete, useMediaQuery, useTheme,
  Alert, Collapse, Stack
} from '@mui/material'
import { 
  Add, Close, Upload, Class, Assignment, Save, Delete,
  Warning, CloudUpload, InsertDriveFile, Clear
} from '@mui/icons-material'
import { DatePicker, TimePicker } from '@mui/x-date-pickers'
import { FileUploadSection } from './FileUploadSection'
import { RichTextEditor } from './RichTextEditor'
import { FileWithMetadata } from '@/types/global'


interface CreateTPDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  materials: any[]
  chemicals: any[]
  userClasses: string[]
  customClasses: string[]
  setCustomClasses: React.Dispatch<React.SetStateAction<string[]>> 
  saveNewClass: (className: string, type?: 'predefined' | 'custom' | 'auto') => Promise<{ success: boolean; error?: string; data?: any }>
  tpPresets: any[]
}

export function CreateTPDialog({
  open,
  onClose,
  onSuccess,
  materials,
  chemicals,
  userClasses,
  customClasses,
  setCustomClasses,
  saveNewClass,
  tpPresets
}: CreateTPDialogProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | 'preset' | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [remarks, setRemarks] = useState('')
  const [dragOver, setDragOver] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    timeSlots: [{ date: '', startTime: '', endTime: '' }] as { date: string; startTime: string; endTime: string }[],
    classes: [] as string[],
    materials: [] as any[],
    chemicals: [] as any[]
  })

  // Correction du style pour RichTextEditor
  const richTextEditorStyles = {
    '& p.is-editor-empty:first-of-type::before': {
      color: 'text.secondary',
      content: 'attr(data-placeholder)',
      float: 'left',
      height: 0,
      pointerEvents: 'none',
    }
  }

  const getOutsideBusinessHoursWarnings = () => {
    const warnings: string[] = []
    
    formData.timeSlots.forEach((slot, index) => {
      if (slot.startTime) {
        const [startHour] = slot.startTime.split(':').map(Number)
        if (startHour < 8) {
          warnings.push(`Créneau ${index + 1} : début avant 8h00`)
        }
      }
      
      if (slot.endTime) {
        const [endHour, endMinute] = slot.endTime.split(':').map(Number)
        if (endHour > 19 || (endHour === 19 && endMinute > 0)) {
          warnings.push(`Créneau ${index + 1} : fin après 19h00`)
        }
      }
    })
    
    return warnings
  }

  const handleStepNext = () => setActiveStep((prevStep) => prevStep + 1)
  const handleStepBack = () => setActiveStep((prevStep) => prevStep - 1)
  
  // Permettre la navigation libre entre les steps
  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex)
  }

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setActiveStep(0)
    setUploadMethod(null)
    setSelectedPreset(null)
    setFiles([])
    setRemarks('')
    setDragOver(false)
    setFormData({
      title: '',
      description: '',
      date: '',
      timeSlots: [{ date: '', startTime: '', endTime: '' }],
      classes: [],
      materials: [],
      chemicals: []
    })
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset)
    setUploadMethod('preset')
    handleFormDataChange('title', preset.nom)
    handleFormDataChange('description', preset.description || '')
    handleFormDataChange('materials', preset.materials.map((m: any) => m.material))
    handleFormDataChange('chemicals', preset.chemicals.map((c: any) => c.chemical))
  }

  // Gestion des créneaux horaires
  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { date: '', startTime: '', endTime: '' }]
    })
  }

  const removeTimeSlot = (index: number) => {
    if (formData.timeSlots.length > 1) {
      const newTimeSlots = formData.timeSlots.filter((_, i) => i !== index)
      setFormData({
        ...formData,
        timeSlots: newTimeSlots
      })
    }
  }

  const updateTimeSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    const newTimeSlots = [...formData.timeSlots]
    newTimeSlots[index][field] = value
    setFormData({
      ...formData,
      timeSlots: newTimeSlots
    })
  }


const handleCreateCalendarEvent = async () => {
  try {
    setLoading(true)

    for (const slot of formData.timeSlots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        throw new Error("Date, heure de début ou heure de fin manquante pour un créneau.")
      }
    }

    // Préparer les données des fichiers avec le contenu uploadé
    const filesData = files
      .filter(f => f.uploadStatus === 'completed')
      .map(f => ({
        fileName: f.file.name,
        fileSize: f.file.size,
        fileType: f.file.type,
        fileUrl: f.fileContent, // fileContent contient maintenant l'URL retournée par le serveur
        uploadedAt: new Date().toISOString()
      }))

    // Vérifier si tous les fichiers sont uploadés
    const uploadingFiles = files.filter(f => f.uploadStatus === 'uploading')
    if (uploadingFiles.length > 0) {
      throw new Error("Veuillez attendre la fin du téléchargement de tous les fichiers.")
    }

    // Vérifier s'il y a des erreurs d'upload
    const errorFiles = files.filter(f => f.uploadStatus === 'error')
    if (errorFiles.length > 0) {
      throw new Error(`Erreur lors du téléchargement de ${errorFiles.length} fichier(s). Veuillez les supprimer ou réessayer.`)
    }

    const eventData = {
      title: formData.title || 'TP',
      description: formData.description,
      type: 'TP',
      classes: formData.classes,
      materials: formData.materials.map((m: any) => m.id),
      chemicals: formData.chemicals.map((c: any) => c.id),
      files: filesData,
      remarks: remarks,
      date: formData.timeSlots[0].date,
      timeSlots: formData.timeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime
      }))
    }

    const response = await fetch('/api/calendrier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Erreur lors de la création des événements')
    }
    
    handleClose()
    onSuccess()
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error)
    alert(error instanceof Error ? error.message : 'Erreur lors de la création')
  } finally {
    setLoading(false)
  }
}

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { minHeight: isMobile ? '100%' : '500px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Add color="primary" />
            <Typography variant="h6">Ajouter une nouvelle séance TP</Typography>
          </Box>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper 
          activeStep={activeStep} 
          orientation="vertical"
          nonLinear
        >
          {/* Étape 1: Méthode de création */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(0)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Méthode d'ajout</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choisissez comment vous souhaitez créer votre séance TP
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" gap={2} flexWrap="wrap">
                  {/* Carte pour l'import de fichier */}
                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'file' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'file' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('file')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <CloudUpload color={uploadMethod === 'file' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Importer des fichiers TP</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        {files.length > 0 ? `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}` : 
                         "Cliquez pour sélectionner"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" textAlign="center">
                        PDF, Word, Images acceptés • Max 5 fichiers
                      </Typography>
                    </Box>
                  </Card>

                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'manual' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'manual' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('manual')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                      <Assignment color={uploadMethod === 'manual' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">Création manuelle</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Saisissez manuellement les informations du TP
                      </Typography>
                    </Box>
                  </Card>

                  <Card 
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      border: uploadMethod === 'preset' ? '2px solid' : '1px solid',
                      borderColor: uploadMethod === 'preset' ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                      flex: { xs: '1 1 100%', sm: '1 1 calc(33.333% - 8px)' },
                      minWidth: { xs: 'auto', sm: '250px' }
                    }}
                    onClick={() => setUploadMethod('preset')}
                  >
                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                            <Class color={uploadMethod === 'preset' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                      <Typography variant="h6">TP Preset</Typography>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Utiliser un modèle de TP prédéfini
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              </Box>

              {/* Utilisation de FileUploadSection pour l'upload de fichiers */}
              {uploadMethod === 'file' && (
                <Box sx={{ mt: 3 }}>
                  <FileUploadSection
                    files={files}
                    onFilesChange={setFiles}
                    maxFiles={5}
                    maxSizePerFile={10}
                    acceptedTypes={['.pdf', '.doc', '.docx', '.odt', '.jpg',
                       '.jpeg', '.png', '.gif', '.txt', '.svg', ]}
                  />
                </Box>
              )}

              {uploadMethod === 'preset' && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>Choisir un TP Preset</Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(300px, 1fr))' }, 
                    gap: 2, 
                    maxHeight: '400px', 
                    overflowY: 'auto' 
                  }}>
                    {tpPresets.map((preset) => (
                      <Card 
                        key={preset.id}
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer',
                          border: selectedPreset?.id === preset.id ? '2px solid' : '1px solid',
                          borderColor: selectedPreset?.id === preset.id ? 'primary.main' : 'divider',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                        onClick={() => handlePresetSelect(preset)}
                      >
                        <Typography variant="h6" gutterBottom>{preset.nom}</Typography>
                        {preset.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {preset.description}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Chip label={preset.niveau} size="small" color="primary" />
                          <Chip label={preset.matiere} size="small" color="secondary" />
                        </Box>
                        {preset.dureeEstimee && (
                          <Typography variant="caption" color="text.secondary">
                            Durée: {preset.dureeEstimee} min
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {preset.chemicals.length} produits
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {preset.materials.length} matériels
                          </Typography>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    // Pour manual, passer directement à l'étape 2
                    if (uploadMethod === 'manual') {
                      setActiveStep(1)
                    } else {
                      handleStepNext()
                    }
                  }}
                  disabled={!uploadMethod || 
                           (uploadMethod === 'preset' && !selectedPreset) ||
                           (uploadMethod === 'file' && files.length === 0)}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 2: Description et Remarques */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(1)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Description et remarques</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ajoutez une description et des remarques pour cette séance
              </Typography>
              
              {/* Champ description pour le mode manuel */}
              {uploadMethod === 'manual' && (
                <TextField
                  fullWidth
                  label="Description du TP"
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleFormDataChange('description', e.target.value)}
                  sx={{ mb: 3 }}
                  placeholder="Décrivez brièvement le contenu et les objectifs du TP..."
                />
              )}
              
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                Remarques supplémentaires
              </Typography>
              
              <Box sx={richTextEditorStyles}>
                <RichTextEditor
                  value={remarks}
                  onChange={setRemarks}
                  placeholder="Ajoutez des remarques, instructions spéciales, notes de sécurité..."
                />
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 3: Date et heure */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(2)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Date et heure</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Définissez quand aura lieu cette séance TP
              </Typography>
              
              <Box display="flex" flexDirection="column" gap={3}>
                <Box>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Créneaux horaires
                    </Typography>
                    <Button
                      startIcon={<Add />}
                      onClick={addTimeSlot}
                      variant="outlined"
                      size="small"
                    >
                      Ajouter un créneau
                    </Button>
                  </Box>

                  {formData.timeSlots.map((slot, index) => (
                    <Box 
                      key={index} 
                      mb={2}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: 'background.default'
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          Créneau {index + 1}
                        </Typography>
                        {formData.timeSlots.length > 1 && (
                          <IconButton
                            color="error"
                            onClick={() => removeTimeSlot(index)}
                            size="small"
                            sx={{ ml: 'auto' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <DatePicker
                          label="Date du TP"
                          value={slot.date ? new Date(slot.date) : null}
                          onChange={(newValue) => {
                            if (newValue) {
                              updateTimeSlot(index, 'date', newValue.toISOString().split('T')[0])
                            }
                          }}
                          slotProps={{
                            textField: { 
                              size: "small",
                              sx: { minWidth: { xs: '100%', sm: 200 } },
                              onClick: (e: any) => {
                                if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                  const button = e.currentTarget.querySelector('button')
                                  if (button) button.click()
                                }
                              }
                            }
                          }}
                        />
                        <TimePicker
                          label="Début"
                          value={slot.startTime ? new Date(`2000-01-01T${slot.startTime}`) : null}
                          onChange={(newValue) => {
                            if (newValue) {
                              const hours = newValue.getHours().toString().padStart(2, '0')
                              const minutes = newValue.getMinutes().toString().padStart(2, '0')
                              updateTimeSlot(index, 'startTime', `${hours}:${minutes}`)
                            }
                          }}
                          slotProps={{
                            textField: { 
                              size: "small",
                              sx: { minWidth: { xs: '48%', sm: 120 } },
                              onClick: (e: any) => {
                                if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                  const button = e.currentTarget.querySelector('button')
                                  if (button) button.click()
                                }
                              }
                            }
                          }}
                        />
                        <TimePicker
                          label="Fin"
                          value={slot.endTime ? new Date(`2000-01-01T${slot.endTime}`) : null}
                          onChange={(newValue) => {
                            if (newValue) {
                              const hours = newValue.getHours().toString().padStart(2, '0')
                              const minutes = newValue.getMinutes().toString().padStart(2, '0')
                              updateTimeSlot(index, 'endTime', `${hours}:${minutes}`)
                            }
                          }}
                          slotProps={{
                            textField: { 
                              size: "small",
                              sx: { minWidth: { xs: '100%', sm: 120 } },
                              onClick: (e: any) => {
                                if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                                  const button = e.currentTarget.querySelector('button')
                                  if (button) button.click()
                                }
                              }
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  ))}

                  {formData.timeSlots.length > 1 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        {formData.timeSlots.length} créneaux seront créés pour cette séance TP.
                      </Typography>
                    </Alert>
                  )}
                </Box>

                <Collapse in={getOutsideBusinessHoursWarnings().length > 0}>
                  <Alert 
                    severity="warning" 
                    icon={<Warning />}
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-icon': {
                        fontSize: '1.5rem'
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold" gutterBottom>
                      Attention : notre établissement est fermé !
                    </Typography>
                    <Typography variant="body2" component="div">
                      Votre séance TP est programmée en dehors des heures d'ouverture de notre établissement (08:00 - 19:00) :
                      <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                        {getOutsideBusinessHoursWarnings().map((warning, index) => (
                          <li key={index}>
                            <Typography variant="body2" component="span">
                              {warning}
                            </Typography>
                          </li>
                        ))}
                      </Box>
                    </Typography>
                  </Alert>
                </Collapse>
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                  disabled={formData.timeSlots.some(slot => 
                    !slot.startTime || 
                    !slot.endTime || 
                    !slot.date
                  )}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 4: Classes concernées */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(3)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Classes concernées</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sélectionnez les classes qui participeront à cette séance
              </Typography>

              <Autocomplete
                multiple
                freeSolo
                options={[...userClasses, ...customClasses]}
                value={formData.classes}
                onChange={async (_, newValue) => {
                  const uniqueClasses = [...new Set(newValue)]
                  handleFormDataChange('classes', uniqueClasses)
                  
                  const newCustom = uniqueClasses.filter(c => 
                    !userClasses.includes(c) && !customClasses.includes(c)
                  )
                  if (newCustom.length > 0) {
                    const successfulClasses: string[] = []
                    
                    for (const newClass of newCustom) {
                      const result = await saveNewClass(newClass, 'custom')
                      if (result.success) {
                        successfulClasses.push(newClass)
                      } else {
                        console.error(`Erreur lors de l'ajout de la classe "${newClass}":`, result.error)
                      }
                    }
                    
                    // N'ajouter que les classes créées avec succès
                    if (successfulClasses.length > 0) {
                      setCustomClasses(prev => [...prev, ...successfulClasses])
                    }
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Classes"
                    placeholder="Choisir les classes ou en ajouter une nouvelle..."
                    helperText="Vous pouvez taper pour ajouter une nouvelle classe"
                  />
                )}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((option, index) => (
                    <Chip
                    key={option}
                    variant="outlined"
                    label={option}
                    color={userClasses.includes(option) ? "primary" : "secondary"}
                    sx={{ m: 0.5 }}
                    />
                  ))}
                  </Box>
                )}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                  disabled={formData.classes.length === 0}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 5: Matériel nécessaire */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(4)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Matériel nécessaire</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sélectionnez le matériel qui sera utilisé pendant cette séance
              </Typography>

              <Autocomplete
                multiple
                options={materials}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return `${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`;
                }}
                value={formData.materials}
                onChange={(_, newValue) => handleFormDataChange('materials', newValue || [])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Matériel"
                    placeholder="Choisir le matériel..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option: any, index) => {
                    const { key, ...chipProps } = getTagProps({ index })
                    return (
                      <Chip
                        key={key}
                        variant="outlined"
                        label={`${option.itemName || option.name || 'Matériel'} ${option.volume ? `(${option.volume})` : ''}`}
                        {...chipProps}
                      />
                    )
                  })
                }
                isOptionEqualToValue={(option: any, value: any) => {
                  return option.id === value.id;
                }}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 6: Produits chimiques */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(5)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Produits chimiques</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sélectionnez les produits chimiques qui seront utilisés
              </Typography>

              <Autocomplete
                multiple
                options={chemicals}
                getOptionLabel={(option: any) => {
                  if (typeof option === 'string') return option;
                  return `${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`;
                }}
                value={formData.chemicals}
                onChange={(_, newValue) => handleFormDataChange('chemicals', newValue || [])}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Produits chimiques"
                    placeholder="Choisir les produits chimiques..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option: any, index) => {
                    const { key, ...chipProps } = getTagProps({ index })
                    return (
                      <Chip
                        key={key}
                        variant="outlined"
                        label={`${option.name || 'Produit chimique'} - ${option.quantity || 0}${option.unit || ''}`}
                        {...chipProps}
                      />
                    )
                  })
                }
                isOptionEqualToValue={(option: any, value: any) => {
                  return option.id === value.id;
                }}
              />

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleStepNext}
                >
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>

          {/* Étape 7: Documents joints */}
          <Step>
            <StepLabel
              onClick={() => handleStepClick(6)}
              sx={{ cursor: 'pointer' }}
            >
              <Typography variant="h6">Documents joints</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ajoutez les documents relatifs à cette séance TP (protocoles, fiches de sécurité, etc.)
              </Typography>

              <FileUploadSection
                files={files}
                onFilesChange={setFiles}
                maxFiles={5}
                maxSizePerFile={10}
                acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif']}
              />

              {getOutsideBusinessHoursWarnings().length > 0 && (
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">
                    Rappel : Cette séance TP est programmée en dehors des heures d'ouverture de l'établissement (8h00 - 19h00).
                  </Typography>
                </Alert>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>
                  Retour
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCreateCalendarEvent}
                  startIcon={<Save />}
                  disabled={loading}
                >
                  {loading ? 'Création...' : 'Créer la séance'}
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </DialogContent>
    </Dialog>
  )
}