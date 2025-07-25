// components/calendar/RichTextEditor.tsx
"use client"

import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Box,
  Paper,
  IconButton,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from '@mui/material'
import {
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Highlight as HighlightIcon,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatAlignJustify,
  Code,
  Undo,
  Redo
} from '@mui/icons-material'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Commencez à écrire...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) {
    return null
  }

  const MenuBar = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          flexWrap: 'wrap'
        }}
      >
        {/* Undo/Redo */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Annuler">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Rétablir">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Text formatting */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Gras">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBold().run()}
              color={editor.isActive('bold') ? 'primary' : 'default'}
            >
              <FormatBold fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Italique">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              color={editor.isActive('italic') ? 'primary' : 'default'}
            >
              <FormatItalic fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Barré">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              color={editor.isActive('strike') ? 'primary' : 'default'}
            >
              <FormatStrikethrough fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Code">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleCode().run()}
              color={editor.isActive('code') ? 'primary' : 'default'}
            >
              <Code fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Surligner">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              color={editor.isActive('highlight') ? 'primary' : 'default'}
            >
              <HighlightIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Headings */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={
            editor.isActive('heading', { level: 1 }) ? 'h1' :
            editor.isActive('heading', { level: 2 }) ? 'h2' :
            editor.isActive('heading', { level: 3 }) ? 'h3' :
            'p'
          }
        >
          <ToggleButton
            value="h1"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Box sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>H1</Box>
          </ToggleButton>
          <ToggleButton
            value="h2"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Box sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>H2</Box>
          </ToggleButton>
          <ToggleButton
            value="h3"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Box sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}>H3</Box>
          </ToggleButton>
          <ToggleButton
            value="p"
            onClick={() => editor.chain().focus().setParagraph().run()}
          >
            <Box sx={{ fontSize: '0.875rem' }}>P</Box>
          </ToggleButton>
        </ToggleButtonGroup>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Liste à puces">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              color={editor.isActive('bulletList') ? 'primary' : 'default'}
            >
              <FormatListBulleted fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Liste numérotée">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              color={editor.isActive('orderedList') ? 'primary' : 'default'}
            >
              <FormatListNumbered fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Citation">
            <IconButton
              size="small"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              color={editor.isActive('blockquote') ? 'primary' : 'default'}
            >
              <FormatQuote fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Text alignment */}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={
            editor.isActive({ textAlign: 'left' }) ? 'left' :
            editor.isActive({ textAlign: 'center' }) ? 'center' :
            editor.isActive({ textAlign: 'right' }) ? 'right' :
            editor.isActive({ textAlign: 'justify' }) ? 'justify' :
            'left'
          }
        >
          <ToggleButton
            value="left"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <FormatAlignLeft fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="center"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <FormatAlignCenter fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="right"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <FormatAlignRight fontSize="small" />
          </ToggleButton>
          <ToggleButton
            value="justify"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          >
            <FormatAlignJustify fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 300,
        '& .ProseMirror': {
          flex: 1,
          padding: 2,
          outline: 'none',
          minHeight: 250,
          '& p.is-editor-empty:first-of-type::before': {
            color: 'text.secondary',
            content: 'attr(data-placeholder)',
            float: 'left',
            height: 0,
            pointerEvents: 'none',
          },
          '& h1': {
            fontSize: '2rem',
            fontWeight: 700,
            margin: '0.75rem 0',
          },
          '& h2': {
            fontSize: '1.5rem',
            fontWeight: 600,
            margin: '0.75rem 0',
          },
          '& h3': {
            fontSize: '1.25rem',
            fontWeight: 600,
            margin: '0.75rem 0',
          },
          '& p': {
            margin: '0.5rem 0',
          },
          '& ul, & ol': {
            paddingLeft: '1.5rem',
            margin: '0.5rem 0',
          },
          '& blockquote': {
            borderLeft: '3px solid',
            borderColor: 'divider',
            paddingLeft: '1rem',
            margin: '0.5rem 0',
            fontStyle: 'italic',
            color: 'text.secondary',
          },
          '& code': {
            backgroundColor: 'action.hover',
            borderRadius: '3px',
            padding: '0.2rem 0.4rem',
            fontFamily: 'monospace',
          },
          '& mark': {
            backgroundColor: '#fef3c7',
            padding: '0.1rem 0.3rem',
            borderRadius: '3px',
          },
        },
      }}
    >
      <MenuBar />
      <EditorContent editor={editor} />
    </Paper>
  )
}