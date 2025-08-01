"use client"

import { useState, useEffect } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  FormControlLabel,
  Switch
} from "@mui/material"
import {
  Add,
  Edit,
  Delete,
  Business,
  Email,
  Phone,
  Web,
  Person,
  LocationOn
} from "@mui/icons-material"
import { Supplier } from "@/types/chemicals"

interface SupplierFormData {
  name: string
  email: string
  phone: string
  address: string
  website: string
  contactPerson: string
  isActive: boolean
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    contactPerson: "",
    isActive: true
  })

  // Charger les fournisseurs
  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      
      if (response.ok) {
        setSuppliers(data.suppliers || [])
      } else {
        setError(data.error || "Erreur lors du chargement")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  // Ouvrir le dialogue pour ajouter un fournisseur
  const handleAdd = () => {
    setEditingSupplier(null)
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      contactPerson: "",
      isActive: true
    })
    setOpenDialog(true)
  }

  // Ouvrir le dialogue pour éditer un fournisseur
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      website: supplier.website || "",
      contactPerson: supplier.contactPerson || "",
      isActive: supplier.isActive
    })
    setOpenDialog(true)
  }

  // Sauvegarder le fournisseur
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Le nom du fournisseur est requis")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}`
        : '/api/suppliers'
      
      const method = editingSupplier ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setOpenDialog(false)
        await loadSuppliers()
      } else {
        setError(data.error || "Erreur lors de la sauvegarde")
      }
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setSubmitting(false)
    }
  }

  // Supprimer un fournisseur
  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le fournisseur "${supplier.name}" ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        await loadSuppliers()
      } else {
        setError(data.error || "Erreur lors de la suppression")
      }
    } catch (err) {
      setError("Erreur de connexion")
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestion des Fournisseurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
        >
          Ajouter un fournisseur
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2 }}>
          {suppliers.map((supplier) => (
            <Card key={supplier.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" component="h3">
                        {supplier.name}
                      </Typography>
                      <Chip
                        size="small"
                        color={supplier.isActive ? "success" : "default"}
                        label={supplier.isActive ? "Actif" : "Inactif"}
                      />
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(supplier)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Stack spacing={1}>
                    {supplier.email && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {supplier.email}
                        </Typography>
                      </Stack>
                    )}

                    {supplier.phone && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {supplier.phone}
                        </Typography>
                      </Stack>
                    )}

                    {supplier.website && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Web sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography 
                          variant="body2" 
                          color="primary" 
                          component="a"
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ textDecoration: 'none' }}
                        >
                          {supplier.website}
                        </Typography>
                      </Stack>
                    )}

                    {supplier.contactPerson && (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Person sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {supplier.contactPerson}
                        </Typography>
                      </Stack>
                    )}

                    {supplier.address && (
                      <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.25 }} />
                        <Typography variant="body2" color="text.secondary">
                          {supplier.address}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Box>
      )}

      {/* Dialog pour ajouter/éditer un fournisseur */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingSupplier ? "Modifier le fournisseur" : "Ajouter un fournisseur"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Nom du fournisseur *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            
            <TextField
              fullWidth
              label="Téléphone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            
            <TextField
              fullWidth
              label="Site web"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
            
            <TextField
              fullWidth
              label="Personne de contact"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
            />
            
            <TextField
              fullWidth
              label="Adresse"
              multiline
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Fournisseur actif"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            disabled={submitting || !formData.name.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : "Sauvegarder"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
