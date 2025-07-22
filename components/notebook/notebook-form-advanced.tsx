"use client"

import { useState, useEffect } from "react"
import { 
  Box, TextField, Button, Stack, Typography, Alert, Stepper, Step, StepLabel, StepContent,
  Autocomplete, Chip, Card, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem
} from "@mui/material"
import { 
  Add, Upload, AttachFile, Save, Science, Assignment, School
} from "@mui/icons-material"
import { SECTION_LEVELS } from "@/lib/constants/education-levels"

interface NotebookFormAdvancedProps {
  onSuccess: () => void
  onCancel: () => void
}

interface FormData {
  title: string
  content: string
  sections: string[]
  file: File | null
  materials: any[]
  chemicals: any[]
  estimatedDuration: number
  difficulty: string
}

export function NotebookFormAdvanced({ onSuccess, onCancel }: NotebookFormAdvancedProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual' | null>(null)
  const [dragOver, setDragOver] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    sections: [],
    file: null,
    materials: [],
    chemicals: [],
    estimatedDuration: 60,
    difficulty: 'Moyen'
  })
  
  // États pour les données de référence
  const [materials, setMaterials] = useState([])
  const [chemicals, setChemicals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Chargement des données de référence
  const loadReferenceData = async () => {
    try {
      const [materialsRes, chemicalsRes] = await Promise.all([
        fetch('/api/equipement'),
        fetch('/api/chemicals')
      ])

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData || [])
      }

      if (chemicalsRes.ok) {
        const chemicalsData = await chemicalsRes.json()
        setChemicals(chemicalsData || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de référence:', error)
    }
  }

  useEffect(() => {
    loadReferenceData()
  }, [])

  const handleFormDataChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStepNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleStepBack = () => {
    setActiveStep(prev => prev - 1)
  }

  // Gestion de l'upload de fichier
  const handleFileUpload = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    if (allowedTypes.includes(file.type) || file.name.match(/\\.(pdf|doc|docx|odt|txt|jpg|jpeg|png|gif|webp)$/i)) {
      handleFormDataChange('file', file)
      handleFormDataChange('title', file.name.replace(/\\.[^/.]+$/, ""))
      setUploadMethod('file')
    } else {
      alert('Type de fichier non supporté. Veuillez choisir un PDF, document Word, image ou fichier texte.')
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
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const openFileExplorer = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.doc,.docx,.odt,.txt,.jpg,.jpeg,.png,.gif,.webp'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFileUpload(file)
      }
    }
    input.click()
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const dataToSubmit = {
        title: formData.title,
        content: formData.content,
        sections: formData.sections,
        materials: formData.materials.map((m: any) => m.id),
        chemicals: formData.chemicals.map((c: any) => c.id),
        estimatedDuration: formData.estimatedDuration,
        difficulty: formData.difficulty,
        ...(formData.file && { fileName: formData.file.name })
      }

      const response = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSubmit)
      })

      if (!response.ok) throw new Error("Erreur lors de la création du TP")
      
      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setActiveStep(0)
    setUploadMethod(null)
    setFormData({
      title: '',
      content: '',
      sections: [],
      file: null,
      materials: [],
      chemicals: [],
      estimatedDuration: 60,
      difficulty: 'Moyen'
    })
  }

  return (
    <Box sx={{ minHeight: 600 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        Créer un nouveau TP
      </Typography>

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Étape 1: Méthode de création */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Méthode de création</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choisissez comment vous souhaitez créer votre TP
            </Typography>
            
            <Box display="flex" gap={2} flexWrap="wrap">
              <Card 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  border: uploadMethod === 'file' ? '2px solid' : dragOver ? '2px dashed' : '1px solid',
                  borderColor: uploadMethod === 'file' ? 'primary.main' : dragOver ? 'primary.light' : 'divider',
                  '&:hover': { borderColor: 'primary.main' },
                  flexBasis: 'calc(50% - 8px)',
                  minWidth: '250px',
                  backgroundColor: dragOver ? 'primary.light' : 'inherit',
                  opacity: dragOver ? 0.8 : 1,
                  transition: 'all 0.2s ease'
                }}
                onClick={openFileExplorer}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                  <Upload color={uploadMethod === 'file' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                  <Typography variant="h6">Importer un fichier TP</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {formData.file ? formData.file.name : 
                     dragOver ? "Déposez votre fichier ici" :
                     "Cliquez ou glissez-déposez votre fichier"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    PDF, Word, Images, documents acceptés
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
                  flexBasis: 'calc(50% - 8px)',
                  minWidth: '250px'
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
            </Box>

            {uploadMethod === 'manual' && (
              <Box sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Titre du TP"
                  value={formData.title}
                  onChange={(e) => handleFormDataChange('title', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Contenu / Protocole"
                  multiline
                  rows={6}
                  value={formData.content}
                  onChange={(e) => handleFormDataChange('content', e.target.value)}
                />
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={handleStepNext}
                disabled={!uploadMethod || 
                         (uploadMethod === 'file' && !formData.file) || 
                         (uploadMethod === 'manual' && (!formData.title || !formData.content))}
              >
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 2: Sections et niveaux */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Sections et niveaux</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez les sections/niveaux concernés par ce TP
            </Typography>

            <Autocomplete
              multiple
              options={SECTION_LEVELS}
              getOptionLabel={(option) => option.label}
              value={SECTION_LEVELS.filter(level => formData.sections.includes(level.id))}
              onChange={(_, newValue) => {
                handleFormDataChange('sections', newValue.map(level => level.id))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Sections"
                  placeholder="Choisir les sections/niveaux..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option.label}
                    {...getTagProps({ index })}
                    key={option.id}
                    color="primary"
                  />
                ))
              }
            />

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Durée estimée</InputLabel>
                <Select
                  value={formData.estimatedDuration}
                  label="Durée estimée"
                  onChange={(e) => handleFormDataChange('estimatedDuration', e.target.value)}
                >
                  <MenuItem value={30}>30 min</MenuItem>
                  <MenuItem value={45}>45 min</MenuItem>
                  <MenuItem value={60}>1h</MenuItem>
                  <MenuItem value={90}>1h30</MenuItem>
                  <MenuItem value={120}>2h</MenuItem>
                  <MenuItem value={180}>3h</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 120 }}>
                <InputLabel>Difficulté</InputLabel>
                <Select
                  value={formData.difficulty}
                  label="Difficulté"
                  onChange={(e) => handleFormDataChange('difficulty', e.target.value)}
                >
                  <MenuItem value="Facile">Facile</MenuItem>
                  <MenuItem value="Moyen">Moyen</MenuItem>
                  <MenuItem value="Difficile">Difficile</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={handleStepNext}
                disabled={formData.sections.length === 0}
              >
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 3: Matériel nécessaire */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Matériel nécessaire</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez le matériel nécessaire pour ce TP
            </Typography>

            <Autocomplete
              multiple
              options={Array.isArray(materials) ? materials : []}
              getOptionLabel={(option: any) => `${option.name || option} ${option.volume ? `(${option.volume}mL)` : ''}`}
              value={Array.isArray(formData.materials) ? formData.materials : []}
              onChange={(_, newValue) => handleFormDataChange('materials', newValue || [])}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Matériel"
                  placeholder="Choisir le matériel..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option: any, index) => (
                  <Chip
                    variant="outlined"
                    label={`${option.name || option} ${option.volume ? `(${option.volume}mL)` : ''}`}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
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

        {/* Étape 4: Produits chimiques */}
        <Step>
          <StepLabel>
            <Typography variant="h6">Produits chimiques</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sélectionnez les produits chimiques nécessaires (optionnel)
            </Typography>

            <Autocomplete
              multiple
              options={Array.isArray(chemicals) ? chemicals : []}
              getOptionLabel={(option: any) => `${option.name || option} - ${option.quantity || 0}${option.unit || ''}`}
              value={Array.isArray(formData.chemicals) ? formData.chemicals : []}
              onChange={(_, newValue) => handleFormDataChange('chemicals', newValue || [])}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Produits chimiques"
                  placeholder="Choisir les produits chimiques..."
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option: any, index) => (
                  <Chip
                    variant="outlined"
                    label={`${option.name || option} - ${option.quantity || 0}${option.unit || ''}`}
                    {...getTagProps({ index })}
                    key={index}
                  />
                ))
              }
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>
                Retour
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                startIcon={<Save />}
                disabled={loading}
              >
                {loading ? 'Création...' : 'Créer le TP'}
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={onCancel}>
          Annuler
        </Button>
      </Stack>
    </Box>
  )
}
