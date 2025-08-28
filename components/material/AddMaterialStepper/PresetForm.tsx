import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Stack,
  Autocomplete,
  IconButton,
} from '@mui/material';
import { Save as SaveIcon, Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { DISCIPLINES } from './types';

interface PresetFormProps {
  preset: any;
  onChange: (preset: any) => void;
  onSave: () => void;
  onCancel: () => void;
  availableCategories: string[];
  categoriesInfo: Array<{ id: number; name: string; discipline: string }>;
  preferDiscipline: string;
  disableDiscipline?: boolean;
  createCategoryIfNeededStep2?: (name: string) => Promise<boolean>;
}

export function PresetForm({
  preset,
  onChange,
  onSave,
  onCancel,
  availableCategories,
  categoriesInfo,
  preferDiscipline,
  disableDiscipline = false,
  createCategoryIfNeededStep2,
}: PresetFormProps) {
  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        label="Nom du preset"
        value={preset.name || ''}
        onChange={(e) => onChange({ ...preset, name: e.target.value })}
        required
      />

      <Autocomplete
        freeSolo
        options={availableCategories}
        value={preset.category || ''}
        onChange={(_, value) => onChange({ ...preset, category: (value as string) || '' })}
        renderInput={(params) => (
          <TextField
            {...params}
            fullWidth
            label="Catégorie"
            slotProps={{
              input: {
                endAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {params.inputProps?.value &&
                      !availableCategories
                        .map((c) => c.toLowerCase())
                        .includes(String(params.inputProps.value).toLowerCase()) &&
                      createCategoryIfNeededStep2 && (
                        <IconButton
                          size="small"
                          title="Ajouter la catégorie"
                          onClick={async (e) => {
                            e.preventDefault();
                            const v = String(params.inputProps.value || '').trim();
                            if (!v) return;
                            const ok = await createCategoryIfNeededStep2(v);
                            if (ok) onChange({ ...preset, category: v });
                          }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      )}
                    {params.InputProps.endAdornment}
                  </Box>
                ),
              },
            }}
          />
        )}
      />

      <FormControl fullWidth disabled={disableDiscipline}>
        <InputLabel>Discipline</InputLabel>
        <Select
          value={preset.discipline || preferDiscipline}
          onChange={(e) => onChange({ ...preset, discipline: e.target.value })}
        >
          {DISCIPLINES.map((disc) => (
            <MenuItem key={disc} value={disc}>
              {disc}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        multiline
        rows={2}
        label="Description"
        value={preset.description || ''}
        onChange={(e) => onChange({ ...preset, description: e.target.value })}
      />

      <TextField
        fullWidth
        type="number"
        label="Quantité par défaut"
        value={preset.defaultQty || 1}
        onChange={(e) => onChange({ ...preset, defaultQty: parseInt(e.target.value) || 1 })}
        slotProps={{ htmlInput: { min: 1 } }}
      />

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          onClick={onSave}
          startIcon={<SaveIcon />}
          disabled={!preset.name?.trim()}
        >
          Enregistrer
        </Button>
        <Button onClick={onCancel} startIcon={<CloseIcon />}>
          Annuler
        </Button>
      </Stack>
    </Stack>
  );
}
