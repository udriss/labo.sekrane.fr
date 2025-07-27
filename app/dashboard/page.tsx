"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  Alert
} from "@mui/material"
import {
  Dashboard as DashboardIcon,
  Science,
  Inventory,
  Assignment,
  ShoppingCart,
  TrendingUp,
  Warning
} from "@mui/icons-material"
import { StatsData } from "@/types/prisma"

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/stats')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques')
      }
      const statsData = await response.json()
      setStats(statsData)
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error)
      setError(error instanceof Error ? error.message : "Erreur de chargement")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>Chargement du tableau de bord...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom>
            <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
            Tableau de bord
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Vue d'ensemble du laboratoire
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {stats && (
        <>
          {/* Statistiques principales */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#1976d2' }}>
                      <Science />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="primary">
                        {stats.chemicals.total}
                      </Typography>
                      <Typography variant="body2">Réactifs chimiques</Typography>
                      {stats.chemicals.lowStock > 0 && (
                        <Typography variant="caption" color="warning.main">
                          {stats.chemicals.lowStock} stock bas
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#388e3c' }}>
                      <Inventory />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="success.main">
                        {stats.equipment.total}
                      </Typography>
                      <Typography variant="body2">Équipements</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.equipment.available} disponibles
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#f57c00' }}>
                      <Assignment />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="warning.main">
                        {stats.notebook.total}
                      </Typography>
                      <Typography variant="body2">Cahiers de TP</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.notebook.completed} terminés
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: '#7b1fa2' }}>
                      <ShoppingCart />
                    </Avatar>
                    <Box>
                      <Typography variant="h4" color="secondary.main">
                        {stats.orders.pending}
                      </Typography>
                      <Typography variant="body2">Commandes en cours</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total: {stats.orders.total}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Alertes */}
          {(stats.chemicals.expired > 0 || stats.chemicals.lowStock > 0) && (
            <Alert severity="warning" sx={{ mb: 4 }}>
              <Box>
                {stats.chemicals.expired > 0 && (
                  <Typography variant="body2">
                    ⚠️ {stats.chemicals.expired} réactifs expirés
                  </Typography>
                )}
                {stats.chemicals.lowStock > 0 && (
                  <Typography variant="body2">
                    📉 {stats.chemicals.lowStock} réactifs en stock faible
                  </Typography>
                )}
              </Box>
            </Alert>
          )}

          {/* Détails par statut */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  État des réactifs chimiques
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.total}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Stock bas</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.lowStock}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Expirés</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.chemicals.expired}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  État des équipements
                </Typography>
                <Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Total</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.total}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Disponibles</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.available}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Maintenance</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.maintenance}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" py={1}>
                    <Typography variant="body2">Rupture de stock</Typography>
                    <Typography variant="body2" fontWeight="bold">{stats.equipment.outOfStock}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  )
}
