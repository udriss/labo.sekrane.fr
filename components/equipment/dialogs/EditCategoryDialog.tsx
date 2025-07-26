// components/equipment/dialogs/EditCategoryDialog.tsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import { Edit } from "@mui/icons-material";

interface EditCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  setCategoryName: (name: string) => void;
  onUpdateCategory: () => void;
  originalName: string;
}

export const EditCategoryDialog = ({
  open,
  onClose,
  categoryName,
  setCategoryName,
  onUpdateCategory,
  originalName
}: EditCategoryDialogProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onUpdateCategory();
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Edit />
        Modifier la catégorie "{originalName}"
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nom de la catégorie"
          fullWidth
          variant="outlined"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          onKeyDown={handleKeyPress}
          sx={{
            '& .MuiInputLabel-root': { color: 'white' },
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
              '&.Mui-focused fieldset': { borderColor: 'white' }
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Annuler
        </Button>
        <Button 
          onClick={onUpdateCategory}
          variant="contained"
          disabled={!categoryName.trim() || categoryName === originalName}
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
          }}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};