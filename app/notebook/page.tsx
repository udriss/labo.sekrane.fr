"use client"

import { useState, useEffect } from "react"
import { Container, Typography, Box, Button, Paper, Stack, Alert, CircularProgress } from "@mui/material"
import { NotebookForm } from "@/components/notebook/notebook-form"
import { NotebookList } from "@/components/notebook/notebook-list"

export default function NotebookPage() {
  const [notebooks, setNotebooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openForm, setOpenForm] = useState(false)

  const fetchNotebooks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/notebook")
      if (!response.ok) throw new Error("Erreur lors du chargement des cahiers TP")
      const data = await response.json()
      setNotebooks(data.notebooks || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotebooks() }, [])

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Cahier de TP (ELN)
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Suivi des travaux pratiques, protocoles, calculs et résultats
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Button variant="contained" color="primary" onClick={() => setOpenForm(true)}>
          Nouveau TP
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <NotebookList notebooks={notebooks} onRefresh={fetchNotebooks} />
      )}
      {openForm && (
        <Paper elevation={8} sx={{ p: 4, mt: 4, borderRadius: 4 }}>
          <NotebookForm onSuccess={() => { setOpenForm(false); fetchNotebooks() }} onCancel={() => setOpenForm(false)} />
        </Paper>
      )}
    </Container>
  )
}
