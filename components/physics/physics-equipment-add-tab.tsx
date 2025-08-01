"use client"

import { Box, Typography } from "@mui/material"

interface PhysicsEquipmentAddTabProps {
  onEquipmentAdded?: () => void
}

export default function PhysicsEquipmentAddTab({ onEquipmentAdded }: PhysicsEquipmentAddTabProps) {
  return (
    <Box p={3}>
      <Typography variant="h6" component="h2" gutterBottom>
        Ajouter un Équipement Physique
      </Typography>
      <Typography color="text.secondary">
        Fonctionnalité en cours de développement...
      </Typography>
    </Box>
  )
}
