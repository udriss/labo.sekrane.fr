'use client';
import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  LinearProgress,
  Stack,
  Typography,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { IconButton, TextField, InputAdornment } from '@mui/material';
import { Info as InfoIcon, Close as CloseIcon, Search as SearchIcon } from '@mui/icons-material';
import { COMMON_DANGER_CLASSES } from '@/components/chemicals/HazardClassSelector';
import { parseLatexToReact } from '@/lib/utils/latex';

export interface LabSafetyChemicalItem {
  id: number;
  name: string;
  hazard?: string | null; // CSV codes directement fournis (optionnel)
  stock: number;
  reactifPreset?: {
    id?: number;
    hazardClass?: string | null;
    name?: string | null;
    formula?: string | null;
    casNumber?: string | null;
    density?: number | null;
    molarMass?: number | null;
  } | null;
}

// Mapping dynamique code -> niveau de sévérité numérique et famille
// Permet d'ajouter de nouveaux codes (issus de COMMON_DANGER_CLASSES) sans casser l'UI.
const H_SEVERITY: Record<string, { level: number; family: string }> = {
  // 0: inconfort / irritant
  H315: { level: 0, family: 'Irritation' },
  H319: { level: 0, family: 'Irritation' },
  H335: { level: 0, family: 'Irritation' },
  H336: { level: 0, family: 'Neuro / SNC' },
  // 1: nocif / modéré / sensibilisant / métal / environnement modéré
  H290: { level: 1, family: 'Corrosion métaux' },
  H317: { level: 1, family: 'Allergie' },
  H302: { level: 1, family: 'Toxicité aiguë' },
  H312: { level: 1, family: 'Toxicité aiguë' },
  H332: { level: 1, family: 'Toxicité aiguë' },
  H411: { level: 1, family: 'Environnement' },
  H412: { level: 1, family: 'Environnement' },
  // 2: corrosif / tox sévère / env aigu
  H314: { level: 2, family: 'Corrosif' },
  H318: { level: 2, family: 'Oculaire' },
  H331: { level: 2, family: 'Toxicité aiguë' },
  H311: { level: 2, family: 'Toxicité aiguë' },
  H301: { level: 2, family: 'Toxicité aiguë' },
  H400: { level: 2, family: 'Environnement' },
  H410: { level: 2, family: 'Environnement' },
  // 3: mortel / organes graves
  H330: { level: 3, family: 'Toxicité aiguë' },
  H310: { level: 3, family: 'Toxicité aiguë' },
  H300: { level: 3, family: 'Toxicité aiguë' },
  H370: { level: 3, family: 'STOT' },
  H372: { level: 3, family: 'STOT' },
  // 4: CMR
  H340: { level: 4, family: 'Mutagène' },
  H341: { level: 4, family: 'Mutagène' },
  H350: { level: 4, family: 'Cancérogène' },
  H351: { level: 4, family: 'Cancérogène' },
  H360: { level: 4, family: 'Reprotoxique' },
  H360FD: { level: 4, family: 'Reprotoxique' },
  H361: { level: 4, family: 'Reprotoxique' },
  // 5: Oxydants / explosifs / inflammables extrêmes
  H271: { level: 5, family: 'Oxydant' },
  H272: { level: 5, family: 'Oxydant' },
  H220: { level: 5, family: 'Inflammable' },
  H221: { level: 5, family: 'Inflammable' },
  H225: { level: 5, family: 'Inflammable' },
  H202: { level: 5, family: 'Explosif' },
};

const LEVEL_LABEL: Record<number, string> = {
  0: 'Irritants / Inconfort',
  1: 'Nocifs / Modéré',
  2: 'Corrosifs / Toxiques sévères',
  3: 'Très dangereux (Mortels / STOT)',
  4: 'CMR (Cancérogènes / Mutagènes / Reprotoxiques)',
  5: 'Extrêmes (Explosifs / Oxydants / Inflammables)',
};

