'use client';
import React, { useState } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Info as InfoIcon, Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { GhsIcon } from './ghs-icons';

// Codes de danger avec descriptions complètes
export const COMMON_DANGER_CLASSES = [
  { code: 'H200', name: 'Explosif instable' },
  { code: 'H201', name: "Explosif; danger d'explosion en masse" },
  { code: 'H202', name: 'Explosif; danger sérieux de projection' },
  { code: 'H203', name: "Explosif; danger d'incendie, d'effet de souffle ou de projection" },
  { code: 'H204', name: "Danger d'incendie ou de projection" },
  { code: 'H205', name: "Danger d'explosion en masse en cas d'incendie" },
  { code: 'H220', name: 'Gaz extrêmement inflammable' },
  { code: 'H221', name: 'Gaz inflammable' },
  { code: 'H222', name: 'Aérosol extrêmement inflammable' },
  { code: 'H223', name: 'Aérosol inflammable' },
  { code: 'H224', name: 'Liquide et vapeurs extrêmement inflammables' },
  { code: 'H225', name: 'Liquide et vapeurs très inflammables' },
  { code: 'H226', name: 'Liquide et vapeurs inflammables' },
  { code: 'H228', name: 'Matière solide inflammable' },
  { code: 'H240', name: "Peut exploser sous l'effet de la chaleur" },
  { code: 'H241', name: "Peut s'enflammer ou exploser sous l'effet de la chaleur" },
  { code: 'H242', name: "Peut s'enflammer sous l'effet de la chaleur" },
  { code: 'H250', name: "S'enflamme spontanément au contact de l'air" },
  { code: 'H251', name: "Matière auto-échauffante; peut s'enflammer" },
  { code: 'H252', name: "Matière auto-échauffante en grandes quantités; peut s'enflammer" },
  { code: 'H260', name: "Dégage des gaz inflammables au contact de l'eau" },
  { code: 'H261', name: "Dégage des gaz inflammables au contact de l'eau" },
  { code: 'H270', name: 'Peut provoquer ou aggraver un incendie; comburant' },
  { code: 'H271', name: 'Peut provoquer un incendie ou une explosion; comburant puissant' },
  { code: 'H272', name: 'Peut aggraver un incendie; comburant' },
  { code: 'H280', name: "Contient un gaz sous pression; peut exploser sous l'effet de la chaleur" },
  {
    code: 'H281',
    name: 'Contient un gaz réfrigéré; peut causer des brûlures ou blessures cryogéniques',
  },
  { code: 'H290', name: 'Peut être corrosif pour les métaux' },
  { code: 'H300', name: "Mortel en cas d'ingestion" },
  { code: 'H301', name: "Toxique en cas d'ingestion" },
  { code: 'H302', name: "Nocif en cas d'ingestion" },
  {
    code: 'H304',
    name: "Peut être mortel en cas d'ingestion et de pénétration dans les voies respiratoires",
  },
  { code: 'H310', name: 'Mortel par contact cutané' },
  { code: 'H311', name: 'Toxique par contact cutané' },
  { code: 'H312', name: 'Nocif par contact cutané' },
  { code: 'H314', name: 'Provoque des brûlures de la peau et des lésions oculaires graves' },
  { code: 'H315', name: 'Provoque une irritation cutanée' },
  { code: 'H317', name: 'Peut provoquer une allergie cutanée' },
  { code: 'H318', name: 'Provoque des lésions oculaires graves' },
  { code: 'H319', name: 'Provoque une sévère irritation des yeux' },
  { code: 'H330', name: 'Mortel par inhalation' },
  { code: 'H331', name: 'Toxique par inhalation' },
  { code: 'H332', name: 'Nocif par inhalation' },
  {
    code: 'H334',
    name: "Peut provoquer des symptômes allergiques ou d'asthme ou des difficultés respiratoires par inhalation",
  },
  { code: 'H335', name: 'Peut irriter les voies respiratoires' },
  { code: 'H336', name: 'Peut provoquer somnolence ou vertiges' },
  { code: 'H340', name: 'Peut induire des anomalies génétiques' },
  { code: 'H341', name: "Susceptible d'induire des anomalies génétiques" },
  { code: 'H350', name: 'Peut provoquer le cancer' },
  { code: 'H351', name: 'Susceptible de provoquer le cancer' },
  { code: 'H360', name: 'Peut nuire à la fertilité ou au fœtus' },
  { code: 'H361', name: 'Susceptible de nuire à la fertilité ou au fœtus' },
  { code: 'H360FD', name: 'Peut nuire à la fertilité et au fœtus' },
  { code: 'H362', name: 'Peut être nocif pour les bébés nourris au lait maternel' },
  { code: 'H370', name: "Risque avéré d'effets graves pour les organes" },
  { code: 'H371', name: "Risque présumé d'effets graves pour les organes" },
  {
    code: 'H372',
    name: "Risque avéré d'effets graves pour les organes à la suite d'expositions répétées ou d'une exposition prolongée",
  },
  {
    code: 'H373',
    name: "Risque présumé d'effets graves pour les organes à la suite d'expositions répétées ou d'une exposition prolongée",
  },
  { code: 'H400', name: 'Très toxique pour les organismes aquatiques' },
  {
    code: 'H410',
    name: 'Très toxique pour les organismes aquatiques, entraîne des effets néfastes à long terme',
  },
  {
    code: 'H411',
    name: 'Toxique pour les organismes aquatiques, entraîne des effets néfastes à long terme',
  },
  {
    code: 'H412',
    name: 'Nocif pour les organismes aquatiques, entraîne des effets néfastes à long terme',
  },
  { code: 'H413', name: 'Peut être nocif à long terme pour les organismes aquatiques' },
];

interface HazardClassSelectorProps {
  value: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  placeholder?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: any;
}

export function HazardClassSelector({
  value,
  onChange,
  label = 'Classes de danger',
  placeholder = 'Sélectionner...',
  fullWidth = true,
  disabled = false,
  sx,
}: HazardClassSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClasses = COMMON_DANGER_CLASSES.filter(
    (item) =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <Autocomplete
        multiple
        options={COMMON_DANGER_CLASSES.map((item) => item.code)}
        value={value}
        onChange={(_, newValue) => onChange?.(newValue)}
        disabled={disabled}
        fullWidth={fullWidth}
        sx={sx}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              size="small"
              color="warning"
              label={option}
              {...getTagProps({ index })}
              key={`hazard-${option}-${index}`}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={value.length === 0 ? placeholder : ''}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {params.InputProps.endAdornment}
                  <IconButton
                    size="small"
                    onClick={() => setModalOpen(true)}
                    edge="end"
                    sx={{ mr: 1 }}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </>
              ),
            }}
          />
        )}
      />

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Codes de danger (Classification CLP/GHS)
            </Typography>
            <IconButton onClick={() => setModalOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher un code ou une description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            <List dense>
              {filteredClasses.map((item, index) => (
                <React.Fragment key={item.code}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight={600} color="primary">
                          {item.code}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {item.name}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < filteredClasses.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {filteredClasses.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun code trouvé pour "{searchTerm}"
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Note:</strong> Ces codes suivent la classification CLP (Classification,
              Labelling and Packaging) qui transpose le système GHS (Globally Harmonized System) en
              Europe.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
