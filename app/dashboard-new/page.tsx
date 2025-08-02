"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Avatar,
  Alert,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Divider,
  Grid
} from "@mui/material"
import {
  Science,
  Memory,
  Inventory,
  Build,
  Speed,
  Visibility,
  Biotech,
  Category,
  Assignment,
  TrendingUp,
  Warning,
  Error as ErrorIcon,
  CheckCircle
} from "@mui/icons-material"
import Link from "next/link"

interface DashboardStats {
  consumables?: {
    total: number
    inStock: number
    lowStock: number
    outOfStock: number
  }
  equipment?: {
    total: number
    available: number
    maintenance: number
    outOfOrder: number
  }
  chemicals?: {
    total: number
    inStock: number
    lowStock: number
    expired: number
  }
}

const disciplineConfig = {
  chemistry: {
    name: 'Chimie',
    color: '#2196f3',
    icon: <Biotech sx={{ fontSize: 40 }} />,
    modules: [
      {
        name: 'Réactifs chimiques',
        description: 'Gestion de l\'inventaire chimique',
        href: '/chemicals',
        icon: <Science />,
        color: '#4caf50'
      },
      {
        name: 'Matériel de Laboratoire',
        description: 'Équipements et instruments',
        href: '/materiel',
        icon: <Category />,
        color: '#ff9800'
      },
      {
        name: 'Commandes',
        description: 'Gestion des commandes',
        href: '/orders',
        icon: <Assignment />,
        color: '#9c27b0'
      }
    ],
    statsEndpoints: {
      consumables: '/api/chimie/chemicals',
      equipment: '/api/chimie/equipement'
    }
  },
  physics: {
    name: 'Physique',
    color: '#4caf50',
    icon: <Memory sx={{ fontSize: 40 }} />,
    modules: [
      {
        name: 'Consommables physiques',
        description: 'Composants et matériaux',
        href: '/physique',
        icon: <Build />,
        color: '#2196f3'
      },
      {
        name: 'Matériel de Physique',
        description: 'Instruments et appareils',
        href: '/physique',
        icon: <Speed />,
        color: '#ff5722'
      },
      {
        name: 'Systèmes optiques',
        description: 'Équipements d\'optique',
        href: '/physique',
        icon: <Visibility />,
        color: '#9c27b0'
      }
    ],
    statsEndpoints: {
      consumables: '/api/physique/consumables',
      equipment: '/api/physique/equipment'
    }
  }
}

