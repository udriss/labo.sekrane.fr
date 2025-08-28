import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Box, Container, Stack, Typography, Paper, Button, Chip } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { loadAppSettings } from '@/lib/services/app-settings';
import EnergyField from '@/components/visuals/EnergyField'


export const metadata: Metadata = {
  title: 'Accueil',
};

export default async function HomePage() {
  const settings = await loadAppSettings();
  const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Paper elevation={8} sx={{ position: 'relative', overflow: 'hidden', borderRadius: 3 }}>
        <Stack direction="column" spacing={2} sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 5 }, color: 'text.primary' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScienceIcon fontSize="large" />
            <Typography variant="h3" component="h1" fontWeight={700}>
              SGIL • {footerBrand}
            </Typography>
          </Stack>

          <Typography variant="body1" sx={{ maxWidth: 880, opacity: 0.9 }}>
            Plateforme unifiée pour piloter vos activités de laboratoire : stocks, équipements, réactifs, planification,
            documentation et traçabilité. Une interface moderne, fiable et conçue pour l'efficacité au quotidien.
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip label="Traçabilité" color="primary" variant="outlined" />
            <Chip label="Qualité & sécurité" color="primary" variant="outlined" />
            <Chip label="Planification" color="success" variant="outlined" />
            <Chip label="Stocks & réactifs" color="default" variant="outlined" />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
            <Button variant="outlined" color="primary" href="/docs">
              Découvrir la documentation
            </Button>
            <Button variant="outlined" color="inherit" href="/recherche">
              Rechercher un module
            </Button>
          </Stack>
        </Stack>
      </Paper>
{/*         <Box sx={{ position: 'absolute', inset: 0, opacity: 0.9, zIndex: 1000000 }}>
          <EnergyField 
          height={820} 
          beams={10} 
          maxLength={100} 
          curvature={.35} 
          segments={10} 
          opacity={0.8} 
          colorHueStart={27} 
          colorHueEnd={0} 
          colorSaturation={0.85} 
          colorLightness={0.15} 
          reactionSpeed={.7} 
          jitterMagnitude={0.8} 
          idleDelayMs={400} 
          lingerMs={400} 
          deviceOrientation={true} 
          dprMax={2} 
          />
        </Box> */}
    </Container>
  );
}
