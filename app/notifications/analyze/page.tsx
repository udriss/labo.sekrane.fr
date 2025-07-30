'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Container,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore,
  Search,
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  ContentCopy,
  BugReport,
  Person,
  Email,
  Badge,
  Storage,
  Code,
  Lightbulb
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

interface ContentAnalysis {
  fileExists: boolean;
  fileSize: number;
  totalNotifications: number;
  userAnalysis: {
    searchedUserId: string;
    searchedUserEmail: string;
    exactIdMatches: number;
    exactEmailMatches: number;
    partialIdMatches: Array<{notificationId: string; foundId: string; similarity: string}>;
    partialEmailMatches: Array<{notificationId: string; foundEmail: string; similarity: string}>;
    allUniqueUserIds: string[];
    allUniqueEmails: string[];
    sampleNotifications: Array<{
      id: string;
      users: any[];
      userCount: number;
    }>;
  };
  structureAnalysis: {
    validStructure: number;
    invalidStructure: number;
    emptyUserArrays: number;
    nullUserArrays: number;
    examples: Array<{
      notificationId: string;
      userIdType: string;
      userIdValue: any;
      isValid: boolean;
    }>;
  };
  recommendations: string[];
}

export default function NotificationsAnalyzePage() {
  const { data: session, status } = useSession();
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [testNotification, setTestNotification] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);

  const runAnalysis = async () => {
    if (!session?.user) return;
    
    setLoading(true);
    try {
      const user = session.user as any;
      
      // Analyse complète
      const analysisRes = await fetch(`/api/notifications/analyze?action=analyze&testUserId=${user.id}&testUserEmail=${user.email}&testUserRole=${user.role}`);
      const analysisData = await analysisRes.json();
      
      if (analysisData.analysis) {
        setAnalysis(analysisData.analysis);
      }

      // Suggestions
      const suggestionsRes = await fetch(`/api/notifications/analyze?action=suggestions&testUserId=${user.id}&testUserEmail=${user.email}&testUserRole=${user.role}`);
      const suggestionsData = await suggestionsRes.json();
      
      if (suggestionsData.suggestions) {
        setSuggestions(suggestionsData.suggestions);
      }

    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTestNotification = async () => {
    if (!session?.user) return;
    
    try {
      const user = session.user as any;
      const res = await fetch(`/api/notifications/analyze?action=generate-test&testUserId=${user.id}&testUserEmail=${user.email}&testUserRole=${user.role}`);
      const data = await res.json();
      
      if (data.testNotification) {
        setTestNotification(data.testNotification);
        setShowTestDialog(true);
      }
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    if (status !== 'loading' && session?.user) {
      runAnalysis();
    }
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!session?.user) {
    return (
      <Alert severity="error">
        Vous devez être connecté pour accéder à cette page.
      </Alert>
    );
  }

  const user = session.user as any;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4 }}>
      <Container maxWidth="xl">
        <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 4 }}>
            {/* Header */}
            <Box 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                p: 3,
                mb: 4,
                color: 'white'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={2}>
                  <Search sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h4" component="h1" fontWeight="bold">
                      Analyse Contenu Notifications
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                      Utilisateur: {user.name} ({user.id} / {user.email})
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={runAnalysis}
                    disabled={loading}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Relancer
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Code />}
                    onClick={generateTestNotification}
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Générer Test
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Résumé */}
            {analysis && (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size = {{ xs: 12, md: 3 }}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <Storage sx={{ fontSize: 40, color: analysis.fileExists ? 'success.main' : 'error.main', mb: 1 }} />
                    <Typography variant="h6">Fichier</Typography>
                    <Typography variant="body2" color={analysis.fileExists ? 'success.main' : 'error.main'}>
                      {analysis.fileExists ? 'Trouvé' : 'Non trouvé'}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {analysis.fileSize} bytes
                    </Typography>
                  </Card>
                </Grid>
                <Grid size = {{ xs: 12, md: 3 }}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <BugReport sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h6">Notifications</Typography>
                    <Typography variant="h4" color="info.main">
                      {analysis.totalNotifications}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Total dans le fichier
                    </Typography>
                  </Card>
                </Grid>
                <Grid size = {{ xs: 12, md: 3 }}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <Person sx={{ fontSize: 40, color: analysis.userAnalysis.exactIdMatches > 0 ? 'success.main' : 'error.main', mb: 1 }} />
                    <Typography variant="h6">Correspondances</Typography>
                    <Typography variant="h4" color={analysis.userAnalysis.exactIdMatches > 0 ? 'success.main' : 'error.main'}>
                      {analysis.userAnalysis.exactIdMatches + analysis.userAnalysis.exactEmailMatches}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Pour cet utilisateur
                    </Typography>
                  </Card>
                </Grid>
                <Grid size = {{ xs: 12, md: 3 }}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <CheckCircle sx={{ fontSize: 40, color: analysis.structureAnalysis.validStructure > 0 ? 'success.main' : 'warning.main', mb: 1 }} />
                    <Typography variant="h6">Structure</Typography>
                    <Typography variant="h4" color={analysis.structureAnalysis.validStructure > 0 ? 'success.main' : 'warning.main'}>
                      {analysis.structureAnalysis.validStructure}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Notifications valides
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Recommandations principales */}
            {analysis && analysis.recommendations.length > 0 && (
              <Alert 
                severity={analysis.userAnalysis.exactIdMatches > 0 ? "success" : "error"} 
                sx={{ mb: 3 }}
              >
                <Typography variant="h6" gutterBottom>
                  Diagnostic principal:
                </Typography>
                {analysis.recommendations.slice(0, 3).map((rec, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    {rec}
                  </Typography>
                ))}
              </Alert>
            )}

            {/* Détails de l'analyse */}
            {analysis && (
              <Box sx={{ mt: 3 }}>
                {/* Analyse utilisateur */}
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Person />
                      <Typography variant="h6">
                        Analyse Utilisateur
                      </Typography>
                      <Chip 
                        label={`${analysis.userAnalysis.exactIdMatches + analysis.userAnalysis.exactEmailMatches} matches`}
                        color={analysis.userAnalysis.exactIdMatches > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={3}>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Utilisateur recherché:
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemIcon><Badge /></ListItemIcon>
                            <ListItemText primary={`ID: ${analysis.userAnalysis.searchedUserId}`} />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><Email /></ListItemIcon>
                            <ListItemText primary={`Email: ${analysis.userAnalysis.searchedUserEmail}`} />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Correspondances trouvées:
                        </Typography>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary={`Correspondances exactes par ID: ${analysis.userAnalysis.exactIdMatches}`}
                              secondary={`Correspondances exactes par email: ${analysis.userAnalysis.exactEmailMatches}`}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>

                    {analysis.userAnalysis.allUniqueUserIds.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          IDs utilisateurs disponibles dans le fichier:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                          {analysis.userAnalysis.allUniqueUserIds.slice(0, 20).map(id => (
                            <Chip 
                              key={id} 
                              label={id} 
                              size="small" 
                              variant="outlined"
                              color={id === analysis.userAnalysis.searchedUserId ? 'success' : 'default'}
                            />
                          ))}
                          {analysis.userAnalysis.allUniqueUserIds.length > 20 && (
                            <Chip label={`+${analysis.userAnalysis.allUniqueUserIds.length - 20} autres`} size="small" />
                          )}
                        </Box>
                      </Box>
                    )}

                    {analysis.userAnalysis.sampleNotifications.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Échantillon de notifications:
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>ID Notification</TableCell>
                                <TableCell>Nombre d'utilisateurs</TableCell>
                                <TableCell>Utilisateurs</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {analysis.userAnalysis.sampleNotifications.map(notif => (
                                <TableRow key={notif.id}>
                                  <TableCell>{notif.id}</TableCell>
                                  <TableCell>{notif.userCount}</TableCell>
                                  <TableCell>
                                    {notif.users.slice(0, 2).map(user => user.id).join(', ')}
                                    {notif.users.length > 2 && ` +${notif.users.length - 2}`}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Analyse structure */}
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Storage />
                      <Typography variant="h6">
                        Analyse Structure
                      </Typography>
                      <Chip 
                        label={`${analysis.structureAnalysis.validStructure}/${analysis.totalNotifications} valides`}
                        color={analysis.structureAnalysis.validStructure === analysis.totalNotifications ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <CheckCircle color="success" />
                          <Typography variant="h6">{analysis.structureAnalysis.validStructure}</Typography>
                          <Typography variant="caption">Valides</Typography>
                        </Card>
                      </Grid>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <ErrorIcon color="error" />
                          <Typography variant="h6">{analysis.structureAnalysis.invalidStructure}</Typography>
                          <Typography variant="caption">Structure invalide</Typography>
                        </Card>
                      </Grid>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <Warning color="warning" />
                          <Typography variant="h6">{analysis.structureAnalysis.emptyUserArrays}</Typography>
                          <Typography variant="caption">Arrays vides</Typography>
                        </Card>
                      </Grid>
                      <Grid size = {{ xs: 12, md: 6 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                          <ErrorIcon color="error" />
                          <Typography variant="h6">{analysis.structureAnalysis.nullUserArrays}</Typography>
                          <Typography variant="caption">Null/undefined</Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Lightbulb />
                        <Typography variant="h6">
                          Suggestions de correction
                        </Typography>
                        <Chip label={`${suggestions.length} suggestions`} color="info" size="small" />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {suggestions.map((suggestion, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <Info color="info" />
                            </ListItemIcon>
                            <ListItemText primary={suggestion} />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Dialog pour la notification de test */}
        <Dialog open={showTestDialog} onClose={() => setShowTestDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Notification de test générée</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Copiez cette notification et ajoutez-la au début de votre fichier JSON:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', position: 'relative' }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => copyToClipboard(JSON.stringify(testNotification, null, 2))}
              >
                <ContentCopy />
              </IconButton>
              <pre style={{ fontSize: '12px', overflow: 'auto', margin: 0 }}>
                {JSON.stringify(testNotification, null, 2)}
              </pre>
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowTestDialog(false)}>Fermer</Button>
            <Button 
              variant="contained" 
              onClick={() => copyToClipboard(JSON.stringify(testNotification, null, 2))}
            >
              Copier
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}