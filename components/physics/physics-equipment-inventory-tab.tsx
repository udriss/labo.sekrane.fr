"use client"

import { Box, Typography } from "@mui/material"

interface PhysicsEquipmentInventoryTabProps {
  onStatsUpdate?: () => void
}

export default function PhysicsEquipmentInventoryTab({ onStatsUpdate }: PhysicsEquipmentInventoryTabProps) {
  return (
    <Box p={3}>
      <Typography variant="h6" component="h2" gutterBottom>
        Inventaire des Équipements Physiques
      </Typography>
      <Typography color="text.secondary">
        Fonctionnalité en cours de développement...
      </Typography>
    </Box>
  )
}
