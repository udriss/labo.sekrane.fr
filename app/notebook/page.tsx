"use client"

import { useState } from "react"
import { Box, Container, Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material"
import { Close } from "@mui/icons-material"
import { NotebookList } from "@/components/notebook/notebook-list"
import { NotebookForm } from "@/components/notebook/notebook-form"
import { NotebookFormAdvanced } from "@/components/notebook/notebook-form-advanced"

export default function NotebookPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddNew = () => {
    setEditingEntry(null)
    setShowForm(true)
  }

  const handleEdit = (entry: any) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingEntry(null)
    setRefreshKey(prev => prev + 1)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <NotebookList 
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAddNew}
      />

      <Dialog 
        open={showForm} 
        onClose={handleFormCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingEntry ? 'Modifier le TP' : 'Nouveau TP'}
          <IconButton onClick={handleFormCancel}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingEntry ? (
            <NotebookForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <NotebookFormAdvanced
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  )
}
