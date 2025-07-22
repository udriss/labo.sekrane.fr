"use client"

import { useState, useEffect } from "react"
import { 
  Box, Typography, Button, Paper, Stack, IconButton, Alert, 
  Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
  Chip, Card, CardContent, CardActions, Fab
} from "@mui/material"
import { 
  Add, Edit, Delete, ExpandMore, Science, School, 
  Timer, TrendingUp, Assignment
} from "@mui/icons-material"
import { SECTION_LEVELS } from "@/lib/constants/education-levels"

interface NotebookEntry {
  id: string
  title: string
  content: string
  sections?: string[]
  materials?: any[]
  chemicals?: any[]
  estimatedDuration?: number
  difficulty?: string
  createdAt: string
}

interface NotebookListProps {
  onEdit: (entry: NotebookEntry) => void
  onAdd: () => void
}

export function NotebookList({ onEdit, onAdd }: NotebookListProps) {
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  const loadEntries = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/notebook")
      if (!response.ok) throw new Error("Erreur lors du chargement")
      const data = await response.json()
      setEntries(Array.isArray(data) ? data : data.entries || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette entrée ?")) return
    
    try {
      const response = await fetch(`/api/notebook?id=${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Erreur lors de la suppression")
      
      setEntries(prev => prev.filter(entry => entry.id !== id))
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erreur lors de la suppression")
    }
  }

  // Organiser les entrées par sections
  const organizeEntriesBySection = () => {
    const organized: { [key: string]: NotebookEntry[] } = {}
    
    SECTION_LEVELS.forEach(level => {
      organized[level.id] = []
    })
    
    // Ajouter une catégorie pour les TPs sans section
    organized['sans-section'] = []

    entries.forEach(entry => {
      if (entry.sections && entry.sections.length > 0) {
        entry.sections.forEach(sectionId => {
          if (organized[sectionId]) {
            organized[sectionId].push(entry)
          }
        })
      } else {
        organized['sans-section'].push(entry)
      }
    })

    return organized
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Facile': return 'success'
      case 'Moyen': return 'warning'
      case 'Difficile': return 'error'
      default: return 'default'
    }
  }

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'Non spécifié'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`
  }

  if (loading) return <Typography>Chargement...</Typography>
  if (error) return <Alert severity="error">{error}</Alert>

  const organizedEntries = organizeEntriesBySection()

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">TPs et Protocoles</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAdd}
        >
          Nouveau TP
        </Button>
      </Stack>

      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab label="Par sections" />
        <Tab label="Chronologique" />
        <Tab label="Statistiques" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {/* Organisation par sections */}
          {SECTION_LEVELS.map(level => {
            const sectionEntries = organizedEntries[level.id] || []
            
            return (
              <Accordion key={level.id} defaultExpanded={sectionEntries.length > 0}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <School color="primary" />
                    <Typography variant="h6">{level.label}</Typography>
                    <Chip 
                      label={`${sectionEntries.length} TP${sectionEntries.length > 1 ? 's' : ''}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {sectionEntries.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: "center" }}>
                      <Typography color="text.secondary">
                        Aucun TP pour cette section
                      </Typography>
                    </Paper>
                  ) : (
                    <Box display="flex" flexWrap="wrap" gap={2}>
                      {sectionEntries.map((entry) => (
                        <Card key={entry.id} sx={{ minWidth: 300, maxWidth: 400 }}>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {entry.title}
                            </Typography>
                            
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                              {entry.difficulty && (
                                <Chip 
                                  label={entry.difficulty}
                                  size="small"
                                  color={getDifficultyColor(entry.difficulty) as any}
                                />
                              )}
                              {entry.estimatedDuration && (
                                <Chip 
                                  icon={<Timer />}
                                  label={formatDuration(entry.estimatedDuration)}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Stack>

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {entry.content.substring(0, 120)}
                              {entry.content.length > 120 && "..."}
                            </Typography>

                            {(entry.materials?.length || entry.chemicals?.length) && (
                              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                {entry.materials && entry.materials.length > 0 && (
                                  <Chip 
                                    icon={<Science />}
                                    label={`${entry.materials.length} matériel${entry.materials.length > 1 ? 's' : ''}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                                {entry.chemicals && entry.chemicals.length > 0 && (
                                  <Chip 
                                    label={`${entry.chemicals.length} produit${entry.chemicals.length > 1 ? 's' : ''}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Stack>
                            )}

                            <Typography variant="caption" color="text.secondary">
                              Créé le {new Date(entry.createdAt).toLocaleDateString()}
                            </Typography>
                          </CardContent>
                          
                          <CardActions>
                            <IconButton onClick={() => onEdit(entry)} color="primary" size="small">
                              <Edit />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(entry.id)} color="error" size="small">
                              <Delete />
                            </IconButton>
                          </CardActions>
                        </Card>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            )
          })}

          {/* Section sans catégorie */}
          {organizedEntries['sans-section'] && organizedEntries['sans-section'].length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Assignment color="action" />
                  <Typography variant="h6">Sans section</Typography>
                  <Chip 
                    label={`${organizedEntries['sans-section'].length} TP${organizedEntries['sans-section'].length > 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box display="flex" flexWrap="wrap" gap={2}>
                  {organizedEntries['sans-section'].map((entry) => (
                    <Card key={entry.id} sx={{ minWidth: 300, maxWidth: 400 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {entry.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {entry.content.substring(0, 120)}
                          {entry.content.length > 120 && "..."}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Créé le {new Date(entry.createdAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <IconButton onClick={() => onEdit(entry)} color="primary" size="small">
                          <Edit />
                        </IconButton>
                        <IconButton onClick={() => handleDelete(entry.id)} color="error" size="small">
                          <Delete />
                        </IconButton>
                      </CardActions>
                    </Card>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {/* Vue chronologique classique */}
          {entries.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography color="text.secondary">
                Aucune entrée dans le carnet
              </Typography>
            </Paper>
          ) : (
            <Stack spacing={2}>
              {entries.map((entry) => (
                <Paper key={entry.id} sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {entry.title}
                      </Typography>
                      
                      {entry.sections && entry.sections.length > 0 && (
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          {entry.sections.map(sectionId => {
                            const section = SECTION_LEVELS.find(l => l.id === sectionId)
                            return section ? (
                              <Chip 
                                key={sectionId}
                                label={section.label}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ) : null
                          })}
                        </Stack>
                      )}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body1">
                        {entry.content.substring(0, 200)}
                        {entry.content.length > 200 && "..."}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => onEdit(entry)} color="primary">
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(entry.id)} color="error">
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Statistiques */}
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Statistiques générales
                </Typography>
                <Stack direction="row" spacing={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {entries.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      TPs total
                    </Typography>
                  </Box>
                  
                  {SECTION_LEVELS.map(level => {
                    const count = organizedEntries[level.id]?.length || 0
                    return (
                      <Box key={level.id} textAlign="center">
                        <Typography variant="h4" color="secondary">
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {level.label}
                        </Typography>
                      </Box>
                    )
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {/* FAB pour ajout rapide */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={onAdd}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <Add />
      </Fab>
    </Box>
  )
}
