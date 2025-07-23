import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Paper,
} from "@mui/material";
import { CheckCircle, Inventory } from "@mui/icons-material";

interface ContinueDialogProps {
  open: boolean;
  onClose: () => void;
  newlyCreatedItem: any;
  onFinishWithoutContinue: () => void;
  onContinueToInventory: () => void;
}

export const ContinueDialog = ({
  open,
  onClose,
  newlyCreatedItem,
  onFinishWithoutContinue,
  onContinueToInventory
}: ContinueDialogProps) => {
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
            <CheckCircle />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Matériel créé avec succès !
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {newlyCreatedItem?.name}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Paper 
          sx={{ 
            p: 3, 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 2
          }}
        >
          <Typography variant="body1" gutterBottom>
            Souhaitez-vous poursuivre et ajouter ce matériel à votre inventaire avec des détails complémentaires ?
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
            Vous pourrez spécifier la quantité, localisation, salle et notes.
          </Typography>
        </Paper>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onFinishWithoutContinue}
          sx={{ 
            color: 'rgba(255,255,255,0.8)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
          }}
        >
          Non, terminer
        </Button>
        <Button 
          onClick={onContinueToInventory}
          variant="contained"
          sx={{ 
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            fontWeight: 'bold'
          }}
          startIcon={<Inventory />}
        >
          Oui, ajouter à l'inventaire
        </Button>
      </DialogActions>
    </Dialog>
  );
};
