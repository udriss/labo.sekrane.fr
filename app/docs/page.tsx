// app/docs/page.tsx

'use client';
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Science,
  Inventory,
  Assignment,
  CalendarMonth,
  AdminPanelSettings,
  School,
  Groups,
  Support,
  Email,
  GitHub,
  Code,
  CheckCircle,
  Psychology,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import DocsHeader from '@components/docs/DocsHeader';
import QuickNavChips from '@components/docs/QuickNavChips';
import FeatureCard from '@components/docs/FeatureCard';
import TabPanel from '@components/docs/TabPanel';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';

export default function DocsPage() {
      const theme = useTheme();
  
    const primaryColor =
      theme.palette.mode === 'light' ? theme.palette.primary.light : theme.palette.primary.dark;
    const secondaryColor =
      theme.palette.mode === 'light' ? theme.palette.secondary.light : theme.palette.secondary.dark;
    const primaryTransparent = alpha(primaryColor, 0.12);
    const secondaryTransparent = alpha(secondaryColor, 0.08);
const innerPanelStyles = {
    background: `linear-gradient(135deg, ${primaryTransparent} 0%, ${secondaryTransparent} 100%)`,
    p: { xs: 2, md: 4 },
    borderRadius: 4,
    width: '90%',
    display: 'flex',
    flexDirection: 'column',
    mx: 'auto',
    height: '90%',
    mt: 4,
  } as const;
  
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  // ---------- Modules data (minimal full-text index) ----------
  const modules = React.useMemo(
    () => [
      {
        id: 'calendrier',
        title: 'Calendrier & Planification',
        keywords: ['calendrier', 'planning', 'planification', 'événement', 'evenement', 'slots'],
        summary: 'Ajouter, planifier et suivre vos séances (TP ou Laborantin).',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              'Ajouter une séance (TP ou Laborantin)',
              'Ajouter des créneaux avec classes et salles',
              "Utiliser un modèle (TP preset) pour pré-remplir ressources et documents",
              'Joindre des documents (PDF, images, texte)',
              'Modifier, dupliquer, supprimer une séance',
            ],
          },
          {
            heading: 'Accès rapide',
            points: ['/calendrier', '/cahier', '/api/events', '/api/timeslots'],
          },
        ],
      },
      {
        id: 'materiel',
        title: 'Matériel (Équipement)',
        keywords: ['materiel', 'équipement', 'equipment', 'physique', 'chimie'],
        summary: 'Choisir le matériel nécessaire et ajouter des éléments personnalisés.',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              'Rechercher et sélectionner du matériel',
              'Définir les quantités (minimum 1)',
              'Ajouter du matériel personnalisé',
              'Filtrer par discipline (Chimie/Physique)',
            ],
          },
          { heading: 'Accès rapide', points: ['/materiel', '/api/materiel', '/api/equipement'] },
        ],
      },
      {
        id: 'reactifs',
        title: 'Réactifs (Chimie)',
        keywords: ['reactifs', 'réactifs', 'chimie', 'inventory', 'stock', 'unité'],
        summary: 'Demander des réactifs avec quantité et unité (g par défaut).',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              'Rechercher un réactif du catalogue',
              'Saisir une quantité et une unité (g par défaut)',
              'Ajouter un réactif personnalisé si besoin',
              'Visualiser vos demandes par séance',
            ],
          },
          { heading: 'Accès rapide', points: ['/reactifs', '/api/chemicals'] },
        ],
      },
      {
        id: 'documents',
        title: 'Cahiers / Documents',
        keywords: ['cahier', 'documents', 'upload', 'protocoles'],
        summary: 'Joindre des documents aux séances ou réutiliser ceux des modèles.',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              'Importer PDF, images, texte (max 10 Mo)',
              'Supprimer un document inutile',
              'Réutiliser les documents d’un modèle (preset)',
            ],
          },
          {
            heading: 'Accès rapide',
            points: ['/cahier', '/api/events/[id]/documents', '/api/upload'],
          },
        ],
      },
      {
        id: 'salles-classes',
        title: 'Salles & Classes',
        keywords: ['salles', 'classes', 'rooms'],
        summary: 'Associer des salles et classes à vos créneaux pour une planification claire.',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              'Choisir une ou plusieurs salles',
              'Associer les classes concernées',
              'Filtrer vos vues par salle ou classe',
            ],
          },
          { heading: 'Accès rapide', points: ['/salles', '/classes', '/api/salles', '/api/classes'] },
        ],
      },
      {
        id: 'notifications',
        title: 'Notifications',
        keywords: ['notifications', 'alerts'],
        summary: 'Recevoir des alertes utiles lors des changements importants.',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: [
              "Être averti quand un document est ajouté à votre séance",
              'Être notifié sur les modifications validées',
            ],
          },
          { heading: 'Accès rapide', points: ['/notifications', '/api/notifications'] },
        ],
      },
      {
        id: 'fournisseurs',
        title: 'Fournisseurs & Commandes',
        keywords: ['fournisseurs', 'suppliers', 'commandes'],
        summary: 'Gérer vos fournisseurs et préparer vos commandes.',
        sections: [
          {
            heading: 'Ce que vous pouvez faire',
            points: ['Lister/éditer vos fournisseurs', 'Préparer vos commandes'],
          },
          { heading: 'Accès rapide', points: ['/fournisseurs', '/api/suppliers', '/api/orders'] },
        ],
      },
      {
        id: 'consommables',
        title: 'Consommables',
        keywords: ['consommables', 'consumables'],
        summary: 'Suivre vos consommables et besoins au quotidien.',
        sections: [
          { heading: 'Ce que vous pouvez faire', points: ['Suivre et mettre à jour les consommables'] },
          { heading: 'Accès rapide', points: ['/consommables', '/api/consumables'] },
        ],
      },
    ],
    [],
  );
  const modulesIndex = React.useMemo(
    () =>
      modules.map((m) => ({
        id: m.id,
        title: m.title,
        content: [m.title, m.summary, ...m.sections.flatMap((s) => [s.heading, ...s.points])]
          .join(' ') // simple full-text corpus
          .toLowerCase(),
      })),
    [modules],
  );
  const filteredModuleIds = React.useMemo(() => {
    if (!normalizedQuery) return modules.map((m) => m.id);
    return modulesIndex.filter((mi) => mi.content.includes(normalizedQuery)).map((mi) => mi.id);
  }, [normalizedQuery, modules, modulesIndex]);
  const [expanded, setExpanded] = useState<string | false>('calendrier');
  useEffect(() => {
    if (normalizedQuery) {
      // Expand first matching module
      const first = filteredModuleIds[0];
      if (first) setExpanded(first);
    }
  }, [normalizedQuery, filteredModuleIds]);
  const handleAccordionChange = (id: string) => (_: any, isExp: boolean) => {
    setExpanded(isExp ? id : false);
    if (isExp && typeof window !== 'undefined') {
      // update hash
      history.replaceState(null, '', `#module-${id}`);
    }
  };

  return (
    <Container maxWidth="xl" sx={innerPanelStyles}>
      <DocsHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <QuickNavChips value={tabValue} onChange={setTabValue} />
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Démarrage rapide" />
          <Tab label="Modules détaillés" />
          <Tab label="Rôles & Permissions" />
          <Tab label="Bonnes pratiques" />
          <Tab label="FAQ & Support" />
        </Tabs>
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              🚀 Bienvenue dans SGIL
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              SGIL est votre solution complète pour gérer efficacement un laboratoire scolaire.
              Suivez ces étapes pour démarrer rapidement.
            </Typography>
            <Paper
              variant="outlined"
              sx={{ p: 3, mb: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}
            >
              <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                ⚡ Démarrage en 5 étapes
              </Typography>
              <Stepper activeStep={activeStep} orientation="vertical">
                {[
                  'Connexion et profil',
                  'Explorer le dashboard',
                  "Personnaliser vos catégories d'équipement",
                  'Ajouter votre premier TP',
                  'Planifier dans le calendrier',
                ].map((label, idx) => (
                  <Step key={idx}>
                    <StepLabel>{label}</StepLabel>
                    <StepContent>
                      <Typography variant="body2" component="span">
                        {idx === 0 &&
                          'Connectez-vous avec vos identifiants puis complétez votre profil.'}
                        {idx === 1 && "Vue d'ensemble avec statistiques, alertes et accès rapide."}
                        {idx === 2 && "Créez / ajustez vos catégories et types d'équipements."}
                        {idx === 3 &&
                          'Assistant d\'ajout pour planifier vos séances (fichier, manuel ou modèle).'}
                        {idx === 4 && 'Organisez vos séances dans le calendrier interactif.'}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        {idx > 0 && (
                          <Button size="small" onClick={() => setActiveStep(idx - 1)}>
                            Retour
                          </Button>
                        )}
                        {idx < 4 && (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => setActiveStep(idx + 1)}
                          >
                            Suivant
                          </Button>
                        )}
                        {idx === 4 && (
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => setActiveStep(5)}
                          >
                            Terminer
                          </Button>
                        )}
                      </Stack>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Paper>
            {/* Guide rapide avec Timeline */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Guide: Ajouter un TP et gérer le matériel
              </Typography>
              <Timeline position="alternate">
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color="primary" />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Aller dans Cahier
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ouvrez la page Cahier (/cahier) pour ajouter ou consulter vos TP.
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color="secondary" />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Ajouter un TP via Modèle (preset)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cliquez “Nouveau TP”, sélectionnez un modèle, puis ajustez réactifs et
                      matériel.
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot color="success" />
                    <TimelineConnector />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Associer le matériel
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Utilisez la sélection de matériel (/materiel) et précisez les quantités.
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
                <TimelineItem>
                  <TimelineSeparator>
                    <TimelineDot />
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Planifier
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Enregistrez puis planifiez la séance dans le calendrier.
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              </Timeline>
            </Paper>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              Fonctionnalités principales
            </Typography>
            <Box
              display="grid"
              gap={3}
              sx={{
                mb: 4,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              }}
            >
              <Box>
                <FeatureCard
                  icon={<Science color="primary" />}
                  title="Gestion des réactifs chimiques"
                  description="Inventaire intelligent avec alertes et suivi des stocks"
                />
              </Box>
              <Box>
                <FeatureCard
                  icon={<Inventory color="primary" />}
                  title="Matériel de laboratoire"
                  description="Cataloguez et localisez tout votre équipement"
                />
              </Box>
              <Box>
                <FeatureCard
                  icon={<Assignment color="primary" />}
                  title="Cahiers de TP"
                  description="Protocoles organisés avec association du matériel"
                />
              </Box>
              <Box>
                <FeatureCard
                  icon={<CalendarMonth color="primary" />}
                  title="Planification"
                  description="Calendrier intelligent et réservation de ressources"
                />
              </Box>
            </Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Nouvelles fonctionnalités
              </Typography>
              <Typography variant="body2">
                • Gestion avancée des équipements • Catégories personnalisées • Import amélioré •
                Interface repensée
              </Typography>
            </Alert>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Modules détaillés
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Recherche temps réel sur les modules. Ex: "undo", "signatures", "stock".
            </Alert>
            {/* Quick module anchors */}
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {modules.map((m) => (
                <Chip
                  key={m.id}
                  size="small"
                  label={m.title}
                  color={filteredModuleIds.includes(m.id) ? 'primary' : 'default'}
                  component={Link as any}
                  href={`#module-${m.id}`}
                  clickable
                  onClick={() => setExpanded(m.id)}
                />
              ))}
            </Stack>
            {modules
              .filter((m) => filteredModuleIds.includes(m.id))
              .map((m) => {
                const expandedState = expanded === m.id;
                return (
                  <Accordion
                    key={m.id}
                    expanded={expandedState}
                    onChange={handleAccordionChange(m.id)}
                    disableGutters
                    id={`module-${m.id}`}
                    sx={{
                      mb: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box display="flex" flexDirection="column" sx={{ width: '100%' }}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          {m.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {m.summary}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {m.sections.map((sec) => (
                        <Box key={sec.heading} sx={{ mb: 3 }}>
                          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                            {sec.heading}
                          </Typography>
                          <List dense sx={{ pl: 0 }}>
                            {sec.points
                              .filter(
                                (p) =>
                                  !normalizedQuery || p.toLowerCase().includes(normalizedQuery),
                              )
                              .map((p) => (
                                <ListItem key={p} sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <CheckCircle fontSize="small" color="success" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primaryTypographyProps={{ variant: 'body2' }}
                                    primary={p}
                                  />
                                </ListItem>
                              ))}
                          </List>
                          <Divider sx={{ mt: 2 }} />
                        </Box>
                      ))}
                      <Box display="flex" justifyContent="flex-end">
                        <Button size="small" href={`#module-${m.id}`}>
                          #module-{m.id}
                        </Button>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            {filteredModuleIds.length === 0 && (
              <Alert severity="warning">Aucun module ne correspond à "{searchQuery}"</Alert>
            )}
            {normalizedQuery && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Filtre actif : {searchQuery}
              </Typography>
            )}
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              👥 Rôles & Permissions
            </Typography>
            <Box
              display="grid"
              gap={3}
              sx={{ gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}
            >
              <Box>
                <Paper sx={{ height: '100%', borderTop: '4px solid', borderColor: 'error.main' }}>
                  <Box p={2}>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <AdminPanelSettings color="error" />
                        <Typography variant="h6" fontWeight="bold">
                          Administrateur
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Accès complet
                      </Typography>
                      <Divider />
                      <List dense>
                        {[
                          'Gestion utilisateurs',
                          'Configuration',
                          'Tous modules',
                          'Statistiques',
                          'Salles',
                          'Catégories globales',
                        ].map((i) => (
                          <ListItem key={i}>
                            <ListItemIcon>
                              <CheckCircle fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={i} />
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </Box>
                </Paper>
              </Box>
              <Box>
                <Paper sx={{ height: '100%', borderTop: '4px solid', borderColor: 'primary.main' }}>
                  <Box p={2}>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <School color="primary" />
                        <Typography variant="h6" fontWeight="bold">
                          Enseignant
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Ressources pédagogiques
                      </Typography>
                      <Divider />
                      <List dense>
                        {[
                          'Ajout TP',
                          'Matériel',
                          'Planification',
                          'Inventaire chimique',
                          'Catégories perso',
                          'Personnalisation',
                        ].map((i) => (
                          <ListItem key={i}>
                            <ListItemIcon>
                              <CheckCircle fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={i} />
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </Box>
                </Paper>
              </Box>
              <Box>
                <Paper sx={{ height: '100%', borderTop: '4px solid', borderColor: 'success.main' }}>
                  <Box p={2}>
                    <Stack spacing={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Groups color="success" />
                        <Typography variant="h6" fontWeight="bold">
                          Étudiant
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Consultation / participation
                      </Typography>
                      <Divider />
                      <List dense>
                        {['Consultation TP', 'Vue calendrier', 'Profil', 'Lecture seule'].map(
                          (i) => (
                            <ListItem key={i}>
                              <ListItemIcon>
                                <CheckCircle fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={i} />
                            </ListItem>
                          ),
                        )}
                      </List>
                    </Stack>
                  </Box>
                </Paper>
              </Box>
            </Box>
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Note :</strong> Permissions cumulatives.
              </Typography>
            </Alert>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              ✨ Bonnes pratiques
            </Typography>
            <Alert severity="success" sx={{ mb: 2 }}>
              Conseils rapides pour utiliser SGIL efficacement.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Utilisez les modèles (TP presets) pour gagner du temps"
                    secondary="Puis ajustez matériel, réactifs et documents au besoin."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Créez d'abord, uploadez ensuite"
                    secondary="Ajoutez la séance, puis importez vos fichiers (meilleure traçabilité)."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Renseignez les créneaux avec classes et salles"
                    secondary="Cela facilite le filtrage et la coordination du planning."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Privilégiez les unités normalisées"
                    secondary="Par défaut g pour les réactifs; évitez les unités exotiques si possible."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Décrivez clairement vos remarques"
                    secondary="Ajoutez les consignes de sécurité et les besoins spécifiques dans la description."
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Nettoyez vos documents inutiles"
                    secondary="Supprimez les pièces jointes obsolètes pour garder une base propre."
                  />
                </ListItem>
              </List>
            </Paper>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              ❓ FAQ & Support
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Retrouvez ici les réponses aux questions les plus fréquentes et les moyens de contact.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Questions fréquentes
              </Typography>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Mes documents restent en « En attente » après création
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Ajoutez d'abord la séance, puis les fichiers sont téléversés et liés via
                    /api/events/:id/documents. Si vous utilisez un modèle, les documents du modèle
                    sont ajoutés en référence automatiquement après création.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Puis-je créer une séance sans créneau ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Oui, les créneaux sont optionnels lors de la création du modèle et peuvent être
                    ajoutés plus tard depuis le calendrier.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Comment réutiliser un TP existant ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Utilisez « TP Preset » dans l'assistant de création. Les réactifs, le matériel
                    et les documents du modèle sont pré-remplis et duplicables.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Où trouver les APIs ?
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Exemple: /api/events, /api/timeslots, /api/materiel, /api/chemicals,
                    /api/events/[id]/documents, /api/notifications.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Paper>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                borderColor: 'primary.main',
              }}
            >
              <Typography variant="h6" gutterBottom fontWeight="bold">
                📞 Besoin d'aide ?
              </Typography>
              <Box
                display="grid"
                gap={3}
                sx={{ gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
              >
                <Box>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Support color="primary" />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Support technique
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Problèmes techniques & bugs
                        </Typography>
                      </Box>
                    </Box>
                    <Button variant="outlined" startIcon={<Email />} href="mailto:admin@sekrane.fr">
                      Contacter le support
                    </Button>
                  </Stack>
                </Box>
                <Box>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <GitHub />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Contribuer
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Signalez des bugs / idées
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
                </Box>
              </Box>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
      <Box sx={{ mt: 6, py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          SGIL v2.0 - Laboratory Information Management System
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Développé avec <Psychology color="primary" sx={{ fontSize: 24}} /> pour simplifier la gestion des laboratoires scolaires
        </Typography>
      </Box>
    </Container>
  );
}
