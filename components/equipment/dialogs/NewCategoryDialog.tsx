import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';

interface NewCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  setCategoryName: (name: string) => void;
  discipline: string;
  setDiscipline: (discipline: string) => void;
  onCreateCategory: () => void;
}

export const NewCategoryDialog = ({
  open,
  onClose,
  categoryName,
  setCategoryName,
  discipline,
  setDiscipline,
  onCreateCategory,
}: NewCategoryDialogProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && categoryName.trim() && discipline) {
      onCreateCategory();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            padding: 2,
            color: 'primary.contrastText',
          },
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6" fontWeight="bold">
            Nouvelle catégorie de matériel
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Discipline</InputLabel>
            <Select
              value={discipline}
              label="Discipline"
              onChange={(e) => setDiscipline(e.target.value)}
            >
              <MenuItem value="chimie">Chimie</MenuItem>
              <MenuItem value="physique">Physique</MenuItem>
              <MenuItem value="commun">Commun</MenuItem>
            </Select>
          </FormControl>

          <TextField
            autoFocus
            margin="dense"
            label="Nom de la catégorie"
            fullWidth
            variant="outlined"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ex: Verrerie, Instruments de mesure..."
            color="primary"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onCreateCategory}
          variant="contained"
          disabled={!categoryName.trim() || !discipline}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            fontWeight: 'bold',
          }}
        >
          Ajouter
        </Button>
      </DialogActions>
    </Dialog>
  );
};
