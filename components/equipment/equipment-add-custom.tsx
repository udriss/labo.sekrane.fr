"use client"

import { useState } from "react"
import { Box, Typography, TextField, Button, Stack } from "@mui/material"

export function EquipmentAddCustom({ onAdd }: { onAdd: (item: any) => void }) {
  const [name, setName] = useState("")
  const [volume, setVolume] = useState("")
  const [image, setImage] = useState<string | null>(null)

  const handleAdd = () => {
    if (name && volume) {
      onAdd({ name, volume, image })
      setName("")
      setVolume("")
      setImage(null)
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Ajouter un matériel personnalisé</Typography>
      <Stack spacing={2} direction={{ xs: "column", sm: "row" }}>
        <TextField
          label="Nom du matériel"
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Volume (mL)"
          value={volume}
          onChange={e => setVolume(e.target.value)}
          type="number"
          fullWidth
        />
        <Button variant="contained" component="label" sx={{ minWidth: 120 }}>
          Ajouter une image
          <input type="file" accept="image/*" hidden onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              const reader = new FileReader()
              reader.onload = ev => setImage(ev.target?.result as string)
              reader.readAsDataURL(file)
            }
          }} />
        </Button>
        {image && <img src={image} alt="aperçu" style={{ width: 48, height: 48, borderRadius: 8 }} />}
        <Button variant="contained" onClick={handleAdd} disabled={!name || !volume}>
          Ajouter
        </Button>
      </Stack>
    </Box>
  )
}
