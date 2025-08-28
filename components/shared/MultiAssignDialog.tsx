'use client';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Chip,
  Box,
  CircularProgress,
  Typography,
  IconButton,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from '@/components/providers/SnackbarProvider';

export interface MultiAssignOption {
  id: number;
  name: string;
  isCustom?: boolean;
  group?: string; // Mes classes/salles vs système
}

interface MultiAssignDialogProps {
  open: boolean;
  title: string;
  description?: string;
  loadOptions: () => Promise<MultiAssignOption[]>;
  initialSelectedIds?: number[];
  onSave: (ids: number[]) => Promise<void> | void;
  onClose: () => void;
  saveLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md';
  disableBackdropClose?: boolean;
  dialogType?: 'salles' | 'classes'; // Optional type for specific handling
}

export const MultiAssignDialog: React.FC<MultiAssignDialogProps> = ({
  open,
  title,
  description,
  loadOptions,
  initialSelectedIds = [],
  onSave,
  onClose,
  saveLabel = 'Enregistrer',
  maxWidth = 'sm',
  disableBackdropClose = false,
  dialogType, // Optional type for specific handling
}) => {
  const [options, setOptions] = React.useState<MultiAssignOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<MultiAssignOption[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { showSnackbar } = useSnackbar();

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await loadOptions();
        if (!active) return;
        // Categorize: assume loader may already mark custom items; fallback by heuristic (id < 0?)
        const enriched = list.map((o) => ({
          ...o,
          group:
            o.group ||
            (o.isCustom
              ? dialogType === 'classes'
                ? 'Mes classes'
                : dialogType === 'salles'
                  ? 'Mes salles'
                  : 'Perso'
              : dialogType === 'classes'
                ? 'Classes système'
                : dialogType === 'salles'
                  ? 'Salles système'
                  : 'Système'),
        }));
        // Order custom first
        enriched.sort((a, b) =>
          a.group === b.group ? a.name.localeCompare(b.name) : a.group.startsWith('Mes') ? -1 : 1,
        );
        setOptions(enriched);
        const idSet = new Set(initialSelectedIds);
        setSelected(enriched.filter((o) => idSet.has(o.id)));
      } catch (e) {
        if (active) setError('Chargement impossible');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, loadOptions, initialSelectedIds, dialogType]);

  const handleSave = async () => {
    try {
      // No-op gating: if selection hasn't changed, show info and skip save
      const current = (initialSelectedIds || []).filter(
        (x): x is number => typeof x === 'number' && Number.isFinite(x as number),
      );
      const next = selected
        .map((s) => s.id)
        .filter((x): x is number => typeof x === 'number' && Number.isFinite(x as number));
      const sameSet = (a: number[], b: number[]) => {
        if (a.length !== b.length) return false;
        const s = new Set(a);
        for (const v of b) if (!s.has(v)) return false;
        return true;
      };
      if (sameSet(current, next)) {
        showSnackbar('Aucune modification à enregistrer', 'info');
        onClose();
        return;
      }
      setSaving(true);
      await onSave(selected.map((s) => s.id));
      onClose();
    } catch (e) {
      setError('Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = (_: any, reason?: string) => {
    if (disableBackdropClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      fullWidth
      maxWidth={maxWidth}
      // Prevent clicks inside dialog from bubbling to any parent click handlers (e.g., event cards)
      onClick={(e) => e.stopPropagation()}
    >
      <DialogTitle sx={{ pr: 5 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {loading ? (
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            sx={{
              p: 6,
            }}
          >
            <CircularProgress size={34} /> <Typography>Chargement…</Typography>
          </Box>
        ) : (
          <Autocomplete
            multiple
            disableCloseOnSelect
            options={options}
            groupBy={(o) => o.group || ''}
            value={selected}
            onChange={(_, val) => setSelected(val)}
            getOptionLabel={(o) => o.name}
            filterSelectedOptions
            onClick={(e) => e.stopPropagation()}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Sélection"
                placeholder="Rechercher…"
                size="small"
                error={!!error}
                helperText={error || ''}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            renderTags={(tagValue, getTagProps) =>
              tagValue.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={`${option.id}-${option.name}`}
                  label={option.name}
                  size="small"
                />
              ))
            }
            sx={{ mt: 1 }}
          />
        )}
        {!loading && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              gap: 2,
              flexWrap: 'wrap',
              justifyContent: 'center', // centre horizontalement
              alignItems: 'center',
              width: '100%',
            }}
          >
            {(dialogType === 'salles' || !dialogType) && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open('/salles', '_blank')}
                sx={{
                  flex: { xs: '1 1 100%', sm: '0 1 280px' }, // stretch sur petits écrans, largeur fixe et centrée sur grand écran
                  textAlign: 'center',
                }}
              >
                Gérer les salles
              </Button>
            )}

            {(dialogType === 'classes' || !dialogType) && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.open('/classes', '_blank')}
                sx={{
                  flex: { xs: '1 1 100%', sm: '0 1 280px' },
                  textAlign: 'center',
                }}
              >
                Gérer les classes
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} disabled={saving || loading} variant="contained">
          {saving ? '…' : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MultiAssignDialog;
