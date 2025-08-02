"use client"

import { useState, useEffect, useRef } from "react"
import { Chemical, ChemicalStatus } from "@/types/chemicals"
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
    unit: chemical?.unit || "g",
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

  const [suppliers, setSuppliers] = useState<any[]>([])

  // États pour l'auto-complétion
  const [nameOptions, setNameOptions] = useState<any[]>([])
  const [casOptions, setCasOptions] = useState<any[]>([])
  const [isLoadingName, setIsLoadingName] = useState(false)
  const [isLoadingCas, setIsLoadingCas] = useState(false)
  const [existingChemicals, setExistingChemicals] = useState<Chemical[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [rooms, setRooms] = useState<any[]>([])

  // Charger les données preset et existantes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [presetsRes, chemicalsRes, roomsRes] = await Promise.all([
          fetch('/api/preset-chemicals'),
          fetch('/api/chimie/chemicals'),
          fetch('/api/salles?includeLocations=true')
        ])

        if (presetsRes.ok) {
          const presets = await presetsRes.json()
          setPresetCategories(presets)
        }

        if (chemicalsRes.ok) {
          const chemicals = await chemicalsRes.json()
          setExistingChemicals(Array.isArray(chemicals.chemicals) ? chemicals.chemicals : chemicals || [])
        }

        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(roomsData.rooms || [])
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
      const url = chemical ? `/api/chimie/chemicals/${chemical.id}` : "/api/chimie/chemicals"
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
      setNameOptions([]);
      return;
    }

    setIsLoadingName(true);
    try {
      const response = await fetch(`/api/preset-chemicals?query=${encodeURIComponent(inputValue)}&type=name`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données depuis l\'API');
      }
      const results = await response.json();

      // Flatten the results grouped by categories for the autocomplete
      const flattenedResults = results.flatMap((category: any) =>
        category.presetChemicals.map((chemical: any) => ({
          ...chemical,
          categoryName: category.name
        }))
      );

      
      setNameOptions(flattenedResults);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setIsLoadingName(false);
    }
  }

  // Fonction de recherche pour les numéros CAS (structure groupée)
  const handleCasSearch = async (inputValue: string) => {
    if (!inputValue || inputValue.length < 1) {
      setCasOptions([])
      return
    }
    setIsLoadingCas(true)
    try {
      const response = await fetch(`/api/preset-chemicals?query=${encodeURIComponent(inputValue)}&type=cas`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données depuis l\'API');
      }
      const results = await response.json();
      // Flatten the results grouped by categories for the autocomplete
      const flattenedResults = results.flatMap((category: any) =>
        category.presetChemicals.map((chemical: any) => ({
          ...chemical,
          categoryName: category.name
        }))
      );
      setCasOptions(flattenedResults);
      
    } catch (error) {
      console.error('Erreur lors de la recherche:', error)
    } finally {
      setIsLoadingCas(false)
    }
  }

  // Auto-complétion quand on sélectionne un composé par le nom
  const handleNameSelection = (compound: any | null) => {
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
  const handleCasSelection = (compound: any | null) => {
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
            {chemical ? "Modifier le réactif" : "Nouveau réactif chimique"}
          </Typography>

          {/* Alerte de doublon */}
          {duplicateWarning && (
            <Alert severity="warning">
              {duplicateWarning}
            </Alert>
          )}

          {/* Champ nom avec auto-complétion */}
          <Autocomplete
            freeSolo
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            value={formData.name}
            options={presetCategories.flatMap(cat => 
              cat.presetChemicals.map((chem: any) => ({
                ...chem,
                categoryName: cat.name
              }))
            )}
            groupBy={(option) => option.categoryName}
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
            loadingText="Chargement..."
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                required
                label="Nom du réactif"
                placeholder="Commencez à taper le nom..."
                autoComplete="off"
                slotProps={{
                  input: {
                    ...params.InputProps,
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
            renderGroup={(params) => (
              <li key={params.key}>
                <Typography variant="overline" color="primary" sx={{ pl: 2 }}>
                  {params.group}
                </Typography>
                <ul style={{ margin: 0, padding: 0 }}>{params.children}</ul>
              </li>
            )}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              return (
                <Paper key={key} component="li" {...otherProps} sx={{ m: 0.5, p: 1 }}>
                  <ListItemText
                    primary={option.name}
                    secondary={
                      <Typography component="span" variant="caption" color="text.secondary" display="block">
                        Formule: {option.formula} | CAS: {option.casNumber}
                      </Typography>
                    }
                  />
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
              groupBy={(option) => option.categoryName || ''}
              getOptionLabel={(option) => typeof option === 'string' ? option : option.casNumber}
              value={formData.casNumber}
              onInputChange={(_, newInputValue) => {
                if (newInputValue !== null) {
                  handleChange("casNumber")(newInputValue)
                  handleCasSearch(newInputValue)
                  checkDuplicates(formData.name, newInputValue, formData.formula)
                }
              }}
              onChange={(_, newValue) => {
                if (typeof newValue === 'object' && newValue && newValue.casNumber) {
                  handleCasSelection(newValue)
                } else if (typeof newValue === 'string') {
                  handleChange("casNumber")(newValue)
                }
              }}
              loading={isLoadingCas}
              loadingText="Chargement..."
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  label="Numéro CAS"
                  placeholder="7664-93-9"
                  autoComplete="off"
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingCas && <CircularProgress color="inherit" size={20} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
              renderGroup={(params) => (
                <li key={params.key}>
                  <Typography variant="overline" color="primary" sx={{ pl: 2 }}>
                    {params.group}
                  </Typography>
                  <ul style={{ margin: 0, padding: 0 }}>{params.children}</ul>
                </li>
              )}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Paper key={key} component="li" {...otherProps} sx={{ m: 0.5, p: 1 }}>
                    <ListItemText
                      primary={option.casNumber}
                      secondary={
                        <Typography component="span" variant="caption" color="text.secondary" display="block">
                          {option.name} | {option.formula}
                        </Typography>
                      }
                    />
                  </Paper>
                )
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
                <MenuItem value="g">grammes (g)</MenuItem>
                <MenuItem value="kg">kilogrammes (kg)</MenuItem>
                <MenuItem value="mL">millilitres (ml)</MenuItem>
                <MenuItem value="L">litres (l)</MenuItem>
                <MenuItem value="mol">moles (mol)</MenuItem>
                <MenuItem value="pièce">pièces</MenuItem>
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
              label="Date d'achat (optionnelle)"
              value={formData.purchaseDate}
              onChange={(date) => {
                // Correction du problème de timezone
                if (date) {
                  const correctedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
                  handleChange("purchaseDate")(correctedDate)
                } else {
                  handleChange("purchaseDate")(null)
                }
              }}
              openTo="day"
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: "Cliquez pour sélectionner une date",
                  InputProps: {
                    readOnly: true,
                  },
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                },
                actionBar: {
                  actions: ['clear', 'today', 'accept']
                },
                field: {
                  clearable: true,
                  onClear: () => handleChange("purchaseDate")(null)
                }
              }}
              
            />
            <DatePicker
              label="Date d'expiration"
              value={formData.expirationDate}
              onChange={(date) => {
                // Correction du problème de timezone
                if (date) {
                  const correctedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
                  handleChange("expirationDate")(correctedDate)
                } else {
                  handleChange("expirationDate")(null)
                }
              }}
              openTo="day"
              slotProps={{
                textField: {
                  fullWidth: true,
                  onClick: (e: any) => {
                    if (e.target && !(e.target as Element).closest('.MuiIconButton-root')) {
                      const button = e.currentTarget.querySelector('button')
                      if (button) button.click()
                    }
                  }
                },
                popper: {
                  placement: "bottom-start"
                }
              }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Fournisseur"
              value={formData.supplier}
              onChange={(e) => handleChange("supplier")(e.target.value)}
            />
            <Autocomplete
              fullWidth
              options={rooms.flatMap(room => 
                room.locations?.length 
                  ? room.locations.map((location: any) => ({
                      label: location.name,
                      room: room.name,
                      location: location.name,
                      groupLabel: room.name
                    }))
                  : [{ label: room.name, room: room.name, location: '', groupLabel: room.name }]
              )}
              groupBy={(option: any) => option.groupLabel}
              getOptionLabel={(option: any) => option.location ? option.location : option.room}
              value={formData.room && formData.location 
                ? { label: formData.location, room: formData.room, location: formData.location, groupLabel: formData.room }
                : formData.room 
                  ? { label: formData.room, room: formData.room, location: '', groupLabel: formData.room }
                  : null
              }
              onChange={(_, newValue: any) => {
                if (newValue) {
                  handleChange("room")(newValue.room)
                  handleChange("location")(newValue.location)
                } else {
                  handleChange("room")('')
                  handleChange("location")('')
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Localisation"
                  placeholder="Sélectionner une salle et localisation"
                />
              )}
              renderOption={(props, option: any) => {
                const { key, ...otherProps } = props;
                return (
                  <Box component="li" key={key} {...otherProps}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body2">
                        {option.location || option.room}
                      </Typography>
                    </Stack>
                  </Box>
                )
              }}
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
