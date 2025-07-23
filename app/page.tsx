"use client"

import { useState, useEffect } from "react"
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText,
  CircularProgress, Backdrop
} from "@mui/material"
import { 
  Science, Inventory, Assignment, CalendarMonth, ShoppingCart,
  Notifications, TrendingUp, Warning, Person,
  AdminPanelSettings, Dashboard, Settings,
  QrCodeScanner, Security, BookmarkBorder, Schedule,
  School, Room, Memory, NetworkPing, Construction
} from "@mui/icons-material"
import Link from "next/link"
import Image from "next/image"
import type { StatsData } from "@/types/prisma"
import type { JSX } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

// Ajout du typage pour MAIN_MODULES
interface Module {
  title: string;
  description: string;
  icon: JSX.Element;
  href: string;
  color: string;
  features: string[];
}

// Modules principaux de l'application
const MAIN_MODULES: Module[] = [
  {
    title: "Inventaire Chimique",
    description: "Gestion des produits chimiques, stock, sécurité",
    icon: <Science />,
    href: "/chemicals",
    color: "#1976d2",
    features: ["Scanner codes-barres", "Gestion stock", "Alertes sécurité"]
  },
  {
    title: "Matériel de Laboratoire",
    description: "Inventaire et suivi du matériel",
    icon: <Inventory />,
    href: "/materiel",
    color: "#388e3c",
    features: ["Maintenance", "Réservation", "Localisation"]
  },
  {
    title: "Cahier de TP",
    description: "Laboratoire électronique et expériences",
    icon: <Assignment />,
    href: "/notebook",
    color: "#f57c00",
    features: ["Protocoles", "Calculs", "Historique"]
  },
  {
    title: "Planification",
    description: "Calendrier des TP et réservations",
    icon: <CalendarMonth />,
    href: "/calendrier",
    color: "#d32f2f",
    features: ["Planning", "Réservations", "Ressources"]
  }
]

// Modules en cours de développement
const DEVELOPMENT_MODULES: Module[] = [
  {
    title: "Commandes",
    description: "Gestion des achats et fournisseurs",
    icon: <ShoppingCart />,
    href: "/orders",
    color: "#7b1fa2",
    features: ["Devis", "Suivi", "Budget"]
  },
  {
    title: "Scanner QR/Code-barres",
    description: "Identification rapide des produits",
    icon: <QrCodeScanner />,
    href: "/scanner",
    color: "#0288d1",
    features: ["Lecture rapide", "Identification", "Ajout stock"]
  }
]

// Liens rapides pour l'administration
const ADMIN_LINKS = [
  { title: "Tableau de bord", icon: <Dashboard />, href: "/dashboard" },
  { title: "Utilisateurs", icon: <Person />, href: "/utilisateurs" },
  { title: "Paramètres", icon: <Settings />, href: "/reglages" },
  { title: "Sécurité", icon: <Security />, href: "/securite" },
  { title: "Gestion des salles", icon: <Room />, href: "/admin/salles" },
  { title: "Gestion des classes", icon: <School />, href: "/admin/classes" },
]

// Liens pour les enseignants
const TEACHER_LINKS = [
  { title: "Mon profil", icon: <Person />, href: "/utilisateurs" },
  { title: "Gestion des salles", icon: <Room />, href: "/admin/salles" },
  { title: "Gestion des classes", icon: <School />, href: "/admin/classes" },
]

