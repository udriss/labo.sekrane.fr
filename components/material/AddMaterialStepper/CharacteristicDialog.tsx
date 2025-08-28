import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Avatar,
  Paper,
  Stack,
  Chip,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  Save,
  Science,
  Speed,
  Straighten,
  Thermostat,
  ElectricBolt,
  Scale,
  WaterDrop,
  Timer,
  Visibility,
  Add,
  Edit,
} from '@mui/icons-material';
import { CustomCharacteristic } from './types';

interface CharacteristicDialogProps {
  open: boolean;
  editingCharacteristic: CustomCharacteristic | null;
  onClose: () => void;
  onSave: (characteristic: CustomCharacteristic) => void;
}

// Presets de caractéristiques avec leurs icônes et valeurs
const CHARACTERISTIC_PRESETS = [
  {
    id: 'volume',
    nom: 'Volume',
    unite: 'mL',
    valeur: [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000],
    valueType: 'number' as const,
    icon: WaterDrop,
    color: '#2196F3',
    description: 'Capacité volumétrique',
  },
  {
    id: 'resolution_poids',
    nom: 'Résolution (masse)',
    unite: 'g',
    valeur: ['± 0.1', '± 0.5', '± 1', '± 2', '± 5', '± 10'],
    valueType: 'string' as const,
    icon: Scale,
    color: '#9C27B0',
    description: 'Précision de pesée',
  },
  {
    id: 'resolution_volume',
    nom: 'Résolution (volume)',
    unite: 'mL',
    valeur: ['± 0.1', '± 0.5', '± 1', '± 2', '± 5'],
    valueType: 'string' as const,
    icon: WaterDrop,
    color: '#00BCD4',
    description: 'Précision volumétrique',
  },
  {
    id: 'temperature',
    nom: 'Température',
    unite: '°C',
    valeur: [-20, -10, 0, 4, 20, 25, 37, 50, 100, 150, 200],
    valueType: 'number' as const,
    icon: Thermostat,
    color: '#FF5722',
    description: 'Plage de température',
  },
  {
    id: 'tension',
    nom: 'Tension',
    unite: 'V',
    valeur: [5, 12, 24, 110, 220, 230, 240],
    valueType: 'number' as const,
    icon: ElectricBolt,
    color: '#FFC107',
    description: 'Tension électrique',
  },
  {
    id: 'puissance',
    nom: 'Puissance',
    unite: 'W',
    valeur: [50, 100, 200, 500, 1000, 1500, 2000, 3000],
    valueType: 'number' as const,
    icon: ElectricBolt,
    color: '#FF9800',
    description: 'Puissance électrique',
  },
  {
    id: 'vitesse',
    nom: 'Vitesse',
    unite: 'rpm',
    valeur: [100, 300, 500, 1000, 1500, 3000, 5000, 10000],
    valueType: 'number' as const,
    icon: Speed,
    color: '#4CAF50',
    description: 'Vitesse de rotation',
  },
  {
    id: 'longueur',
    nom: 'Longueur',
    unite: 'mm',
    valeur: [10, 25, 50, 100, 150, 200, 250, 300, 500],
    valueType: 'number' as const,
    icon: Straighten,
    color: '#795548',
    description: 'Dimension linéaire',
  },
  {
    id: 'duree',
    nom: 'Durée',
    unite: 'min',
    valeur: [1, 5, 10, 15, 30, 60, 120, 180],
    valueType: 'number' as const,
    icon: Timer,
    color: '#607D8B',
    description: 'Temps de fonctionnement',
  },
  {
    id: 'visibilite',
    nom: 'Visibilité',
    unite: '',
    valeur: ['Transparent', 'Translucide', 'Opaque', 'Teinté'],
    valueType: 'string' as const,
    icon: Visibility,
    color: '#E91E63',
    description: 'Propriété optique',
  },
  {
    id: 'materiau',
    nom: 'Matériau',
    unite: '',
    valeur: ['Verre', 'Plastique', 'Métal', 'Céramique', 'Caoutchouc', 'Silicone'],
    valueType: 'string' as const,
    icon: Science,
    color: '#3F51B5',
    description: 'Composition du matériau',
  },
];

