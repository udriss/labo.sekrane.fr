import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";

interface NewCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  categoryName: string;
  setCategoryName: (name: string) => void;
  onCreateCategory: () => void;
}

export const NewCategoryDialog = ({
  open,
  onClose,
  categoryName,
  setCategoryName,
  onCreateCategory
}: NewCategoryDialogProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }
      }}
    >
      <DialogTitle>Nouvelle catégorie de matériel</DialogTitle>
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Annuler
        </Button>
        <Button 
          onClick={onCreateCategory}
          variant="contained"
          disabled={!categoryName.trim()}
        >
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
};
