"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Container,
  Avatar,
  Stack,
  Chip,
  Fade,
  useTheme
} from "@mui/material"
import {
  Science,
  Biotech,
  Psychology,
  Memory,
  Speed,
  Visibility,
  Build,
  Category
} from "@mui/icons-material"

interface DisciplineOption {
  id: 'chemistry' | 'physics'
  name: string
  description: string
  icon: React.ReactNode
  color: string
  modules: Array<{
    name: string
    description: string
    icon: React.ReactNode
  }>
}

const disciplines: DisciplineOption[] = [
  {
    id: 'chemistry',
    name: 'Chimie',
    description: 'Gestion des réactifs chimiques et équipements de laboratoire de chimie',
    icon: <Biotech sx={{ fontSize: 48 }} />,
    color: '#2196f3',
    modules: [
      {
        name: 'Réactifs chimiques',
        description: 'Inventaire et gestion des produits chimiques',
        icon: <Science />
      },
      {
        name: 'Matériel de Laboratoire',
        description: 'Équipements et instruments de chimie',
        icon: <Category />
      },
      {
        name: 'Sécurité chimique',
        description: 'Gestion des risques et protocoles de sécurité',
        icon: <Psychology />
      }
    ]
  },
  {
    id: 'physics',
    name: 'Physique',
    description: 'Gestion des consommables physiques et équipements de laboratoire de physique',
    icon: <Memory sx={{ fontSize: 48 }} />,
    color: '#4caf50',
    modules: [
      {
        name: 'Consommables physiques',
        description: 'Inventaire des composants et matériaux',
        icon: <Build />
      },
      {
        name: 'Matériel de Physique',
        description: 'Instruments et appareils de mesure',
        icon: <Speed />
      },
      {
        name: 'Systèmes optiques',
        description: 'Équipements d\'optique et laser',
        icon: <Visibility />
      }
    ]
  }
]

export default function DisciplineSelector() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<'chemistry' | 'physics' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const theme = useTheme()

  // Vérifier si l'utilisateur a déjà une préférence sauvegardée
  useEffect(() => {
    const savedDiscipline = localStorage.getItem('preferredDiscipline')
    if (savedDiscipline === 'chemistry' || savedDiscipline === 'physics') {
      // Rediriger automatiquement vers le dashboard approprié
      redirectToDiscipline(savedDiscipline)
    }
  }, [])

  const redirectToDiscipline = (discipline: 'chemistry' | 'physics') => {
    setIsLoading(true)
    localStorage.setItem('preferredDiscipline', discipline)
    
    // Rediriger vers le dashboard approprié
    if (discipline === 'chemistry') {
      router.push('/dashboard?discipline=chemistry')
    } else {
      router.push('/dashboard?discipline=physics')
    }
  }

  const handleDisciplineSelect = (discipline: 'chemistry' | 'physics') => {
    setSelectedDiscipline(discipline)
    setTimeout(() => {
      redirectToDiscipline(discipline)
    }, 300)
  }

  const handleResetPreference = () => {
    localStorage.removeItem('preferredDiscipline')
    setSelectedDiscipline(null)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={6}>
        <Typography 
          variant="h3" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Laboratoire SEKRANE
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Système de Gestion de Laboratoire Intégré
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choisissez votre discipline pour accéder aux outils spécialisés
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, justifyItems: 'center' }}>
        {disciplines.map((discipline) => (
          <Box key={discipline.id} sx={{ width: '100%', maxWidth: 500 }}>
            <Fade in timeout={1000}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  transform: selectedDiscipline === discipline.id ? 'scale(1.02)' : 'scale(1)',
                  borderColor: selectedDiscipline === discipline.id ? discipline.color : 'transparent',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    boxShadow: `0 8px 25px ${discipline.color}33`
                  }
                }}
                onClick={() => handleDisciplineSelect(discipline.id)}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: discipline.color,
                        mb: 2
                      }}
                    >
                      {discipline.icon}
                    </Avatar>
                    <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
                      {discipline.name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" textAlign="center">
                      {discipline.description}
                    </Typography>
                  </Box>

                  <Stack spacing={2}>
                    <Typography variant="h6" fontWeight="medium">
                      Modules inclus :
                    </Typography>
                    {discipline.modules.map((module, index) => (
                      <Box key={index} display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: `${discipline.color}22`,
                            color: discipline.color
                          }}
                        >
                          {module.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="medium">
                            {module.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {module.description}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>

                <CardActions sx={{ p: 3, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    sx={{
                      bgcolor: discipline.color,
                      '&:hover': {
                        bgcolor: discipline.color,
                        filter: 'brightness(0.9)'
                      }
                    }}
                  >
                    {isLoading && selectedDiscipline === discipline.id 
                      ? 'Chargement...' 
                      : `Accéder à ${discipline.name}`
                    }
                  </Button>
                </CardActions>
              </Card>
            </Fade>
          </Box>
        ))}
      </Box>

      <Box textAlign="center" mt={6}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Votre choix sera mémorisé pour les prochaines connexions
        </Typography>
        <Button 
          variant="text" 
          onClick={handleResetPreference}
          size="small"
        >
          Changer de discipline plus tard
        </Button>
      </Box>
    </Container>
  )
}