export function CharacteristicDialog({
  open,
  editingCharacteristic,
  onClose,
  onSave,
}: CharacteristicDialogProps) {
  const [characteristic, setCharacteristic] = useState<CustomCharacteristic>({
    id: '',
    nom: '',
    valeur: [],
    unite: '',
  });
  const [currentValueInput, setCurrentValueInput] = useState('');
  const [valueType, setValueType] = useState<'string' | 'number'>('string');

  React.useEffect(() => {
    if (editingCharacteristic) {
      setCharacteristic({ ...editingCharacteristic });
      setValueType(typeof editingCharacteristic.valeur[0] === 'number' ? 'number' : 'string');
    } else {
      setCharacteristic({
        id: '',
        nom: '',
        valeur: [],
        unite: '',
      });
      setCurrentValueInput('');
      setValueType('string');
    }
  }, [editingCharacteristic, open]);

  const addValue = () => {
    if (!currentValueInput.trim()) return;

    const processedValue =
      valueType === 'number' ? parseFloat(currentValueInput.trim()) : currentValueInput.trim();

    if (valueType === 'number' && isNaN(processedValue as number)) {
      return;
    }

    setCharacteristic((prev) => ({
      ...prev,
      valeur: [...prev.valeur, processedValue],
    }));
    setCurrentValueInput('');
  };

  const removeValue = (index: number) => {
    setCharacteristic((prev) => ({
      ...prev,
      valeur: prev.valeur.filter((_, i) => i !== index),
    }));
  };

  const applyPreset = (preset: (typeof CHARACTERISTIC_PRESETS)[0]) => {
    setCharacteristic({
      id: characteristic.id || `char_${Date.now()}`,
      nom: preset.nom,
      valeur: characteristic.valeur, // Garder les valeurs existantes
      unite: preset.unite,
    });
    setValueType(preset.valueType);
  };

  const addPresetValue = (presetValue: string | number) => {
    if (!characteristic.valeur.includes(presetValue)) {
      setCharacteristic((prev) => ({
        ...prev,
        valeur: [...prev.valeur, presetValue],
      }));
    }
  };

  const copyToInput = (value: string | number) => {
    setCurrentValueInput(String(value));
  };

  const handleSave = () => {
    if (!characteristic.nom.trim() || characteristic.valeur.length === 0) {
      return;
    }

    const characteristicToSave = {
      ...characteristic,
      id: characteristic.id || `char_${Date.now()}`,
      nom: characteristic.nom.trim(),
      unite: characteristic.unite?.trim() || undefined,
    };

    onSave(characteristicToSave);
  };

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
            color: 'primary.contrastText',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'text.primary' }}>
            <Settings />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              {editingCharacteristic ? 'Modifier' : 'Ajouter'} une caractéristique
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }} color="text.secondary">
              Définissez une propriété personnalisée pour ce matériel
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Paper
          sx={{
            p: 3,
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
          }}
        >
          <Stack spacing={3}>
            {/* Section des presets */}
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ color: 'text.primary', fontWeight: 'bold' }}
              >
                Caractéristiques prédéfinies
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                {editingCharacteristic
                  ? 'Cliquez sur une caractéristique pour changer le type de caractéristique'
                  : 'Cliquez sur une caractéristique pour la préremplir automatiquement'}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 1,
                }}
              >
                {CHARACTERISTIC_PRESETS.map((preset) => {
                  // Vérifier si le preset correspond à la caractéristique en cours d'édition
                  const isCurrentPreset =
                    editingCharacteristic &&
                    (preset.nom.toLowerCase() === characteristic.nom.toLowerCase() ||
                      preset.id === characteristic.id);

                  return (
                    <Tooltip key={preset.id} title={preset.description} arrow>
                      <Paper
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: isCurrentPreset
                            ? preset.color + '40'
                            : 'rgba(255,255,255,0.05)',
                          border: isCurrentPreset
                            ? `2px solid ${preset.color}`
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: preset.color + '20',
                            borderColor: preset.color + '60',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 4px 12px ${preset.color}30`,
                          },
                        }}
                        onClick={() => applyPreset(preset)}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: preset.color,
                              width: 32,
                              height: 32,
                              mb: 0.5,
                              boxShadow: isCurrentPreset ? `0 0 0 3px ${preset.color}40` : 'none',
                            }}
                          >
                            <preset.icon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.primary',
                              fontWeight: isCurrentPreset ? 'bold' : 'normal',
                              fontSize: '0.7rem',
                              lineHeight: 1.2,
                              textAlign: 'center',
                            }}
                          >
                            {preset.nom}
                          </Typography>
                          {preset.unite && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontSize: '0.6rem',
                              }}
                            >
                              ({preset.unite})
                            </Typography>
                          )}
                          {isCurrentPreset && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: preset.color,
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                              }}
                            >
                              ✓ Actuel
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Nom de la caractéristique"
              value={characteristic.nom}
              onChange={(e) =>
                setCharacteristic((prev) => ({
                  ...prev,
                  nom: e.target.value,
                }))
              }
              placeholder="Ex: Tension, Puissance, Diamètre..."
              required
              color="primary"
            />

            <TextField
              fullWidth
              label="Unité (optionnel)"
              value={characteristic.unite || ''}
              onChange={(e) =>
                setCharacteristic((prev) => ({
                  ...prev,
                  unite: e.target.value,
                }))
              }
              placeholder="Ex: V, W, mm, °C..."
              color="primary"
            />

            <FormControl fullWidth>
              <InputLabel>Type de valeur</InputLabel>
              <Select
                value={valueType}
                label="Type de valeur"
                onChange={(e) => setValueType(e.target.value as 'string' | 'number')}
              >
                <MenuItem value="string">Texte</MenuItem>
                <MenuItem value="number">Numérique</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Valeurs possibles
              </Typography>

              {/* Affichage des valeurs preset pour la caractéristique sélectionnée */}
              {(() => {
                const currentPreset = CHARACTERISTIC_PRESETS.find(
                  (preset) => preset.nom.toLowerCase() === characteristic.nom.toLowerCase(),
                );

                if (currentPreset && currentPreset.valeur.length > 0) {
                  return (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        💡 Valeurs suggérées pour "{currentPreset.nom}" :
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {currentPreset.valeur.map((presetValue, index) => (
                          <Stack key={index} direction="row" spacing={0.5}>
                            <Chip
                              label={presetValue}
                              size="small"
                              sx={{
                                backgroundColor: currentPreset.color + '30',
                                color: 'text.primary',
                                border: `1px solid ${currentPreset.color}60`,
                                '& .MuiChip-label': { fontSize: '0.75rem' },
                              }}
                            />
                            <Tooltip title="Ajouter cette valeur">
                              <IconButton
                                size="small"
                                onClick={() => addPresetValue(presetValue)}
                                color="default"
                                sx={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 0.3)',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Add sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Copier dans le champ de saisie">
                              <IconButton
                                size="small"
                                onClick={() => copyToInput(presetValue)}
                                color="default"
                                sx={{
                                  width: 24,
                                  height: 24,
                                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                  '&:hover': {
                                    backgroundColor: 'rgba(33, 150, 243, 0.3)',
                                    transform: 'scale(1.1)',
                                  },
                                  transition: 'all 0.2s',
                                }}
                              >
                                <Edit sx={{ fontSize: 20 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ))}
                      </Box>
                    </Box>
                  );
                }
                return null;
              })()}

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField
                  label={`Ajouter une valeur ${valueType === 'number' ? 'numérique' : 'textuelle'}`}
                  value={currentValueInput}
                  onChange={(e) => setCurrentValueInput(e.target.value)}
                  type={valueType === 'number' ? 'number' : 'text'}
                  placeholder={valueType === 'number' ? 'Ex: 12.5' : 'Ex: Rouge'}
                  sx={{
                    flex: 1,
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addValue()}
                />
                <Button
                  onClick={addValue}
                  variant="contained"
                  color="primary"
                  sx={{
                    fontWeight: 'bold',
                  }}
                >
                  Ajouter
                </Button>
              </Stack>

              {characteristic.valeur.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {characteristic.valeur.map((valeur, index) => (
                    <Chip
                      key={index}
                      label={valeur}
                      onDelete={() => removeValue(index)}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ pt: 1 }}>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          startIcon={<Save />}
          disabled={!characteristic.nom.trim() || characteristic.valeur.length === 0}
        >
          {editingCharacteristic ? 'Modifier' : 'Ajouter'} la caractéristique
        </Button>
      </DialogActions>
    </Dialog>
  );
}
