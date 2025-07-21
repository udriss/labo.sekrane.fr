"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from "@mui/material"
import {
  Security as SecurityIcon,
  Shield,
  Warning,
  CheckCircle,
  Person,
  VpnKey,
  History,
  Block
} from "@mui/icons-material"

interface SecurityEvent {
  id: string
  type: "login" | "logout" | "failed_login" | "password_change" | "admin_action"
  user: string
  timestamp: Date
  ip: string
  description: string
  severity: "low" | "medium" | "high"
}

export default function SecurityPage() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/security-events');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des événements de sécurité');
      }
      const securityEventsData = await response.json();
      setSecurityEvents(securityEventsData);
    } catch (error) {
      console.error("Erreur lors du chargement des événements de sécurité:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "error"
      case "medium":
        return "warning"
      case "low":
        return "success"
      default:
        return "default"
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "login":
        return <Person color="success" />
      case "logout":
        return <Person color="info" />
      case "failed_login":
        return <Block color="error" />
      case "password_change":
        return <VpnKey color="warning" />
      case "admin_action":
        return <SecurityIcon color="error" />
      default:
        return <History />
    }
  }

  const handleSecurityReport = async () => {
    try {
      const response = await fetch('/api/security/rapport');
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du rapport de sécurité');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rapport_securite.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de la génération du rapport de sécurité:', error);
      alert('Impossible de générer le rapport de sécurité.');
    }
  };

  const handleForcePasswordChange = async () => {
    try {
      const response = await fetch('/api/security/force-password-change', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Erreur lors du changement de mots de passe');
      }
      alert('Changement de mots de passe forcé avec succès.');
    } catch (error) {
      console.error('Erreur lors du changement de mots de passe:', error);
      alert('Impossible de forcer le changement de mots de passe.');
    }
  };

  const handleSecurityAudit = async () => {
    try {
      const response = await fetch('/api/security/audit', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Erreur lors du lancement de l\'audit de sécurité');
      }
      alert('Audit de sécurité lancé avec succès.');
    } catch (error) {
      console.error('Erreur lors du lancement de l\'audit de sécurité:', error);
      alert('Impossible de lancer l\'audit de sécurité.');
    }
  };

  const handleSystemUpdate = async () => {
    try {
      const response = await fetch('/api/security/system-update', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du système');
      }
      alert('Mise à jour du système effectuée avec succès.');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du système:', error);
      alert('Impossible d\'effectuer la mise à jour du système.');
    }
  };

  const handleCheckSSL = async () => {
    try {
      const response = await fetch('/api/security/ssl-status');
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification SSL/TLS');
      }
      const data = await response.json();
      alert(`SSL/TLS Status: ${data.status}`);
    } catch (error) {
      console.error('Erreur lors de la vérification SSL/TLS:', error);
      alert('Impossible de vérifier l\'état SSL/TLS.');
    }
  };

  const handleWeakPasswords = async () => {
    try {
      const response = await fetch('/api/security/weak-passwords');
      if (!response.ok) {
        throw new Error('Erreur lors de l\'analyse des mots de passe faibles');
      }
      const data = await response.json();
      alert(`${data.count} utilisateurs ont des mots de passe faibles.`);
    } catch (error) {
      console.error('Erreur lors de l\'analyse des mots de passe faibles:', error);
      alert('Impossible d\'analyser les mots de passe faibles.');
    }
  };

  const handleBackupStatus = async () => {
    try {
      const response = await fetch('/api/security/backup-status');
      if (!response.ok) {
        throw new Error('Erreur lors de la vérification des sauvegardes');
      }
      const data = await response.json();
      alert(`Dernière sauvegarde: ${data.lastBackup}`);
    } catch (error) {
      console.error('Erreur lors de la vérification des sauvegardes:', error);
      alert('Impossible de vérifier l\'état des sauvegardes.');
    }
  };

  const handleSessionTimeout = async () => {
    try {
      const response = await fetch('/api/security/session-timeout');
      if (!response.ok) {
        throw new Error('Erreur lors de la configuration du timeout des sessions');
      }
      const data = await response.json();
      alert(`Timeout des sessions configuré à: ${data.timeout} minutes.`);
    } catch (error) {
      console.error('Erreur lors de la configuration du timeout des sessions:', error);
      alert('Impossible de configurer le timeout des sessions.');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Chargement des données de sécurité...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <SecurityIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Sécurité du Système
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Surveillance et gestion de la sécurité
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Shield />}
          size="large"
          onClick={handleSecurityReport}
        >
          Rapport de sécurité
        </Button>
      </Box>

      {/* Indicateurs de sécurité */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6" color="success.main">
                    Sécurisé
                  </Typography>
                  <Typography variant="body2">État du système</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Warning color="warning" />
                <Box>
                  <Typography variant="h6" color="warning.main">
                    2
                  </Typography>
                  <Typography variant="body2">Alertes actives</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Person color="primary" />
                <Box>
                  <Typography variant="h6" color="primary">
                    5
                  </Typography>
                  <Typography variant="body2">Utilisateurs connectés</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Block color="error" />
                <Box>
                  <Typography variant="h6" color="error.main">
                    3
                  </Typography>
                  <Typography variant="body2">Tentatives bloquées</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Journal des événements de sécurité */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Journal des événements de sécurité
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Utilisateur</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Sévérité</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {securityEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getEventIcon(event.type)}
                            {event.type.replace('_', ' ')}
                          </Box>
                        </TableCell>
                        <TableCell>{event.user}</TableCell>
                        <TableCell>
                          {event.timestamp.toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell>{event.ip}</TableCell>
                        <TableCell>{event.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={event.severity}
                            color={getSeverityColor(event.severity) as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recommandations de sécurité */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recommandations de sécurité
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="SSL/TLS activé"
                    secondary="Connexions sécurisées"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Mots de passe faibles"
                    secondary="2 utilisateurs concernés"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Sauvegardes à jour"
                    secondary="Dernière: aujourd'hui"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Sessions expirées"
                    secondary="Configurer timeout"
                  />
                </ListItem>
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Actions recommandées
              </Typography>
              <Box>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth 
                  sx={{ mb: 1 }}
                  onClick={handleForcePasswordChange}
                >
                  Forcer changement de mots de passe
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth 
                  sx={{ mb: 1 }}
                  onClick={handleSecurityAudit}
                >
                  Audit de sécurité
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth
                  onClick={handleSystemUpdate}
                >
                  Mise à jour système
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth
                  onClick={handleCheckSSL}
                >
                  Vérifier SSL/TLS
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth
                  onClick={handleWeakPasswords}
                >
                  Analyser mots de passe
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth
                  onClick={handleBackupStatus}
                >
                  Vérifier sauvegardes
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  fullWidth
                  onClick={handleSessionTimeout}
                >
                  Configurer timeout des sessions
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}
