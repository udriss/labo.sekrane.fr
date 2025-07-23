'use client'

import React from 'react'
import { ToggleButtonGroup, ToggleButton, Tooltip, Box } from '@mui/material'
import { ViewModule, ViewList } from '@mui/icons-material'

interface ViewToggleProps {
  viewMode: 'cards' | 'list'
  onViewModeChange: (event: React.MouseEvent<HTMLElement>, newViewMode: 'cards' | 'list') => void
}

const ViewToggle: React.FC<ViewToggleProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <Box>
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={onViewModeChange}
        aria-label="Mode d'affichage"
        size="small"
      >
        <ToggleButton value="cards" aria-label="Vue en cartes">
          <Tooltip title="Vue en cartes">
            <ViewModule />
          </Tooltip>
        </ToggleButton>
        <ToggleButton value="list" aria-label="Vue en liste">
          <Tooltip title="Vue en liste">
            <ViewList />
          </Tooltip>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  )
}

export default ViewToggle
