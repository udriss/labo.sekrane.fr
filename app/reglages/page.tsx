"use client"

import { useState } from "react"
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Paper
} from "@mui/material"
import {
  Settings as SettingsIcon,
  Save,
  Restore,
  Storage,
  Notifications,
  Security
} from "@mui/icons-material"

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    // Paramètres généraux
    labName: "Laboratoire de Chimie",
    institution: "Lycée Exemple",
    address: "123 Rue de l'Éducation, 75000 Paris",
    
    // Paramètres de sécurité
    sessionTimeout: 30,
    requireStrongPasswords: true,
    enableTwoFactor: false,
    
    // Paramètres de notifications
    emailNotifications: true,
    stockAlerts: true,
    expirationAlerts: true,
    lowStockThreshold: 10,
    
    // Paramètres de sauvegarde
    autoBackup: true,
    backupFrequency: "daily",
    retentionDays: 30
  })

  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    try {
      // Ici on sauvegarderait les paramètres
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Paramètres du Système
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Configuration générale de l'application LIMS
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Save />}
          size="large"
          onClick={handleSave}
        >
          Sauvegarder
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Paramètres sauvegardés avec succès !
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Paramètres généraux */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SettingsIcon />
                Informations générales
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Nom du laboratoire"
                  value={settings.labName}
                  onChange={(e) => handleChange('labName', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Institution"
                  value={settings.institution}
                  onChange={(e) => handleChange('institution', e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Adresse"
                  multiline
                  rows={3}
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  margin="normal"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres de sécurité */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security />
                Sécurité
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Timeout de session (minutes)"
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                  margin="normal"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.requireStrongPasswords}
                      onChange={(e) => handleChange('requireStrongPasswords', e.target.checked)}
                    />
                  }
                  label="Exiger des mots de passe forts"
                  sx={{ mt: 2, display: 'block' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableTwoFactor}
                      onChange={(e) => handleChange('enableTwoFactor', e.target.checked)}
                    />
                  }
                  label="Authentification à deux facteurs"
                  sx={{ mt: 1, display: 'block' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres de notifications */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Notifications />
                Notifications
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                    />
                  }
                  label="Notifications par email"
                  sx={{ display: 'block' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.stockAlerts}
                      onChange={(e) => handleChange('stockAlerts', e.target.checked)}
                    />
                  }
                  label="Alertes de stock"
                  sx={{ mt: 1, display: 'block' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.expirationAlerts}
                      onChange={(e) => handleChange('expirationAlerts', e.target.checked)}
                    />
                  }
                  label="Alertes d'expiration"
                  sx={{ mt: 1, display: 'block' }}
                />
                <TextField
                  fullWidth
                  label="Seuil de stock faible"
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value))}
                  margin="normal"
                  helperText="Quantité en dessous de laquelle une alerte est envoyée"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres de sauvegarde */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Storage />
                Sauvegarde
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoBackup}
                      onChange={(e) => handleChange('autoBackup', e.target.checked)}
                    />
                  }
                  label="Sauvegarde automatique"
                  sx={{ display: 'block' }}
                />
                <TextField
                  fullWidth
                  label="Fréquence"
                  select
                  value={settings.backupFrequency}
                  onChange={(e) => handleChange('backupFrequency', e.target.value)}
                  margin="normal"
                  SelectProps={{ native: true }}
                >
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </TextField>
                <TextField
                  fullWidth
                  label="Rétention (jours)"
                  type="number"
                  value={settings.retentionDays}
                  onChange={(e) => handleChange('retentionDays', parseInt(e.target.value))}
                  margin="normal"
                  helperText="Nombre de jours de conservation des sauvegardes"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions système */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions système
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              <Button variant="outlined" startIcon={<Storage />}>
                Sauvegarder maintenant
              </Button>
              <Button variant="outlined" startIcon={<Restore />}>
                Restaurer une sauvegarde
              </Button>
              <Button variant="outlined" color="warning">
                Vider le cache
              </Button>
              <Button variant="outlined" color="error">
                Réinitialiser les paramètres
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
