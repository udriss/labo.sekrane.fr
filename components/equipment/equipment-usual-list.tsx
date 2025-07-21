"use client"

import { useState } from "react"
import { Box, Typography, Grid, Paper, Button, Dialog, DialogTitle, DialogContent, TextField, Stack, MenuItem } from "@mui/material"
import { SvgIcon } from "@mui/material"

const USUAL_EQUIPMENT = [
  { name: "Bécher", svg: "/svg/beaker.svg", volumes: [50, 100, 250, 500, 1000] },
  { name: "Erlenmeyer", svg: "/svg/erlenmeyer.svg", volumes: [50, 100, 250, 500, 1000] },
  { name: "Pipette", svg: "/svg/pipette.svg", volumes: [1, 5, 10, 25, 50] },
  { name: "Burette", svg: "/svg/burette.svg", volumes: [10, 25, 50] },
  { name: "Ballon", svg: "/svg/ballon.svg", volumes: [100, 250, 500, 1000] },
  { name: "Tube à essai", svg: "/svg/tube.svg", volumes: [10, 20, 50] },
  { name: "Flacon", svg: "/svg/flacon.svg", volumes: [100, 250, 500, 1000] },
]

export function EquipmentUsualList({ onAdd }: { onAdd: (item: any) => void }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [volumes, setVolumes] = useState<number[]>([])
  const [customVolume, setCustomVolume] = useState("")

  const handleSelect = (item: any) => {
    setSelected(item)
    setOpen(true)
    setVolumes([])
    setCustomVolume("")
  }

  const handleAdd = () => {
    const allVolumes = [...volumes]
    if (customVolume) {
      allVolumes.push(Number(customVolume))
    }
    if (selected && allVolumes.length > 0) {
      onAdd({ name: selected.name, volumes: allVolumes, svg: selected.svg })
      setOpen(false)
    }
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Matériel usuel</Typography>
      <Grid container spacing={3} columns={12} justifyContent="center">
        {USUAL_EQUIPMENT.map(item => (
          <Grid key={item.name} sx={{ display: 'flex', justifyContent: 'center', gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
            <Paper elevation={3} sx={{ p: 2, textAlign: "center", cursor: "pointer", borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={() => handleSelect(item)}>
              <img src={item.svg} alt={item.name} style={{ width: 48, height: 48, marginBottom: 8, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} onError={e => { e.currentTarget.src = '/svg/default.svg' }} />
              <Typography variant="subtitle1">{item.name}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Choisir les volumes pour {selected?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Volumes prédéfinis</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selected?.volumes?.map((v: number) => (
                <Button
                  key={v}
                  variant={volumes.includes(v) ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setVolumes(volumes.includes(v) ? volumes.filter(x => x !== v) : [...volumes, v])}
                  sx={{ minWidth: 64 }}
                >
                  {v} mL
                </Button>
              ))}
            </Stack>
            <TextField
              label="Volume personnalisé (mL)"
              value={customVolume}
              onChange={e => setCustomVolume(e.target.value)}
              type="number"
              fullWidth
            />
            <Button variant="contained" onClick={handleAdd} disabled={volumes.length === 0 && !customVolume}>
              Ajouter
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
