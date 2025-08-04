"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Autocomplete,
  Stack,
  CircularProgress
} from "@mui/material"
import { Save, Cancel } from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { fr } from "date-fns/locale"

interface PhysicsConsumableAddTabProps {
  onConsumableAdded?: () => void
}

interface ConsumableType {
  id: string
  name: string
  color: string
}

interface Room {
  id: string
  name: string
  description?: string
  capacity?: number
  locations: Array<{
    id: string
    name: string
    description?: string
  }>
}

const units = [
  'pieces',
  'kg',
  'g',
  'mg',
  'L',
  'mL',
  'm',
  'cm',
  'mm'
]

export default function PhysicsConsumableAddTab({ onConsumableAdded }: PhysicsConsumableAddTabProps) {
  const [formData, setFormData] = useState({
    name: "",
    physics_consumable_type_id: "",
    quantity: 0,
    unit: "pieces",
    brand: "",
    model: "",
    specifications: "",
    purchaseDate: null as Date | null,
    expirationDate: null as Date | null,
    room: "",
    location: "",
    notes: ""
  })

  const [types, setTypes] = useState<ConsumableType[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Charger les types et les salles
  useEffect(() => {
    const loadData = async () => {
      try {
        const [typesRes, roomsRes] = await Promise.all([
          fetch('/api/physique/consommables-types'),
          fetch('/api/rooms?useDatabase=true')
        ])

        if (typesRes.ok) {
          const typesData = await typesRes.json()
          setTypes(typesData.types || [])
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

  const handleChange = (field: string) => (value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Le nom du consommable est requis")
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Préparer les données avec room et location as JSON objects
      const selectedRoomData = rooms.find(room => room.name === formData.room)
      const roomData = selectedRoomData ? {
        id: selectedRoomData.id,
        name: selectedRoomData.name,
        description: selectedRoomData.description,
        capacity: selectedRoomData.capacity
      } : null

      const selectedLocationData = selectedRoomData?.locations.find(loc => loc.name === formData.location)
      const locationData = selectedLocationData ? {
        id: selectedLocationData.id,
        name: selectedLocationData.name,
        room_id: selectedRoomData?.id,
        is_active: true,
        description: selectedLocationData.description
      } : null

      const dataToSubmit = {
        ...formData,
        room: roomData,
        location: locationData
      }

      const response = await fetch('/api/physique/consommables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Consommable physique ajouté avec succès")
        
        // Réinitialiser le formulaire
        setFormData({
          name: "",
          physics_consumable_type_id: "",
          quantity: 0,
          unit: "pieces",
          brand: "",
          model: "",
          specifications: "",
          purchaseDate: null,
          expirationDate: null,
          room: "",
          location: "",
          notes: ""
        })

        if (onConsumableAdded) {
          setTimeout(() => {
            onConsumableAdded()
          }, 1000)
        }
      } else {
        setError(data.error || "Erreur lors de l'ajout")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  const selectedRoom = rooms.find(room => room.name === formData.room)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box p={3}>
        <Typography variant="h6" component="h2" gutterBottom>
          Ajouter un Consommable Physique
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Informations de base */}
            <Grid size = {{ xs: 12, md:6 }}>
              <TextField
                fullWidth
                label="Nom du consommable *"
                value={formData.name}
                onChange={(e) => handleChange("name")(e.target.value)}
                required
              />
            </Grid>

            <Grid size = {{ xs: 12, md:6 }}>
              <FormControl fullWidth>
                <InputLabel>Type de consommable</InputLabel>
                <Select
                  value={formData.physics_consumable_type_id}
                  label="Type de consommable"
                  onChange={(e) => handleChange("physics_consumable_type_id")(e.target.value)}
                >
                  <MenuItem value="">
                    <em>Aucun type spécifique</em>
                  </MenuItem>
                  {types.map((type) => (
                    <MenuItem key={type.id} value={type.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            bgcolor: type.color,
                            borderRadius: '50%'
                          }}
                        />
                        {type.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Quantité et unité */}
            <Grid size = {{ xs: 12, md:6 }}>
              <TextField
                fullWidth
                label="Quantité"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity")(Number(e.target.value))}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>

            <Grid size = {{ xs: 12, md:6 }}>
              <FormControl fullWidth>
                <InputLabel>Unité</InputLabel>
                <Select
                  value={formData.unit}
                  label="Unité"
                  onChange={(e) => handleChange("unit")(e.target.value)}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {unit}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Marque et modèle */}
            <Grid size = {{ xs: 12, md:6 }}>
              <TextField
                fullWidth
                label="Marque"
                value={formData.brand}
                onChange={(e) => handleChange("brand")(e.target.value)}
              />
            </Grid>

            <Grid size = {{ xs: 12, md:6 }}>
              <TextField
                fullWidth
                label="Modèle"
                value={formData.model}
                onChange={(e) => handleChange("model")(e.target.value)}
              />
            </Grid>

            {/* Dates */}
            <Grid size = {{ xs: 12, md:6 }}>
              <DatePicker
                label="Date d'achat"
                value={formData.purchaseDate}
                onChange={(date) => handleChange("purchaseDate")(date)}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>

            <Grid size = {{ xs: 12, md:6 }}>
              <DatePicker
                label="Date d'expiration"
                value={formData.expirationDate}
                onChange={(date) => handleChange("expirationDate")(date)}
                slotProps={{
                  textField: { fullWidth: true }
                }}
              />
            </Grid>

            {/* Localisation */}
            <Grid size = {{ xs: 12, md:6 }}>
              <Autocomplete
                options={rooms}
                getOptionLabel={(room) => room.name}
                value={rooms.find(room => room.name === formData.room) || null}
                onChange={(_, newValue) => {
                  handleChange("room")(newValue?.name || "")
                  handleChange("location")("") // Reset location
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Salle" />
                )}
              />
            </Grid>

            <Grid size = {{ xs: 12, md:6 }}>
              {formData.room && selectedRoom?.locations && selectedRoom.locations.length > 0 && (
                <FormControl fullWidth>
                  <InputLabel>Localisation précise</InputLabel>
                  <Select
                    value={formData.location}
                    label="Localisation précise"
                    onChange={(e) => handleChange("location")(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Aucune localisation précise</em>
                    </MenuItem>
                    {selectedRoom.locations.map((location) => (
                      <MenuItem key={location.id} value={location.name}>
                        {location.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            {/* Spécifications */}
            <Grid size = {{ xs: 12 }}>
              <TextField
                fullWidth
                label="Spécifications techniques"
                multiline
                rows={3}
                value={formData.specifications}
                onChange={(e) => handleChange("specifications")(e.target.value)}
                placeholder="Décrivez les caractéristiques techniques du consommable..."
              />
            </Grid>

            {/* Notes */}
            <Grid size = {{ xs: 12 }}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => handleChange("notes")(e.target.value)}
                placeholder="Notes additionnelles..."
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
            >
              {loading ? "Ajout en cours..." : "Ajouter"}
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setFormData({
                  name: "",
                  physics_consumable_type_id: "",
                  quantity: 0,
                  unit: "pieces",
                  brand: "",
                  model: "",
                  specifications: "",
                  purchaseDate: null,
                  expirationDate: null,
                  room: "",
                  location: "",
                  notes: ""
                })
                setError(null)
                setSuccess(null)
              }}
              startIcon={<Cancel />}
            >
              Réinitialiser
            </Button>
          </Stack>
        </Paper>
      </Box>
    </LocalizationProvider>
  )
}
