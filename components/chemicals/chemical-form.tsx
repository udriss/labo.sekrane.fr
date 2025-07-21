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
  IconButton
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

          <TextField
            fullWidth
            required
            label="Nom du produit"
            value={formData.name}
            onChange={(e) => handleChange("name")(e.target.value)}
          />

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Formule chimique"
              value={formData.formula}
              onChange={(e) => handleChange("formula")(e.target.value)}
              placeholder="H2SO4"
            />
            <TextField
              fullWidth
              label="Numéro CAS"
              value={formData.casNumber}
              onChange={(e) => handleChange("casNumber")(e.target.value)}
              placeholder="7664-93-9"
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
                <MenuItem value="ml">millilitres (ml)</MenuItem>
                <MenuItem value="L">litres (L)</MenuItem>
                <MenuItem value="mol">moles (mol)</MenuItem>
                <MenuItem value="pieces">pièces</MenuItem>
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
