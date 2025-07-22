"use client"

import { useState, useEffect } from "react"
import { Chemical, ChemicalStatus } from "@/types/prisma"
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Autocomplete,
  Chip,
  IconButton,
  Paper,
  ListItem,
  ListItemText
} from "@mui/material"
import { Add, Edit } from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"
import { searchChemicals, findByCAS, findByName, type ChemicalCompound } from "@/lib/chemicals-database"

interface ConfigurableOption {
  id: string;
  value: string;
}

interface ChemicalFormProps {
  chemical?: Chemical
  onSuccess: () => void
  onCancel?: () => void
}

interface FormData {
  name: string
  formula: string
  casNumber: string
  quantity: number
  unit: string
  minQuantity: number
  purchaseDate: Date | null
  expirationDate: Date | null
  supplier: string
  location: string
  storage: string
  room: string
  cabinet: string
  shelf: string
  status: ChemicalStatus
  notes: string
}

export function ChemicalForm({ chemical, onSuccess, onCancel }: ChemicalFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: chemical?.name || "",
    formula: chemical?.formula || "",
    casNumber: chemical?.casNumber || "",
    quantity: chemical?.quantity || 0,
    unit: chemical?.unit || "G",
    minQuantity: chemical?.minQuantity || 0,
    purchaseDate: chemical?.purchaseDate ? new Date(chemical.purchaseDate) : null,
    expirationDate: chemical?.expirationDate ? new Date(chemical.expirationDate) : null,
    supplier: chemical?.supplierId || "",
    location: chemical?.storage || "",
    storage: chemical?.storage || "",
    room: chemical?.room || "",
    cabinet: chemical?.cabinet || "",
    shelf: chemical?.shelf || "",
    status: chemical?.status || ChemicalStatus.IN_STOCK,
    notes: chemical?.notes || "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presetCategories, setPresetCategories] = useState<any[]>([])
  const [selectedPreset, setSelectedPreset] = useState<any>(null)
  
  // États pour l'auto-complétion
  const [nameOptions, setNameOptions] = useState<ChemicalCompound[]>([])
  const [casOptions, setCasOptions] = useState<ChemicalCompound[]>([])
  const [isLoadingName, setIsLoadingName] = useState(false)
  const [isLoadingCas, setIsLoadingCas] = useState(false)
  const [existingChemicals, setExistingChemicals] = useState<Chemical[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  // Charger les données preset et existantes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [presetsRes, chemicalsRes] = await Promise.all([
          fetch('/api/preset-chemicals'),
          fetch('/api/chemicals')
        ])

        if (presetsRes.ok) {
          const presets = await presetsRes.json()
          setPresetCategories(presets)
        }

        if (chemicalsRes.ok) {
          const chemicals = await chemicalsRes.json()
          setExistingChemicals(Array.isArray(chemicals.chemicals) ? chemicals.chemicals : chemicals || [])
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      }
    }

    loadData()
  }, [])

  // Fonction pour détecter les doublons
  const checkDuplicates = (name: string, casNumber: string, formula: string) => {
    if (!Array.isArray(existingChemicals)) return;
    
    const duplicates = existingChemicals.filter(chem => 
      chem.id !== chemical?.id && (
        chem.name.toLowerCase() === name.toLowerCase() ||
        (chem.casNumber && casNumber && chem.casNumber === casNumber) ||
        (chem.formula && formula && chem.formula === formula)
      )
    )

    if (duplicates.length > 0) {
      const reasons = []
      if (duplicates.some(d => d.name.toLowerCase() === name.toLowerCase())) reasons.push('nom')
      if (duplicates.some(d => d.casNumber === casNumber)) reasons.push('numéro CAS')
      if (duplicates.some(d => d.formula === formula)) reasons.push('formule')
      
      setDuplicateWarning(`Cette molécule semble déjà exister dans l'inventaire (correspondance par ${reasons.join(', ')})`)
    } else {
      setDuplicateWarning(null)
    }
  }

  // Fonction pour appliquer un preset
  const applyPreset = (preset: any) => {
    setSelectedPreset(preset)
    setFormData(prev => ({
      ...prev,
      name: preset.name,
      formula: preset.formula || "",
      casNumber: preset.casNumber || "",
    }))
    
    // Vérifier les doublons
    checkDuplicates(preset.name, preset.casNumber || "", preset.formula || "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = chemical ? `/api/chemicals/${chemical.id}` : "/api/chemicals"
      const method = chemical ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Erreur lors de l'enregistrement")
      }

      onSuccess()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof FormData) => (value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Fonction de recherche pour les noms
  const handleNameSearch = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 1) {
      setNameOptions([])
      return
    }
    
    setIsLoadingName(true)
    try {
      const results = searchChemicals(inputValue)
      setNameOptions(results)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    } finally {
      setIsLoadingName(false)
    }
  }

  // Fonction de recherche pour les numéros CAS
  const handleCasSearch = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 1) {
      setCasOptions([])
      return
    }
    
    setIsLoadingCas(true)
    try {
      const results = searchChemicals(inputValue)
      setCasOptions(results)
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    } finally {
      setIsLoadingCas(false)
    }
  }

  // Auto-complétion quand on sélectionne un composé par le nom
  const handleNameSelection = (compound: ChemicalCompound | null) => {
    if (compound) {
      setFormData(prev => ({
        ...prev,
        name: compound.name,
        formula: compound.formula,
        casNumber: compound.casNumber
      }))
      // Nettoyer les options
      setNameOptions([])
      setCasOptions([])
    }
  }

  // Auto-complétion quand on sélectionne un composé par le CAS
  const handleCasSelection = (compound: ChemicalCompound | null) => {
    if (compound) {
      setFormData(prev => ({
        ...prev,
        name: compound.name,
        formula: compound.formula,
        casNumber: compound.casNumber
      }))
      // Nettoyer les options
      setNameOptions([])
      setCasOptions([])
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          <Typography variant="h6">
            {chemical ? "Modifier le produit" : "Nouveau produit chimique"}
          </Typography>

          {/* Sélection de molécules preset (seulement pour nouveau produit) */}
          {!chemical && presetCategories.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Choisir une molécule prédéfinie (optionnel)
              </Typography>
              <Autocomplete
                options={presetCategories.flatMap(cat => 
                  cat.presetChemicals.map((chem: any) => ({
                    ...chem,
                    categoryName: cat.name
                  }))
                )}
                groupBy={(option) => option.categoryName}
                getOptionLabel={(option) => `${option.name} ${option.formula ? `(${option.formula})` : ''}`}
                value={selectedPreset}
                onChange={(_, newValue) => {
                  if (newValue) {
                    applyPreset(newValue)
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Rechercher une molécule..."
                    placeholder="Acide sulfurique, eau, etc..."
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box component="li" key={key} {...otherProps}>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {option.name}
                        </Typography>
                        {option.formula && (
                          <Typography variant="caption" color="text.secondary">
                            {option.formula} {option.casNumber && `• CAS: ${option.casNumber}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                }}
                sx={{ mb: 2 }}
              />
              {selectedPreset && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Molécule "{selectedPreset.name}" sélectionnée. Vous pouvez maintenant ajuster les quantités et informations de stockage.
                </Alert>
              )}
            </Box>
          )}

          {/* Alerte de doublon */}
          {duplicateWarning && (
            <Alert severity="warning">
              {duplicateWarning}
            </Alert>
          )}

          {/* Champ nom avec auto-complétion */}
          <Autocomplete
            freeSolo
            options={nameOptions}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            value={formData.name}
            onInputChange={(_, newInputValue) => {
              if (newInputValue !== null) {
                handleChange("name")(newInputValue)
                handleNameSearch(newInputValue)
                checkDuplicates(newInputValue, formData.casNumber, formData.formula)
              }
            }}
            onChange={(_, newValue) => {
              if (typeof newValue === 'object' && newValue && newValue.name) {
                handleNameSelection(newValue)
              } else if (typeof newValue === 'string') {
                handleChange("name")(newValue)
              }
            }}
            loading={isLoadingName}
            renderInput={(params) => (
              <TextField
              {...params}
              fullWidth
              required
              label="Nom du produit"
              placeholder="Commencez à taper le nom..."
              slotProps={{
                input: {
                endAdornment: (
                  <>
                  {isLoadingName && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                  </>
                ),
                },
              }}
              />
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Paper component="li" key={key} {...otherProps} sx={{ m: 0.5, p: 1 }}>
                  <ListItem alignItems="flex-start" disablePadding>
                    <ListItemText
                      primary={option.name}
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            Formule: {option.formula} | CAS: {option.casNumber}
                          </Typography>
                          {option.category && (
                            <Chip
                              label={option.category}
                              size="small"
                              variant="outlined"
                              sx={{ height: 16 }}
                            />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                </Paper>
              )
            }}
            noOptionsText="Aucun composé trouvé"
          />

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Formule chimique"
              value={formData.formula}
              onChange={(e) => {
                handleChange("formula")(e.target.value)
                checkDuplicates(formData.name, formData.casNumber, e.target.value)
              }}
              placeholder="H₂SO₄"
            />
            
            {/* Champ CAS avec auto-complétion */}
            <Autocomplete
              freeSolo
              options={casOptions}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.casNumber}
              value={formData.casNumber}
              onInputChange={(_, newInputValue) => {
                handleChange("casNumber")(newInputValue)
                handleCasSearch(newInputValue)
                checkDuplicates(formData.name, newInputValue, formData.formula)
              }}
              onChange={(_, newValue) => {
                if (typeof newValue === 'object' && newValue) {
                  handleCasSelection(newValue)
                }
              }}
              loading={isLoadingCas}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Numéro CAS"
                  placeholder="7664-93-9"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoadingCas && <CircularProgress color="inherit" size={20} />}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Paper component="li" key={key} {...otherProps} sx={{ m: 0.5, p: 1 }}>
                    <ListItem disablePadding>
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight="medium">
                            {option.casNumber}
                          </Typography>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography component="span" variant="caption" color="primary">
                              {option.name}
                            </Typography>
                            <Typography component="span" variant="caption" color="text.secondary">
                              {option.formula}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  </Paper>
                );
              }}
              noOptionsText="Aucun composé trouvé"
              sx={{ minWidth: 200 }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              required
              type="number"
              label="Quantité"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity")(parseFloat(e.target.value) || 0)}
              inputProps={{ min: 0, step: "any" }}
            />
            <FormControl required sx={{ minWidth: 120 }}>
              <InputLabel>Unité</InputLabel>
              <Select
                value={formData.unit}
                label="Unité"
                onChange={(e) => handleChange("unit")(e.target.value)}
              >
                <MenuItem value="G">grammes (g)</MenuItem>
                <MenuItem value="KG">kilogrammes (kg)</MenuItem>
                <MenuItem value="ML">millilitres (ml)</MenuItem>
                <MenuItem value="L">litres (L)</MenuItem>
                <MenuItem value="MOL">moles (mol)</MenuItem>
                <MenuItem value="PIECE">pièces</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="number"
              label="Stock minimum"
              value={formData.minQuantity}
              onChange={(e) => handleChange("minQuantity")(parseFloat(e.target.value) || 0)}
              inputProps={{ min: 0, step: "any" }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <DatePicker
              label="Date d'achat"
              value={formData.purchaseDate}
              onChange={(date) => handleChange("purchaseDate")(date)}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="Date d'expiration"
              value={formData.expirationDate}
              onChange={(date) => handleChange("expirationDate")(date)}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Fournisseur"
              value={formData.supplier}
              onChange={(e) => handleChange("supplier")(e.target.value)}
            />
            <TextField
              fullWidth
              label="Localisation"
              value={formData.location}
              onChange={(e) => handleChange("location")(e.target.value)}
              placeholder="Armoire A, Étagère 2"
            />
          </Stack>

          <FormControl fullWidth>
            <InputLabel>Statut</InputLabel>
            <Select
              value={formData.status}
              label="Statut"
              onChange={(e) => handleChange("status")(e.target.value as ChemicalStatus)}
            >
              <MenuItem value="IN_STOCK">En stock</MenuItem>
              <MenuItem value="LOW_STOCK">Stock faible</MenuItem>
              <MenuItem value="OUT_OF_STOCK">Rupture de stock</MenuItem>
              <MenuItem value="EXPIRED">Expiré</MenuItem>
              <MenuItem value="USED_UP">Épuisé</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange("notes")(e.target.value)}
            placeholder="Notes additionnelles, précautions d'usage..."
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            {onCancel && (
              <Button variant="outlined" onClick={onCancel} disabled={loading}>
                Annuler
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !formData.name}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? "Enregistrement..." : chemical ? "Modifier" : "Ajouter"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </LocalizationProvider>
  )
}
