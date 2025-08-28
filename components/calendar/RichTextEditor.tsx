'use client';

import React, { useEffect, useRef } from 'react';
import { Paper, TextField } from '@mui/material';

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  // Minimal fallback: use a multiline TextField to avoid adding new heavy deps
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // no-op
  }, []);
  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      <TextField
        fullWidth
        multiline
        minRows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Écrire…'}
      />
    </Paper>
  );
}
