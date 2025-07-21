"use client"

import { Box, Typography, Paper, Stack, Button } from "@mui/material"

interface EquipmentListProps {
  materiel: any[]
  onRefresh: () => void
}

export function EquipmentList({ materiel, onRefresh }: EquipmentListProps) {
  return (
    <Stack spacing={3}>
      {materiel.length === 0 ? (
        <Typography color="text.secondary" align="center">Aucun matériel enregistré</Typography>
      ) : (
        materiel.map(item => (
          <Paper key={item.id} elevation={3} sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">{item.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{item.type} — Quantité : {item.quantity}</Typography>
              </Box>
              <Button variant="outlined" onClick={onRefresh}>Actualiser</Button>
            </Stack>
          </Paper>
        ))
      )}
    </Stack>
  )
}
