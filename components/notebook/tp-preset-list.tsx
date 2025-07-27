"use client"

import { useState, useEffect } from "react"
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Alert, 
  CircularProgress,
  Chip,
  Stack,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  ListItemText,
  Checkbox,
  IconButton,
  Tooltip
} from "@mui/material"
import { Add, Edit, Delete, Science, Engineering } from "@mui/icons-material"

interface Chemical {
  id: string
  nom: string
  formule?: string
}

interface Material {
  id: string
  nom: string
  type: string
}

interface TpPreset {
  id: string
  nom: string
  description?: string
  niveau: string
  matiere: string
  dureeEstimee?: number
  instructions?: string
  chemicals: Array<{
    chemical: Chemical
    quantite: number
    unite: string
  }>
  materials: Array<{
    material: Material
    quantite: number
  }>
  createdBy: {
    nom: string
    prenom: string
  }
  createdAt: string
}

const MENU_ITEM_HEIGHT = 48
const MENU_ITEM_PADDING_TOP = 8
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: MENU_ITEM_HEIGHT * 4.5 + MENU_ITEM_PADDING_TOP,
      width: 250,
    },
  },
}

const niveaux = ["L1", "L2", "L3", "M1", "M2"]
const matieres = ["Chimie générale", "Chimie organique", "Chimie analytique", "Biochimie", "Physique"]