import { Suspense } from "react"

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const discipline = searchParams.get('discipline') as 'chemistry' | 'physics' || 'chemistry'
  
  const [stats, setStats] = useState<DashboardStats>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const config = disciplineConfig[discipline]

  // Charger les statistiques selon la discipline
  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const promises = []
      
      // Charger les statistiques des consommables/réactifs
      promises.push(fetch(config.statsEndpoints.consumables))
      
      // Charger les statistiques des équipements
      promises.push(fetch(config.statsEndpoints.equipment))

      const responses = await Promise.all(promises)
      const [consumablesRes, equipmentRes] = responses

      const newStats: DashboardStats = {}

      if (consumablesRes.ok) {
        const consumablesData = await consumablesRes.json()
        if (discipline === 'chemistry') {
          newStats.chemicals = consumablesData.stats
        } else {
          newStats.consumables = consumablesData.stats
        }
      }

      if (equipmentRes.ok) {
        const equipmentData = await equipmentRes.json()
        newStats.equipment = equipmentData.stats
      }

      setStats(newStats)
    } catch (err) {
      setError('Erreur lors du chargement des données')
      console.error('Erreur dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [discipline])

  // Sauvegarder la préférence de discipline
  useEffect(() => {
    localStorage.setItem('preferredDiscipline', discipline)
  }, [discipline])

  const handleSwitchDiscipline = () => {
    const newDiscipline = discipline === 'chemistry' ? 'physics' : 'chemistry'
    router.push(`/dashboard?discipline=${newDiscipline}`)
  }

  const getStatsCards = () => {
    if (discipline === 'chemistry') {
      const chemicals = stats.chemicals || { total: 0, inStock: 0, lowStock: 0, expired: 0 }
      return [
        {
          title: 'Réactifs total',
          value: chemicals.total,
          icon: <Science />,
          color: '#2196f3'
        },
        {
          title: 'En stock',
          value: chemicals.inStock,
          icon: <Inventory />,
          color: '#4caf50'
        },
        {
          title: 'Stock faible',
          value: chemicals.lowStock,
          icon: <Warning />,
          color: '#ff9800'
        },
        {
          title: 'Expirés',
          value: chemicals.expired,
          icon: <ErrorIcon />,
          color: '#f44336'
        }
      ]
    } else {
      const consumables = stats.consumables || { total: 0, inStock: 0, lowStock: 0, outOfStock: 0 }
      return [
        {
          title: 'Consommables total',
          value: consumables.total,
          icon: <Build />,
          color: '#2196f3'
        },
        {
          title: 'En stock',
          value: consumables.inStock,
          icon: <Inventory />,
          color: '#4caf50'
        },
        {
          title: 'Stock faible',
          value: consumables.lowStock,
          icon: <Warning />,
          color: '#ff9800'
        },
        {
          title: 'Rupture',
          value: consumables.outOfStock,
          icon: <ErrorIcon />,
          color: '#f44336'
        }
      ]
    }
  }

  const getEquipmentStats = () => {
    const equipment = stats.equipment || { total: 0, available: 0, maintenance: 0, outOfOrder: 0 }
    return [
      {
        title: 'Équipements total',
        value: equipment.total,
        icon: <Category />,
        color: '#673ab7'
      },
      {
        title: 'Disponibles',
        value: equipment.available,
        icon: <CheckCircle />,
        color: '#4caf50'
      },
      {
        title: 'Maintenance',
        value: equipment.maintenance,
        icon: <Build />,
        color: '#ff9800'
      },
      {
        title: 'Hors service',
        value: equipment.outOfOrder,
        icon: <ErrorIcon />,
        color: '#f44336'
      }
    ]
  }

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* En-tête avec discipline */}
      <Box mb={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar
              sx={{
                bgcolor: config.color,
                width: 56,
                height: 56
              }}
            >
              {config.icon}
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                Tableau de bord {config.name}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Gestion du laboratoire de {config.name.toLowerCase()}
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="outlined"
            onClick={handleSwitchDiscipline}
            startIcon={discipline === 'chemistry' ? <Memory /> : <Biotech />}
          >
            Passer à {discipline === 'chemistry' ? 'Physique' : 'Chimie'}
          </Button>
        </Stack>

        <Chip
          label={`Mode ${config.name}`}
          color="primary"
          sx={{ bgcolor: config.color }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistiques principales */}
      <Grid container spacing={3} mb={4}>
        {getStatsCards().map((stat, index) => (
          <Grid size = {{ xs: 12, sm:6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: stat.color }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Statistiques équipements */}
      <Grid container spacing={3} mb={4}>
        {getEquipmentStats().map((stat, index) => (
          <Grid size = {{ xs: 12, sm:6, md: 3 }} key={index}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: stat.color }}>
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Modules disponibles */}
      <Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Modules disponibles
        </Typography>
        <Grid container spacing={3}>
          {config.modules.map((module, index) => (
            <Grid size = {{ xs: 12, md: 4 }} key={index}>
              <Card
                component={Link}
                href={module.href}
                sx={{
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 2
                  }
                }}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <Avatar sx={{ bgcolor: module.color }}>
                      {module.icon}
                    </Avatar>
                    <Typography variant="h6" component="h3">
                      {module.name}
                    </Typography>
                  </Stack>
                  <Typography color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  )
}
