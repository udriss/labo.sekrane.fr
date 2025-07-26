import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
} from "@mui/material";
import { Warning } from "@mui/icons-material";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  equipmentToDelete: any;
  onConfirmDelete: () => void;
}

export const DeleteDialog = ({
  open,
  onClose,
  equipmentToDelete,
  onConfirmDelete
}: DeleteDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: 3
          }
        }
      }}
    >
      <DialogTitle sx={{ color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="inherit" />
          <Typography variant="h6">Confirmer la suppression</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Paper sx={{ 
          p: 2, 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 2,
          color: 'white',
        }}>
          <Typography variant="body1" fontWeight="bold" gutterBottom>
            Êtes-vous sûr de vouloir supprimer "{equipmentToDelete?.name}" ?
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
            Cette action est irréversible. L'équipement sera définitivement retiré de l'inventaire.
          </Typography>
        </Paper>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose}
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          Annuler
        </Button>
        <Button 
          onClick={onConfirmDelete}
          variant="contained"
          color="error"
          sx={{ 
            backgroundColor: 'rgba(244, 67, 54, 0.8)',
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(244, 67, 54, 1)' },
            fontWeight: 'bold'
          }}
        >
          Supprimer définitivement
        </Button>
      </DialogActions>
    </Dialog>
  );
};
