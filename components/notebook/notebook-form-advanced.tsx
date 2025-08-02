"use client"

import { useState, useEffect } from "react"
import {
  Box, Typography, Button, TextField, Stepper, Step, StepLabel,
  StepContent, Card, Autocomplete, InputAdornment, IconButton,
  Alert, Chip
} from "@mui/material"
import {
  CloudUpload, Assignment, Add
} from "@mui/icons-material"
import { RichTextEditor } from "@/components/calendar/RichTextEditor"
import { FileUploadSection } from "@/components/calendar/FileUploadSection"
import { FileWithMetadata } from '@/types/global'

interface Material {
  id: string
  name?: string
  itemName?: string
  quantity: number
  isCustom?: boolean
}

interface Chemical {
  id: string
  name: string
  quantity?: number
  unit?: string
  requestedQuantity?: number
  forecastQuantity?: number
}

interface NotebookFormAdvancedProps {
  discipline: 'chimie' | 'physique' | 'general'
  onSuccess: () => void
  onCancel: () => void
}

export function NotebookFormAdvanced({
  discipline = 'general',
  onSuccess,
  onCancel
}: NotebookFormAdvancedProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'manual'>('manual')
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    materials: [] as Material[],
    chemicals: [] as Chemical[],
    attachments: [] as any[]
  })
  const [remarks, setRemarks] = useState('')
  
  // États pour les autocompletes
  const [materials, setMaterials] = useState<Material[]>([])
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [loadingChemicals, setLoadingChemicals] = useState(false)
  const [materialInputValue, setMaterialInputValue] = useState('')
  const [chemicalInputValue, setChemicalInputValue] = useState('')

  // Charger les matériels selon la discipline
  useEffect(() => {
    const loadMaterials = async () => {
      setLoadingMaterials(true)
      try {
        let response;
        if (discipline === 'physique') {
          // Utiliser l'API spécifique pour la physique
          response = await fetch('/api/physique/equipement')
        } else if (discipline === 'chimie') {
          // Utiliser l'API spécifique pour la chimie
          response = await fetch('/api/chimie/equipement')
        } else {
          // API générale
          response = await fetch('/api/chimie/equipement')
        }
        
        if (response.ok) {
          const data = await response.json()
          // Adapter la structure selon l'API
          if (discipline === 'physique') {
            setMaterials(data || [])
          } else {
            setMaterials(data.materials || data || [])
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des matériels:', error)
      } finally {
        setLoadingMaterials(false)
      }
    }

    const loadChemicals = async () => {
      setLoadingChemicals(true)
      try {
        const response = await fetch('/api/chimie/chemicals')
        if (response.ok) {
          const data = await response.json()
          setChemicals(data.chemicals || data || [])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des produits chimiques:', error)
      } finally {
        setLoadingChemicals(false)
      }
    }

    if (discipline !== 'general') {
      loadMaterials()
      if (discipline === 'chimie') {
        loadChemicals()
      }
    }
  }, [discipline])

  const handleFormDataChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleStepNext = () => {
    setActiveStep(prev => prev + 1)
  }

  const handleStepBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleStepClick = (step: number) => {
    setActiveStep(step)
  }

  const handleSubmit = async () => {
    try {
      const submitData = {
        type: 'entry',
        title: formData.title,
        description: formData.description,
        discipline,
        materials: formData.materials,
        chemicals: formData.chemicals,
        attachments: formData.attachments,
        content: remarks
      }

      const response = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Erreur:', errorData.error)
      }
    } catch (error) {
      console.error('Erreur lors de la soumission:', error)
    }
  }

  const maxStep = discipline === 'chimie' ? 5 : 4

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 2 }}>
      <Stepper activeStep={activeStep} orientation="vertical" nonLinear>
        
        {/* Étape 1: Méthode de création */}
        <Step>
          <StepLabel onClick={() => handleStepClick(0)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6">Méthode d'ajout</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choisissez comment vous souhaitez créer votre séance TP
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Card 
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: uploadMethod === 'file' ? '2px solid' : '1px solid',
                    borderColor: uploadMethod === 'file' ? 'primary.main' : 'divider',
                    '&:hover': { borderColor: 'primary.main' },
                    flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' }
                  }}
                  onClick={() => setUploadMethod('file')}
                >
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    <CloudUpload color={uploadMethod === 'file' ? 'primary' : 'inherit'} sx={{ fontSize: 40 }} />
                    <Typography variant="h6">Importer des fichiers TP</Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center">
                      {files.length > 0 ? `${files.length} fichier${files.length > 1 ? 's' : ''} sélectionné${files.length > 1 ? 's' : ''}` :
                        "Glissez-déposez ou cliquez pour sélectionner"}
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
                    flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' }
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
            </Box>

            {uploadMethod === 'file' && (
              <Box sx={{ mt: 3 }}>
                <FileUploadSection
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={5}
                  maxSizePerFile={10}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.odt', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.svg']}
                />
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => {
                  if (uploadMethod === 'manual') {
                    setActiveStep(1) // Aller directement à l'étape titre
                  } else {
                    handleStepNext()
                  }
                }}
                disabled={!uploadMethod || (uploadMethod === 'file' && files.length === 0)}
              >
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 2: Titre (obligatoire) */}
        <Step>
          <StepLabel onClick={() => handleStepClick(1)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6">Titre du TP</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Donnez un titre à votre TP (obligatoire)
            </Typography>
            
            <TextField
              fullWidth
              label="Titre du TP *"
              value={formData.title}
              onChange={(e) => handleFormDataChange('title', e.target.value)}
              sx={{ mb: 3 }}
              placeholder="Donnez un titre à votre TP..."
              required
            />

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

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>Retour</Button>
              <Button
                variant="contained"
                onClick={handleStepNext}
                disabled={!formData.title.trim()}
              >
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 3: Description et remarques */}
        <Step>
          <StepLabel onClick={() => handleStepClick(2)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6">Description et remarques</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ajoutez une description et des remarques pour cette séance
            </Typography>
            
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              Remarques supplémentaires
            </Typography>
            
            <Box sx={{ 
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
              minHeight: 200
            }}>
              <RichTextEditor
                value={remarks}
                onChange={setRemarks}
                placeholder="Ajoutez des remarques, instructions spéciales, notes de sécurité..."
              />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>Retour</Button>
              <Button variant="contained" onClick={handleStepNext}>
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 4: Matériel */}
        <Step>
          <StepLabel onClick={() => handleStepClick(3)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6">
              {discipline === 'physique' ? 'Équipement de physique' : 'Matériel nécessaire'}
            </Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {discipline === 'physique' 
                ? 'Sélectionnez l\'équipement de physique qui sera utilisé'
                : 'Sélectionnez le matériel qui sera utilisé'
              }
            </Typography>

            <Autocomplete
              freeSolo
              options={materials}
              loading={loadingMaterials}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option.itemName || option.name || 'Matériel'
              }}
              value={null}
              inputValue={materialInputValue}
              onInputChange={(_, newValue) => setMaterialInputValue(newValue || '')}
              onChange={(_, newValue) => {
                if (typeof newValue === 'string') return
                
                if (newValue && !formData.materials.some(m => 
                  (m.itemName || m.name) === (newValue.itemName || newValue.name)
                )) {
                  handleFormDataChange('materials', [
                    ...formData.materials,
                    { ...newValue, quantity: 1 }
                  ])
                  setMaterialInputValue('')
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={discipline === 'physique' ? 'Ajouter un équipement' : 'Ajouter du matériel'}
                  placeholder={discipline === 'physique' ? 'Rechercher des équipements...' : 'Rechercher du matériel...'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && materialInputValue?.trim()) {
                      e.preventDefault()
                      const customMaterial = {
                        id: `custom_${Date.now()}`,
                        name: materialInputValue.trim(),
                        itemName: materialInputValue.trim(),
                        quantity: 1,
                        isCustom: true
                      }
                      handleFormDataChange('materials', [...formData.materials, customMaterial])
                      setMaterialInputValue('')
                    }
                  }}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          {materialInputValue?.trim() && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const customMaterial = {
                                    id: `custom_${Date.now()}`,
                                    name: materialInputValue.trim(),
                                    itemName: materialInputValue.trim(),
                                    quantity: 1,
                                    isCustom: true
                                  }
                                  handleFormDataChange('materials', [...formData.materials, customMaterial])
                                  setMaterialInputValue('')
                                }}
                              >
                                <Add />
                              </IconButton>
                            </InputAdornment>
                          )}
                        </>
                      )
                    }
                  }}
                />
              )}
            />

            {formData.materials.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Matériel sélectionné :
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.materials.map((material, index) => (
                    <Chip
                      key={index}
                      label={material.itemName || material.name}
                      onDelete={() => {
                        const updated = formData.materials.filter((_, i) => i !== index)
                        handleFormDataChange('materials', updated)
                      }}
                      color={material.isCustom ? 'secondary' : 'primary'}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>Retour</Button>
              <Button variant="contained" onClick={handleStepNext}>
                Continuer
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Étape 5: Réactifs chimiques (uniquement pour chimie) */}
        {discipline === 'chimie' && (
          <Step>
            <StepLabel onClick={() => handleStepClick(4)} sx={{ cursor: 'pointer' }}>
              <Typography variant="h6">Réactifs chimiques</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Sélectionnez les réactifs chimiques qui seront utilisés
              </Typography>

              <Autocomplete
                options={chemicals}
                loading={loadingChemicals}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option
                  const forecast = option.forecastQuantity !== undefined ? option.forecastQuantity : option.quantity
                  return `${option.name} - Stock: ${option.quantity || 0}${option.unit || ''} (Prévu: ${forecast}${option.unit || ''})`
                }}
                value={null}
                inputValue={chemicalInputValue}
                onInputChange={(_, newValue) => setChemicalInputValue(newValue || '')}
                onChange={(_, newValue) => {
                  if (newValue && !formData.chemicals.some(c => c.id === newValue.id)) {
                    handleFormDataChange('chemicals', [
                      ...formData.chemicals,
                      { ...newValue, requestedQuantity: 1 }
                    ])
                    setChemicalInputValue('')
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ajouter un réactif chimique"
                    placeholder="Rechercher des réactifs chimiques..."
                  />
                )}
                filterOptions={(options) => {
                  const selectedIds = formData.chemicals.map(c => c.id)
                  return options.filter(option => !selectedIds.includes(option.id))
                }}
              />

              {formData.chemicals.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Réactifs sélectionnés :
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.chemicals.map((chemical, index) => (
                      <Chip
                        key={index}
                        label={chemical.name}
                        onDelete={() => {
                          const updated = formData.chemicals.filter((_, i) => i !== index)
                          handleFormDataChange('chemicals', updated)
                        }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                <Button onClick={handleStepBack}>Retour</Button>
                <Button variant="contained" onClick={handleStepNext}>
                  Continuer
                </Button>
              </Box>
            </StepContent>
          </Step>
        )}

        {/* Étape 6/7: Documents joints */}
        <Step>
          <StepLabel onClick={() => handleStepClick(maxStep)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6">Documents joints</Typography>
          </StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Ajoutez des documents complémentaires pour ce TP
            </Typography>

            <FileUploadSection
              files={formData.attachments}
              onFilesChange={(newFiles) => handleFormDataChange('attachments', newFiles)}
              maxFiles={10}
              maxSizePerFile={20}
              acceptedTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif']}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
              <Button onClick={handleStepBack}>Retour</Button>
              <Button variant="contained" onClick={handleSubmit}>
                Créer le TP
              </Button>
            </Box>
          </StepContent>
        </Step>

      </Stepper>
    </Box>
  )
}
