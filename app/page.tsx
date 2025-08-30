import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Box, Container, Stack, Typography, Paper, Button, Chip, Grid, Card, CardContent, CardActionArea } from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import BuildIcon from '@mui/icons-material/Build';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import RoomIcon from '@mui/icons-material/Room';
import ClassIcon from '@mui/icons-material/Class';
import { loadAppSettings } from '@/lib/services/app-settings';
import EnergyField from '@/components/visuals/EnergyField'
import Link from 'next/link';


export const metadata: Metadata = {
  title: 'Accueil',
};

const menuItems = [
  {
    title: 'Ajouter événement',
    description: 'Planifier une nouvelle séance de TP',
    icon: CalendarTodayIcon,
    href: '/calendrier',
  },
  {
    title: 'Mon profil',
    description: 'Gérer mes informations personnelles',
    icon: PersonIcon,
    href: '/profil',
  },
  {
    title: 'Matériel',
    description: 'Gérer l\'inventaire du matériel',
    icon: BuildIcon,
    href: '/materiel',
  },
  {
    title: 'Réactifs',
    description: 'Gérer les produits chimiques',
    icon: ScienceOutlinedIcon,
    href: '/reactifs',
  },
  {
    title: 'Salles',
    description: 'Gérer les espaces de laboratoire',
    icon: RoomIcon,
    href: '/salles',
  },
  {
    title: 'Classes',
    description: 'Gérer les groupes d\'élèves',
    icon: ClassIcon,
    href: '/classes',
  },
];

export default async function HomePage() {
  const settings = await loadAppSettings();
  const footerBrand = settings.NOM_ETABLISSEMENT || settings.brandingName || '';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Paper elevation={8} sx={{ position: 'relative', overflow: 'hidden', borderRadius: 3, mb: 6 }}>
        <Stack direction="column" spacing={2} sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 5 }, color: 'text.primary' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ScienceIcon fontSize="large" />
            <Typography variant="h3" component="h1" fontWeight={700}>
              SGIL • {footerBrand}
            </Typography>
          </Stack>

          <Typography variant="body1" sx={{ opacity: 0.9 }}>
            Plateforme unifiée pour piloter vos activités de laboratoire : stocks, équipements, réactifs, planification,
            documentation et traçabilité.
          </Typography>
        </Stack>
      </Paper>

      {/* Menu Cards */}
      <Grid container spacing={3}>
        {menuItems.map((item) => (
          <Grid size={{ xs: 6, sm: 4, md: 4 }} key={item.title}>
            <Card
              elevation={4}
              sx={{
                height: '100%',
                transition: 'all 0.3s ease',
                borderRadius: 3,
                border: '2px solid transparent',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  elevation: 8,
                  transform: 'translateY(-4px)',
                  borderColor: 'primary.main',
                  '& .card-icon': {
                    transform: 'scale(1.1)',
                    color: 'primary.main',
                  },
                },
              }}
            >
              <CardActionArea
                component={Link}
                href={item.href}
                sx={{
                  height: '100%',
                  p: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    mb: 2,
                  }}
                >
                  <Box
                    className="card-icon"
                    sx={{
                      position: 'absolute',
                      top: -25,
                      right: -5,
                      color: 'primary.light',
                      opacity: 0.3,
                      fontSize: '4.5rem',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <item.icon fontSize="inherit" />
                  </Box>
                  <Typography
                    variant="h6"
                    component="h3"
                    fontWeight={600}
                    sx={{
                      color: 'text.primary',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {item.title}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.4,
                    fontSize: '0.875rem',
                  }}
                >
                  {item.description}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

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