export default function Home() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    dbStatus: 'Connectée',
    ram: '2.3 GB / 8 GB',
    ramPercentage: 29,
    storage: '2.3 GB / 10 GB',
    storagePercentage: 23,
    ping: '12ms',
    uptime: '7 jours 14h',
    activeUsers: 12
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }
      const statsData = await response.json();
      setStats(statsData);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Simuler le chargement des statistiques système
      // Dans un vrai projet, cela ferait appel à une API réelle
      const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;
      setSystemStats(prev => ({
        ...prev,
        ram: memoryUsage ? `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(1)} MB` : prev.ram,
        ramPercentage: memoryUsage ? Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) : prev.ramPercentage
      }));
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques système:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSystemStats();
    
    // Actualiser les stats système toutes les 30 secondes
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bienvenue sur LIMS - Laboratoire de Chimie
        </Typography>
        <Typography variant="body1" sx={{ mb: 4 }}>
          Système de gestion intégré pour laboratoire. Connectez-vous pour accéder à vos données.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Connexion
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* En-tête avec logo et infos utilisateur */}
      <Paper elevation={2} sx={{ p: 3, mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Image
              src="/logo.png"
              alt="Logo Laboratoire"
              width={60}
              height={60}
            />
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                LIMS - Laboratoire de Chimie
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Système de gestion intégré pour laboratoire
              </Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Badge badgeContent={stats?.orders?.pending || 0} color="error">
              <IconButton color="inherit">
                <Notifications />
              </IconButton>
            </Badge>
            <Chip 
              avatar={<Avatar><Person /></Avatar>}
              label={session?.user?.name ? `${session.user.name} (Admin)` : "Utilisateur non spécifié"}
              color="secondary"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
              onClick={() => {
                // Rediriger vers la page utilisateur
                window.location.href = '/utilisateurs';
              }}
            />
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => {
                if (session) {
                  signOut();
                } else {
                  signIn();
                }
              }}
            >
              {session ? "Déconnexion" : "Connexion"}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Statistiques rapides */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card sx={{ bgcolor: '#e3f2fd', position: 'relative' }}>
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}
              >
                <CircularProgress />
              </Box>
            )}
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#1976d2' }}><Science /></Avatar>
                <Box>
                  <Typography variant="h4" color="primary">
                    {stats?.chemicals.total || 0}
                  </Typography>
                  <Typography variant="body2">Produits chimiques</Typography>
                  {stats?.chemicals?.lowStock && stats.chemicals.lowStock > 0 && (
                    <Chip size="small" label={`${stats.chemicals.lowStock} stock bas`} color="warning" />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card sx={{ bgcolor: '#e8f5e8', position: 'relative' }}>
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}
              >
                <CircularProgress />
              </Box>
            )}
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#388e3c' }}><Inventory /></Avatar>
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats?.equipment?.total || 0}
                  </Typography>
                  <Typography variant="body2">Équipements</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.equipment?.available || 0} disponibles
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card sx={{ bgcolor: '#fff3e0', position: 'relative' }}>
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}
              >
                <CircularProgress />
              </Box>
            )}
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#f57c00' }}><Assignment /></Avatar>
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats?.notebook?.total || 0}
                  </Typography>
                  <Typography variant="body2">Cahiers TP</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.notebook?.thisMonth || 0} récents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs:12, sm:6, md:3 }}>
          <Card sx={{ bgcolor: '#fce4ec', position: 'relative' }}>
            {loading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1
                }}
              >
                <CircularProgress />
              </Box>
            )}
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#d32f2f' }}><CalendarMonth /></Avatar>
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats?.orders.pending || 0}
                  </Typography>
                  <Typography variant="body2">TP programmés</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stats?.orders.total || 0} total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertes importantes */}
      {stats && (stats.chemicals.expired > 0 || stats.chemicals.lowStock > 0) && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2}>
            {stats.chemicals.expired > 0 && (
              <Chip icon={<Warning />} label={`${stats.chemicals.expired} produits expirés`} color="error" size="small" />
            )}
            {stats.chemicals.lowStock > 0 && (
              <Chip icon={<TrendingUp />} label={`${stats.chemicals.lowStock} stocks faibles`} color="warning" size="small" />
            )}
          </Stack>
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Modules principaux */}
        <Grid size={{ xs:12, lg:9 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
            Modules principaux
          </Typography>
          <Grid container spacing={3}>
            {MAIN_MODULES.map((module) => (
              <Grid key={module.title} size={{ xs:12, md:6 }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-4px)',
                      boxShadow: 6 
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: module.color, width: 56, height: 56 }}>
                        {module.icon}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {module.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {module.description}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                          {module.features.map((feature) => (
                            <Chip 
                              key={feature}
                              label={feature} 
                              size="small" 
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      component={Link}
                      href={module.href}
                      variant="contained"
                      fullWidth
                      sx={{ bgcolor: module.color, '&:hover': { bgcolor: module.color, opacity: 0.9 } }}
                    >
                      Accéder
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Modules en développement */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3, mt: 4, fontWeight: 'bold' }}>
            Modules en développement
          </Typography>
          <Grid container spacing={3}>
            {DEVELOPMENT_MODULES.map((module) => (
              <Grid key={module.title} size={{ xs:12, md:6 }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    opacity: 0.6,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.1)',
                      zIndex: 1,
                      pointerEvents: 'none'
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="flex-start" gap={2} mb={2}>
                      <Avatar sx={{ bgcolor: module.color, width: 56, height: 56 }}>
                        {module.icon}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom>
                          {module.title}
                          <Chip 
                            label="En développement" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {module.description}
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                          {module.features.map((feature) => (
                            <Chip 
                              key={feature}
                              label={feature} 
                              size="small" 
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button 
                      variant="contained"
                      fullWidth
                      disabled
                      startIcon={<Construction />}
                      sx={{ bgcolor: module.color, '&:hover': { bgcolor: module.color, opacity: 0.9 } }}
                    >
                      Bientôt disponible
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Panneau latéral */}
        <Grid size={{ xs:12, lg:3 }}>
          <Stack spacing={3}>
            {/* Liens d'administration ou enseignant */}
            {session?.user && (session.user as any)?.role === 'ADMIN' ? (
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <AdminPanelSettings sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Administration
                </Typography>
                <List dense>
                  {ADMIN_LINKS.map((link) => (
                    <ListItem key={link.title} component={Link} href={link.href} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {link.icon}
                      </ListItemIcon>
                      <ListItemText primary={link.title} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : session?.user && (session.user as any)?.role === 'TEACHER' ? (
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <School sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Gestion pédagogique
                </Typography>
                <List dense>
                  {TEACHER_LINKS.map((link) => (
                    <ListItem key={link.title} component={Link} href={link.href} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {link.icon}
                      </ListItemIcon>
                      <ListItemText primary={link.title} />
                    </ListItem>
                  ))}
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="caption">
                    Accès limité aux fonctions pédagogiques
                  </Typography>
                </Alert>
              </Paper>
            ) : null}

            {/* Actions rapides */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Actions rapides
              </Typography>
              <Stack spacing={1}>
                <Button 
                  component={Link}
                  href="/chemicals"
                  variant="outlined" 
                  fullWidth 
                  startIcon={<QrCodeScanner />}
                >
                  Scanner produit
                </Button>
                <Button 
                  component={Link}
                  href="/notebook"
                  variant="outlined" 
                  fullWidth 
                  startIcon={<BookmarkBorder />}
                >
                  Nouveau TP
                </Button>
                <Button 
                  component={Link}
                  href="/calendrier"
                  variant="outlined" 
                  fullWidth 
                  startIcon={<Schedule />}
                >
                  Planning du jour
                </Button>
              </Stack>
            </Paper>

            {/* État du système amélioré */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                État du système
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Base de données:
                </Typography>
                <Chip label={systemStats.dbStatus} color="success" size="small" />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Mémoire RAM: {systemStats.ram}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStats.ramPercentage} 
                  color={systemStats.ramPercentage > 80 ? "error" : systemStats.ramPercentage > 60 ? "warning" : "success"}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Stockage: {systemStats.storage}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={systemStats.storagePercentage} 
                  color={systemStats.storagePercentage > 80 ? "error" : systemStats.storagePercentage > 60 ? "warning" : "success"}
                />
              </Box>
              
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Chip 
                  icon={<NetworkPing />} 
                  label={`Ping: ${systemStats.ping}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  icon={<Person />} 
                  label={`${systemStats.activeUsers} utilisateurs`} 
                  size="small" 
                  variant="outlined" 
                />
              </Stack>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Uptime: {systemStats.uptime}
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  )
}
