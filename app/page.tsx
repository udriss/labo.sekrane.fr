"use client"

import { useEffect, useState, useCallback } from 'react';
import { 
  Container, Typography, Box, Card, CardContent, CardActions, Button,
  Grid, Avatar, Chip, Alert, Paper, Stack, IconButton, Badge,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText,
  CircularProgress, Backdrop, Skeleton, Tooltip, Fade, Grow,
  useTheme, alpha, Divider, ButtonBase,
  Collapse,
} from "@mui/material"
import { 
  Science, Inventory, Assignment, CalendarMonth, ShoppingCart,
  Notifications, TrendingUp, Warning, Person,
  AdminPanelSettings, Dashboard, Settings,
  QrCodeScanner, Security, BookmarkBorder, Schedule,
  School, Room, Memory, NetworkPing, Construction,
  ArrowForward, CheckCircle, ErrorOutline, InfoOutlined,
  AccessTime, Logout, MoreVert, Menu as MenuIcon, 
  Refresh,
  ExpandMore,
  ExpandLess,
  Error as ErrorIcon,
  Storage,
  Speed,
  People,
} from "@mui/icons-material"
import Link from "next/link"
import Image from "next/image"
import type { StatsData } from "@/types/prisma"
import type { JSX } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { motion } from "framer-motion"

// Ajout du typage pour MAIN_MODULES
interface Module {
  title: string;
  description: string;
  icon: JSX.Element;
  href: string;
  color: string;
  gradient?: string;
  features: string[];
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
}

