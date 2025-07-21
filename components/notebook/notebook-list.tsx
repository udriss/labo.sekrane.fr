"use client"

import { Box, Typography, Paper, Stack, Button } from "@mui/material"

interface NotebookListProps {
  notebooks: any[]
  onRefresh: () => void
}

export function NotebookList({ notebooks, onRefresh }: NotebookListProps) {
  return (
    <Stack spacing={3}>
      {notebooks.length === 0 ? (
        <Typography color="text.secondary" align="center">Aucun TP enregistré</Typography>
      ) : (
        notebooks.map(notebook => (
          <Paper key={notebook.id} elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{notebook.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{notebook.content}</Typography>
              </Box>
              <Button variant="outlined" onClick={onRefresh}>Actualiser</Button>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  )
}
