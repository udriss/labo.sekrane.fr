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
  Stack,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';

interface EditEquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  editingEquipment: any;
  setEditingEquipment: (equipment: any) => void;
  onSaveEdit: () => void;
  rooms: Array<{ id: string; name: string; locations?: Array<{ id: string; name: string }> }>;
  getAvailableVolumes: (equipmentTypeId: string) => string[];
}

export const EditEquipmentDialog = ({
  open,
  onClose,
  editingEquipment,
  setEditingEquipment,
  onSaveEdit,
  rooms,
  getAvailableVolumes,
}: EditEquipmentDialogProps) => {
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
            color: 'primary.contrastText',
          },
        },
      }}
    >
      <DialogTitle sx={{ color: 'primary.contrastText' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Edit />
          <Typography variant="h6">
            Modifier {editingEquipment?.name}
            {editingEquipment?.volume && (
              <span style={{ fontWeight: 400, fontSize: '1rem', marginLeft: 8 }}>
                ({editingEquipment.volume})
              </span>
            )}
          </Typography>
        </Box>
      </DialogTitle>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          {/* Nom de l'équipement */}
          <TextField
            fullWidth
            label="Nom de l'équipement"
            value={editingEquipment?.name || ''}
            onChange={(e) =>
              setEditingEquipment((prev: any) => ({ ...prev, name: e.target.value }))
            }
            color="primary"
          />

          {/* Volume avec sélection des volumes preset */}
          {editingEquipment?.equipmentTypeId &&
          getAvailableVolumes(editingEquipment.equipmentTypeId).length > 0 ? (
            <FormControl fullWidth>
              <InputLabel>Volume</InputLabel>
              <Select
                value={editingEquipment?.volume || ''}
                label="Volume"
                onChange={(e) =>
                  setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Aucun volume</em>
                </MenuItem>
                {getAvailableVolumes(editingEquipment.equipmentTypeId).map((volume) => (
                  <MenuItem key={volume} value={volume}>
                    {volume}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <TextField
              fullWidth
              label="Volume"
              value={editingEquipment?.volume || ''}
              onChange={(e) =>
                setEditingEquipment((prev: any) => ({ ...prev, volume: e.target.value }))
              }
              color="primary"
            />
          )}

          {/* Quantité */}
          <TextField
            fullWidth
            label="Quantité"
            type="number"
            value={editingEquipment?.quantity || 1}
            onChange={(e) =>
              setEditingEquipment((prev: any) => ({ ...prev, quantity: Number(e.target.value) }))
            }
            color="primary"
          />

          {/* Salle */}
          <FormControl fullWidth>
            <InputLabel>Salle</InputLabel>
            <Select
              value={editingEquipment?.room || ''}
              label="Salle"
              onChange={(e) => {
                setEditingEquipment((prev: any) => ({
                  ...prev,
                  room: e.target.value,
                  location: '', // Reset location when room changes
                }));
              }}
            >
              <MenuItem value="">
                <em>Aucune salle spécifiée</em>
              </MenuItem>
              {rooms.map((room) => (
                <MenuItem key={room.id} value={room.name}>
                  {room.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Localisation dans la salle */}
          {editingEquipment?.room && (
            <FormControl fullWidth>
              <InputLabel>Localisation</InputLabel>
              <Select
                value={editingEquipment?.location || ''}
                label="Localisation"
                onChange={(e) =>
                  setEditingEquipment((prev: any) => ({ ...prev, location: e.target.value }))
                }
              >
                <MenuItem value="">
                  <em>Aucune localisation spécifiée</em>
                </MenuItem>
                {(() => {
                  const selectedRoom = rooms.find((room) => room.name === editingEquipment.room);
                  return (
                    selectedRoom?.locations?.map((location: any) => (
                      <MenuItem key={location.id} value={location.name}>
                        {location.name}
                      </MenuItem>
                    )) || []
                  );
                })()}
              </Select>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Button onClick={onClose} sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Annuler
        </Button>
        <Button
          onClick={onSaveEdit}
          variant="contained"
          sx={{
            fontWeight: 'bold',
          }}
          startIcon={<Save />}
          color="success"
          disabled={!editingEquipment?.name?.trim()}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};
