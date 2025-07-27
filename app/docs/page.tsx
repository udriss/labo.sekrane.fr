// app/docs/page.tsx

"use client"

import { useState } from "react"
import {
  Container, Typography, Box, Card, CardContent, Paper, Stack, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Chip, Button, Tab, Tabs,
  Alert, List, ListItem, ListItemIcon, ListItemText, Divider, Grid,
  Stepper, Step, StepLabel, StepContent, Badge, Avatar, Tooltip,
  TextField, InputAdornment, Fade, Grow, useTheme, alpha
} from "@mui/material"
import {
  ExpandMore, Science, Inventory, Assignment, CalendarMonth,
  Person, Dashboard, Search, CheckCircle, Info, Warning,
  ArrowForward, PlayCircle, BookmarkBorder, Security,
  Groups, School, QrCodeScanner, Speed, Support,
  Lightbulb, MenuBook, Code, GitHub, Email, Category,
  Add, Edit, Tune, ViewList, ViewModule
} from "@mui/icons-material"
import Link from "next/link"
import { motion } from "framer-motion"
import Upload from "@mui/icons-material/Upload"
import { AdminPanelSettings } from "@mui/icons-material"

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

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

// Composant pour les cartes de fonctionnalités
const FeatureCard = ({ icon, title, description, link }: any) => {
  const theme = useTheme()
  
  return (
    <Card
      component={motion.div}
      whileHover={{ scale: 1.02 }}
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 6
        }
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), width: 56, height: 56 }}>
            {icon}
          </Avatar>
          <Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          {link && (
            <Button
              endIcon={<ArrowForward />}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            >
              En savoir plus
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

// Composant pour les étapes
const StepCard = ({ number, title, description }: any) => {
  return (
    <Box display="flex" gap={2} alignItems="flex-start">
      <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
        {number}
      </Avatar>
      <Box flex={1}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Box>
  )
}

export default function DocsPage() {
  const theme = useTheme()
  const [tabValue, setTabValue] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeStep, setActiveStep] = useState(0)

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* En-tête avec gradient */}
      <Paper
        elevation={0}
        sx={{
          p: 6,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Éléments décoratifs */}
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
        
        <Stack spacing={3} position="relative">
          <Box display="flex" alignItems="center" gap={2}>
            <MenuBook sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h3" component="h1" fontWeight="bold">
                Documentation LIMS
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9 }}>
                Guide complet d'utilisation du système de gestion de laboratoire
              </Typography>
            </Box>
          </Box>
          
          <TextField
            placeholder="Rechercher dans la documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'white' }} />
                </InputAdornment>
              ),
              sx: {
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.3)'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255,255,255,0.5)'
                }
              }
            }}
            sx={{ maxWidth: 600 }}
          />
        </Stack>
      </Paper>

      {/* Navigation rapide */}
      <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip
            icon={<Speed />}
            label="Démarrage rapide"
            onClick={() => setTabValue(0)}
            color={tabValue === 0 ? "primary" : "default"}
          />
          <Chip
            icon={<Science />}
            label="Modules"
            onClick={() => setTabValue(1)}
            color={tabValue === 1 ? "primary" : "default"}
          />
          <Chip
            icon={<Groups />}
            label="Rôles & Permissions"
            onClick={() => setTabValue(2)}
            color={tabValue === 2 ? "primary" : "default"}
          />
          <Chip
            icon={<Lightbulb />}
            label="Bonnes pratiques"
            onClick={() => setTabValue(3)}
            color={tabValue === 3 ? "primary" : "default"}
          />
          <Chip
            icon={<Support />}
            label="FAQ & Support"
            onClick={() => setTabValue(4)}
            color={tabValue === 4 ? "primary" : "default"}
          />
        </Stack>
      </Paper>

      {/* Contenu principal avec tabs */}
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Démarrage rapide" />
          <Tab label="Modules détaillés" />
          <Tab label="Rôles & Permissions" />
          <Tab label="Bonnes pratiques" />
          <Tab label="FAQ & Support" />
        </Tabs>

        {/* Tab 0: Démarrage rapide */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              🚀 Bienvenue dans LIMS
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              LIMS (Laboratory Information Management System) est votre solution complète pour gérer 
              efficacement un laboratoire scolaire. Suivez ces étapes pour démarrer rapidement.
            </Typography>

            {/* Étapes de démarrage */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
              <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                ⚡ Démarrage en 5 étapes
              </Typography>
              
              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>Connexion et profil</StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      Connectez-vous avec vos identifiants fournis par l'administrateur. 
                      Complétez votre profil en ajoutant vos classes et informations.
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setActiveStep(1)}
                    >
                      Suivant
                    </Button>
                  </StepContent>
                </Step>
                
                <Step>
                  <StepLabel>Explorer le dashboard</StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      Le dashboard vous donne une vue d'ensemble avec statistiques en temps réel,
                      alertes importantes et accès rapide aux modules.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setActiveStep(0)}>
                        Retour
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setActiveStep(2)}
                      >
                        Suivant
                      </Button>
                    </Stack>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Personnaliser vos catégories d'équipement</StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      Commencez par créer vos propres catégories et types d'équipements
                      adaptés à votre laboratoire. Utilisez l'onglet "Gérer les types".
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setActiveStep(1)}>
                        Retour
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setActiveStep(3)}
                      >
                        Suivant
                      </Button>
                    </Stack>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Créer votre premier TP</StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                      Utilisez l'assistant de création pour planifier vos séances de TP.
                      Importez un fichier ou utilisez un modèle prédéfini.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setActiveStep(2)}>
                        Retour
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => setActiveStep(4)}
                      >
                        Suivant
                      </Button>
                    </Stack>
                  </StepContent>
                </Step>

                <Step>
                  <StepLabel>Planifier dans le calendrier</StepLabel>
                  <StepContent>
                    <Typography variant="body2" paragraph>
                                            Organisez vos séances dans le calendrier interactif.
                      Assignez les classes et réservez le matériel nécessaire.
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => setActiveStep(3)}>
                        Retour
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => setActiveStep(5)}
                      >
                        Terminer
                      </Button>
                    </Stack>
                  </StepContent>
                </Step>
              </Stepper>
            </Paper>

            {/* Vue d'ensemble des fonctionnalités */}
            <Typography variant="h5" gutterBottom fontWeight="bold">
              🎯 Fonctionnalités principales
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <FeatureCard
                  icon={<Science color="primary" />}
                  title="Gestion des produits chimiques"
                  description="Inventaire intelligent avec alertes d'expiration, suivi des stocks et détection de doublons"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <FeatureCard
                  icon={<Inventory color="primary" />}
                  title="Matériel de laboratoire"
                  description="Cataloguez et localisez tout votre équipement avec gestion avancée des caractéristiques"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <FeatureCard
                  icon={<Assignment color="primary" />}
                  title="Cahiers de TP"
                  description="Créez et organisez vos protocoles avec association automatique du matériel"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6, lg: 3 }}>
                <FeatureCard
                  icon={<CalendarMonth color="primary" />}
                  title="Planification"
                  description="Calendrier intelligent pour organiser vos séances et réserver les ressources"
                />
              </Grid>
            </Grid>

            {/* Nouveautés */}
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                🆕 Nouvelles fonctionnalités
              </Typography>
              <Typography variant="body2">
                • Gestion avancée des équipements : résolutions, tailles, matériaux et champs personnalisés<br />
                • Catégories personnalisées pour organiser votre matériel selon vos besoins<br />
                • Import de fichiers amélioré avec suggestions intelligentes<br />
                • Interface de gestion des types d'équipements entièrement repensée
              </Typography>
            </Alert>
          </Box>
        </TabPanel>

        {/* Tab 1: Modules détaillés */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              📦 Modules détaillés
            </Typography>
            
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Science />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Module Produits Chimiques</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Gestion complète de l'inventaire chimique
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Alert severity="success">
                    Ce module est le cœur de la sécurité de votre laboratoire
                  </Alert>
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Fonctionnalités principales :
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Inventaire intelligent"
                          secondary="Auto-complétion basée sur une base de données de produits chimiques avec numéros CAS"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Alertes automatiques"
                          secondary="Notifications pour produits expirés ou stock faible"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Double vue"
                          secondary="Cartes visuelles ou tableau détaillé selon vos préférences"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Gestion des quantités"
                          secondary="Ajustement en temps réel avec sliders intuitifs"
                        />
                      </ListItem>
                    </List>
                  </Box>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      🎯 Utilisation type :
                    </Typography>
                    <ol>
                      <li>Cliquez sur "Ajouter un réactif"</li>
                      <li>Commencez à taper le nom - l'auto-complétion vous aidera</li>
                      <li>Renseignez la quantité et la localisation</li>
                      <li>Définissez une date d'expiration pour les alertes automatiques</li>
                      <li>Utilisez les sliders pour ajuster rapidement les stocks</li>
                    </ol>
                  </Paper>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <Inventory />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Module Matériel</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inventaire et gestion avancée des équipements
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Typography variant="body1">
                    Le module matériel offre une gestion complète et personnalisable de vos équipements.
                  </Typography>
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      🚀 Nouvelles fonctionnalités :
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Gestion multi-attributs"
                          secondary="Volumes, résolutions, tailles, matériaux - adaptés à chaque type d'équipement"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Champs personnalisés"
                          secondary="Créez vos propres champs pour des besoins spécifiques (certifications, compatibilités...)"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Catégories personnalisées"
                          secondary="Organisez votre matériel selon VOS besoins avec des catégories sur mesure"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
                        <ListItemText 
                          primary="Suggestions intelligentes"
                          secondary="Listes déroulantes pré-remplies contextuelles pour chaque type d'équipement"
                        />
                      </ListItem>
                    </List>
                  </Box>

                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Astuce :</strong> Utilisez l'onglet "Gérer les types" pour personnaliser 
                      complètement votre catalogue. Vous pouvez créer des catégories personnalisées 
                      et définir précisément les attributs de chaque équipement.
                    </Typography>
                  </Alert>

                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      📝 Exemple de gestion avancée :
                    </Typography>
                    <Typography variant="body2" component="div">
                      Pour une pipette graduée :
                      <ul>
                        <li><strong>Volumes :</strong> 1 mL, 5 mL, 10 mL, 25 mL</li>
                        <li><strong>Résolution :</strong> ± 0.01 mL</li>
                        <li><strong>Matériau :</strong> Verre borosilicate</li>
                        <li><strong>Champ personnalisé :</strong> Certification : ISO 8655</li>
                      </ul>
                    </Typography>
                  </Paper>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Category />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Gestion des Types d'Équipement</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Personnalisation complète du catalogue
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Typography variant="body1">
                    Interface dédiée pour personnaliser entièrement votre catalogue d'équipements.
                  </Typography>
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Capacités de personnalisation :
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <ViewModule color="primary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              Catégories standard
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Modifiez les équipements prédéfinis : ajoutez des volumes, 
                              des résolutions, des matériaux...
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <Add color="secondary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              Catégories personnalisées
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Créez vos propres catégories avec icônes et équipements 
                              spécifiques à vos besoins
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Note :</strong> Les modifications apportées aux types d'équipements 
                      s'appliquent immédiatement à tout le système. Les administrateurs peuvent 
                      voir qui a créé chaque catégorie personnalisée.
                    </Typography>
                  </Alert>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                                        <Assignment />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Module Cahiers de TP</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Création et gestion des protocoles
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Typography variant="body1">
                    Créez, organisez et partagez vos protocoles de TP facilement.
                  </Typography>
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Méthodes de création :
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <Upload color="primary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              Import de fichier
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              PDF, Word, images... Glissez-déposez vos documents existants
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <Assignment color="primary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              Création manuelle
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Éditeur intégré pour rédiger directement vos protocoles
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, md: 4 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1}>
                            <BookmarkBorder color="primary" />
                            <Typography variant="subtitle2" fontWeight="bold">
                              Modèles prédéfinis
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Utilisez et adaptez des TP types de la bibliothèque
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      🔗 Association intelligente du matériel :
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Le système détecte automatiquement les équipements mentionnés dans vos protocoles 
                      et vous propose de les associer. Avec les nouvelles fonctionnalités, vous pouvez 
                      même spécifier précisément les caractéristiques requises (volume de bécher, 
                      résolution de balance, etc.).
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <CalendarMonth />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Module Calendrier</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Planification et organisation des séances
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  <Typography variant="body1">
                    Organisez efficacement vos séances de laboratoire avec le calendrier intelligent.
                  </Typography>
                  
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Vues disponibles :
                    </Typography>
                    <Stack spacing={2}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          📅 Vue hebdomadaire
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Visualisez votre semaine d'un coup d'œil avec code couleur par type d'événement
                        </Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          📋 Liste des événements
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tous vos événements triés par date avec filtres avancés
                        </Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          📍 Planning du jour
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Focus sur la journée en cours avec timeline détaillée
                        </Typography>
                      </Paper>
                    </Stack>
                  </Box>

                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>Important :</strong> Les réservations de matériel sont automatiques 
                      lors de la création d'une séance. Le système vérifie les disponibilités en 
                      tenant compte des quantités et des caractéristiques spécifiques.
                    </Typography>
                  </Alert>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Box>
        </TabPanel>

        {/* Tab 2: Rôles & Permissions */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              👥 Rôles & Permissions
            </Typography>
            
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%', borderTop: '4px solid', borderColor: 'error.main' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <AdminPanelSettings color="error" />
                        <Typography variant="h6" fontWeight="bold">
                          Administrateur
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Accès complet au système
                      </Typography>
                      <Divider />
                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Gestion des utilisateurs" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Configuration système" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Accès à tous les modules" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Statistiques globales" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Gestion des salles" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Création de catégories globales" />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%', borderTop: '4px solid', borderColor: 'primary.main' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <School color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Enseignant
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Gestion des ressources pédagogiques
                      </Typography>
                      <Divider />
                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Création de TP" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Gestion du matériel" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Planification" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Inventaire chimique" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Catégories personnalisées" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Personnalisation des équipements" />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%', borderTop: '4px solid', borderColor: 'success.main' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Groups color="success" />
                        <Typography variant="h6" fontWeight="bold">
                          Étudiant
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Consultation et participation
                      </Typography>
                      <Divider />
                      <List dense>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Consultation des TP" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Vue du calendrier" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Profil personnel" />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckCircle fontSize="small" /></ListItemIcon>
                          <ListItemText primary="Accès lecture seule" />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Note :</strong> Les permissions sont cumulatives. Un administrateur possède 
                toutes les permissions d'un enseignant et d'un étudiant. Les catégories personnalisées 
                créées par un enseignant sont visibles par son créateur et les administrateurs.
              </Typography>
            </Alert>
          </Box>
        </TabPanel>

        {/* Tab 3: Bonnes pratiques */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              ✨ Bonnes pratiques
            </Typography>
            
            <Stack spacing={4}>
              <Paper variant="outlined" sx={{ p: 3, borderLeft: '4px solid', borderLeftColor: 'primary.main' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  🔒 Sécurité & Traçabilité
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="Documentez systématiquement"
                      secondary="Renseignez les dates d'expiration et les quantités minimales pour une gestion proactive"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="Utilisez les numéros CAS"
                      secondary="Identifiez précisément vos produits chimiques pour éviter les erreurs"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="warning" /></ListItemIcon>
                    <ListItemText 
                      primary="Mettez à jour en temps réel"
                      secondary="Ajustez les quantités immédiatement après utilisation"
                    />
                  </ListItem>
                </List>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  📊 Organisation optimale
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="Personnalisez votre catalogue"
                      secondary="Créez des catégories et types d'équipements adaptés à votre laboratoire"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="Utilisez les champs personnalisés"
                      secondary="Ajoutez des informations spécifiques : certifications, compatibilités, etc."
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="Exploitez les suggestions"
                      secondary="Les listes déroulantes contextuelles accélèrent la saisie"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="success" /></ListItemIcon>
                    <ListItemText 
                      primary="Planifiez à l'avance"
                      secondary="Utilisez le calendrier pour anticiper les besoins en matériel"
                    />
                  </ListItem>
                </List>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderLeft: '4px solid', borderLeftColor: 'info.main' }}>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  💡 Astuces d'utilisation
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="info" /></ListItemIcon>
                    <ListItemText 
                      primary="Multi-sélection dans les listes"
                                            secondary="Les nouveaux champs permettent la sélection multiple avec ajout de valeurs personnalisées"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="info" /></ListItemIcon>
                    <ListItemText 
                      primary="Utilisez la recherche"
                      secondary="Les barres de recherche supportent les recherches partielles"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="info" /></ListItemIcon>
                    <ListItemText 
                      primary="Personnalisez vos vues"
                      secondary="Basculez entre vue cartes et liste selon vos préférences"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="info" /></ListItemIcon>
                    <ListItemText 
                      primary="Exploitez le drag & drop"
                      secondary="Glissez-déposez vos fichiers directement dans les zones d'import"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Lightbulb color="info" /></ListItemIcon>
                    <ListItemText 
                      primary="Dupliquez pour gagner du temps"
                      secondary="Utilisez la fonction de duplication pour créer rapidement des équipements similaires"
                    />
                  </ListItem>
                </List>
              </Paper>
            </Stack>
          </Box>
        </TabPanel>

        {/* Tab 4: FAQ & Support */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              ❓ Questions fréquentes
            </Typography>
            
            <Stack spacing={2} sx={{ mb: 4 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Comment importer mes données existantes ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    LIMS supporte l'import de fichiers PDF, Word, et images. Pour les données 
                    en masse (inventaire existant), contactez votre administrateur qui pourra 
                    effectuer un import CSV via l'interface d'administration.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Puis-je créer mes propres catégories de matériel ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Oui ! Dans le module Matériel, accédez à l'onglet "Gérer les types" pour 
                    créer vos propres catégories et types d'équipements personnalisés. Vous pouvez 
                    définir tous les attributs nécessaires : volumes, résolutions, tailles, matériaux 
                    et même créer des champs personnalisés.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Comment fonctionnent les champs personnalisés ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Les champs personnalisés vous permettent d'ajouter des informations spécifiques 
                    à vos équipements. Lors de la modification d'un type d'équipement, créez un champ 
                    (ex: "Certification") et ajoutez plusieurs valeurs possibles. Ces champs apparaîtront 
                    ensuite lors de l'ajout d'équipements de ce type.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Comment gérer les produits en double ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Le système détecte automatiquement les doublons potentiels lors de l'ajout 
                    d'un nouveau réactif (par nom, formule ou numéro CAS). Vous pouvez alors 
                    choisir de fusionner ou créer quand même.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Les catégories personnalisées sont-elles partagées ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Les catégories personnalisées sont visibles par leur créateur et les administrateurs. 
                    Un administrateur peut modifier ou supprimer toute catégorie personnalisée. Les autres 
                    enseignants ne voient que les catégories standard et leurs propres créations.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Comment utiliser les suggestions intelligentes ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Lors de l'ajout d'attributs (volumes, résolutions, etc.), cliquez sur le champ 
                    pour voir les suggestions contextuelles. Ces suggestions sont adaptées au type 
                    d'équipement. Vous pouvez sélectionner plusieurs valeurs ou ajouter vos propres 
                    valeurs personnalisées.
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography fontWeight="bold">
                    Les données sont-elles sauvegardées automatiquement ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    Oui, toutes les modifications sont sauvegardées en temps réel. Les préférences 
                    utilisateur (mode de vue, filtres) sont également mémorisées entre les sessions.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Stack>

            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderColor: 'primary.main'
              }}
            >
              <Typography variant="h5" gutterBottom fontWeight="bold">
                📞 Besoin d'aide ?
              </Typography>
              
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Support color="primary" />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Support technique
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Pour les problèmes techniques et bugs
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      variant="outlined" 
                      startIcon={<Email />}
                      href="mailto:support@lims.edu"
                    >
                      support@lims.edu
                    </Button>
                  </Stack>
                </Grid>
                
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <GitHub />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Contribuer
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Signalez des bugs ou proposez des améliorations
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      variant="outlined" 
                      startIcon={<Code />}
                      href="https://github.com/udriss"
                      target="_blank"
                    >
                      GitHub Issues
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            <Alert severity="success" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Astuce :</strong> La plupart des éléments de l'interface ont des 
                info-bulles. Survolez les icônes et boutons pour obtenir plus d'informations !
              </Typography>
            </Alert>

            {/* Guide rapide des nouveautés */}
            <Paper variant="outlined" sx={{ p: 3, mt: 3, bgcolor: 'action.hover' }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                🆕 Guide des nouvelles fonctionnalités
              </Typography>
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    Gestion avancée des équipements
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Volumes :</strong> Spécifiez les capacités disponibles (250 mL, 1 L...)<br />
                    • <strong>Résolutions :</strong> Précision des instruments de mesure (±0.01 mL, 0.001 g...)<br />
                    • <strong>Tailles :</strong> Dimensions physiques (10x10 cm, Ø15 mm...)<br />
                    • <strong>Matériaux :</strong> Composition (Verre borosilicate, Inox 316L...)
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    Catégories personnalisées
                  </Typography>
                  <Typography variant="body2">
                    Créez vos propres catégories d'équipements avec icônes personnalisées. 
                    Organisez votre matériel selon vos besoins spécifiques.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    Champs personnalisés
                  </Typography>
                  <Typography variant="body2">
                    Ajoutez des informations spécifiques à vos équipements : certifications, 
                    compatibilités, normes... avec support de valeurs multiples.
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary">
                    Interface de sélection multiple
                  </Typography>
                  <Typography variant="body2">
                    Nouvelle interface permettant de sélectionner plusieurs valeurs dans des 
                    listes déroulantes tout en gardant la possibilité d'ajouter des valeurs 
                    personnalisées.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>

      {/* Footer */}
      <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          LIMS v2.0 - Laboratory Information Management System
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Développé avec ❤️ pour simplifier la gestion des laboratoires scolaires
        </Typography>
      </Box>
    </Container>
  )
}