"use client"

import { useState } from "react"
import { Box, TextField, Button, Stack, Typography, Alert } from "@mui/material"

interface NotebookFormProps {
  discipline?: 'chimie' | 'physique' | 'general'
  onSuccess: () => void
  onCancel: () => void
}

export function NotebookForm({ discipline = 'general', onSuccess, onCancel }: NotebookFormProps) {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content })
      })
      if (!res.ok) throw new Error("Erreur lors de la création du TP")
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
        <Typography variant="h5">Nouveau TP</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Titre du TP" value={title} onChange={e => setTitle(e.target.value)} required fullWidth />
        <TextField label="Contenu / Protocole" value={content} onChange={e => setContent(e.target.value)} required fullWidth multiline rows={6} />
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={onCancel} disabled={loading}>Annuler</Button>
          <Button type="submit" variant="contained" disabled={loading || !title || !content}>Créer</Button>
        </Stack>
      </Stack>
    </Box>
  )
}
