"use client"

import { useState, useEffect } from "react"
import {
  Container, Typography, Box, Card, CardContent, Button, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Paper, Grid, Accordion, AccordionSummary, AccordionDetails,
  Fab, Divider
} from "@mui/material"
import {
  Add, Edit, Delete, ExpandMore, Room, LocationOn,
  Save, Cancel, Home, Storage
} from "@mui/icons-material"

interface RoomLocation {
  id: string
  name: string
  description?: string
}

interface Room {
  id: string
  name: string
  description?: string
  locations?: RoomLocation[]
}

export default function RoomsManagement() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locations: [{ name: '', description: '' }]
  })

  // Charger les salles
  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/salles?includeLocations=true')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des salles')
      }
      
      const data = await response.json()
      setRooms(data.rooms)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  // Ouvrir le dialog pour créer/éditer
  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room)
      setFormData({
        name: room.name,
        description: room.description || '',
        locations: room.locations?.length ? 
          room.locations.map(loc => ({ name: loc.name, description: loc.description || '' })) :
          [{ name: '', description: '' }]
      })
    } else {
      setEditingRoom(null)
      setFormData({
        name: '',
        description: '',
        locations: [{ name: '', description: '' }]
      })
    }
    setIsDialogOpen(true)
  }

  // Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingRoom(null)
    setFormData({
      name: '',
      description: '',
      locations: [{ name: '', description: '' }]
    })
  }

  // Ajouter une nouvelle localisation
  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [...prev.locations, { name: '', description: '' }]
    }))
  }

  // Supprimer une localisation
  const removeLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== index)
    }))
  }

  // Mettre à jour une localisation
  const updateLocation = (index: number, field: 'name' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((loc, i) => 
        i === index ? { ...loc, [field]: value } : loc
      )
    }))
  }

  // Sauvegarder
  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        setError('Le nom de la salle est requis')
        return
      }

      const url = editingRoom ? `/api/salles` : '/api/salles'
      const method = editingRoom ? 'PUT' : 'POST'
      
      const payload = {
        ...(editingRoom && { id: editingRoom.id }),
        name: formData.name,
        description: formData.description,
        locations: formData.locations.filter(loc => loc.name.trim())
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }

      await fetchRooms()
      handleCloseDialog()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    }
  }

  // Supprimer une salle
  const handleDelete = async (roomId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette salle ?')) {
      return
    }

    try {
      const response = await fetch(`/api/salles?id=${roomId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchRooms()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          <Home sx={{ mr: 2, verticalAlign: 'middle' }} />
          Gestion des salles et localisations
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nouvelle salle
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <Grid container spacing={3}>
          {rooms.map((room) => (
            <Grid key={room.id} size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        <Room sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {room.name}
                      </Typography>
                      {room.description && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {room.description}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(room)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(room.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    <LocationOn sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                    Localisations ({room.locations?.length || 0})
                  </Typography>

                  {room.locations && room.locations.length > 0 ? (
                    <Stack spacing={1}>
                      {room.locations.map((location) => (
                        <Chip
                          key={location.id}
                          label={location.description ? 
                            `${location.name} - ${location.description}` : 
                            location.name
                          }
                          variant="outlined"
                          size="small"
                          icon={<Storage />}
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" style={{ fontStyle: 'italic' }}>
                      Aucune localisation définie
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog pour créer/éditer une salle */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRoom ? 'Modifier la salle' : 'Nouvelle salle'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Nom de la salle"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Localisations dans la salle</Typography>
                <Button startIcon={<Add />} onClick={addLocation} size="small">
                  Ajouter
                </Button>
              </Box>

              <Stack spacing={2}>
                {formData.locations.map((location, index) => (
                  <Paper key={index} elevation={1} sx={{ p: 2 }}>
                    <Box display="flex" gap={2} alignItems="flex-start">
                      <TextField
                        label="Nom de la localisation"
                        value={location.name}
                        onChange={(e) => updateLocation(index, 'name', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                        placeholder="ex: Armoire A, Étagère 1..."
                      />
                      <TextField
                        label="Description"
                        value={location.description}
                        onChange={(e) => updateLocation(index, 'description', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                        placeholder="ex: Réactifs chimiques, Matériel fragile..."
                      />
                      {formData.locations.length > 1 && (
                        <IconButton
                          onClick={() => removeLocation(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<Save />}
            disabled={!formData.name.trim()}
          >
            {editingRoom ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
