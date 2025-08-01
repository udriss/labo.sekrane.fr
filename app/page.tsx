'use client';

import { 
  Container, Box, Typography, Button, Grid, Card, CardContent, 
  Avatar, Stack, Chip, alpha, useTheme, CardActions, Paper,
  List, ListItem, ListItemIcon, ListItemText, Alert, Collapse,
  IconButton, LinearProgress, Divider
} from '@mui/material';
import { 
  Science, Memory, Assignment, CalendarMonth, Inventory, 
  ArrowForward, Speed, AdminPanelSettings, School, Person,
  Dashboard, Settings, Construction, ShoppingCart, QrCodeScanner,
  BookmarkBorder, Security, Refresh, ExpandLess, ExpandMore,
  InfoOutlined, CheckCircle, Error, ProductionQuantityLimits,
  Warning, NetworkPing
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import Image from 'next/image';

// Types
interface Module {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  gradient?: string;
  features: string[];
}

type Discipline = 'chemistry' | 'physics' | 'all';

// Modules en développement
const DEVELOPMENT_MODULES: Module[] = [
  {
    title: "Commandes",
    description: "Gestion des achats, devis et suivi budgétaire",
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    href: "/orders",
    color: "#7b1fa2",
    gradient: "linear-gradient(135deg, #7b1fa233 0%, #4a148c33 100%)",
    features: ["Devis auto", "Suivi commandes", "Budget"]
  },
  {
    title: "Scanner Mobile",
    description: "Application mobile pour identification rapide",
    icon: <QrCodeScanner sx={{ fontSize: 32 }} />,
    href: "/scanner",
    color: "#0288d1",
    gradient: "linear-gradient(135deg, #0288d133 0%, #01579b33 100%)",
    features: ["Scan rapide", "Hors ligne", "Multi-codes"]
  }
];

// Composant pour une carte de module
const ModuleCard = ({ module, disabled = false }: { module: Module; disabled?: boolean }) => {
  const theme = useTheme();

  return (
    <div>
      <Card 
        elevation={0}
        sx={{ 
          height: '100%',
          borderRadius: 3,
          background: module.gradient || `linear-gradient(135deg, ${alpha(module.color, 0.05)} 0%, ${alpha(module.color, 0.1)} 100%)`,
          border: `1px solid ${alpha(module.color, 0.1)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          '&:hover': !disabled ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px ${alpha(module.color, 0.2)}`,
            border: `1px solid ${alpha(module.color, 0.3)}`
          } : {}
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="flex-start" gap={2.5}>
            <Avatar 
              sx={{ 
                bgcolor: module.gradient ? theme.palette.background.paper : module.color, 
                color: module.gradient ? module.color : theme.palette.getContrastText(module.color),
                width: 64, 
                height: 64,
                boxShadow: `0 4px 14px ${alpha(module.color, 0.3)}`
              }}
            >
              {module.icon}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {module.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                {module.description}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {module.features.map((feature) => (
                  <Chip 
                    key={feature}
                    label={feature} 
                    size="small"
                    sx={{
                      bgcolor: module.gradient ? theme.palette.action.hover : alpha(module.color, 0.1),
                      color: module.gradient ? module.color : theme.palette.getContrastText(module.color),
                      border: module.gradient ? `1px solid ${alpha(module.color, 0.3)}` : 'none',
                      fontWeight: 500
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </CardContent>
        
        <CardActions sx={{ p: 3, pt: 0 }}>
          <Button 
            component={!disabled ? Link : 'button'}
            href={!disabled ? module.href : undefined}
            variant="contained"
            fullWidth
            disabled={disabled}
            endIcon={!disabled && <ArrowForward />}
            sx={{ 
              bgcolor: theme.palette.background.paper,
              color: module.gradient ? module.color : theme.palette.getContrastText(module.color),
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              '&:hover': { 
                bgcolor: module.gradient ? theme.palette.action.hover : module.color,
                transform: 'translateX(4px)'
              }
            }}
          >
            {disabled ? 'En développement' : 'Accéder au module'}
          </Button>
        </CardActions>
      </Card>
    </div>
  );
};

// Modules par discipline
const MODULES_BY_DISCIPLINE: Record<'chemistry' | 'physics', Module[]> = {
  chemistry: [
    {
      title: "Inventaire Chimique",
      description: "Gestion complète des réactifs chimiques, suivi des stocks et alertes de sécurité",
      icon: <Science sx={{ fontSize: 32 }} />,
      href: "/chemicals",
      color: "#1976d2",
      gradient: "linear-gradient(135deg, #0021b418 0%, #764ba218 100%)",
      features: ["Scanner QR", "Stock temps réel", "Alertes sécurité"]
    },
    {
      title: "Matériel Chimique",
      description: "Inventaire, maintenance et réservation du matériel de chimie",
      icon: <Inventory sx={{ fontSize: 32 }} />,
      href: "/materiel",
      color: "#388e3c",
      gradient: "linear-gradient(135deg, #84fab033 0%, #8fd3f433 100%)",
      features: ["Maintenance", "Réservations", "Localisation"]
    },
    {
      title: "Cahier de TP Chimie",
      description: "Laboratoire électronique pour vos expériences de chimie",
      icon: <Assignment sx={{ fontSize: 32 }} />,
      href: "/notebook",
      color: "#f57c00",
      gradient: "linear-gradient(135deg, #fa709a33 0%, #fee14033 100%)",
      features: ["Protocoles", "Calculs auto", "Historique"]
    },
    {
      title: "Planning Chimie",
      description: "Calendrier intelligent et gestion des ressources chimiques",
      icon: <CalendarMonth sx={{ fontSize: 32 }} />,
      href: "/calendrier",
      color: "#d32f2f",
      gradient: "linear-gradient(135deg, #93fb9c33 0%, #00411252 100%)",
      features: ["Planning visuel", "Ressources", "Notifications"]
    }
  ],
  physics: [
    {
      title: "Consommables Physique",
      description: "Gestion des composants et matériaux pour la physique",
      icon: <Memory sx={{ fontSize: 32 }} />,
      href: "/physique",
      color: "#4caf50",
      gradient: "linear-gradient(135deg, #4caf5018 0%, #2196f318 100%)",
      features: ["Composants", "Stock temps réel", "Alertes"]
    },
    {
      title: "Matériel Physique",
      description: "Inventaire et maintenance des instruments de physique",
      icon: <Speed sx={{ fontSize: 32 }} />,
      href: "/materiel",
      color: "#ff5722",
      gradient: "linear-gradient(135deg, #ff572233 0%, #795548333 100%)",
      features: ["Instruments", "Maintenance", "Calibrage"]
    },
    {
      title: "Cahier de TP Physique",
      description: "Laboratoire électronique pour vos expériences de physique",
      icon: <Assignment sx={{ fontSize: 32 }} />,
      href: "/notebook",
      color: "#9c27b0",
      gradient: "linear-gradient(135deg, #9c27b033 0%, #673ab733 100%)",
      features: ["Mesures", "Graphiques", "Analyse"]
    },
    {
      title: "Planning Physique",
      description: "Calendrier et gestion des ressources physiques",
      icon: <CalendarMonth sx={{ fontSize: 32 }} />,
      href: "/calendrier",
      color: "#607d8b",
      gradient: "linear-gradient(135deg, #607d8b33 0%, #45516733 100%)",
      features: ["Planning labo", "Équipements", "Réservations"]
    }
  ]
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const theme = useTheme();
  const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);

  // Toujours démarrer sur la sélection de discipline
  useEffect(() => {
    setSelectedDiscipline(null);
  }, []);

  // Charger la préférence utilisateur après sélection
  const handleChooseDiscipline = (discipline: Discipline) => {
    setSelectedDiscipline(discipline);
    localStorage.setItem('preferredDiscipline', discipline);
  };

  // Écran de connexion pour les utilisateurs non connectés
  if (status === "unauthenticated" || !session) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <div>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 6, 
              borderRadius: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Logo en arrière-plan */}
            <Box
              sx={{
                position: 'absolute',
                top: '0%',
                left: '0',
                right: '0',
                margin: '0 auto',
                transform: 'translate(0%, 0%)',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 1,
                zIndex: 0,
              }}
            >
              <Image
                src="/logo_2.png"
                alt="Logo Laboratoire"
                fill
                style={{ 
                  objectFit: 'contain',
                  top: '0%',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
                }}
              />
            </Box>

            {/* Contenu au premier plan */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
                LIMS - Laboratoire de Chimie
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Système de gestion intégré pour laboratoire
              </Typography>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => signIn()}
                sx={{ 
                  bgcolor: 'white',
                  color: '#667eea',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                  }
                }}
              >
                Se connecter
              </Button>
            </Box>
          </Paper>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {!selectedDiscipline ? (
        // Page de sélection des disciplines
        <Box textAlign="center">
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2 
            }}
          >
            Choisissez votre discipline
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}>
            Sélectionnez la discipline principale pour accéder aux modules spécialisés
          </Typography>

          <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 800, mx: 'auto' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card 
                elevation={0}
                onClick={() => handleChooseDiscipline('chemistry')}
                sx={{ 
                  p: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)'
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 3,
                    color: 'white'
                  }}
                >
                  <Science sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Chimie
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Gestion des réactifs, matériel chimique, protocoles et planification des TP de chimie
                </Typography>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card 
                elevation={0}
                onClick={() => handleChooseDiscipline('physics')}
                sx={{ 
                  p: 4,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 40px rgba(240, 147, 251, 0.3)'
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: 80, 
                    height: 80, 
                    mx: 'auto', 
                    mb: 3,
                    color: 'white'
                  }}
                >
                  <Memory sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                  Physique
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  Gestion des composants, instruments, mesures et planification des TP de physique
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Button 
            variant="text" 
            color="primary" 
            sx={{ mt: 4 }}
            onClick={() => setSelectedDiscipline('all' as any)}
          >
            Ou accéder à tous les modules
          </Button>
        </Box>
      ) : (
        // Page avec modules de la discipline sélectionnée + panneaux latéraux
        <Grid container spacing={4}>
          {/* Contenu principal */}
          <Grid size={{ xs: 12, lg: 9 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
              <Box>
                <Typography 
                  variant="h3" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700,
                    background: selectedDiscipline === 'chemistry' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : selectedDiscipline === 'physics'
                      ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #f5576c 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {selectedDiscipline === 'chemistry' ? 'Modules Chimie' : 
                   selectedDiscipline === 'physics' ? 'Modules Physique' : 
                   'Tous les Modules'}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {selectedDiscipline === 'chemistry' 
                    ? 'Gestion complète de votre laboratoire de chimie'
                    : selectedDiscipline === 'physics'
                    ? 'Gestion complète de votre laboratoire de physique'
                    : 'Accès à tous les modules de chimie et physique'
                  }
                </Typography>
              </Box>
              <Button 
                variant="outlined" 
                onClick={() => setSelectedDiscipline(null)}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none'
                }}
              >
                Changer de discipline
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Modules de la discipline sélectionnée */}
              {(selectedDiscipline === 'all' ? 
                [...MODULES_BY_DISCIPLINE.chemistry, ...MODULES_BY_DISCIPLINE.physics] :
                MODULES_BY_DISCIPLINE[selectedDiscipline as 'chemistry' | 'physics']
              ).map((module: Module) => (
                <Grid key={module.title} size={{ xs: 12, md: 6 }}>
                  <Box position="relative">
                    <ModuleCard module={module} />
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Modules en développement */}
            <Box sx={{ mt: 6 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Prochainement
                </Typography>
                <Chip 
                  label="En développement" 
                  color="warning" 
                  size="small"
                  icon={<Construction />}
                  sx={{ fontWeight: 500 }}
                />
              </Box>

              <Grid container spacing={3}>
                {DEVELOPMENT_MODULES.map((module) => (
                  <Grid key={module.title} size={{ xs: 12, md: 6 }}>
                    <ModuleCard module={module} disabled />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>

          {/* Panneau latéral */}
          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={3}>
              {/* Menu contextuel selon le rôle */}
              {session?.user && (
                <div>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, 
                      borderRadius: 3,
                      background: (session.user as any)?.role === 'ADMIN'
                        ? (theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
                            : `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.secondary.light} 100%)`)
                        : (theme.palette.mode === 'dark'
                            ? `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.info.dark} 100%)`
                            : `linear-gradient(135deg, ${theme.palette.success.light} 0%, ${theme.palette.info.light} 100%)`),
                      color: theme.palette.text.primary
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      {(session.user as any)?.role === 'ADMIN' ? (
                        <>
                          <AdminPanelSettings />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Administration
                          </Typography>
                        </>
                      ) :
                      (session.user as any)?.role === 'LABORANTIN' ? (
                        <>
                          <Memory />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Espace laborantin
                          </Typography>
                        </>
                      ) : (
                        <>
                          <School />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Espace enseignant
                          </Typography>
                        </>
                      )}
                    </Box>
                    
                    <List sx={{ p: 0 }}>
                      {((session.user as any)?.role === 'ADMIN' ? [
                        { title: "Vue d'ensemble", icon: <Dashboard />, href: "/dashboard" },
                        { title: "Utilisateurs", icon: <Person />, href: "/utilisateurs" },
                        { title: "Paramètres", icon: <Settings />, href: "/reglages" },
                        { title: "Logs", icon: <Assignment />, href: "/logs" },
                        { title: "Notifications", icon: <Assignment />, href: "/notifications" }
                      ] : (session.user as any)?.role === 'LABORANTIN' ? [
                        { title: "Réactifs", icon: <Inventory />, href: "/chemicals" },
                        { title: "Matériel", icon: <Construction />, href: "/materiel" },
                        { title: "Planning", icon: <Security />, href: "/calendrier" },
                        { title: "Scanner un réactif", icon: <QrCodeScanner />, href: "/scanner" }
                      ] : [
                        { title: "Planning", icon: <CalendarMonth />, href: "/calendrier" },
                        { title: "Mes TP", icon: <Assignment />, href: "/notebook" },
                        { title: "Mes classes", icon: <Assignment />, href: "/classes" },
                        { title: "Mon profil", icon: <Assignment />, href: "/utilisateurs" },
                      ]).map((item) => (
                        <ListItem key={item.title} component={Link} href={item.href} sx={{ borderRadius: 2, mb: 1 }}>
                          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText primary={item.title} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </div>
              )}

              {/* Info box */}
              <div>
                <Alert 
                  severity="info" 
                  icon={<InfoOutlined />}
                  sx={{ 
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`
                  }}
                >
                  <Typography variant="body2">
                    Besoin d'aide ? Consultez la <Link href="/docs" style={{ color: theme.palette.info.main }}>documentation</Link> ou contactez le support.
                  </Typography>
                </Alert>
              </div>
            </Stack>
          </Grid>
        </Grid>
      )}


    </Container>
  );
}
