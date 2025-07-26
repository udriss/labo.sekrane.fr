// components/equipment/enhanced-chip.tsx
import { Chip, ChipProps } from '@mui/material'
import { 
  Science, // pour volumes
  Straighten, // pour tailles
  Biotech, // pour matériaux
  Speed // pour résolutions
} from '@mui/icons-material'

interface EnhancedChipProps extends ChipProps {
  type: 'volume' | 'resolution' | 'taille' | 'materiau'
  value: string
}

const CHIP_ICONS = {
  volume: Science,
  resolution: Speed,
  taille: Straighten,
  materiau: Biotech
}

export function EnhancedChip({ type, value, ...props }: EnhancedChipProps) {
  const Icon = CHIP_ICONS[type]
  
  return (
    <Chip
      icon={<Icon sx={{ fontSize: 16 }} />}
      label={value}
      {...props}
    />
  )
}