const H_DESCRIPTIONS: Record<string, string> = {
  H315: 'Irritation cutanée',
  H319: 'Irritation oculaire',
  H335: 'Irritation voies respiratoires',
  H336: 'Somnolence / vertiges',
  H290: 'Corrosif pour les métaux',
  H317: 'Allergie cutanée',
  H302: 'Nocif ingestion',
  H312: 'Nocif contact cutané',
  H332: 'Nocif inhalation',
  H411: 'Toxique milieu aquatique chronique',
  H412: 'Nocif milieu aquatique chronique',
  H314: 'Brûlures / lésions oculaires graves',
  H318: 'Lésions oculaires graves',
  H331: 'Toxique inhalation',
  H311: 'Toxique contact cutané',
  H301: 'Toxique ingestion',
  H400: 'Très toxique milieu aquatique',
  H410: 'Très toxique milieu aquatique chronique',
  H330: 'Mortel inhalation',
  H310: 'Mortel contact cutané',
  H300: 'Mortel ingestion',
  H370: 'Atteinte d’organe unique',
  H372: 'Atteintes organes prolongées',
  H340: 'Peut induire anomalies génétiques',
  H341: 'Susceptible anomalies génétiques',
  H350: 'Peut provoquer le cancer',
  H351: 'Susceptible de provoquer le cancer',
  H360: 'Nuit fertilité ou fœtus',
  H360FD: 'Nuit fertilité et fœtus',
  H361: 'Susceptible de nuire fertilité/fœtus',
  H271: 'Oxydant puissant (incendie/explosion)',
  H272: 'Peut aggraver un incendie',
  H220: 'Gaz extrêmement inflammable',
  H221: 'Gaz inflammable',
  H225: 'Liquide/vapeur très inflammable',
  H202: 'Explosif, risque projection',
};

interface Props {
  chemicals: LabSafetyChemicalItem[];
  loading?: boolean;
  lastUpdated?: Date | null;
}

