"use client"

import { useState, useEffect } from "react"
import {
  Container, Typography, Box, Card, CardContent, Button, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Chip, Paper, Grid, Fab
} from "@mui/material"
import {
  Add, Edit, Delete, Save, Cancel, School
} from "@mui/icons-material"

interface Class {
  id: string
  value: string
  sortOrder?: number
}

export default function ClassesManagement() {
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [formData, setFormData] = useState({
    value: '',
    sortOrder: 0
  })

  // Charger les classes
  const fetchClasses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configurable-lists?type=classes')
      
      if (response.ok) {
        const data = await response.json()
        setClasses(data.items || [])
      } else {
        // Si aucune classe n'existe, initialiser avec les classes par défaut
        const defaultClasses = [
          '201', '202', '203', '204', '205', '206', 
          '1ère ES', '1ère STI2D', 'Tle STI2D', 'Tle ES'
        ]
        for (let i = 0; i < defaultClasses.length; i++) {
          await createClass(defaultClasses[i], i + 1)
        }
        await fetchClasses() // Recharger après création
        return
      }
    } catch (error) {
      setError('Erreur lors du chargement des classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  // Créer une nouvelle classe
  const createClass = async (value: string, sortOrder?: number) => {
    try {
      const response = await fetch('/api/configurable-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'classes',
          value,
          sortOrder
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création')
      }

      return true
    } catch (error) {
      console.error('Erreur création classe:', error)
      return false
    }
  }

  // Ouvrir le dialog pour créer/éditer
  const handleOpenDialog = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem)
      setFormData({
        value: classItem.value,
        sortOrder: classItem.sortOrder || 0
      })
    } else {
      setEditingClass(null)
      setFormData({
        value: '',
        sortOrder: classes.length + 1
      })
    }
    setIsDialogOpen(true)
  }

  // Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingClass(null)
    setFormData({
      value: '',
      sortOrder: 0
    })
  }

  // Sauvegarder
  const handleSave = async () => {
    try {
      if (!formData.value.trim()) {
        setError('Le nom de la classe est requis')
        return
      }

      const url = '/api/configurable-lists'
      const method = editingClass ? 'PUT' : 'POST'
      
      const payload = {
        ...(editingClass && { id: editingClass.id }),
        type: 'classes',
        value: formData.value,
        sortOrder: formData.sortOrder
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

      await fetchClasses()
      handleCloseDialog()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    }
  }

  // Supprimer une classe
  const handleDelete = async (classId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette classe ?')) {
      return
    }

    try {
      const response = await fetch(`/api/configurable-lists?id=${classId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await fetchClasses()
      setError(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          <School sx={{ mr: 2, verticalAlign: 'middle' }} />
          Gestion des classes
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Nouvelle classe
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
        <Grid container spacing={2}>
          {classes.map((classItem) => (
            <Grid key={classItem.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                      {classItem.value}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(classItem)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(classItem.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </Box>
                  {classItem.sortOrder && (
                    <Typography variant="body2" color="text.secondary">
                      Ordre: {classItem.sortOrder}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog pour créer/éditer une classe */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingClass ? 'Modifier la classe' : 'Nouvelle classe'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Nom de la classe"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              required
              placeholder="ex: 201, 1ère ES, Tle STI2D..."
            />
            
            <TextField
              fullWidth
              label="Ordre d'affichage"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
              helperText="Ordre d'affichage dans les listes (optionnel)"
            />
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
            disabled={!formData.value.trim()}
          >
            {editingClass ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