// Composant pour les cartes de statistiques
const StatCard = ({ 
  icon, 
  value, 
  label, 
  subLabel, 
  color, 
  bgColor, 
  loading, 
  trend 
}: {
  icon: JSX.Element;
  value: number;
  label: string;
  subLabel?: string;
  color: string;
  bgColor: string;
  loading: boolean;
  trend?: { value: number; isPositive: boolean };
}) => {
  const theme = useTheme();
  
  return (
    <div>
      <Card 
        sx={{ 
          bgcolor: bgColor,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          position: 'relative',
          overflow: 'hidden',
          height: '100%',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 150,
            height: 150,
            borderRadius: '50%',
            bgcolor: alpha(color, 0.1),
          }}
        />
        
        <CardContent sx={{ position: 'relative' }}>
          {loading ? (
            <Box>
              <Skeleton variant="circular" width={56} height={56} sx={{ mb: 2 }} />
              <Skeleton variant="text" width={80} height={40} />
              <Skeleton variant="text" width={120} />
            </Box>
          ) : (
            <Fade in={!loading}>
              <Box>
                <Avatar 
                  sx={{ 
                    bgcolor: color, 
                    width: 56, 
                    height: 56,
                    mb: 2,
                    boxShadow: `0 4px 14px ${alpha(color, 0.4)}`
                  }}
                >
                  {icon}
                </Avatar>
                
                <Box display="flex" alignItems="baseline" gap={1}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color }}>
                    {value}
                  </Typography>
                  {trend && (
                    <Chip
                      size="small"
                      icon={trend.isPositive ? <TrendingUp /> : <TrendingUp sx={{ transform: 'rotate(180deg)' }} />}
                      label={`${trend.isPositive ? '+' : ''}${trend.value}%`}
                      sx={{ 
                        bgcolor: trend.isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                        color: trend.isPositive ? 'success.main' : 'error.main'
                      }}
                    />
                  )}
                </Box>
                
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                  {label}
                </Typography>
                {subLabel && (
                  <Typography variant="caption" color="text.secondary">
                    {subLabel}
                  </Typography>
                )}
              </Box>
            </Fade>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Composant pour les modules
const ModuleCard = ({ module, disabled = false }: { module: Module; disabled?: boolean }) => {
  const theme = useTheme();
  
  return (
    <div>
      <Card 
        sx={{ 
          height: '100%',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          opacity: disabled ? 0.6 : 1,
          transition: 'all 0.3s ease',
          background: disabled ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)' : module.gradient || 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          '&:hover': !disabled ? {
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          } : {}
        }}
      >
        {disabled && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(255, 255, 255, 0.4)',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Chip 
              label="Bientôt disponible" 
              color="warning"
              icon={<Construction />}
              sx={{ 
                bgcolor: 'rgba(255, 152, 0, 0.9)',
                color: 'white',
                fontWeight: 600
              }}
            />
          </Box>
        )}
        
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="flex-start" gap={2.5}>
            <Avatar 
              sx={{ 
                bgcolor: module.gradient ? 'white' : module.color, 
                width: 64, 
                height: 64,
                color: module.gradient ? module.color : 'white',
                boxShadow: `0 4px 14px ${alpha(module.color, 0.3)}`
              }}
            >
              {module.icon}
            </Avatar>
            <Box flex={1}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: module.gradient ? 'black' : 'text.primary' }}>
                {module.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: module.gradient ? 'rgba(0, 0, 0, 0.9)' : 'text.secondary' }}>
                {module.description}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                {module.features.map((feature) => (
                  <Chip 
                    key={feature}
                    label={feature} 
                    size="small"
                    sx={{
                      bgcolor: module.gradient ? 'rgba(255,255,255,0.2)' : alpha(module.color, 0.1),
                      color: module.gradient ? 'black' : module.color,
                      border: module.gradient ? '1px solid rgba(255,255,255,0.3)' : 'none',
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
              bgcolor: module.gradient ? 'white' : module.color,
              color: module.gradient ? module.color : 'white',
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              py: 1.5,
              '&:hover': { 
                bgcolor: module.gradient ? 'rgba(255,255,255,0.9)' : module.color,
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

// Modules principaux avec gradients
const MAIN_MODULES: Module[] = [
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
    title: "Matériel de Laboratoire",
    description: "Inventaire, maintenance et réservation du matériel",
    icon: <Inventory sx={{ fontSize: 32 }} />,
    href: "/materiel",
    color: "#388e3c",
    gradient: "linear-gradient(135deg, #84fab033 0%, #8fd3f433 100%)",
    features: ["Maintenance", "Réservations", "Localisation"]
  },
  {
    title: "Cahier de TP",
    description: "Laboratoire électronique pour vos expériences",
    icon: <Assignment sx={{ fontSize: 32 }} />,
    href: "/notebook",
    color: "#f57c00",
    gradient: "linear-gradient(135deg, #fa709a33 0%, #fee14033 100%)",
    features: ["Protocoles", "Calculs auto", "Historique"]
  },
  {
    title: "Planification",
    description: "Calendrier intelligent et gestion des ressources",
    icon: <CalendarMonth sx={{ fontSize: 32 }} />,
    href: "/calendrier",
    color: "#d32f2f",
    gradient: "linear-gradient(135deg, #93fb9c33 0%, #00411252 100%)",
    features: ["Planning visuel", "Ressources", "Notifications"]
  }
]

// Modules en développement
const DEVELOPMENT_MODULES: Module[] = [
  {
    title: "Commandes",
    description: "Gestion des achats, devis et suivi budgétaire",
    icon: <ShoppingCart sx={{ fontSize: 32 }} />,
    href: "/orders",
    color: "#7b1fa2",
    features: ["Devis auto", "Suivi commandes", "Budget"]
  },
  {
    title: "Scanner Mobile",
    description: "Application mobile pour identification rapide",
    icon: <QrCodeScanner sx={{ fontSize: 32 }} />,
    href: "/scanner",
    color: "#0288d1",
    features: ["Scan rapide", "Hors ligne", "Multi-codes"]
  }
]



interface SystemStats {
  platform: string;
  nodeVersion: string;
  appVersion: string;
  dbStatus: string;
  dbResponseTime: number;
  ram: string;
  ramPercentage: number;
  storage: string;
  storagePercentage: number;
  cpuModel: string;
  cpuCores: number;
  cpuLoad: number;
  uptime: string;
  activeUsers: number;
  totalUsers: number;
  health: {
    database: boolean;
    memory: boolean;
    storage: boolean;
    cpu: boolean;
  };
  lastUpdate: string;
}

export default function Home() {
  const { data: session } = useSession();
  const theme = useTheme();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  // Fonction pour charger les stats système
const fetchSystemStats = useCallback(async () => {
  try {
    const response = await fetch('/api/system-status');
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    setSystemStats(data);
  } catch (error) {
    console.error('Erreur chargement stats système:', error);
  } finally {
    setLoadingSystem(false);
  }
}, []);

// Ajouter dans useEffect
useEffect(() => {
  // Tracker l'activité de l'utilisateur actuel
  const trackActivity = async () => {
    try {
      await fetch('/api/track-activity', { method: 'POST' });
    } catch (error) {
      console.error('Erreur tracking activité:', error);
    }
  };

  // Tracker immédiatement
  trackActivity();

  // Puis toutes les 2 minutes
  const activityInterval = setInterval(trackActivity, 2 * 60 * 1000);

  return () => clearInterval(activityInterval);
}, []);

// Effect pour charger et rafraîchir les stats
useEffect(() => {
  fetchSystemStats();
  
  if (autoRefresh) {
    const interval = setInterval(fetchSystemStats, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }
}, [fetchSystemStats, autoRefresh]);

  useEffect(() => {
    fetchStats();
    fetchSystemStats();
    
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
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
      opacity: 1, // Ajustez l'opacité selon vos besoins
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
      <div>
        {/* En-tête moderne */}
        <div>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 4, 
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decoration elements */}
            <Box
              sx={{
                position: 'absolute',
                top: -100,
                right: -100,
                width: 300,
                height: 300,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.1)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: -50,
                left: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.05)',
              }}
            />
            
            <Box display="flex" justifyContent="space-between" alignItems="center" position="relative">
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: 'white',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                  }}
                >
                  <Image
                    src="/logo_2.png"
                    alt="Logo"
                    width={150}
                    height={150}
                  />
                </Avatar>
                <Box>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                    LIMS - Laboratoire
                  </Typography>
                  <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                    Système de gestion intégré • Version 2.0
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={2}>
                <Tooltip title="Notifications">
                  <IconButton color="inherit" sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                    <Badge badgeContent={stats?.orders?.pending || 0} color="error">
                      <Notifications />
                    </Badge>
                  </IconButton>
                </Tooltip>
                
                <Chip 
                  avatar={
                    <Avatar sx={{ bgcolor: 'white', color: '#667eea' }}>
                      <Person />
                    </Avatar>
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {session?.user?.name || "Utilisateur"}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {(session?.user as any)?.role === 'ADMIN' ? 'Administrateur' : 
                         (session?.user as any)?.role === 'TEACHER' ? 'Enseignant' : 
                         (session?.user as any)?.role === 'ADMINLABO' ? 'Administrateur de Laboratoire' : 
                         (session?.user as any)?.role === 'LABORANTIN' ? 'Laborantin' : 'Utilisateur'}
                      </Typography>
                    </Box>
                  }
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    height: 48,
                    borderRadius: 24,
                    '& .MuiChip-label': { px: 2 }
                  }}
                  onClick={() => window.location.href = '/utilisateurs'}
                />
                
                <IconButton 
                  color="inherit"
                  onClick={() => signOut()}
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  <Logout />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        </div>

        {/* Statistiques avec animations */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<Science />}
              value={stats?.chemicals.total || 0}
              label="Réactifs chimiques"
              subLabel={stats?.chemicals?.lowStock ? `${stats.chemicals.lowStock} en stock faible` : undefined}
              color="#667eea"
              bgColor={alpha('#667eea', 0.08)}
              loading={loading}
              trend={{ value: 12, isPositive: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<Inventory />}
              value={stats?.equipment?.total || 0}
              label="Équipements"
              subLabel={`${stats?.equipment?.available || 0} disponibles`}
              color="#84fab0"
              bgColor={alpha('#84fab0', 0.08)}
              loading={loading}
              trend={{ value: 5, isPositive: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<Assignment />}
              value={stats?.notebook?.total || 0}
              label="Cahiers TP"
              subLabel={`${stats?.notebook?.thisMonth || 0} ce mois`}
              color="#fa709a"
              bgColor={alpha('#fa709a', 0.08)}
              loading={loading}
              trend={{ value: 8, isPositive: false }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              icon={<CalendarMonth />}
              value={stats?.orders.pending || 0}
              label="TP programmés"
              subLabel={`${stats?.orders.total || 0} au total`}
              color="#f093fb"
              bgColor={alpha('#f093fb', 0.08)}
              loading={loading}
              trend={{ value: 15, isPositive: true }}
            />
          </Grid>
        </Grid>

        {/* Alertes améliorées */}
        {stats && (stats.chemicals.expired > 0 || stats.chemicals.lowStock > 0) && (
          <div>
            <Alert 
              severity="warning" 
              sx={{ 
                mb: 4, 
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.08),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`
              }}
              icon={<Warning />}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Attention requise
                  </Typography>
                                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    {stats.chemicals.expired > 0 && (
                      <Chip 
                        icon={<ErrorOutline />} 
                        label={`${stats.chemicals.expired} réactifs expirés`} 
                        color="error" 
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                    {stats.chemicals.lowStock > 0 && (
                      <Chip 
                        icon={<TrendingUp sx={{ transform: 'rotate(180deg)' }} />} 
                        label={`${stats.chemicals.lowStock} stocks faibles`} 
                        color="warning" 
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </Stack>
                </Box>
                <Button 
                  variant="contained" 
                  size="small"
                  sx={{ 
                    bgcolor: theme.palette.warning.main,
                    '&:hover': { bgcolor: theme.palette.warning.dark }
                  }}
                >
                  Voir détails
                </Button>
              </Box>
            </Alert>
          </div>
        )}

        <Grid container spacing={4}>
          {/* Contenu principal */}
          <Grid size={{ xs: 12, lg: 9 }}>
            {/* Modules principaux */}
            <div>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Modules principaux
                </Typography>
                <Chip 
                  label="4 modules actifs" 
                  color="primary" 
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
              </Box>
            </div>

            <Grid container spacing={3}>
              {MAIN_MODULES.map((module) => (
                <Grid key={module.title} size={{ xs: 12, md: 6 }}>
                  <ModuleCard module={module} />
                </Grid>
              ))}
            </Grid>

            {/* Modules en développement */}
            <div>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3, mt: 5 }}>
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
            </div>

            <Grid container spacing={3}>
              {DEVELOPMENT_MODULES.map((module) => (
                <Grid key={module.title} size={{ xs: 12, md: 6 }}>
                  <ModuleCard module={module} disabled />
                </Grid>
              ))}
            </Grid>
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
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
                      color: 'white'
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
                        { title: "Sécurité", icon: <Security />, href: "/securite" },
                        { title: "Salles", icon: <Room />, href: "/admin/salles" },
                        { title: "Classes", icon: <School />, href: "/admin/classes" },
                      ] : [
                        { title: "Mon profil", icon: <Person />, href: "/utilisateurs" },
                        { title: "Mes salles", icon: <Room />, href: "/admin/salles" },
                        { title: "Mes classes", icon: <School />, href: "/admin/classes" },
                      ]).map((link) => (
                        <ListItem 
                          key={link.title} 
                          component={Link} 
                          href={link.href}
                          sx={{ 
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            mb: 0.5,
                            color: 'white',
                            '&:hover': { 
                              bgcolor: 'rgba(255,255,255,0.2)'
                            }
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 36, color: 'white' }}>
                            {link.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={link.title}
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </div>
              )}

              {/* Actions rapides */}
              <div>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Actions rapides
                  </Typography>
                  <Stack spacing={1.5}>
                    <Button 
                      component={Link}
                      href="/chemicals"
                      variant="outlined" 
                      fullWidth 
                      startIcon={<QrCodeScanner />}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        textTransform: 'none',
                        py: 1.5
                      }}
                    >
                      Scanner un réactif
                    </Button>
                    <Button 
                      component={Link}
                      href="/notebook"
                      variant="outlined" 
                      fullWidth 
                      startIcon={<BookmarkBorder />}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        textTransform: 'none',
                        py: 1.5
                      }}
                    >
                      Créer un TP
                    </Button>
                    <Button 
                      component={Link}
                      href="/calendrier"
                      variant="outlined" 
                      fullWidth 
                      startIcon={<Schedule />}
                      sx={{ 
                        justifyContent: 'flex-start',
                        borderRadius: 2,
                        textTransform: 'none',
                        py: 1.5
                      }}
                    >
                      Planning du jour
                    </Button>
                  </Stack>
                </Paper>
              </div>

              {/* État du système amélioré */}
              <Paper elevation={2} sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" display="flex" alignItems="center" gap={1}>
                    <Speed /> État du système
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title={autoRefresh ? "Actualisation auto activée" : "Actualisation auto désactivée"}>
                      <IconButton 
                        size="small" 
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        color={autoRefresh ? "primary" : "default"}
                      >
                        <Refresh className={autoRefresh ? "spinning" : ""} />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                      {expanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                </Box>
                
                {loadingSystem ? (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                  </Box>
                ) : systemStats ? (
                  <>
                    {/* Santé globale */}
                    <Box mb={2}>
                      <Alert 
                        severity={
                          Object.values(systemStats.health).every(v => v) ? "success" : 
                          Object.values(systemStats.health).some(v => !v) ? "warning" : "error"
                        }
                        icon={<CheckCircle />}
                      >
                        {Object.values(systemStats.health).every(v => v) 
                          ? "Tous les systèmes sont opérationnels" 
                          : "Certains systèmes nécessitent votre attention"}
                      </Alert>
                    </Box>

                    {/* Base de données */}
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                          Base de données
                        </Typography>
                        <Chip 
                          icon={systemStats.health.database ? <CheckCircle /> : <ErrorIcon />}
                          label={`${systemStats.dbStatus} (${systemStats.dbResponseTime}ms)`} 
                          color={systemStats.health.database ? "success" : "error"} 
                          size="small" 
                        />
                      </Box>
                    </Box>
                    
                    {/* RAM */}
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                          <Memory fontSize="small" /> Mémoire RAM
                        </Typography>
                        <Typography variant="caption" fontWeight={500}>
                          {systemStats.ram}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={systemStats.ramPercentage} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: systemStats.ramPercentage > 80 ? 'error.main' : 
                                    systemStats.ramPercentage > 60 ? 'warning.main' : 'success.main'
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {systemStats.ramPercentage}% utilisé
                      </Typography>
                    </Box>
                    
                    {/* Stockage */}
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                          <Storage fontSize="small" /> Stockage
                        </Typography>
                        <Typography variant="caption" fontWeight={500}>
                          {systemStats.storage}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={systemStats.storagePercentage}
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          bgcolor: 'action.hover',
                                      '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: systemStats.storagePercentage > 80 ? 'error.main' : 
                                    systemStats.storagePercentage > 60 ? 'warning.main' : 'success.main'
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {systemStats.storagePercentage}% utilisé
                      </Typography>
                    </Box>

                    {/* CPU (visible si expanded) */}
                    <Collapse in={expanded}>
                      <Box mb={2}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                            <Speed fontSize="small" /> Processeur
                          </Typography>
                          <Typography variant="caption" fontWeight={500}>
                            {systemStats.cpuLoad}% charge
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={systemStats.cpuLoad}
                          sx={{ 
                            height: 8, 
                            borderRadius: 4,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              bgcolor: systemStats.cpuLoad > 80 ? 'error.main' : 
                                      systemStats.cpuLoad > 60 ? 'warning.main' : 'success.main'
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {systemStats.cpuModel} ({systemStats.cpuCores} cœurs)
                        </Typography>
                      </Box>
                    </Collapse>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    {/* Statistiques rapides */}
                    <Grid container spacing={1}>
                      <Grid size={6}>
                        <Box textAlign="center" p={1} borderRadius={1} bgcolor="action.hover">
                          <People color="primary" />
                          <Typography variant="h6">{systemStats.activeUsers}/{systemStats.totalUsers}</Typography>
                          <Typography variant="caption" color="text.secondary">Utilisateurs actifs</Typography>
                        </Box>
                      </Grid>
                      <Grid size={6}>
                        <Box textAlign="center" p={1} borderRadius={1} bgcolor="action.hover">
                          <AccessTime color="primary" />
                          <Typography variant="h6">{systemStats.uptime}</Typography>
                          <Typography variant="caption" color="text.secondary">Uptime</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Détails supplémentaires (visible si expanded) */}
                    <Collapse in={expanded}>
                      <Box mt={2} p={1.5} borderRadius={1} bgcolor="action.hover">
                        <Typography variant="caption" component="div" color="text.secondary">
                          <strong>Plateforme:</strong> {systemStats.platform}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.secondary">
                          <strong>Node.js:</strong> {systemStats.nodeVersion}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.secondary">
                          <strong>Version LIMS:</strong> v{systemStats.appVersion}
                        </Typography>
                        <Typography variant="caption" component="div" color="text.secondary">
                          <strong>Dernière mise à jour:</strong> {new Date(systemStats.lastUpdate).toLocaleTimeString('fr-FR')}
                        </Typography>
                      </Box>
                    </Collapse>
                  </>
                ) : (
                  <Alert severity="error">
                    Impossible de charger les statistiques système
                  </Alert>
                )}
              </Paper>

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
      </div>
    </Container>
  )
}