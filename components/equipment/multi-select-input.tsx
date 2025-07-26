// components/equipment/multi-select-input.tsx
import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  TextField,
  Button,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Stack,
  Typography,
  Popper,
  ClickAwayListener,
  InputAdornment,
  IconButton,
} from '@mui/material'
import { ArrowDropDown, ArrowDropUp, Add, Delete } from '@mui/icons-material'
import { EnhancedChip } from '@/components/equipment/enhanced-chip'

interface MultiSelectInputProps {
  label: string
  placeholder: string
  suggestions: string[]
  values: string[]
  newValue: string
  type: 'volume' | 'resolution' | 'taille' | 'materiau'
  onAddValue: (value: string) => void
  onRemoveValue: (value: string) => void
  onNewValueChange: (value: string) => void
  sx?: any
}

export function MultiSelectInput({
  label,
  placeholder,
  suggestions,
  values,
  newValue,
  type,
  onAddValue,
  onRemoveValue,
  onNewValueChange,
  sx = {}
}: MultiSelectInputProps) {
  const [open, setOpen] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([])
    const [textFieldWidth, setTextFieldWidth] = useState<number>(0)
  const anchorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textFieldRef = useRef<HTMLDivElement>(null)

  // Observer les changements de taille du TextField
  useEffect(() => {
    const updateWidth = () => {
      if (textFieldRef.current) {
        setTextFieldWidth(textFieldRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Mettre à jour les suggestions sélectionnées quand les valeurs changent
  useEffect(() => {
    setSelectedSuggestions(values.filter(v => suggestions.includes(v)))
  }, [values, suggestions])

  const handleToggleSuggestion = (suggestion: string) => {
    if (values.includes(suggestion)) {
      onRemoveValue(suggestion)
    } else {
      onAddValue(suggestion)
    }
  }

  const handleAddCustomValue = () => {
    if (newValue.trim() && !values.includes(newValue.trim())) {
      onAddValue(newValue.trim())
      onNewValueChange('')
      // Garder le dropdown ouvert après l'ajout
      setOpen(true)
    }
  }

  const handleClickAway = (event: MouseEvent | TouchEvent) => {
    // Ne pas fermer si on clique sur l'input ou ses enfants
    if (anchorRef.current && anchorRef.current.contains(event.target as Node)) {
      return
    }
    setOpen(false)
  }

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(newValue.toLowerCase())
  )

  // Afficher toutes les suggestions non sélectionnées si aucun filtre
  const displaySuggestions = newValue 
    ? filteredSuggestions 
    : suggestions.filter(s => !values.includes(s))

  return (
    <Box sx={sx}>
      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
        {label}
      </Typography>
      
      {/* Valeurs existantes */}
      {values.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {values.map((value, index) => (
            <EnhancedChip
              key={index}
              type={type}
              value={value}
              onDelete={() => onRemoveValue(value)}
              deleteIcon={<Delete />}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)' }
              }}
            />
          ))}
        </Box>
      )}

      {/* Input avec dropdown */}
      <Stack direction="row" spacing={1} alignItems="center" ref={anchorRef}>
        <TextField
          ref={textFieldRef}
          inputRef={inputRef}
          label={`Nouveau ${label.toLowerCase()}`}
          value={newValue}
          onChange={(e) => {
            onNewValueChange(e.target.value)
            // Ouvrir automatiquement le dropdown quand on tape
            if (!open) setOpen(true)
          }}
          placeholder={placeholder}
          onClick={() => setOpen(true)} // Ouvrir au clic sur l'input
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddCustomValue()
            }
            // Garder ouvert si on appuie sur d'autres touches
            if (!open && e.key !== 'Tab') {
              setOpen(true)
            }
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(!open)
                    }}
                    sx={{ color: 'white' }}
                    size="small"
                  >
                    {open ? <ArrowDropUp /> : <ArrowDropDown />}
                  </IconButton>
                </InputAdornment>
              )
            }
          }}
          sx={{
            flex: 1,
            '& .MuiInputLabel-root': { color: 'white' },
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
              '&.Mui-focused fieldset': { borderColor: 'white' }
            },
            '& .MuiInputAdornment-root': { color: 'white' }
          }}
        />
        <Button
          onClick={handleAddCustomValue}
          variant="contained"
          disabled={!newValue.trim() || values.includes(newValue.trim())}
          startIcon={
            <Add
          color={
            !newValue.trim() || values.includes(newValue.trim())
              ? 'error'
              : 'success'
          }
            />
          }
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
          }}
        >
          Ajouter
        </Button>
      </Stack>

      {/* Dropdown de suggestions */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ 
          width: textFieldWidth > 0 ? textFieldWidth : 'auto', 
          zIndex: 1300 }}
        modifiers={[
          {
            name: 'offset',
            options: {
              offset: [0, 4],
            },
          },
        ]}
      >
        <ClickAwayListener onClickAway={handleClickAway}>
          <Paper
            elevation={8}
            sx={{
              maxHeight: 300,
              overflow: 'auto',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {displaySuggestions.length > 0 ? (
              <List dense>
                <ListItem>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                    {newValue 
                      ? `${displaySuggestions.length} suggestions trouvées` 
                      : 'Suggestions disponibles '} 
                    (cliquez pour ajouter)
                  </Typography>
                </ListItem>
                {displaySuggestions.map((suggestion) => {
                  const isSelected = values.includes(suggestion)
                  return (
                    <ListItemButton
                      key={suggestion}
                      onClick={() => handleToggleSuggestion(suggestion)}
                      selected={isSelected}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Add 
                          fontSize="small" 
                          color={
                            'success'
                          }
                          sx={{ 
                            opacity: isSelected ? 0.5 : 1
                          }} 
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={suggestion}
                        slotProps={{ 
                          primary: { 
                            variant: 'body2',
                            sx: { 
                              color: isSelected ? 'text.disabled' : 'text.primary'
                            }
                          } 
                        }}
                      />
                    </ListItemButton>
                  )
                })}
              </List>
            ) : (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {newValue && !values.includes(newValue.trim()) ? (
                    <>
                      Aucune suggestion trouvée pour "{newValue}"
                      <br />
                      Appuyez sur Entrée ou cliquez sur "Ajouter" pour créer cette valeur
                    </>
                  ) : (
                    'Toutes les suggestions sont déjà sélectionnées'
                  )}
                </Typography>
              </Box>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  )
}