export const LabSafetyAnalysis: React.FC<Props> = ({ chemicals, loading, lastUpdated }) => {
  const hazardStats = useMemo(() => {
    const byLevelCount: Record<number, number> = {};
    const byFamily: Record<string, Map<number, string>> = {};
    const hazardOccurrences: Record<string, number> = {};
    let maxLevel = -1;
    let hazardousReactifIds = new Set<number>();
    const levelDetails: Record<
      number,
      {
        id: number;
        name: string;
        formula?: string | null;
        cas?: string | null;
        density?: number | null;
        molarMass?: number | null;
        hazardCodes: string[];
      }[]
    > = {};

    chemicals.forEach((c) => {
      const hazardCsv = c.hazard ?? c.reactifPreset?.hazardClass;
      if (!hazardCsv) return;
      const codes = hazardCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!codes.length) return;
      const displayName =
        (c.name && c.name.trim().length ? c.name : c.reactifPreset?.name || '') ||
        `Réactif #${c.id}`;
      hazardousReactifIds.add(c.id);
      codes.forEach((code) => {
        hazardOccurrences[code] = (hazardOccurrences[code] || 0) + 1;
        const meta = H_SEVERITY[code];
        if (meta) {
          byLevelCount[meta.level] = (byLevelCount[meta.level] || 0) + 1;
          maxLevel = Math.max(maxLevel, meta.level);
          if (!byFamily[meta.family]) byFamily[meta.family] = new Map();
          // id-based key ensures uniqueness even if same name reused
          if (!byFamily[meta.family].has(c.id)) byFamily[meta.family].set(c.id, displayName);
          if (!levelDetails[meta.level]) levelDetails[meta.level] = [];
          // Add or merge hazard codes for this chemical within the level
          const existing = levelDetails[meta.level].find((r) => r.id === c.id);
          if (existing) {
            if (!existing.hazardCodes.includes(code)) existing.hazardCodes.push(code);
          } else {
            levelDetails[meta.level].push({
              id: c.id,
              name: displayName,
              formula: c.reactifPreset?.formula ?? undefined,
              cas: c.reactifPreset?.casNumber ?? undefined,
              density: (c.reactifPreset as any)?.density ?? null,
              molarMass: c.reactifPreset?.molarMass ?? null,
              hazardCodes: [code],
            });
          }
        }
      });
    });

    const categorizedCodes = new Set(Object.keys(H_SEVERITY));
    const uncategorized = Object.keys(hazardOccurrences).filter((c) => !categorizedCodes.has(c));
    // Sort hazard codes inside each level detail
    Object.values(levelDetails).forEach((arr) => arr.forEach((r) => r.hazardCodes.sort()));
    return {
      byLevelCount,
      byFamily,
      hazardOccurrences,
      maxLevel,
      uncategorized,
      hazardousCount: hazardousReactifIds.size,
      levelDetails,
    };
  }, [chemicals]);

  const riskBadge =
    hazardStats.maxLevel >= 0 ? LEVEL_LABEL[hazardStats.maxLevel] : 'Aucun risque identifié';
  const riskColor =
    hazardStats.maxLevel >= 3
      ? 'error'
      : hazardStats.maxLevel === 2
        ? 'warning'
        : hazardStats.maxLevel === 1
          ? 'info'
          : 'success';

  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const handleOpenLevel = (lvl: number) => setOpenLevel(lvl);
  const handleCloseDialog = () => setOpenLevel(null);

  // Dialog d'information sur les codes H (même contenu que sélecteur)
  const [openHazardInfo, setOpenHazardInfo] = useState(false);
  const [hazardSearch, setHazardSearch] = useState('');
  const filteredHazardInfo = useMemo(
    () =>
      COMMON_DANGER_CLASSES.filter(
        (c) =>
          c.code.toLowerCase().includes(hazardSearch.toLowerCase()) ||
          c.name.toLowerCase().includes(hazardSearch.toLowerCase()),
      ),
    [hazardSearch],
  );

  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardHeader
          title="Résumé sécurité laboratoire"
          subheader={
            lastUpdated ? `Dernière mise à jour: ${lastUpdated.toLocaleString()}` : undefined
          }
        />
        <Divider />
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
            <Chip
              color="default"
              variant="outlined"
              label={`${hazardStats.hazardousCount} réactifs avec codes H`}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Classement basé sur le code de danger le plus sévère présent. Les catégories listées
            ci-dessous indiquent combien de fois des dangers apparaissent (nombre total de mentions,
            pas de substances uniques).
          </Typography>
          <Stack spacing={1}>
            {Object.entries(hazardStats.byLevelCount)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([lvl, count]) => {
                const numeric = Number(lvl);
                const clickable = Boolean(hazardStats.levelDetails[numeric]?.length);
                return (
                  <Box
                    key={lvl}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
                  >
                    <Chip
                      size="small"
                      color={
                        numeric === 2
                          ? 'warning'
                          : numeric >= 3
                            ? 'error'
                            : numeric === 1
                              ? 'info'
                              : 'default'
                      }
                      label={LEVEL_LABEL[numeric]}
                      onClick={clickable ? () => handleOpenLevel(numeric) : undefined}
                      clickable={clickable}
                      sx={clickable ? { cursor: 'pointer' } : undefined}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {count} occurrence{count > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                );
              })}
          </Stack>
          {hazardStats.uncategorized.length > 0 && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
              Codes non catégorisés: {hazardStats.uncategorized.join(', ')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Répartition par famille" subheader="Noms issus des presets inventaire" />
        <Divider />
        <CardContent>
          {Object.entries(hazardStats.byFamily)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([family, map]) => {
              const entries = Array.from(map.entries());
              return (
                <Box key={family} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    {family}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      ({entries.length})
                    </Typography>
                  </Typography>
                  <Stack
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      flexDirection: 'row',
                      gap: 0.75,
                    }}
                  >
                    {entries.slice(0, entries.length).map(([id, label]) => (
                      <Chip key={`${family}-${id}`} size="small" label={label} />
                    ))}
                  </Stack>
                </Box>
              );
            })}
          {!Object.keys(hazardStats.byFamily).length && (
            <Typography variant="body2" color="text.secondary">
              Aucun code identifié.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader
          title="Occurrences des codes H"
          action={
            <Tooltip title="Liste des codes H (CLP/GHS)">
              <IconButton size="small" onClick={() => setOpenHazardInfo(true)}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          }
        />
        <Divider />
        <CardContent>
          <List dense>
            {Object.entries(hazardStats.hazardOccurrences)
              .sort((a, b) => b[1] - a[1])
              .map(([code, cnt]) => (
                <ListItem key={code} sx={{ p: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip size="small" label={code} />
                        <Typography variant="body2">{H_DESCRIPTIONS[code] || '—'}</Typography>
                      </Box>
                    }
                    secondary={`${cnt} occurrence${cnt > 1 ? 's' : ''}`}
                  />
                </ListItem>
              ))}
          </List>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader title="Recommandations rapides" />
        <Divider />
        <CardContent>
          <Stack spacing={1}>
            {hazardStats.maxLevel === 5 && (
              <Typography variant="body2">
                • Séparer oxydants (H271/H272) des combustibles et stocker solvants inflammables
                (H225) en armoire ventilée anti-feu.
              </Typography>
            )}
            {hazardStats.maxLevel >= 4 && (
              <Typography variant="body2">
                • Mettre à jour le registre d’exposition CMR et conserver FDS à jour (H340–H361).
              </Typography>
            )}
            {hazardStats.maxLevel >= 3 && (
              <Typography variant="body2">
                • Vérifier EPI respiratoire et procédures d’urgence (H300–H330, H370, H372).
              </Typography>
            )}
            {hazardStats.maxLevel >= 2 && (
              <Typography variant="body2">
                • Assurer douche oculaire / neutralisants disponibles (H314/H318).
              </Typography>
            )}
            {hazardStats.maxLevel >= 1 && (
              <Typography variant="body2">
                • Surveiller ventilation pour nocifs (H302/H332) et sensibilisants (H317).
              </Typography>
            )}
            {hazardStats.maxLevel >= 0 && hazardStats.maxLevel < 1 && (
              <Typography variant="body2">
                • Port de lunettes et gants pour limiter irritations (H315/H319/H335).
              </Typography>
            )}
            {hazardStats.maxLevel === -1 && (
              <Typography variant="body2">• Aucun risque identifié.</Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={openLevel !== null} onClose={handleCloseDialog} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              {openLevel !== null ? `Réactifs - ${LEVEL_LABEL[openLevel]}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Liste des codes H (CLP/GHS)">
                <IconButton size="small" onClick={() => setOpenHazardInfo(true)}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {openLevel !== null && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography fontWeight={400}>Nom</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={400}>Formule</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={400}>CAS</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={400}>Codes H (niveau)</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={400}>Codes H (tous)</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {hazardStats.levelDetails[openLevel]?.map((r) => {
                  // All codes for reactif (pas seulement ceux du niveau) pour contexte
                  const hazardCsv =
                    chemicals.find((c) => c.id === r.id)?.hazard ??
                    chemicals.find((c) => c.id === r.id)?.reactifPreset?.hazardClass;
                  const allCodes = (hazardCsv || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>
                        {r.formula ? parseLatexToReact(r.formula) : '—'}
                      </TableCell>
                      <TableCell>{r.cas || '—'}</TableCell>
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {r.hazardCodes.map((hc) => (
                            <Chip
                              key={hc}
                              size="small"
                              label={hc}
                              color={
                                openLevel >= 3
                                  ? 'error'
                                  : openLevel === 2
                                    ? 'warning'
                                    : openLevel === 1
                                      ? 'info'
                                      : 'default'
                              }
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {allCodes
                            .filter((c) => c)
                            .map((hc) => (
                              <Chip
                                key={`all-${r.id}-${hc}`}
                                size="small"
                                label={hc}
                                variant={r.hazardCodes.includes(hc) ? 'filled' : 'outlined'}
                              />
                            ))}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {openLevel !== null && !hazardStats.levelDetails[openLevel]?.length && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Aucun réactif pour ce niveau.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog d'information complète sur les codes H */}
      <Dialog
        open={openHazardInfo}
        onClose={() => setOpenHazardInfo(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Codes de danger (Classification CLP/GHS)
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Liste des codes H (CLP/GHS)">
                <IconButton size="small" onClick={() => setOpenHazardInfo(true)}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={() => setOpenHazardInfo(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher un code ou une description..."
            value={hazardSearch}
            onChange={(e) => setHazardSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />
          <Box sx={{ maxHeight: 600, overflow: 'auto' }}>
            <List dense>
              {filteredHazardInfo.map((item, index) => (
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
                  {index < filteredHazardInfo.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            {filteredHazardInfo.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun code trouvé pour "{hazardSearch}"
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>Note:</strong> Ces codes suivent la classification CLP (Classification,
              Labelling and Packaging) transposant le système GHS.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default LabSafetyAnalysis;
