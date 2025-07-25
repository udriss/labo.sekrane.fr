// components/calendar/RichTextEditor.tsx
"use client"

import React, { useState, useRef } from 'react'
import {
  Box, Paper, ToggleButton, ToggleButtonGroup,
  Select, MenuItem, FormControl, Divider
} from '@mui/material'
import {
  FormatBold, FormatItalic, FormatUnderlined,
  FormatColorFill, FormatSize
} from '@mui/icons-material'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [formats, setFormats] = useState<string[]>([])
  const [fontSize, setFontSize] = useState<string>('16px')

  const handleFormat = (
    event: React.MouseEvent<HTMLElement>,
    newFormats: string[]
  ) => {
    setFormats(newFormats)
  }

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleFontSizeChange = (size: string) => {
    setFontSize(size)
    // Convertir la taille en format execCommand (1-7)
    const sizeMap: { [key: string]: string } = {
      '12px': '1',
      '14px': '2',
      '16px': '3',
      '18px': '4',
      '24px': '5',
      '32px': '6',
      '48px': '7'
    }
    applyFormat('fontSize', sizeMap[size] || '3')
  }

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      {/* Barre d'outils */}
      <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
        <ToggleButtonGroup
          value={formats}
          onChange={handleFormat}
          size="small"
        >
          <ToggleButton
            value="bold"
            onClick={() => applyFormat('bold')}
          >
            <FormatBold fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="italic"
            onClick={() => applyFormat('italic')}
          >
            <FormatItalic fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="underline"
            onClick={() => applyFormat('underline')}
          >
            <FormatUnderlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem />

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <Select
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            displayEmpty
          >
            <MenuItem value="12px">Très petit</MenuItem>
            <MenuItem value="14px">Petit</MenuItem>
            <MenuItem value="16px">Normal</MenuItem>
            <MenuItem value="18px">Grand</MenuItem>
            <MenuItem value="24px">Très grand</MenuItem>
            <MenuItem value="32px">Énorme</MenuItem>
          </Select>
        </FormControl>

        <ToggleButton
          value="highlight"
          size="small"
          onClick={() => applyFormat('hiliteColor', 'yellow')}
        >
          <FormatColorFill fontSize="small" />
        </ToggleButton>
      </Box>

      {/* Zone d'édition */}
            {/* Zone d'édition */}
      <Box
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        sx={{
          minHeight: 120,
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          '&:focus': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2
          },
          '&:empty:before': {
            content: `"${placeholder || 'Saisissez vos remarques ici...'}"`,
            color: 'text.secondary'
          }
        }}
      />
    </Paper>
  )
}