export function TpPresetList() {
  const [presets, setPresets] = useState<TpPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPreset, setEditingPreset] = useState<TpPreset | null>(null)
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [materials, setMaterials] = useState<Material[]>([])

  // Form state
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    niveau: "",
    matiere: "",
    dureeEstimee: "",
    instructions: "",
    chemicalIds: [] as string[],
    materialIds: [] as string[]
  })

  const fetchPresets = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tp-presets")
      if (!response.ok) throw new Error("Erreur lors du chargement des presets TP")
      const data = await response.json()
      setPresets(data.presets || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  const fetchChemicals = async () => {
    try {
      const response = await fetch("/api/chemicals")
      if (!response.ok) throw new Error("Erreur lors du chargement des réactifs chimiques")
      const data = await response.json()
      setChemicals(data.chemicals || [])
    } catch (error) {
      console.error("Erreur lors du chargement des réactifs chimiques:", error)
    }
  }

  const fetchMaterials = async () => {
    try {
      const response = await fetch("/api/equipement")
      if (!response.ok) throw new Error("Erreur lors du chargement du matériel")
      const data = await response.json()
      setMaterials(data.equipement || [])
    } catch (error) {
      console.error("Erreur lors du chargement du matériel:", error)
    }
  }

  useEffect(() => {
    fetchPresets()
    fetchChemicals()
    fetchMaterials()
  }, [])

  const handleOpenDialog = (preset?: TpPreset) => {
    if (preset) {
      setEditingPreset(preset)
      setFormData({
        nom: preset.nom,
        description: preset.description || "",
        niveau: preset.niveau,
        matiere: preset.matiere,
        dureeEstimee: preset.dureeEstimee?.toString() || "",
        instructions: preset.instructions || "",
        chemicalIds: preset.chemicals.map(c => c.chemical.id),
        materialIds: preset.materials.map(m => m.material.id)
      })
    } else {
      setEditingPreset(null)
      setFormData({
        nom: "",
        description: "",
        niveau: "",
        matiere: "",
        dureeEstimee: "",
        instructions: "",
        chemicalIds: [],
        materialIds: []
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingPreset(null)
  }

  const handleSubmit = async () => {
    try {
      const url = editingPreset ? `/api/tp-presets?id=${editingPreset.id}` : "/api/tp-presets"
      const method = editingPreset ? "PUT" : "POST"
      
      const body = {
        nom: formData.nom,
        description: formData.description || undefined,
        niveau: formData.niveau,
        matiere: formData.matiere,
        dureeEstimee: formData.dureeEstimee ? parseInt(formData.dureeEstimee) : undefined,
        instructions: formData.instructions || undefined,
        chemicalIds: formData.chemicalIds,
        materialIds: formData.materialIds
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement")
      
      handleCloseDialog()
      fetchPresets()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce preset TP ?")) return
    
    try {
      const response = await fetch(`/api/tp-presets?id=${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Erreur lors de la suppression")
      fetchPresets()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">TP Presets</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
          Nouveau Preset
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 3 }}>
        {presets.map((preset) => (
          <Card key={preset.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="h3">
                    {preset.nom}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpenDialog(preset)}>
                      <Edit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(preset.id)}>
                      <Delete />
                    </IconButton>
                  </Box>
                </Box>
                
                {preset.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {preset.description}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip label={preset.niveau} size="small" color="primary" />
                  <Chip label={preset.matiere} size="small" color="secondary" />
                </Stack>

                {preset.dureeEstimee && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Durée estimée: {preset.dureeEstimee} min
                  </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Science fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {preset.chemicals.length} réactifs
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Engineering fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {preset.materials.length} matériels
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Créé par {preset.createdBy.prenom} {preset.createdBy.nom}
                </Typography>
              </CardContent>
            </Card>
          ))}
      </Box>

      {/* Dialog for creating/editing presets */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPreset ? "Modifier le preset TP" : "Nouveau preset TP"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <TextField
              label="Nom du TP"
              value={formData.nom}
              onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Niveau</InputLabel>
                <Select
                  value={formData.niveau}
                  onChange={(e) => setFormData({ ...formData, niveau: e.target.value })}
                  label="Niveau"
                  required
                >
                  {niveaux.map((niveau) => (
                    <MenuItem key={niveau} value={niveau}>
                      {niveau}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ flex: 1 }}>
                <InputLabel>Matière</InputLabel>
                <Select
                  value={formData.matiere}
                  onChange={(e) => setFormData({ ...formData, matiere: e.target.value })}
                  label="Matière"
                  required
                >
                  {matieres.map((matiere) => (
                    <MenuItem key={matiere} value={matiere}>
                      {matiere}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <TextField
              label="Durée estimée (minutes)"
              type="number"
              value={formData.dureeEstimee}
              onChange={(e) => setFormData({ ...formData, dureeEstimee: e.target.value })}
              fullWidth
            />

            <TextField
              label="Instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />

            <FormControl>
              <InputLabel>Réactifs chimiques</InputLabel>
              <Select
                multiple
                value={formData.chemicalIds}
                onChange={(e) => setFormData({ ...formData, chemicalIds: e.target.value as string[] })}
                input={<OutlinedInput label="Réactifs chimiques" />}
                renderValue={(selected) => 
                  chemicals
                    .filter(c => selected.includes(c.id))
                    .map(c => c.nom)
                    .join(', ')
                }
                MenuProps={MenuProps}
              >
                {chemicals.map((chemical) => (
                  <MenuItem key={chemical.id} value={chemical.id}>
                    <Checkbox checked={formData.chemicalIds.includes(chemical.id)} />
                    <ListItemText primary={chemical.nom} secondary={chemical.formule} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <InputLabel>Matériel</InputLabel>
              <Select
                multiple
                value={formData.materialIds}
                onChange={(e) => setFormData({ ...formData, materialIds: e.target.value as string[] })}
                input={<OutlinedInput label="Matériel" />}
                renderValue={(selected) => 
                  materials
                    .filter(m => selected.includes(m.id))
                    .map(m => m.nom)
                    .join(', ')
                }
                MenuProps={MenuProps}
              >
                {materials.map((material) => (
                  <MenuItem key={material.id} value={material.id}>
                    <Checkbox checked={formData.materialIds.includes(material.id)} />
                    <ListItemText primary={material.nom} secondary={material.type} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.nom || !formData.niveau || !formData.matiere}>
            {editingPreset ? "Modifier" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
