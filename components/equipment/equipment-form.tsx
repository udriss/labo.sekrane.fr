"use client"

import { useState } from "react"
import { Box, TextField, Button, Stack, Typography, Alert } from "@mui/material"

interface EquipmentFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function EquipmentForm({ onSuccess, onCancel }: EquipmentFormProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/materiel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, quantity })
      })
      if (!res.ok) throw new Error("Erreur lors de la création du matériel")
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Typography variant="h5">Ajouter un matériel</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Nom du matériel" value={name} onChange={e => setName(e.target.value)} required fullWidth />
        <TextField label="Type" value={type} onChange={e => setType(e.target.value)} required fullWidth />
        <TextField label="Quantité" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} required fullWidth />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel} disabled={loading}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={loading || !name || !type}>Créer</Button>
        </Stack>
      </Stack>
    </Box>
  )
}
