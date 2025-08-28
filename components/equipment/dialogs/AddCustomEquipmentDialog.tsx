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
  Stack,
  Paper,
  Chip,
  Avatar,
} from '@mui/material';
import { Add, Save } from '@mui/icons-material';

interface MaterielPersoData {
  name: string;
  discipline: string;
  description: string;
  categorieId: string;
  volumes: string[];
  newVolume: string;
  caracteristiques: { [key: string]: string };
  newCaracteristiqueKey: string;
  newCaracteristiqueValue: string;
}

interface AddCustomEquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  customEquipmentData: MaterielPersoData;
  setCustomEquipmentData: (
    data: MaterielPersoData | ((prev: MaterielPersoData) => MaterielPersoData),
  ) => void;
  categories: Array<{ id: string; name: string; discipline: string }>;
  onSaveCustomEquipment: () => void;
  handleAddVolume: () => void;
  handleRemoveVolume: (volume: string) => void;
  handleAddCaracteristique: () => void;
  handleRemoveCaracteristique: (key: string) => void;
}

export const AddCustomEquipmentDialog = ({
  open,
  onClose,
  customEquipmentData,
  setCustomEquipmentData,
  categories,
  onSaveCustomEquipment,
  handleAddVolume,
  handleRemoveVolume,
  handleAddCaracteristique,
  handleRemoveCaracteristique,
}: AddCustomEquipmentDialogProps) => {
  const selectedCategory = categories.find((c) => c.id === customEquipmentData.categorieId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            padding: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
            <Add />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Ajouter un équipement personnalisé
            </Typography>
            {selectedCategory && (
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Catégorie: {selectedCategory.name} ({selectedCategory.discipline})
              </Typography>
            )}
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
            borderRadius: 2,
          }}
        >
          <Stack spacing={3}>
            {/* Discipline */}
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>Discipline</InputLabel>
              <Select
                value={customEquipmentData.discipline}
                label="Discipline"
                onChange={(e) =>
                  setCustomEquipmentData((prev) => ({
                    ...prev,
                    discipline: e.target.value,
                    categorieId: '', // Reset category when discipline changes
                  }))
                }
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                }}
              >
                <MenuItem value="chimie">Chimie</MenuItem>
                <MenuItem value="physique">Physique</MenuItem>
                <MenuItem value="commun">Commun</MenuItem>
              </Select>
            </FormControl>

            {/* Sélecteur de catégorie */}
            <FormControl fullWidth>
              <InputLabel sx={{ color: 'white' }}>Catégorie</InputLabel>
              <Select
                value={customEquipmentData.categorieId}
                label="Catégorie"
                onChange={(e) =>
                  setCustomEquipmentData((prev) => ({
                    ...prev,
                    categorieId: e.target.value,
                  }))
                }
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'white' },
                  '& .MuiSvgIcon-root': { color: 'white' },
                }}
              >
                {categories
                  .filter(
                    (cat) =>
                      cat.discipline === customEquipmentData.discipline ||
                      cat.discipline === 'commun',
                  )
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Nom de l'équipement"
              value={customEquipmentData.name}
              onChange={(e) =>
                setCustomEquipmentData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Ex: Micropipette, Balance analytique..."
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' },
                },
              }}
            />

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={customEquipmentData.description}
              onChange={(e) =>
                setCustomEquipmentData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Description détaillée de l'équipement..."
              sx={{
                '& .MuiInputLabel-root': { color: 'white' },
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&.Mui-focused fieldset': { borderColor: 'white' },
                },
              }}
            />

            {/* Volumes/Tailles disponibles */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Volumes/Tailles disponibles (optionnel)
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Ajouter un volume"
                  value={customEquipmentData.newVolume}
                  onChange={(e) =>
                    setCustomEquipmentData((prev) => ({
                      ...prev,
                      newVolume: e.target.value,
                    }))
                  }
                  placeholder="Ex: 250ml, 10cm, 1kg..."
                  sx={{
                    flex: 1,
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVolume()}
                />
                <Button
                  onClick={handleAddVolume}
                  variant="contained"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  Ajouter
                </Button>
              </Stack>

              {customEquipmentData.volumes.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {customEquipmentData.volumes.map((volume, index) => (
                    <Chip
                      key={index}
                      label={volume}
                      onDelete={() => handleRemoveVolume(volume)}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>

            {/* Caractéristiques personnalisées */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Caractéristiques personnalisées (optionnel)
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label="Propriété"
                  value={customEquipmentData.newCaracteristiqueKey}
                  onChange={(e) =>
                    setCustomEquipmentData((prev) => ({
                      ...prev,
                      newCaracteristiqueKey: e.target.value,
                    }))
                  }
                  placeholder="Ex: Précision, Plage de mesure..."
                  sx={{
                    flex: 1,
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                />
                <TextField
                  label="Valeur"
                  value={customEquipmentData.newCaracteristiqueValue}
                  onChange={(e) =>
                    setCustomEquipmentData((prev) => ({
                      ...prev,
                      newCaracteristiqueValue: e.target.value,
                    }))
                  }
                  placeholder="Ex: ±0.1g, 0-100°C..."
                  sx={{
                    flex: 1,
                    '& .MuiInputLabel-root': { color: 'white' },
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: 'white' },
                    },
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCaracteristique()}
                />
                <Button
                  onClick={handleAddCaracteristique}
                  variant="contained"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  Ajouter
                </Button>
              </Stack>

              {Object.entries(customEquipmentData.caracteristiques).length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(customEquipmentData.caracteristiques).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      onDelete={() => handleRemoveCaracteristique(key)}
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' },
                        justifyContent: 'space-between',
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: 'rgba(255,255,255,0.8)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={onSaveCustomEquipment}
          variant="contained"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            fontWeight: 'bold',
          }}
          startIcon={<Save />}
          disabled={
            !customEquipmentData.name.trim() ||
            !customEquipmentData.discipline ||
            !customEquipmentData.categorieId
          }
        >
          Ajouter l&apos;équipement
        </Button>
      </DialogActions>
    </Dialog>
  );
};
